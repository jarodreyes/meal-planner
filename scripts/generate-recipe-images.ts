/**
 * Generate one image per recipe using Sanity Agent Actions (same as MCP generate_image).
 *
 * Prerequisites:
 *   1. Deploy schema to get schemaId:  npx sanity schema deploy --verbose
 *   2. Set in .env.local:  SANITY_SCHEMA_ID=<your-schema-id>
 *   3. SANITY_API_TOKEN with Editor (or higher) permissions
 *
 * Run:
 *   npx tsx scripts/generate-recipe-images.ts
 *     → only recipes that have no images
 *   npx tsx scripts/generate-recipe-images.ts --regenerate
 *     → all recipes (replaces existing images with newly generated ones)
 *   npx tsx scripts/generate-recipe-images.ts --dry-run
 *   npx tsx scripts/generate-recipe-images.ts --regenerate --dry-run
 *
 * Note: Generation writes to **drafts**. The app reads **published** content only.
 * After images have been generated, publish in Studio (Publish button on each recipe)
 * or run:  npx tsx scripts/publish-recipe-drafts.ts
 */
import process from "node:process";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@sanity/client";
import { agentActionsApiVersion, apiVersion } from "../src/lib/sanity/apiVersion";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
const DATASET =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN || "";
const SCHEMA_ID = process.env.SANITY_SCHEMA_ID || "";

/** Standard API (fetch + patch). */
const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion,
  useCdn: false,
  token: TOKEN,
});

/** Agent Actions API (generate) requires vX. */
const agentClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: agentActionsApiVersion,
  useCdn: false,
  token: TOKEN,
});

const RECIPES_QUERY = `*[_type == "recipe"] { _id, title, "imageCount": count(images) }`;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const regenerate = process.argv.includes("--regenerate");

  if (!PROJECT_ID || !DATASET || !TOKEN) {
    console.error("Set NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, and SANITY_API_TOKEN.");
    process.exit(1);
  }

  if (!SCHEMA_ID && !dryRun) {
    console.error("Set SANITY_SCHEMA_ID (from: npx sanity schema deploy --verbose or npx sanity schema list).");
    process.exit(1);
  }

  const recipes = await client.fetch<{ _id: string; title: string; imageCount: number }[]>(
    RECIPES_QUERY
  );

  const toProcess = regenerate ? recipes : recipes.filter((r) => r.imageCount === 0);
  console.log(
    `Recipes: ${recipes.length} total. ${regenerate ? `Processing all ${toProcess.length} (--regenerate).` : `${toProcess.length} without images.`}`
  );

  if (dryRun) {
    toProcess.forEach((r) => console.log(`  ${r._id}  ${r.title}`));
    return;
  }

  if (toProcess.length === 0) {
    console.log("No recipes to process.");
    return;
  }

  const IMAGE_KEY = "gen0";

  for (let i = 0; i < toProcess.length; i++) {
    const recipe = toProcess[i];
    const n = i + 1;
    const total = toProcess.length;
    process.stdout.write(`[${n}/${total}] ${recipe.title} (${recipe._id}) ... `);

    try {
      // Ensure one image slot with known _key. Replace entire array so we overwrite bad images when --regenerate.
      await client
        .patch(recipe._id)
        .set({ images: [{ _type: "image", _key: IMAGE_KEY }] })
        .commit();

      await agentClient.agent.action.generate({
        schemaId: SCHEMA_ID,
        documentId: recipe._id,
        instruction: `Generate one appetizing, professional food photograph that depicts exactly this dish: "$title". The image must show the finished dish named "$title" as the main subject—the food in the photo must match the recipe title. Do not add text or logos.`,
        instructionParams: {
          title: { type: "constant" as const, value: recipe.title },
        },
        target: {
          path: ["images", { _key: IMAGE_KEY }, "asset"],
          operation: "set",
        },
        async: true,
      });
      console.log("queued");
    } catch (e) {
      console.log("error:", e instanceof Error ? e.message : e);
    }
  }

  console.log("\nDone. Image generation runs async in Sanity; check Studio in a few minutes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
