# Production changes

Read this before you change the schema or `alchemy.run.ts`.
Production uses the stage `prod`. The database is `baby-registry-db-prod`.

Run the Wrangler commands with the Cloudflare account that owns production.

## Migrations go forward only

- Never edit, rename or delete a migration that exists on `main`.
- Fix a bad migration with a new migration.
- CI enforces this. `pnpm check:migrations` fails on a pull request that modifies, deletes or renames an existing `drizzle/*.sql` file.
- Run it locally with `pnpm check:migrations origin/main`.
- To change the schema, edit `src/db/schema.ts`, then run `pnpm db:generate`.

## Expand, then contract

Alchemy applies migrations before it uploads the new Worker.
For a short time, the old Worker runs on the new schema.
Every migration must work with the old code.

Split a breaking change into separate deploys:

1. Expand. Add the new column, table or index. Keep the old ones. Deploy.
2. Move. Ship code that writes and reads the new shape. Copy old data in a migration if needed. Deploy.
3. Contract. Remove the old column or table in a later migration. Deploy after no code reads it.

Examples:

- To rename a column, add the new column, copy the data, switch the code, then drop the old column.
- To add a `NOT NULL` column, give it a `DEFAULT`.

## Rebuild a table

SQLite cannot add a CHECK or change a column on an existing table.
Rebuild the table in one migration. Migration `0005` is the working example.

Rules:

- Start the file with `PRAGMA defer_foreign_keys = on;`. This allows foreign key violations until the end of the transaction.
- Never write `PRAGMA foreign_keys = OFF`. D1 always enforces foreign keys and ignores it. CI fails on any `PRAGMA foreign_keys`.
- Never write `PRAGMA defer_foreign_keys = off`. It discards the pending violations.
- Write CHECK expressions with bare column names, such as `CHECK(qty >= 1)`. A name qualified with a temporary table breaks the rename.
- Copy every column and every row. Keep the ids so other tables still match.

When other tables point at the table, use this order:

```sql
PRAGMA defer_foreign_keys = on;
CREATE TABLE `__items_backup` AS SELECT ... FROM `items`;
DROP TABLE `items`;
CREATE TABLE `items` (...);
INSERT INTO `items`(...) SELECT ... FROM `__items_backup`;
DROP TABLE `__items_backup`;
```

Do not use the order that `drizzle-kit` generates (create `__new_items`, copy, drop `items`, rename).
The drop leaves pending violations for the child rows.
Renaming `__new_items` does not clear them, so the commit fails.
Inserting rows into the final table name clears them.

A table that no other table points at can use the generated order.

After you edit the generated file, check that `pnpm db:generate` reports no changes.

Test a rebuild on real data before you merge:

```sh
pnpm db:migrate:local
pnpm db:seed:local
```

Then add your migration, run `pnpm db:migrate:local` again, and compare row counts.
The PR preview also applies the migration on top of seeded data.
Check the preview before you merge.

```sh
npx wrangler d1 execute DB --local --command "PRAGMA foreign_key_check"
```

An empty result means no violations.

## Risky deploys and Time Travel

Alchemy sends each migration file as one request, together with its `d1_migrations` row.
D1 over HTTP has no explicit transaction.
A failed migration can leave some changes applied.

D1 Time Travel restores a database to any minute in the last 7 days on the free plan.

Before a risky deploy, note a bookmark:

```sh
npx wrangler d1 time-travel info baby-registry-db-prod
```

Save the bookmark ID from the output.

Restore after a failed migration:

```sh
npx wrangler d1 time-travel restore baby-registry-db-prod --bookmark=<bookmark-id>
```

You can restore to a time instead. Use a Unix timestamp in seconds, or an RFC 3339 time:

```sh
npx wrangler d1 time-travel restore baby-registry-db-prod --timestamp=<unix-seconds>
```

A restore rewinds the data and the `d1_migrations` table. The failed file is no longer marked as applied.

After the restore:

1. Find the cause of the failure. Reproduce it with `pnpm db:migrate:local` on seeded data.
2. Fix forward. Write a new migration with the next number. It must work on the restored data.
3. If the restore left the failed file unapplied, Alchemy runs that file again on the next deploy. Do not merge until that file can succeed.
4. A file that production never applied may need an edit. CI blocks the edit. The owner then merges with an explicit override and says so in the pull request.

A restore also removes writes that guests made after the bookmark.

## Alchemy props that replace or refuse

Never rename a resource. A new name creates an empty one.

| Resource    | Prop                  | Effect                                                          |
| ----------- | --------------------- | --------------------------------------------------------------- |
| D1 database | `name`                | Replaces the database. The new one is empty.                    |
| D1 database | `primaryLocationHint` | Refuses. Alchemy throws, because D1 cannot move after creation. |
| D1 database | `jurisdiction`        | Refuses, for the same reason.                                   |
| R2 bucket   | `name`                | Replaces the bucket. The new one is empty.                      |
| Worker      | `name`                | Renames the Worker. The `workers.dev` URL changes.              |

`alchemy.run.ts` sets `adopt: true` on the D1 database, the R2 bucket and the Worker.
If Alchemy loses its state, the next deploy takes over the existing resources.
Without `adopt`, the deploy fails because the names exist.

Keep the stage names as they are: `prod` and `pr-<number>`.

## Guests are anonymised, not deleted

Claims and cash gifts point at guests with a foreign key.
To remove a guest in slice 15, anonymise the row in place.
Clear the name and the email, and replace the device token hash with a random value.
Never run `DELETE FROM guests`. It breaks the claims.

## Cloudflare Access for the admin

- Access lives outside Alchemy, because Alchemy 0.93 has no Access resource.
- The app "Baby Registry admin" protects `/admin` and `/api/admin` on production's `workers.dev` hostname. Guest paths stay open.
- To add or remove an organiser:
  1. In the Cloudflare dashboard, go to Zero Trust → Access → Applications → Baby Registry admin → Policies → Organisers.
  2. Edit the email list.
  3. Update the `ORGANISER_EMAILS` GitHub secret (comma-separated) to match, then redeploy. The Worker checks the same list.
- Never delete the app. A new app gets a new AUD tag, and every admin request then fails the Worker's check until the AUD config changes too.
- Previews have no Access app and no admin config. The Worker answers every admin path there with 403.
- Alchemy binds the issuer, AUD and admin host as plain values for `prod`. `ORGANISER_EMAILS` is a secret binding. Production never sets `ACCESS_JWKS`.
