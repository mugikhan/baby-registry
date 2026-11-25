import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { AirmailEdge } from "@/components/AirmailEdge";
import { ItemCard } from "@/components/ItemCard";
import { ListControls } from "@/components/ListControls";
import { RegistryHeader } from "@/components/RegistryHeader";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { GuestListFiltersSchema } from "@/lib/list-filters";
import { getGuestList } from "@/server/guest-list";

const getHome = createServerFn({ method: "GET" })
  .validator(GuestListFiltersSchema)
  .handler(async ({ data }) => {
    const db = getDb();
    const [row, list] = await Promise.all([
      db.query.settings.findFirst({ where: eq(settings.id, 1) }),
      getGuestList({ db, filters: data }),
    ]);
    return { title: row?.title ?? "Ayesha & Mughees", list };
  });

export const Route = createFileRoute("/")({
  validateSearch: GuestListFiltersSchema,
  loaderDeps: ({ search }) => ({ q: search.q, category: search.category, needed: search.needed }),
  loader: ({ deps }) => getHome({ data: deps }),
  component: Home,
});

function Home() {
  const {
    title,
    list: { categories, items },
  } = Route.useLoaderData();
  const filters = Route.useSearch();

  return (
    <>
      <AirmailEdge />
      <div className="mx-auto max-w-[1120px] px-5 pb-12">
        <RegistryHeader title={title} yoursCount={0} />
        <ListControls categories={categories} filters={filters} />
        <main className="mt-5">
          <p role="status" className="sr-only">
            {items.length} {items.length === 1 ? "item" : "items"} shown
          </p>
          {items.length > 0 ? (
            <ul className="grid items-start grid-cols-1 gap-3.5 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
              {items.map((item) => (
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
              <Link
                to="/"
                search={{}}
                className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-ocean px-5 text-[18px] font-bold text-white hover:bg-ocean-hover active:bg-ocean-pressed"
              >
                Show everything
              </Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
