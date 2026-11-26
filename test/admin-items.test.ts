import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { ItemInputSchema, ItemUpdateSchema, toFieldErrors } from "@/lib/admin-items";
import {
  createItem,
  duplicateItem,
  getItem,
  listItems,
  setItemStatus,
  updateItem,
} from "@/server/admin/items";

const db = drizzle(env.DB, { schema });
const actorEmail = "organiser@example.com";
const NOW = Date.UTC(2026, 10, 26);
const context = { db, actorEmail, nowMs: NOW };

const validGift = { type: "gift", title: "Night light", categoryId: 1, qty: 2 };

function errorsFor(input: unknown) {
  const parsed = ItemInputSchema.safeParse(input);
  if (parsed.success) throw new Error("The input was accepted");
  return toFieldErrors(parsed.error);
}

beforeEach(async () => {
  await db.delete(schema.auditLog);
  await db.delete(schema.cashGifts);
  await db.delete(schema.claims);
  await db.delete(schema.guests);
  await db.delete(schema.items);
  await db.delete(schema.categories);
  await db.insert(schema.categories).values([
    { id: 1, name: "Sleep", emoji: "🛏️", sort: 2 },
    { id: 2, name: "Bath", emoji: "🛁", sort: 1 },
  ]);
});

function parseGift(input: unknown) {
  const parsed = ItemInputSchema.parse(input);
  return parsed;
}

describe("gift input schema", () => {
  it("accepts a valid gift and applies defaults", () => {
    expect(parseGift(validGift)).toEqual({ ...validGift, note: "" });
  });

  it("trims the title", () => {
    expect(parseGift({ ...validGift, title: "  Cot  " }).title).toBe("Cot");
  });

  it.each([
    ["an unknown field", { ...validGift, colour: "blue" }, "colour"],
    ["an http link", { ...validGift, link: "http://example.com" }, "link"],
    ["a javascript link", { ...validGift, link: "javascript:alert(1)" }, "link"],
    ["qty 0", { ...validGift, qty: 0 }, "qty"],
    ["qty 51", { ...validGift, qty: 51 }, "qty"],
    ["an empty title", { ...validGift, title: "   " }, "title"],
    ["a long title", { ...validGift, title: "x".repeat(81) }, "title"],
    ["a long note", { ...validGift, note: "x".repeat(281) }, "note"],
    ["a long emoji", { ...validGift, emoji: "x".repeat(9) }, "emoji"],
    ["a missing category", { type: "gift", title: "Cot", qty: 1 }, "categoryId"],
    ["a zero category", { ...validGift, categoryId: 0 }, "categoryId"],
  ])("refuses %s", (_name, input, field) => {
    expect(errorsFor(input)).toHaveProperty(field);
  });

  it("refuses an unknown type", () => {
    expect(ItemInputSchema.safeParse({ ...validGift, type: "loan" }).success).toBe(false);
  });
});

describe("createItem", () => {
  it("refuses a category that does not exist", async () => {
    const result = await createItem(context, parseGift({ ...validGift, categoryId: 99 }));
    expect(result).toEqual({ kind: "invalid", errors: { categoryId: "Choose a category" } });
    expect(await db.select().from(schema.auditLog)).toHaveLength(0);
  });

  it("creates a draft with updated_by and one audit row", async () => {
    const result = await createItem(
      context,
      parseGift({ ...validGift, link: "https://example.com/x" }),
    );
    if (result.kind !== "created") throw new Error("The item was not created");
    expect(result.item).toMatchObject({
      status: "draft",
      title: "Night light",
      updatedBy: actorEmail,
      categoryName: "Sleep",
      claimCount: 0,
    });

    const rows = await db.select().from(schema.auditLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorEmail,
      action: "item.create",
      entity: "item",
      entityId: result.item.id,
      at: NOW,
    });
    expect(JSON.parse(rows[0]?.diffJson ?? "")).toEqual({
      type: [null, "gift"],
      status: [null, "draft"],
      categoryId: [null, 1],
      title: [null, "Night light"],
      note: [null, ""],
      link: [null, "https://example.com/x"],
      emoji: [null, null],
      qty: [null, 2],
    });
  });

  it("appends to the end of the category", async () => {
    const first = await createItem(context, parseGift(validGift));
    const second = await createItem(context, parseGift({ ...validGift, title: "Cot" }));
    if (first.kind !== "created" || second.kind !== "created") throw new Error("Not created");
    expect(second.item.sort).toBe(first.item.sort + 1);
  });
});

describe("setItemStatus", () => {
  it("writes one audit row with the changed status and sets updated_by", async () => {
    const created = await createItem(
      { ...context, actorEmail: "first@example.com" },
      parseGift(validGift),
    );
    if (created.kind !== "created") throw new Error("Not created");
    await db.delete(schema.auditLog);

    const result = await setItemStatus(context, { id: created.item.id, status: "published" });
    expect(result).toMatchObject({ kind: "updated", item: { status: "published" } });

    const rows = await db.select().from(schema.auditLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorEmail, action: "item.status", entityId: created.item.id });
    expect(JSON.parse(rows[0]?.diffJson ?? "")).toEqual({ status: ["draft", "published"] });
    expect((await getItem({ db, id: created.item.id }))?.updatedBy).toBe(actorEmail);
  });

  it("writes nothing when the status is unchanged", async () => {
    const created = await createItem(context, parseGift(validGift));
    if (created.kind !== "created") throw new Error("Not created");
    await db.delete(schema.auditLog);
    await setItemStatus(context, { id: created.item.id, status: "draft" });
    expect(await db.select().from(schema.auditLog)).toHaveLength(0);
  });

  it("reports an unknown item", async () => {
    expect(await setItemStatus(context, { id: 999, status: "published" })).toEqual({
      kind: "not-found",
    });
  });
});

describe("listItems", () => {
  it("lists every status in category, sort and id order with claim counts", async () => {
    await db.insert(schema.items).values([
      { id: 1, type: "gift", status: "published", categoryId: 1, title: "A", qty: 2, sort: 1 },
      { id: 2, type: "gift", status: "draft", categoryId: 2, title: "B", sort: 5 },
      { id: 3, type: "gift", status: "archived", categoryId: 2, title: "C", sort: 1 },
    ]);
    await db.insert(schema.guests).values({ id: 1, name: "G", deviceTokenHash: "h", createdAt: 1 });
    await db.insert(schema.claims).values({ itemId: 1, guestId: 1, createdAt: 1 });

    const list = await listItems({ db });
    expect(list.map((item) => [item.id, item.status, item.claimCount])).toEqual([
      [3, "archived", 0],
      [2, "draft", 0],
      [1, "published", 1],
    ]);
  });
});

const validFund = { type: "fund", title: "Pram fund", categoryId: 1 };

describe("fund input schema", () => {
  it("accepts a fund and applies defaults", () => {
    expect(ItemInputSchema.parse(validFund)).toEqual({ ...validFund, note: "" });
  });

  it.each([
    ["a qty", { ...validFund, qty: 1 }, "qty"],
    ["a link", { ...validFund, link: "https://example.com" }, "link"],
    ["an empty title", { ...validFund, title: " " }, "title"],
    ["a long title", { ...validFund, title: "x".repeat(81) }, "title"],
    ["a long note", { ...validFund, note: "x".repeat(281) }, "note"],
    ["a missing category", { type: "fund", title: "Pram" }, "categoryId"],
  ])("refuses %s", (_name, input, field) => {
    expect(errorsFor(input)).toHaveProperty(field);
  });

  it("creates a fund with qty 1 and one audit row", async () => {
    const result = await createItem(context, ItemInputSchema.parse(validFund));
    if (result.kind !== "created") throw new Error("Not created");
    expect(result.item).toMatchObject({ type: "fund", qty: 1, link: null, status: "draft" });
    expect(await db.select().from(schema.auditLog)).toHaveLength(1);
  });
});

async function seedClaimedGift() {
  await db.insert(schema.items).values({
    id: 1,
    type: "gift",
    status: "published",
    categoryId: 1,
    title: "Towels",
    qty: 3,
    sort: 1,
  });
  await db.insert(schema.guests).values([
    { id: 1, name: "A", deviceTokenHash: "a", createdAt: 1 },
    { id: 2, name: "B", deviceTokenHash: "b", createdAt: 1 },
  ]);
  await db.insert(schema.claims).values([
    { itemId: 1, guestId: 1, createdAt: 1 },
    { itemId: 1, guestId: 2, createdAt: 1 },
  ]);
}

describe("item update schema", () => {
  it("refuses a type change", () => {
    const parsed = ItemUpdateSchema.safeParse({ type: "fund" });
    if (parsed.success) throw new Error("The update was accepted");
    expect(Object.keys(toFieldErrors(parsed.error))).toEqual(["type"]);
  });

  it("refuses unknown and invalid fields", () => {
    expect(ItemUpdateSchema.safeParse({ qty: 0 }).success).toBe(false);
    expect(ItemUpdateSchema.safeParse({ link: "http://example.com" }).success).toBe(false);
    expect(ItemUpdateSchema.safeParse({ colour: "blue" }).success).toBe(false);
  });
});

describe("updateItem", () => {
  it("refuses a qty below the claim count", async () => {
    await seedClaimedGift();
    const result = await updateItem(context, { id: 1, input: { qty: 1 } });
    expect(result).toEqual({
      kind: "invalid",
      errors: { qty: "2 already taken. Use 2 or more." },
    });
    expect(await db.select().from(schema.auditLog)).toHaveLength(0);
    expect((await getItem({ db, id: 1 }))?.qty).toBe(3);
  });

  it("accepts a qty equal to the claim count and audits only the change", async () => {
    await seedClaimedGift();
    const result = await updateItem(context, { id: 1, input: { qty: 2, title: "Towels" } });
    expect(result).toMatchObject({ kind: "updated", item: { qty: 2, updatedBy: actorEmail } });
    const rows = await db.select().from(schema.auditLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "item.update", entityId: 1, actorEmail });
    expect(JSON.parse(rows[0]?.diffJson ?? "")).toEqual({ qty: [3, 2] });
  });

  it("clears a link and an emoji with null", async () => {
    const created = await createItem(
      context,
      ItemInputSchema.parse({ ...validGift, link: "https://example.com/x", emoji: "🌙" }),
    );
    if (created.kind !== "created") throw new Error("Not created");
    const result = await updateItem(context, {
      id: created.item.id,
      input: { link: null, emoji: null },
    });
    expect(result).toMatchObject({ kind: "updated", item: { link: null, emoji: null } });
  });

  it("writes nothing when no field changes", async () => {
    await seedClaimedGift();
    await updateItem(context, { id: 1, input: { title: "Towels", qty: 3 } });
    expect(await db.select().from(schema.auditLog)).toHaveLength(0);
  });

  it("refuses an unknown category and an unknown item", async () => {
    await seedClaimedGift();
    expect(await updateItem(context, { id: 1, input: { categoryId: 99 } })).toEqual({
      kind: "invalid",
      errors: { categoryId: "Choose a category" },
    });
    expect(await updateItem(context, { id: 999, input: { title: "x" } })).toEqual({
      kind: "not-found",
    });
  });

  it("keeps a fund's qty fixed and refuses a link", async () => {
    const created = await createItem(context, ItemInputSchema.parse(validFund));
    if (created.kind !== "created") throw new Error("Not created");
    const result = await updateItem(context, {
      id: created.item.id,
      input: { qty: 5, link: "https://example.com" },
    });
    expect(result).toMatchObject({ kind: "invalid", errors: { qty: expect.any(String) } });
    expect(await getItem({ db, id: created.item.id })).toMatchObject({ type: "fund", qty: 1 });
  });
});

describe("duplicateItem", () => {
  it("creates a draft copy at the end of the category with one audit row", async () => {
    await seedClaimedGift();
    const result = await duplicateItem(context, { id: 1 });
    if (result.kind !== "created") throw new Error("Not created");
    expect(result.item).toMatchObject({
      title: "Towels (copy)",
      status: "draft",
      type: "gift",
      qty: 3,
      claimCount: 0,
      sort: 2,
      updatedBy: actorEmail,
    });
    const rows = await db.select().from(schema.auditLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: "item.duplicate",
      entityId: result.item.id,
      actorEmail,
    });
    expect(JSON.parse(rows[0]?.diffJson ?? "").copiedFrom).toEqual([null, 1]);
  });

  it("truncates a long title to fit 80 characters", async () => {
    const created = await createItem(
      context,
      ItemInputSchema.parse({ ...validGift, title: "x".repeat(80) }),
    );
    if (created.kind !== "created") throw new Error("Not created");
    const result = await duplicateItem(context, { id: created.item.id });
    if (result.kind !== "created") throw new Error("Not created");
    expect(result.item.title).toHaveLength(80);
    expect(result.item.title.endsWith(" (copy)")).toBe(true);
  });

  it("reports an unknown item", async () => {
    expect(await duplicateItem(context, { id: 999 })).toEqual({ kind: "not-found" });
  });
});
