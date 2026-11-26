import { asc, count, eq, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import type {
  AdminCategory,
  AdminItem,
  FieldErrors,
  ItemInput,
  ItemStatus,
} from "@/lib/admin-items";

const { auditLog, categories, claims, items } = schema;

export interface AdminContext {
  db: DrizzleD1Database<typeof schema>;
  actorEmail: string;
  nowMs: number;
}

type ReadContext = Pick<AdminContext, "db">;

export type CreateResult =
  | { kind: "created"; item: AdminItem }
  | { kind: "invalid"; errors: FieldErrors };

export type StatusResult = { kind: "updated"; item: AdminItem } | { kind: "not-found" };

type Diff = Record<string, [unknown, unknown]>;

const claimCounts = (db: AdminContext["db"]) =>
  db
    .select({ itemId: claims.itemId, total: count().as("total") })
    .from(claims)
    .groupBy(claims.itemId)
    .as("claim_counts");

function selectItems(db: AdminContext["db"]) {
  const counts = claimCounts(db);
  return db
    .select({
      id: items.id,
      type: items.type,
      status: items.status,
      categoryId: items.categoryId,
      categoryName: categories.name,
      categoryEmoji: categories.emoji,
      title: items.title,
      note: items.note,
      link: items.link,
      emoji: items.emoji,
      qty: items.qty,
      sort: items.sort,
      updatedBy: items.updatedBy,
      claimCount: sql<number>`coalesce(${counts.total}, 0)`,
    })
    .from(items)
    .innerJoin(categories, eq(categories.id, items.categoryId))
    .leftJoin(counts, eq(counts.itemId, items.id));
}

export async function listItems({ db }: ReadContext): Promise<AdminItem[]> {
  return selectItems(db).orderBy(asc(categories.sort), asc(items.sort), asc(items.id));
}

export async function getItem({
  db,
  id,
}: ReadContext & { id: number }): Promise<AdminItem | undefined> {
  const [row] = await selectItems(db).where(eq(items.id, id));
  return row;
}

export async function listCategories({ db }: ReadContext): Promise<AdminCategory[]> {
  return db
    .select({ id: categories.id, name: categories.name, emoji: categories.emoji })
    .from(categories)
    .orderBy(asc(categories.sort), asc(categories.id));
}

export async function createItem(
  { db, actorEmail, nowMs }: AdminContext,
  input: ItemInput,
): Promise<CreateResult> {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, input.categoryId));
  if (!category) return { kind: "invalid", errors: { categoryId: "Choose a category" } };

  const values = {
    type: input.type,
    status: "draft",
    categoryId: input.categoryId,
    title: input.title,
    note: input.note,
    link: input.link ?? null,
    emoji: input.emoji ?? null,
    qty: input.qty,
  } satisfies Omit<typeof items.$inferInsert, "sort" | "updatedBy">;

  const diff: Diff = Object.fromEntries(
    Object.entries(values).map(([field, value]) => [field, [null, value]]),
  );
  const nextSort = sql<number>`(select coalesce(max(sort), 0) + 1 from items where category_id = ${input.categoryId})`;

  const [inserted] = await db.batch([
    db
      .insert(items)
      .values({ ...values, sort: nextSort, updatedBy: actorEmail })
      .returning({ id: items.id }),
    db.insert(auditLog).values({
      actorEmail,
      action: "item.create",
      entity: "item",
      entityId: sql`last_insert_rowid()`,
      diffJson: JSON.stringify(diff),
      at: nowMs,
    }),
  ]);
  const id = inserted[0]?.id;
  const item = id === undefined ? undefined : await getItem({ db, id });
  if (!item) throw new Error("The new item was not found after the insert");
  return { kind: "created", item };
}

export async function setItemStatus(
  { db, actorEmail, nowMs }: AdminContext,
  { id, status }: { id: number; status: ItemStatus },
): Promise<StatusResult> {
  const current = await getItem({ db, id });
  if (!current) return { kind: "not-found" };
  if (current.status === status) return { kind: "updated", item: current };

  const diff: Diff = { status: [current.status, status] };
  await db.batch([
    db.update(items).set({ status, updatedBy: actorEmail }).where(eq(items.id, id)),
    db.insert(auditLog).values({
      actorEmail,
      action: "item.status",
      entity: "item",
      entityId: id,
      diffJson: JSON.stringify(diff),
      at: nowMs,
    }),
  ]);
  return { kind: "updated", item: { ...current, status, updatedBy: actorEmail } };
}
