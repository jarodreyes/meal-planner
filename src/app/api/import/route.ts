import { NextResponse } from "next/server";
import { createRequire } from "module";
import { parseRecipesFromText } from "@/lib/ai";
import { writeClient } from "@/lib/sanity/client";
import { nutritionStubFromIngredients } from "@/lib/nutrition";

export const runtime = "nodejs";
export const maxDuration = 60;

const require = createRequire(import.meta.url);

function resolvePdfParse() {
  try {
    const mod = require("pdf-parse");
    const candidate =
      (typeof mod === "function" && mod) ||
      (typeof (mod as any)?.default === "function" && (mod as any).default) ||
      (typeof (mod as any)?.default?.default === "function" && (mod as any).default.default) ||
      (typeof (mod as any)?.parse === "function" && (mod as any).parse) ||
      (typeof (mod as any)?.default?.parse === "function" && (mod as any).default.parse);
    return candidate || null;
  } catch (err) {
    console.error("Failed to require pdf-parse", err);
    return null;
  }
}

async function extractTextFromPdfFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const pdfParse = resolvePdfParse();
  if (!pdfParse) {
    throw new TypeError("pdf-parse module did not export a function");
  }

  const parsed = await pdfParse(buffer);
  return parsed.text;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const sourceType = (form.get("sourceType") as "pdf" | "paste") || "paste";
    const sourceName = (form.get("sourceName") as string) || undefined;

    const payloads: { text: string; sourceName?: string | null }[] = [];

    if (sourceType === "pdf") {
      const files = form.getAll("files").filter((f) => f instanceof File) as File[];
      if (!files.length) {
        return NextResponse.json({ error: "No PDF files provided" }, { status: 400 });
      }

      for (const file of files) {
        const text = await extractTextFromPdfFile(file);
        payloads.push({ text, sourceName: file.name });
      }
    } else {
      const text = form.get("text") as string;
      if (!text) {
        return NextResponse.json({ error: "No text provided" }, { status: 400 });
      }
      payloads.push({ text, sourceName });
    }

    const results = [];

    for (const payload of payloads) {
      try {
        const parsedRecipes = await parseRecipesFromText({
          text: payload.text,
          sourceType,
          sourceName: payload.sourceName,
        });

        for (const recipe of parsedRecipes) {
          const baseDoc = {
            _type: "recipe",
            title: recipe.title,
            sourceType: recipe.sourceType,
            sourceName: recipe.sourceName,
            sourceText: recipe.sourceText,
            servings: recipe.servings ?? 1,
            ingredients: recipe.ingredients ?? [],
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
          });
        }
      } catch (error) {
        console.error("Import error", error);
        results.push({ error: "Failed to import", details: `${error}` });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Unhandled import error", error);
    return NextResponse.json({ error: "Import failed", details: `${error}` }, { status: 500 });
  }
}
