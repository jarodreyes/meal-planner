import { notFound } from "next/navigation";
import { readClient } from "@/lib/sanity/client";
import { recipeByIdQuery, recipesNavQuery } from "@/lib/sanity/queries";
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

  const [recipe, nav] = await Promise.all([
    readClient.fetch(recipeByIdQuery, { id }),
    readClient.fetch(recipesNavQuery),
  ]);

  if (!recipe) {
    return notFound();
  }

  return <RecipeDetailClient recipe={recipe} nav={nav || []} />;
}
