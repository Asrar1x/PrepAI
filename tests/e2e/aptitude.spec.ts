import { test, expect, type Page } from '@playwright/test';

async function clearLocalStorage(page: Page) {
  await page.goto('http://localhost:5173/auth');
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {}
  });
}

test.describe('Aptitude Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test('start → answer → submit → next → end', async ({ page }) => {
    // Register first via the UI
    await page.goto('http://localhost:5173/auth');
    const email = `e2e_apt_${Date.now()}@test.com`;
    await page.getByRole('button', { name: 'Sign up' }).first().click();
    await page.getByPlaceholder('John Doe').fill('Apt Student');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').fill('E2Epass123!');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Navigate to the aptitude page
    await page.goto('http://localhost:5173/aptitude?role=software-developer-sde&company=tcs');
    await page.getByRole('button', { name: 'Start session' }).click();
    // Wait for first question
    await expect(page.getByText(/Q1/)).toBeVisible({ timeout: 10_000 });
    // Pick first option
    await page.locator('button:has-text("Option A"), button:has-text("Option B"), button:has-text("Option C"), button:has-text("Option D")').first().click();
    await page.getByRole('button', { name: 'Submit' }).click();
    // See feedback
    await expect(page.getByText(/Correct|Incorrect/)).toBeVisible({ timeout: 5_000 });
    // Move to next question
    await page.getByRole('button', { name: 'Next question' }).click();
    // End the session
    await page.getByRole('button', { name: 'End session' }).click();
    await expect(page.getByText(/Session complete/)).toBeVisible({ timeout: 5_000 });
  });
});
