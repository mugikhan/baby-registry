import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Field, TextInput } from "@/components/admin/fields";
import { MoveButtons } from "@/components/admin/MoveButtons";
import {
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminCategories,
  reorderAdminCategories,
  updateAdminCategory,
} from "@/lib/admin-api";
import type { AdminCategory, FieldErrors } from "@/lib/admin-items";
import { moveId } from "@/lib/admin-order";

export const Route = createFileRoute("/admin/categories")({
  ssr: false,
  loader: () => fetchAdminCategories(),
  component: AdminCategories,
});

const outlineButton =
  "min-h-12 shrink-0 rounded-xl border-2 border-ocean px-4 text-[18px] font-bold text-ocean disabled:opacity-60";
const solidButton =
  "min-h-12 shrink-0 rounded-xl bg-ocean px-5 text-[18px] font-bold text-white hover:bg-ocean-hover active:bg-ocean-pressed disabled:opacity-60";

function CategoryForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: { name: string; emoji: string };
  submitLabel: string;
  onSubmit: (value: { name: string; emoji: string }) => Promise<FieldErrors | undefined>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [emoji, setEmoji] = useState(initial.emoji);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const failed = await onSubmit({ name, emoji });
      if (failed) setErrors(failed);
      else {
        setErrors({});
        if (!onCancel) {
          setName("");
          setEmoji("");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="Name" error={errors["name"]}>
          {(props) => (
            <TextInput {...props} value={name} onChange={(event) => setName(event.target.value)} />
          )}
        </Field>
        <Field label="Emoji" error={errors["emoji"]}>
          {(props) => (
            <TextInput
              {...props}
              value={emoji}
              onChange={(event) => setEmoji(event.target.value)}
            />
          )}
        </Field>
      </div>
      {errors["form"] ? (
        <p role="alert" className="font-semibold text-airmail-deep">
          {errors["form"]}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={solidButton}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className={outlineButton}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function CategoryRow({
  category,
  index,
  total,
  busy,
  onMove,
  onChanged,
}: {
  category: AdminCategory;
  index: number;
  total: number;
  busy: boolean;
  onMove: (direction: "up" | "down") => void;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setMessage(null);
    const result = await deleteAdminCategory(category.id);
    if (result.ok) await onChanged();
    else setMessage(result.message);
  }

  const noun = category.itemCount === 1 ? "item" : "items";

  return (
    <li className="grid gap-3 rounded-[10px] bg-sand p-4 shadow-[0_1px_2px_rgb(15_76_110/0.25)]">
      {editing ? (
        <CategoryForm
          initial={category}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={async (value) => {
            const result = await updateAdminCategory(category.id, value);
            if (!result.ok) return result.errors;
            await onChanged();
            setEditing(false);
            return undefined;
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] leading-tight font-bold break-words text-ink">
              {category.emoji} {category.name}
            </h2>
            <p className="text-[16px] text-ocean-muted">
              {category.itemCount} {noun}
            </p>
          </div>
          <MoveButtons
            id={category.id}
            label={category.name}
            isFirst={index === 0 || busy}
            isLast={index === total - 1 || busy}
            onMove={onMove}
          />
          <button
            type="button"
            aria-label={`Edit ${category.name}`}
            onClick={() => setEditing(true)}
            className={outlineButton}
          >
            Edit
          </button>
          {deleting ? (
            <div
              role="group"
              aria-label={`Confirm delete ${category.name}`}
              className="flex flex-wrap items-center gap-3"
            >
              <button
                type="button"
                onClick={remove}
                className="min-h-12 rounded-xl bg-airmail-deep px-4 text-[18px] font-bold text-white"
              >
                Yes, delete
              </button>
              <button type="button" onClick={() => setDeleting(false)} className={outlineButton}>
                Keep
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Delete ${category.name}`}
              onClick={() => setDeleting(true)}
              className="min-h-12 shrink-0 rounded-xl border-2 border-airmail-deep px-4 text-[18px] font-bold text-airmail-deep"
            >
              Delete
            </button>
          )}
        </div>
      )}
      {message ? (
        <p role="alert" className="text-[18px] font-semibold text-airmail-deep">
          {message}
        </p>
      ) : null}
    </li>
  );
}

function AdminCategories() {
  const categories = Route.useLoaderData();
  const router = useRouter();
  const refresh = () => router.invalidate();
  const [moving, setMoving] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  async function move(from: number, to: number) {
    const next = moveId(
      categories.map((category) => category.id),
      from,
      to,
    );
    setMoving(true);
    setOrderError(null);
    try {
      const result = await reorderAdminCategories(next);
      if (!result.ok) setOrderError(result.message);
      await refresh();
    } catch {
      setOrderError("The order was not saved. Try again.");
    } finally {
      setMoving(false);
    }
  }

  return (
    <>
      <h1 className="mt-3 text-[34px] leading-[1.05] font-extrabold tracking-[-0.01em] text-ink">
        Categories
      </h1>
      <section aria-label="New category" className="mt-6 rounded-[10px] bg-sand p-4">
        <h2 className="mb-3 text-[20px] font-bold text-ink">New category</h2>
        <CategoryForm
          initial={{ name: "", emoji: "" }}
          submitLabel="Add category"
          onSubmit={async (value) => {
            const result = await createAdminCategory(value);
            if (!result.ok) return result.errors;
            await refresh();
            return undefined;
          }}
        />
      </section>
      {orderError ? (
        <p role="alert" className="mt-3 text-[18px] font-semibold text-airmail-deep">
          {orderError}
        </p>
      ) : null}
      {categories.length === 0 ? (
        <p className="mt-6 text-[18px] text-ocean-muted">No categories yet.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              index={index}
              total={categories.length}
              busy={moving}
              onMove={(direction) => move(index, direction === "up" ? index - 1 : index + 1)}
              onChanged={refresh}
            />
          ))}
        </ul>
      )}
    </>
  );
}
