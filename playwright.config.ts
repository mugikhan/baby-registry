import { defineConfig, devices } from "@playwright/test";

const MUTATING = ["freshness.spec.ts", "admin-items.spec.ts"];
const ADMIN_ITEMS = "admin-items.spec.ts";
const mobile360 = {
  ...devices["Desktop Chrome"],
  viewport: { width: 360, height: 640 },
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "mobile-360", use: mobile360, testIgnore: MUTATING },
    { name: "Pixel 5", use: { ...devices["Pixel 5"] }, testIgnore: MUTATING },
    { name: "iPhone SE", use: { ...devices["iPhone SE"] }, testIgnore: MUTATING },
    // Changes the shared local D1, so it runs alone after the read-only projects finish.
    {
      name: "mutating",
      use: mobile360,
      testMatch: "freshness.spec.ts",
      dependencies: ["mobile-360", "Pixel 5", "iPhone SE"],
      fullyParallel: false,
    },
    {
      name: "mutating-admin",
      use: mobile360,
      testMatch: ADMIN_ITEMS,
      dependencies: ["mutating"],
      fullyParallel: false,
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
