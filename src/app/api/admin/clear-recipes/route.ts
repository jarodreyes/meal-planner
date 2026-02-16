import { NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    const result = await writeClient.delete({ query: '*[_type == "recipe"]' });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Failed to delete recipes", error);
    return NextResponse.json(
      { error: "Failed to delete recipes", details: `${error}` },
      { status: 500 }
    );
  }
}
