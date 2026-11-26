import { asc, count, eq, max, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { z } from "zod";
import * as schema from "@/db/schema";
import type { GuestList, GuestListItem } from "@/lib/guest-list";

const { categories, cashGifts, claims, guests, items } = schema;

export type GuestListRows = Omit<GuestList, "title">;

const NamesSchema = z.array(z.string());

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDay(epochMs: number): string {
  const date = new Date(epochMs);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** Reads the published list as a guest sees it. Never selects emails, guest ids or giver names. */
export async function getGuestList({
  db,
}: {
  db: DrizzleD1Database<typeof schema>;
}): Promise<GuestListRows> {
  const claimRows = db
    .select({
      itemId: claims.itemId,
      name: guests.name,
      createdAt: claims.createdAt,
    })
    .from(claims)
    .innerJoin(guests, eq(guests.id, claims.guestId))
    .orderBy(asc(claims.createdAt), asc(claims.id))
    .as("claim_rows");

  const claimTotals = db
    .select({
      itemId: claimRows.itemId,
      taken: count().as("taken"),
      names: sql<string>`json_group_array(${claimRows.name})`.as("names"),
      lastAt: max(claimRows.createdAt).as("last_at"),
    })
    .from(claimRows)
    .groupBy(claimRows.itemId)
    .as("claim_totals");

  const giverTotals = db
    .select({ itemId: cashGifts.itemId, givers: count().as("givers") })
    .from(cashGifts)
    .groupBy(cashGifts.itemId)
    .as("giver_totals");

  const takenCount = sql<number>`coalesce(${claimTotals.taken}, 0)`;
  const isFullyTaken = sql`(${items.type} = 'gift' and ${takenCount} >= ${items.qty})`;

  const [categoryRows, itemRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, emoji: categories.emoji })
      .from(categories)
      .orderBy(asc(categories.sort), asc(categories.id)),
    db
      .select({
        id: items.id,
        type: items.type,
        title: items.title,
        note: items.note,
        categoryId: items.categoryId,
        emoji: items.emoji,
        link: items.link,
        qty: items.qty,
        taken: takenCount,
        names: claimTotals.names,
        lastAt: claimTotals.lastAt,
        givers: sql<number>`coalesce(${giverTotals.givers}, 0)`,
      })
      .from(items)
      .innerJoin(categories, eq(categories.id, items.categoryId))
      .leftJoin(claimTotals, eq(claimTotals.itemId, items.id))
      .leftJoin(giverTotals, eq(giverTotals.itemId, items.id))
      .where(eq(items.status, "published"))
      .orderBy(sql`${isFullyTaken} asc`, asc(categories.sort), asc(items.sort), asc(items.id)),
  ]);

  return {
    categories: categoryRows,
    items: itemRows.map((row): GuestListItem => {
      const base = {
        id: row.id,
        title: row.title,
        note: row.note,
        categoryId: row.categoryId,
        emoji: row.emoji,
        link: row.link,
      };
      if (row.type === "fund") return { ...base, kind: "fund", givers: row.givers };
      return {
        ...base,
        kind: "gift",
        qty: row.qty,
        taken: row.taken,
        takenBy: NamesSchema.parse(JSON.parse(row.names ?? "[]")),
        takenOn: row.lastAt === null ? null : formatDay(row.lastAt),
      };
    }),
  };
}
