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
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_API_TOKEN=your_sanity_token
OPENAI_API_KEY=your_openai_key
```

4) Run the app + Studio
```bash
npm run dev
# Next.js app on http://localhost:3000
# Sanity Studio on http://localhost:3000/studio
```

## Features
- Import recipes from PDFs or pasted text (`/import` → `/api/import`):
  - Extract text (pdf-parse) → OpenAI JSON parse (prompt in `src/lib/prompts.ts`) → Zod validation → Sanity documents.
  - Stores raw `sourceText`, sets `importStatus` + `confidence`, auto-runs nutrition stub if macros not provided.
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
- `POST /api/import` — multipart (PDF files) or form data (text). Creates recipe docs, runs nutrition stub, returns ids/status.
- `POST /api/nutrition` — normalize ingredients (OpenAI) if grams missing, run nutrition stub, patch recipe.
- `POST /api/meal-plans` — create plan.
- `PATCH /api/meal-plans/[id]` — append meal entry.

## Notes
- `next.config.ts` marks `pdf-parse` as external for App Router APIs.
- Family multipliers live in `src/lib/nutrition.ts` (`Me 1.0, Wife 0.75, Elliot 0.75, Noah 0.5`).
- Keep tokens out of git; `.env*` is ignored.
