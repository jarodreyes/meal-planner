import { readClient } from "@/lib/sanity/client";
import { mealPlansQuery } from "@/lib/sanity/queries";
import { CreateMealPlanForm } from "./CreateMealPlanForm";
import { MealPlansList } from "./MealPlansList";

export default async function MealPlansPage() {
  const plans = await readClient.fetch(mealPlansQuery);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-brand-500">Meal plans</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Weekly planners
        </h1>
      </div>

      <CreateMealPlanForm />

      <MealPlansList plans={plans || []} />
    </div>
  );
}
