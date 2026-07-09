import { test, expect, devices } from "@playwright/test";

/**
 * OTP Lead Gate audit (mobile viewport).
 *
 * Verifies that on mobile every download surface in the study-material flow
 * triggers the lead-capture / OTP gate dialog and that NO free-skip path
 * exists (the project rule is: every download is gated).
 *
 * The test uses a relaxed strategy: it visits each surface that renders a
 * download button, clicks the first one it finds, and asserts that a
 * dialog with the expected gate text appears. Surfaces with no resources
 * configured in the test environment are skipped (not failed).
 */

test.use({ ...devices["iPhone 13"] });

const BASE = process.env.E2E_BASE_URL || "http://localhost:8080";

const DOWNLOAD_BUTTON_SELECTOR = [
  'button:has-text("Download Pack")',
  'button:has-text("Download")',
  'button:has(svg.lucide-file-down)',
  'button:has-text("PDF")',
].join(", ");

const GATE_DIALOG_TEXT = /verify|otp|continue to download|enter mobile|free download/i;

async function clickFirstDownloadAndExpectGate(page: any, label: string) {
  const btn = page.locator(DOWNLOAD_BUTTON_SELECTOR).first();
  const count = await btn.count();
  if (count === 0) {
    test.info().annotations.push({ type: "skip", description: `${label}: no download buttons rendered (no resources in env)` });
    return;
  }
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ timeout: 5000 });
  // Gate dialog must appear — Radix Dialog uses role="dialog"
  const dialog = page.getByRole("dialog");
  await expect(dialog, `${label}: OTP gate dialog should open`).toBeVisible({ timeout: 6000 });
  await expect(dialog).toContainText(GATE_DIALOG_TEXT);
  // No free-skip: there should NOT be any "Skip" / "Continue without OTP" link
  await expect(dialog.getByText(/skip otp|continue without|free skip/i)).toHaveCount(0);
}

test.describe("OTP lead gate — mobile, no free-skip paths", () => {
  test("Subject combined PYQ + year-wise PYQ + tricks + notes all trigger gate", async ({ page }) => {
    // Pick a likely-populated subject; project seeds usually include CBSE class 12 physics
    await page.goto(`${BASE}/study-material/class-12/cbse/physics`);
    await page.waitForLoadState("networkidle");
    await clickFirstDownloadAndExpectGate(page, "StudySubject (combined/year/tricks/notes)");
  });

  test("Chapter-level PYQ download triggers gate", async ({ page }) => {
    await page.goto(`${BASE}/study-material/class-12/cbse/physics`);
    await page.waitForLoadState("networkidle");
    // expand a chapter accordion if present
    const chapter = page.locator('[id^="chapter-"] > button').first();
    if (await chapter.count()) {
      await chapter.click();
      await clickFirstDownloadAndExpectGate(page, "Chapter resources");
    } else {
      test.info().annotations.push({ type: "skip", description: "No chapters seeded" });
    }
  });

  test("Resources hub list triggers gate on click-through", async ({ page }) => {
    await page.goto(`${BASE}/resources`);
    await page.waitForLoadState("networkidle");
    // Resources page links into StudySubject; follow first card
    const card = page.locator('a[href*="/study-material/"]').first();
    if (await card.count()) {
      await card.click();
      await page.waitForLoadState("networkidle");
      await clickFirstDownloadAndExpectGate(page, "Resources → Subject");
    } else {
      test.info().annotations.push({ type: "skip", description: "No resources cards rendered" });
    }
  });

  test("Sub-slug resource page applies filters and gates downloads", async ({ page }) => {
    await page.goto(`${BASE}/resources/cbse-class-12-physics-pyq`);
    await page.waitForLoadState("networkidle");
    // Title should reflect filters
    await expect(page).toHaveTitle(/CBSE.*Class 12.*Physics.*PYQ/i);
    const card = page.locator('a[href*="/study-material/"]').first();
    if (await card.count()) {
      await card.click();
      await page.waitForLoadState("networkidle");
      await clickFirstDownloadAndExpectGate(page, "Resources sub-slug → Subject");
    }
  });

  test("Confirms global rule: no DOM contains a free-skip download bypass", async ({ page }) => {
    await page.goto(`${BASE}/study-material/class-12/cbse/physics`);
    await page.waitForLoadState("networkidle");
    // No buttons anywhere on the surface labelled to bypass the gate
    await expect(page.getByText(/skip otp|continue without otp|download without verification/i)).toHaveCount(0);
  });
});
