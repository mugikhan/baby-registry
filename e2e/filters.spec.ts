import { expect, test, type Page } from "@playwright/test";
import { signIn, useOwnClient } from "./helpers";

const cards = (page: Page) => page.locator("main ul > li");
const titles = (page: Page) => cards(page).getByRole("heading").allTextContents();
const chip = (page: Page, name: string | RegExp) =>
  page.getByRole("navigation", { name: "Category" }).getByRole("link", { name });

test("the chips show each category with how many items are still needed", async ({ page }) => {
  await signIn(page);
  await expect(chip(page, "All")).toBeVisible();
  await expect(chip(page, /^Sleep 1 needed$/)).toBeVisible();
  await expect(chip(page, /^Bath 2 needed$/)).toBeVisible();
  await expect(chip(page, /^Feeding 2 needed$/)).toBeVisible();
  await expect(chip(page, /^Out & about 2 needed$/)).toBeVisible();
  await expect(chip(page, "Cash funds")).toBeVisible();
  const box = await chip(page, "Cash funds").boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
});

test("a category chip filters the list and All restores it", async ({ page }) => {
  await signIn(page);
  await expect(cards(page).first()).toBeVisible();
  const all = await titles(page);
  expect(all).toHaveLength(9);
  await chip(page, /^Bath/).click();
  await expect(page).toHaveURL(/\?category=2$/);
  await expect.poll(() => titles(page)).toEqual(["Hooded towels", "Baby bath tub"]);
  await expect(chip(page, /^Bath/)).toHaveAttribute("aria-current", "page");
  await expect(chip(page, "All")).not.toHaveAttribute("aria-current", "page");
  await chip(page, "All").click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => titles(page)).toEqual(all);
});

test("each category chip shows its own items", async ({ page }) => {
  await signIn(page);
  await chip(page, /^Sleep/).click();
  await expect.poll(() => titles(page)).toEqual(["Swaddle blankets", "Night light", "Travel cot"]);
  await chip(page, /^Feeding/).click();
  await expect.poll(() => titles(page)).toEqual(["Bottle steriliser", "Muslin cloths"]);
  await chip(page, /^Out & about/).click();
  await expect.poll(() => titles(page)).toEqual(["Pram fund", "Car window shades"]);
});

test("the Cash funds chip shows only funds and clears the category", async ({ page }) => {
  await signIn(page);
  await chip(page, /^Bath/).click();
  await expect(page).toHaveURL(/category=2/);
  await chip(page, "Cash funds").click();
  await expect(page).toHaveURL(/\?funds=true$/);
  await expect.poll(() => titles(page)).toEqual(["Pram fund"]);
  await expect(chip(page, "Cash funds")).toHaveAttribute("aria-current", "page");
  await chip(page, /^Sleep/).click();
  await expect(page).toHaveURL(/\?category=1$/);
  await expect(page).not.toHaveURL(/funds/);
});

test("still needed only hides taken gifts and keeps funds", async ({ page }) => {
  await signIn(page);
  await expect(cards(page).first()).toBeVisible();
  expect(await titles(page)).toContain("Night light");
  await expect(page.getByRole("link", { name: "Still needed only, off" })).toBeVisible();
  const toggle = page.getByRole("link", { name: "Still needed only" });
  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Still needed only, on");
  await expect(page).toHaveURL(/\?needed=true$/);
  await expect.poll(() => titles(page)).not.toContain("Night light");
  const shown = await titles(page);
  expect(shown).not.toContain("Travel cot");
  expect(shown).toContain("Pram fund");
  expect(shown).toContain("Hooded towels");
  const box = await toggle.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
});

test("a chip and still needed combine and keep each other", async ({ page }) => {
  await signIn(page);
  await chip(page, /^Sleep/).click();
  await page.getByRole("link", { name: "Still needed only" }).click();
  await expect(page).toHaveURL(/category=1/);
  await expect(page).toHaveURL(/needed=true/);
  await expect.poll(() => titles(page)).toEqual(["Swaddle blankets"]);
  await chip(page, "All").click();
  await expect(page).toHaveURL(/\?needed=true$/);
});

test("a filtered URL loaded directly shows the filtered list", async ({ page }) => {
  await signIn(page, "/?category=3&needed=true");
  await expect(page).toHaveURL("/?category=3&needed=true");
  await expect.poll(() => titles(page)).toEqual(["Bottle steriliser", "Muslin cloths"]);
  await expect(page.getByRole("link", { name: "Still needed only, on" })).toBeVisible();
  await page.goto("/?funds=true");
  await expect.poll(() => titles(page)).toEqual(["Pram fund"]);
});

test("back and forward move between chips", async ({ page }) => {
  await signIn(page);
  await expect(cards(page).first()).toBeVisible();
  await chip(page, /^Bath/).click();
  await expect(page).toHaveURL(/category=2/);
  await chip(page, /^Feeding/).click();
  await expect(page).toHaveURL(/category=3/);
  await page.goBack();
  await expect(page).toHaveURL(/category=2/);
  await expect.poll(() => titles(page)).toEqual(["Hooded towels", "Baby bath tub"]);
  await page.goForward();
  await expect(page).toHaveURL(/category=3/);
  await expect.poll(() => titles(page)).toEqual(["Bottle steriliser", "Muslin cloths"]);
});

test("an old link with q and invalid params still opens the list", async ({ page }) => {
  await signIn(page, "/?q=polo&category=abc&needed=maybe");
  await expect(cards(page).first()).toBeVisible();
  expect(await titles(page)).toHaveLength(9);
  await expect(page.getByLabel("Search the list")).toHaveCount(0);
});

test("an unknown category shows the empty state and Show everything clears it", async ({
  page,
}) => {
  await signIn(page, "/?category=99&needed=true");
  await expect(page.getByRole("heading", { name: "Nothing here right now" })).toBeVisible();
  await page.getByRole("link", { name: "Show everything" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(async () => (await titles(page)).length).toBe(9);
});

test("the server HTML holds the skeleton and no list data", async ({ page, request }) => {
  await signIn(page);
  const cookies = (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
  const response = await request.get("/", { headers: { cookie: cookies } });
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("Loading the list");
  expect(html).toContain('aria-busy="true"');
  expect(html).not.toContain("Hooded towels");
  expect(html).not.toContain("Pram fund");
});

test("/api/list returns 401 without a session and the list with one", async ({ page, request }) => {
  const anonymous = await request.get("/api/list", { maxRedirects: 0 });
  expect(anonymous.status()).toBe(401);

  await signIn(page);
  const response = await page.request.get("/api/list");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  const body = await response.json();
  expect(body.title).toBe("Ayesha & Mughees");
  expect(body.items).toHaveLength(9);
  expect(JSON.stringify(body)).not.toMatch(/@example\.com|email|guestId/i);
});

test("the PIN page requests the list code before the PIN is submitted", async ({ page }) => {
  await useOwnClient(page);
  const requested: string[] = [];
  page.on("request", (req) => requested.push(req.url()));
  await page.goto("/pin");
  // The dev server names the chunk by file, the production build as assets/routes-*.js.
  await expect
    .poll(() =>
      requested.some((url) => /index\.tsx\?tsr-split=component|\/assets\/routes-/.test(url)),
    )
    .toBe(true);
  expect(requested.filter((url) => url.includes("/api/list"))).toEqual([]);
});
