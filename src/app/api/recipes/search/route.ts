import { NextResponse } from "next/server";
import { readClient } from "@/lib/sanity/client";
import { recipeSearchQuery } from "@/lib/sanity/queries";

export const runtime = "nodejs";

/**
 * Build a GROQ `match` term from the raw query. Each token gets a trailing
 * wildcard so search behaves like as-you-type prefix matching (e.g. "chick"
 * matches "chicken"). All tokens must be present (AND semantics of `match`).
 */
function buildTerm(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token}*`)
    .join(" ");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    const term = buildTerm(q);
    if (!term) {
      return NextResponse.json({ hits: [] });
    }

    const hits = await readClient.fetch(recipeSearchQuery, { term, limit });
    return NextResponse.json({ hits: hits ?? [] });
  } catch (error) {
    console.error("Recipe search error", error);
    return NextResponse.json(
      { error: "Search failed", details: `${error}` },
      { status: 500 }
    );
  }
}
