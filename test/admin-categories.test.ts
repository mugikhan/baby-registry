import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import {
  CategoryInputSchema,
  CategoryOrderSchema,
  CategoryUpdateSchema,
  ItemOrderSchema,
  toFieldErrors,
} from "@/lib/admin-items";
import { isSameIdSet, moveId } from "@/lib/admin-order";
import {
  createCategory,
  deleteCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from "@/server/admin/categories";
import { getGuestList } from "@/server/guest-list";

const db = drizzle(env.DB, { schema });
const actorEmail = "organiser@example.com";
const context = { db, actorEmail, nowMs: Date.UTC(2026, 10, 26) };

beforeEach(async () => {
  await db.delete(schema.auditLog);
  await db.delete(schema.items);
  await db.delete(schema.categories);
  await db.insert(schema.categories).values([
    { id: 1, name: "Sleep", emoji: "🛏️", sort: 5 },
    { id: 2, name: "Bath", emoji: "🛁", sort: 2 },
  ]);
});

const audit = async () => db.select().from(schema.auditLog);
const names = async () => (await listCategories({ db })).map((category) => category.name);

describe("category input schemas", () => {
  it("trims the name and keeps the emoji", () => {
    expect(CategoryInputSchema.parse({ name: "  Play  ", emoji: "🧸" })).toEqual({
      name: "Play",
      emoji: "🧸",
    });
  });

  it.each([
    ["an empty name", { name: "  ", emoji: "🧸" }, "name"],
    ["a 41 character name", { name: "x".repeat(41), emoji: "🧸" }, "name"],
    ["a missing emoji", { name: "Play" }, "emoji"],
    ["an empty emoji", { name: "Play", emoji: " " }, "emoji"],
    ["a 9 character emoji", { name: "Play", emoji: "x".repeat(9) }, "emoji"],
    ["an unknown field", { name: "Play", emoji: "🧸", sort: 1 }, "sort"],
  ])("refuses %s", (_name, input, field) => {
    const parsed = CategoryInputSchema.safeParse(input);
    if (parsed.success) throw new Error("The input was accepted");
    expect(toFieldErrors(parsed.error)).toHaveProperty(field);
  });

  it("accepts a 40 character name and refuses unknown update keys", () => {
    expect(CategoryUpdateSchema.safeParse({ name: "x".repeat(40) }).success).toBe(true);
    expect(CategoryUpdateSchema.safeParse({ sort: 1 }).success).toBe(false);
  });

  it("refuses an order body that is not a list of ids", () => {
    expect(ItemOrderSchema.safeParse({ itemIds: [1, "2"] }).success).toBe(false);
    expect(CategoryOrderSchema.safeParse({ categoryIds: [0] }).success).toBe(false);
  });
});

describe("order helpers", () => {
  it("compares id sets without duplicates", () => {
    expect(isSameIdSet([1, 2, 3], [3, 1, 2])).toBe(true);
    expect(isSameIdSet([1, 2, 3], [1, 1, 2])).toBe(false);
  });

  it("moves an id and ignores an out-of-range target", () => {
    expect(moveId([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
    expect(moveId([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  });
});

describe("categories", () => {
  it("lists in sort order with item counts", async () => {
    await db.insert(schema.items).values({ type: "gift", categoryId: 1, title: "Cot", sort: 1 });
    expect(await listCategories({ db })).toEqual([
      { id: 2, name: "Bath", emoji: "🛁", itemCount: 0 },
      { id: 1, name: "Sleep", emoji: "🛏️", itemCount: 1 },
    ]);
  });

  it("creates a category last with one audit row", async () => {
    const created = await createCategory(context, { name: "Play", emoji: "🧸" });
    expect(created).toMatchObject({ name: "Play", emoji: "🧸", itemCount: 0 });
    expect(await names()).toEqual(["Bath", "Sleep", "Play"]);
    const rows = await audit();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: "category.create",
      entity: "category",
      entityId: created.id,
      actorEmail,
    });
  });

  it("renames with a diff of only the changed fields", async () => {
    const result = await updateCategory(context, { id: 1, input: { name: "Nap", emoji: "🛏️" } });
    expect(result).toMatchObject({ kind: "saved", category: { name: "Nap" } });
    const rows = await audit();
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]?.diffJson ?? "")).toEqual({ name: ["Sleep", "Nap"] });
  });

  it("writes nothing when nothing changes, and reports an unknown id", async () => {
    await updateCategory(context, { id: 1, input: { name: "Sleep" } });
    expect(await audit()).toHaveLength(0);
    expect(await updateCategory(context, { id: 99, input: { name: "X" } })).toEqual({
      kind: "not-found",
    });
  });

  it("writes a clean order sequence with one audit row", async () => {
    await createCategory(context, { name: "Play", emoji: "🧸" });
    const [bath, sleep, play] = await listCategories({ db });
    if (!bath || !sleep || !play) throw new Error("The categories are missing");
    await db.delete(schema.auditLog);

    expect(await reorderCategories(context, { categoryIds: [play.id, bath.id, sleep.id] })).toEqual(
      { kind: "reordered" },
    );
    expect(await names()).toEqual(["Play", "Bath", "Sleep"]);
    const sorts = (await db.select().from(schema.categories)).map((row) => row.sort).sort();
    expect(sorts).toEqual([1, 2, 3]);
    const rows = await audit();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "category.reorder", entity: "category" });
  });

  it.each([
    ["a missing id", [1]],
    ["an unknown id", [1, 2, 3]],
    ["a duplicate", [1, 1]],
  ])("refuses an order with %s", async (_name, categoryIds) => {
    expect(await reorderCategories(context, { categoryIds })).toMatchObject({ kind: "invalid" });
    expect(await names()).toEqual(["Bath", "Sleep"]);
    expect(await audit()).toHaveLength(0);
  });

  it("deletes an empty category with one audit row", async () => {
    expect(await deleteCategory(context, { id: 1 })).toEqual({ kind: "deleted" });
    expect(await names()).toEqual(["Bath"]);
    const rows = await audit();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "category.delete", entityId: 1 });
  });

  it("refuses to delete a category with items of any status", async () => {
    await db
      .insert(schema.items)
      .values({ type: "gift", status: "archived", categoryId: 1, title: "Cot", sort: 1 });
    expect(await deleteCategory(context, { id: 1 })).toEqual({ kind: "has-items", itemCount: 1 });
    expect(await names()).toEqual(["Bath", "Sleep"]);
    expect(await audit()).toHaveLength(0);
    expect(await deleteCategory(context, { id: 99 })).toEqual({ kind: "not-found" });
  });

  it("shows a new category on the guest list once an item is published", async () => {
    const created = await createCategory(context, { name: "Play", emoji: "🧸" });
    await db.insert(schema.items).values({
      type: "gift",
      status: "published",
      categoryId: created.id,
      title: "Blocks",
      sort: 1,
    });
    const guest = await getGuestList({ db });
    expect(guest.categories.map((category) => category.name)).toContain("Play");
  });
});
