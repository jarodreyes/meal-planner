type Macro = {
  label: string;
  grams: number;
  color: string;
  goal?: number;
};

type Props = {
  protein: number;
  carbs: number;
  fat: number;
  goals?: { protein?: number; carbs?: number; fat?: number };
  className?: string;
};

function Bar({ label, grams, color, goal }: Macro) {
  const pct = goal && goal > 0 ? Math.min((grams / goal) * 100, 100) : 100;
  return (
    <div className="flex-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-zinc-700">{label}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        <span className="font-semibold text-zinc-800">{Math.round(grams)}</span>
        {goal ? `/${Math.round(goal)}g` : "g"}
      </p>
    </div>
  );
}

export function MacroBars({ protein, carbs, fat, goals, className = "" }: Props) {
  return (
    <div className={`flex items-start gap-4 ${className}`}>
      <Bar label="Protein" grams={protein} color="var(--color-protein)" goal={goals?.protein} />
      <Bar label="Carbs" grams={carbs} color="var(--color-carbs)" goal={goals?.carbs} />
      <Bar label="Fat" grams={fat} color="var(--color-fat)" goal={goals?.fat} />
    </div>
  );
}
