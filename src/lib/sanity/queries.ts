export const recipesListQuery = `
*[_type == "recipe" 
  && (!defined($importStatus) || $importStatus == null || importStatus == $importStatus)
  && (!defined($tagFilter) || $tagFilter == null || $tagFilter in tags)
  && (!defined($mealType) || $mealType == null || $mealType == "" || mealType == $mealType)
  && (!defined($favorited) || $favorited == null || favorited == $favorited)
] | order(_createdAt desc) {
  _id,
  title,
  favorited,
  importStatus,
  nutritionStatus,
  tags,
  servings,
  mealType,
  "coverImage": images[0].asset->url
}`;

export const recipeByIdQuery = `
*[_type == "recipe" && _id == $id][0]{
  _id,
  title,
  sourceType,
  sourceName,
  sourceUrl,
  sourceKey,
  sourceText,
  servings,
  mealType,
  favorited,
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
    _key,
    date,
    mealType,
    baselineServingsForMe,
    recipe->{
      _id,
      title,
      servings,
      ingredients[],
      nutritionComputed,
      nutritionProvided
    }
  }
}`;

export const recipeSearchQuery = `
*[_type == "recipe" && (
  title match $term ||
  tags[] match $term ||
  mealType match $term ||
  ingredients[].originalText match $term ||
  instructions match $term
)] | score(
  boost(title match $term, 4),
  boost(tags[] match $term, 2),
  boost(mealType match $term, 2),
  boost(ingredients[].originalText match $term, 1),
  boost(instructions match $term, 1)
) | order(_score desc) [0...$limit] {
  _id,
  title,
  mealType,
  tags,
  favorited,
  "ingredientsText": array::join(ingredients[].originalText, " "),
  "coverImage": images[0].asset->url,
  _score
}`;

export const currentWeekPlanQuery = `
*[_type == "mealPlan" && weekOf <= $today] | order(weekOf desc)[0]{
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
      mealType,
      "coverImage": images[0].asset->url,
      nutritionComputed,
      nutritionProvided
    }
  }
}`;

export const homeRailQuery = `
*[_type == "recipe"] | order(favorited desc, _createdAt desc)[0...12]{
  _id,
  title,
  favorited,
  mealType,
  "coverImage": images[0].asset->url
}`;

export const recipesNavQuery = `
*[_type == "recipe"] | order(mealType asc, title asc) {
  _id,
  title,
  mealType,
  favorited,
  importStatus
}`;
