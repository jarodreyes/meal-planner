/**
 * One-time sync of all recipes from Sanity to Algolia.
 * Run from project root: npm run algolia:sync
 * (or: npx tsx scripts/algolia-initial-sync.ts)
 *
 * Requires .env / .env.local:
 *   ALGOLIA_APP_ID or NEXT_PUBLIC_ALGOLIA_APP_ID
 *   ALGOLIA_WRITE_KEY
 *   NEXT_PUBLIC_SANITY_PROJECT_ID (or SANITY_PROJECT_ID)
 *   NEXT_PUBLIC_SANITY_DATASET (or SANITY_DATASET)
 *   SANITY_API_TOKEN (for reading published content; optional if dataset is public)
 */
import process from "node:process";
import path from "node:path";
import { createClient } from "@sanity/client";
import { algoliasearch } from "algoliasearch";
import dotenv from "dotenv";
import { apiVersion } from "../src/lib/sanity/apiVersion";

// Load .env and .env.local so we pick up Algolia + Sanity vars
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const ALGOLIA_APP_ID =
  process.env.ALGOLIA_APP_ID || process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "";
const ALGOLIA_WRITE_KEY = process.env.ALGOLIA_WRITE_KEY || "";
const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";
const SANITY_TOKEN = process.env.SANITY_API_TOKEN || undefined;

const ALGOLIA_INDEX_NAME = "recipes";

const sanityClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion,
  useCdn: false,
  token: SANITY_TOKEN,
});

type Recipe = {
  _id: string;
  title: string | null;
  ingredients: Array<{ originalText?: string; nameNormalized?: string }>;
  instructions: string[];
  sourceText: string | null;
  tags: string[] | null;
  mealType: string | null;
  importStatus: string | null;
  _createdAt: string;
  _updatedAt: string;
  coverImage?: string | null;
};

const RECIPES_QUERY = `*[_type == "recipe"] {
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
  "coverImage": images[0].asset->url
}`;

function ingredientsToText(
  ingredients: Array<{ originalText?: string; nameNormalized?: string }>
): string {
  if (!ingredients?.length) return "";
  return ingredients
    .map((i) => [i.originalText, i.nameNormalized].filter(Boolean).join(" "))
    .join(" ");
}

async function initialSync() {
  console.log("Starting initial sync to Algolia (recipes)...");

  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
    console.error("Missing required environment variables:");
    console.error("- ALGOLIA_APP_ID (or NEXT_PUBLIC_ALGOLIA_APP_ID):", ALGOLIA_APP_ID ? "✓" : "✗");
    console.error("- ALGOLIA_WRITE_KEY:", ALGOLIA_WRITE_KEY ? "✓" : "✗");
    process.exit(1);
  }

  if (!PROJECT_ID || !DATASET) {
    console.error("Missing Sanity config:");
    console.error("- NEXT_PUBLIC_SANITY_PROJECT_ID (or SANITY_PROJECT_ID):", PROJECT_ID ? "✓" : "✗");
    console.error("- NEXT_PUBLIC_SANITY_DATASET (or SANITY_DATASET):", DATASET ? "✓" : "✗");
    process.exit(1);
  }

  const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY);

  try {
    const recipes = await sanityClient.fetch<Recipe[]>(RECIPES_QUERY);

    console.log(`Found ${recipes.length} recipes to sync`);

    if (recipes.length === 0) {
      console.log("No recipes found to sync.");
      return;
    }

    const algoliaDocuments = recipes.map((recipe) => {
      const ingredientsText = ingredientsToText(recipe.ingredients || []);
      const instructionsText = (recipe.instructions || []).join(" ");
      const sourceText = (recipe.sourceText || "").slice(0, 6000);

      const document = {
        objectID: recipe._id,
        title: (recipe.title || "Untitled").slice(0, 500),
        ingredientsText: ingredientsText.slice(0, 4000),
        instructionsText: instructionsText.slice(0, 4000),
        sourceText: sourceText.slice(0, 4000),
        tags: recipe.tags || [],
        mealType: recipe.mealType || null,
        importStatus: recipe.importStatus || null,
        coverImage: recipe.coverImage || null,
        _createdAt: recipe._createdAt,
        _updatedAt: recipe._updatedAt,
      };

      const size = JSON.stringify(document).length;
      if (size > 9000) {
        console.warn(`Document ${recipe._id} is ${size} bytes (near 10KB limit)`);
      }
      return document;
    });

    console.log("Clearing existing documents from Algolia index...");
    await algoliaClient.clearObjects({ indexName: ALGOLIA_INDEX_NAME });

    console.log("Uploading documents to Algolia...");
    await algoliaClient.saveObjects({
      indexName: ALGOLIA_INDEX_NAME,
      objects: algoliaDocuments,
    });

    console.log("Initial sync completed successfully.");
    console.log(`Synced ${algoliaDocuments.length} documents to index: ${ALGOLIA_INDEX_NAME}`);
  } catch (error) {
    console.error("Error during initial sync to Algolia:", error);
    process.exit(1);
  }
}

initialSync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
