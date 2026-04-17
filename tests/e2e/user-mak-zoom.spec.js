import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });
const USER_FILE = path.resolve('test files/test_5_mak.glb');

test('zoom + cut on user assembly (close-up)', async ({ page }) => {
  if (!fs.existsSync(USER_FILE)) test.skip();
  test.setTimeout(120_000);

  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', USER_FILE);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts|wiederherg/i, { timeout: 60000 });
  await page.waitForTimeout(1500);

  // Zoom in by setting oSize to a smaller value (smaller ortho frustum = bigger model)
  const bbInfo = await page.evaluate(() => {
    // Look at the model's bbox to find a good zoom + cut position
    return { bMin: window.bMin, bMax: window.bMax, maxDim: window.maxDim, oSize: window.oSize };
  });
  console.log('bbox:', bbInfo);

  // Enable cut and position it roughly through the middle
  await page.evaluate(() => {
    // Smaller oSize = closer camera view
    window.oSize = window.oSize * 0.35;
    // Enable cut
    const chk = document.getElementById('cutEnable');
    chk.checked = true;
    chk.dispatchEvent(new Event('change', { bubbles: true }));
    // Pick XZ plane (data-a=1 → clipAxis=1, plane perpendicular to Y)
    document.querySelector('.ab[data-a="1"]').click();
    const s = document.getElementById('cutR');
    s.value = '0.5';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(SHOTS, '20_assembly-cut-zoom.png') });

  // Also one without cut for reference
  await page.evaluate(() => {
    const chk = document.getElementById('cutEnable');
    chk.checked = false;
    chk.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, '21_assembly-zoom-nocut.png') });
});
