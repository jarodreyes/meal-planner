#!/usr/bin/env node
/**
 * Import all PDFs from a folder into the app via the import API.
 *
 * Prereqs: dev server running (npm run dev).
 * Usage: node scripts/import-all-pdfs.js [path]
 *   path defaults to ./recipes (relative to project root).
 *
 * Example: node scripts/import-all-pdfs.js
 *          node scripts/import-all-pdfs.js /path/to/my/pdfs
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_RECIPES_DIR = path.join(PROJECT_ROOT, "recipes");
const IMPORT_URL = process.env.IMPORT_URL || "http://localhost:3000/api/import";

function getPdfs(dir) {
  if (!fs.existsSync(dir)) {
    console.error("Directory does not exist:", dir);
    process.exit(1);
  }
  const names = fs.readdirSync(dir);
  return names
    .filter((n) => n.toLowerCase().endsWith(".pdf"))
    .map((n) => path.join(dir, n))
    .sort();
}

async function importPdf(filePath) {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append("sourceType", "pdf");
  form.append("files", new Blob([buf], { type: "application/pdf" }), path.basename(filePath));
  // Only import Lunch and Dinner (skip Breakfast and Snack)
  form.append("mealTypes", "lunch");
  form.append("mealTypes", "dinner");

  const res = await fetch(IMPORT_URL, {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text || res.statusText };
  }

  if (!res.ok) {
    throw new Error(data.error || data.details || res.statusText);
  }
  return data;
}

async function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_RECIPES_DIR;
  const pdfs = getPdfs(dir);

  console.log("Recipes directory:", dir);
  console.log("Import URL:", IMPORT_URL);
  console.log("Found", pdfs.length, "PDF(s).\n");

  if (pdfs.length === 0) {
    console.log("No PDFs to import. Exiting.");
    return;
  }

  let ok = 0;
  let err = 0;

  for (let i = 0; i < pdfs.length; i++) {
    const filePath = pdfs[i];
    const name = path.basename(filePath);
    const n = i + 1;
    const total = pdfs.length;

    process.stdout.write(`[${n}/${total}] ${name} ... `);

    try {
      const data = await importPdf(filePath);
      const results = data.results || [];
      const created = results.filter((r) => r.id && !r.skipped && !r.error).length;
      const errors = results.filter((r) => r.error);
      const skipped = results.filter((r) => r.skipped).length;

      if (errors.length) {
        console.log("error:", errors[0].error || "see results");
        err++;
      } else {
        console.log("OK —", created, "recipe(s) created", skipped ? `, ${skipped} skipped` : "");
        ok++;
      }
    } catch (e) {
      console.log("failed:", e.message);
      err++;
    }
  }

  console.log("\nDone.", ok, "file(s) imported,", err, "failed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
