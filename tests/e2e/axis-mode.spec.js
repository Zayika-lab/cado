import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
const CHAIR = path.resolve('tests/fixtures/chair.glb');

async function load(page) {
  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', CHAIR);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts/i, { timeout: 15000 });
  await page.waitForTimeout(200);
  await page.locator('.fpTab[data-tab="parts"]').click();
}

test('axis-mode button toggles mode + body class', async ({ page }) => {
  await load(page);
  expect(await page.evaluate(() => window.axisMode)).toBe(false);

  await page.locator('#axisModeBtn').click();
  expect(await page.evaluate(() => window.axisMode)).toBe(true);
  await expect(page.locator('body')).toHaveClass(/axisMode/);
  await expect(page.locator('#axisModeBtn')).toHaveClass(/active/);

  // ESC cancels
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.axisMode)).toBe(false);
});

test('cut toggle disables clipping shader coefficients', async ({ page }) => {
  await load(page);
  expect(await page.evaluate(() => window.cutEnabled)).toBe(false);

  // Enable via the cut-row toggle specifically (label wrapping the hidden checkbox)
  await page.locator('.cutRow .cutTog').click();
  expect(await page.evaluate(() => window.cutEnabled)).toBe(true);

  await page.locator('.cutRow .cutTog').click();
  expect(await page.evaluate(() => window.cutEnabled)).toBe(false);
});

test('picking face → "Als Schnittebene" auto-enables cut', async ({ page }) => {
  await load(page);
  // Initial: cut disabled
  expect(await page.evaluate(() => window.cutEnabled)).toBe(false);

  await page.evaluate(() => { window.setCustomCutFromFace([0,1,0], [0, 0.5, 0]); });
  expect(await page.evaluate(() => window.cutEnabled)).toBe(true);
  const checked = await page.locator('#cutEnable').isChecked();
  expect(checked).toBe(true);
});
