import { useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { Field, SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import {
  ItemInputSchema,
  ItemUpdateSchema,
  toFieldErrors,
  type AdminCategory,
  type AdminItem,
  type FieldErrors,
  type ItemInput,
  type ItemUpdate,
} from "@/lib/admin-items";
import type { GuestListItem } from "@/lib/guest-list";

interface FormValues {
  title: string;
  categoryId: string;
  note: string;
  link: string;
  emoji: string;
  qty: string;
}

type ItemType = AdminItem["type"];

type ItemFormProps = { categories: AdminCategory[]; onCancel: () => void } & (
  | {
      mode: "create";
      type: ItemType;
      onSave: (input: ItemInput) => Promise<FieldErrors | undefined>;
    }
  | {
      mode: "edit";
      item: AdminItem;
      onSave: (input: ItemUpdate) => Promise<FieldErrors | undefined>;
    }
);

const EMPTY: FormValues = { title: "", categoryId: "", note: "", link: "", emoji: "", qty: "1" };

function fromItem(item: AdminItem): FormValues {
  return {
    title: item.title,
    categoryId: String(item.categoryId),
    note: item.note,
    link: item.link ?? "",
    emoji: item.emoji ?? "",
    qty: String(item.qty),
  };
}

const parseNumber = (raw: string) => (raw.trim() === "" ? undefined : Number(raw));

function toCreateCandidate(type: ItemType, values: FormValues) {
  const link = values.link.trim();
  const emoji = values.emoji.trim();
  const common = {
    title: values.title,
    categoryId: parseNumber(values.categoryId),
    note: values.note,
    ...(emoji ? { emoji } : {}),
  };
  return type === "gift"
    ? { type, ...common, ...(link ? { link } : {}), qty: parseNumber(values.qty) }
    : { type, ...common };
}

function toUpdateCandidate(type: ItemType, values: FormValues) {
  return {
    title: values.title,
    categoryId: parseNumber(values.categoryId),
    note: values.note,
    emoji: values.emoji.trim() || null,
    ...(type === "gift" ? { link: values.link.trim() || null, qty: parseNumber(values.qty) } : {}),
  };
}

function toPreview(type: ItemType, values: FormValues, taken: number): GuestListItem {
  const base = {
    id: 0,
    title: values.title.trim() || (type === "gift" ? "Your gift title" : "Your fund title"),
    note: values.note,
    categoryId: Number(values.categoryId) || 0,
    emoji: values.emoji.trim() || null,
  };
  if (type === "fund") return { ...base, kind: "fund", link: null, givers: 0 };
  const link = values.link.trim();
  const qty = Number(values.qty);
  return {
    ...base,
    kind: "gift",
    link: link.startsWith("https://") ? link : null,
    qty: Number.isInteger(qty) && qty >= 1 ? qty : 1,
    taken,
    takenBy: [],
    takenOn: null,
  };
}

export function ItemForm(props: ItemFormProps) {
  const { categories, onCancel } = props;
  const type = props.mode === "create" ? props.type : props.item.type;
  const taken = props.mode === "edit" ? props.item.claimCount : 0;
  const [values, setValues] = useState(props.mode === "edit" ? fromItem(props.item) : EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    let serverErrors: FieldErrors | undefined;
    if (props.mode === "create") {
      const parsed = ItemInputSchema.safeParse(toCreateCandidate(type, values));
      if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
      setSaving(true);
      serverErrors = await props.onSave(parsed.data);
    } else {
      const parsed = ItemUpdateSchema.safeParse(toUpdateCandidate(type, values));
      if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
      setSaving(true);
      serverErrors = await props.onSave(parsed.data);
    }
    setSaving(false);
    setErrors(serverErrors ?? {});
  }

  const preview = toPreview(type, values, taken);
  const qtyHint =
    taken > 0
      ? `${taken} already taken. Use ${taken} to 50.`
      : "How many guests can bring this, 1 to 50.";

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
        {type === "gift" ? (
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
        ) : null}
        <Field
          label="Emoji"
          error={errors["emoji"]}
          hint="Optional. The category emoji shows if empty."
        >
          {(props) => <TextInput {...props} value={values.emoji} onChange={set("emoji")} />}
        </Field>
        {type === "gift" ? (
          <Field label="Quantity" error={errors["qty"]} hint={qtyHint}>
            {(props) => (
              <TextInput {...props} inputMode="numeric" value={values.qty} onChange={set("qty")} />
            )}
          </Field>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="min-h-12 flex-1 rounded-xl bg-ocean px-5 text-[18px] font-bold text-white hover:bg-ocean-hover active:bg-ocean-pressed disabled:opacity-60"
          >
            {saving ? "Saving…" : props.mode === "create" ? "Save as draft" : "Save changes"}
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
