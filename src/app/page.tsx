import Link from "next/link";

export default function Home() {
  const links = [
    { href: "/import", title: "Import recipes", body: "Upload PDFs or paste text to create structured recipes in Sanity." },
    { href: "/recipes", title: "Browse recipes", body: "View recipes, compute nutrition, and scale servings for the family." },
    { href: "/review", title: "Review queue", body: "Fix imports flagged as needs_review or failed." },
    { href: "/meal-plans", title: "Meal plans", body: "Create weekly plans and see family macros per meal." },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-zinc-500">MacroMeals</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
          Import recipes, compute macros, and plan for the family.
        </h1>
        <p className="mt-2 text-zinc-600">
          Sanity-backed recipes with OpenAI parsing, nutrition stubs, and family serving scaling.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/import"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Import recipe
          </Link>
          <Link
            href="/recipes"
            className="rounded border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            View recipes
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300"
          >
            <p className="text-sm font-semibold text-zinc-800">{item.title}</p>
            <p className="text-sm text-zinc-600">{item.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
