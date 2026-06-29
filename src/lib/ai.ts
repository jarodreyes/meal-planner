import { openai } from "./openai";
import {
  normalizedIngredientsSchema,
  parsedRecipesSchema,
  ParsedRecipe,
  recipeEnrichmentResponseSchema,
} from "./zodSchemas";
import {
  cookedWeightPrompt,
  ingredientNormalizePrompt,
  recipeEnrichmentPrompt,
  recipeParsePrompt,
} from "./prompts";

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

/** Max characters per API call to avoid truncation and stay within output limits (recipes later in doc were dropped) */
const MAX_CHARS_PER_CHUNK = 28_000;

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

type TextSegment = { mealType: "breakfast" | "lunch" | "dinner" | "snack"; text: string };

/**
 * Split document by meal section headers so each chunk is processed separately with the correct mealType.
 * Returns [] when there are no headers (caller uses single-call inference).
 */
function segmentTextByMealSections(cleanText: string): TextSegment[] {
  const lines = cleanText.split(/\r?\n/);
  const headers = detectMealHeaders(cleanText);
  if (headers.length === 0) {
    return [];
  }

  const segments: TextSegment[] = [];
  for (let i = 0; i < headers.length; i++) {
    const startLine = headers[i].line;
    const endLine = i + 1 < headers.length ? headers[i + 1].line : lines.length;
    const segmentLines = lines.slice(startLine, endLine);
    const text = segmentLines.join("\n").trim();
    if (!text) continue;
    const mealType = headers[i].mealType as TextSegment["mealType"];
    segments.push({ mealType, text });
  }
  return segments;
}

/**
 * Split a segment into smaller chunks if it exceeds MAX_CHARS_PER_CHUNK (same mealType for all).
 */
function splitSegmentBySize(
  segment: TextSegment
): TextSegment[] {
  if (segment.text.length <= MAX_CHARS_PER_CHUNK) {
    return [segment];
  }
  const chunks: TextSegment[] = [];
  const lines = segment.text.split(/\r?\n/);
  let current = "";
  for (const line of lines) {
    if (current.length + line.length + 1 > MAX_CHARS_PER_CHUNK && current.length > 0) {
      chunks.push({ mealType: segment.mealType, text: current.trim() });
      current = "";
    }
    current += (current ? "\n" : "") + line;
  }
  if (current.trim()) {
    chunks.push({ mealType: segment.mealType, text: current.trim() });
  }
  return chunks;
}

export async function parseRecipesFromText(params: {
  text: string;
  sourceType: "pdf" | "paste" | "url";
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

  const segments = segmentTextByMealSections(cleanText);
  const chunks: TextSegment[] = [];
  if (segments.length > 0) {
    for (const seg of segments) {
      chunks.push(...splitSegmentBySize(seg));
    }
  }

  async function parseOneChunk(
    chunkText: string,
    forcedMealType?: "breakfast" | "lunch" | "dinner" | "snack"
  ) {
    const mealInstruction = forcedMealType
      ? `\n\nThis section is ${forcedMealType}. Set mealType to "${forcedMealType}" for every recipe in your response.`
      : "";
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: recipeParsePrompt },
        {
          role: "user",
          content: `Source type: ${sourceType}\nSource name: ${sourceName ?? ""}\nDetected meal section hints: ${headerHints}${mealInstruction}\n\nRecipe text:\n${chunkText}\n\nImages (data URLs or URLs, optional): ${images?.slice(0, 5).join(", ") ?? "none"}`,
        },
      ],
    });

    const raw = completion.choices[0].message?.content || "{}";
    const parsed = parsedRecipesSchema.parse(JSON.parse(raw));
    return parsed.recipes.map((recipe) => ({
      ...recipe,
      mealType: forcedMealType ?? recipe.mealType,
    }));
  }

  let allRecipes: Array<{
    mealType?: "breakfast" | "lunch" | "dinner" | "snack" | null;
    title?: string | null;
    sourceType?: string;
    sourceName?: string | null;
    sourceText?: string;
    images?: string[] | null;
    importStatus?: string;
    nutritionStatus?: string;
    [k: string]: unknown;
  }>;

  if (chunks.length > 0) {
    const results = await Promise.all(
      chunks.map((c) => parseOneChunk(c.text, c.mealType))
    );
    allRecipes = results.flat();
  } else {
    allRecipes = await parseOneChunk(cleanText);
  }

  return allRecipes.map((recipe) => {
    const confidence =
      typeof recipe.confidence === "number" ? recipe.confidence : undefined;
    return {
      ...recipe,
      title: recipe.title || "Untitled recipe",
      sourceType,
      sourceName: sourceName ?? null,
      sourceText: cleanText,
      images: recipe.images ?? images ?? [],
      importStatus:
        recipe.importStatus ??
        (confidence != null && confidence < 0.7 ? "needs_review" : "done"),
      nutritionStatus: recipe.nutritionProvided ? "provided" : "pending",
    };
  });
}

/**
 * Second pass: estimate macros and fill missing metadata (servings, mealType, tags, etc.)
 * when the parse left gaps. Safe to call on every imported recipe.
 */
export async function enrichImportedRecipe(recipe: {
  title: string;
  ingredients: ParsedRecipe["ingredients"];
  instructions: string[];
  servings: number | null | undefined;
  mealType: ParsedRecipe["mealType"];
  tags: string[];
  sourceName: string | null | undefined;
  nutritionProvided: ParsedRecipe["nutritionProvided"];
}) {
  const needsNutrition = !recipe.nutritionProvided;

  const payload = {
    needsNutrition,
    title: recipe.title,
    servings: recipe.servings ?? null,
    mealType: recipe.mealType ?? null,
    tags: recipe.tags ?? [],
    sourceName: recipe.sourceName ?? null,
    nutritionProvided: recipe.nutritionProvided ?? null,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: recipeEnrichmentPrompt },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });

    const raw = completion.choices[0].message?.content || "{}";
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
    } catch {
      console.error("enrichImportedRecipe: JSON parse failed");
      return {};
    }

    const parsed = recipeEnrichmentResponseSchema.safeParse(obj);
    if (parsed.success) return parsed.data;

    // Model sometimes returns an invalid mealType string; don't discard nutrition for that.
    if (obj && typeof obj === "object") {
      const { mealType: _mealType, ...rest } = obj as Record<string, unknown>;
      const validMeals = new Set(["breakfast", "lunch", "dinner", "snack"]);
      const sanitized = {
        ...rest,
        ...(typeof _mealType === "string" && validMeals.has(_mealType)
          ? { mealType: _mealType }
          : {}),
      };
      const retry = recipeEnrichmentResponseSchema.safeParse(sanitized);
      if (retry.success) return retry.data;
    }

    console.error("enrichImportedRecipe: invalid JSON", parsed.error.flatten());
    return {};
  } catch (e) {
    console.error("enrichImportedRecipe failed", e);
    return {};
  }
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
