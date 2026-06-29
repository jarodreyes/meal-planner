export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** Colorful gradient used as a placeholder when a recipe has no photo. */
export function gradientForMealType(mealType?: string | null): string {
  switch ((mealType || "").toLowerCase()) {
    case "breakfast":
      return "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)";
    case "lunch":
      return "linear-gradient(135deg, #2dd4bf 0%, #0ea5e9 100%)";
    case "dinner":
      return "linear-gradient(135deg, #f1580c 0%, #fb7185 100%)";
    case "snack":
      return "linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)";
    default:
      return "linear-gradient(135deg, #fb923c 0%, #f1580c 100%)";
  }
}

export const MEAL_TYPE_BADGE: Record<string, string> = {
  breakfast: "bg-fat/15 text-amber-700",
  lunch: "bg-carbs/15 text-teal-700",
  dinner: "bg-brand-100 text-brand-700",
  snack: "bg-purple-100 text-purple-700",
};
