import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { signIn } from "./helpers";

function expectSecurityHeaders(headers: Record<string, string>) {
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toMatch(/script-src 'nonce-[^']+' 'strict-dynamic'/);
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["strict-transport-security"]).toContain("max-age=31536000");
}

function nonceOf(response: APIResponse) {
  return /'nonce-([^']+)'/.exec(response.headers()["content-security-policy"] ?? "")?.[1];
}

function watchViolations(page: Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });
  return violations;
}

test("the PIN page carries the security headers", async ({ request }) => {
  const response = await request.get("/pin");
  expect(response.status()).toBe(200);
  expectSecurityHeaders(response.headers());
});

test("the gate's redirect to the PIN page carries the security headers", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers()["location"]).toContain("/pin");
  expectSecurityHeaders(response.headers());
});

test("an unauthorised API call carries the security headers", async ({ request }) => {
  const response = await request.get("/api/anything", { maxRedirects: 0 });
  expect(response.status()).toBe(401);
  expectSecurityHeaders(response.headers());
});

test("the home page carries the security headers after sign-in", async ({ page }) => {
  await signIn(page);
  const response = await page.goto("/");
  expectSecurityHeaders(response?.headers() ?? {});
});

test("the nonce changes between requests", async ({ request }) => {
  const first = nonceOf(await request.get("/pin"));
  const second = nonceOf(await request.get("/pin"));
  expect(first).toBeTruthy();
  expect(second).toBeTruthy();
  expect(first).not.toBe(second);
});

test("every script tag carries the response nonce", async ({ request }) => {
  const response = await request.get("/pin");
  const nonce = nonceOf(response);
  const tags = (await response.text()).match(/<script\b[^>]*>/g) ?? [];
  expect(tags.length).toBeGreaterThan(0);
  for (const tag of tags) expect(tag).toContain(`nonce="${nonce}"`);
});

test("the console shows no CSP violation before and after sign-in", async ({ page }) => {
  const violations = watchViolations(page);
  await page.addInitScript(() => {
    if (window !== window.top) return;
    document.addEventListener("securitypolicyviolation", (event) => {
      console.error(
        `Content Security Policy violation: ${event.violatedDirective} ${event.blockedURI} ${event.sample}`,
      );
    });
  });
  await signIn(page);
  await page.waitForLoadState("networkidle");
  expect(violations).toEqual([]);
});

test("the Turnstile widget still loads on the PIN page", async ({ page }) => {
  await page.goto("/pin");
  await expect(
    page.locator('.cf-turnstile iframe, input[name="cf-turnstile-response"]').first(),
  ).toBeAttached();
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("");
});

test("a category chip navigates without a full reload", async ({ page }) => {
  await signIn(page);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    (window as unknown as { __marker: boolean }).__marker = true;
  });
  await page.getByRole("link", { name: "Bath" }).click();
  await expect(page).toHaveURL(/\?category=2$/);
  const survived = await page.evaluate(() => "__marker" in window);
  expect(survived).toBe(true);
});
