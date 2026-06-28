import { z } from "zod";

export const nutritionFactsSchema = z.object({
  calories: z.number().nullable().optional(),
  protein_g: z.number().nullable().optional(),
  carbs_g: z.number().nullable().optional(),
  fat_g: z.number().nullable().optional(),
  fiber_g: z.number().nullable().optional(),
  servingsBasis: z.number().nullable().optional().default(1),
  source: z.string(),
});

export const ingredientLineSchema = z.object({
  originalText: z.string(),
  quantityText: z.string().nullish().optional(),
  quantityNumber: z.number().nullish().optional(),
  nameNormalized: z.string().nullable().optional(),
  quantity: z.string().nullable().optional(), // legacy field from parser
  unit: z.string().nullable().optional(),
  grams: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const recipeSchema = z.object({
  title: z.string().optional().nullable().default("Untitled recipe"),
  sourceType: z.enum(["pdf", "paste"]),
  /** Model often returns null when unknown; prompt allows null */
  sourceName: z.string().nullable().optional(),
  sourceText: z.string(),
  servings: z.number().positive().nullish().default(1),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).nullable().optional(),
  ingredients: z.array(ingredientLineSchema).default([]),
  instructions: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).nullish().default([]),
  importStatus: z
    .enum(["new", "processing", "needs_review", "failed", "done"])
    .default("done"),
  /** Prompt says use null when macros are not in the source */
  nutritionProvided: nutritionFactsSchema.nullable().optional(),
  nutritionComputed: nutritionFactsSchema.optional(),
  nutritionStatus: z
    .enum(["pending", "provided", "computed", "failed", "needs_review"])
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const parsedRecipesSchema = z.object({
  recipes: z.array(
    recipeSchema.extend({
      confidence: z.number().min(0).max(1).default(0.5),
    })
  ),
});

export type ParsedRecipes = z.infer<typeof parsedRecipesSchema>;
export type ParsedRecipe = z.infer<typeof recipeSchema>;

export const normalizedIngredientsSchema = z.object({
  ingredients: z.array(
    z.object({
      originalText: z.string(),
      nameNormalized: z.string(),
      grams: z.number(),
    })
  ),
});

/** OpenAI import enrichment (missing macros + metadata); source is applied in code */
export const recipeEnrichmentResponseSchema = z.object({
  nutritionComputed: z
    .object({
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
      fiber_g: z.number().nullable().optional(),
      servingsBasis: z.number().positive(),
    })
    .optional(),
  servings: z.number().positive().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  tags: z.array(z.string()).optional(),
  sourceName: z.string().nullable().optional(),
  ingredientEnrichments: z
    .array(
      z.object({
        originalText: z.string(),
        nameNormalized: z.string().optional(),
        grams: z.number().optional(),
      })
    )
    .optional(),
});

export type RecipeEnrichment = z.infer<typeof recipeEnrichmentResponseSchema>;
