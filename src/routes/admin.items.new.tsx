import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { GiftForm } from "@/components/admin/GiftForm";
import { createAdminItem, fetchAdminCategories } from "@/lib/admin-api";
import type { ItemInput } from "@/lib/admin-items";

export const Route = createFileRoute("/admin/items/new")({
  ssr: false,
  validateSearch: z.object({ type: z.literal("gift").catch("gift") }),
  loader: () => fetchAdminCategories(),
  component: NewItem,
});

function NewItem() {
  const categories = Route.useLoaderData();
  const navigate = useNavigate();

  async function save(input: ItemInput) {
    const result = await createAdminItem(input);
    if (!result.ok) return result.errors;
    await navigate({ to: "/admin" });
    return undefined;
  }

  return (
    <>
      <Link
        to="/admin"
        className="mt-3 inline-flex min-h-12 items-center text-[18px] font-bold text-ocean underline"
      >
        Back to items
      </Link>
      <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.01em] text-ink">
        New gift
      </h1>
      <div className="mt-6">
        <GiftForm
          categories={categories}
          onSave={save}
          onCancel={() => navigate({ to: "/admin" })}
        />
      </div>
    </>
  );
}
