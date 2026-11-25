-- Demo data for local D1 and PR previews. Never run against production.
DELETE FROM cash_gifts;
DELETE FROM claims;
DELETE FROM guests;
DELETE FROM items;
DELETE FROM categories;

INSERT INTO categories (id, name, emoji, sort) VALUES
  (1, 'Sleep', '🛏️', 1),
  (2, 'Bath', '🛁', 2),
  (3, 'Feeding', '🍼', 3),
  (4, 'Out & about', '🚗', 4);

INSERT INTO items (id, type, status, category_id, title, note, link, emoji, qty, sort) VALUES
  (1, 'gift', 'published', 2, 'Hooded towels', 'Soft cotton, any pale colour.', NULL, NULL, 3, 1),
  (2, 'fund', 'published', 4, 'Pram fund', 'Towards a pram that folds small enough for a Polo boot.', NULL, '💰', 1, 1),
  (3, 'gift', 'published', 1, 'Night light', 'A warm, dim one with an auto-off timer.', NULL, '🌙', 1, 1),
  (4, 'gift', 'published', 1, 'Swaddle blankets', 'Breathable muslin, 100 cm square or bigger.', 'https://example.com/swaddle-blankets', '🧣', 4, 2),
  (5, 'gift', 'published', 3, 'Bottle steriliser', 'Electric, fits at least four bottles.', 'https://example.com/bottle-steriliser', '🍼', 1, 1),
  (6, 'gift', 'published', 3, 'Muslin cloths', 'A pack of six is plenty.', NULL, '🧺', 2, 2),
  (7, 'gift', 'published', 1, 'Travel cot', 'Light enough to carry up the stairs.', NULL, '🧸', 2, 3),
  (8, 'gift', 'published', 2, 'Baby bath tub', 'With a newborn insert, if you can find one.', NULL, '🛁', 1, 2),
  (9, 'gift', 'published', 4, 'Car window shades', 'Two, with suction cups.', NULL, NULL, 1, 2),
  (10, 'gift', 'draft', 1, 'Baby monitor', 'Draft item, hidden from guests.', NULL, '📹', 1, 4),
  (11, 'gift', 'archived', 3, 'High chair', 'Archived item, hidden from guests.', NULL, '🪑', 1, 3);

INSERT INTO guests (id, name, email, device_token_hash, created_at) VALUES
  (1, 'Aunty Naledi', 'naledi@example.com', 'seed-token-1', CAST(strftime('%s', '2026-11-01') AS INTEGER) * 1000),
  (2, 'Gran', NULL, 'seed-token-2', CAST(strftime('%s', '2026-11-01') AS INTEGER) * 1000),
  (3, 'Uncle Sipho', 'sipho@example.com', 'seed-token-3', CAST(strftime('%s', '2026-11-01') AS INTEGER) * 1000),
  (4, 'Aunty Zinhle', NULL, 'seed-token-4', CAST(strftime('%s', '2026-11-01') AS INTEGER) * 1000),
  (5, 'Cousin Thandi', 'thandi@example.com', 'seed-token-5', CAST(strftime('%s', '2026-11-01') AS INTEGER) * 1000);

INSERT INTO claims (id, item_id, guest_id, note, created_at) VALUES
  (1, 1, 1, NULL, CAST(strftime('%s', '2026-11-12 10:00:00') AS INTEGER) * 1000),
  (2, 3, 2, NULL, CAST(strftime('%s', '2026-11-25 09:00:00') AS INTEGER) * 1000),
  (3, 7, 3, NULL, CAST(strftime('%s', '2026-11-18 14:00:00') AS INTEGER) * 1000),
  (4, 7, 4, NULL, CAST(strftime('%s', '2026-11-20 16:00:00') AS INTEGER) * 1000);

INSERT INTO cash_gifts (id, item_id, guest_id, note, created_at) VALUES
  (1, 2, 2, NULL, CAST(strftime('%s', '2026-11-15 12:00:00') AS INTEGER) * 1000),
  (2, 2, 3, NULL, CAST(strftime('%s', '2026-11-16 12:00:00') AS INTEGER) * 1000),
  (3, 2, 5, NULL, CAST(strftime('%s', '2026-11-17 12:00:00') AS INTEGER) * 1000);
