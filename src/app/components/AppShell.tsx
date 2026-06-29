"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabBar } from "./TabBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  // Studio renders its own full-screen UI; skip the mobile app chrome.
  if (pathname.startsWith("/studio")) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-app">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-100 bg-app/90 px-5 py-3 backdrop-blur">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
              M
            </span>
            <span className="text-lg font-bold tracking-tight text-zinc-900">
              MacroMeals
            </span>
          </Link>
          <Link
            href="/recipes"
            aria-label="Search recipes"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
          </Link>
        </header>

        <main className="flex-1 px-5 pb-28 pt-4">{children}</main>
      </div>
      <TabBar />
    </>
  );
}
