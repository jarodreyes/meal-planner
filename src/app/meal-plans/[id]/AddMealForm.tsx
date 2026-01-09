'use client';

import { useState } from "react";

type Props = {
  planId: string;
  recipes: { _id: string; title: string }[];
};

export function AddMealForm({ planId, recipes }: Props) {
  const [date, setDate] = useState("");
  const [mealType, setMealType] = useState("dinner");
  const [recipeId, setRecipeId] = useState(recipes?.[0]?._id || "");
  const [baseline, setBaseline] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/meal-plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealType,
          recipeId,
          baselineServingsForMe: baseline,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to add meal");
      } else {
        setStatus("Added meal");
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
      setStatus("Failed to add meal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-zinc-700">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-zinc-700">
          Meal type
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </label>
      </div>
      <label className="text-sm text-zinc-700">
        Recipe
        <select
          value={recipeId}
          onChange={(e) => setRecipeId(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          {recipes.map((r) => (
            <option key={r._id} value={r._id}>
              {r.title}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-zinc-700">
        Baseline servings (Me)
        <input
          type="number"
          step={0.25}
          min={0.25}
          value={baseline}
          onChange={(e) => setBaseline(Number(e.target.value))}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {isSubmitting ? "Adding…" : "Add meal"}
      </button>
      {status && <p className="text-sm text-zinc-600">{status}</p>}
    </form>
  );
}
