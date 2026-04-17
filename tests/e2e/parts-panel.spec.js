import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });
const CHAIR = path.resolve('tests/fixtures/chair.glb');

test('parts panel lists parts, click toggles highlight', async ({ page }) => {
  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', CHAIR);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts/i, { timeout: 15000 });
  await page.waitForTimeout(300);

  // Switch to Teile tab
  await page.locator('.fpTab[data-tab="parts"]').click();
  await expect(page.locator('#fpPartsTab.active')).toBeVisible();

  // chair.glb has 6 parts
  const items = page.locator('.partItem');
  await expect(items).toHaveCount(6);
  const firstName = await items.first().locator('.partName').textContent();
  console.log('first part:', firstName);
  expect(firstName).toBe('seat');

  // No selection initially
  let sel = await page.evaluate(() => window.selectedPartIdx);
  expect(sel).toBe(-1);

  // Click the backrest (index 1)
  await items.nth(1).click();
  sel = await page.evaluate(() => window.selectedPartIdx);
  expect(sel).toBe(1);
  await expect(items.nth(1)).toHaveClass(/active/);

  // Screenshot to show highlight
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS, '11_parts-panel-highlight.png') });

  // Click again to deselect
  await items.nth(1).click();
  sel = await page.evaluate(() => window.selectedPartIdx);
  expect(sel).toBe(-1);
});
