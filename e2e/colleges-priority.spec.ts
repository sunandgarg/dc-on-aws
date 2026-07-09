import { test, expect } from "@playwright/test";

/**
 * Regression for the bug where a Priority-1 / Featured-rank-1 college (Amity)
 * was being pushed below legacy `featured_colleges` rows on /colleges.
 * The first card under the Engineering filter MUST be the pinned college.
 */
test.describe("Colleges listing — priority & featured ordering", () => {
  test("Engineering filter puts Amity (priority 1, featured #1) first", async ({ page }) => {
    await page.goto("/colleges/top-engineering-colleges-in-india");
    const firstCardTitle = page.locator("article h2").first();
    await expect(firstCardTitle).toBeVisible({ timeout: 15_000 });
    await expect(firstCardTitle).toContainText(/amity/i);
    const featuredBadge = page.locator('[data-testid="featured-rank-badge"]').first();
    await expect(featuredBadge).toBeVisible();
    await expect(featuredBadge).toContainText(/Featured\s*#1/i);
  });

  test("Featured slot #1 card is rendered ahead of generic priority-50 cards", async ({ page }) => {
    await page.goto("/colleges");
    const cards = page.locator("article h2");
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    const firstName = (await cards.first().innerText()).toLowerCase();
    expect(firstName).toMatch(/amity|iit|iim|aiims/);
  });
});
