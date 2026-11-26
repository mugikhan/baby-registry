import { describe, expect, it } from "vitest";
import {
  AdminListFiltersSchema,
  filterAdminItems,
  hasAdminFilters,
  type AdminListFilters,
} from "@/lib/admin-filters";
import type { AdminItem } from "@/lib/admin-items";

function item(overrides: Partial<AdminItem> & Pick<AdminItem, "id" | "title">): AdminItem {
  return {
    type: "gift",
    status: "published",
    categoryId: 1,
    categoryName: "Sleep",
    categoryEmoji: "🛏️",
    note: "",
    link: null,
    emoji: null,
    qty: 1,
    sort: 1,
    updatedBy: null,
    claimCount: 0,
    ...overrides,
  };
}

const items = [
  item({ id: 1, title: "Hooded towels", categoryId: 2 }),
  item({ id: 2, title: "Pram fund", type: "fund", categoryId: 4 }),
  item({ id: 3, title: "Night light", status: "draft" }),
  item({ id: 4, title: "High chair", status: "archived", categoryId: 3 }),
];

const ids = (filters: AdminListFilters) => filterAdminItems(items, filters).map((i) => i.id);

describe("filterAdminItems", () => {
  it("returns everything with no filters", () => {
    expect(ids({})).toEqual([1, 2, 3, 4]);
  });

  it("matches the title without case and with surrounding spaces", () => {
    expect(ids({ q: "  NIGHT " })).toEqual([3]);
    expect(ids({ q: "ch" })).toEqual([4]);
  });

  it("treats a blank search as no search", () => {
    expect(ids({ q: "   " })).toEqual([1, 2, 3, 4]);
  });

  it("filters by type, category and status", () => {
    expect(ids({ type: "fund" })).toEqual([2]);
    expect(ids({ category: 1 })).toEqual([3]);
    expect(ids({ status: "archived" })).toEqual([4]);
  });

  it("combines every filter", () => {
    expect(ids({ type: "gift", status: "draft", category: 1, q: "light" })).toEqual([3]);
    expect(ids({ type: "fund", status: "draft" })).toEqual([]);
  });
});

describe("AdminListFiltersSchema", () => {
  it("drops each invalid value on its own", () => {
    expect(
      AdminListFiltersSchema.parse({ type: "loan", category: "abc", status: "draft" }),
    ).toEqual({ status: "draft" });
  });

  it("reads a numeric category from the URL string", () => {
    expect(AdminListFiltersSchema.parse({ category: "3", q: "cot" })).toEqual({
      category: 3,
      q: "cot",
    });
  });

  it("reports whether any filter is set", () => {
    expect(hasAdminFilters({})).toBe(false);
    expect(hasAdminFilters({ q: " " })).toBe(false);
    expect(hasAdminFilters({ status: "draft" })).toBe(true);
  });
});
