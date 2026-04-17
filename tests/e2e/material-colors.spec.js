import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });
const CHAIR = path.resolve('tests/fixtures/chair.glb');
const USER_FILE = path.resolve('test files/test_6.glb');

test('chair renders with wood material color (not default blue)', async ({ page }) => {
  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', CHAIR);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts/i, { timeout: 15000 });
  await page.waitForTimeout(500);

  // Verify material data is accessible
  const mat = await page.evaluate(() => window.glbInfo?.materials?.[0]);
  console.log('material:', mat);
  expect(mat.baseColor[0]).toBeCloseTo(0.55, 1);
  expect(mat.baseColor[1]).toBeCloseTo(0.35, 1);
  expect(mat.baseColor[2]).toBeCloseTo(0.18, 1);

  await page.screenshot({ path: path.join(SHOTS, '16_chair-wood-color.png') });
});

test('user file renders with its 2 material colors', async ({ page }) => {
  if (!fs.existsSync(USER_FILE)) test.skip();
  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', USER_FILE);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts|wiederherg/i, { timeout: 20000 });
  await page.waitForTimeout(500);

  const info = await page.evaluate(() => ({
    parts: window.glbInfo.parts.map(p => ({ idx: p.materialIdx, tris: p.triCount })),
    mats: window.glbInfo.materials.map(m => ({ name: m.name, color: m.baseColor })),
  }));
  console.log('user file materials:', info);
  expect(info.mats.length).toBe(2);
  // The user file has "Default" (gray) and "Default1" (blue)
  expect(info.mats[0].color[0]).toBeCloseTo(0.596, 2);
  expect(info.mats[1].color[2]).toBeCloseTo(1.0, 2); // blue channel

  await page.screenshot({ path: path.join(SHOTS, '17_user-file-colored.png') });
});
