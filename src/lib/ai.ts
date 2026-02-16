import { openai } from "./openai";
import {
  normalizedIngredientsSchema,
  parsedRecipesSchema,
  ParsedRecipe,
} from "./zodSchemas";
import { cookedWeightPrompt, ingredientNormalizePrompt, recipeParsePrompt } from "./prompts";

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
function sanitizeText(input: string) {
  if (!input) return "";
  // Remove problematic control chars (keep tabs/newlines)
  return input.replace(CONTROL_CHARS_REGEX, " ");
}

const MEAL_HEADER_MAP: Record<string, "breakfast" | "lunch" | "dinner" | "snack"> = {
  breakfast: "breakfast",
  "snack 1": "snack",
  "snack 2": "snack",
  snack: "snack",
  lunch: "lunch",
  dinner: "dinner",
};

function detectMealHeaders(text: string) {
  const lines = text.split(/\r?\n/);
  const hits: { header: string; mealType: string; line: number }[] = [];
  lines.forEach((line, idx) => {
    const normalized = line.trim().toLowerCase();
    if (normalized.length === 0) return;
    Object.keys(MEAL_HEADER_MAP).forEach((key) => {
      if (normalized.startsWith(key)) {
        hits.push({ header: line.trim(), mealType: MEAL_HEADER_MAP[key], line: idx });
      }
    });
  });
  return hits;
}

export async function parseRecipesFromText(params: {
  text: string;
  sourceType: "pdf" | "paste";
  sourceName?: string | null;
  images?: string[] | null;
}) {
  const { text, sourceType, sourceName, images } = params;
  const cleanText = sanitizeText(text);
  const headers = detectMealHeaders(cleanText);
  const headerHints =
    headers.length > 0
      ? headers
          .map((h) => `${h.mealType} @ line ${h.line}: "${h.header}"`)
          .slice(0, 12)
          .join(" | ")
      : "none";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: recipeParsePrompt },
      {
        role: "user",
        content: `Source type: ${sourceType}\nSource name: ${sourceName ?? ""}\nDetected meal section hints: ${headerHints}\n\nRecipe text:\n${cleanText}\n\nImages (data URLs or URLs, optional): ${images?.slice(0, 5).join(", ") ?? "none"}`,
      },
    ],
  });

  const raw = completion.choices[0].message?.content || "{}";
  const parsed = parsedRecipesSchema.parse(JSON.parse(raw));

  return parsed.recipes.map((recipe) => ({
    ...recipe,
    title: recipe.title || "Untitled recipe",
    sourceType,
    sourceName: sourceName ?? null,
    sourceText: cleanText,
    images: recipe.images ?? images ?? [],
    importStatus:
      recipe.importStatus ??
      (recipe.confidence && recipe.confidence < 0.7 ? "needs_review" : "done"),
    nutritionStatus: recipe.nutritionProvided ? "provided" : "pending",
  }));
}

export async function normalizeIngredients(
  ingredients: ParsedRecipe["ingredients"]
): Promise<ParsedRecipe["ingredients"]> {
  if (!ingredients.length) return ingredients;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: ingredientNormalizePrompt },
      {
        role: "user",
        content: JSON.stringify({ ingredients }),
      },
    ],
  });

  const raw = completion.choices[0].message?.content || "{}";
  const parsed = normalizedIngredientsSchema.parse(JSON.parse(raw));

  return ingredients.map((ingredient) => {
    const normalized = parsed.ingredients.find(
      (norm) => norm.originalText === ingredient.originalText
    );

    if (!normalized) return ingredient;

    return {
      ...ingredient,
      nameNormalized: normalized.nameNormalized || ingredient.nameNormalized,
      grams: normalized.grams ?? ingredient.grams,
    };
  });
}

export type CookedWeightEstimate = {
  proteinCookedGrams: number;
  otherCookedGrams: number;
};

export async function estimateCookedWeight(params: {
  proteinGrams: number;
  otherGrams: number;
  proteinLabels?: string[];
  otherLabels?: string[];
  recipeTitle?: string;
}): Promise<CookedWeightEstimate> {
  const { proteinGrams, otherGrams, proteinLabels, otherLabels, recipeTitle } = params;
  const userContent = [
    `Raw main protein weight: ${proteinGrams} g`,
    `Raw other ingredients weight: ${otherGrams} g`,
    proteinLabels?.length ? `Main protein(s): ${proteinLabels.join(", ")}` : null,
    otherLabels?.length ? `Other ingredients (summary): ${otherLabels.slice(0, 15).join(", ")}` : null,
    recipeTitle ? `Recipe: ${recipeTitle}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: cookedWeightPrompt },
      { role: "user", content: userContent },
    ],
  });

  const raw = completion.choices[0].message?.content || "{}";
  const parsed = JSON.parse(raw) as { proteinCookedGrams: number; otherCookedGrams: number };
  return {
    proteinCookedGrams: Number(parsed.proteinCookedGrams) || 0,
    otherCookedGrams: Number(parsed.otherCookedGrams) || 0,
  };
}
