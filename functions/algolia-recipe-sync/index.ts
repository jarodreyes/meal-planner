/**
 * Sanity Document Function: sync recipe create/update/delete to Algolia.
 * Triggered by blueprint event filter _type == 'recipe'.
 */
import { env } from "node:process";
import { documentEventHandler } from "@sanity/functions";
import { algoliasearch } from "algoliasearch";

const ALGOLIA_APP_ID = env.ALGOLIA_APP_ID || "";
const ALGOLIA_WRITE_KEY = env.ALGOLIA_WRITE_KEY || "";
const ALGOLIA_INDEX_NAME = "recipes";

type Ingredient = { originalText?: string; nameNormalized?: string };

export const handler = documentEventHandler(async ({ event }) => {
  const data = event.data as {
    _id: string;
    title?: string | null;
    ingredients?: Ingredient[];
    instructions?: string[];
    sourceText?: string | null;
    tags?: string[] | null;
    mealType?: string | null;
    importStatus?: string | null;
    _createdAt: string;
    _updatedAt: string;
    coverImage?: string | null;
    operation: "create" | "update" | "delete";
  };

  const { _id, title, operation } = data;

  const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);

  if (operation === "delete") {
    await algolia.deleteObject({
      indexName: ALGOLIA_INDEX_NAME,
      objectID: _id,
    });
    console.log(`Deleted recipe ${_id} ("${title}") from Algolia`);
    return;
  }

  const ingredientsText = (data.ingredients || [])
    .map((i) => [i.originalText, i.nameNormalized].filter(Boolean).join(" "))
    .join(" ");
  const instructionsText = (data.instructions || []).join(" ");
  const sourceText = (data.sourceText || "").slice(0, 6000);

  const document = {
    title: (data.title || "Untitled").slice(0, 500),
    ingredientsText: ingredientsText.slice(0, 4000),
    instructionsText: instructionsText.slice(0, 4000),
    sourceText: sourceText.slice(0, 4000),
    tags: data.tags || [],
    mealType: data.mealType || null,
    importStatus: data.importStatus || null,
    coverImage: data.coverImage || null,
    _createdAt: data._createdAt,
    _updatedAt: data._updatedAt,
  };

  await algolia.saveObjects({
    indexName: ALGOLIA_INDEX_NAME,
    objects: [{ objectID: _id, ...document }],
  });

  console.log(`Synced recipe ${_id} ("${document.title}") to Algolia`);
});
