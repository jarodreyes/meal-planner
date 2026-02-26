import { NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";
import { parseRecipesFromText } from "@/lib/ai";
import { nutritionStubFromIngredients } from "@/lib/nutrition";
import { unitAliases } from "@/lib/units";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const sourceType = (form.get("sourceType") as "pdf" | "paste") || "paste";
    const sourceName = (form.get("sourceName") as string) || undefined;
    const mealTypesRaw = form.getAll("mealTypes");
    const allowedMealTypes: Set<string> =
      mealTypesRaw.length > 0
        ? new Set(mealTypesRaw.map((v) => String(v).toLowerCase()))
        : new Set();

    const payloads: { text: string; sourceName?: string | null; images?: string[]; fileName?: string }[] = [];

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
        const aggregated = await parseRecipesFromText({
          text: payload.text,
          sourceType,
          sourceName: payload.sourceName ?? payload.fileName ?? undefined,
          images: payload.images ?? undefined,
        });
        let parsedCount = aggregated.length;
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

          // Skip meal types not selected for import
          if (allowedMealTypes.size > 0) {
            const recipeMeal = (recipe.mealType ?? "").toLowerCase();
            if (!recipeMeal || !allowedMealTypes.has(recipeMeal)) {
              results.push({
                skipped: true,
                reason: "Meal type not selected for import",
                title: recipe.title ?? "Untitled",
                mealType: recipe.mealType ?? null,
                source: payload.fileName ?? payload.sourceName ?? "upload",
              });
              skippedCount++;
              continue;
            }
          }

          const mappedIngredients =
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

          const baseDoc = {
            _type: "recipe",
            title: recipe.title,
            sourceType: recipe.sourceType,
            sourceName: recipe.sourceName,
            sourceText: recipe.sourceText,
            servings: recipe.servings ?? 1,
            mealType: recipe.mealType ?? null,
            images: recipe.images ?? [],
            ingredients: mappedIngredients,
            instructions: recipe.instructions ?? [],
            tags: recipe.tags ?? [],
            importStatus: recipe.importStatus,
            nutritionProvided: recipe.nutritionProvided ?? undefined,
            nutritionStatus:
              recipe.nutritionStatus ?? (recipe.nutritionProvided ? "provided" : "pending"),
            confidence: recipe.confidence ?? 0.5,
          };

          const created = await writeClient.create(baseDoc);
          let nutritionComputed = recipe.nutritionComputed;

          if (!recipe.nutritionProvided) {
            nutritionComputed = nutritionStubFromIngredients(
              recipe.ingredients,
              recipe.servings ?? 1
            );

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
            mealType: recipe.mealType ?? null,
            source: payload.fileName ?? payload.sourceName ?? "upload",
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
