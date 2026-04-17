import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });
const USER_FILE = path.resolve('test files/test_5_mak.glb');

test('render quality on user assembly (test_5_mak.glb)', async ({ page }) => {
  if (!fs.existsSync(USER_FILE)) test.skip();
  test.setTimeout(120_000);

  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', USER_FILE);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts|wiederherg/i, { timeout: 60000 });
  await page.waitForTimeout(1500);

  const info = await page.evaluate(() => ({
    bodies: window.glbInfo?.bodies?.length,
    parts: window.glbInfo?.parts?.length,
    mats: window.glbInfo?.materials?.length,
    triCount: window.glbInfo?.triCount,
    firstMats: window.glbInfo?.materials?.slice(0, 8).map(m => ({ name: m.name, col: m.baseColor.map(v=>v.toFixed(2)).join(',') })),
  }));
  console.log('assembly info:', info);

  await page.screenshot({ path: path.join(SHOTS, '19_assembly-default.png') });
});
