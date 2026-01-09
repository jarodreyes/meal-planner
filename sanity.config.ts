import { defineConfig } from "sanity";
import { deskTool } from "sanity/desk";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./src/sanity/schemaTypes";

// Studio runs in the browser, so use NEXT_PUBLIC_* vars when available.
const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";

if (!projectId) {
  // eslint-disable-next-line no-console
  console.warn("Missing SANITY projectId. Set NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_PROJECT_ID.");
}

export default defineConfig({
  name: "macroMeals",
  title: "MacroMeals Studio",
  projectId,
  dataset,
  basePath: "/studio",
  plugins: [deskTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
