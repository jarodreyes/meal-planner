import Link from "next/link";
import { readClient } from "@/lib/sanity/client";
import { mealPlansQuery } from "@/lib/sanity/queries";
import { CreateMealPlanForm } from "./CreateMealPlanForm";

export default async function MealPlansPage() {
  const plans = await readClient.fetch(mealPlansQuery);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">Meal plans</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Weekly planners</h1>
        </div>
      </div>

      <CreateMealPlanForm />

      <div className="space-y-2">
        {plans?.length ? (
          plans.map((plan: any) => (
            <Link
              key={plan._id}
              href={`/meal-plans/${plan._id}`}
              className="block rounded-lg border border-zinc-200 bg-white p-3 shadow-sm hover:border-zinc-300"
            >
              <p className="text-sm font-semibold text-zinc-800">
                Week of {plan.weekOf}
              </p>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {plan.mealCount || 0} meals
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-zinc-600">No meal plans yet.</p>
        )}
      </div>
    </div>
  );
}
