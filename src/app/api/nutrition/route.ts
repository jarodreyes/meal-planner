import { NextResponse } from "next/server";
import { readClient, writeClient } from "@/lib/sanity/client";
import { normalizeIngredients } from "@/lib/ai";
import { nutritionStubFromIngredients } from "@/lib/nutrition";
import { recipeByIdQuery } from "@/lib/sanity/queries";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const recipeId = body?.recipeId as string | undefined;

    if (!recipeId) {
      return NextResponse.json({ error: "recipeId is required" }, { status: 400 });
    }

    const recipe = await readClient.fetch(recipeByIdQuery, { id: recipeId });
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    let ingredients = recipe.ingredients || [];
    const missingGrams = ingredients.some((ing: any) => !ing?.grams);

    if (missingGrams) {
      try {
        ingredients = await normalizeIngredients(ingredients);
      } catch (error) {
        console.error("Normalization error", error);
      }
    }

    const servings = recipe.servings || 1;
    const macros = nutritionStubFromIngredients(ingredients, servings);

    await writeClient
      .patch(recipeId)
      .set({
        ingredients,
        nutritionComputed: macros,
        nutritionStatus: "computed",
        nutritionComputedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({ nutritionComputed: macros, ingredients });
  } catch (error) {
    console.error("Nutrition API error", error);
    return NextResponse.json({ error: "Failed to compute nutrition", details: `${error}` }, { status: 500 });
  }
}
