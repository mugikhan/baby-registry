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
  await page.getByLabel("Search the list").fill("steriliser");
  await expect(page).toHaveURL(/\?q=steriliser$/);

  sql(
    "INSERT INTO claims (id, item_id, guest_id, note, created_at) VALUES (100, 5, 1, NULL, 1795000000000)",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));

  await expect(card).toContainText("Taken by Aunty Naledi");
  await expect(page).toHaveURL(/\?q=steriliser$/);
  await expect(page.getByLabel("Search the list")).toHaveValue("steriliser");
});

test("with no published items the page says the list is coming soon", async ({ page }) => {
  sql("UPDATE items SET status = 'draft'");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Our list is coming soon" })).toBeVisible();
  await expect(page.getByText("We’re still adding gifts. Please check back soon.")).toBeVisible();
  await expect(page.getByLabel("Search the list")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Still needed only/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
