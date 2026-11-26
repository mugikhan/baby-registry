import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";

const db = drizzle(env.DB, { schema });

const validItem = {
  type: "gift",
  status: "published",
  categoryId: 1,
  title: "Test item",
  qty: 1,
} satisfies typeof schema.items.$inferInsert;

describe("schema constraints", () => {
  beforeAll(async () => {
    await db.insert(schema.categories).values({ id: 1, name: "Test", emoji: "x" });
  });

  it("accepts a valid gift and a valid fund", async () => {
    await db.insert(schema.items).values([
      { ...validItem, qty: 3 },
      { ...validItem, type: "fund" },
    ]);
  });

  it.each([
    ["an unknown type", "loan", "published", 1],
    ["an unknown status", "gift", "deleted", 1],
    ["a zero quantity", "gift", "published", 0],
    ["a fund with quantity 2", "fund", "published", 2],
  ])("rejects %s", async (_name, type, status, qty) => {
    const insert = env.DB.prepare(
      "INSERT INTO items (type, status, category_id, title, qty) VALUES (?, ?, 1, 'Bad item', ?)",
    )
      .bind(type, status, qty)
      .run();
    await expect(insert).rejects.toThrow();
  });

  it("rejects a second settings row", async () => {
    const insert = db.insert(schema.settings).values({ id: 2, title: "Second" });
    await expect(insert).rejects.toThrow();
  });

  it("rejects a duplicate device token hash", async () => {
    const guest = { name: "Guest", deviceTokenHash: "same-hash", createdAt: 1 };
    await db.insert(schema.guests).values(guest);
    await expect(db.insert(schema.guests).values(guest)).rejects.toThrow();
  });
});
