import { test, expect } from "@playwright/test";

/**
 * Authenticated DB-level E2E for News article links.
 *
 * Requirements (skipped automatically when missing):
 *   E2E_ADMIN_STORAGE_STATE  – path to a Playwright storageState JSON for an admin session
 *   E2E_TEST_ARTICLE_SLUG    – slug of a published article that already has at least one
 *                              college link (for the render assertion below)
 *
 * To wire this up locally:
 *   1. Run `npx playwright codegen <baseURL>/admin` and sign in as an admin.
 *   2. Save the storage state via `--save-storage=auth/admin.json`.
 *   3. Export E2E_ADMIN_STORAGE_STATE=auth/admin.json before running `npx playwright test`.
 */

const STATE = process.env.E2E_ADMIN_STORAGE_STATE;
const SLUG  = process.env.E2E_TEST_ARTICLE_SLUG;

test.describe("Article Links — authenticated", () => {
  test.skip(!STATE, "E2E_ADMIN_STORAGE_STATE not configured");
  test.use({ storageState: STATE });

  test("admin can open article editor Links tab and see entity pickers", async ({ page }) => {
    await page.goto("/admin/articles");
    await expect(page.locator("body")).toContainText(/articles/i, { timeout: 10_000 });
    // Open the first article in the table (UI varies — adapt selector if the admin re-skins)
    const editBtn = page.getByRole("button", { name: /edit/i }).first();
    if (await editBtn.count()) await editBtn.click();
    // Switch to the Links tab
    const linksTab = page.getByRole("tab", { name: /links/i });
    if (await linksTab.count()) await linksTab.click();
    // Assert at least one searchable picker is visible
    await expect(page.getByPlaceholder(/type to search/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("article detail renders linked-resource cards", async ({ page }) => {
    test.skip(!SLUG, "E2E_TEST_ARTICLE_SLUG not configured");
    await page.goto(`/news/${SLUG}`);
    await expect(page.getByText(/linked colleges|linked courses|linked exams|related news/i))
      .toBeVisible({ timeout: 10_000 });
  });
});
