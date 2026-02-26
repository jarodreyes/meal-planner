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
};
