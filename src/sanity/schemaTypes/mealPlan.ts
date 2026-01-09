import { defineArrayMember, defineField, defineType } from "sanity";

export const mealEntry = defineType({
  name: "mealEntry",
  title: "Meal Entry",
  type: "object",
  fields: [
    defineField({ name: "date", type: "date", title: "Date" }),
    defineField({
      name: "mealType",
      type: "string",
      title: "Meal Type",
      description: "breakfast, lunch, dinner, snack",
    }),
    defineField({
      name: "recipe",
      type: "reference",
      to: [{ type: "recipe" }],
      title: "Recipe",
    }),
    defineField({
      name: "baselineServingsForMe",
      type: "number",
      title: "Baseline Servings For Me",
      description: "How many of my servings this meal uses",
    }),
  ],
});

export const mealPlan = defineType({
  name: "mealPlan",
  title: "Meal Plan",
  type: "document",
  fields: [
    defineField({
      name: "weekOf",
      type: "date",
      title: "Week Of",
      description: "Start of the week",
    }),
    defineField({
      name: "meals",
      title: "Meals",
      type: "array",
      of: [defineArrayMember({ type: "mealEntry" })],
    }),
  ],
  preview: {
    select: { weekOf: "weekOf" },
    prepare({ weekOf }) {
      return {
        title: weekOf ? `Week of ${weekOf}` : "Meal Plan",
      };
    },
  },
});
