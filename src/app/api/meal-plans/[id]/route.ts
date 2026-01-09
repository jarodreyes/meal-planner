import { NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { date, mealType, recipeId, baselineServingsForMe } = body || {};

    if (!date || !mealType || !recipeId || !baselineServingsForMe) {
      return NextResponse.json(
        {
          error: "date, mealType, recipeId, baselineServingsForMe are required",
        },
        { status: 400 }
      );
    }

    const entry = {
      _key: crypto.randomUUID(),
      date,
      mealType,
      baselineServingsForMe: Number(baselineServingsForMe),
      recipe: {
        _type: "reference",
        _ref: recipeId,
      },
    };

    await writeClient
      .patch(params.id)
      .setIfMissing({ meals: [] })
      .append("meals", [entry])
      .commit();

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    console.error("Add meal error", error);
    return NextResponse.json(
      { error: "Failed to update meal plan", details: `${error}` },
      { status: 500 }
    );
  }
}
