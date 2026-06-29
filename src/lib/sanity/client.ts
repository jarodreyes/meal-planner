import { createClient } from "@sanity/client";
import { apiVersion } from "./apiVersion";

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "";

if (!projectId || !dataset) {
  console.warn("SANITY projectId or dataset is not set. Check your env variables.");
}

export const readClient = createClient({
  projectId,
  dataset,
  apiVersion,
  // useCdn:false so reads are always fresh. This app is write-then-read heavy
  // (create a meal plan and immediately view it, add a meal and reload, import
  // a recipe and open it, toggle a favorite and refresh). The CDN can serve
  // stale results for a few seconds after a write, which makes those changes
  // look like they didn't save. Fresh reads avoid that entirely.
  useCdn: false,
  perspective: "published",
});

export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

export { apiVersion, agentActionsApiVersion } from "./apiVersion";
