import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { duplicateAdminItem, fetchAdminItems, setAdminItemStatus } from "@/lib/admin-api";
import { ListFilters } from "@/components/admin/ListFilters";
import { ItemActions } from "@/components/admin/ItemActions";
import { AdminListFiltersSchema, filterAdminItems, hasAdminFilters } from "@/lib/admin-filters";
import type { AdminItem } from "@/lib/admin-items";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  validateSearch: (search) => AdminListFiltersSchema.parse(search),
  loader: () => fetchAdminItems(),
  component: AdminItems,
});

const badge = {
  draft: "bg-sand-pale text-ink",
  published: "bg-ocean text-white",
  archived: "bg-stone-deep text-ink",
} satisfies Record<AdminItem["status"], string>;

function StatusButton({ item, onDone }: { item: AdminItem; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (item.status === "archived") return null;
  const next = item.status === "published" ? "draft" : "published";
  const label = item.status === "published" ? "Unpublish" : "Publish";

  async function change() {
    setBusy(true);
    try {
      await setAdminItemStatus(item.id, next);
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`${label} ${item.title}`}
      onClick={change}
      className="min-h-12 shrink-0 rounded-xl border-2 border-ocean px-4 text-[18px] font-bold text-ocean disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function DuplicateButton({ item }: { item: AdminItem }) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function duplicate() {
    setBusy(true);
    try {
      const result = await duplicateAdminItem(item.id);
      if (result.ok)
        await navigate({ to: "/admin/items/$id", params: { id: String(result.item.id) } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`Duplicate ${item.title}`}
      onClick={duplicate}
      className="min-h-12 shrink-0 rounded-xl border-2 border-ocean px-4 text-[18px] font-bold text-ocean disabled:opacity-60"
    >
      Duplicate
    </button>
  );
}

function AdminItems() {
  const items = Route.useLoaderData();
  const filters = Route.useSearch();
  const visible = filterAdminItems(items, filters);
  const router = useRouter();
  const refresh = () => router.invalidate();

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.01em] text-ink">
          Items
        </h1>
        <div className="flex flex-wrap gap-3">
          {(["gift", "fund"] as const).map((type) => (
            <Link
              key={type}
              to="/admin/items/new"
              search={{ type }}
              className="inline-flex min-h-12 items-center rounded-xl bg-ocean px-5 text-[18px] font-bold text-white hover:bg-ocean-hover active:bg-ocean-pressed"
            >
              New {type}
            </Link>
          ))}
        </div>
      </div>
      {items.length > 0 ? <ListFilters items={items} filters={filters} /> : null}
      {items.length === 0 ? (
        <p className="mt-6 text-[18px] text-ocean-muted">No items yet. Add the first gift.</p>
      ) : visible.length === 0 ? (
        <div className="mt-6 grid justify-items-start gap-2">
          <p className="text-[18px] text-ocean-muted">No items match these filters.</p>
          {hasAdminFilters(filters) ? (
            <Link
              to="/admin"
              search={{}}
              className="inline-flex min-h-12 items-center text-[18px] font-bold text-ocean underline"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-[10px] bg-sand p-4 shadow-[0_1px_2px_rgb(15_76_110/0.25)]"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[16px] text-ocean-muted">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[14px] font-bold ${badge[item.status]}`}
                  >
                    {item.status}
                  </span>
                  <span>{item.type}</span>
                  <span>
                    {item.categoryEmoji} {item.categoryName}
                  </span>
                </p>
                <h2 className="mt-1 text-[20px] leading-tight font-bold break-words text-ink">
                  {item.title}
                </h2>
              </div>
              <Link
                to="/admin/items/$id"
                params={{ id: String(item.id) }}
                aria-label={`Edit ${item.title}`}
                className="inline-flex min-h-12 shrink-0 items-center rounded-xl border-2 border-ocean px-4 text-[18px] font-bold text-ocean"
              >
                Edit
              </Link>
              <DuplicateButton item={item} />
              <StatusButton item={item} onDone={refresh} />
              <ItemActions item={item} onChanged={refresh} onDeleted={refresh} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
