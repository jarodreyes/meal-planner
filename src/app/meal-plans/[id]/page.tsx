import { notFound } from "next/navigation";
import { readClient } from "@/lib/sanity/client";
import { mealPlanByIdQuery } from "@/lib/sanity/queries";
import { FamilyMacroTable } from "@/components/FamilyMacroTable";
import { FAMILY_MULTIPLIERS, MacroLine } from "@/lib/nutrition";
import {
  buildShoppingList,
  formatShoppingAmount,
  type ShoppingIngredient,
} from "@/lib/shoppingList";
import { AddMealForm } from "./AddMealForm";
import { DeletePlanButton, RemoveMealButton } from "./MealPlanActions";

// Reflect meals added/removed at runtime instead of build-time caching.
export const dynamic = "force-dynamic";

type Meal = {
  _key?: string;
  date: string;
  mealType: string;
  baselineServingsForMe: number;
  eaters?: string[];
  recipe?: {
    _id: string;
    title: string;
    servings: number;
    ingredients?: ShoppingIngredient[];
    nutritionComputed?: MacroLine;
    nutritionProvided?: MacroLine;
  };
};

function totalsForMeal(macros: MacroLine | undefined, baselineServings: number) {
  if (!macros || !baselineServings) return null;
  const perServing = {
    calories: macros.calories / macros.servingsBasis,
    protein: macros.protein_g / macros.servingsBasis,
    carbs: macros.carbs_g / macros.servingsBasis,
    fat: macros.fat_g / macros.servingsBasis,
  };

  return {
    calories: perServing.calories * baselineServings,
    protein: perServing.protein * baselineServings,
    carbs: perServing.carbs * baselineServings,
    fat: perServing.fat * baselineServings,
  };
}

export default async function MealPlanDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await readClient.fetch(mealPlanByIdQuery, { id });
  if (!plan) return notFound();

  const recipesForSelect =
    (await readClient.fetch(`*[_type == "recipe"]{_id, title} | order(title asc)`)) || [];

  const meals: Meal[] = plan.meals || [];

  const shoppingList = buildShoppingList(meals);

  // "My day" totals: only count meals I'm actually eating (Me selected, or no
  // eaters recorded on older meals). Scaled to my serving size (Me multiplier = 1).
  const dailyTotals = meals.reduce<
    Record<string, { calories: number; protein: number; carbs: number; fat: number }>
  >((acc, meal) => {
    const eating = !meal.eaters?.length || meal.eaters.includes("Me");
    if (!eating) return acc;
    const macros = (meal.recipe?.nutritionComputed ||
      meal.recipe?.nutritionProvided) as MacroLine | undefined;
    const totals = totalsForMeal(macros, meal.baselineServingsForMe);
    if (!totals) return acc;
    const key = meal.date || "unscheduled";
    acc[key] = acc[key] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    acc[key].calories += totals.calories;
    acc[key].protein += totals.protein;
    acc[key].carbs += totals.carbs;
    acc[key].fat += totals.fat;
    return acc;
  }, {});

  const dailyFamilyTotals = meals.reduce<
    Record<
      string,
      Record<string, { calories: number; protein: number; carbs: number; fat: number }>
    >
  >((acc, meal) => {
    const macros = (meal.recipe?.nutritionComputed ||
      meal.recipe?.nutritionProvided) as MacroLine | undefined;
    if (!macros) return acc;
    const perServing = {
      calories: macros.calories / macros.servingsBasis,
      protein: macros.protein_g / macros.servingsBasis,
      carbs: macros.carbs_g / macros.servingsBasis,
      fat: macros.fat_g / macros.servingsBasis,
    };
    const key = meal.date || "unscheduled";
    acc[key] = acc[key] || {};
    const eaters = meal.eaters?.length ? meal.eaters : Object.keys(FAMILY_MULTIPLIERS);
    eaters.forEach((person) => {
      const multiplier = FAMILY_MULTIPLIERS[person] ?? 0;
      const servings = meal.baselineServingsForMe * multiplier;
      const totals = {
        calories: perServing.calories * servings,
        protein: perServing.protein * servings,
        carbs: perServing.carbs * servings,
        fat: perServing.fat * servings,
      };
      acc[key][person] = acc[key][person] || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      acc[key][person].calories += totals.calories;
      acc[key][person].protein += totals.protein;
      acc[key][person].carbs += totals.carbs;
      acc[key][person].fat += totals.fat;
    });
    return acc;
  }, {});

  const MEAL_GROUPS: { type: string; label: string; emoji: string; header: string }[] = [
    { type: "breakfast", label: "Breakfast", emoji: "🥞", header: "bg-fat/15 text-amber-700" },
    { type: "lunch", label: "Lunch", emoji: "🥗", header: "bg-carbs/15 text-teal-700" },
    { type: "dinner", label: "Dinner", emoji: "🍽️", header: "bg-brand-100 text-brand-700" },
    { type: "snack", label: "Snacks", emoji: "🍎", header: "bg-purple-100 text-purple-700" },
  ];

  const mealsByType = (type: string) =>
    meals.filter((m) => (m.mealType || "").toLowerCase() === type);
  const otherMeals = meals.filter(
    (m) => !MEAL_GROUPS.some((g) => g.type === (m.mealType || "").toLowerCase())
  );

  const renderMeal = (meal: Meal, idx: number) => {
    const macros = (meal.recipe?.nutritionComputed ||
      meal.recipe?.nutritionProvided) as MacroLine | undefined;
    const totals = totalsForMeal(macros, meal.baselineServingsForMe);
    return (
      <div key={meal._key || idx} className="rounded-2xl bg-zinc-50 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-800">
              {meal.recipe?._id ? (
                <a href={`/recipes/${meal.recipe._id}`} className="hover:text-brand-600">
                  {meal.recipe.title}
                </a>
              ) : (
                meal.recipe?.title || "No recipe"
              )}
            </p>
            <p className="text-xs text-zinc-500">
              {meal.date || "unscheduled"} · {meal.baselineServingsForMe}x (Me)
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {totals ? (
              <div className="text-right">
                <p className="text-sm font-bold text-zinc-900">{totals.calories.toFixed(0)}</p>
                <p className="text-[10px] uppercase text-zinc-400">cal</p>
              </div>
            ) : (
              <p className="text-xs text-red-500">No macros</p>
            )}
            <RemoveMealButton planId={plan._id} mealKey={meal._key} />
          </div>
        </div>
        {totals && (
          <div className="mt-1 flex gap-3 text-xs">
            <span className="text-protein">P {totals.protein.toFixed(0)}g</span>
            <span className="text-carbs">C {totals.carbs.toFixed(0)}g</span>
            <span className="text-fat">F {totals.fat.toFixed(0)}g</span>
          </div>
        )}
        {meal.eaters?.length ? (
          <p className="mt-1 text-[11px] text-zinc-400">Eating: {meal.eaters.join(", ")}</p>
        ) : null}
        {macros && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-brand-600">
              Family breakdown
            </summary>
            <div className="mt-2">
              <FamilyMacroTable
                macros={macros}
                baselineServings={meal.baselineServingsForMe}
                people={meal.eaters}
              />
            </div>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <a href="/meal-plans" className="text-sm font-medium text-brand-500">
            ← Meal plans
          </a>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Week of {plan.weekOf}
          </h1>
        </div>
        <DeletePlanButton planId={plan._id} />
      </div>

      <AddMealForm planId={plan._id} recipes={recipesForSelect} />

      {meals.length === 0 ? (
        <div className="rounded-card bg-white p-8 text-center text-sm text-zinc-600 shadow-sm">
          No meals yet. Add one above.
        </div>
      ) : (
        <div className="space-y-4">
          {MEAL_GROUPS.map((group) => {
            const groupMeals = mealsByType(group.type);
            if (!groupMeals.length) return null;
            return (
              <section key={group.type} className="rounded-card bg-white p-4 shadow-sm">
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${group.header}`}>
                  <span>{group.emoji}</span>
                  {group.label}
                </div>
                <div className="mt-3 space-y-2">
                  {groupMeals.map((m, i) => renderMeal(m, i))}
                </div>
              </section>
            );
          })}
          {otherMeals.length > 0 && (
            <section className="rounded-card bg-white p-4 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-600">
                Other
              </div>
              <div className="mt-3 space-y-2">
                {otherMeals.map((m, i) => renderMeal(m, i))}
              </div>
            </section>
          )}
        </div>
      )}

      {shoppingList.length > 0 && (
        <details className="rounded-card bg-white p-5 shadow-sm" open>
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <span className="text-base font-bold text-zinc-900">🛒 Shopping list</span>
            <span className="text-xs text-zinc-400">{shoppingList.length} items</span>
          </summary>
          <p className="mt-2 text-xs text-zinc-500">
            Combined ingredients from every recipe, scaled to baseline servings.
          </p>
          <ul className="mt-3 divide-y divide-zinc-100">
            {shoppingList.map((item) => {
              const amount = formatShoppingAmount(item);
              return (
                <li
                  key={item.key}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-800">
                    {amount ? `${amount} ` : ""}
                    {item.name}
                  </span>
                  <span className="text-xs text-zinc-400">{item.recipes.join(", ")}</span>
                  {item.notes.length > 0 && (
                    <span className="w-full text-xs text-zinc-400">{item.notes.join("; ")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {Object.keys(dailyTotals).length > 0 && (
        <details className="rounded-card bg-white p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <span className="text-base font-bold text-zinc-900">📊 Daily totals</span>
            <span className="text-xs text-zinc-400">{Object.keys(dailyTotals).length} days</span>
          </summary>
          <div className="mt-3 space-y-3">
            {Object.entries(dailyTotals).map(([day, totals]) => (
              <div key={day} className="rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-800">{day}</p>
                <p className="mt-0.5 text-sm">
                  {totals.calories.toFixed(0)} cal · <span className="text-protein">P {totals.protein.toFixed(0)}</span> ·{" "}
                  <span className="text-carbs">C {totals.carbs.toFixed(0)}</span> ·{" "}
                  <span className="text-fat">F {totals.fat.toFixed(0)}</span>{" "}
                  <span className="text-zinc-400">(Me)</span>
                </p>
                <div className="mt-2 space-y-1 text-xs text-zinc-600">
                  {Object.entries(dailyFamilyTotals[day] || {}).map(([person, macros]) => (
                    <div key={person}>
                      <span className="font-semibold text-zinc-700">{person}:</span>{" "}
                      {macros.calories.toFixed(0)} cal · P {macros.protein.toFixed(0)} · C{" "}
                      {macros.carbs.toFixed(0)} · F {macros.fat.toFixed(0)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
