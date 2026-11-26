import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const settings = sqliteTable(
  "settings",
  {
    id: integer("id").primaryKey(),
    title: text("title").notNull(),
    welcome: text("welcome").notNull().default(""),
    cashNote: text("cash_note").notNull().default(""),
    pinHmac: text("pin_hmac"),
    pinVersion: integer("pin_version").notNull().default(1),
  },
  () => [check("settings_singleton", sql`id = 1`)],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull(),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type", { enum: ["gift", "fund"] }).notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    title: text("title").notNull(),
    note: text("note").notNull().default(""),
    link: text("link"),
    emoji: text("emoji"),
    imageKey: text("image_key"),
    qty: integer("qty").notNull().default(1),
    sort: integer("sort").notNull().default(0),
    updatedBy: text("updated_by"),
  },
  () => [
    // Bare column names: a table-qualified CHECK breaks when 0005 renames __new_items.
    check("items_type", sql`type IN ('gift', 'fund')`),
    check("items_status", sql`status IN ('draft', 'published', 'archived')`),
    check("items_qty_min", sql`qty >= 1`),
    check("items_fund_qty", sql`type = 'gift' OR qty = 1`),
  ],
);

export const guests = sqliteTable(
  "guests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    email: text("email"),
    deviceTokenHash: text("device_token_hash").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("guests_device_token_hash_unique").on(table.deviceTokenHash)],
);

export const claims = sqliteTable(
  "claims",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    guestId: integer("guest_id")
      .notNull()
      .references(() => guests.id),
    note: text("note"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [unique().on(table.itemId, table.guestId)],
);

export const cashGifts = sqliteTable(
  "cash_gifts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    guestId: integer("guest_id")
      .notNull()
      .references(() => guests.id),
    note: text("note"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [unique().on(table.itemId, table.guestId)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    entity: text("entity", { enum: ["item", "category"] }).notNull(),
    entityId: integer("entity_id").notNull(),
    diffJson: text("diff_json").notNull(),
    at: integer("at").notNull(),
  },
  (table) => [index("audit_log_at_idx").on(table.at)],
);
