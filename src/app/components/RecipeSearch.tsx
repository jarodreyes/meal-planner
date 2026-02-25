"use client";

import { liteClient } from "algoliasearch/lite";
import Link from "next/link";
import { InstantSearchNext } from "react-instantsearch-nextjs";
import { SearchBox, Hits, useSearchBox } from "react-instantsearch";

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!;
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY!;

const searchClient =
  appId && apiKey ? liteClient(appId, apiKey) : undefined;

type RecipeHit = {
  objectID: string;
  title: string;
  ingredientsText?: string;
  instructionsText?: string;
  tags?: string[];
  mealType?: string | null;
  importStatus?: string | null;
  coverImage?: string | null;
};

function RecipeSearchResults() {
  const { query } = useSearchBox();

  if (!query.trim()) {
    return null;
  }

  return (
    <div className="mt-4 text-left">
      <h2 className="text-lg font-semibold text-zinc-800 mb-3">
        Results for &ldquo;{query}&rdquo;
      </h2>
      <Hits
        hitComponent={({ hit }: { hit: RecipeHit }) => (
          <Link
            href={`/recipes/${hit.objectID}`}
            className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-left hover:border-zinc-300 hover:bg-zinc-50/50"
          >
            {hit.coverImage ? (
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
        )}
      />
    </div>
  );
}

export function RecipeSearch() {
  if (!searchClient) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Search is not configured. Set NEXT_PUBLIC_ALGOLIA_APP_ID and
        NEXT_PUBLIC_ALGOLIA_API_KEY in your environment.
      </p>
    );
  }

  return (
    <InstantSearchNext
      indexName="recipes"
      searchClient={searchClient}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <SearchBox
        placeholder="Search recipes by title, ingredients, or instructions…"
        classNames={{
          input:
            "w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900",
          submit: "hidden",
          reset: "hidden",
          form: "block",
        }}
      />
      <RecipeSearchResults />
    </InstantSearchNext>
  );
}
