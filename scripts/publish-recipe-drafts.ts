/**
 * Publish recipe drafts so that generated images (and any other draft changes) show on the site.
 * The app uses perspective: "published", so content only appears after publishing.
 *
 * Run after generate-recipe-images has run and jobs have completed:
 *   npx tsx scripts/publish-recipe-drafts.ts
 *   npx tsx scripts/publish-recipe-drafts.ts --dry-run
 *
 * Requires: SANITY_API_TOKEN, NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET
 */
import process from "node:process";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@sanity/client";
import { apiVersion } from "../src/lib/sanity/apiVersion";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN || "";

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion,
  useCdn: false,
  token: TOKEN,
  perspective: "raw", // so we see draft docs with _id "drafts.xxx"
});

// Use "raw" perspective so we see draft documents with _id "drafts.xxx". With "drafts"
// perspective the API may return normalized ids and we get 0 draft ids.
const DRAFT_IDS_QUERY = `*[_type == "recipe" && _id in path("drafts.**")]._id`;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (!PROJECT_ID || !DATASET || !TOKEN) {
    console.error("Set NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, and SANITY_API_TOKEN.");
    process.exit(1);
  }

  // Explicitly query for draft document ids (drafts.xyz). With "drafts" perspective,
  // a plain *[_type == "recipe"]._id may return normalized ids; path("drafts.**") selects only drafts.
  const draftIds = await client.fetch<string[]>(DRAFT_IDS_QUERY);
  console.log(`Found ${draftIds.length} recipe draft(s) to publish.`);

  if (dryRun) {
    draftIds.forEach((id) => console.log(`  Would publish ${id} -> ${id.replace(/^drafts\./, "")}`));
    return;
  }

  let published = 0;
  for (const draftId of draftIds) {
    const publishedId = draftId.replace(/^drafts\./, "");
    const draft = await client.fetch<Record<string, unknown> | null>(
      `*[_id == $draftId][0]`,
      { draftId }
    );
    if (!draft) continue;
    const { _id: _draftId, _rev, ...rest } = draft;
    await client.createOrReplace({ ...rest, _id: publishedId });
    published++;
    console.log(`Published ${publishedId}`);
  }

  console.log(`\nDone. Published ${published} recipe(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
