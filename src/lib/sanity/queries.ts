export const recipesListQuery = `
*[_type == "recipe" 
  && (!defined($importStatus) || $importStatus == null || importStatus == $importStatus)
  && (!defined($tag) || $tag == null || $tag in tags)
] | order(_createdAt desc) {
  _id,
  title,
  importStatus,
  nutritionStatus,
  tags,
  servings,
  mealType
}`;

export const recipeByIdQuery = `
*[_type == "recipe" && _id == $id][0]{
  _id,
  title,
  sourceType,
  sourceName,
  sourceText,
  servings,
  mealType,
  images[] {
    _key,
    asset-> { _id, url }
  },
  ingredients[],
  instructions,
  tags,
  importStatus,
  nutritionProvided,
  nutritionComputed,
  nutritionStatus,
  nutritionComputedAt,
  confidence
}`;

export const mealPlansQuery = `
*[_type == "mealPlan"] | order(weekOf desc) {
  _id,
  weekOf,
  "mealCount": count(meals)
}`;

export const mealPlanByIdQuery = `
*[_type == "mealPlan" && _id == $id][0]{
  _id,
  weekOf,
  meals[]{
    date,
    mealType,
    baselineServingsForMe,
    recipe->{
      _id,
      title,
      servings,
      nutritionComputed,
      nutritionProvided
    }
  }
}`;

export const recipesNavQuery = `
*[_type == "recipe"] | order(mealType asc, title asc) {
  _id,
  title,
  mealType,
  importStatus
}`;
