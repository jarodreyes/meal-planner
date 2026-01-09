import { notFound } from "next/navigation";
import { readClient } from "@/lib/sanity/client";
import { recipeByIdQuery } from "@/lib/sanity/queries";
import { RecipeDetailClient } from "./RecipeDetailClient";

export default async function RecipeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const recipe = await readClient.fetch(recipeByIdQuery, { id: params.id });

  if (!recipe) {
    return notFound();
  }

  return <RecipeDetailClient recipe={recipe} />;
}
