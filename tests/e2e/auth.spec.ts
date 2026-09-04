import { test, expect, type Page } from '@playwright/test';

async function clearLocalStorage(page: Page) {
  await page.goto('http://localhost:5173/auth');
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {}
  });
}

test.describe('Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test('register → login → dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/auth');

    // Sign-in page should show its copy
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Switch to register
    await page.getByRole('button', { name: 'Sign up' }).first().click();

    // Register form
    const uniqueEmail = `e2e_${Date.now()}@test.com`;
    await page.getByPlaceholder('John Doe').fill('Test Student');
    await page.getByLabel('Email Address').fill(uniqueEmail);
    await page.getByLabel('Password').fill('E2Epass123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    // The dashboard greets the new user by full_name (not "Welcome back" — that's sign-in copy).
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Test Student');
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('http://localhost:5173/auth');

    await page.getByLabel('Email Address').fill('e2e_does_not_exist@test.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Error box should appear
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 5000 });
  });
});
