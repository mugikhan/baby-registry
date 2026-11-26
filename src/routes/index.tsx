import { createFileRoute, Link } from "@tanstack/react-router";
import { AirmailEdge } from "@/components/AirmailEdge";
import { ItemCard } from "@/components/ItemCard";
import { ListControls } from "@/components/ListControls";
import { ListSkeleton } from "@/components/ListSkeleton";
import { RegistryHeader } from "@/components/RegistryHeader";
import { fetchGuestList } from "@/lib/fetch-guest-list";
import { filterGuestList, GuestListFiltersSchema } from "@/lib/list-filters";
import { useListFreshness } from "@/lib/use-list-freshness";

export const Route = createFileRoute("/")({
  ssr: false,
  validateSearch: GuestListFiltersSchema,
  loader: ({ location }) => fetchGuestList(location.pathname + location.searchStr),
  pendingComponent: ListSkeleton,
  pendingMs: 0,
  component: Home,
});

function Home() {
  const list = Route.useLoaderData();
  const filters = Route.useSearch();
  useListFreshness();

  if (list.items.length === 0) {
    return (
      <>
        <AirmailEdge />
        <div className="mx-auto max-w-[1120px] px-5 pb-12">
          <RegistryHeader title={list.title} yoursCount={0} />
          <main className="mt-5">
            <div className="rounded-[10px] bg-sand p-6">
              <h2 className="text-[20px] font-bold text-ink">Our list is coming soon</h2>
              <p className="mt-1 text-[16px] text-ocean-muted">
                We’re still adding gifts. Please check back soon.
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  const shown = filterGuestList(list, filters);

  return (
    <>
      <AirmailEdge />
      <div className="mx-auto max-w-[1120px] px-5 pb-12">
        <RegistryHeader title={list.title} yoursCount={0} />
        <ListControls list={list} filters={filters} />
        <main className="mt-5">
          <p role="status" className="sr-only">
            {shown.length} {shown.length === 1 ? "item" : "items"} shown
          </p>
          {shown.length > 0 ? (
            <ul className="grid items-start grid-cols-1 gap-3.5 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
              {shown.map((item) => (
                <li key={item.id}>
                  <ItemCard
                    item={item}
                    category={list.categories.find((c) => c.id === item.categoryId)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[10px] bg-sand p-6">
              <h2 className="text-[20px] font-bold text-ink">Nothing here right now</h2>
              <p className="mt-1 text-[16px] text-ocean-muted">
                Nothing on the list fits that choice. Show the whole list to see more.
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
