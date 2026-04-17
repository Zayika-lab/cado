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

test('cut-plane buttons are labeled XY/XZ/YZ', async ({ page }) => {
  await load(page);
  const y = await page.locator('.ab[data-a="0"]').textContent();
  const x = await page.locator('.ab[data-a="1"]').textContent();
  const z = await page.locator('.ab[data-a="2"]').textContent();
  expect(y.trim()).toBe('YZ');
  expect(x.trim()).toBe('XZ');
  expect(z.trim()).toBe('XY');
});

test('PCA principal direction of a chair leg is roughly vertical', async ({ page }) => {
  await load(page);
  // Legs are parts 2..5 (after seat + backrest)
  const dir = await page.evaluate(() => {
    const p = window.glbInfo.parts[2]; // leg-fl
    return window.__principalDirection(p);
  });
  console.log('leg principal direction:', dir);
  // Leg is 0.05 × 0.45 × 0.05, so principal axis ≈ (0, ±1, 0)
  expect(Math.abs(dir[1])).toBeGreaterThan(0.95);
  expect(Math.abs(dir[0])).toBeLessThan(0.2);
  expect(Math.abs(dir[2])).toBeLessThan(0.2);
});

test('align leg to screen-X rotates the scene so col0(rot)=D_world', async ({ page }) => {
  await load(page);
  // Select the first leg (index 2)
  const items = page.locator('.partItem');
  await items.nth(2).click();
  const dir = await page.evaluate(() => window.__principalDirection(window.glbInfo.parts[2]));

  await page.locator('.alignBtn[data-ax="0"]').click(); // → X
  await page.waitForTimeout(350); // wait for slerp anim

  const col0 = await page.evaluate(() => {
    const [x,y,z,w] = window.__state().arcQ;
    return [1-2*(y*y+z*z), 2*(x*y+z*w), 2*(x*z-y*w)];
  });
  const dot = col0[0]*dir[0] + col0[1]*dir[1] + col0[2]*dir[2];
  console.log('align-X: col0(rot)=', col0, ' D=', dir, ' dot=', dot.toFixed(4));
  // col0 should now equal D_world (up to sign for rare 180° flip edge case)
  expect(Math.abs(dot)).toBeGreaterThan(0.99);

  await page.screenshot({ path: path.join(SHOTS, 'align-leg-to-x.png') });
});
