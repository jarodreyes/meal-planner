"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconProps = { className?: string };

function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function BookIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z" />
      <path d="M8 7h7M8 11h7" />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function MoreIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

const tabs = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/recipes", label: "Recipes", icon: BookIcon, match: (p: string) => p.startsWith("/recipes") },
  { href: "/meal-plans", label: "Plan", icon: CalendarIcon, match: (p: string) => p.startsWith("/meal-plans") },
  { href: "/review", label: "More", icon: MoreIcon, match: (p: string) => p.startsWith("/review") || p.startsWith("/studio") },
];

export function TabBar() {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/studio")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {tabs.slice(0, 2).map((tab) => (
          <TabLink key={tab.href} tab={tab} active={tab.match(pathname)} />
        ))}

        <Link
          href="/import"
          aria-label="Import recipe"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 ring-4 ring-white transition active:scale-95"
        >
          <PlusIcon className="h-6 w-6" />
        </Link>

        {tabs.slice(2).map((tab) => (
          <TabLink key={tab.href} tab={tab} active={tab.match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  tab,
  active,
}: {
  tab: { href: string; label: string; icon: (p: IconProps) => React.ReactElement };
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={`flex w-16 flex-col items-center gap-1 py-1 text-[11px] font-medium transition ${
        active ? "text-brand-600" : "text-zinc-400 hover:text-zinc-600"
      }`}
    >
      <Icon className="h-6 w-6" />
      {tab.label}
    </Link>
  );
}
