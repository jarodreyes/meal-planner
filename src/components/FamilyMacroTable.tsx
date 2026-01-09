import { MacroLine, computeFamilyServingTable } from "@/lib/nutrition";

type Props = {
  macros: MacroLine | null | undefined;
  baselineServings: number;
};

export function FamilyMacroTable({ macros, baselineServings }: Props) {
  if (!macros) {
    return <p className="text-sm text-zinc-600">No nutrition data yet.</p>;
  }

  const rows = computeFamilyServingTable(macros, baselineServings);

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700">
        Family servings (baseline for Me: {baselineServings})
      </div>
      <table className="w-full text-sm">
        <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
          <tr>
            <th className="px-4 py-2">Person</th>
            <th className="px-4 py-2">Servings</th>
            <th className="px-4 py-2">Calories</th>
            <th className="px-4 py-2">Protein</th>
            <th className="px-4 py-2">Carbs</th>
            <th className="px-4 py-2">Fat</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.person} className="border-t border-zinc-200">
              <td className="px-4 py-2 font-medium text-zinc-800">{row.person}</td>
              <td className="px-4 py-2 text-zinc-700">{row.servings.toFixed(2)}</td>
              <td className="px-4 py-2 text-zinc-700">{row.calories.toFixed(0)}</td>
              <td className="px-4 py-2 text-zinc-700">{row.protein.toFixed(1)} g</td>
              <td className="px-4 py-2 text-zinc-700">{row.carbs.toFixed(1)} g</td>
              <td className="px-4 py-2 text-zinc-700">{row.fat.toFixed(1)} g</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
