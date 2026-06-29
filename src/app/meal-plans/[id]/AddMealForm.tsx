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

  const fieldClass =
    "mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <details className="group rounded-card bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between p-5">
        <span className="text-base font-bold text-zinc-900">Add a meal</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600 transition group-open:rotate-45">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </span>
      </summary>
      <form onSubmit={handleSubmit} className="space-y-3 px-5 pb-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-zinc-700">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-sm text-zinc-700">
            Meal type
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className={fieldClass}
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
            className={fieldClass}
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
            className={fieldClass}
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 disabled:opacity-50"
        >
          {isSubmitting ? "Adding…" : "Add meal"}
        </button>
        {status && <p className="text-sm text-zinc-600">{status}</p>}
      </form>
    </details>
  );
}
