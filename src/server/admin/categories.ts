import { asc, count, eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { isSameIdSet } from "@/lib/admin-order";
import type { AdminCategory, CategoryInput, CategoryUpdate, FieldErrors } from "@/lib/admin-items";
import type { AdminContext } from "./items";

const { auditLog, categories, items } = schema;

type Diff = Record<string, [unknown, unknown]>;
type ReadContext = Pick<AdminContext, "db">;

export type CategoryResult = { kind: "saved"; category: AdminCategory } | { kind: "not-found" };

export type CategoryOrderResult = { kind: "reordered" } | { kind: "invalid"; errors: FieldErrors };

export type CategoryDeleteResult =
  | { kind: "deleted" }
  | { kind: "has-items"; itemCount: number }
  | { kind: "not-found" };

const itemCounts = (db: AdminContext["db"]) =>
  db
    .select({ categoryId: items.categoryId, total: count().as("total") })
    .from(items)
    .groupBy(items.categoryId)
    .as("item_counts");

function selectCategories(db: AdminContext["db"]) {
  const counts = itemCounts(db);
  return db
    .select({
      id: categories.id,
      name: categories.name,
      emoji: categories.emoji,
      itemCount: sql<number>`coalesce(${counts.total}, 0)`,
    })
    .from(categories)
    .leftJoin(counts, eq(counts.categoryId, categories.id));
}

export async function listCategories({ db }: ReadContext): Promise<AdminCategory[]> {
  return selectCategories(db).orderBy(asc(categories.sort), asc(categories.id));
}

async function getCategory(db: AdminContext["db"], id: number) {
  const [row] = await selectCategories(db).where(eq(categories.id, id));
  return row;
}

export async function createCategory(
  { db, actorEmail, nowMs }: AdminContext,
  input: CategoryInput,
): Promise<AdminCategory> {
  const nextSort = sql<number>`(select coalesce(max(sort), 0) + 1 from categories)`;
  const diff: Diff = {
    name: [null, input.name],
    emoji: [null, input.emoji],
  };
  const [inserted] = await db.batch([
    db
      .insert(categories)
      .values({ name: input.name, emoji: input.emoji, sort: nextSort })
      .returning({ id: categories.id }),
    db.insert(auditLog).values({
      actorEmail,
      action: "category.create",
      entity: "category",
      entityId: sql`last_insert_rowid()`,
      diffJson: JSON.stringify(diff),
      at: nowMs,
    }),
  ]);
  const id = inserted[0]?.id;
  const category = id === undefined ? undefined : await getCategory(db, id);
  if (!category) throw new Error("The new category was not found after the insert");
  return category;
}

export async function updateCategory(
  { db, actorEmail, nowMs }: AdminContext,
  { id, input }: { id: number; input: CategoryUpdate },
): Promise<CategoryResult> {
  const current = await getCategory(db, id);
  if (!current) return { kind: "not-found" };

  const changes: CategoryUpdate = {};
  const diff: Diff = {};
  for (const field of ["name", "emoji"] as const) {
    const next = input[field];
    if (next === undefined || next === current[field]) continue;
    changes[field] = next;
    diff[field] = [current[field], next];
  }
  if (Object.keys(diff).length === 0) return { kind: "saved", category: current };

  await db.batch([
    db.update(categories).set(changes).where(eq(categories.id, id)),
    db.insert(auditLog).values({
      actorEmail,
      action: "category.update",
      entity: "category",
      entityId: id,
      diffJson: JSON.stringify(diff),
      at: nowMs,
    }),
  ]);
  return { kind: "saved", category: { ...current, ...changes } };
}

export async function reorderCategories(
  { db, actorEmail, nowMs }: AdminContext,
  { categoryIds }: { categoryIds: number[] },
): Promise<CategoryOrderResult> {
  const current = await db
    .select({ id: categories.id, sort: categories.sort })
    .from(categories)
    .orderBy(asc(categories.sort), asc(categories.id));
  const before = current.map((row) => row.id);
  if (!isSameIdSet(before, categoryIds)) {
    return {
      kind: "invalid",
      errors: { categoryIds: "Send every category once. Reload and try again." },
    };
  }
  const clean = current.every((row, index) => row.sort === index + 1);
  if (clean && before.every((id, index) => id === categoryIds[index])) {
    return { kind: "reordered" };
  }

  const diff: Diff = { order: [before, categoryIds] };
  await db.batch([
    db.insert(auditLog).values({
      actorEmail,
      action: "category.reorder",
      entity: "category",
      entityId: 0,
      diffJson: JSON.stringify(diff),
      at: nowMs,
    }),
    ...categoryIds.map((id, index) =>
      db
        .update(categories)
        .set({ sort: index + 1 })
        .where(eq(categories.id, id)),
    ),
  ]);
  return { kind: "reordered" };
}

export async function deleteCategory(
  { db, actorEmail, nowMs }: AdminContext,
  { id }: { id: number },
): Promise<CategoryDeleteResult> {
  const current = await getCategory(db, id);
  if (!current) return { kind: "not-found" };
  if (current.itemCount > 0) return { kind: "has-items", itemCount: current.itemCount };

  const diff: Diff = { name: [current.name, null], emoji: [current.emoji, null] };
  await db.batch([
    db.delete(categories).where(eq(categories.id, id)),
    db.insert(auditLog).values({
      actorEmail,
      action: "category.delete",
      entity: "category",
      entityId: id,
      diffJson: JSON.stringify(diff),
      at: nowMs,
    }),
  ]);
  return { kind: "deleted" };
}
