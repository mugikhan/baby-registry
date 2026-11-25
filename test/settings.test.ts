import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { expect, it } from "vitest";
import * as schema from "@/db/schema";

it("sets the parents' names as the title", async () => {
  const db = drizzle(env.DB, { schema });
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.id, 1) });
  expect(row?.title).toBe("Ayesha & Mughees");
});
