import { NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";

export const runtime = "nodejs";

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
    const mealType = body?.mealType as string | undefined;
    const allowed = ["breakfast", "lunch", "dinner", "snack", null];

    if (!allowed.includes(mealType as any)) {
      return NextResponse.json({ error: "Invalid mealType" }, { status: 400 });
    }

    await writeClient.patch(id).set({ mealType: mealType || null }).commit();
    return NextResponse.json({ ok: true, mealType: mealType || null });
  } catch (error) {
    console.error("Update mealType error", error);
    return NextResponse.json(
      { error: "Failed to update meal type", details: `${error}` },
      { status: 500 }
    );
  }
}
