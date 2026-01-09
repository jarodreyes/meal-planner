import { MacroLine, scaleMacrosForServings } from "@/lib/nutrition";

type Props = {
  macros: MacroLine | null | undefined;
  servings: number;
};

export function NutritionCard({ macros, servings }: Props) {
  if (!macros) {
    return <p className="text-sm text-zinc-600">No nutrition data yet.</p>;
  }

  const scaled = scaleMacrosForServings(macros, servings);
  if (!scaled) return null;

  const { perServing, total } = scaled;

  const rows = [
    { label: "Calories", per: perServing.calories, total: total.calories, suffix: "" },
    { label: "Protein", per: perServing.protein_g, total: total.protein_g, suffix: "g" },
    { label: "Carbs", per: perServing.carbs_g, total: total.carbs_g, suffix: "g" },
    { label: "Fat", per: perServing.fat_g, total: total.fat_g, suffix: "g" },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700">
        Nutrition (basis: {macros.servingsBasis} servings)
      </div>
      <table className="w-full text-sm">
        <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
          <tr>
            <th className="px-4 py-2">Macro</th>
            <th className="px-4 py-2">Per serving</th>
            <th className="px-4 py-2">Total ({servings} servings)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-zinc-200">
              <td className="px-4 py-2 font-medium text-zinc-800">{row.label}</td>
              <td className="px-4 py-2 text-zinc-700">
                {row.per.toFixed(1)} {row.suffix}
              </td>
              <td className="px-4 py-2 text-zinc-700">
                {row.total.toFixed(1)} {row.suffix}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
