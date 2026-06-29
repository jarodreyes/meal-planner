import { MacroLine, scaleMacrosForServings } from "@/lib/nutrition";
import { MacroRing } from "./MacroRing";
import { MacroBars } from "./MacroBars";

type Props = {
  macros: MacroLine | null | undefined;
  servings: number;
};

export function NutritionCard({ macros, servings }: Props) {
  if (!macros) {
    return (
      <div className="rounded-card bg-white p-5 text-sm text-zinc-500 shadow-sm">
        No nutrition data yet.
      </div>
    );
  }

  const scaled = scaleMacrosForServings(macros, servings);
  if (!scaled) return null;

  const { perServing, total } = scaled;

  return (
    <div className="rounded-card bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800">Nutrition</h3>
        <span className="text-xs text-zinc-400">{servings} servings</span>
      </div>

      <div className="mt-3 flex items-center gap-5">
        <MacroRing calories={total.calories} size={120} />
        <div className="flex-1 space-y-3">
          <MacroBars
            protein={total.protein_g}
            carbs={total.carbs_g}
            fat={total.fat_g}
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Per serving: {perServing.calories.toFixed(0)} cal · {perServing.protein_g.toFixed(0)}g protein ·{" "}
        {perServing.carbs_g.toFixed(0)}g carbs · {perServing.fat_g.toFixed(0)}g fat
      </p>
    </div>
  );
}
