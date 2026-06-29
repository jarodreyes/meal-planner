import Link from "next/link";
import { readClient } from "@/lib/sanity/client";
import { mealPlansQuery, recipesListQuery } from "@/lib/sanity/queries";
import { RecipeSearch } from "@/app/components/RecipeSearch";
import { RecipeCard } from "@/app/components/RecipeCard";
import { MEAL_TYPES } from "@/lib/mealTypes";

type RecipeListItem = {
  _id: string;
  title: string;
  favorited?: boolean;
  importStatus?: string;
  nutritionStatus?: string;
  mealType?: string | null;
  tags?: string[];
  coverImage?: string | null;
};

type Props = {
  searchParams: Promise<{
    importStatus?: string;
    tag?: string;
    mealType?: string;
    favorited?: string;
  }>;
};

function chipHref(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) sp.set(k, v);
  });
  const q = sp.toString();
  return q ? `/recipes?${q}` : "/recipes";
}

export default async function RecipesPage({ searchParams }: Props) {
  const params = await searchParams;
  const importStatus = params.importStatus || undefined;
  const tag = params.tag || undefined;
  const mealType = params.mealType || undefined;
  const favorited = params.favorited === "true" ? true : undefined;

  const queryParams = {
    importStatus: importStatus ?? null,
    tagFilter: tag ?? null,
    mealType: mealType ?? null,
    favorited: favorited ?? null,
  };
  const [recipes, mealPlans] = await Promise.all([
    readClient.fetch(recipesListQuery, queryParams),
    readClient.fetch(mealPlansQuery),
  ]);
  const recipeList: RecipeListItem[] = recipes || [];
  const planOptions = mealPlans || [];

  const chipBase =
    "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition";
  const chipActive = "bg-brand-500 text-white shadow-sm";
  const chipIdle = "bg-white text-zinc-600 ring-1 ring-zinc-100";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-brand-500">Recipes</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          All recipes
        </h1>
      </div>

      <RecipeSearch />

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar">
        <Link
          href="/recipes"
          className={`${chipBase} ${!mealType && !favorited ? chipActive : chipIdle}`}
        >
          All
        </Link>
        {MEAL_TYPES.map((mt) => (
          <Link
            key={mt}
            href={chipHref({ mealType: mealType === mt ? undefined : mt, favorited: favorited ? "true" : undefined })}
            className={`${chipBase} capitalize ${mealType === mt ? chipActive : chipIdle}`}
          >
            {mt}
          </Link>
        ))}
        <Link
          href={chipHref({ mealType, favorited: favorited ? undefined : "true" })}
          className={`${chipBase} ${favorited ? chipActive : chipIdle}`}
        >
          ♥ Favorites
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {recipeList.map((recipe) => (
          <RecipeCard key={recipe._id} recipe={recipe} mealPlans={planOptions} />
        ))}
      </div>

      {!recipeList.length && (
        <div className="rounded-card bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-zinc-600">
            No recipes here yet. Import one to get started.
          </p>
          <Link
            href="/import"
            className="mt-3 inline-block rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white"
          >
            Import a recipe
          </Link>
        </div>
      )}
    </div>
  );
}
