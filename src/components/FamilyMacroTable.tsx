import { MacroLine, computeFamilyServingTable } from "@/lib/nutrition";

type Props = {
  macros: MacroLine | null | undefined;
  baselineServings: number;
};

const AVATAR_COLORS: Record<string, string> = {
  Me: "bg-brand-500",
  Wife: "bg-protein",
  Elliot: "bg-carbs",
  Noah: "bg-fat",
};

export function FamilyMacroTable({ macros, baselineServings }: Props) {
  if (!macros) {
    return (
      <div className="rounded-card bg-white p-5 text-sm text-zinc-500 shadow-sm">
        No nutrition data yet.
      </div>
    );
  }

  const rows = computeFamilyServingTable(macros, baselineServings);

  return (
    <div className="rounded-card bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800">Who&apos;s eating</h3>
        <span className="text-xs text-zinc-400">baseline {baselineServings}x</span>
      </div>

      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.person}
            className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-2"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                AVATAR_COLORS[row.person] ?? "bg-zinc-400"
              }`}
            >
              {row.person.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-zinc-800">{row.person}</p>
                <p className="text-sm font-bold text-zinc-900">
                  {row.calories.toFixed(0)}
                  <span className="ml-0.5 text-xs font-normal text-zinc-400">cal</span>
                </p>
              </div>
              <div className="mt-0.5 flex gap-3 text-xs text-zinc-500">
                <span>{row.servings.toFixed(2)} serv</span>
                <span className="text-protein">P {row.protein.toFixed(0)}g</span>
                <span className="text-carbs">C {row.carbs.toFixed(0)}g</span>
                <span className="text-fat">F {row.fat.toFixed(0)}g</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
