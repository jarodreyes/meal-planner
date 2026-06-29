'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  recipeId: string;
  initialFavorited?: boolean;
  variant?: "icon" | "button";
  className?: string;
};

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function FavoriteButton({
  recipeId,
  initialFavorited = false,
  variant = "icon",
  className = "",
}: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const toggle = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (saving) return;
    const next = !favorited;
    setFavorited(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorited: next }),
      });
      if (!res.ok) {
        setFavorited(!next);
      } else {
        router.refresh();
      }
    } catch {
      setFavorited(!next);
    } finally {
      setSaving(false);
    }
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={favorited}
        className={`flex items-center gap-2 rounded border px-3 py-1 text-sm font-medium disabled:opacity-50 ${
          favorited
            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border-zinc-300 text-zinc-800 hover:bg-zinc-50"
        } ${className}`}
      >
        <HeartIcon filled={favorited} className="h-4 w-4" />
        {favorited ? "Favorited" : "Favorite"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-pressed={favorited}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`rounded-full p-2 shadow transition ${
        favorited
          ? "bg-white text-rose-600 hover:bg-white"
          : "bg-white/90 text-zinc-700 hover:bg-white"
      } ${className}`}
    >
      <HeartIcon filled={favorited} className="h-5 w-5" />
    </button>
  );
}
