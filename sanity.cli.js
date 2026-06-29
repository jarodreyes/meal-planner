/**
 * Sanity CLI config (used by `sanity schema list`, `sanity schema deploy`, etc.).
 * Loads .env and .env.local so projectId/dataset are set when running CLI from the project root.
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";

module.exports = {
  api: {
    projectId,
    dataset,
  },
  // Hosted Studio URL: https://<studioHost>.sanity.studio
  // Must be globally unique across sanity.studio; change and redeploy to rename.
  studioHost: "macromeals-jarod",
  deployment: {
    appId: "vkqhik3fu4abkfgjuzsun27z",
  },
};
