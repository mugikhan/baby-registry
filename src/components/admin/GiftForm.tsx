import { useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { Field, SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import {
  ItemInputSchema,
  toFieldErrors,
  type AdminCategory,
  type FieldErrors,
  type ItemInput,
} from "@/lib/admin-items";
import type { GuestListGift } from "@/lib/guest-list";

interface GiftValues {
  title: string;
  categoryId: string;
  note: string;
  link: string;
  emoji: string;
  qty: string;
}

const EMPTY: GiftValues = { title: "", categoryId: "", note: "", link: "", emoji: "", qty: "1" };

function toCandidate(values: GiftValues) {
  const link = values.link.trim();
  const emoji = values.emoji.trim();
  return {
    type: "gift",
    title: values.title,
    categoryId: values.categoryId === "" ? undefined : Number(values.categoryId),
    note: values.note,
    ...(link ? { link } : {}),
    ...(emoji ? { emoji } : {}),
    qty: values.qty.trim() === "" ? undefined : Number(values.qty),
  };
}

function toPreview(values: GiftValues): GuestListGift {
  const link = values.link.trim();
  const qty = Number(values.qty);
  return {
    id: 0,
    kind: "gift",
    title: values.title.trim() || "Your gift title",
    note: values.note,
    categoryId: Number(values.categoryId) || 0,
    emoji: values.emoji.trim() || null,
    link: link.startsWith("https://") ? link : null,
    qty: Number.isInteger(qty) && qty >= 1 ? qty : 1,
    taken: 0,
    takenBy: [],
    takenOn: null,
  };
}

export function GiftForm({
  categories,
  onSave,
  onCancel,
}: {
  categories: AdminCategory[];
  onSave: (input: ItemInput) => Promise<FieldErrors | undefined>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const set = (field: keyof GiftValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = ItemInputSchema.safeParse(toCandidate(values));
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    const serverErrors = await onSave(parsed.data);
    setSaving(false);
    setErrors(serverErrors ?? {});
  }

  const preview = toPreview(values);

  return (
    <div className="grid items-start gap-8 min-[900px]:grid-cols-2">
      <form onSubmit={submit} noValidate className="grid gap-5">
        {errors["form"] ? (
          <p role="alert" className="font-semibold text-airmail-deep">
            {errors["form"]}
          </p>
        ) : null}
        <Field label="Title" error={errors["title"]}>
          {(props) => (
            <TextInput {...props} value={values.title} onChange={set("title")} autoComplete="off" />
          )}
        </Field>
        <Field label="Category" error={errors["categoryId"]}>
          {(props) => (
            <SelectInput {...props} value={values.categoryId} onChange={set("categoryId")}>
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.emoji} {category.name}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label="Note" error={errors["note"]} hint="Up to 280 characters.">
          {(props) => <TextArea {...props} value={values.note} onChange={set("note")} />}
        </Field>
        <Field
          label="Example link"
          error={errors["link"]}
          hint="Optional. Must start with https://"
        >
          {(props) => (
            <TextInput
              {...props}
              type="url"
              inputMode="url"
              value={values.link}
              onChange={set("link")}
            />
          )}
        </Field>
        <Field
          label="Emoji"
          error={errors["emoji"]}
          hint="Optional. The category emoji shows if empty."
        >
          {(props) => <TextInput {...props} value={values.emoji} onChange={set("emoji")} />}
        </Field>
        <Field
          label="Quantity"
          error={errors["qty"]}
          hint="How many guests can bring this, 1 to 50."
        >
          {(props) => (
            <TextInput {...props} inputMode="numeric" value={values.qty} onChange={set("qty")} />
          )}
        </Field>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="min-h-12 flex-1 rounded-xl bg-ocean px-5 text-[18px] font-bold text-white hover:bg-ocean-hover active:bg-ocean-pressed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save as draft"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-xl border-2 border-ocean px-5 text-[18px] font-bold text-ocean"
          >
            Cancel
          </button>
        </div>
      </form>
      <section aria-label="Card preview" className="min-[900px]:sticky min-[900px]:top-5">
        <h2 className="mb-3 text-[20px] font-bold text-ink">Preview</h2>
        <ItemCard item={preview} category={categories.find((c) => c.id === preview.categoryId)} />
      </section>
    </div>
  );
}
