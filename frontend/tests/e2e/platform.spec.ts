import { test, expect, type Page } from '@playwright/test';

// Every screen must render real content with no runtime errors, crash screens or failed API calls.
const STUDENT_ROUTES = [
  '/dashboard', '/roles', '/companies', '/aptitude', '/aptitude/history', '/aptitude/daily',
  '/interview', '/resume', '/resume/score', '/resume/bullets', '/analytics/progress',
  '/gamification', '/profile', '/profile/notifications'
];
const ADMIN_ROUTES = [
  '/admin', '/admin/batches', '/admin/students', '/admin/questions/upload',
  '/admin/drives', '/admin/events', '/admin/reports'
];

async function signIn(page: Page, email: string, password: string, staff = false) {
  await page.goto('/auth');
  if (staff) await page.getByRole('button', { name: 'TPO / Admin' }).click();
  await page.getByPlaceholder('you@college.edu').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /Sign In as/ }).click();
  await expect(page).toHaveURL(staff ? /\/admin/ : /\/dashboard/, { timeout: 15_000 });
}

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    // Browser-level resource noise (e.g. aborted media) is not an app error; API failures are caught below
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  page.on('response', r => {
    if (r.url().includes('/api/v1/') && r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return errors;
}

async function visitAll(page: Page, routes: string[], errors: string[]) {
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page, `${route} redirected away`).toHaveURL(new RegExp(route.replace(/\//g, '\\/') + '$'));
    await expect(page.getByText('Something went wrong'), `${route} crashed`).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Page not found' }), `${route} is a 404`).toHaveCount(0);
    expect((await page.locator('main, #root').first().innerText()).trim().length, `${route} rendered nothing`).toBeGreaterThan(20);
  }
  expect(errors, errors.join('\n')).toEqual([]);
}

// A fresh student account per run: the app ships no demo accounts
const STUDENT = { email: `e2e_platform_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.edu`, password: 'Platform12345' };

test.describe('Platform screens', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('http://127.0.0.1:7857/api/v1/auth/register', {
      data: { email: STUDENT.email, password: STUDENT.password, full_name: 'E2E Platform Student' }
    });
    if (res.status() !== 409) {
      expect(res.ok(), await res.text()).toBeTruthy();
    }
  });

  test('landing page renders', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('every student screen renders without errors', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await signIn(page, STUDENT.email, STUDENT.password);
    await visitAll(page, STUDENT_ROUTES, errors);
  });

  test('every admin screen renders without errors', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await signIn(page, 'admin@prep.ai', process.env.ADMIN_PASSWORD || '20062006', true);
    await visitAll(page, ADMIN_ROUTES, errors);
  });

  test('students cannot open the admin console', async ({ page }) => {
    await signIn(page, STUDENT.email, STUDENT.password);
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin$/, { timeout: 10_000 });
  });

  test('unknown routes show the 404 page', async ({ page }) => {
    await signIn(page, STUDENT.email, STUDENT.password);
    await page.goto('/definitely-not-a-page');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });



  test('light mode keeps page headings readable and every page fits a phone screen', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('prepai_theme', 'light'));
    await page.setViewportSize({ width: 375, height: 800 });
    await signIn(page, STUDENT.email, STUDENT.password);
    for (const route of ['/', '/dashboard', '/interview', '/aptitude', '/resume']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      // Pages show a loading placeholder first; measure the real heading once it has rendered
      await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15_000 });
      const { ratio, overflow } = await page.evaluate(() => {
        const ctx = document.createElement('canvas').getContext('2d')!;
        const rgb = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3); };
        const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        const h1 = document.querySelector('h1')!;
        let el: Element | null = h1;
        let bg = 'rgb(255, 255, 255)';
        while (el) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\(.*, 0\)|transparent/.test(c)) { bg = c; break; } el = el.parentElement; }
        const a = lum(rgb(getComputedStyle(h1).color)), b = lum(rgb(bg));
        return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      expect(ratio, `${route} heading contrast`).toBeGreaterThanOrEqual(4.5);
      expect(overflow, `${route} scrolls sideways`).toBeLessThanOrEqual(0);
    }
  });
});
