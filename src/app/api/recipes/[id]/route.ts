import { NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing recipe id" }, { status: 400 });
    }
    await writeClient.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete recipe error", error);
    return NextResponse.json(
      { error: "Failed to delete recipe", details: String(error) },
      { status: 500 }
    );
  }
}
