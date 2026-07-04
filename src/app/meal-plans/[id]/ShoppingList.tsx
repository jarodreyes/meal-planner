'use client';

import { useEffect, useMemo, useState } from "react";

export type ShoppingExportItem = {
  key: string;
  /** Full display line, e.g. "300 g plain Greek yogurt". */
  label: string;
  /** Which recipes it came from (shown, not exported). */
  recipes: string;
  notes: string[];
};

type Props = {
  items: ShoppingExportItem[];
};

const SHORTCUT_KEY = "reminders-shortcut-name";
const DEFAULT_SHORTCUT = "Add Groceries";

export function ShoppingList({ items }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.map((i) => i.key))
  );
  const [shortcutName, setShortcutName] = useState(DEFAULT_SHORTCUT);
  const [status, setStatus] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
    try {
      const saved = localStorage.getItem(SHORTCUT_KEY);
      if (saved) setShortcutName(saved);
    } catch {
      // ignore
    }
  }, []);

  const allSelected = selected.size === items.length && items.length > 0;

  const selectedLines = useMemo(
    () => items.filter((i) => selected.has(i.key)).map((i) => i.label),
    [items, selected]
  );

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.key)));

  const flash = (msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(null), 2500);
  };

  const saveShortcutName = (name: string) => {
    setShortcutName(name);
    try {
      localStorage.setItem(SHORTCUT_KEY, name);
    } catch {
      // ignore
    }
  };

  const addToReminders = () => {
    if (!selectedLines.length) return;
    const text = encodeURIComponent(selectedLines.join("\n"));
    const name = encodeURIComponent(shortcutName || DEFAULT_SHORTCUT);
    // Opens the Shortcuts app and runs the user's shortcut with the list as
    // text input. The shortcut splits on newlines and adds each as a reminder.
    window.location.href = `shortcuts://run-shortcut?name=${name}&input=text&text=${text}`;
  };

  const copyList = async () => {
    if (!selectedLines.length) return;
    const text = selectedLines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      flash("Copied — paste into a Reminders list to create separate reminders.");
    } catch {
      flash("Couldn't copy automatically.");
    }
  };

  const shareList = async () => {
    if (!selectedLines.length) return;
    try {
      await navigator.share({
        title: "Shopping list",
        text: selectedLines.join("\n"),
      });
    } catch {
      // user cancelled or unsupported
    }
  };

  return (
    <details className="rounded-card bg-white p-5 shadow-sm" open>
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="text-base font-bold text-zinc-900">🛒 Shopping list</span>
        <span className="text-xs text-zinc-400">
          {selected.size}/{items.length} selected
        </span>
      </summary>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addToReminders}
          disabled={!selected.size}
          className="rounded-full bg-brand-500 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
        >
          Add to Reminders
        </button>
        <button
          type="button"
          onClick={copyList}
          disabled={!selected.size}
          className="rounded-full border border-zinc-200 px-3.5 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          Copy
        </button>
        {canShare && (
          <button
            type="button"
            onClick={shareList}
            disabled={!selected.size}
            className="rounded-full border border-zinc-200 px-3.5 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          >
            Share
          </button>
        )}
        <button
          type="button"
          onClick={toggleAll}
          className="ml-auto text-xs font-medium text-brand-600"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>

      {status && <p className="mt-2 text-xs text-brand-600">{status}</p>}

      <ul className="mt-3 divide-y divide-zinc-100">
        {items.map((item) => {
          const checked = selected.has(item.key);
          return (
            <li key={item.key} className="py-2 text-sm">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.key)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`font-medium ${checked ? "text-zinc-800" : "text-zinc-400 line-through"}`}
                  >
                    {item.label}
                  </span>
                  {item.recipes && (
                    <span className="ml-2 text-xs text-zinc-400">{item.recipes}</span>
                  )}
                  {item.notes.length > 0 && (
                    <span className="block text-xs text-zinc-400">{item.notes.join("; ")}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setShowSetup((s) => !s)}
        className="mt-3 text-xs font-medium text-zinc-400 underline"
      >
        {showSetup ? "Hide" : "Reminders setup"}
      </button>
      {showSetup && (
        <div className="mt-2 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
          <p className="font-semibold text-zinc-700">One-time setup for “Add to Reminders”</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>Open the <b>Shortcuts</b> app → <b>+</b> to create a shortcut.</li>
            <li>
              Add action <b>Split Text</b> (Shortcut Input, split on <b>New Lines</b>).
            </li>
            <li>
              Add <b>Repeat with Each</b> → inside, <b>Add New Reminder</b> using{" "}
              <b>Repeat Item</b> as the title, pointing at your grocery list.
            </li>
            <li>
              Name the shortcut exactly, then enter that name below.
            </li>
          </ol>
          <label className="mt-2 flex items-center gap-2">
            Shortcut name
            <input
              value={shortcutName}
              onChange={(e) => saveShortcutName(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-300 px-2 py-1"
            />
          </label>
          <p className="mt-2 text-zinc-500">
            No shortcut? Use <b>Copy</b> and paste the list into a new reminder — Reminders
            turns each line into its own item.
          </p>
        </div>
      )}
    </details>
  );
}
