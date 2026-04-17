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
}

test('chair.glb has 6 bodies matching 6 parts (one-to-one, separate nodes)', async ({ page }) => {
  await load(page);
  const info = await page.evaluate(() => ({
    parts: window.glbInfo.parts.length,
    bodies: window.glbInfo.bodies.length,
    firstBodyName: window.glbInfo.bodies[0].name,
    firstBodyParts: window.glbInfo.bodies[0].partIndices.length,
    allBodyNames: window.glbInfo.bodies.map(b => b.name),
  }));
  expect(info.parts).toBe(6);
  expect(info.bodies).toBe(6);
  expect(info.firstBodyName).toBe('seat');
  expect(info.firstBodyParts).toBe(1);
  console.log('bodies:', info.allBodyNames);
});

test('setting custom cut plane via face normal activates custom mode', async ({ page }) => {
  await load(page);
  // Simulate picking the seat's top face and using it as cut plane
  await page.evaluate(() => {
    // fake hit with normal (0,1,0) at seat top
    window.setCustomCutFromFace([0,1,0], [0, 0.5, 0]);
  });
  const state = await page.evaluate(() => ({
    custom: window.customPlane ? {
      n: window.customPlane.normal,
      t: window.customPlane.t,
      dMin: window.customPlane.dMin,
      dMax: window.customPlane.dMax,
    } : null,
  }));
  console.log('custom plane state:', state);
  expect(state.custom).not.toBeNull();
  expect(state.custom.n[1]).toBeCloseTo(1, 5);
  expect(state.custom.t).toBeGreaterThan(0);
  expect(state.custom.t).toBeLessThan(1);
});

test('clicking axis button (XY/XZ/YZ) clears custom cut plane', async ({ page }) => {
  await load(page);
  await page.evaluate(() => { window.setCustomCutFromFace([0.7,0.7,0], [0, 0.5, 0]); });
  let hasCustom = await page.evaluate(() => !!window.customPlane);
  expect(hasCustom).toBe(true);

  // Click the XY button (data-a=2, clips along Z)
  await page.locator('.ab[data-a="2"]').click();
  hasCustom = await page.evaluate(() => !!window.customPlane);
  expect(hasCustom).toBe(false);
});
