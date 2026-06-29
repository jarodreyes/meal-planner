import { NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";
import { enrichImportedRecipe, parseRecipesFromText } from "@/lib/ai";
import { nutritionStubFromIngredients } from "@/lib/nutrition";
import { unitAliases } from "@/lib/units";
import type { ParsedRecipe } from "@/lib/zodSchemas";
import { createHash } from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";
export const maxDuration = 60;

type SourceType = "pdf" | "paste" | "url";

type ImportPayload = {
  text: string;
  sourceName?: string | null;
  sourceUrl?: string;
  images?: string[];
  fileName?: string;
  parsedRecipes?: ParsedRecipe[];
};

function hash(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

function normalizeTitle(title: string | null | undefined) {
  return (title || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function canonicalizeUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  for (const key of Array.from(parsed.searchParams.keys())) {
    if (/^(utm_|fbclid$|gclid$|mc_)/i.test(key)) {
      parsed.searchParams.delete(key);
    }
  }
  return parsed.toString().replace(/\/$/, "");
}

function sourceKeyForRecipe(params: {
  sourceType: SourceType;
  recipe: ParsedRecipe;
  payload: ImportPayload;
}) {
  const { sourceType, recipe, payload } = params;
  if (sourceType === "url" && payload.sourceUrl) {
    return `url:${canonicalizeUrl(payload.sourceUrl)}`;
  }

  const source = payload.fileName ?? payload.sourceName ?? "upload";
  const title = normalizeTitle(recipe.title);
  const textHash = hash(`${recipe.sourceText || payload.text}`.slice(0, 8000));
  return `${sourceType}:${source}:${title}:${textHash}`;
}

function deterministicRecipeId(sourceKey: string) {
  // IMPORTANT: Sanity treats document IDs containing a "." as private/system
  // documents (the same mechanism behind `drafts.`), so they are only returned
  // to token-authenticated requests and are invisible to the public read API
  // and CDN. The app reads with a public (no-token) client, so dotted IDs would
  // 404. Keep the ID dot-free.
  return `recipe-import-${hash(sourceKey)}`;
}

function parseQuantityNumber(q?: string | null) {
  if (!q) return null;
  const cleaned = q.trim();
  // Handle range (e.g. "1-3") so we don't produce 13; use midpoint for storage
  const rangeMatch = cleaned.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (!Number.isNaN(low) && !Number.isNaN(high)) return (low + high) / 2;
  }
  const mixed = cleaned.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = parseFloat(mixed[1]);
    const num = parseFloat(mixed[2]);
    const den = parseFloat(mixed[3]);
    if (den) return whole + num / den;
  }
  const simpleFrac = cleaned.match(/^(\d+)\/(\d+)$/);
  if (simpleFrac) {
    const num = parseFloat(simpleFrac[1]);
    const den = parseFloat(simpleFrac[2]);
    if (den) return num / den;
  }
  const numVal = Number(cleaned.replace(/[^0-9./\s]/g, ""));
  if (!Number.isNaN(numVal)) return numVal;
  return null;
}

function normalizeUnit(u?: string | null) {
  if (!u) return null;
  const key = u.trim().toLowerCase();
  return unitAliases[key] || key || null;
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<any>) {
  const results: any[] = [];
  let idx = 0;
  const runners = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (idx < items.length) {
      const current = items[idx++];
      results.push(await worker(current));
    }
  });
  await Promise.all(runners);
  return results;
}

async function extractTextAndImagesFromPdf(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  let PDFParse: any = null;
  let plumberText: string | null = null;

  try {
    const mod = await import("pdf-parse");
    PDFParse =
      (mod as any)?.PDFParse ||
      (mod as any)?.default?.PDFParse ||
      (typeof (mod as any)?.default === "function" ? (mod as any).default : null);
  } catch (err) {
    console.error("Failed dynamic import pdf-parse", err);
  }

  if (!PDFParse) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("pdf-parse");
      PDFParse =
        (mod as any)?.PDFParse ||
        (mod as any)?.default?.PDFParse ||
        (typeof mod === "function" ? mod : null);
    } catch (err) {
      console.error("Failed require pdf-parse", err);
    }
  }

  if (typeof PDFParse !== "function") {
    throw new TypeError("pdf-parse module did not export PDFParse class/function");
  }

  // Try pdfplumber first (better layout). Requires python3 and pdfplumber installed.
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdfplumber-"));
    const tmpFile = path.join(tmpDir, "file.pdf");
    fs.writeFileSync(tmpFile, buffer);
    const pyBin = fs.existsSync(".venv/bin/python") ? ".venv/bin/python" : "python3";
    const cmd = `${pyBin} - <<'PY'\nimport pdfplumber\nfrom pathlib import Path\np = Path("${tmpFile}")\nwith pdfplumber.open(p) as pdf:\n    text = \"\\n\".join((page.extract_text() or \"\") for page in pdf.pages)\nprint(text)\nPY`;
    const out = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });
    plumberText = out || null;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (err) {
    console.warn("pdfplumber extraction failed, using pdf-parse", err instanceof Error ? err.message : err);
  }

  const parser = new PDFParse({ data: buffer });
  const [textResult, imageResult] = await Promise.all([
    parser.getText(),
    parser.getImage({ imageDataUrl: true }).catch(() => null),
  ]);
  const baseText = plumberText && plumberText.trim().length > 0 ? plumberText : textResult.text;
  const cleanText = baseText.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");

  const images: string[] =
    imageResult?.pages
      ?.flatMap((page: any) =>
        (page?.images || [])
          .map((img: any) => img?.dataUrl)
          .filter((u: string | undefined) => !!u)
      )
      .slice(0, 10) || [];

  return { text: cleanText, images };
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripHtmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function jsonLdScripts(html: string) {
  const scripts: string[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    scripts.push(decodeHtmlEntities(match[1].trim()));
  }
  return scripts;
}

function isRecipeJsonLd(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== "object") return false;
  const type = (value as Record<string, unknown>)["@type"];
  const types = asArray(type as string | string[]).map((t) => String(t).toLowerCase());
  return types.includes("recipe");
}

function collectRecipeJsonLd(value: unknown): Record<string, any>[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectRecipeJsonLd);
  const obj = value as Record<string, any>;
  const recipes = isRecipeJsonLd(obj) ? [obj] : [];
  return recipes.concat(collectRecipeJsonLd(obj["@graph"]));
}

function parseRecipeYield(value: unknown) {
  const text = asArray(value as string | string[])
    .map((v) => String(v))
    .join(" ");
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseDurationMinutes(value: unknown) {
  if (!value) return null;
  const text = String(value);
  const iso = text.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (iso) return (Number(iso[1] || 0) * 60) + Number(iso[2] || 0);
  const hours = text.match(/(\d+(?:\.\d+)?)\s*h/i);
  const mins = text.match(/(\d+(?:\.\d+)?)\s*m/i);
  const total = (hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0);
  return total || null;
}

function parseNumberFromNutrition(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function mapNutrition(nutrition: Record<string, unknown> | undefined) {
  if (!nutrition) return null;
  const calories = parseNumberFromNutrition(nutrition.calories);
  const protein = parseNumberFromNutrition(nutrition.proteinContent);
  const carbs = parseNumberFromNutrition(nutrition.carbohydrateContent);
  const fat = parseNumberFromNutrition(nutrition.fatContent);
  const fiber = parseNumberFromNutrition(nutrition.fiberContent);
  if (calories == null && protein == null && carbs == null && fat == null) return null;
  return {
    calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    fiber_g: fiber,
    servingsBasis: 1,
    source: "provided",
  };
}

function instructionText(step: unknown): string | null {
  if (!step) return null;
  if (typeof step === "string") return step.trim();
  if (typeof step !== "object") return null;
  const obj = step as Record<string, unknown>;
  if (typeof obj.text === "string") return obj.text.trim();
  if (Array.isArray(obj.itemListElement)) {
    return obj.itemListElement.map(instructionText).filter(Boolean).join("\n").trim() || null;
  }
  return null;
}

function imageUrls(value: unknown) {
  return asArray(value as string | Record<string, unknown> | Array<string | Record<string, unknown>>)
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && typeof item.url === "string") return item.url;
      return null;
    })
    .filter((url): url is string => Boolean(url));
}

function mapJsonLdRecipe(
  recipe: Record<string, any>,
  sourceUrl: string,
  sourceName: string | undefined,
  pageText: string
): ParsedRecipe {
  const title = String(recipe.name || "Untitled recipe");
  const totalTimeMinutes = parseDurationMinutes(recipe.totalTime);
  const prepTimeMinutes = parseDurationMinutes(recipe.prepTime);
  const cookTimeMinutes = parseDurationMinutes(recipe.cookTime);
  const tags = [
    ...asArray(recipe.recipeCategory as string | string[]),
    ...asArray(recipe.recipeCuisine as string | string[]),
    ...asArray(recipe.keywords as string | string[]),
  ]
    .flatMap((tag) => String(tag).split(","))
    .map((tag) => tag.trim())
    .filter(Boolean);
  const mealType = tags.some((tag) => /breakfast/i.test(tag))
    ? "breakfast"
    : tags.some((tag) => /lunch/i.test(tag))
      ? "lunch"
      : tags.some((tag) => /snack/i.test(tag))
        ? "snack"
        : tags.some((tag) => /dinner|main/i.test(tag))
          ? "dinner"
          : null;

  const nutritionProvided = mapNutrition(recipe.nutrition);

  return {
    title,
    sourceType: "url",
    sourceName: sourceName || new URL(sourceUrl).hostname.replace(/^www\./, ""),
    sourceUrl,
    sourceText: [
      `URL: ${sourceUrl}`,
      `Title: ${title}`,
      totalTimeMinutes ? `Total time: ${totalTimeMinutes} minutes` : null,
      prepTimeMinutes ? `Prep time: ${prepTimeMinutes} minutes` : null,
      cookTimeMinutes ? `Cook time: ${cookTimeMinutes} minutes` : null,
      imageUrls(recipe.image).length ? `Image URLs:\n${imageUrls(recipe.image).join("\n")}` : null,
      pageText,
    ]
      .filter(Boolean)
      .join("\n\n"),
    servings: parseRecipeYield(recipe.recipeYield),
    mealType,
    images: [],
    ingredients: asArray(recipe.recipeIngredient as string | string[]).map((ingredient) => ({
      originalText: String(ingredient),
      nameNormalized: null,
      quantity: null,
      unit: null,
      grams: null,
      notes: null,
    })),
    instructions: asArray(recipe.recipeInstructions)
      .map(instructionText)
      .filter((step): step is string => Boolean(step)),
    tags: Array.from(new Set(tags)),
    importStatus: "done",
    nutritionProvided,
    nutritionStatus: nutritionProvided ? "provided" : "pending",
    confidence: 0.95,
  };
}

async function fetchRecipesFromUrl(url: string, sourceName?: string | null): Promise<ImportPayload> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Enter a valid recipe URL.");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Recipe URL must start with http:// or https://.");
  }

  const res = await fetch(parsedUrl.toString(), {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`Could not fetch recipe URL (${res.status}).`);
  }
  const html = await res.text();
  const pageText = stripHtmlToText(html);
  const recipes = jsonLdScripts(html)
    .flatMap((script) => {
      try {
        return collectRecipeJsonLd(JSON.parse(script));
      } catch {
        return [];
      }
    })
    .map((recipe) => mapJsonLdRecipe(recipe, parsedUrl.toString(), sourceName ?? undefined, pageText));

  return {
    text: pageText,
    sourceName: sourceName || parsedUrl.hostname.replace(/^www\./, ""),
    sourceUrl: parsedUrl.toString(),
    images: recipes.flatMap((recipe) => recipe.images ?? []),
    parsedRecipes: recipes.length ? recipes : undefined,
  };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const sourceType = (form.get("sourceType") as SourceType) || "paste";
    const sourceName = (form.get("sourceName") as string) || undefined;
    const mealTypesRaw = form.getAll("mealTypes");
    const allowedMealTypes: Set<string> =
      mealTypesRaw.length > 0
        ? new Set(mealTypesRaw.map((v) => String(v).toLowerCase()))
        : new Set();

    const payloads: ImportPayload[] = [];

    if (sourceType === "pdf") {
      const files = form.getAll("files").filter((f) => f instanceof File) as File[];
      if (!files.length) {
        return NextResponse.json({ error: "No PDF files provided" }, { status: 400 });
      }

      const extracted = await runWithConcurrency(files, 2, async (file) => {
        const { text, images } = await extractTextAndImagesFromPdf(file);
        return { text, images, sourceName: file.name, fileName: file.name };
      });
      payloads.push(...extracted);
    } else if (sourceType === "url") {
      const url = String(form.get("url") || "").trim();
      if (!url) {
        return NextResponse.json({ error: "No recipe URL provided" }, { status: 400 });
      }
      payloads.push(await fetchRecipesFromUrl(url, sourceName));
    } else {
      const rawText = form.get("text") as string;
      const text = rawText
        ? rawText.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
        : rawText;
      if (!text) {
        return NextResponse.json({ error: "No text provided" }, { status: 400 });
      }
      payloads.push({ text, sourceName, images: [] });
    }

    const results = [];

    for (const payload of payloads) {
      try {
        const aggregated: ParsedRecipe[] =
          payload.parsedRecipes ??
          ((await parseRecipesFromText({
            text: payload.text,
            sourceType,
            sourceName: payload.sourceName ?? payload.fileName ?? undefined,
            images: payload.images ?? undefined,
          })) as ParsedRecipe[]);
        const parsedCount = aggregated.length;
        let skippedCount = 0;

        for (const recipe of aggregated) {
          // Skip empty shells (e.g., section headers without content)
          if (
            (!recipe.ingredients || recipe.ingredients.length === 0) &&
            (!recipe.instructions || recipe.instructions.length === 0)
          ) {
            results.push({
              skipped: true,
              reason: "Empty recipe content",
              title: recipe.title ?? "Untitled",
              mealType: recipe.mealType ?? null,
              source: payload.fileName ?? payload.sourceName ?? "upload",
            });
            skippedCount++;
            continue;
          }

          // Skip only when the parser assigned a meal type that is not in the user's selection.
          // Unknown/null mealType still imports (enrichment may fill it later).
          if (allowedMealTypes.size > 0) {
            const recipeMeal = (recipe.mealType ?? "").toLowerCase();
            if (recipeMeal && !allowedMealTypes.has(recipeMeal)) {
              results.push({
                skipped: true,
                reason: `Meal type "${recipe.mealType}" not selected for import`,
                title: recipe.title ?? "Untitled",
                mealType: recipe.mealType ?? null,
                source: payload.fileName ?? payload.sourceName ?? "upload",
              });
              skippedCount++;
              continue;
            }
          }

          const sourceKey = sourceKeyForRecipe({ sourceType, recipe, payload });
          const existing = await writeClient.fetch(
            `*[_type == "recipe" && sourceKey == $sourceKey][0]{
              _id,
              title,
              importStatus,
              nutritionStatus,
              mealType
            }`,
            { sourceKey }
          );

          if (existing?._id) {
            results.push({
              id: existing._id,
              title: existing.title ?? recipe.title,
              importStatus: existing.importStatus ?? "done",
              nutritionStatus:
                existing.nutritionStatus ?? (recipe.nutritionProvided ? "provided" : "computed"),
              mealType: existing.mealType ?? recipe.mealType ?? null,
              source: payload.fileName ?? payload.sourceName ?? "upload",
              duplicate: true,
              recipeUrl: `/recipes/${existing._id}`,
            });
            continue;
          }

          const enrichment = await enrichImportedRecipe({
            title: recipe.title ?? "Untitled recipe",
            ingredients: recipe.ingredients ?? [],
            instructions: recipe.instructions ?? [],
            servings: recipe.servings,
            mealType: recipe.mealType,
            tags: recipe.tags ?? [],
            sourceName: recipe.sourceName,
            nutritionProvided: recipe.nutritionProvided ?? null,
          });

          const mergedServings = enrichment.servings ?? recipe.servings ?? 1;
          const mergedMealType = enrichment.mealType ?? recipe.mealType ?? null;
          const mergedTags =
            (recipe.tags?.length ?? 0) > 0 ? recipe.tags! : (enrichment.tags ?? []);
          const mergedSourceName = recipe.sourceName ?? enrichment.sourceName ?? undefined;

          let mappedIngredients =
            (recipe.ingredients || []).map((ing: any) => {
              const quantityText = ing.quantity ?? ing.quantityText ?? null;
              const quantityNumber =
                ing.quantityNumber ?? parseQuantityNumber(quantityText);
              return {
                ...ing,
                quantityText,
                quantityNumber,
                unit: normalizeUnit(ing.unit) ?? null,
                grams: ing.grams ?? null,
              };
            }) || [];

          if (enrichment.ingredientEnrichments?.length) {
            mappedIngredients = mappedIngredients.map((ing: any) => {
              const patch = enrichment.ingredientEnrichments!.find(
                (e) => e.originalText === ing.originalText
              );
              if (!patch) return ing;
              return {
                ...ing,
                nameNormalized: patch.nameNormalized ?? ing.nameNormalized,
                grams: patch.grams ?? ing.grams,
              };
            });
          }

          const baseDoc = {
            _type: "recipe",
            title: recipe.title,
            sourceType: recipe.sourceType,
            sourceName: mergedSourceName,
            sourceUrl: recipe.sourceUrl ?? payload.sourceUrl ?? undefined,
            sourceKey,
            sourceText: recipe.sourceText,
            servings: mergedServings,
            mealType: mergedMealType,
            images: recipe.images ?? [],
            ingredients: mappedIngredients,
            instructions: recipe.instructions ?? [],
            tags: mergedTags,
            importStatus: recipe.importStatus,
            nutritionProvided: recipe.nutritionProvided ?? undefined,
            nutritionStatus:
              recipe.nutritionStatus ?? (recipe.nutritionProvided ? "provided" : "pending"),
            confidence: recipe.confidence ?? 0.5,
            favorited: recipe.favorited ?? false,
          };

          const documentId = deterministicRecipeId(sourceKey);
          const created = await writeClient.createIfNotExists({
            _id: documentId,
            ...baseDoc,
          });
          let nutritionComputed = recipe.nutritionComputed;

          if (!recipe.nutritionProvided) {
            if (enrichment.nutritionComputed) {
              nutritionComputed = {
                calories: enrichment.nutritionComputed.calories,
                protein_g: enrichment.nutritionComputed.protein_g,
                carbs_g: enrichment.nutritionComputed.carbs_g,
                fat_g: enrichment.nutritionComputed.fat_g,
                fiber_g: enrichment.nutritionComputed.fiber_g ?? undefined,
                servingsBasis: enrichment.nutritionComputed.servingsBasis,
                source: "openai_estimate",
              };
            } else {
              nutritionComputed = nutritionStubFromIngredients(
                mappedIngredients,
                mergedServings
              );
            }

            await writeClient
              .patch(created._id)
              .set({
                nutritionComputed,
                nutritionStatus: "computed",
                nutritionComputedAt: new Date().toISOString(),
              })
              .commit();
          }

          results.push({
            id: created._id,
            title: recipe.title,
            importStatus: baseDoc.importStatus,
            nutritionStatus: recipe.nutritionProvided ? "provided" : "computed",
            mealType: baseDoc.mealType ?? null,
            source: payload.fileName ?? payload.sourceName ?? "upload",
            duplicate: false,
            recipeUrl: `/recipes/${created._id}`,
          });
        }

        if (!aggregated.length) {
          results.push({
            error: "No recipes parsed from this file",
            source: payload.fileName ?? payload.sourceName ?? "upload",
          });
        }

        console.log(
          "[import] file",
          payload.fileName ?? payload.sourceName,
          "parsed",
          parsedCount,
          "skipped",
          skippedCount
        );
      } catch (error) {
        console.error("Import error", error);
        results.push({ error: "Failed to import", details: `${error}`, source: payload.fileName ?? payload.sourceName });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Unhandled import error", error);
    return NextResponse.json({ error: "Import failed", details: `${error}` }, { status: 500 });
  }
}
