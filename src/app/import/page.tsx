'use client';

import { useState } from "react";

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;

export default function ImportPage() {
  const [sourceType, setSourceType] = useState<"pdf" | "paste">("pdf");
  const [text, setText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [mealTypes, setMealTypes] = useState<Set<string>>(new Set(["lunch", "dinner"]));
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<"idle" | "extract" | "openai" | "done" | "error">(
    "idle"
  );
  const [fileCount, setFileCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);

  const toggleMealType = (value: string) => {
    setMealTypes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setProgress("extract");
    setStatus("Uploading and extracting PDF/text…");
    setDoneCount(0);
    setFileCount(0);
    setResults([]);
    const formData = new FormData(e.currentTarget);
    formData.set("sourceType", sourceType);
    formData.set("sourceName", sourceName);
    mealTypes.forEach((m) => formData.append("mealTypes", m));
    if (sourceType === "paste") {
      formData.set("text", text);
    }

    try {
      setProgress("openai");
      setStatus("Parsing recipes with OpenAI…");
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Import failed");
        setProgress("error");
      } else {
        setStatus("Import complete");
        setProgress("done");
        setResults(data.results || []);
        const uniqueSources = Array.from(
          new Set((data.results || []).map((r: any) => r.source || "upload"))
        );
        setFileCount(uniqueSources.length);
        setDoneCount(uniqueSources.length);
      }
    } catch (error) {
      console.error(error);
      setStatus("Import failed");
      setProgress("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-zinc-500">Import</p>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Import recipes from PDF or text
        </h1>
        <p className="text-sm text-zinc-600">
          Raw text is stored in Sanity. Parsing uses OpenAI with Zod validation; failures are flagged.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="sourceType"
              value="pdf"
              checked={sourceType === "pdf"}
              onChange={() => setSourceType("pdf")}
            />
            PDF upload
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="sourceType"
              value="paste"
              checked={sourceType === "paste"}
              onChange={() => setSourceType("paste")}
            />
            Paste text
          </label>
        </div>

        <label className="block text-sm text-zinc-700">
          Source name (optional)
          <input
            name="sourceName"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Grandma's book"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="block text-sm text-zinc-700">
          <p className="mb-2">Import meal types (uncheck to skip)</p>
          <div className="flex flex-wrap gap-4">
            {MEAL_TYPES.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={mealTypes.has(value)}
                  onChange={() => toggleMealType(value)}
                  className="rounded border-zinc-300"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Only recipes in the selected sections will be imported. Default: Lunch and Dinner.
          </p>
        </div>

        {sourceType === "pdf" ? (
          <div className="block text-sm text-zinc-700">
            <p className="mb-1">PDF files</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
              <input
                name="files"
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
              />
              <span>Select PDF(s)</span>
            </label>
          </div>
        ) : (
          <label className="block text-sm text-zinc-700">
            Paste recipe text
            <textarea
              name="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Paste the recipe..."
            />
          </label>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {isSubmitting ? "Importing…" : "Import"}
        </button>
        {progress !== "idle" && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>
                {progress === "extract"
                  ? "Extracting files…"
                  : progress === "openai"
                    ? "Parsing with OpenAI…"
                    : progress === "done"
                      ? "Finished"
                      : "Error"}
              </span>
              {fileCount > 0 && (
                <span>
                  {doneCount}/{fileCount} files
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-zinc-200">
              <div
                className={`h-full transition-all ${
                  progress === "extract"
                    ? "w-1/3 bg-amber-500"
                    : progress === "openai"
                      ? "w-2/3 bg-blue-500"
                      : progress === "done"
                        ? "w-full bg-emerald-500"
                        : "w-full bg-red-500"
                }`}
              />
            </div>
          </div>
        )}
        {status && <p className="text-sm text-zinc-600">{status}</p>}
      </form>

      {results.length > 0 && (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-zinc-800">Results</p>
          <ul className="space-y-2 text-sm text-zinc-700">
            {results.map((r, idx) => (
              <li key={idx} className="rounded border border-zinc-200 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  {r.error ? (
                    <span className="text-red-600">Error: {r.details || r.error}</span>
                  ) : (
                    <>
                      <span className="font-semibold">{r.title}</span>
                      <span className="text-xs uppercase text-zinc-500">
                        {r.mealType || "no meal type"}
                      </span>
                      <span className="text-xs text-zinc-600">
                        Import {r.importStatus} • Nutrition {r.nutritionStatus}
                      </span>
                    </>
                  )}
                </div>
                {r.source && (
                  <p className="text-xs text-zinc-500">Source: {r.source}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
