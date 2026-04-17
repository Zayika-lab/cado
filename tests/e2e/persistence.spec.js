import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const CHAIR = path.resolve('tests/fixtures/chair.glb');

test('all generated elements persist (axes + planes + cut + customPlane)', async ({ page }) => {
  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', CHAIR);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts/i, { timeout: 15000 });
  await page.waitForTimeout(500);

  // Create 2 axes and a plane
  await page.evaluate(() => {
    window.createAxisForBody(0);
    window.createAxisForBody(2);
    window.createPlaneFromAxes(window.createdAxes[0], window.createdAxes[1]);
  });
  // Configure cut: enable, pick XZ plane (axis=1), slide to 0.75, then also set a custom face plane
  await page.evaluate(() => {
    // Enable cut
    const chk = document.getElementById('cutEnable');
    chk.checked = true;
    chk.dispatchEvent(new Event('change', { bubbles: true }));
    // Axis XZ → data-a=1
    document.querySelector('.ab[data-a="1"]').click();
    // Slider 0.75
    const s = document.getElementById('cutR');
    s.value = '0.75';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  // Now switch to a custom face-cut plane (Y-normal at y=0.5 on seat top)
  await page.evaluate(() => window.setCustomCutFromFace([0,1,0], [0, 0.5, 0]));
  await page.waitForTimeout(500); // let debounced saves flush

  const before = await page.evaluate(() => ({
    axes: window.createdAxes.length,
    planes: window.createdPlanes.length,
    cutEnabled: window.cutEnabled,
    customN: window.customPlane?.normal,
    customT: window.customPlane?.t?.toFixed(3),
  }));
  console.log('before reload:', before);
  expect(before.axes).toBe(2);
  expect(before.planes).toBe(1);
  expect(before.cutEnabled).toBe(true);
  expect(before.customN[1]).toBeCloseTo(1, 3);

  // Reload page
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2500);

  const after = await page.evaluate(() => ({
    axes: window.createdAxes?.length ?? 0,
    planes: window.createdPlanes?.length ?? 0,
    cutEnabled: window.cutEnabled,
    customN: window.customPlane?.normal,
    customT: window.customPlane?.t?.toFixed(3),
    firstAxisName: window.createdAxes?.[0]?.name,
    cutChecked: document.getElementById('cutEnable').checked,
  }));
  console.log('after reload:', after);
  expect(after.axes).toBe(2);
  expect(after.planes).toBe(1);
  expect(after.cutEnabled).toBe(true);
  expect(after.cutChecked).toBe(true);
  expect(after.customN[1]).toBeCloseTo(1, 3);
  expect(after.customT).toBe(before.customT);
});
