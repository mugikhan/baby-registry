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
