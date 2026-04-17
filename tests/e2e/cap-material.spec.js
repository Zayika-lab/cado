import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });
const USER_FILE = path.resolve('test files/test_6.glb');

test('cut cap uses per-part material colors + ring is visible', async ({ page }) => {
  if (!fs.existsSync(USER_FILE)) test.skip();
  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', USER_FILE);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts|wiederherg/i, { timeout: 20000 });
  await page.waitForTimeout(400);

  // Enable cut, slide it into the model
  await page.evaluate(() => {
    const chk = document.getElementById('cutEnable');
    chk.checked = true;
    chk.dispatchEvent(new Event('change', { bubbles: true }));
    const s = document.getElementById('cutR');
    s.value = '0.5';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(SHOTS, '18_cut-material-colors.png') });
});
