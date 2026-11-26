import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// These tests change the one local D1 that every project shares.
// playwright.config.ts runs this file in one project only, after the others finish.
test.describe.configure({ mode: "serial" });

function sql(command: string) {
  execFileSync(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", "DB", "--local", "--command", command],
    {
      stdio: "ignore",
    },
  );
}

function reseed() {
  execFileSync(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", "DB", "--local", "--file", "db/seed.sql"],
    {
      stdio: "ignore",
    },
  );
}

test.afterEach(reseed);

test("a claim made while the page is open shows after the window regains focus", async ({
  page,
}) => {
  await signIn(page);
  await page.waitForLoadState("networkidle");
  const card = page.locator("main ul > li", {
    has: page.getByRole("heading", { name: "Bottle steriliser" }),
  });
  await expect(card).toContainText("Still needed");
  await page.getByRole("link", { name: /^Feeding/ }).click();
  await expect(page).toHaveURL(/\?category=3$/);
  await expect(page.getByRole("link", { name: /^Feeding, 2 needed$/ })).toBeVisible();

  sql(
    "INSERT INTO claims (id, item_id, guest_id, note, created_at) VALUES (100, 5, 1, NULL, 1795000000000)",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect(card).toContainText("Taken by Aunty Naledi");
  await expect(page).toHaveURL(/\?category=3$/);
  await expect(page.getByRole("link", { name: /^Feeding, 1 needed$/ })).toBeVisible();
  await expect(page.getByText("Loading the list")).toHaveCount(0);
});

test("a category with every gift taken shows the empty state under still needed", async ({
  page,
}) => {
  sql(
    "INSERT INTO claims (id, item_id, guest_id, note, created_at) VALUES (101, 5, 1, NULL, 1795000000000), (102, 6, 1, NULL, 1795000000000), (103, 6, 2, NULL, 1795000000000)",
  );
  await signIn(page, "/?category=3&needed=true");
  await expect(page.getByRole("heading", { name: "Nothing here right now" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Feeding, all taken$/ })).toBeVisible();
  await page.getByRole("link", { name: "Show everything" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("main ul > li").first()).toBeVisible();
});

test("with no published items the page says the list is coming soon", async ({ page }) => {
  sql("UPDATE items SET status = 'draft'");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Our list is coming soon" })).toBeVisible();
  await expect(page.getByText("We’re still adding gifts. Please check back soon.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Category" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Still needed only/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
