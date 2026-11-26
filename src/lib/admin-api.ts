import { z } from "zod";
import {
  AdminCategoryListSchema,
  AdminItemListSchema,
  AdminItemResponseSchema,
  FieldErrorsSchema,
  type AdminCategory,
  type AdminItem,
  type FieldErrors,
  type ItemInput,
  type ItemStatus,
} from "./admin-items";

export type SaveResult = { ok: true; item: AdminItem } | { ok: false; errors: FieldErrors };

async function getJson<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`The admin request failed with ${response.status}`);
  return schema.parse(await response.json());
}

async function postJson(path: string, body: unknown): Promise<SaveResult> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 400 || response.status === 404) {
    const parsed = FieldErrorsSchema.parse(await response.json());
    return { ok: false, errors: parsed.errors };
  }
  if (!response.ok) throw new Error(`The admin request failed with ${response.status}`);
  return { ok: true, item: AdminItemResponseSchema.parse(await response.json()).item };
}

export async function fetchAdminItems(): Promise<AdminItem[]> {
  return (await getJson("/api/admin/items", AdminItemListSchema)).items;
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  return (await getJson("/api/admin/categories", AdminCategoryListSchema)).categories;
}

export function createAdminItem(input: ItemInput): Promise<SaveResult> {
  return postJson("/api/admin/items", input);
}

export function setAdminItemStatus(id: number, status: ItemStatus): Promise<SaveResult> {
  return postJson(`/api/admin/items/${id}/status`, { status });
}
