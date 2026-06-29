# MacroMeals

Next.js (App Router) + Sanity + OpenAI MVP to import recipes (PDF or pasted text), store structured data, compute nutrition (stub), and build family-scaled meal plans.

## Quick start

1) Install deps
```bash
npm install
```

2) Create a Sanity project + dataset, then add a token with Editor rights.

3) Set env vars (e.g. in `.env.local`)
```
# Required for app + Studio
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_API_TOKEN=your_sanity_token
OPENAI_API_KEY=your_openai_key

# Expose for browser (Studio and client queries)
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production

# Optional – Recipe image generation (Agent Actions)
SANITY_SCHEMA_ID=your_schema_id
```

4) Run the app + Studio
```bash
npm run dev
# Next.js app on http://localhost:3000
# Sanity Studio on http://localhost:3000/studio
```

## Features
- Import recipes from PDFs, URLs, or pasted text (`/import` → `/api/import`):
  - PDFs: extract text (pdf-parse) → OpenAI JSON parse (prompt in `src/lib/prompts.ts`) → Zod validation → Sanity documents.
  - URLs: fetch the page, import `schema.org/Recipe` JSON-LD when available, then fall back to OpenAI parsing.
  - Stores raw `sourceText`, sets `importStatus` + `confidence`, and estimates missing nutrition with OpenAI before falling back to the local nutrition stub.
- Recipe management:
  - `/recipes` list with filters (status, tag); `/recipes/[id]` detail with servings editor, nutrition display, family scaling, “Compute nutrition” button calling `/api/nutrition`.
- Review queue:
  - `/review` shows `needs_review` or failed imports for manual fixes in Studio.
- Meal planning:
  - `/meal-plans` create week-of plans; `/meal-plans/[id]` add meals (date, mealType, recipe, baselineServingsForMe), per-meal family table, and daily totals.
- Sanity Studio at `/studio` with schemas for Recipe, IngredientLine, NutritionFacts, MealPlan, MealEntry.

## OpenAI + validation
- Prompts live in `src/lib/prompts.ts`.
- Zod schemas in `src/lib/zodSchemas.ts` validate OpenAI JSON before persisting.
- Ingredient normalization + grams best-effort via OpenAI (`/api/nutrition`); stub macro computation is in `src/lib/nutrition.ts` and is easy to replace with USDA/Edamam later.

## API routes
- `POST /api/import` — multipart (PDF files), recipe URL, or form data (text). Creates recipe docs, fills missing metadata/nutrition, returns ids/status.
- `POST /api/nutrition` — normalize ingredients (OpenAI) if grams missing, run nutrition stub, patch recipe.
- `POST /api/meal-plans` — create plan.
- `PATCH /api/meal-plans/[id]` — append meal entry.

## Recipe search (native GROQ)
- Search on the **Recipes** page uses Sanity's built-in [GROQ full-text search](https://www.sanity.io/docs/content-lake/search-content-with-groq) — no external search service, no sync step, and always in sync with your content.
- The search box calls `GET /api/recipes/search?q=...`, which runs a BM25-scored GROQ query (`src/lib/sanity/queries.ts` → `recipeSearchQuery`) over recipe **title**, **tags**, **mealType**, **ingredients**, and **instructions**, with title/tags boosted. Each query token is prefix-matched for as-you-type results.
- No configuration required beyond the standard Sanity env vars.
- Optional upgrade: add semantic/hybrid search with `text::semanticSimilarity()` (requires dataset embeddings; usage is plan-dependent).

## Recipe images (Sanity Agent Actions / MCP)
- You can generate one image per recipe using the [Sanity MCP server](https://www.sanity.io/docs/ai/mcp-server) **`generate_image`** tool, or the same backend via script.
- **Option A – MCP in Cursor:** With [Sanity MCP configured](https://www.sanity.io/docs/ai/mcp-server#cursor), ask the AI to “generate an image for recipe document X” using the `generate_image` tool (documentId = recipe `_id`, target = recipe `images` field).
- **Option B – Script:** Run `npm run recipes:generate-images` to queue image generation for all recipes that have no images. Prerequisites:
  - Get a schema id: `npx sanity schema deploy --verbose` or `npx sanity schema list`.
  - Set `SANITY_SCHEMA_ID` and `SANITY_API_TOKEN` in `.env.local`.
- Generation is asynchronous; new images appear in Studio once the job completes.
- **Publishing:** The app reads **published** content only. Generation writes to **drafts**. To show images on the site, publish each recipe in Studio (Publish button) or run `npm run recipes:publish-drafts` after generation has finished.

## Notes
- `next.config.ts` marks `pdf-parse` as external for App Router APIs.
- Family multipliers live in `src/lib/nutrition.ts` (`Me 1.0, Wife 0.75, Elliot 0.75, Noah 0.5`).
- Keep tokens out of git; `.env*` is ignored.
