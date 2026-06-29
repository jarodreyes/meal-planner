'use client';

import { useState } from "react";

export function CreateMealPlanForm() {
  const [weekOf, setWeekOf] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekOf }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to create plan");
      } else {
        setStatus("Created!");
        window.location.href = `/meal-plans/${data.id}`;
      }
    } catch (error) {
      console.error(error);
      setStatus("Failed to create plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-card bg-white p-5 shadow-sm"
    >
      <div>
        <label className="text-sm font-medium text-zinc-700">Start a new week</label>
        <input
          type="date"
          value={weekOf}
          onChange={(e) => setWeekOf(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <button
        type="submit"
        disabled={!weekOf || isSubmitting}
        className="w-full rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 disabled:opacity-50"
      >
        {isSubmitting ? "Creating…" : "Create meal plan"}
      </button>
      {status && <p className="text-sm text-zinc-600">{status}</p>}
    </form>
  );
}
