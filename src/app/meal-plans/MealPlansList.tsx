"use client";

import { useState } from "react";
import Link from "next/link";

type Plan = { _id: string; weekOf?: string; mealCount?: number };

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function weekDays(weekOf?: string) {
  if (!weekOf) return [];
  const start = new Date(`${weekOf}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function DeleteButton({
  plan,
  onDeleted,
}: {
  plan: Plan;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete the plan for week of ${plan.weekOf}? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/meal-plans/${plan._id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(plan._id);
      } else {
        setDeleting(false);
        alert("Failed to delete meal plan.");
      }
    } catch {
      setDeleting(false);
      alert("Failed to delete meal plan.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      title="Delete meal plan"
      aria-label="Delete meal plan"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}

export function MealPlansList({ plans }: { plans: Plan[] }) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [items, setItems] = useState<Plan[]>(plans);

  const removePlan = (id: string) =>
    setItems((prev) => prev.filter((p) => p._id !== id));

  if (!items.length) {
    return (
      <div className="rounded-card bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-zinc-600">No meal plans yet. Create one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-full bg-zinc-100 p-1">
        {(["list", "calendar"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
              view === v ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "list" ? (
        <div className="space-y-2">
          {items.map((plan) => (
            <div
              key={plan._id}
              className="flex items-center gap-2 rounded-card bg-white p-4 shadow-sm"
            >
              <Link href={`/meal-plans/${plan._id}`} className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-900">Week of {plan.weekOf}</p>
                <p className="text-xs text-zinc-500">{plan.mealCount || 0} meals planned</p>
              </Link>
              <DeleteButton plan={plan} onDeleted={removePlan} />
              <Link
                href={`/meal-plans/${plan._id}`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600"
                aria-label="Open plan"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((plan) => (
            <div key={plan._id} className="rounded-card bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/meal-plans/${plan._id}`} className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900">Week of {plan.weekOf}</p>
                </Link>
                <DeleteButton plan={plan} onDeleted={removePlan} />
              </div>
              <Link href={`/meal-plans/${plan._id}`} className="block">
                <div className="mt-3 flex justify-between gap-1">
                  {weekDays(plan.weekOf).map((d, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-zinc-400">
                        {DAY_LABELS[d.getDay()]}
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 text-xs font-semibold text-zinc-700">
                        {d.getDate()}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-500">{plan.mealCount || 0} meals</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
