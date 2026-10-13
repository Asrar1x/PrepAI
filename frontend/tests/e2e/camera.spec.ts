import { test, expect, type Page } from '@playwright/test';

// The webcam panel must never show a silent black box: it is either live or explains what is wrong.
test.use({
  permissions: ['camera', 'microphone'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
});

const STUDENT = { email: `e2e_camera_${Date.now()}@test.edu`, password: 'Camera12345' };

async function openInterview(page: Page) {
  await page.goto('/auth');
  await page.getByPlaceholder('you@college.edu').fill(STUDENT.email);
  await page.getByPlaceholder('••••••••').fill(STUDENT.password);
  await page.getByRole('button', { name: /Sign In as/ }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await page.goto('/interview');
  await page.getByRole('button', { name: /Start interview/i }).click();
  await expect(page).toHaveURL(/\/interview\/[a-f0-9]{24}$/, { timeout: 60_000 });
}

test.describe('Interview camera', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('http://127.0.0.1:7857/api/v1/auth/register', {
      data: { email: STUDENT.email, password: STUDENT.password, full_name: 'E2E Camera Student' }
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('a working camera shows live video and sends a frame', async ({ page }) => {
    test.setTimeout(120_000);
    await openInterview(page);
    await expect(page.getByRole('status').filter({ hasText: 'Camera on' })).toBeVisible({ timeout: 15_000 });
    const size = await page.locator('video[aria-label="Your camera"]').evaluate((v: HTMLVideoElement) => v.videoWidth);
    expect(size).toBeGreaterThan(0);
    await expect(page.getByText(/Evidence frames:\s*[1-9]\d* captured/)).toBeVisible({ timeout: 20_000 });
  });

  const failures: Array<[string, string, RegExp]> = [
    ['blocked', `navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };`, /Camera access is blocked/],
    ['busy', `navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Could not start video source', 'NotReadableError'); };`, /Another app is using your camera/],
    ['no picture', `navigator.mediaDevices.getUserMedia = async () => document.createElement('canvas').captureStream(0);`, /not sending a picture/],
    ['permission prompt not answered', `navigator.mediaDevices.getUserMedia = () => new Promise(() => {});`, /click Allow/],
  ];

  for (const [name, script, message] of failures) {
    test(`camera ${name}: the panel explains what to do`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.addInitScript(script);
      await openInterview(page);
      await expect(page.getByText(message).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('status').filter({ hasText: 'Camera on' })).toHaveCount(0);
    });
  }
});
