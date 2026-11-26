import { z } from "zod";

export const ItemStatusSchema = z.enum(["draft", "published", "archived"]);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

const GiftInputSchema = z.strictObject({
  type: z.literal("gift"),
  title: z.string().trim().min(1, "Enter a title").max(80, "Use 80 characters or fewer"),
  categoryId: z.number("Choose a category").int("Choose a category").positive("Choose a category"),
  note: z.string().max(280, "Use 280 characters or fewer").default(""),
  link: z
    .url({ protocol: /^https$/, error: "Enter a link that starts with https://" })
    .max(2000, "Use 2000 characters or fewer")
    .optional(),
  emoji: z.string().min(1, "Use one emoji").max(8, "Use one emoji").optional(),
  qty: z
    .number("Enter a quantity")
    .int("Enter a whole number")
    .min(1, "Enter at least 1")
    .max(50, "Enter 50 or fewer"),
});

export const ItemInputSchema = z.discriminatedUnion("type", [GiftInputSchema]);
export type ItemInput = z.infer<typeof ItemInputSchema>;

export const StatusInputSchema = z.strictObject({ status: ItemStatusSchema });

export const AdminCategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  emoji: z.string(),
});
export type AdminCategory = z.infer<typeof AdminCategorySchema>;

export const AdminItemSchema = z.object({
  id: z.number().int(),
  type: z.enum(["gift", "fund"]),
  status: ItemStatusSchema,
  categoryId: z.number().int(),
  categoryName: z.string(),
  categoryEmoji: z.string(),
  title: z.string(),
  note: z.string(),
  link: z.string().nullable(),
  emoji: z.string().nullable(),
  qty: z.number().int(),
  sort: z.number().int(),
  updatedBy: z.string().nullable(),
  claimCount: z.number().int(),
});
export type AdminItem = z.infer<typeof AdminItemSchema>;

export const AdminItemListSchema = z.object({ items: z.array(AdminItemSchema) });
export const AdminCategoryListSchema = z.object({ categories: z.array(AdminCategorySchema) });
export const AdminItemResponseSchema = z.object({ item: AdminItemSchema });

export type FieldErrors = Record<string, string>;

export const FieldErrorsSchema = z.object({ errors: z.record(z.string(), z.string()) });

/** Keeps the first message per field. A top-level unknown key blames the key itself. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) errors[key] ??= "This field is not allowed";
      continue;
    }
    const field = issue.path.length > 0 ? String(issue.path[0]) : "form";
    errors[field] ??= issue.message;
  }
  return errors;
}
