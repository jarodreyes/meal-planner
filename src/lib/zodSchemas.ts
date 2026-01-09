import { z } from "zod";

export const nutritionFactsSchema = z.object({
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number().optional(),
  servingsBasis: z.number(),
  source: z.string(),
});

export const ingredientLineSchema = z.object({
  originalText: z.string(),
  nameNormalized: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  grams: z.number().optional(),
  notes: z.string().optional(),
});

export const recipeSchema = z.object({
  title: z.string(),
  sourceType: z.enum(["pdf", "paste"]),
  sourceName: z.string().optional(),
  sourceText: z.string(),
  servings: z.number().positive().optional(),
  ingredients: z.array(ingredientLineSchema).default([]),
  instructions: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
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
