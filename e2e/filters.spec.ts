import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// The search box needs React to be live, so wait for the page to finish loading scripts.
async function search(page: Page, text: string) {
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Search the list").fill(text);
}

const cards = (page: Page) => page.locator("main ul > li");
const titles = (page: Page) => cards(page).getByRole("heading").allTextContents();

test("a category chip filters the list and All restores it", async ({ page }) => {
  await signIn(page);
  const all = await titles(page);
  await page.getByRole("link", { name: "Bath" }).click();
  await expect(page).toHaveURL(/\?category=2$/);
  await expect.poll(() => titles(page)).toEqual(["Hooded towels", "Baby bath tub"]);
  await expect(page.getByRole("link", { name: "Bath" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "All" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => titles(page)).toEqual(all);
});

test("search finds a word in a note and the URL keeps it", async ({ page }) => {
  await signIn(page);
  await search(page, "polo");
  await expect(page).toHaveURL(/\?q=polo$/);
  await expect.poll(() => titles(page)).toEqual(["Pram fund"]);
  await page.reload();
  await expect(page.getByLabel("Search the list")).toHaveValue("polo");
  await expect.poll(() => titles(page)).toEqual(["Pram fund"]);
});

test("still needed only hides taken gifts and keeps funds", async ({ page }) => {
  await signIn(page);
  expect(await titles(page)).toContain("Night light");
  await expect(page.getByRole("link", { name: "Still needed only, off" })).toBeVisible();
  const toggle = page.getByRole("link", { name: "Still needed only" });
  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Still needed only, on");
  await expect(page).toHaveURL(/\?needed=true$/);
  const shown = await titles(page);
  expect(shown).not.toContain("Night light");
  expect(shown).not.toContain("Travel cot");
  expect(shown).toContain("Pram fund");
  expect(shown).toContain("Hooded towels");
  const box = await toggle.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
});

test("category, search and still needed combine", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Sleep" }).click();
  await page.getByRole("link", { name: "Still needed only" }).click();
  await expect(page).toHaveURL(/category=1/);
  await expect(page).toHaveURL(/needed=true/);
  await expect.poll(() => titles(page)).toEqual(["Swaddle blankets"]);
  await search(page, "muslin");
  await expect(page).toHaveURL(/q=muslin/);
  await expect(page).toHaveURL(/category=1/);
  await expect(page).toHaveURL(/needed=true/);
  await expect.poll(() => titles(page)).toEqual(["Swaddle blankets"]);
  await search(page, "zzz");
  await expect(page.getByRole("heading", { name: "Nothing matches that" })).toBeVisible();
});

test("a filtered URL loaded directly shows the filtered list", async ({ page }) => {
  await signIn(page, "/?category=3&needed=true&q=steriliser");
  await expect(page).toHaveURL("/?category=3&needed=true&q=steriliser");
  await expect.poll(() => titles(page)).toEqual(["Bottle steriliser"]);
  await expect(page.getByRole("link", { name: "Still needed only, on" })).toBeVisible();
});

test("invalid params fall back to no filter", async ({ page }) => {
  await signIn(page, "/?category=abc&needed=maybe");
  await expect(cards(page).first()).toBeVisible();
  expect((await titles(page)).length).toBe(9);
});

test("an unknown category shows no match", async ({ page }) => {
  await signIn(page, "/?category=99");
  await expect(page.getByRole("heading", { name: "Nothing matches that" })).toBeVisible();
});

test("Show everything clears the filters", async ({ page }) => {
  await signIn(page, "/?q=zzzz&category=2&needed=true");
  await expect(page.getByRole("heading", { name: "Nothing matches that" })).toBeVisible();
  await page.getByRole("link", { name: "Show everything" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Search the list")).toHaveValue("");
  await expect.poll(async () => (await titles(page)).length).toBe(9);
});

test("a chip and the toggle filter with JavaScript disabled", async ({ page, browser }) => {
  // Turnstile needs JavaScript, so sign in with JS and reuse the session cookie.
  await signIn(page);
  const state = await page.context().storageState();
  const context = await browser.newContext({ storageState: state, javaScriptEnabled: false });
  const bare = await context.newPage();
  await bare.goto("/");
  await expect(cards(bare).first()).toBeVisible();
  await bare.getByRole("link", { name: "Sleep" }).click();
  await expect(bare).toHaveURL(/\?category=1$/);
  expect(await titles(bare)).toEqual(["Swaddle blankets", "Night light", "Travel cot"]);
  await bare.getByRole("link", { name: "Still needed only" }).click();
  await expect(bare).toHaveURL(/category=1/);
  await expect(bare).toHaveURL(/needed=true/);
  expect(await titles(bare)).toEqual(["Swaddle blankets"]);
  await bare.getByLabel("Search the list").fill("zzz");
  await bare.getByLabel("Search the list").press("Enter");
  await expect(bare).toHaveURL(/q=zzz/);
  await expect(bare).toHaveURL(/category=1/);
  await expect(bare).toHaveURL(/needed=true/);
  await expect(bare.getByRole("heading", { name: "Nothing matches that" })).toBeVisible();
  await bare.getByRole("link", { name: "Show everything" }).click();
  await expect(bare).toHaveURL(/\/$/);
  await context.close();
});
