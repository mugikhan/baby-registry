CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`welcome` text DEFAULT '' NOT NULL,
	`cash_note` text DEFAULT '' NOT NULL,
	`pin_hmac` text,
	`pin_version` integer DEFAULT 1 NOT NULL
);
