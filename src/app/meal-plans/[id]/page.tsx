import { notFound } from "next/navigation";
import { readClient } from "@/lib/sanity/client";
import { mealPlanByIdQuery } from "@/lib/sanity/queries";
import { FamilyMacroTable } from "@/components/FamilyMacroTable";
import { FAMILY_MULTIPLIERS, MacroLine } from "@/lib/nutrition";
import { AddMealForm } from "./AddMealForm";

type Meal = {
  date: string;
  mealType: string;
  baselineServingsForMe: number;
  recipe?: {
    _id: string;
    title: string;
    servings: number;
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
  params: { id: string };
}) {
  const plan = await readClient.fetch(mealPlanByIdQuery, { id: params.id });
  if (!plan) return notFound();

  const recipesForSelect =
    (await readClient.fetch(`*[_type == "recipe"]{_id, title} | order(title asc)`)) || [];

  const meals: Meal[] = plan.meals || [];

  const dailyTotals = meals.reduce<
    Record<string, { calories: number; protein: number; carbs: number; fat: number }>
  >((acc, meal) => {
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
    Object.entries(FAMILY_MULTIPLIERS).forEach(([person, multiplier]) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">Meal plan</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Week of {plan.weekOf}</h1>
        </div>
      </div>

      <AddMealForm planId={plan._id} recipes={recipesForSelect} />

      <div className="space-y-3">
        {meals.length ? (
          meals.map((meal, idx) => {
            const macros =
              (meal.recipe?.nutritionComputed ||
                meal.recipe?.nutritionProvided) as MacroLine | undefined;
            const totals = totalsForMeal(macros, meal.baselineServingsForMe);
            return (
              <div
                key={meal._key || idx}
                className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      {meal.date || "unscheduled"} · {meal.mealType}
                    </p>
                    <p className="text-sm font-semibold text-zinc-800">
                      {meal.recipe?.title || "No recipe"}
                    </p>
                    <p className="text-xs text-zinc-600">
                      Baseline servings (Me): {meal.baselineServingsForMe}
                    </p>
                  </div>
                  {totals ? (
                    <div className="text-right text-xs text-zinc-600">
                      <div>{totals.calories.toFixed(0)} cal</div>
                      <div>
                        P {totals.protein.toFixed(1)} · C {totals.carbs.toFixed(1)} · F{" "}
                        {totals.fat.toFixed(1)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-red-600">No macros yet. Compute on recipe.</p>
                  )}
                </div>
                <FamilyMacroTable
                  macros={macros || null}
                  baselineServings={meal.baselineServingsForMe}
                />
              </div>
            );
          })
        ) : (
          <p className="text-sm text-zinc-600">No meals yet. Add one above.</p>
        )}
      </div>

      {Object.keys(dailyTotals).length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-zinc-800">Daily totals</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Object.entries(dailyTotals).map(([day, totals]) => (
              <div key={day} className="rounded border border-zinc-200 p-3 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-800">{day}</p>
                <p className="text-xs text-zinc-600">Baseline totals (Me)</p>
                <p className="text-sm">
                  {totals.calories.toFixed(0)} cal · P {totals.protein.toFixed(1)} · C{" "}
                  {totals.carbs.toFixed(1)} · F {totals.fat.toFixed(1)}
                </p>
                <div className="mt-2 space-y-1 text-xs text-zinc-700">
                  {Object.entries(dailyFamilyTotals[day] || {}).map(([person, macros]) => (
                    <div key={person}>
                      <span className="font-semibold">{person}:</span>{" "}
                      {macros.calories.toFixed(0)} cal · P {macros.protein.toFixed(1)} · C{" "}
                      {macros.carbs.toFixed(1)} · F {macros.fat.toFixed(1)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
