import { notFound } from "next/navigation";
import { readClient } from "@/lib/sanity/client";
import {
  mealPlansQuery,
  recipeByIdQuery,
  recipesNavQuery,
} from "@/lib/sanity/queries";
import { RecipeDetailClient } from "./RecipeDetailClient";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) {
    return notFound();
  }

  const [recipe, nav, mealPlans] = await Promise.all([
    readClient.fetch(recipeByIdQuery, { id }),
    readClient.fetch(recipesNavQuery),
    readClient.fetch(mealPlansQuery),
  ]);

  if (!recipe) {
    return notFound();
  }

  return (
    <RecipeDetailClient recipe={recipe} nav={nav || []} mealPlans={mealPlans || []} />
  );
}
