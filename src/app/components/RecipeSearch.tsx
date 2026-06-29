"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type RecipeHit = {
  _id: string;
  title: string;
  mealType?: string | null;
  tags?: string[];
  favorited?: boolean;
  ingredientsText?: string | null;
  coverImage?: string | null;
};

export function RecipeSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RecipeHit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      setStatus("idle");
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");

      fetch(`/api/recipes/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText);
          return res.json();
        })
        .then((data) => {
          setHits(data.hits ?? []);
          setStatus("idle");
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setStatus("error");
          setHits([]);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = query.trim();

  return (
    <div>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes…"
          className="w-full rounded-full border border-zinc-200 bg-white py-3 pl-11 pr-4 text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {status === "error" && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Search is temporarily unavailable. Browse recipes below in the meantime.
        </p>
      )}

      {trimmed && status !== "error" && (
        <div className="mt-4 text-left">
          <h2 className="mb-3 text-lg font-semibold text-zinc-800">
            {status === "loading"
              ? `Searching for "${trimmed}"…`
              : `Results for "${trimmed}"`}
          </h2>

          {status !== "loading" && hits.length === 0 ? (
            <p className="text-sm text-zinc-600">No recipes match that search.</p>
          ) : (
            <div className="space-y-2">
              {hits.map((hit) => (
                <Link
                  key={hit._id}
                  href={`/recipes/${hit._id}`}
                  className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-left hover:border-zinc-300 hover:bg-zinc-50/50"
                >
                  {hit.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hit.coverImage}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded bg-zinc-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900">{hit.title}</p>
                    {hit.mealType && (
                      <p className="text-xs uppercase tracking-wide text-zinc-500">
                        {hit.mealType}
                      </p>
                    )}
                    {hit.ingredientsText && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                        {hit.ingredientsText.slice(0, 120)}
                        {hit.ingredientsText.length > 120 ? "…" : ""}
                      </p>
                    )}
                    {hit.tags?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {hit.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
