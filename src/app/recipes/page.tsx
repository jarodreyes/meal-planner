import Link from "next/link";
import { readClient } from "@/lib/sanity/client";
import { recipesListQuery } from "@/lib/sanity/queries";

type Props = {
  searchParams: { importStatus?: string; tag?: string };
};

export default async function RecipesPage({ searchParams }: Props) {
  const params = await searchParams;
  const importStatus = params.importStatus || undefined;
  const tag = params.tag || undefined;

  const recipes =
    (await readClient.fetch(recipesListQuery, {
      importStatus: importStatus ?? null,
      tag: tag ?? null,
    })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">Recipes</p>
          <h1 className="text-2xl font-semibold text-zinc-900">All recipes</h1>
        </div>
        <Link
          href="/import"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Import recipes
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          Import status
          <select
            name="importStatus"
            defaultValue={importStatus ?? ""}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">Any</option>
            <option value="done">Done</option>
            <option value="needs_review">Needs review</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          Tag
          <input
            name="tag"
            defaultValue={tag ?? ""}
            placeholder="e.g. dinner"
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Filter
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {recipes.map((recipe: any) => (
          <Link
            key={recipe._id}
            href={`/recipes/${recipe._id}`}
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300"
          >
            <p className="text-sm font-semibold text-zinc-800">{recipe.title}</p>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Import: {recipe.importStatus || "n/a"} | Nutrition:{" "}
              {recipe.nutritionStatus || "pending"}
            </p>
            {recipe.mealType && (
              <p className="text-xs text-zinc-600">Meal type: {recipe.mealType}</p>
            )}
            {recipe.tags?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {recipe.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
      {!recipes.length && (
        <p className="text-sm text-zinc-600">
          No recipes yet. Import one to get started.
        </p>
      )}
    </div>
  );
}
