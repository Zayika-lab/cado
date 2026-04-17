import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });
const CHAIR = path.resolve('tests/fixtures/chair.glb');

async function load(page) {
  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', CHAIR);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts/i, { timeout: 15000 });
  await page.waitForTimeout(200);
  await page.locator('.fpTab[data-tab="parts"]').click();
}

test('cylinder-fit rejects a box (confidence low → fallback to PCA)', async ({ page }) => {
  await load(page);
  const res = await page.evaluate(() => {
    const body = window.glbInfo.bodies[2]; // leg — pure box
    const fit = window.fitCylinderAxis(body);
    return fit ? { confidence: fit.confidence } : null;
  });
  console.log('leg cylinder fit confidence:', res);
  // Leg is a box, not a cylinder → confidence must be well below the 0.85 threshold
  expect(res.confidence).toBeLessThan(0.85);
});

test('createAxisForBody adds an entry rendered via axisVao', async ({ page }) => {
  await load(page);
  const before = await page.evaluate(() => window.createdAxes.length);
  expect(before).toBe(0);

  await page.evaluate(() => window.createAxisForBody(2)); // leg-fl
  await page.waitForTimeout(100);

  const after = await page.evaluate(() => ({
    count: window.createdAxes.length,
    first: window.createdAxes[0] ? {
      dir: window.createdAxes[0].direction,
      name: window.createdAxes[0].name,
    } : null,
  }));
  expect(after.count).toBe(1);
  expect(Math.abs(after.first.dir[1])).toBeGreaterThan(0.9);
  console.log('created axis:', after.first);

  // Axis list in the panel should show the item
  const axItem = page.locator('.axisItem');
  await expect(axItem).toHaveCount(1);

  await page.screenshot({ path: path.join(SHOTS, '13_created-axis.png') });

  // Delete axis
  await page.locator('.axDel').click();
  const finalCount = await page.evaluate(() => window.createdAxes.length);
  expect(finalCount).toBe(0);
});
