'use client';

import { useState } from "react";
import { FamilyMacroTable } from "@/components/FamilyMacroTable";
import { NutritionCard } from "@/components/NutritionCard";
import { MacroLine } from "@/lib/nutrition";

type Props = {
  recipe: any;
};

export function RecipeDetailClient({ recipe }: Props) {
  const [servings, setServings] = useState<number>(recipe.servings || 1);
  const [baselineServings, setBaselineServings] = useState<number>(
    recipe.servings || 1
  );
  const [macros, setMacros] = useState<MacroLine | null | undefined>(
    recipe.nutritionComputed || recipe.nutritionProvided
  );
  const [status, setStatus] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);

  const handleCompute = async () => {
    setIsComputing(true);
    setStatus("Computing with stub + normalization…");
    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe._id }),
      });

      if (!res.ok) {
        setStatus("Failed to compute nutrition");
        return;
      }

      const data = await res.json();
      setMacros(data.nutritionComputed);
      setStatus("Nutrition updated");
    } catch (error) {
      console.error(error);
      setStatus("Error computing nutrition");
    } finally {
      setIsComputing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">
            {recipe.importStatus || "imported"}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">{recipe.title}</h1>
          <p className="text-sm text-zinc-600">
            Source: {recipe.sourceType} {recipe.sourceName ? `• ${recipe.sourceName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            Servings
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            Baseline (Me)
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={baselineServings}
              onChange={(e) => setBaselineServings(Number(e.target.value))}
              className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            onClick={handleCompute}
            disabled={isComputing}
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {isComputing ? "Computing…" : "Compute nutrition"}
          </button>
        </div>
      </div>

      {status && <p className="text-sm text-zinc-600">{status}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">Ingredients</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {recipe.ingredients?.map((ing: any, idx: number) => (
                <li key={ing._key || idx}>
                  {ing.originalText}
                  {ing.grams ? ` · ${ing.grams} g` : ""}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">Instructions</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
              {recipe.instructions?.map((step: string, idx: number) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          <NutritionCard macros={macros} servings={servings} />
          <FamilyMacroTable macros={macros} baselineServings={baselineServings} />
        </div>
      </div>
    </div>
  );
}
