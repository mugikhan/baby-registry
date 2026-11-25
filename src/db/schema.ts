import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  welcome: text("welcome").notNull().default(""),
  cashNote: text("cash_note").notNull().default(""),
  pinHmac: text("pin_hmac"),
  pinVersion: integer("pin_version").notNull().default(1),
});
