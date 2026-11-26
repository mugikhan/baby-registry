PRAGMA defer_foreign_keys = on;--> statement-breakpoint
CREATE UNIQUE INDEX `guests_device_token_hash_unique` ON `guests` (`device_token_hash`);--> statement-breakpoint
CREATE TABLE `__items_backup` AS SELECT "id", "type", "status", "category_id", "title", "note", "link", "emoji", "image_key", "qty", "sort", "updated_by" FROM `items`;--> statement-breakpoint
DROP TABLE `items`;--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`category_id` integer NOT NULL,
	`title` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`link` text,
	`emoji` text,
	`image_key` text,
	`qty` integer DEFAULT 1 NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "items_type" CHECK(type IN ('gift', 'fund')),
	CONSTRAINT "items_status" CHECK(status IN ('draft', 'published', 'archived')),
	CONSTRAINT "items_qty_min" CHECK(qty >= 1),
	CONSTRAINT "items_fund_qty" CHECK(type = 'gift' OR qty = 1)
);
--> statement-breakpoint
INSERT INTO `items`("id", "type", "status", "category_id", "title", "note", "link", "emoji", "image_key", "qty", "sort", "updated_by") SELECT "id", "type", "status", "category_id", "title", "note", "link", "emoji", "image_key", "qty", "sort", "updated_by" FROM `__items_backup`;--> statement-breakpoint
DROP TABLE `__items_backup`;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`welcome` text DEFAULT '' NOT NULL,
	`cash_note` text DEFAULT '' NOT NULL,
	`pin_hmac` text,
	`pin_version` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "settings_singleton" CHECK(id = 1)
);
--> statement-breakpoint
INSERT INTO `__new_settings`("id", "title", "welcome", "cash_note", "pin_hmac", "pin_version") SELECT "id", "title", "welcome", "cash_note", "pin_hmac", "pin_version" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;