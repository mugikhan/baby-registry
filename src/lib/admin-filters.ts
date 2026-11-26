import { z } from "zod";
import { ItemStatusSchema, type AdminItem } from "./admin-items";

export const AdminListFiltersSchema = z.object({
  q: z.string().optional().catch(undefined),
  type: z.enum(["gift", "fund"]).optional().catch(undefined),
  category: z.coerce.number().int().positive().optional().catch(undefined),
  status: ItemStatusSchema.optional().catch(undefined),
});

export type AdminListFilters = z.infer<typeof AdminListFiltersSchema>;

export function hasAdminFilters(filters: AdminListFilters): boolean {
  return (
    Boolean(filters.q?.trim()) ||
    filters.type !== undefined ||
    filters.category !== undefined ||
    filters.status !== undefined
  );
}

/** Keeps the list's order. Every filter that is set must match. */
export function filterAdminItems(items: AdminItem[], filters: AdminListFilters): AdminItem[] {
  const query = filters.q?.trim().toLowerCase();
  return items.filter(
    (item) =>
      (!query || item.title.toLowerCase().includes(query)) &&
      (filters.type === undefined || item.type === filters.type) &&
      (filters.category === undefined || item.categoryId === filters.category) &&
      (filters.status === undefined || item.status === filters.status),
  );
}
