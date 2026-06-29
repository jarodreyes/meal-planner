'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FamilyMacroTable } from "@/components/FamilyMacroTable";
import { NutritionCard } from "@/components/NutritionCard";
import { MacroLine, FAMILY_MULTIPLIERS, scaleMacrosForServings } from "@/lib/nutrition";
import { FavoriteButton } from "@/app/components/FavoriteButton";
import { AddToMealPlan } from "@/app/components/AddToMealPlan";
import { gradientForMealType } from "@/lib/mealTypes";

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

type Props = {
  recipe: any;
  nav: { _id: string; title: string; mealType?: string | null }[];
  mealPlans?: { _id: string; weekOf?: string }[];
};

export function RecipeDetailClient({ recipe, nav, mealPlans = [] }: Props) {
  const [servings, setServings] = useState<number>(recipe.servings || 1);
  const [baselineServings, setBaselineServings] = useState<number>(
    recipe.servings || 1
  );
  const [macros, setMacros] = useState<MacroLine | null | undefined>(
    recipe.nutritionComputed || recipe.nutritionProvided
  );
  const [status, setStatus] = useState<string | null>(null);
  const [mealType, setMealType] = useState<string>(recipe.mealType || "");
  const [savingMealType, setSavingMealType] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<Record<string, boolean>>({
    Me: true,
    Wife: false,
    Elliot: false,
    Noah: false,
  });
  const [cookedEstimate, setCookedEstimate] = useState<{
    proteinCookedGrams: number;
    otherCookedGrams: number;
  } | null>(null);
  const [cookedWeightLoading, setCookedWeightLoading] = useState(false);
  const [cookedWeightError, setCookedWeightError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [recipeImages, setRecipeImages] = useState<{ _key?: string; asset?: { _id: string; url?: string } }[]>(
    recipe.images ?? []
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [settingsOpen]);

  useEffect(() => {
    setRecipeImages(recipe.images ?? []);
  }, [recipe.images]);

  const handleDelete = async () => {
    if (!confirm("Delete this recipe? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${recipe._id}`, { method: "DELETE" });
      if (res.ok) router.push("/recipes");
      else setStatus("Failed to delete");
    } catch (e) {
      setStatus("Error deleting recipe");
    } finally {
      setDeleting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    e.target.value = "";
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/recipes/${recipe._id}/image`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok && data.assetId) {
        router.refresh();
      } else {
        setStatus(data?.error || "Upload failed");
      }
    } catch (err) {
      setStatus("Upload failed");
    } finally {
      setImageUploading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const flatOrder = nav.map((r) => r._id);
  const currentIdx = flatOrder.indexOf(recipe._id);
  const prevId = currentIdx > 0 ? flatOrder[currentIdx - 1] : null;
  const nextId = currentIdx >= 0 && currentIdx < flatOrder.length - 1 ? flatOrder[currentIdx + 1] : null;

  const handleMealTypeSave = async () => {
    setSavingMealType(true);
    setStatus("Saving meal type…");
    try {
      const res = await fetch(`/api/recipes/${recipe._id}/mealtype`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealType: mealType || null }),
      });
      if (!res.ok) {
        setStatus("Failed to save meal type");
      } else {
        setStatus("Meal type saved");
      }
    } catch (error) {
      console.error(error);
      setStatus("Error saving meal type");
    } finally {
      setSavingMealType(false);
    }
  };

  const extraMultipliers: Record<string, number> = {
    ...FAMILY_MULTIPLIERS,
  };

  const totalFactor = Object.entries(selectedPeople).reduce((acc, [person, checked]) => {
    if (!checked) return acc;
    return acc + (extraMultipliers[person] ?? 0);
  }, 0);

  const scaledServings = (recipe.servings || 1) * (totalFactor || 1);
  const GRAMS_PER_OZ = 28.3495;

  const isMainProtein = (ing: any) => {
    const text = `${ing.nameNormalized ?? ""} ${ing.originalText ?? ""}`.toLowerCase();
    const proteinTerms = [
      "chicken breast", "chicken thigh", "chicken",
      "steak", "beef", "pork", "lamb",
      "fish", "salmon", "cod", "tilapia", "tuna", "halibut", "trout", "white fish",
      "shrimp", "prawn", "scallop", "crab", "lobster",
      "turkey breast", "turkey",
      "tofu", "tempeh", "seitan",
    ];
    return proteinTerms.some((term) => text.includes(term));
  };

  const { totalProteinGrams, totalOtherGrams, proteinLabels, otherLabels } = (
    recipe.ingredients || []
  ).reduce(
    (
      acc: {
        totalProteinGrams: number;
        totalOtherGrams: number;
        proteinLabels: string[];
        otherLabels: string[];
      },
      ing: any
    ) => {
      const g = ing.grams || 0;
      const label = ing.nameNormalized || ing.originalText || "";
      if (isMainProtein(ing)) {
        acc.totalProteinGrams += g;
        if (label) acc.proteinLabels.push(label);
      } else {
        acc.totalOtherGrams += g;
        if (label) acc.otherLabels.push(label);
      }
      return acc;
    },
    {
      totalProteinGrams: 0,
      totalOtherGrams: 0,
      proteinLabels: [] as string[],
      otherLabels: [] as string[],
    }
  );

  const totalGrams = totalProteinGrams + totalOtherGrams;
  const servingsBase = recipe.servings || 1;
  const perServingWeight = totalGrams && servingsBase ? totalGrams / servingsBase : 0;
  const perServingProteinGrams = servingsBase ? totalProteinGrams / servingsBase : 0;
  const perServingOtherGrams = servingsBase ? totalOtherGrams / servingsBase : 0;

  useEffect(() => {
    if (!totalGrams || totalGrams <= 0) {
      setCookedEstimate(null);
      setCookedWeightError(null);
      return;
    }
    let cancelled = false;
    setCookedWeightLoading(true);
    setCookedWeightError(null);
    fetch("/api/recipes/estimate-cooked-weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proteinGrams: totalProteinGrams,
        otherGrams: totalOtherGrams,
        proteinLabels,
        otherLabels,
        recipeTitle: recipe.title,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data?.proteinCookedGrams != null && data?.otherCookedGrams != null) {
          setCookedEstimate({
            proteinCookedGrams: Number(data.proteinCookedGrams),
            otherCookedGrams: Number(data.otherCookedGrams),
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCookedWeightError(err?.message || "Failed to estimate cooked weight");
          setCookedEstimate(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCookedWeightLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recipe._id, recipe.title, totalProteinGrams, totalOtherGrams]);

  const formatOz = (g: number) => (g / GRAMS_PER_OZ).toFixed(2);

  const perServingProteinCooked = cookedEstimate && servingsBase
    ? cookedEstimate.proteinCookedGrams / servingsBase
    : 0;
  const perServingOtherCooked = cookedEstimate && servingsBase
    ? cookedEstimate.otherCookedGrams / servingsBase
    : 0;

  /** Returns a single number, or { low, high } for ranges like "1-3". */
  function parseQuantity(q?: string | null): number | { low: number; high: number } | null {
    if (!q) return null;
    const cleaned = q.replace(/[a-zA-Z]/g, "").trim();
    // Handle range (e.g. "1-3", "2 - 4") so we don't treat the dash as concatenation
    const rangeMatch = cleaned.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      if (!Number.isNaN(low) && !Number.isNaN(high)) return { low, high };
    }
    const mixed = cleaned.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) {
      const whole = parseFloat(mixed[1]);
      const num = parseFloat(mixed[2]);
      const den = parseFloat(mixed[3]);
      if (den) return whole + num / den;
    }
    const simpleFrac = cleaned.match(/^(\d+)\/(\d+)$/);
    if (simpleFrac) {
      const num = parseFloat(simpleFrac[1]);
      const den = parseFloat(simpleFrac[2]);
      if (den) return num / den;
    }
    const numVal = Number(cleaned.replace(/[^0-9./\s]/g, ""));
    if (!Number.isNaN(numVal)) return numVal;
    return null;
  }

  function formatQuantity(val: number) {
    // snap to nearest 0.25 for friendlier display
    const rounded = Math.round(val * 4) / 4;
    const whole = Math.floor(rounded);
    const frac = val - whole;
    const denOptions = [2, 3, 4, 6, 8];
    let bestNum = 0;
    let bestDen = 1;
    let bestDiff = Infinity;
    denOptions.forEach((den) => {
      const num = Math.round(frac * den);
      const diff = Math.abs(frac - num / den);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestNum = num;
        bestDen = den;
      }
    });
    const fracStr = bestNum > 0 ? `${bestNum}/${bestDen}` : "";
    if (whole > 0 && fracStr) return `${whole} ${fracStr}`;
    if (whole > 0) return `${whole}`;
    if (fracStr) return fracStr;
    return val.toFixed(2);
  }

  const heroScaled = scaleMacrosForServings(macros, servings);
  const heroChips = heroScaled
    ? [
        { label: "Cal", value: Math.round(heroScaled.total.calories).toString(), color: "text-brand-600" },
        { label: "Protein", value: `${Math.round(heroScaled.total.protein_g)}g`, color: "text-protein" },
        { label: "Carbs", value: `${Math.round(heroScaled.total.carbs_g)}g`, color: "text-carbs" },
        { label: "Fat", value: `${Math.round(heroScaled.total.fat_g)}g`, color: "text-fat" },
      ]
    : [];

  const validImages = (recipeImages ?? []).filter((img) => img?.asset?.url);
  const coverUrl = validImages[0]?.asset?.url;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative -mx-5 -mt-4 overflow-hidden">
        <div
          className="aspect-square w-full bg-cover bg-center"
          style={
            coverUrl
              ? { backgroundImage: `url(${coverUrl})` }
              : { backgroundImage: gradientForMealType(mealType) }
          }
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />

        {/* Top controls */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            href="/recipes"
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow backdrop-blur"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <FavoriteButton recipeId={recipe._id} initialFavorited={recipe.favorited} />
            <button
              type="button"
              onClick={handlePrint}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow backdrop-blur"
              title="Print"
            >
              <PrintIcon className="h-5 w-5" />
            </button>
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow backdrop-blur"
                title="Recipe settings"
              >
                <SettingsIcon className="h-5 w-5" />
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-card border border-zinc-100 bg-white p-4 shadow-xl">
                  <p className="mb-3 text-xs font-semibold uppercase text-zinc-500">Settings</p>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between gap-2 text-sm text-zinc-700">
                      Servings
                      <input
                        type="number"
                        min={0.25}
                        step={0.25}
                        value={servings}
                        onChange={(e) => setServings(Number(e.target.value))}
                        className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 text-sm text-zinc-700">
                      Baseline (Me)
                      <input
                        type="number"
                        min={0.25}
                        step={0.25}
                        value={baselineServings}
                        onChange={(e) => setBaselineServings(Number(e.target.value))}
                        className="w-24 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-zinc-700">
                        Meal type
                        <select
                          value={mealType}
                          onChange={(e) => setMealType(e.target.value)}
                          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                        >
                          <option value="">Not set</option>
                          <option value="breakfast">Breakfast</option>
                          <option value="snack">Snack</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                        </select>
                      </label>
                      <button
                        onClick={handleMealTypeSave}
                        disabled={savingMealType}
                        className="rounded-lg border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {savingMealType ? "Saving…" : "Save"}
                      </button>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                      <span>{imageUploading ? "Uploading…" : "Upload image"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={imageUploading}
                        onChange={handleImageUpload}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(false);
                        handleDelete();
                      }}
                      disabled={deleting}
                      className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Delete recipe"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title + macro chips */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          {mealType && (
            <span className="inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
              {String(mealType)}
            </span>
          )}
          <h1 className="mt-2 text-2xl font-bold leading-tight text-white drop-shadow">
            {recipe.title}
          </h1>
          {heroChips.length > 0 && (
            <div className="mt-3 flex gap-2">
              {heroChips.map((chip) => (
                <div
                  key={chip.label}
                  className="flex-1 rounded-2xl bg-white/95 px-2 py-1.5 text-center backdrop-blur"
                >
                  <p className={`text-sm font-bold ${chip.color}`}>{chip.value}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    {chip.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prev / Next */}
      <div className="flex items-center justify-between">
        <Link
          href={prevId ? `/recipes/${prevId}` : "#"}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium ${
            prevId ? "bg-white text-zinc-700 shadow-sm" : "pointer-events-none text-zinc-300"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Prev
        </Link>
        <Link
          href={nextId ? `/recipes/${nextId}` : "#"}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium ${
            nextId ? "bg-white text-zinc-700 shadow-sm" : "pointer-events-none text-zinc-300"
          }`}
        >
          Next
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link>
      </div>

      {/* Pinned primary CTA */}
      <AddToMealPlan
        recipeId={recipe._id}
        mealPlans={mealPlans}
        defaultMealType={recipe.mealType}
        variant="button"
        className="!w-full !justify-center !rounded-full !border-brand-500 !bg-brand-500 !px-5 !py-3 !text-base !text-white shadow-md shadow-brand-500/30"
      />

      {validImages.length > 1 && (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar">
          {validImages.slice(1).map((img, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img._key ?? img.asset?._id ?? idx}
              src={img.asset?.url}
              alt=""
              className="h-24 w-24 shrink-0 rounded-2xl object-cover"
            />
          ))}
        </div>
      )}

      {/* Who is eating — chip control */}
      <div className="rounded-card bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-zinc-800">Who&apos;s eating?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(extraMultipliers).map((person) => {
            const active = !!selectedPeople[person];
            return (
              <button
                key={person}
                type="button"
                onClick={() =>
                  setSelectedPeople((prev) => ({ ...prev, [person]: !prev[person] }))
                }
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {person}
                <span className={active ? "text-white/70" : "text-zinc-400"}>
                  {" "}
                  {extraMultipliers[person]}x
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ingredients */}
      <div className="rounded-card bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-zinc-900">Ingredients</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          {recipe.ingredients?.map((ing: any, idx: number) => (
            <li key={ing._key || idx} className="border-b border-zinc-50 pb-2 last:border-0 last:pb-0">
              <span className="font-medium text-zinc-800">{ing.originalText}</span>
              {ing.grams ? (
                <span className="text-zinc-400">
                  {" "}· {ing.grams} g → {(ing.grams * (totalFactor || 1)).toFixed(1)} g
                </span>
              ) : null}
              {(ing.quantityNumber || ing.quantityText || ing.quantity) && (
                <div className="text-xs text-brand-600">
                  {(() => {
                    const factor = totalFactor || 1;
                    const qty =
                      parseQuantity(ing.quantityText || ing.quantity || null) ??
                      (typeof ing.quantityNumber === "number" ? ing.quantityNumber : null);
                    if (qty === null) return null;
                    if (typeof qty === "object" && "low" in qty && "high" in qty) {
                      const scaledLow = qty.low * factor;
                      const scaledHigh = qty.high * factor;
                      return `Scaled: ${formatQuantity(scaledLow)}-${formatQuantity(scaledHigh)}${ing.unit ? ` ${ing.unit}` : ""}`;
                    }
                    const scaled = qty * factor;
                    return `Scaled: ${formatQuantity(scaled)}${ing.unit ? ` ${ing.unit}` : ""}`;
                  })()}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Instructions */}
      <div className="rounded-card bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-zinc-900">Instructions</h2>
        <ol className="mt-3 space-y-3">
          {recipe.instructions?.map((step: string, idx: number) => (
            <li key={idx} className="flex gap-3 text-sm text-zinc-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {idx + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Nutrition */}
      <NutritionCard macros={macros} servings={servings} />
      <FamilyMacroTable macros={macros} baselineServings={baselineServings} />

      {totalGrams > 0 && (
        <div className="rounded-card bg-white p-5 text-sm text-zinc-700 shadow-sm">
          <p className="font-semibold text-zinc-800">
            {cookedEstimate ? "Final weight per person (cooked)" : "Approx. weight per person"}
          </p>
          {cookedWeightLoading && <p className="mt-2 text-zinc-500">Estimating cooked weight…</p>}
          {cookedWeightError && (
            <p className="mt-2 text-amber-600">Cooked weight estimate unavailable; showing raw weights.</p>
          )}
          {!cookedWeightLoading && (
            <ul className="mt-2 space-y-3">
              {Object.entries(selectedPeople)
                .filter(([, checked]) => checked)
                .map(([person]) => {
                  const mult = extraMultipliers[person] ?? 1;
                  const proteinG = cookedEstimate
                    ? perServingProteinCooked * mult
                    : perServingProteinGrams * mult;
                  const otherG = cookedEstimate
                    ? perServingOtherCooked * mult
                    : perServingOtherGrams * mult;
                  const totalG = proteinG + otherG;
                  return (
                    <li key={person} className="border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                      <span className="font-medium text-zinc-800">{person}</span>
                      <ul className="mt-1 ml-2 space-y-0.5 text-zinc-600">
                        {totalProteinGrams > 0 && (
                          <li>Main protein: {proteinG.toFixed(1)} g ({formatOz(proteinG)} oz)</li>
                        )}
                        {totalOtherGrams > 0 && (
                          <li>Everything else: {otherG.toFixed(1)} g ({formatOz(otherG)} oz)</li>
                        )}
                        <li className="text-zinc-500">Total: {totalG.toFixed(1)} g ({formatOz(totalG)} oz)</li>
                      </ul>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      )}

      {/* Print-only layout: half letter (5.5" x 8.5") — scaled version */}
      <div
        id="recipe-print-content"
        ref={printRef}
        className="hidden"
        aria-hidden
      >
        <div className="recipe-print-inner">
          <h1 className="text-xl font-bold text-black border-b border-black pb-1 mb-2">
            {recipe.title}
          </h1>
          <p className="text-sm text-black mb-2">
            Servings: {scaledServings.toFixed(1)} (base {recipe.servings ?? 1})
            {totalFactor > 0 && totalFactor !== 1 && (
              <> — scaled for {Object.entries(selectedPeople).filter(([, c]) => c).map(([p]) => p).join(", ")}</>
            )}
          </p>
          {coverUrl && (
            <img
              src={coverUrl}
              alt=""
              className="w-full max-h-32 object-cover rounded mb-3"
            />
          )}
          <h2 className="text-sm font-bold text-black mt-3 mb-1">Ingredients (scaled)</h2>
          <ul className="list-disc pl-5 text-sm text-black space-y-0.5 mb-3">
            {recipe.ingredients?.map((ing: any, idx: number) => {
              const factor = totalFactor || 1;
              const qty =
                parseQuantity(ing.quantityText || ing.quantity || null) ??
                (typeof ing.quantityNumber === "number" ? ing.quantityNumber : null);
              const name = ing.nameNormalized || ing.originalText?.replace(/^[\d\s\/\-\.]+\s*[\w]*\s*[-–—]?\s*/i, "")?.trim() || ing.originalText || "";
              let line: string;
              if (qty !== null && (ing.quantityText || ing.quantity || typeof ing.quantityNumber === "number")) {
                if (typeof qty === "object" && "low" in qty && "high" in qty) {
                  const low = formatQuantity(qty.low * factor);
                  const high = formatQuantity(qty.high * factor);
                  line = `${low}-${high}${ing.unit ? ` ${ing.unit}` : ""}${name ? ` ${name}` : ""}`;
                } else {
                  const scaled = formatQuantity(qty * factor);
                  line = `${scaled}${ing.unit ? ` ${ing.unit}` : ""}${name ? ` ${name}` : ""}`;
                }
                if (ing.grams) {
                  line += ` (${(ing.grams * factor).toFixed(0)} g)`;
                }
              } else {
                line = ing.originalText || "";
              }
              return <li key={ing._key ?? idx}>{line}</li>;
            })}
          </ul>
          <h2 className="text-sm font-bold text-black mt-3 mb-1">Instructions</h2>
          <ol className="list-decimal pl-5 text-sm text-black space-y-1">
            {recipe.instructions?.map((step: string, idx: number) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
          {totalGrams > 0 && (
            <>
              <h2 className="text-sm font-bold text-black mt-3 mb-1">Final weights (cooked)</h2>
              <ul className="list-none text-sm text-black space-y-0.5 mb-2">
                {Object.entries(selectedPeople)
                  .filter(([, checked]) => checked)
                  .map(([person]) => {
                    const mult = extraMultipliers[person] ?? 1;
                    const proteinG = cookedEstimate
                      ? perServingProteinCooked * mult
                      : perServingProteinGrams * mult;
                    const otherG = cookedEstimate
                      ? perServingOtherCooked * mult
                      : perServingOtherGrams * mult;
                    const totalG = proteinG + otherG;
                    return (
                      <li key={person}>
                        <strong>{person}:</strong>{" "}
                        {totalProteinGrams > 0 && (
                          <>{proteinG.toFixed(0)} g protein ({formatOz(proteinG)} oz)</>
                        )}
                        {totalProteinGrams > 0 && totalOtherGrams > 0 && " · "}
                        {totalOtherGrams > 0 && (
                          <>{otherG.toFixed(0)} g other ({formatOz(otherG)} oz)</>
                        )}
                        {" · "}
                        Total {totalG.toFixed(0)} g ({formatOz(totalG)} oz)
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              #recipe-print-content, #recipe-print-content * { visibility: visible; }
              #recipe-print-content {
                position: absolute; left: 0; top: 0;
                width: 5.5in; min-height: 8.5in; padding: 0.4in;
                font-size: 11px; color: #000; background: #fff;
                display: block !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
