'use client';

import { useState } from "react";

export default function ImportPage() {
  const [sourceType, setSourceType] = useState<"pdf" | "paste">("pdf");
  const [text, setText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("Importing…");
    setResults([]);
    const formData = new FormData(e.currentTarget);
    formData.set("sourceType", sourceType);
    formData.set("sourceName", sourceName);
    if (sourceType === "paste") {
      formData.set("text", text);
    }

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Import failed");
      } else {
        setStatus("Import complete");
        setResults(data.results || []);
      }
    } catch (error) {
      console.error(error);
      setStatus("Import failed");
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

        {sourceType === "pdf" ? (
          <label className="block text-sm text-zinc-700">
            PDF files
            <input
              name="files"
              type="file"
              accept="application/pdf"
              multiple
              className="mt-1 block w-full text-sm"
            />
          </label>
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
        {status && <p className="text-sm text-zinc-600">{status}</p>}
      </form>

      {results.length > 0 && (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-zinc-800">Results</p>
          <ul className="space-y-2 text-sm text-zinc-700">
            {results.map((r, idx) => (
              <li key={idx} className="rounded border border-zinc-200 p-2">
                {r.error ? (
                  <span className="text-red-600">Error: {r.details || r.error}</span>
                ) : (
                  <>
                    <span className="font-semibold">{r.title}</span> • import {r.importStatus} •
                    nutrition {r.nutritionStatus}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
