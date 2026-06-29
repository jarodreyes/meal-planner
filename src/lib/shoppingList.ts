import { sumFamilyMultipliers } from "./nutrition";

export type ShoppingIngredient = {
  originalText?: string | null;
  quantityText?: string | null;
  quantityNumber?: number | null;
  nameNormalized?: string | null;
  quantity?: string | null;
  unit?: string | null;
  grams?: number | null;
};

export type ShoppingPlanMeal = {
  baselineServingsForMe?: number | null;
  eaters?: string[] | null;
  recipe?: {
    title?: string | null;
    servings?: number | null;
    ingredients?: ShoppingIngredient[] | null;
  } | null;
};

export type ShoppingListItem = {
  key: string;
  name: string;
  unit: string | null;
  quantity: number | null;
  grams: number | null;
  recipes: string[];
  notes: string[];
};

function cleanName(ing: ShoppingIngredient): string {
  const normalized = ing.nameNormalized?.trim();
  if (normalized) return normalized;
  const original = ing.originalText?.trim();
  if (original) return original;
  return "Other";
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Build a consolidated shopping list from the meals of a weekly plan.
 * Ingredients are scaled by each meal's baseline servings vs. the recipe's
 * base servings, then grouped by normalized name + unit. Quantities and grams
 * are summed where available; otherwise the original line is kept as a note.
 */
export function buildShoppingList(meals: ShoppingPlanMeal[]): ShoppingListItem[] {
  const groups = new Map<string, ShoppingListItem>();

  for (const meal of meals) {
    const recipe = meal.recipe;
    if (!recipe?.ingredients?.length) continue;

    const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : null;
    const myServing =
      meal.baselineServingsForMe && meal.baselineServingsForMe > 0
        ? meal.baselineServingsForMe
        : 1;
    // Total servings to cook = my serving size x everyone eating. When no eaters
    // were recorded (older meals), fall back to my serving size alone.
    const wanted = meal.eaters && meal.eaters.length
      ? myServing * sumFamilyMultipliers(meal.eaters)
      : myServing;
    const factor = baseServings ? wanted / baseServings : 1;
    const recipeTitle = recipe.title?.trim() || "Untitled recipe";

    for (const ing of recipe.ingredients) {
      const name = cleanName(ing);
      const unit = ing.unit?.trim().toLowerCase() || null;
      const key = `${name.toLowerCase()}|${unit ?? ""}`;

      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          name,
          unit,
          quantity: null,
          grams: null,
          recipes: [],
          notes: [],
        };
        groups.set(key, group);
      }

      if (!group.recipes.includes(recipeTitle)) {
        group.recipes.push(recipeTitle);
      }

      const quantityNumber =
        typeof ing.quantityNumber === "number" ? ing.quantityNumber : null;
      const grams = typeof ing.grams === "number" ? ing.grams : null;

      let added = false;
      if (quantityNumber != null) {
        group.quantity = (group.quantity ?? 0) + quantityNumber * factor;
        added = true;
      }
      if (grams != null) {
        group.grams = (group.grams ?? 0) + grams * factor;
        added = true;
      }

      if (!added) {
        const line = ing.quantityText
          ? `${ing.quantityText}${unit ? ` ${unit}` : ""} ${name}`.trim()
          : ing.originalText?.trim() || name;
        if (line && !group.notes.includes(line)) {
          group.notes.push(line);
        }
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/** Human-readable amount, e.g. "2 cups", "150 g", or null when unknown. */
export function formatShoppingAmount(item: ShoppingListItem): string | null {
  const parts: string[] = [];
  if (item.quantity != null) {
    parts.push(`${formatNumber(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`);
  }
  if (item.grams != null) {
    parts.push(`${formatNumber(item.grams)} g`);
  }
  return parts.length ? parts.join(" · ") : null;
}
