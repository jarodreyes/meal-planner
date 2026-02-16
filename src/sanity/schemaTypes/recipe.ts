import { defineArrayMember, defineField, defineType } from "sanity";

export const nutritionFacts = defineType({
  name: "nutritionFacts",
  title: "Nutrition Facts",
  type: "object",
  fields: [
    defineField({ name: "calories", type: "number", title: "Calories" }),
    defineField({ name: "protein_g", type: "number", title: "Protein (g)" }),
    defineField({ name: "carbs_g", type: "number", title: "Carbs (g)" }),
    defineField({ name: "fat_g", type: "number", title: "Fat (g)" }),
    defineField({
      name: "fiber_g",
      type: "number",
      title: "Fiber (g)",
      description: "Optional fiber grams if provided",
    }),
    defineField({
      name: "servingsBasis",
      type: "number",
      title: "Servings Basis",
      description: "Number of servings the macros correspond to",
    }),
    defineField({
      name: "source",
      type: "string",
      title: "Source",
      description: "provided|computed or a note about the source",
    }),
  ],
});

export const ingredientLine = defineType({
  name: "ingredientLine",
  title: "Ingredient Line",
  type: "object",
  fields: [
    defineField({
      name: "originalText",
      type: "string",
      title: "Original Text",
    }),
    defineField({
      name: "quantityText",
      type: "string",
      title: "Quantity (text)",
      description: "Raw quantity as text, e.g. '1 1/2'",
    }),
    defineField({
      name: "quantityNumber",
      type: "number",
      title: "Quantity (number)",
      description: "Parsed numeric quantity for scaling",
    }),
    defineField({
      name: "nameNormalized",
      type: "string",
      title: "Name (normalized)",
    }),
    defineField({
      name: "quantity",
      type: "string",
      title: "Quantity",
    }),
    defineField({
      name: "unit",
      type: "string",
      title: "Unit",
      description: "e.g. cup, tbsp, g, ml, piece",
      options: {
        list: [
          "g",
          "kg",
          "ml",
          "l",
          "tsp",
          "tbsp",
          "cup",
          "oz",
          "lb",
          "piece",
          "slice",
          "pinch",
        ],
      },
    }),
    defineField({
      name: "grams",
      type: "number",
      title: "Grams",
      description: "Best-effort gram weight",
    }),
    defineField({
      name: "notes",
      type: "text",
      title: "Notes",
    }),
  ],
});

export const recipe = defineType({
  name: "recipe",
  title: "Recipe",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", title: "Title" }),
    defineField({
      name: "sourceType",
      type: "string",
      title: "Source Type",
      options: { list: ["pdf", "paste"] },
    }),
    defineField({
      name: "sourceName",
      type: "string",
      title: "Source Name",
    }),
    defineField({
      name: "sourceText",
      type: "text",
      title: "Raw Source Text",
    }),
    defineField({
      name: "servings",
      type: "number",
      title: "Servings",
    }),
    defineField({
      name: "mealType",
      type: "string",
      title: "Meal Type",
      options: { list: ["breakfast", "lunch", "dinner", "snack"] },
    }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [{ type: "image" }],
    }),
    defineField({
      name: "ingredients",
      title: "Ingredients",
      type: "array",
      of: [defineArrayMember({ type: "ingredientLine" })],
    }),
    defineField({
      name: "instructions",
      title: "Instructions",
      type: "array",
      of: [
        defineArrayMember({
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "importStatus",
      type: "string",
      title: "Import Status",
      options: {
        list: ["new", "processing", "needs_review", "failed", "done"],
      },
    }),
    defineField({
      name: "nutritionProvided",
      type: "nutritionFacts",
      title: "Provided Nutrition",
    }),
    defineField({
      name: "nutritionComputed",
      type: "nutritionFacts",
      title: "Computed Nutrition",
    }),
    defineField({
      name: "nutritionStatus",
      type: "string",
      title: "Nutrition Status",
      options: {
        list: ["pending", "provided", "computed", "failed", "needs_review"],
      },
    }),
    defineField({
      name: "nutritionComputedAt",
      type: "datetime",
      title: "Nutrition Computed At",
    }),
    defineField({
      name: "confidence",
      type: "number",
      title: "Import Confidence",
    }),
  ],
  preview: {
    select: {
      title: "title",
      status: "importStatus",
    },
    prepare({ title, status }) {
      return {
        title,
        subtitle: status ? `Import: ${status}` : "Import: n/a",
      };
    },
  },
});
