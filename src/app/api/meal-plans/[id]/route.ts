import { NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      .patch(id)
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "meal plan id is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const mealKey = searchParams.get("mealKey") || body?.mealKey;

    if (mealKey) {
      // Remove a single meal entry from the plan by its array key.
      await writeClient
        .patch(id)
        .unset([`meals[_key=="${mealKey}"]`])
        .commit();
      return NextResponse.json({ ok: true, removed: mealKey });
    }

    // No mealKey: delete the entire meal plan.
    await writeClient.delete(id);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (error) {
    console.error("Delete meal plan error", error);
    return NextResponse.json(
      { error: "Failed to delete", details: `${error}` },
      { status: 500 }
    );
  }
}
