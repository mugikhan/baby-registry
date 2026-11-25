import { expect, test } from "@playwright/test";
import { FAMILY_PIN, signIn, submitPin, useOwnClient } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useOwnClient(page);
});

test("a visitor with no cookie is sent to the PIN page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/pin\?next=%2F$/);
  await expect(page.getByRole("heading", { level: 1, name: "Enter the family PIN" })).toBeVisible();
  await expect(page.getByLabel("Family PIN")).toHaveAttribute("inputmode", "numeric");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("a wrong PIN shows a message and stays on the PIN page", async ({ page }) => {
  await page.goto("/pin");
  await submitPin(page, "0000");
  await expect(page).toHaveURL(/\/pin/);
  await expect(page.getByRole("alert")).toHaveText(
    "That PIN didn't work. Check the invite message and try again.",
  );
  await expect(page.getByLabel("Family PIN")).toBeFocused();
  await expect(page.getByLabel("Family PIN")).toHaveValue("");
});

test("the right PIN opens the list and a reload stays on it", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Ayesha & Mughees" })).toBeVisible();
  await page.reload();
  await expect(page).not.toHaveURL(/\/pin/);
  await expect(page.getByRole("heading", { level: 1, name: "Ayesha & Mughees" })).toBeVisible();
});

test("a deep link returns to its path after the PIN", async ({ page }) => {
  await page.goto("/?q=cot");
  await expect(page).toHaveURL(/\/pin\?next=/);
  await submitPin(page, FAMILY_PIN);
  await expect(page).toHaveURL("/?q=cot");
});

test("the next parameter cannot leave the site", async ({ page }) => {
  await page.goto("/pin?next=https%3A%2F%2Fexample.com%2F");
  await submitPin(page, FAMILY_PIN);
  await expect(page).toHaveURL("/");
});

test("the session cookie is HttpOnly, Lax and lasts about 90 days", async ({ page }) => {
  await signIn(page);
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "registry_session");
  expect(session).toBeDefined();
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  const days = ((session?.expires ?? 0) - Date.now() / 1000) / 86400;
  expect(days).toBeGreaterThan(89);
  expect(days).toBeLessThan(91);
});

test("a server function call with no cookie gets 401", async ({ request }) => {
  const response = await request.get("/_serverFn/anything");
  expect(response.status()).toBe(401);
});

test("a failed Turnstile check shows its message", async ({ page }) => {
  await useOwnClient(page, { "x-test-turnstile-fail": "1" });
  await page.goto("/pin");
  await submitPin(page, FAMILY_PIN);
  await expect(page.getByRole("alert")).toHaveText(
    "We couldn't check you're human. Please try again.",
  );
  await expect(page).toHaveURL(/\/pin/);
});
