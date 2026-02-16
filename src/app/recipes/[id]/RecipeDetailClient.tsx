'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FamilyMacroTable } from "@/components/FamilyMacroTable";
import { NutritionCard } from "@/components/NutritionCard";
import { MacroLine, FAMILY_MULTIPLIERS } from "@/lib/nutrition";

type Props = {
  recipe: any;
  nav: { _id: string; title: string; mealType?: string | null }[];
};

export function RecipeDetailClient({ recipe, nav }: Props) {
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
  const printRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  const groupedNav = nav.reduce<Record<string, { _id: string; title: string }[]>>(
    (acc, r) => {
      const key = r.mealType || "unspecified";
      if (!acc[key]) acc[key] = [];
      acc[key].push({ _id: r._id, title: r.title });
      return acc;
    },
    {}
  );

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
    (acc, ing: any) => {
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase text-zinc-600">Recipes</p>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {Object.entries(groupedNav).map(([group, items]) => (
              <div key={group} className="space-y-1">
                <p className="text-xs font-semibold text-zinc-700">
                  {group === "unspecified" ? "Unspecified" : group}
                </p>
                <div className="space-y-1">
                  {items.map((item) => (
                    <a
                      key={item._id}
                      href={`/recipes/${item._id}`}
                      className={`block rounded px-2 py-1 text-sm ${
                        item._id === recipe._id
                          ? "bg-zinc-900 text-white"
                          : "hover:bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <a
              href={prevId ? `/recipes/${prevId}` : "#"}
              className={`flex-1 rounded border px-2 py-1 text-center text-sm ${
                prevId ? "hover:bg-zinc-50 text-zinc-800" : "pointer-events-none text-zinc-400"
              }`}
            >
              Prev
            </a>
            <a
              href={nextId ? `/recipes/${nextId}` : "#"}
              className={`flex-1 rounded border px-2 py-1 text-center text-sm ${
                nextId ? "hover:bg-zinc-50 text-zinc-800" : "pointer-events-none text-zinc-400"
              }`}
            >
              Next
            </a>
          </div>
        </aside>

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
              <p className="text-sm text-zinc-600">
                Meal type: {mealType || "not set"}
              </p>
              <p className="text-sm text-zinc-600">
                Scaled servings: {scaledServings.toFixed(2)} (base {recipe.servings || 1})
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                Meal type
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
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
                className="rounded border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                {savingMealType ? "Saving…" : "Save meal type"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="rounded border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Print
              </button>
              <label className="cursor-pointer rounded border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
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
                onClick={handleDelete}
                disabled={deleting}
                className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete recipe"}
              </button>
            </div>
          </div>

          {recipeImages.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-800 mb-2">Photos</h2>
              <div className="flex flex-wrap gap-3">
                {recipeImages.map((img, idx) => (
                  <img
                    key={img._key ?? img.asset?._id ?? idx}
                    src={img.asset?.url}
                    alt=""
                    className="h-32 w-auto rounded object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {status && <p className="text-sm text-zinc-600">{status}</p>}

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-800">Who is eating?</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-700">
              {Object.keys(extraMultipliers).map((person) => (
                <label key={person} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!selectedPeople[person]}
                    onChange={(e) =>
                      setSelectedPeople((prev) => ({
                        ...prev,
                        [person]: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    {person} ({extraMultipliers[person]}x)
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-800">Ingredients</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                  {recipe.ingredients?.map((ing: any, idx: number) => (
                    <li key={ing._key || idx}>
                      {ing.originalText}
                      {ing.grams
                        ? ` · ${ing.grams} g → ${(ing.grams * (totalFactor || 1)).toFixed(1)} g scaled`
                        : ""}
                      {(ing.quantityNumber || ing.quantityText || ing.quantity) && (
                        <div className="text-xs text-zinc-600">
                          {(() => {
                            const factor = totalFactor || 1;
                            const qty =
                              parseQuantity(ing.quantityText || ing.quantity || null) ??
                              (typeof ing.quantityNumber === "number" ? ing.quantityNumber : null);
                            if (qty === null) return null;
                            if (typeof qty === "object" && "low" in qty && "high" in qty) {
                              const scaledLow = qty.low * factor;
                              const scaledHigh = qty.high * factor;
                              return `Scaled qty: ${formatQuantity(scaledLow)}-${formatQuantity(scaledHigh)}${ing.unit ? ` ${ing.unit}` : ""}`;
                            }
                            const scaled = qty * factor;
                            return `Scaled qty: ${formatQuantity(scaled)}${ing.unit ? ` ${ing.unit}` : ""}`;
                          })()}
                        </div>
                      )}
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
              {totalGrams > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-800">
                    {cookedEstimate ? "Final approx. weight per person (cooked)" : "Approx. weight per person"}
                  </p>
                  {cookedWeightLoading && (
                    <p className="mt-2 text-zinc-500">Estimating cooked weight…</p>
                  )}
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
                                  <li>
                                    Main protein: {proteinG.toFixed(1)} g ({formatOz(proteinG)} oz)
                                  </li>
                                )}
                                {totalOtherGrams > 0 && (
                                  <li>
                                    Everything else: {otherG.toFixed(1)} g ({formatOz(otherG)} oz)
                                  </li>
                                )}
                                <li className="text-zinc-500">
                                  Total: {totalG.toFixed(1)} g ({formatOz(totalG)} oz)
                                </li>
                              </ul>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
          {recipeImages.length > 0 && recipeImages[0]?.asset?.url && (
            <img
              src={recipeImages[0].asset.url}
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
