"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeletePlanButton({ planId }: { planId: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Delete this entire meal plan? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/meal-plans/${planId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/meal-plans");
        router.refresh();
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
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow-sm ring-1 ring-red-100 disabled:opacity-50"
      title="Delete meal plan"
      aria-label="Delete meal plan"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}

export function RemoveMealButton({
  planId,
  mealKey,
}: {
  planId: string;
  mealKey?: string;
}) {
  const [removing, setRemoving] = useState(false);
  const router = useRouter();

  const handleRemove = async () => {
    if (!mealKey) return;
    if (!confirm("Remove this meal from the plan?")) return;
    setRemoving(true);
    try {
      const res = await fetch(
        `/api/meal-plans/${planId}?mealKey=${encodeURIComponent(mealKey)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        router.refresh();
      } else {
        setRemoving(false);
        alert("Failed to remove meal.");
      }
    } catch {
      setRemoving(false);
      alert("Failed to remove meal.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={removing || !mealKey}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      title="Remove meal"
      aria-label="Remove meal"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
