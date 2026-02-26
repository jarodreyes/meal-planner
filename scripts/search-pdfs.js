#!/usr/bin/env node
/**
 * Search PDFs in recipes/ for a phrase (e.g. "pizza dough").
 * Usage: node scripts/search-pdfs.js [phrase] [dir]
 *   phrase defaults to "pizza dough", dir defaults to ./recipes
 */
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_DIR = path.join(PROJECT_ROOT, "recipes");
const phrase = (process.argv[2] || "pizza dough").toLowerCase();
const dir = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_DIR;

async function getPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  let PDFParse;
  try {
    const mod = require("pdf-parse");
    PDFParse =
      mod?.PDFParse ||
      mod?.default?.PDFParse ||
      (typeof mod?.default === "function" ? mod.default : null);
  } catch {
    return null;
  }
  if (typeof PDFParse !== "function") return null;
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result?.text ?? result ?? null;
}

async function main() {
  if (!fs.existsSync(dir)) {
    console.error("Directory does not exist:", dir);
    process.exit(1);
  }
  const names = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".pdf"));
  const files = names.map((n) => path.join(dir, n)).sort();

  console.log("Searching for:", JSON.stringify(phrase));
  console.log("In:", dir);
  console.log("PDFs:", files.length, "\n");

  const matches = [];
  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const name = path.basename(filePath);
    process.stdout.write(`[${i + 1}/${files.length}] ${name} ... `);
    try {
      const text = await getPdfText(filePath);
      if (text && typeof text === "string") {
        const lower = text.toLowerCase();
        if (lower.includes(phrase)) {
          const count = (lower.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
          matches.push({ name, path: filePath, count });
          console.log("FOUND (" + count + " match(es))");
        } else {
          console.log("no");
        }
      } else {
        console.log("(could not extract text)");
      }
    } catch (e) {
      console.log("error:", e.message);
    }
  }

  console.log("\n--- Results ---");
  if (matches.length === 0) {
    console.log("No PDFs contain \"" + phrase + "\".");
  } else {
    matches.forEach((m) => console.log(m.name + " (" + m.count + " match(es))"));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
