import Link from "next/link";
import { readClient } from "@/lib/sanity/client";

const query = `
*[_type == "recipe" && (importStatus == "needs_review" || importStatus == "failed")] | order(_createdAt desc) {
  _id,
  title,
  importStatus,
  nutritionStatus,
  confidence
}`;

export default async function ReviewPage() {
  const recipes = await readClient.fetch(query);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-zinc-500">Review</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Needs review</h1>
        <p className="text-sm text-zinc-600">
          Recipes that failed parsing or were flagged with low confidence.
        </p>
      </div>

      <div className="space-y-2">
        {recipes?.length ? (
          recipes.map((recipe: any) => (
            <Link
              key={recipe._id}
              href={`/recipes/${recipe._id}`}
              className="block rounded-lg border border-zinc-200 bg-white p-3 shadow-sm hover:border-zinc-300"
            >
              <p className="text-sm font-semibold text-zinc-800">{recipe.title}</p>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Import: {recipe.importStatus} • Nutrition: {recipe.nutritionStatus || "pending"} •
                Confidence: {recipe.confidence ?? "n/a"}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-zinc-600">No recipes need review.</p>
        )}
      </div>
    </div>
  );
}
