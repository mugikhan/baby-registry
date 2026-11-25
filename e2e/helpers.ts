import { expect, type Page } from "@playwright/test";

export const FAMILY_PIN = "2027";

export async function useOwnClient(page: Page, headers: Record<string, string> = {}) {
  const extra = { "cf-connecting-ip": `e2e-${crypto.randomUUID()}`, ...headers };
  await page.context().route(
    (url) => url.hostname === "localhost",
    (route) => route.continue({ headers: { ...route.request().headers(), ...extra } }),
  );
}

export async function submitPin(page: Page, pin: string) {
  await page.getByLabel("Family PIN").fill(pin);
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
  await page.getByRole("button", { name: "Continue" }).click();
}

export async function signIn(page: Page, path = "/") {
  await useOwnClient(page);
  await page.goto(path);
  await expect(page).toHaveURL(/\/pin/);
  await submitPin(page, FAMILY_PIN);
  await expect(page).not.toHaveURL(/\/pin/);
}
