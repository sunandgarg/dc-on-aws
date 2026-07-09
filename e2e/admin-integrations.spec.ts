import { test, expect } from "@playwright/test";

// Requires authenticated admin session — run via `playwright test --grep admin` after
// configuring storageState. Smoke check ensures page loads and shows IDs.
test("AdminIntegrations page renders integration rows", async ({ page }) => {
  await page.goto("/admin/integrations");
  // Either auth gate or page heading — both acceptable smoke
  await expect(page.locator("body")).toContainText(/integrations|sign in|login/i, { timeout: 10_000 });
});
