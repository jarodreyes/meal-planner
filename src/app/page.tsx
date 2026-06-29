import Link from "next/link";
import { readClient } from "@/lib/sanity/client";
import {
  currentWeekPlanQuery,
  homeRailQuery,
  mealPlansQuery,
} from "@/lib/sanity/queries";
import { MacroRing } from "@/components/MacroRing";
import { MacroBars } from "@/components/MacroBars";
import { RecipeCard } from "@/app/components/RecipeCard";
import { MacroLine, scaleMacrosForServings } from "@/lib/nutrition";
import { gradientForMealType } from "@/lib/mealTypes";

type PlanMeal = {
  date: string;
  mealType: string;
  baselineServingsForMe: number;
  recipe?: {
    _id: string;
    title: string;
    servings?: number;
    mealType?: string | null;
    coverImage?: string | null;
    nutritionComputed?: MacroLine | null;
    nutritionProvided?: MacroLine | null;
  } | null;
};

type RailRecipe = {
  _id: string;
  title: string;
  favorited?: boolean;
  mealType?: string | null;
  coverImage?: string | null;
};

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export default async function Home() {
  const today = todayISO();

  const [plan, rail, mealPlans] = await Promise.all([
    readClient.fetch(currentWeekPlanQuery, { today }),
    readClient.fetch(homeRailQuery),
    readClient.fetch(mealPlansQuery),
  ]);

  const railRecipes: RailRecipe[] = rail || [];
  const planOptions = mealPlans || [];

  const allMeals: PlanMeal[] = plan?.meals || [];
  const todaysMeals = allMeals.filter((m) => m.date === today);

  const totals = todaysMeals.reduce(
    (acc, m) => {
      const macros = m.recipe?.nutritionComputed || m.recipe?.nutritionProvided;
      const scaled = scaleMacrosForServings(macros, m.baselineServingsForMe || 1);
      if (scaled) {
        acc.calories += scaled.total.calories;
        acc.protein += scaled.total.protein_g;
        acc.carbs += scaled.total.carbs_g;
        acc.fat += scaled.total.fat_g;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const prettyDate = new Date(today).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">{prettyDate}</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {greeting} 👋
        </h1>
      </div>

      {/* Today card */}
      <section className="rounded-card bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900">Today&apos;s meals</h2>
          {plan?._id && (
            <Link
              href={`/meal-plans/${plan._id}`}
              className="text-sm font-medium text-brand-600"
            >
              View plan
            </Link>
          )}
        </div>

        {todaysMeals.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-8 text-center">
            <span className="text-3xl">🍽️</span>
            <p className="text-sm text-zinc-600">No recipe planned today.</p>
            <Link
              href="/recipes"
              className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white"
            >
              Add a recipe
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-5">
              <MacroRing calories={totals.calories} size={120} />
              <div className="flex-1">
                <MacroBars protein={totals.protein} carbs={totals.carbs} fat={totals.fat} />
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {todaysMeals.map((m, i) =>
                m.recipe ? (
                  <li key={`${m.recipe._id}-${i}`}>
                    <Link
                      href={`/recipes/${m.recipe._id}`}
                      className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-2"
                    >
                      <div
                        className="h-12 w-12 shrink-0 rounded-xl bg-cover bg-center"
                        style={
                          m.recipe.coverImage
                            ? { backgroundImage: `url(${m.recipe.coverImage})` }
                            : { backgroundImage: gradientForMealType(m.mealType) }
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-800">
                          {m.recipe.title}
                        </p>
                        <p className="text-xs capitalize text-zinc-500">{m.mealType}</p>
                      </div>
                    </Link>
                  </li>
                ) : null
              )}
            </ul>
          </>
        )}
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { href: "/import", label: "Import", emoji: "📥" },
          { href: "/recipes?favorited=true", label: "Favorites", emoji: "♥️" },
          { href: "/meal-plans", label: "Plans", emoji: "📅" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center gap-1 rounded-card bg-white py-4 text-center shadow-sm"
          >
            <span className="text-2xl">{a.emoji}</span>
            <span className="text-xs font-semibold text-zinc-700">{a.label}</span>
          </Link>
        ))}
      </section>

      {/* Recipe rail */}
      {railRecipes.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">Your recipes</h2>
            <Link href="/recipes" className="text-sm font-medium text-brand-600">
              See all
            </Link>
          </div>
          <div className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
            {railRecipes.map((r) => (
              <div key={r._id} className="w-40 shrink-0">
                <RecipeCard recipe={r} mealPlans={planOptions} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
