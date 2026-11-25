import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { getGuestList } from "@/server/guest-list";

const db = drizzle(env.DB, { schema });

const DAY = Date.UTC(2026, 10, 12);

async function reset() {
  await db.delete(schema.cashGifts);
  await db.delete(schema.claims);
  await db.delete(schema.guests);
  await db.delete(schema.items);
  await db.delete(schema.categories);
}

async function addCategory({ id, sort }: { id: number; sort: number }) {
  await db.insert(schema.categories).values({ id, name: `Category ${id}`, emoji: "📦", sort });
}

async function addItem(values: Partial<typeof schema.items.$inferInsert> & { id: number }) {
  await db.insert(schema.items).values({
    type: "gift",
    status: "published",
    categoryId: 1,
    title: `Item ${values.id}`,
    ...values,
  });
}

async function addGuest({ id, name }: { id: number; name: string }) {
  await db.insert(schema.guests).values({
    id,
    name,
    email: `${name.toLowerCase()}@private.example`,
    deviceTokenHash: `hash-${id}`,
    createdAt: DAY,
  });
}

beforeEach(async () => {
  await reset();
  await addCategory({ id: 1, sort: 2 });
  await addCategory({ id: 2, sort: 1 });
});

describe("getGuestList", () => {
  it("returns published items only", async () => {
    await addItem({ id: 1, status: "published" });
    await addItem({ id: 2, status: "draft" });
    await addItem({ id: 3, status: "archived" });
    const { items } = await getGuestList({ db });
    expect(items.map((item) => item.id)).toEqual([1]);
  });

  it("derives taken and takenBy from claims in claim order", async () => {
    await addItem({ id: 1, qty: 3 });
    await addGuest({ id: 1, name: "Ann" });
    await addGuest({ id: 2, name: "Bob" });
    await db.insert(schema.claims).values([
      { itemId: 1, guestId: 2, createdAt: DAY + 2 * 86_400_000 },
      { itemId: 1, guestId: 1, createdAt: DAY + 86_400_000 },
    ]);
    const { items } = await getGuestList({ db });
    expect(items).toEqual([
      expect.objectContaining({
        kind: "gift",
        qty: 3,
        taken: 2,
        takenBy: ["Ann", "Bob"],
        takenOn: "14 Nov",
      }),
    ]);
  });

  it("reports an unclaimed gift as untaken", async () => {
    await addItem({ id: 1, qty: 2 });
    const { items } = await getGuestList({ db });
    expect(items).toEqual([
      expect.objectContaining({ kind: "gift", taken: 0, takenBy: [], takenOn: null }),
    ]);
  });

  it("counts fund givers and exposes no names", async () => {
    await addItem({ id: 1, type: "fund" });
    await addGuest({ id: 1, name: "Ann" });
    await addGuest({ id: 2, name: "Bob" });
    await db.insert(schema.cashGifts).values([
      { itemId: 1, guestId: 1, createdAt: DAY },
      { itemId: 1, guestId: 2, createdAt: DAY },
    ]);
    const { items } = await getGuestList({ db });
    expect(items).toEqual([expect.objectContaining({ kind: "fund", givers: 2 })]);
    expect(JSON.stringify(items)).not.toMatch(/Ann|Bob/);
  });

  it("orders open items first, then taken, then by category, item sort and id", async () => {
    await addGuest({ id: 1, name: "Ann" });
    await addItem({ id: 1, categoryId: 2, sort: 1 }); // taken
    await db.insert(schema.claims).values({ itemId: 1, guestId: 1, createdAt: DAY });
    await addItem({ id: 2, categoryId: 1, sort: 1 });
    await addItem({ id: 3, categoryId: 2, sort: 2 });
    await addItem({ id: 4, categoryId: 2, sort: 1 });
    await addItem({ id: 5, categoryId: 2, sort: 1, type: "fund" });
    const { items } = await getGuestList({ db });
    expect(items.map((item) => item.id)).toEqual([4, 5, 3, 2, 1]);
  });

  it("orders categories by sort", async () => {
    const { categories } = await getGuestList({ db });
    expect(categories.map((category) => category.id)).toEqual([2, 1]);
  });

  describe("filters", () => {
    beforeEach(async () => {
      await addItem({ id: 1, categoryId: 1, title: "Travel Cot", note: "Light to carry" });
      await addItem({ id: 2, categoryId: 2, title: "Night light", note: "Warm and dim" });
      await addItem({ id: 3, categoryId: 2, title: "Bath tub", note: "With a newborn insert" });
      await addItem({ id: 4, categoryId: 2, type: "fund", title: "Pram fund", note: "" });
    });

    const ids = async (filters: Parameters<typeof getGuestList>[0]["filters"]) =>
      (await getGuestList({ db, filters })).items.map((item) => item.id).sort((a, b) => a - b);

    it("filters by category and keeps every category in the result", async () => {
      expect(await ids({ category: 1 })).toEqual([1]);
      const { categories } = await getGuestList({ db, filters: { category: 1 } });
      expect(categories).toHaveLength(2);
    });

    it("matches nothing for an unknown category", async () => {
      expect(await ids({ category: 99 })).toEqual([]);
    });

    it("searches the title and the note, ignoring case", async () => {
      expect(await ids({ q: "COT" })).toEqual([1]);
      expect(await ids({ q: "newborn" })).toEqual([3]);
      expect(await ids({ q: "light" })).toEqual([1, 2]);
    });

    it("treats search text as plain text", async () => {
      expect(await ids({ q: "%" })).toEqual([]);
      expect(await ids({ q: "_" })).toEqual([]);
    });

    it("hides fully taken gifts but keeps partly taken gifts and funds", async () => {
      await addGuest({ id: 1, name: "Ann" });
      await addItem({ id: 5, categoryId: 1, qty: 2, title: "Cot sheets" });
      await db.insert(schema.claims).values([
        { itemId: 1, guestId: 1, createdAt: DAY },
        { itemId: 5, guestId: 1, createdAt: DAY },
      ]);
      expect(await ids({ needed: true })).toEqual([2, 3, 4, 5]);
      expect(await ids({})).toEqual([1, 2, 3, 4, 5]);
    });

    it("combines the filters", async () => {
      await addGuest({ id: 1, name: "Ann" });
      await db.insert(schema.claims).values({ itemId: 2, guestId: 1, createdAt: DAY });
      expect(await ids({ category: 2, q: "light", needed: true })).toEqual([]);
      expect(await ids({ category: 2, q: "light" })).toEqual([2]);
      expect(await ids({ category: 2, needed: true })).toEqual([3, 4]);
    });

    it("keeps the order when filtering", async () => {
      const { items } = await getGuestList({ db, filters: { category: 2 } });
      expect(items.map((item) => item.id)).toEqual([2, 3, 4]);
    });
  });

  it("leaks no email or guest id", async () => {
    await addItem({ id: 1 });
    await addItem({ id: 2, type: "fund" });
    await addGuest({ id: 7, name: "Ann" });
    await db.insert(schema.claims).values({ itemId: 1, guestId: 7, createdAt: DAY });
    await db.insert(schema.cashGifts).values({ itemId: 2, guestId: 7, createdAt: DAY });
    const result = await getGuestList({ db });
    const json = JSON.stringify(result);
    expect(json).not.toContain("private.example");
    expect(json).not.toMatch(/guestId|email|deviceToken/i);
    for (const item of result.items) expect(Object.keys(item)).not.toContain("guestId");
  });
});
