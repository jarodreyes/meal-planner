import { ParsedRecipe } from "./zodSchemas";

export type MacroLine = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  servingsBasis: number;
  source: string;
};

export const FAMILY_MULTIPLIERS: Record<string, number> = {
  Me: 1.0,
  Wife: 0.75,
  Elliot: 0.75,
  Noah: 0.5,
};

export function nutritionStubFromIngredients(
  ingredients: ParsedRecipe["ingredients"],
  servings: number
): MacroLine {
  /**
   * Stub computation: estimate macros based on grams if provided.
   * This is intentionally simple so it can be swapped later.
   */
  const totals = ingredients.reduce(
    (acc, ingredient) => {
      const grams = ingredient.grams ?? 0;
      // Very rough heuristic: 2 cal/g, 0.1g protein/g, 0.15g carbs/g, 0.05g fat/g
      acc.calories += grams * 2;
      acc.protein_g += grams * 0.1;
      acc.carbs_g += grams * 0.15;
      acc.fat_g += grams * 0.05;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  return {
    ...totals,
    servingsBasis: servings || 1,
    source: "computed_stub",
  };
}

export function scaleMacrosForServings(macros: MacroLine | null | undefined, servings: number) {
  if (!macros || servings <= 0) return null;
  const perServing = {
    calories: macros.calories / macros.servingsBasis,
    protein_g: macros.protein_g / macros.servingsBasis,
    carbs_g: macros.carbs_g / macros.servingsBasis,
    fat_g: macros.fat_g / macros.servingsBasis,
    fiber_g: macros.fiber_g ? macros.fiber_g / macros.servingsBasis : undefined,
  };

  return {
    perServing,
    total: {
      calories: perServing.calories * servings,
      protein_g: perServing.protein_g * servings,
      carbs_g: perServing.carbs_g * servings,
      fat_g: perServing.fat_g * servings,
      fiber_g: perServing.fiber_g ? perServing.fiber_g * servings : undefined,
    },
  };
}

export function computeFamilyServingTable(
  macros: MacroLine | null | undefined,
  baselineServingsForMe: number
) {
  if (!macros || baselineServingsForMe <= 0) return [];
  const { perServing } = scaleMacrosForServings(macros, 1)!;

  return Object.entries(FAMILY_MULTIPLIERS).map(([person, multiplier]) => {
    const servings = baselineServingsForMe * multiplier;
    return {
      person,
      servings,
      calories: perServing.calories * servings,
      protein: perServing.protein_g * servings,
      carbs: perServing.carbs_g * servings,
      fat: perServing.fat_g * servings,
    };
  });
}
