import { execFileSync } from "node:child_process";
import { expect, request as playwrightRequest, test } from "@playwright/test";
import { ACCESS_HEADER, signAccessToken } from "./access-token";
import { signIn } from "./helpers";

// These tests add items to the one local D1 that every project shares.
// playwright.config.ts runs this file in its own project, after the others finish.
test.describe.configure({ mode: "serial" });

test.use({ extraHTTPHeaders: { [ACCESS_HEADER]: signAccessToken() } });

test.afterAll(() => {
  execFileSync(
    "pnpm",
    ["exec", "wrangler", "d1", "execute", "DB", "--local", "--file", "db/seed.sql"],
    { stdio: "ignore" },
  );
});

test("create a gift, keep it as a draft, then publish it to guests", async ({
  page,
  browser,
  baseURL,
}) => {
  const title = `Rocking chair ${Date.now()}`;

  await page.goto("/admin");
  await page.getByRole("link", { name: "New gift" }).click();
  await expect(page).toHaveURL(/\/admin\/items\/new\?type=gift/);

  const preview = page.getByRole("region", { name: "Card preview" });
  await page.getByLabel("Title").fill(title);
  await expect(preview.getByRole("heading", { name: title })).toBeVisible();
  await page.getByLabel("Note").fill("Wooden, with a footrest.");
  await expect(preview.getByText("Wooden, with a footrest.")).toBeVisible();
  await page.getByLabel("Category").selectOption("1");
  await page.getByLabel("Quantity").fill("2");
  await expect(preview.getByText("Still needed")).toBeVisible();

  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const row = page.locator("main li", { has: page.getByRole("heading", { name: title }) });
  await expect(row).toContainText("draft");

  const guest = await browser.newContext({ baseURL: baseURL ?? "" });
  const guestPage = await guest.newPage();
  await signIn(guestPage);
  await expect(guestPage.getByRole("heading", { name: "Hooded towels" })).toBeVisible();
  await expect(guestPage.getByRole("heading", { name: title })).toHaveCount(0);

  await row.getByRole("button", { name: `Publish ${title}` }).click();
  await expect(row).toContainText("published");
  await expect(row.getByRole("button", { name: `Unpublish ${title}` })).toBeVisible();

  await guestPage.reload();
  await expect(guestPage.getByRole("heading", { name: title })).toBeVisible();
  await guest.close();
});

test("the form shows field messages before it saves", async ({ page }) => {
  await page.goto("/admin/items/new?type=gift");
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.getByText("Enter a title")).toBeVisible();
  await expect(page.getByText("Choose a category")).toHaveCount(2);
  await page.getByLabel("Example link").fill("http://example.com");
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.getByText("Enter a link that starts with https://")).toBeVisible();
});

test("the API refuses an invalid body with field errors", async ({ request }) => {
  const response = await request.post("/api/admin/items", {
    data: { type: "gift", title: "", categoryId: 1, qty: 0, colour: "blue" },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(Object.keys(body.errors).sort()).toEqual(["colour", "qty", "title"]);

  const missing = await request.post("/api/admin/items", {
    data: { type: "gift", title: "Ghost", categoryId: 999, qty: 1 },
  });
  expect(missing.status()).toBe(400);
  expect((await missing.json()).errors).toHaveProperty("categoryId");

  const badStatus = await request.post("/api/admin/items/1/status", { data: { status: "gone" } });
  expect(badStatus.status()).toBe(400);
  expect((await request.get("/api/admin/items/99999")).status()).toBe(404);
  expect(
    (await request.post("/api/admin/items/99999/status", { data: { status: "draft" } })).status(),
  ).toBe(404);
});

test("the item endpoints answer 403 without a token", async ({ baseURL }) => {
  // The project's default headers apply to new contexts too, so blank the token here.
  const anonymous = await playwrightRequest.newContext({
    baseURL: baseURL ?? "",
    extraHTTPHeaders: { [ACCESS_HEADER]: "" },
  });
  const checks = [
    ["GET", "/api/admin/items"],
    ["GET", "/api/admin/items/1"],
    ["GET", "/api/admin/categories"],
    ["POST", "/api/admin/items"],
    ["POST", "/api/admin/items/1/status"],
  ] as const;
  for (const [method, path] of checks) {
    const response = await anonymous.fetch(path, { method, data: {}, maxRedirects: 0 });
    expect(response.status(), `${method} ${path}`).toBe(403);
  }
  await anonymous.dispose();
});
