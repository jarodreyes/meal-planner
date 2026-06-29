'use client';

import Link from "next/link";
import { FavoriteButton } from "./FavoriteButton";
import { AddToMealPlan } from "./AddToMealPlan";
import { gradientForMealType } from "@/lib/mealTypes";

type Recipe = {
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
  recipe: Recipe;
  mealPlans: { _id: string; weekOf?: string }[];
};

export function RecipeCard({ recipe, mealPlans }: Props) {
  return (
    <div className="group relative overflow-hidden rounded-card bg-white shadow-sm">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
        <FavoriteButton
          recipeId={recipe._id}
          initialFavorited={recipe.favorited}
          className="!p-2 backdrop-blur"
        />
        <AddToMealPlan
          recipeId={recipe._id}
          mealPlans={mealPlans}
          defaultMealType={recipe.mealType}
          variant="icon"
          className="!p-2 backdrop-blur"
        />
      </div>

      <Link href={`/recipes/${recipe._id}`} className="block">
        <div
          className="relative aspect-[4/3] w-full bg-cover bg-center"
          style={
            recipe.coverImage
              ? { backgroundImage: `url(${recipe.coverImage})` }
              : { backgroundImage: gradientForMealType(recipe.mealType) }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
          {recipe.mealType && (
            <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 backdrop-blur">
              {recipe.mealType}
            </span>
          )}
          <p className="absolute inset-x-3 bottom-2 line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow">
            {recipe.title}
          </p>
        </div>
      </Link>
    </div>
  );
}
