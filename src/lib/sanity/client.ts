import { createClient } from "@sanity/client";

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "";

if (!projectId || !dataset) {
  console.warn("SANITY projectId or dataset is not set. Check your env variables.");
}

const apiVersion = "2024-12-01";

export const readClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});

export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});
