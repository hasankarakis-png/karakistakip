const { test, expect } = require('@playwright/test');

test('public app shell loads and scripts are served as JavaScript', async ({ page, request }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle(/Günlük Takip/);
  await expect(page.locator('#app')).toBeAttached();
  await expect(page.locator('#splash')).toBeAttached();
  const source = await request.get('/js/boot.js');
  expect(source.status()).toBe(200);
  expect(source.headers()['content-type']).toMatch(/javascript/);
  expect((await source.text())).toContain('function');
});

test('unknown JavaScript must not be replaced by HTML', async ({ request }) => {
  // The Python dev server returns 404. Production Service Worker must also avoid HTML fallback.
  const response = await request.get('/js/__karakis_nonexistent_script__.js');
  expect(response.status()).toBe(404);
});

test('initial page has key mobile-friendly metadata', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain('width=device-width');
  expect(await page.locator('link[rel="manifest"]').getAttribute('href')).toBe('manifest.webmanifest');
});
