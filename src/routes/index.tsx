import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { AirmailEdge } from "@/components/AirmailEdge";
import { ItemCard } from "@/components/ItemCard";
import { ListControls } from "@/components/ListControls";
import { RegistryHeader } from "@/components/RegistryHeader";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { getItemState, matchesQuery } from "@/lib/item-state";
import { getGuestList } from "@/server/guest-list";

const getHome = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const [row, list] = await Promise.all([
    db.query.settings.findFirst({ where: eq(settings.id, 1) }),
    getGuestList({ db }),
  ]);
  return { title: row?.title ?? "Ayesha & Mughees", list };
});

export const Route = createFileRoute("/")({
  loader: () => getHome(),
  component: Home,
});

function Home() {
  const {
    title,
    list: { categories, items },
  } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [neededOnly, setNeededOnly] = useState(false);

  const visible = items.filter(
    (item) =>
      matchesQuery(item, query) &&
      (categoryId === "all" || String(item.categoryId) === categoryId) &&
      (!neededOnly || getItemState(item) !== "taken"),
  );

  function clearFilters() {
    setQuery("");
    setCategoryId("all");
    setNeededOnly(false);
  }

  return (
    <>
      <AirmailEdge />
      <div className="mx-auto max-w-[1120px] px-5 pb-12">
        <RegistryHeader title={title} yoursCount={0} />
        <ListControls
          categories={categories}
          query={query}
          onQueryChange={setQuery}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          neededOnly={neededOnly}
          onNeededOnlyChange={setNeededOnly}
        />
        <main className="mt-5">
          <p role="status" className="sr-only">
            {visible.length} {visible.length === 1 ? "item" : "items"} shown
          </p>
          {visible.length > 0 ? (
            <ul className="grid items-start grid-cols-1 gap-3.5 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
              {visible.map((item) => (
                <li key={item.id}>
                  <ItemCard
                    item={item}
                    category={categories.find((c) => c.id === item.categoryId)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[10px] bg-sand p-6">
              <h2 className="text-[20px] font-bold text-ink">Nothing matches that</h2>
              <p className="mt-1 text-[16px] text-ocean-muted">
                Try a different word, or show the whole list again.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 min-h-12 rounded-xl bg-ocean px-5 text-[18px] font-bold text-white hover:bg-ocean-hover active:bg-ocean-pressed"
              >
                Show everything
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
