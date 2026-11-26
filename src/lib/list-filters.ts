import { z } from "zod";
import { getItemState } from "./item-state";
import type { GuestList, GuestListItem } from "./guest-list";

const TrueFlagSchema = z
  .union([z.literal(true), z.literal(1)])
  .transform(() => true as const)
  .optional()
  .catch(undefined);

export const GuestListFiltersSchema = z.object({
  category: z.coerce.number().int().positive().optional().catch(undefined),
  funds: TrueFlagSchema,
  needed: TrueFlagSchema,
});

export type GuestListFilters = z.infer<typeof GuestListFiltersSchema>;

function isStillNeeded(item: GuestListItem) {
  return getItemState(item) !== "taken";
}

/** Keeps the module's order. The chip filters by category or by funds, never both. */
export function filterGuestList(list: GuestList, filters: GuestListFilters): GuestListItem[] {
  return list.items.filter((item) => {
    if (filters.funds && item.kind !== "fund") return false;
    if (!filters.funds && filters.category !== undefined && item.categoryId !== filters.category) {
      return false;
    }
    return !filters.needed || isStillNeeded(item);
  });
}

/** Counts the items still needed per category id. A fund always counts as needed. */
export function countNeededByCategory(list: GuestList): Map<number, number> {
  const counts = new Map<number, number>();
  for (const item of list.items) {
    if (isStillNeeded(item)) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
  }
  return counts;
}
