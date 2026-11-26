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
    ["PATCH", "/api/admin/items/1"],
    ["POST", "/api/admin/items/1/duplicate"],
    ["DELETE", "/api/admin/items/1"],
    ["PUT", "/api/admin/categories/1/order"],
    ["POST", "/api/admin/categories"],
    ["PATCH", "/api/admin/categories/1"],
    ["PUT", "/api/admin/categories/order"],
    ["DELETE", "/api/admin/categories/1"],
  ] as const;
  for (const [method, path] of checks) {
    const response = await anonymous.fetch(path, { method, data: {}, maxRedirects: 0 });
    expect(response.status(), `${method} ${path}`).toBe(403);
  }
  await anonymous.dispose();
});

test("create and publish a fund, then see it on the guest list", async ({
  page,
  browser,
  baseURL,
}) => {
  const title = `Cot fund ${Date.now()}`;

  await page.goto("/admin");
  await page.getByRole("link", { name: "New fund" }).click();
  await expect(page).toHaveURL(/\/admin\/items\/new\?type=fund/);
  await expect(page.getByLabel("Quantity")).toHaveCount(0);
  await expect(page.getByLabel("Example link")).toHaveCount(0);

  const preview = page.getByRole("region", { name: "Card preview" });
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Category").selectOption("1");
  await expect(preview.getByText("0 people are giving")).toBeVisible();
  await expect(preview.getByRole("button", { name: "Give cash" })).toBeVisible();

  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const row = page.locator("main li", { has: page.getByRole("heading", { name: title }) });
  await expect(row).toContainText("fund");
  await row.getByRole("button", { name: `Publish ${title}` }).click();
  await expect(row).toContainText("published");

  const guest = await browser.newContext({ baseURL: baseURL ?? "" });
  const guestPage = await guest.newPage();
  await signIn(guestPage);
  const card = guestPage.locator("article", {
    has: guestPage.getByRole("heading", { name: title }),
  });
  await expect(card.getByText("0 people are giving")).toBeVisible();
  await expect(card.getByRole("button", { name: "Give cash" })).toBeVisible();
  await guest.close();
});

test("edit a gift's note and see it on the guest list", async ({ page, browser, baseURL }) => {
  const note = `Updated note ${Date.now()}`;
  await page.goto("/admin");
  await page.getByRole("link", { name: "Edit Hooded towels" }).click();
  await expect(page).toHaveURL(/\/admin\/items\/\d+$/);
  await expect(page.getByLabel("Title")).toHaveValue("Hooded towels");

  const preview = page.getByRole("region", { name: "Card preview" });
  await page.getByLabel("Note").fill(note);
  await expect(preview.getByText(note)).toBeVisible();

  await page.getByLabel("Quantity").fill("0");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Enter at least 1")).toBeVisible();
  await page.getByLabel("Quantity").fill("3");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const guest = await browser.newContext({ baseURL: baseURL ?? "" });
  const guestPage = await guest.newPage();
  await signIn(guestPage);
  await expect(guestPage.getByText(note)).toBeVisible();
  await guest.close();
});

test("the server refuses a qty below the claims taken", async ({ request }) => {
  // Seed item 7 (Travel cot) has 2 claims.
  const response = await request.patch("/api/admin/items/7", { data: { qty: 1 } });
  expect(response.status()).toBe(400);
  expect((await response.json()).errors.qty).toContain("2 already taken");

  const typeChange = await request.patch("/api/admin/items/7", { data: { type: "fund" } });
  expect(typeChange.status()).toBe(400);
  expect((await typeChange.json()).errors).toHaveProperty("type");
  expect((await request.patch("/api/admin/items/99999", { data: {} })).status()).toBe(404);
});

test("duplicate an item and land on the copy's edit page", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Duplicate Night light" }).click();
  await expect(page).toHaveURL(/\/admin\/items\/\d+$/);
  await expect(page.getByLabel("Title")).toHaveValue("Night light (copy)");

  await page.getByRole("link", { name: "Back to items" }).click();
  const row = page.locator("main li", {
    has: page.getByRole("heading", { name: "Night light (copy)" }),
  });
  await expect(row).toContainText("draft");
});

test("archive a published item, unarchive it to draft, then delete a fresh draft", async ({
  page,
  browser,
  baseURL,
  request,
}) => {
  const title = `Play mat ${Date.now()}`;
  const created = await request.post("/api/admin/items", {
    data: { type: "gift", title, categoryId: 1, qty: 1 },
  });
  const { item } = await created.json();
  await request.post(`/api/admin/items/${item.id}/status`, { data: { status: "published" } });

  const guest = await browser.newContext({ baseURL: baseURL ?? "" });
  const guestPage = await guest.newPage();
  await signIn(guestPage);
  await expect(guestPage.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/admin");
  const row = page.locator("main li", { has: page.getByRole("heading", { name: title }) });
  await row.getByRole("button", { name: `Archive ${title}` }).click();
  await expect(row).toContainText("archived");
  await expect(row.getByText("Unarchive returns the item to draft.")).toBeVisible();
  await guestPage.reload();
  await expect(guestPage.getByRole("heading", { name: title })).toHaveCount(0);

  await row.getByRole("button", { name: `Unarchive ${title}` }).click();
  await expect(row).toContainText("draft");
  await guestPage.reload();
  await expect(guestPage.getByRole("heading", { name: title })).toHaveCount(0);
  await guest.close();

  await row.getByRole("button", { name: `Delete ${title}` }).click();
  await row.getByRole("button", { name: "Keep" }).click();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: `Delete ${title}` }).click();
  await row.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  expect((await request.get(`/api/admin/items/${item.id}`)).status()).toBe(404);
});

test("delete is refused with a 409 on a reserved gift and offers archive", async ({
  page,
  request,
}) => {
  const response = await request.delete("/api/admin/items/1");
  expect(response.status()).toBe(409);
  expect((await response.json()).errors.form).toContain("Archive it instead");
  expect((await request.delete("/api/admin/items/2")).status()).toBe(409);
  expect((await request.delete("/api/admin/items/99999")).status()).toBe(404);

  await page.goto("/admin");
  const row = page.locator("main li", {
    has: page.getByRole("heading", { name: "Night light", exact: true }),
  });
  await row.getByRole("button", { name: "Delete Night light", exact: true }).click();
  await row.getByRole("button", { name: "Yes, delete" }).click();
  await expect(row.getByRole("alert")).toContainText("Archive it instead");
  await expect(row.getByRole("button", { name: "Archive instead" })).toBeVisible();
  await expect(row).toBeVisible();
});

test.describe("search and filters", () => {
  const list = (page: import("@playwright/test").Page) => page.locator("main li");

  test("search by title ignores case and spaces", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Search items").fill("  HOODED ");
    await expect(page).toHaveURL(/q=/);
    await expect(list(page)).toHaveCount(1);
    await expect(list(page).getByRole("heading", { name: "Hooded towels" })).toBeVisible();
  });

  test("type, category and status chips each narrow the list", async ({ page }) => {
    await page.goto("/admin");
    await page
      .getByRole("navigation", { name: "Filter by type" })
      .getByRole("link", { name: "Funds" })
      .click();
    await expect(list(page).getByRole("heading", { name: "Pram fund" })).toBeVisible();
    await expect(list(page).getByRole("heading", { name: "Hooded towels" })).toHaveCount(0);

    await page
      .getByRole("navigation", { name: "Filter by type" })
      .getByRole("link", { name: "All" })
      .click();
    await page
      .getByRole("navigation", { name: "Filter by status" })
      .getByRole("link", { name: "Archived" })
      .click();
    await expect(list(page).getByRole("heading", { name: "High chair" })).toBeVisible();
    await expect(list(page).getByRole("heading", { name: "Hooded towels" })).toHaveCount(0);

    await page
      .getByRole("navigation", { name: "Filter by status" })
      .getByRole("link", { name: "All" })
      .click();
    await page
      .getByRole("navigation", { name: "Filter by category" })
      .getByRole("link", { name: /Bath/ })
      .click();
    await expect(list(page).getByRole("heading", { name: "Hooded towels" })).toBeVisible();
    await expect(list(page).getByRole("heading", { name: "Night light", exact: true })).toHaveCount(
      0,
    );
  });

  test("a combination with no match offers Clear filters", async ({ page }) => {
    await page.goto("/admin?type=fund&status=archived");
    await expect(page.getByText("No items match these filters.")).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    expect(await list(page).count()).toBeGreaterThan(5);
  });

  test("back and forward keep the filters", async ({ page }) => {
    await page.goto("/admin");
    const status = page.getByRole("navigation", { name: "Filter by status" });
    await status.getByRole("link", { name: "Draft" }).click();
    await expect(page).toHaveURL(/status=draft/);
    await page
      .getByRole("navigation", { name: "Filter by type" })
      .getByRole("link", { name: "Gifts" })
      .click();
    await expect(page).toHaveURL(/type=gift/);

    await page.goBack();
    await expect(page).toHaveURL(/status=draft/);
    await expect(page).not.toHaveURL(/type=/);
    await expect(status.getByRole("link", { name: "Draft" })).toHaveAttribute("data-state", "on");

    await page.goForward();
    await expect(page).toHaveURL(/type=gift/);
    await page.reload();
    await expect(page).toHaveURL(/status=draft/);
    await expect(status.getByRole("link", { name: "Draft" })).toHaveAttribute("data-state", "on");
  });

  test("the chips are 48 px tall and the page has no horizontal scroll at 390 px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");
    const chip = page
      .getByRole("navigation", { name: "Filter by status" })
      .getByRole("link", { name: "Draft" });
    expect((await chip.boundingBox())?.height).toBeGreaterThanOrEqual(48);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("move an item up in a category and see the guest list order change", async ({
  page,
  browser,
  baseURL,
}) => {
  const order = (headings: string[]) => ({
    steriliser: headings.indexOf("Bottle steriliser"),
    muslin: headings.indexOf("Muslin cloths"),
  });
  const guest = await browser.newContext({ baseURL: baseURL ?? "" });
  const guestPage = await guest.newPage();
  await signIn(guestPage);
  await expect(guestPage.getByRole("heading", { name: "Muslin cloths" })).toBeVisible();
  const before = order(await guestPage.getByRole("heading", { level: 2 }).allTextContents());
  expect(before.steriliser).toBeGreaterThanOrEqual(0);
  expect(before.steriliser).toBeLessThan(before.muslin);

  await page.goto("/admin?category=3");
  const rows = page.locator("main li");
  await expect(rows.first().getByRole("heading")).toHaveText("Bottle steriliser");
  await expect(
    rows.first().getByRole("button", { name: "Move up Bottle steriliser" }),
  ).toBeDisabled();
  await expect(rows.last().getByRole("button", { name: /^Move down/ })).toBeDisabled();
  const up = page.getByRole("button", { name: "Move up Muslin cloths" });
  expect((await up.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await up.focus();
  await page.keyboard.press("Enter");
  await expect(rows.first().getByRole("heading")).toHaveText("Muslin cloths");
  await expect(page.getByRole("button", { name: "Move up Muslin cloths" })).toBeDisabled();

  await page.reload();
  await expect(rows.first().getByRole("heading")).toHaveText("Muslin cloths");

  await guestPage.reload();
  await expect(guestPage.getByRole("heading", { name: "Muslin cloths" })).toBeVisible();
  const after = order(await guestPage.getByRole("heading", { level: 2 }).allTextContents());
  expect(after.muslin).toBeLessThan(after.steriliser);
  await guest.close();
});

test("reorder is offered for one category only, and the API refuses a wrong id set", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(page.getByText("Choose one category to reorder its items.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Move up/ })).toHaveCount(0);
  await page.goto("/admin?category=3&type=gift");
  await expect(page.getByText("Clear the other filters to reorder this category.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Move up/ })).toHaveCount(0);

  const wrong = await request.put("/api/admin/categories/3/order", { data: { itemIds: [1, 5] } });
  expect(wrong.status()).toBe(400);
  expect((await wrong.json()).errors).toHaveProperty("itemIds");
  const missing = await request.put("/api/admin/categories/999/order", { data: { itemIds: [] } });
  expect(missing.status()).toBe(404);
});

test.describe("categories", () => {
  test("create a category, rename it, publish an item into it and see it on the guest chips", async ({
    page,
    browser,
    baseURL,
    request,
  }) => {
    const stamp = String(Date.now()).slice(-6);
    const name = `Play ${stamp}`;
    const renamed = `Toys ${stamp}`;

    await page.goto("/admin");
    await page.getByRole("link", { name: "Categories" }).click();
    await expect(page).toHaveURL(/\/admin\/categories$/);
    await expect(page.getByRole("heading", { name: /Sleep/ })).toBeVisible();

    await page.getByRole("button", { name: "Add category" }).click();
    await expect(page.getByText("Enter a name")).toBeVisible();
    await expect(page.getByText("Use one emoji")).toBeVisible();

    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Emoji").fill("🧸");
    await page.getByRole("button", { name: "Add category" }).click();
    const row = page.locator("main li", { has: page.getByRole("heading", { name: `🧸 ${name}` }) });
    await expect(row).toContainText("0 items");
    await expect(page.locator("main li").last()).toContainText(name);

    await row.getByRole("button", { name: `Edit ${name}` }).click();
    const editing = page.locator("main li").last();
    await editing.getByLabel("Name").fill(renamed);
    await editing.getByRole("button", { name: "Save" }).click();
    const renamedRow = page.locator("main li", {
      has: page.getByRole("heading", { name: `🧸 ${renamed}` }),
    });
    await expect(renamedRow).toBeVisible();

    const categories = await (await request.get("/api/admin/categories")).json();
    const id = categories.categories.find(
      (category: { name: string }) => category.name === renamed,
    )?.id;
    expect(typeof id).toBe("number");
    const created = await request.post("/api/admin/items", {
      data: { type: "gift", title: `Blocks ${stamp}`, categoryId: id, qty: 1 },
    });
    const { item } = await created.json();
    await request.post(`/api/admin/items/${item.id}/status`, { data: { status: "published" } });

    const guest = await browser.newContext({ baseURL: baseURL ?? "" });
    const guestPage = await guest.newPage();
    await signIn(guestPage);
    await expect(
      guestPage
        .getByRole("navigation", { name: "Category" })
        .getByRole("link", { name: new RegExp(`^${renamed}`) }),
    ).toBeVisible();
    await guest.close();

    await page.reload();
    const withItem = page.locator("main li", {
      has: page.getByRole("heading", { name: `🧸 ${renamed}` }),
    });
    await expect(withItem).toContainText("1 item");
    await withItem.getByRole("button", { name: `Delete ${renamed}` }).click();
    await withItem.getByRole("button", { name: "Yes, delete" }).click();
    await expect(withItem.getByRole("alert")).toContainText("still has 1 item");
    await expect(withItem).toBeVisible();

    const refused = await request.delete(`/api/admin/categories/${id}`);
    expect(refused.status()).toBe(409);
  });

  test("move a category down and delete an empty one", async ({ page, request }) => {
    const empty = await request.post("/api/admin/categories", {
      data: { name: "Temp", emoji: "🗑️" },
    });
    expect(empty.status()).toBe(201);

    await page.goto("/admin/categories");
    const rows = page.locator("main li");
    await expect(rows.first().getByRole("heading")).toContainText("Sleep");
    await expect(rows.first().getByRole("button", { name: /^Move up/ })).toBeDisabled();
    const down = page.getByRole("button", { name: "Move down Sleep" });
    expect((await down.boundingBox())?.height).toBeGreaterThanOrEqual(48);
    await down.click();
    await expect(rows.first().getByRole("heading")).toContainText("Bath");
    await page.getByRole("button", { name: "Move up Sleep" }).click();
    await expect(rows.first().getByRole("heading")).toContainText("Sleep");

    const temp = page.locator("main li", { has: page.getByRole("heading", { name: /Temp/ }) });
    await temp.getByRole("button", { name: "Delete Temp" }).click();
    await temp.getByRole("button", { name: "Yes, delete" }).click();
    await expect(temp).toHaveCount(0);
  });

  test("the category endpoints refuse bad bodies", async ({ request }) => {
    const empty = await request.post("/api/admin/categories", { data: { name: "", emoji: "" } });
    expect(empty.status()).toBe(400);
    expect(Object.keys((await empty.json()).errors).sort()).toEqual(["emoji", "name"]);
    expect(
      (await request.patch("/api/admin/categories/999", { data: { name: "X" } })).status(),
    ).toBe(404);
    expect((await request.delete("/api/admin/categories/999")).status()).toBe(404);
    const order = await request.put("/api/admin/categories/order", { data: { categoryIds: [1] } });
    expect(order.status()).toBe(400);
  });
});
