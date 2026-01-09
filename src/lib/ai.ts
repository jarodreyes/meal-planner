import { openai } from "./openai";
import {
  normalizedIngredientsSchema,
  parsedRecipesSchema,
  ParsedRecipe,
} from "./zodSchemas";
import { ingredientNormalizePrompt, recipeParsePrompt } from "./prompts";

export async function parseRecipesFromText(params: {
  text: string;
  sourceType: "pdf" | "paste";
  sourceName?: string | null;
}) {
  const { text, sourceType, sourceName } = params;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: recipeParsePrompt },
      {
        role: "user",
        content: `Source type: ${sourceType}\nSource name: ${sourceName ?? ""}\n\nRecipe text:\n${text}`,
      },
    ],
  });

  const raw = completion.choices[0].message?.content || "{}";
  const parsed = parsedRecipesSchema.parse(JSON.parse(raw));

  return parsed.recipes.map((recipe) => ({
    ...recipe,
    sourceType,
    sourceName: sourceName ?? null,
    sourceText: text,
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
