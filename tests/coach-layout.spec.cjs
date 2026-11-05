const {test, expect} = require('@playwright/test');
const path = require('node:path');

test('koç menüsü ve profil yüzde yüz yakınlaştırmada ekrana sığar', async ({page}, info) => {
  const mobile = info.project.name === 'mobile-chromium';
  await page.setViewportSize(mobile ? {width:360,height:640} : {width:1366,height:768});
  await page.route('**/supabase.js*', route => route.fulfill({
    path:path.join(__dirname,'mock-supabase.js'), contentType:'application/javascript'
  }));
  await page.route('**/functions/v1/**', route => route.fulfill({json:{}}));
  await page.goto('/');
  const menu = page.locator('.coach-side');
  await expect(menu).toBeAttached();
  const widthFits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  expect(await widthFits()).toBe(true);
  if (mobile) await page.click('#sbtog');
  else expect(await menu.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  await menu.locator('[data-cp="h"]').click();
  await expect(page.locator('#coach-title')).toBeVisible();
  expect(await widthFits()).toBe(true);
  if (!mobile) {
    await page.setViewportSize({width:1024,height:540});
    await menu.locator('.side-mini').click();
    await expect(page.locator('body')).toHaveClass(/sbmini/);
    expect(await widthFits()).toBe(true);
  }
});
