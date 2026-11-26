import { expect, test } from "@playwright/test";
import { ACCESS_HEADER, ORGANISER_EMAIL, otherKey, signAccessToken } from "./access-token";

const refusedTokens = {
  "a forged token": () => signAccessToken({ key: otherKey() }),
  "the wrong audience": () => signAccessToken({ aud: ["someone-else"] }),
  "an expired token": () => signAccessToken({ expiresInSeconds: -3600 }),
  "an email off the list": () => signAccessToken({ email: "stranger@example.com" }),
  "the wrong issuer": () => signAccessToken({ iss: "https://evil.cloudflareaccess.com" }),
};

test("admin paths answer 403 without a token", async ({ request }) => {
  for (const path of ["/admin", "/admin/items", "/api/admin/me", "/ADMIN"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(403);
  }
});

test("the 403 carries the security headers", async ({ request }) => {
  const response = await request.get("/admin", { maxRedirects: 0 });
  expect(response.status()).toBe(403);
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
});

for (const [name, makeToken] of Object.entries(refusedTokens)) {
  test(`admin answers 403 for ${name}`, async ({ request }) => {
    const headers = { [ACCESS_HEADER]: makeToken() };
    expect((await request.get("/admin", { headers })).status()).toBe(403);
    expect((await request.get("/api/admin/me", { headers })).status()).toBe(403);
  });
}

test("a signed token returns the organiser email", async ({ request }) => {
  const response = await request.get("/api/admin/me", {
    headers: { [ACCESS_HEADER]: signAccessToken() },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ email: ORGANISER_EMAIL });
});

test("a signed token shows the email on the admin page", async ({ page }) => {
  await page.setExtraHTTPHeaders({ [ACCESS_HEADER]: signAccessToken() });
  await page.goto("/admin");
  await expect(page.getByText(`Signed in as ${ORGANISER_EMAIL}`)).toBeVisible();
});

test("admin paths answer 404 on another host", async ({ request }) => {
  const headers = { [ACCESS_HEADER]: signAccessToken(), host: "127.0.0.1:3000" };
  for (const path of ["/admin", "/api/admin/me"]) {
    const response = await request.get(path, { headers });
    expect(response.status(), path).toBe(404);
  }
});

test("guest pages still need the PIN", async ({ request }) => {
  const headers = { [ACCESS_HEADER]: signAccessToken() };
  const home = await request.get("/", { headers, maxRedirects: 0 });
  expect(home.status()).toBe(302);
  expect(home.headers()["location"]).toContain("/pin");
  expect((await request.get("/api/list", { headers })).status()).toBe(401);
});
