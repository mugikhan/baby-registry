import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { ItemInputSchema, toFieldErrors } from "@/lib/admin-items";
import { createItem, getItem, listItems, setItemStatus } from "@/server/admin/items";

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
