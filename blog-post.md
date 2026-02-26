# How I Used Sanity's Generate Image API to Add Recipe Photos to My Meal Planning App

I've been on a meal plan since earlier this winter, created by my nutritional coach. It's been great—I've lost 25 pounds—but it's also been complex because I'm the one who cooks. I wanted an app that could take the PDFs my coach sends, turn them into structured content in [Sanity](https://www.sanity.io), and support workflows like scaled ingredients for my wife and kids, calculated weights, and search (we use [Sanity + Algolia](https://www.sanity.io/docs/developer-guides/how-to-implement-front-end-search-with-sanity) for that). 

One thing was missing: **pictures**. When my family picked dinner or the kids chose a weekend breakfast, there was nothing to look at. So I used [Sanity's Agent Actions image generation](https://www.sanity.io/docs/agent-actions/agent-actions-image-generation) to generate one photo per recipe from the structured data. It did a phenomenal job. Here’s how to do it on an existing schema, with code and a couple of gotchas.

---

## Prerequisites

- A Sanity project with a document type that has an **image** (or image array) field. We already had `images: array of image` on our recipe type; we didn’t change the schema.
- **Schema deployed** so the project has a schema ID in the API. Without this, Generate requests fail with "No schemas found." Run:
  ```bash
  npx sanity schema deploy --verbose
  ```
  and grab the schema ID (or use `npx sanity schema list`). See [Schema deployment](https://www.sanity.io/docs/apis-and-sdks/schema-deployment).
- **CLI config:** The Sanity CLI needs `api.projectId` and `api.dataset`. We use a small `sanity.cli.js` that loads `.env` / `.env.local` and exports them—see [CLI configuration](https://www.sanity.io/docs/apis-and-sdks/cli-config).
- **Env:** `SANITY_SCHEMA_ID` (from the step above), `SANITY_API_TOKEN` with Editor (or higher) permissions.

---

## Use Two API Versions

The [Agent Actions HTTP API](https://www.sanity.io/docs/http-reference/agent-actions) requires **`apiVersion: "vX"`** for the Generate endpoint. Your normal GROQ and patch calls use a date-based API version. So we use two clients: one for fetch/patch (date version), one for `agent.action.generate()` (vX only).

Centralize the versions so you don’t drift:

```ts
// src/lib/sanity/apiVersion.ts
export const apiVersion = "2024-12-01";

/** For Agent Actions (generate, etc.) — required by the API. */
export const agentActionsApiVersion = "vX";
```

In the script, one client for standard API, one for Generate:

```ts
import { createClient } from "@sanity/client";
import { agentActionsApiVersion, apiVersion } from "../src/lib/sanity/apiVersion";

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion,
  useCdn: false,
  token: TOKEN,
});

const agentClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: agentActionsApiVersion,
  useCdn: false,
  token: TOKEN,
});
```

Use `client` for fetch and patch; use `agentClient` only for `agent.action.generate()`.

---

## Generate Targets a Single Image Asset, Not an Array

A lot of content models have an **array of images**. Generate does **not** accept a target like "append to this array." It only writes to an **existing image asset** path. So you need two steps per document:

1. **Patch** to add one empty image slot with a known `_key`.
2. **Generate** with the target path pointing at that slot’s `asset`.

If you target `path: ["images"], operation: "append"`, you’ll get:

```text
Instruction has no effect. The given document, schema, target, readOnly and hidden state results in no writable, visible fields.
```

The API expects [key-based paths for array items](https://www.sanity.io/docs/agent-actions/targets-paths). So we patch in a slot with a fixed `_key`, then target that asset:

```ts
const IMAGE_KEY = "gen0";

// 1. Ensure one image slot with known _key
await client
  .patch(recipe._id)
  .set({ images: [{ _type: "image", _key: IMAGE_KEY }] })
  .commit();

// 2. Generate into that slot's asset
await agentClient.agent.action.generate({
  schemaId: SCHEMA_ID,
  documentId: recipe._id,
  instruction: `Generate one appetizing, professional food photograph that depicts exactly this dish: "$title". The image must show the finished dish named "$title" as the main subject—the food in the photo must match the recipe title. Do not add text or logos.`,
  instructionParams: {
    title: { type: "constant", value: recipe.title },
  },
  target: {
    path: ["images", { _key: IMAGE_KEY }, "asset"],
    operation: "set",
  },
  async: true,
});
```

Tie the instruction to the recipe title via `instructionParams` and `$title` so the model generates the right dish (e.g. a smoothie, not a generic salmon plate). See [Generate](https://www.sanity.io/docs/agent-actions/generate-quickstart) and [image generation](https://www.sanity.io/docs/agent-actions/agent-actions-image-generation) in the docs.

---

## You Have to Publish After Generate

Generate writes to **drafts**. If your app uses `perspective: "published"` (which is typical), the new image won’t show until you publish. So for each image you effectively have:

1. Patch (add slot) + Generate (fill asset) → draft has the image.
2. Publish that document → front end sees it.

We run a small script after generation that finds recipe drafts and publishes them (copy draft → published with the Sanity client). You can also publish from [Studio](https://www.sanity.io/docs/sanity-studio) per document. Either way, generation alone is not enough for the image to appear on the site.

---

## Bulk Script vs. MCP

For bulk (e.g. "all recipes without images" or "regenerate all"), we use a Node script with `@sanity/client` as above. For one-off or exploratory use, you can use the same backend via the [Sanity MCP server](https://www.sanity.io/docs/ai/mcp-server) and the **`generate_image`** tool in Cursor (or another MCP client). Same API, different entry point.

---

## Gotchas and Troubleshooting

- **Schema not deployed / no schema ID** → "No schemas found" or missing `schemaId`. Run `npx sanity schema deploy --verbose` and set `SANITY_SCHEMA_ID`.
- **Wrong API version for Generate** → Use `apiVersion: "vX"` only for the client that calls `agent.action.generate()`. Keep the date version for everything else.
- **Target must be an image asset path** → For image arrays: patch in one slot with `_key`, then `path: ["images", { _key: "gen0" }, "asset"]`. No numeric index, no "append to array."
- **Images not showing on the site** → Generate writes to drafts. Publish the documents (Studio or a publish script) so the front end can read them.
- **Sanity CLI errors (e.g. ESM)** → The CLI may require Node 22.12+ (or the [documented range](https://www.sanity.io/docs/apis-and-sdks/schema-deployment)); upgrade Node if you hit require/ESM issues.

---

## Summary

We added AI-generated recipe images to an existing Sanity meal planning app without changing the schema: two API versions (date for normal API, `vX` for Generate), patch-then-generate into a single image asset per document (using `_key` in the path), instruction tied to the recipe title, and a publish step so the app (which reads published content) actually shows the new images. If you have an image array, create one slot first and target that slot’s asset—and remember to publish after generation.

**Docs:** [Agent Actions](https://www.sanity.io/docs/agent-actions) · [Image generation](https://www.sanity.io/docs/agent-actions/agent-actions-image-generation) · [HTTP reference (Agent Actions)](https://www.sanity.io/docs/http-reference/agent-actions) · [Targets and paths](https://www.sanity.io/docs/agent-actions/targets-paths) · [Sanity MCP server](https://www.sanity.io/docs/ai/mcp-server)
