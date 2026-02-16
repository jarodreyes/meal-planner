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
  sourceName: z.string().optional(),
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
  nutritionProvided: nutritionFactsSchema.optional(),
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
