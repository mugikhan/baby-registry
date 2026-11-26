import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ItemActions } from "@/components/admin/ItemActions";
import { ItemForm } from "@/components/admin/ItemForm";
import { fetchAdminCategories, fetchAdminItem, updateAdminItem } from "@/lib/admin-api";
import type { ItemUpdate } from "@/lib/admin-items";

export const Route = createFileRoute("/admin/items/$id")({
  ssr: false,
  loader: async ({ params }) => {
    const [item, categories] = await Promise.all([
      fetchAdminItem(Number(params.id)),
      fetchAdminCategories(),
    ]);
    return { item, categories };
  },
  component: EditItem,
});

function EditItem() {
  const { item, categories } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();

  async function save(input: ItemUpdate) {
    const result = await updateAdminItem(item.id, input);
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
        Edit {item.type}
      </h1>
      <p className="mt-2 text-[16px] text-ocean-muted">Status: {item.status}</p>
      <div className="mt-4 flex">
        <ItemActions
          item={item}
          onChanged={() => router.invalidate()}
          onDeleted={() => navigate({ to: "/admin" })}
        />
      </div>
      <div className="mt-6">
        <ItemForm
          mode="edit"
          item={item}
          categories={categories}
          onSave={save}
          onCancel={() => navigate({ to: "/admin" })}
        />
      </div>
    </>
  );
}
