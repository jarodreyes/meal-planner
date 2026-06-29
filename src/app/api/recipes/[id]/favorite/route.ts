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

    const body = await req.json().catch(() => ({}));
    const favorited = Boolean(body?.favorited);

    await writeClient.patch(id).set({ favorited }).commit();
    return NextResponse.json({ ok: true, favorited });
  } catch (error) {
    console.error("Toggle favorite error", error);
    return NextResponse.json(
      { error: "Failed to update favorite", details: `${error}` },
      { status: 500 }
    );
  }
}
