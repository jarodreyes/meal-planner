import { NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const weekOf = body?.weekOf as string | undefined;
    if (!weekOf) {
      return NextResponse.json({ error: "weekOf is required (YYYY-MM-DD)" }, { status: 400 });
    }

    const created = await writeClient.create({
      _type: "mealPlan",
      weekOf,
      meals: [],
    });

    return NextResponse.json({ id: created._id, weekOf });
  } catch (error) {
    console.error("Create meal plan error", error);
    return NextResponse.json({ error: "Failed to create meal plan", details: `${error}` }, { status: 500 });
  }
}
