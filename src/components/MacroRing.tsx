type Props = {
  calories: number;
  /** Optional goal; when provided, the ring fills proportionally and shows "left". */
  goal?: number;
  size?: number;
  label?: string;
};

export function MacroRing({ calories, goal, size = 160, label = "calories" }: Props) {
  const stroke = size * 0.1;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const pct = goal && goal > 0 ? Math.min(calories / goal, 1) : 1;
  const dash = circumference * pct;

  const bigNumber = goal && goal > 0 ? Math.max(goal - calories, 0) : calories;
  const caption = goal && goal > 0 ? `${label} left of ${Math.round(goal)}` : label;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1ece4"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-brand-500)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tracking-tight text-zinc-900">
          {Math.round(bigNumber).toLocaleString()}
        </span>
        <span className="px-4 text-xs font-medium text-zinc-500">{caption}</span>
      </div>
    </div>
  );
}
