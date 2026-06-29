'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FAMILY_MEMBERS } from "@/lib/nutrition";

type MealPlanOption = { _id: string; weekOf?: string };

type Props = {
  recipeId: string;
  mealPlans: MealPlanOption[];
  defaultMealType?: string | null;
  defaultEaters?: string[];
  defaultBaseline?: number;
  variant?: "icon" | "button";
  className?: string;
};

function CalendarPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="12" y1="14" x2="12" y2="18" />
      <line x1="10" y1="16" x2="14" y2="16" />
    </svg>
  );
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export function AddToMealPlan({
  recipeId,
  mealPlans,
  defaultMealType,
  defaultEaters,
  defaultBaseline = 1,
  variant = "button",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(mealPlans[0]?._id || "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState(
    defaultMealType && MEAL_TYPES.includes(defaultMealType) ? defaultMealType : "dinner"
  );
  const [baseline, setBaseline] = useState(defaultBaseline || 1);
  const [eaters, setEaters] = useState<string[]>(
    defaultEaters && defaultEaters.length ? defaultEaters : [...FAMILY_MEMBERS]
  );
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const toggleEater = (person: string) =>
    setEaters((prev) =>
      prev.includes(person) ? prev.filter((p) => p !== person) : [...prev, person]
    );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) {
      setStatus("Select a meal plan first.");
      return;
    }
    setSaving(true);
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
          eaters,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to add to meal plan");
      } else {
        setStatus("Added to meal plan");
        router.refresh();
        setTimeout(() => setOpen(false), 700);
      }
    } catch {
      setStatus("Failed to add to meal plan");
    } finally {
      setSaving(false);
    }
  };

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Add to meal plan"
        className={`rounded-full bg-white/90 p-2 text-zinc-700 shadow hover:bg-white ${className}`}
      >
        <CalendarPlusIcon className="h-5 w-5" />
      </button>
    ) : (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`flex items-center gap-2 rounded border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-50 ${className}`}
      >
        <CalendarPlusIcon className="h-4 w-4" />
        Add to meal plan
      </button>
    );

  return (
    <div className="relative" ref={ref}>
      {trigger}
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-lg">
          {mealPlans.length === 0 ? (
            <div className="space-y-2 text-sm text-zinc-700">
              <p>No meal plans yet.</p>
              <Link
                href="/meal-plans"
                className="inline-block rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Create a meal plan
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <p className="text-xs font-semibold uppercase text-zinc-500">Add to meal plan</p>
              <label className="block text-sm text-zinc-700">
                Plan
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                >
                  {mealPlans.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.weekOf ? `Week of ${plan.weekOf}` : plan._id}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm text-zinc-700">
                  Date
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                  />
                </label>
                <label className="block text-sm text-zinc-700">
                  Meal
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                  >
                    {MEAL_TYPES.map((m) => (
                      <option key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="text-sm text-zinc-700">
                Who&apos;s eating?
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {FAMILY_MEMBERS.map((person) => {
                    const active = eaters.includes(person);
                    return (
                      <button
                        key={person}
                        type="button"
                        onClick={() => toggleEater(person)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          active ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {person}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block text-sm text-zinc-700">
                My serving size
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={baseline}
                  onChange={(e) => setBaseline(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add to plan"}
              </button>
              {status && <p className="text-xs text-zinc-600">{status}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
