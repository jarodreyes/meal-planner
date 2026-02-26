/**
 * Find and delete duplicate recipes in Sanity (same normalized title).
 * Keeps the earliest recipe per group (_createdAt); deletes the rest.
 *
 * Run from project root:
 *   npm run recipes:dedupe           # dry run (print only)
 *   npm run recipes:dedupe -- --yes  # actually delete
 *
 * Requires .env / .env.local:
 *   NEXT_PUBLIC_SANITY_PROJECT_ID (or SANITY_PROJECT_ID)
 *   NEXT_PUBLIC_SANITY_DATASET (or SANITY_DATASET)
 *   SANITY_API_TOKEN (must have write access)
 */
import process from "node:process";
import path from "node:path";
import { createClient } from "@sanity/client";
import dotenv from "dotenv";
import { apiVersion } from "../src/lib/sanity/apiVersion";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";
const SANITY_TOKEN = process.env.SANITY_API_TOKEN || undefined;

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion,
  useCdn: false,
  token: SANITY_TOKEN,
});

type RecipeStub = {
  _id: string;
  title: string | null;
  _createdAt: string;
};

const QUERY = `*[_type == "recipe"] { _id, title, _createdAt }`;

function normalizeTitle(title: string | null): string {
  if (title == null || title === "") return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function main() {
  const dryRun = !process.argv.includes("--yes");

  if (!PROJECT_ID || !DATASET) {
    console.error("Missing SANITY_PROJECT_ID or SANITY_DATASET in env.");
    process.exit(1);
  }
  if (!SANITY_TOKEN && !dryRun) {
    console.error("SANITY_API_TOKEN is required to delete. Set it in .env.local or run with dry run only.");
    process.exit(1);
  }

  if (dryRun) {
    console.log("Running in DRY RUN mode. No documents will be deleted.");
    console.log("Run with --yes to perform deletions.\n");
  }
}

main();

async function run() {
  const dryRun = !process.argv.includes("--yes");

  const recipes = await client.fetch<RecipeStub[]>(QUERY);
  if (!recipes?.length) {
    console.log("No recipes found.");
    return;
  }

  const byKey = new Map<string, RecipeStub[]>();
  for (const r of recipes) {
    const key = normalizeTitle(r.title);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(r);
  }

  const duplicateGroups = [...byKey.entries()].filter(([, docs]) => docs.length > 1);

  if (duplicateGroups.length === 0) {
    console.log("No duplicate recipe titles found.");
    return;
  }

  const toDelete: RecipeStub[] = [];
  for (const [key, docs] of duplicateGroups) {
    const sorted = [...docs].sort(
      (a, b) => new Date(a._createdAt).getTime() - new Date(b._createdAt).getTime()
    );
    const keep = sorted[0];
    const duplicates = sorted.slice(1);
    console.log(`"${key}" (${docs.length} copies): keeping ${keep._id} (${keep._createdAt}), removing ${duplicates.length}`);
    for (const d of duplicates) {
      console.log(`  - would delete: ${d._id} (${d._createdAt})`);
      toDelete.push(d);
    }
  }

  console.log(`\nTotal: ${toDelete.length} duplicate(s) to delete.`);

  if (toDelete.length === 0) {
    return;
  }

  if (dryRun) {
    console.log("\nDry run complete. Run with --yes to delete these documents.");
    return;
  }

  const ids = toDelete.map((d) => d._id);
  const tx = client.transaction();
  for (const id of ids) {
    tx.delete(id);
  }
  await tx.commit();
  console.log(`\nDeleted ${ids.length} duplicate recipe document(s).`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
