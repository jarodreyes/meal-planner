import { NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";

export const runtime = "nodejs";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "recipe id is required" }, { status: 400 });
    }

    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if ("mealType" in body) {
      const mealType = body.mealType as string | null;
      if (mealType !== null && !MEAL_TYPES.includes(mealType)) {
        return NextResponse.json({ error: "Invalid mealType" }, { status: 400 });
      }
      patch.mealType = mealType || null;
    }

    if ("servingForMe" in body) {
      const serving = Number(body.servingForMe);
      if (!Number.isFinite(serving) || serving <= 0) {
        return NextResponse.json({ error: "Invalid servingForMe" }, { status: 400 });
      }
      patch.defaultServingForMe = serving;
    }

    if ("eaters" in body) {
      const eaters = Array.isArray(body.eaters)
        ? body.eaters.filter((p: unknown): p is string => typeof p === "string")
        : [];
      patch.defaultEaters = eaters;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No settings provided" }, { status: 400 });
    }

    await writeClient.patch(id).set(patch).commit();
    return NextResponse.json({ ok: true, ...patch });
  } catch (error) {
    console.error("Update recipe settings error", error);
    return NextResponse.json(
      { error: "Failed to update settings", details: `${error}` },
      { status: 500 }
    );
  }
}
