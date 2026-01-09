Product Requirements Doc

Project name: MacroMeals (working title)

1) Objective

Build a meal planner + nutrition app that lets me import recipes from PDFs and pasted recipe text, stores them as structured data in Sanity, computes macros/nutrition, and generates meal plans and serving-adjusted macros for my family.

2) Target Users

Primary: Me (adult, tracks macros)

Secondary: Wife (eats 75% of my macro serving)

Kids:

Elliot (11): 75% of my macro serving

Noah (7): 50% of my macro serving

3) Core User Stories

Recipe ingestion

As a user, I can upload one or more PDFs containing recipes and (sometimes) macro info.

As a user, I can paste recipe text from websites (NYT, etc.) for personal use and import it.

As a user, I can see imported recipes in a “Needs Review” state and correct parsing mistakes.

Recipe management
4. As a user, I can view a recipe with ingredients, steps, servings, and nutrition.
5. As a user, I can edit servings and have ingredient quantities and macros update accordingly.
6. As a user, I can tag recipes (cuisine, meal type, dietary) and search/filter.

Nutrition
7. As a user, I can compute macros for recipes that do not include macros.
8. As a user, I can store macros that were provided in the PDF and mark them as “provided.”
9. As a user, I can see per-serving macros and total macros.

Meal planning
10. As a user, I can build a weekly meal plan by selecting recipes for days/meals.
11. As a user, I can generate a shopping list aggregated by ingredient across my plan.
12. As a user, I can see serving-adjusted macros for:

Me (100%)

Wife (75%)

Elliot (75%)

Noah (50%)

4) Success Criteria

I can import a PDF and create clean recipe documents in Sanity.

I can compute nutrition for an imported recipe (when macros are not provided).

I can create a weekly meal plan and see family macro breakdown per meal/day.

I can generate a shopping list from the meal plan.

Import errors are recoverable via an in-app review/edit workflow.

5) Scope (MVP)
In-scope

Upload PDF(s) → extract text → parse into structured recipes via OpenAI → store in Sanity

Paste recipe text import

Recipe list + detail pages

“Needs Review” queue

Nutrition computation pipeline:

If macros in source: store as provided

Else: compute using OpenAI to normalize ingredients + a nutrition database integration (choose later)

Meal plan builder (basic)

Family serving multipliers and macro display

Shopping list generator (basic aggregation)

Out of scope (V1)

Full OCR for scanned PDFs (flag “needs OCR” only)

Barcode scanning

Mobile app

Social sharing / public recipe publishing

Complex pantry tracking

6) Functional Requirements
A) Recipe Import

Inputs

PDF upload(s)

Pasted recipe text

(Optional later) URL import

Processing

Extract text from PDF (best effort)

OpenAI parses text into one or multiple recipes with strict JSON schema

Store:

raw source text for traceability

structured fields for recipe use

Output states

importStatus: pending | parsed | needs_review | failed | complete

B) Nutrition + Macros

Store nutrition as:

nutritionProvided (from source, if present)

nutritionComputed (computed)

Always display per-serving macros and totals.

When servings change, recompute per-serving macros accordingly.

C) Meal Plans + Family Scaling

A meal plan references recipes, and each meal has a chosen serving amount for “Me” as the baseline.

Family multipliers

Me: 1.0

Wife: 0.75

Elliot (11): 0.75

Noah (7): 0.50

For each planned meal:

compute each person’s serving quantity (baseline servings × multiplier)

compute macros per person (recipe macros per serving × person serving quantity)

D) Shopping List

From a meal plan, aggregate ingredient quantities:

Group by normalized ingredient name

Sum quantities, favor grams when possible

If unit conflicts, list separately or show “needs normalization”

7) Data Model (Sanity)
Recipe (document)

title

sourceType (pdf | paste)

sourceName (filename or label)

sourceText (raw extracted text)

servings (number)

ingredients[] (IngredientLine)

instructions[] (string steps)

tags[]

importStatus

nutritionProvided (NutritionFacts | null)

nutritionComputed (NutritionFacts | null)

nutritionStatus (provided | computed | pending | needs_review)

confidence (0–1)

IngredientLine (object)

originalText

nameNormalized

quantity

unit

grams (optional)

notes

NutritionFacts (object)

calories

protein_g

carbs_g

fat_g

fiber_g (optional)

servingsBasis (number) // the servings count used for the calc

source (provided | computed)

MealPlan (document)

weekOf (date)

meals[] (MealEntry)

MealEntry (object)

date

mealType (breakfast | lunch | dinner | snack)

recipe (reference)

baselineServingsForMe (number)

FamilyProfile (hardcoded in app for MVP)

Me: 1.0

Wife: 0.75

Elliot: 0.75

Noah: 0.50

8) Non-Functional Requirements

All OpenAI outputs must be schema-validated (Zod).

Store secrets via env vars.

Add basic observability: log import failures, parsing confidence, compute errors.

Respect copyright: if importing from paywalled sources, treat as personal use and do not publicly publish recipe text.

9) Tech Stack

Next.js (App Router) + TypeScript

Sanity (Content Lake + Studio)

OpenAI API (recipe parsing + ingredient normalization)

PDF parsing: pdf-parse (MVP)

Background jobs: optional (Inngest recommended)

Styling: Tailwind

Deploy: Vercel

10) Milestones

M1 (Day 1–2): Sanity schemas + Studio + recipe CRUD
M2 (Day 3–4): PDF + paste import pipeline with OpenAI parsing
M3 (Day 5–7): Nutrition pipeline v1 + Needs Review queue
M4 (Week 2): Meal planning + family macro scaling + shopping list