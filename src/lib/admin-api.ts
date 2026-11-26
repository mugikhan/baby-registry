import { z } from "zod";
import {
  AdminCategoryListSchema,
  AdminCategoryResponseSchema,
  AdminItemListSchema,
  AdminItemResponseSchema,
  FieldErrorsSchema,
  type AdminCategory,
  type AdminItem,
  type CategoryInput,
  type CategoryUpdate,
  type FieldErrors,
  type ItemInput,
  type ItemStatus,
  type ItemUpdate,
} from "./admin-items";

export type SaveResult = { ok: true; item: AdminItem } | { ok: false; errors: FieldErrors };

async function getJson<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`The admin request failed with ${response.status}`);
  return schema.parse(await response.json());
}

async function sendJson(
  method: "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<SaveResult> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
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

export async function fetchAdminItem(id: number): Promise<AdminItem> {
  return (await getJson(`/api/admin/items/${id}`, AdminItemResponseSchema)).item;
}

export function updateAdminItem(id: number, input: ItemUpdate): Promise<SaveResult> {
  return sendJson("PATCH", `/api/admin/items/${id}`, input);
}

export function duplicateAdminItem(id: number): Promise<SaveResult> {
  return sendJson("POST", `/api/admin/items/${id}/duplicate`);
}

export function createAdminItem(input: ItemInput): Promise<SaveResult> {
  return sendJson("POST", "/api/admin/items", input);
}

export function setAdminItemStatus(id: number, status: ItemStatus): Promise<SaveResult> {
  return sendJson("POST", `/api/admin/items/${id}/status`, { status });
}

export type DeleteResult = { ok: true } | { ok: false; reserved: boolean; message: string };

export async function deleteAdminItem(id: number): Promise<DeleteResult> {
  const response = await fetch(`/api/admin/items/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (response.status === 409 || response.status === 404) {
    const parsed = FieldErrorsSchema.parse(await response.json());
    return {
      ok: false,
      reserved: response.status === 409,
      message: parsed.errors["form"] ?? "The item was not deleted",
    };
  }
  if (!response.ok) throw new Error(`The admin request failed with ${response.status}`);
  return { ok: true };
}

export type OrderResult = { ok: true } | { ok: false; message: string };

async function putOrder(path: string, body: unknown): Promise<OrderResult> {
  const response = await fetch(path, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 400 || response.status === 404) {
    const parsed = FieldErrorsSchema.parse(await response.json());
    return { ok: false, message: Object.values(parsed.errors)[0] ?? "The order was not saved" };
  }
  if (!response.ok) throw new Error(`The admin request failed with ${response.status}`);
  return { ok: true };
}

export function reorderAdminItems(categoryId: number, itemIds: number[]): Promise<OrderResult> {
  return putOrder(`/api/admin/categories/${categoryId}/order`, { itemIds });
}

export function reorderAdminCategories(categoryIds: number[]): Promise<OrderResult> {
  return putOrder("/api/admin/categories/order", { categoryIds });
}

export type CategorySaveResult =
  | { ok: true; category: AdminCategory }
  | { ok: false; errors: FieldErrors };

async function sendCategory(
  method: "POST" | "PATCH",
  path: string,
  body: CategoryInput | CategoryUpdate,
): Promise<CategorySaveResult> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 400 || response.status === 404) {
    return { ok: false, errors: FieldErrorsSchema.parse(await response.json()).errors };
  }
  if (!response.ok) throw new Error(`The admin request failed with ${response.status}`);
  return {
    ok: true,
    category: AdminCategoryResponseSchema.parse(await response.json()).category,
  };
}

export function createAdminCategory(input: CategoryInput): Promise<CategorySaveResult> {
  return sendCategory("POST", "/api/admin/categories", input);
}

export function updateAdminCategory(
  id: number,
  input: CategoryUpdate,
): Promise<CategorySaveResult> {
  return sendCategory("PATCH", `/api/admin/categories/${id}`, input);
}

export async function deleteAdminCategory(id: number): Promise<OrderResult> {
  const response = await fetch(`/api/admin/categories/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (response.status === 409 || response.status === 404) {
    const parsed = FieldErrorsSchema.parse(await response.json());
    return { ok: false, message: parsed.errors["form"] ?? "The category was not deleted" };
  }
  if (!response.ok) throw new Error(`The admin request failed with ${response.status}`);
  return { ok: true };
}
