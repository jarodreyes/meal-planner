import { NextResponse } from "next/server";
import { estimateCookedWeight } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const proteinGrams = Number(body.proteinGrams) || 0;
    const otherGrams = Number(body.otherGrams) || 0;
    const proteinLabels = Array.isArray(body.proteinLabels) ? body.proteinLabels : undefined;
    const otherLabels = Array.isArray(body.otherLabels) ? body.otherLabels : undefined;
    const recipeTitle = typeof body.recipeTitle === "string" ? body.recipeTitle : undefined;

    const estimate = await estimateCookedWeight({
      proteinGrams,
      otherGrams,
      proteinLabels,
      otherLabels,
      recipeTitle,
    });

    return NextResponse.json(estimate);
  } catch (error) {
    console.error("estimate-cooked-weight error", error);
    return NextResponse.json(
      { error: "Failed to estimate cooked weight", details: String(error) },
      { status: 500 }
    );
  }
}
