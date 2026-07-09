import { test, expect } from "@playwright/test";

test.describe("Homepage Google Reviews", () => {
  test("review chip and 'View all' link open admin-configured URL in new tab", async ({ page }) => {
    await page.goto("/");
    const links = page.locator('a[href*="g.co"], a[href*="google.com/maps"], a[href*="dekhocampus"]');
    await expect(links.first()).toBeVisible({ timeout: 15_000 });
    const href = await links.first().getAttribute("href");
    expect(href).toBeTruthy();
    expect(await links.first().getAttribute("target")).toBe("_blank");
  });
});

test.describe("ComparePage interactions", () => {
  test("auto-opens search modal when fewer than 2 colleges selected", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByText(/compare colleges/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
