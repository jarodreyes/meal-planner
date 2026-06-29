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
  /** Summed gram weight across recipes (preferred for scale-based recipes). */
  grams: number | null;
  /** Summed volume/count amounts grouped by unit, for non-gram ingredients. */
  units: { unit: string | null; quantity: number }[];
  recipes: string[];
  /** Lines we couldn't turn into a number (kept verbatim for reference). */
  notes: string[];
};

const UNICODE_FRACTIONS = "½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚";
const UNIT_WORDS = [
  "cups", "cup", "tbsps", "tbsp", "tablespoons", "tablespoon",
  "tsps", "tsp", "teaspoons", "teaspoon", "grams", "gram", "g",
  "kg", "ml", "l", "ounces", "ounce", "oz", "pounds", "pound", "lbs", "lb",
  "scoops", "scoop", "cloves", "clove", "pinch", "slices", "slice",
  "pieces", "piece",
];

/** Remove a leading quantity (incl. unicode fractions/ranges) and unit word. */
function stripLeadingQuantity(text: string): string {
  let t = text.trim();
  const qtyRe = new RegExp(
    `^\\s*(\\d+\\s*[-–]\\s*\\d+|\\d+\\s+\\d+\\/\\d+|\\d+\\s*[${UNICODE_FRACTIONS}]|\\d+\\/\\d+|[${UNICODE_FRACTIONS}]|\\d+(?:\\.\\d+)?)\\s*`
  );
  t = t.replace(qtyRe, "");
  const unitRe = new RegExp(`^(?:${UNIT_WORDS.join("|")})\\b\\s*`, "i");
  t = t.replace(unitRe, "");
  return t.trim();
}

/** Human-readable ingredient name (prefers the normalized name from import). */
function displayName(ing: ShoppingIngredient): string {
  const normalized = ing.nameNormalized?.trim();
  if (normalized) return normalized;
  const original = ing.originalText?.trim();
  if (original) {
    const stripped = stripLeadingQuantity(original);
    return stripped || original;
  }
  return "Other";
}

/**
 * Conservative grouping key: lowercased, parentheticals and punctuation
 * removed, and tokens sorted so word-order/comma differences merge (e.g.
 * "plain Greek yogurt" and "Greek yogurt, plain") without stripping
 * descriptors or brands.
 */
function canonicalKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Build a consolidated shopping list from the meals of a weekly plan.
 * Ingredients are scaled to feed everyone eating each meal, then grouped by a
 * canonical name. Gram weights are summed (preferred); otherwise like-unit
 * amounts are summed; anything unparseable is kept as a note.
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
      const name = displayName(ing);
      const key = canonicalKey(name);

      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          name,
          grams: null,
          units: [],
          recipes: [],
          notes: [],
        };
        groups.set(key, group);
      }

      if (!group.recipes.includes(recipeTitle)) {
        group.recipes.push(recipeTitle);
      }

      const grams = typeof ing.grams === "number" && ing.grams > 0 ? ing.grams : null;
      const quantityNumber =
        typeof ing.quantityNumber === "number" && ing.quantityNumber > 0
          ? ing.quantityNumber
          : null;

      let added = false;
      if (grams != null) {
        group.grams = (group.grams ?? 0) + grams * factor;
        added = true;
      }
      if (quantityNumber != null) {
        const unit = ing.unit?.trim().toLowerCase() || null;
        const existing = group.units.find((u) => u.unit === unit);
        if (existing) existing.quantity += quantityNumber * factor;
        else group.units.push({ unit, quantity: quantityNumber * factor });
        added = true;
      }

      if (!added) {
        const unit = ing.unit?.trim() || null;
        const line = ing.quantityText
          ? `${ing.quantityText}${unit ? ` ${unit}` : ""} ${name}`.trim()
          : ing.originalText?.trim() || name;
        if (line && !group.notes.includes(line)) {
          group.notes.push(line);
        }
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Human-readable amount, e.g. "300 g", "2 cup", "300 g · 1 tbsp", or null. */
export function formatShoppingAmount(item: ShoppingListItem): string | null {
  const parts: string[] = [];
  if (item.grams != null) {
    parts.push(`${Math.round(item.grams)} g`);
  }
  for (const u of item.units) {
    parts.push(`${formatNumber(u.quantity)}${u.unit ? ` ${u.unit}` : ""}`);
  }
  return parts.length ? parts.join(" · ") : null;
}
