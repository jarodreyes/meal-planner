# Blog post plan: Using Sanity image generation on an existing schema

**Status:** Plan only. Do not publish until the app/image-generation flow is finished and verified.

**Goal:** Publish a how-to post on using Sanity's Agent Actions image generation (`generate_image` / Generate API) to add AI-generated images to an existing Sanity project (MacroMeals recipes).

---

## 1. Audience & angle

- **Who:** Developers with an existing Sanity project who want to add AI-generated images (e.g. per document) without changing their schema.
- **Angle:** "We had recipes with an empty `images` array; here's how we used the Generate API to fill one image per recipe, and what we had to fix."

---

## 2. Notes on what we built (for the post)

### 2.1 Starting point

- **Project:** Next.js + Sanity (MacroMeals). Recipe document type with an `images` field: `type: "array", of: [{ type: "image" }]`.
- **Goal:** One generated food photo per recipe for documents that have no images.
- **Options we used:** Script using `@sanity/client` + Agent Actions `generate()`, plus optional Sanity MCP `generate_image` in Cursor.

### 2.2 Prerequisites (to mention in post)

- **Schema deployed to Sanity:** Run `npx sanity schema deploy` (or `sanity schema list`) so the project has a **schema ID** in the API. Without this, "No schemas found" and Generate requests fail.
- **CLI config:** Project needs `sanity.cli.js` (or `.ts`) with `api: { projectId, dataset }` so `sanity schema list` / `sanity schema deploy` work. We added `sanity.cli.js` that loads `.env`/`.env.local` and exports `projectId`/`dataset`.
- **Env vars:** `SANITY_SCHEMA_ID` (from deploy/list), `SANITY_API_TOKEN` (Editor or higher). Optional: document both MCP route and script route.

### 2.3 API version: `vX` for Agent Actions

- **Important:** The [Agent Actions HTTP API](https://www.sanity.io/docs/http-reference/agent-actions) requires **`apiVersion: "vX"`** for the Generate (and other Agent Actions) endpoints, not the date-based version used for normal GROQ/document writes.
- **What we did:** Centralized versions in `src/lib/sanity/apiVersion.ts`: `apiVersion = "2024-12-01"` for normal client and scripts (fetch, patch, Algolia, dedupe); `agentActionsApiVersion = "vX"` for the client that only calls `agent.action.generate()`. The recipe-image script uses two clients: one with date version (fetch + patch), one with `vX` (generate only).

### 2.4 "No writable, visible fields" / target must be an image asset

- **Error we hit:** `Instruction has no effect. The given document, schema, target, readOnly and hidden state results in no writable, visible fields.`
- **Cause:** We targeted `path: ["images"], operation: "append"`. Generate expects a **concrete image asset path** to write into, not "append to array." Per [Agent Actions image generation](https://www.sanity.io/docs/agent-actions/agent-actions-image-generation), the target must be an image's **asset** field, e.g. `path: ['image', 'asset']`.
- **Fix:**
  1. **Patch first:** For each recipe with no images, patch to ensure at least one image slot: `setIfMissing({ images: [] }).append("images", [{ _type: "image" }])`.
  2. **Then generate:** Target that slot's asset. The path must use the array item's **`_key`** (not numeric index): e.g. append with `_key: "gen0"`, then `path: ["images", { _key: "gen0" }, "asset"], operation: "set"`. Using `"0"` or `0` yields "unknown document path: images.0.asset" — the API expects key-based paths for array items ([targets and paths](https://www.sanity.io/docs/agent-actions/targets-paths)).

### 2.5 Script flow (high level for post)

1. Load env (`.env`, `.env.local`).
2. Fetch recipes with `count(images) == 0` (GROQ).
3. For each recipe (optionally with `--dry-run` to only list):
   - Patch: ensure `images` array exists and has one empty image item (standard API, date version).
   - Call `agentClient.agent.action.generate()` with:
     - `schemaId`, `documentId` (recipe `_id`),
     - `instruction` (one appetizing food photo, no text/logos),
     - `instructionParams`: e.g. `title` from recipe,
     - `target: { path: ["images", { _key: "gen0" }, "asset"], operation: "set" }`,
     - `async: true`.
4. Generation runs asynchronously; assets appear in Studio when jobs complete.

### 2.6 MCP alternative

- If the reader uses Cursor (or another MCP client), they can use the [Sanity MCP server](https://www.sanity.io/docs/ai/mcp-server) **`generate_image`** tool for one-off or ad-hoc generation. Same backend as the script; we can note "script for bulk, MCP for single docs or exploration."

### 2.7 Other gotchas (to call out in post)

- **Node version:** Sanity CLI (e.g. `sanity schema list` / `sanity schema deploy`) may require Node 22.12+ (or documented range); otherwise ESM/require errors. Mention upgrading Node if they hit CLI issues.
- **Schema not deployed:** "No schemas found" → run `sanity schema deploy` and set `SANITY_SCHEMA_ID`.
- **TypeScript path type:** For array items, use **`_key`** in the path, e.g. `path: ["images", { _key: "gen0" }, "asset"]`. Numeric index (`0` or `"0"`) can yield "unknown document path: images.0.asset".

### 2.8 Two big gotchas (summary for the post)

**Gotcha 1: Generate writes to drafts; the app reads published.**  
So there are effectively **two steps (two API calls) per image** if you want the image to show on a site that uses `perspective: "published"`: (1) run Generate (writes the image into the document **draft**), (2) publish that document (copy draft → published). Until you publish, the new image exists only in the draft and won’t appear in the app. Call this out clearly: generation is not a one-shot—you must publish afterward, or your front end will never see the image.

**Gotcha 2: Generate targets a single asset; it cannot "append to array."**  
Many content models use an **array of images** (e.g. `images: array of image`). Generate does **not** accept a target like "append to this array." It only accepts a path to an **existing image asset** field (e.g. `path: ['images', { _key: 'gen0' }, 'asset']`). So for image arrays you must: (a) **patch** to add an empty image slot (with a known `_key`), then (b) **generate** into that slot’s `asset`. One API call to create the slot, one to fill it—and if you use published content on the front end, a third step to publish. Call this out: if your schema has an image array, you can’t just point Generate at the array; you have to create a slot first, then target that slot’s asset.

---

## 3. Suggested blog post outline

1. **Intro**
   - One sentence on the app (Next.js + Sanity, recipe app).
   - Goal: add one AI-generated image per recipe without changing the schema.

2. **Prerequisites**
   - Existing Sanity project with a document type that has an image (or image array) field.
   - Schema deployed (`sanity schema deploy`), schema ID in env.
   - CLI config (`sanity.cli.js`) with `api.projectId` / `api.dataset`.
   - Token with Editor (or appropriate) permissions.

3. **Two API versions**
   - Normal Sanity API (GROQ, patch): date-based `apiVersion`.
   - Agent Actions (Generate): **must use `apiVersion: "vX"`**.
   - Short code snippet: single place for both constants, use `vX` only for the client that calls `generate()`.

4. **Target path: image asset, not array**
   - Mistake: targeting `["images"]` with `append` → "no writable, visible fields."
   - Second mistake: using index in path `["images", "0", "asset"]` → "unknown document path: images.0.asset."
   - Correct: target the **asset** of an existing image slot using the item's **`_key`**: patch in one image with `_key: "gen0"`, then `path: ["images", { _key: "gen0" }, "asset"], operation: "set"`.

5. **End-to-end flow**
   - Fetch documents that need images.
   - For each: patch to add one empty image (if needed), then call Generate with the asset path, async.
   - Optional: show minimal script structure (env, two clients, loop, error handling).

6. **MCP option**
   - One paragraph: same capability via Sanity MCP `generate_image` in Cursor for single-doc or exploratory use.

7. **Gotchas & troubleshooting**
   - **Draft vs published:** Generate writes to drafts; the app typically reads published. So it’s two steps per image: generate, then publish. Call this out as a major gotcha.
   - **Single asset, not array:** Generate cannot "append to array"; it targets one image asset. Image arrays need patch (add slot with _key) then generate (target that asset). Many content models use image arrays—call this out.
   - Schema not deployed / no schema ID.
   - Wrong API version for Generate (must be `vX`).
   - Target must be asset path; for arrays use **`_key`**, not numeric index.
   - Node version for CLI.

8. **Wrap-up**
   - Link to Sanity docs (Agent Actions, image generation, MCP).
   - Repo or code snippets if we're allowed to share.

---

## 4. Assets to prepare (when writing)

- [ ] Sanity docs links: Agent Actions, [HTTP reference – Agent Actions](https://www.sanity.io/docs/http-reference/agent-actions), [image generation](https://www.sanity.io/docs/agent-actions/agent-actions-image-generation), [MCP server](https://www.sanity.io/docs/ai/mcp-server).
- [ ] Screenshot or short clip: recipe in Studio before/after (optional).
- [ ] Minimal code snippets: `apiVersion` constants, patch + generate loop, target shape (path/operation).
- [ ] Final check: run script once more and confirm images appear in Studio before publishing.

---

## 5. Do not do until app is finished

- Do **not** draft the full post yet.
- Do **not** add screenshots or final code blocks until the flow is verified end-to-end.
- After runs are successful and we're happy with behavior, turn this plan into the actual blog post and fill in the outline.

---

## 6. Build / session notes (chronological)

*Append here as we build or fix things. Use when drafting the post.*

- **Two clients in script:** Standard Sanity API (fetch, patch) uses date `apiVersion`; Agent Actions (generate) requires `vX`. Script uses `client` (date) for fetch + patch and `agentClient` (vX) for `agent.action.generate()` only.
- **Patch-before-generate:** Generate only writes into an existing image **asset** field. So we patch first: `setIfMissing({ images: [] }).append("images", [{ _type: "image", _key: "gen0" }])`, then generate with `path: ["images", { _key: "gen0" }, "asset"]`.
- **Array path = _key, not index:** Using `path: ["images", "0", "asset"]` or `path: ["images", 0, "asset"]` returns "Instruction targets an unknown document path: images.0.asset". The API expects JSONMatch-style paths; array items are identified by `_key`. Fix: append with explicit `_key: "gen0"` and use `path: ["images", { _key: "gen0" }, "asset"]`.
- **Single source of truth for API versions:** `src/lib/sanity/apiVersion.ts` exports `apiVersion` (date) and `agentActionsApiVersion` ("vX"); client and scripts import from there. Prevents drift and makes the "two versions" story clear in the post.
- **Recipe schema unchanged:** We did not add or change any schema fields. The existing `images` array of type `image` is sufficient; we only patch in an empty slot and point Generate at its asset.
- **Async generation:** Generate is called with `async: true`. Jobs run in the background; images show up in Studio when complete. Script does not wait for asset creation.
- **npm script:** `npm run recipes:generate-images` runs `tsx scripts/generate-recipe-images.ts`. `--dry-run` lists candidates; `--regenerate` processes all recipes (replaces existing images).
- **Blog checklist (when writing):** Include code snippets for: (1) apiVersion constants, (2) two createClient configs (date vs vX), (3) patch then generate loop with _key in path, (4) .env.example vars (SANITY_SCHEMA_ID, SANITY_API_TOKEN). Call out both errors ("no writable fields" and "unknown document path") and their fixes.
- **Instruction must tie image to recipe title:** Generic instructions can produce wrong food (e.g. salmon for a smoothie). Use the recipe title explicitly via instructionParams ($title) and require the image to depict exactly the dish named $title.
- **Two big gotchas to emphasize in the post:** (1) **Publish after generate** — Generate writes to drafts; the app reads published. So it’s two steps (two API calls) per image if you want it visible: generate, then publish. (2) **Single asset, not array** — Generate cannot target "append to array"; it only writes to an existing image asset path. Many content models use image arrays; they must patch first (add one slot with _key), then generate into that slot’s asset.
