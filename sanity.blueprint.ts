/**
 * Sanity Blueprint.
 *
 * The Algolia recipe-sync document function was removed in favor of native
 * GROQ full-text search (see src/app/api/recipes/search/route.ts), so there
 * are currently no blueprint resources. If you previously deployed the Algolia
 * function, run `npx sanity blueprints deploy` to remove it from the project.
 */
import { defineBlueprint } from "@sanity/blueprints";

export default defineBlueprint({
  resources: [],
});
