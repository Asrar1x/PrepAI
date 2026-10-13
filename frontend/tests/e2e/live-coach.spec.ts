import { test, expect } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// The fake camera shows a real portrait photo, so MediaPipe has an actual face to find
const FAKE_VIDEO = resolve('test-results', 'fake-camera-face.mjpeg');
mkdirSync(resolve('test-results'), { recursive: true });
copyFileSync(resolve('public', 'interviewer_male.jpg'), FAKE_VIDEO);

test.use({
  permissions: ['camera', 'microphone'],
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${FAKE_VIDEO}`],
  },
});

const STUDENT = { email: `e2e_coach_${Date.now()}@test.edu`, password: 'Coach12345' };

test.describe('Live camera coach', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('http://127.0.0.1:7857/api/v1/auth/register', {
      data: { email: STUDENT.email, password: STUDENT.password, full_name: 'E2E Coach Student' }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('finds the student\'s face in the browser and gives live tips without errors', async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    const external: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    // Everything the coach needs is served by PrepAI itself: no requests may leave the computer
    page.on('request', r => { if (!/^(http:\/\/(localhost|127\.0\.0\.1)|data:|blob:)/.test(r.url())) external.push(r.url()); });

    await page.goto('/auth');
    await page.getByPlaceholder('you@college.edu').fill(STUDENT.email);
    await page.getByPlaceholder('••••••••').fill(STUDENT.password);
    await page.getByRole('button', { name: /Sign In as/ }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await page.goto('/interview');
    await page.getByRole('button', { name: /Start interview/i }).click();
    await expect(page).toHaveURL(/\/interview\/[a-f0-9]{24}$/, { timeout: 60_000 });

    const coach = page.getByTestId('live-coach');
    await expect(coach).toBeVisible({ timeout: 30_000 });
    // Give the smoother a few seconds of frames
    await page.waitForTimeout(4000);
    const text = await coach.innerText();
    expect(text).toContain('Live coach');
    expect(text, 'the face in the photo should be found').not.toContain('We cannot see your face');
    expect(errors, errors.join('\n')).toEqual([]);
    expect(external, external.join('\n')).toEqual([]);
  });
});
