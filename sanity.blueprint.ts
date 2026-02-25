/**
 * Sanity Blueprint: Algolia document sync for recipes.
 * Deploy with: npx sanity blueprints deploy
 * Requires: ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY, SANITY_PROJECT_ID, SANITY_DATASET in env.
 */
import "dotenv/config";
import process from "node:process";
import { defineBlueprint, defineDocumentFunction } from "@sanity/blueprints";

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_WRITE_KEY = process.env.ALGOLIA_WRITE_KEY;
const SANITY_PROJECT_ID =
  process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const SANITY_DATASET =
  process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

if (typeof ALGOLIA_APP_ID !== "string" || typeof ALGOLIA_WRITE_KEY !== "string") {
  throw new Error("ALGOLIA_APP_ID and ALGOLIA_WRITE_KEY must be set");
}
if (typeof SANITY_PROJECT_ID !== "string" || typeof SANITY_DATASET !== "string") {
  throw new Error("SANITY_PROJECT_ID and SANITY_DATASET must be set");
}

export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      type: "sanity.function.document",
      name: "algolia-recipe-sync",
      memory: 1,
      timeout: 10,
      src: "./functions/algolia-recipe-sync",
      event: {
        on: ["create", "update", "delete"],
        filter: "_type == 'recipe'",
        projection: `{
          _id,
          title,
          "ingredients": ingredients[] { originalText, nameNormalized },
          instructions,
          sourceText,
          tags,
          mealType,
          importStatus,
          _createdAt,
          _updatedAt,
          "coverImage": images[0].asset->url,
          "operation": delta::operation()
        }`,
      },
      env: {
        ALGOLIA_APP_ID,
        ALGOLIA_WRITE_KEY,
        SANITY_PROJECT_ID,
        SANITY_DATASET,
      },
    }),
  ],
});
