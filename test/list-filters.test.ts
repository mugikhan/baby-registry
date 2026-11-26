import { describe, expect, it } from "vitest";
import type { GuestList, GuestListItem } from "@/lib/guest-list";
import { countNeededByCategory, filterGuestList } from "@/lib/list-filters";

const base = { note: "", emoji: null, link: null };

function gift(id: number, categoryId: number, qty: number, taken: number): GuestListItem {
  return {
    ...base,
    id,
    title: `Gift ${id}`,
    categoryId,
    kind: "gift",
    qty,
    taken,
    takenBy: [],
    takenOn: null,
  };
}

function fund(id: number, categoryId: number): GuestListItem {
  return { ...base, id, title: `Fund ${id}`, categoryId, kind: "fund", givers: 2 };
}

const list: GuestList = {
  title: "Test",
  categories: [
    { id: 1, name: "One", emoji: "1" },
    { id: 2, name: "Two", emoji: "2" },
    { id: 3, name: "Three", emoji: "3" },
  ],
  items: [gift(1, 1, 2, 1), fund(2, 2), gift(3, 1, 1, 1), gift(4, 2, 1, 0), gift(5, 3, 1, 1)],
};

const ids = (items: GuestListItem[]) => items.map((item) => item.id);

describe("filterGuestList", () => {
  it("returns every item in order with no filters", () => {
    expect(ids(filterGuestList(list, {}))).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps one category", () => {
    expect(ids(filterGuestList(list, { category: 1 }))).toEqual([1, 3]);
  });

  it("keeps only funds for the funds chip", () => {
    expect(ids(filterGuestList(list, { funds: true }))).toEqual([2]);
  });

  it("lets the funds chip win over a category", () => {
    expect(ids(filterGuestList(list, { funds: true, category: 1 }))).toEqual([2]);
  });

  it("hides fully taken gifts and keeps funds when only needed items show", () => {
    expect(ids(filterGuestList(list, { needed: true }))).toEqual([1, 2, 4]);
  });

  it("combines a category with the needed flag", () => {
    expect(ids(filterGuestList(list, { category: 1, needed: true }))).toEqual([1]);
    expect(ids(filterGuestList(list, { category: 3, needed: true }))).toEqual([]);
  });

  it("matches nothing for an unknown category", () => {
    expect(filterGuestList(list, { category: 99 })).toEqual([]);
  });
});

describe("countNeededByCategory", () => {
  it("counts partly taken gifts and funds, and skips fully taken gifts", () => {
    const counts = countNeededByCategory(list);
    expect(counts.get(1)).toBe(1);
    expect(counts.get(2)).toBe(2);
    expect(counts.get(3)).toBeUndefined();
  });
});
