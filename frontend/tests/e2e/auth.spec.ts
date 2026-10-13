import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('register → dashboard greets the new student', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create your student profile' })).toBeVisible();

    const email = `e2e_${Date.now()}@test.edu`;
    await page.getByPlaceholder('Your full name').fill('E2E Student');
    await page.getByPlaceholder('you@college.edu').fill(email);
    await page.getByPlaceholder('Your college').fill('Test College');
    await page.getByPlaceholder('Your branch').fill('Computer Science');
    await page.getByPlaceholder('Graduation year').fill('2026');
    const passwords = page.getByPlaceholder('••••••••');
    await passwords.nth(0).fill('E2Epass123!');
    await passwords.nth(1).fill('E2Epass123!');
    await page.getByRole('button', { name: /Complete Registration/ }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText('E2E Student').first()).toBeVisible();
  });

  test('wrong password shows an error and stays on the sign-in page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await page.getByPlaceholder('you@college.edu').fill(`nobody_${Date.now()}@test.edu`);
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In as Student/ }).click();
    await expect(page.getByText(/No account found|Invalid email or password/)).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('staff sign-in lands on the admin console', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: 'TPO / Admin' }).click();
    await page.getByPlaceholder('you@college.edu').fill('admin@prep.ai');
    await page.getByPlaceholder('••••••••').fill(process.env.ADMIN_PASSWORD || '20062006');
    await page.getByRole('button', { name: /Sign In as Placement Officer/ }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  });

  test('protected pages redirect signed-out visitors', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 10_000 });
  });
});
