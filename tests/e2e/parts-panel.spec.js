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

  // chair.glb has 6 bodies shown as tree items
  const items = page.locator('.treeItem');
  await expect(items).toHaveCount(6);
  const firstName = await items.first().locator('.tName').textContent();
  console.log('first part:', firstName);
  expect(firstName).toBe('seat');

  // No selection initially
  let selCount = await page.evaluate(() => window.selectedBodies.size);
  expect(selCount).toBe(0);

  // Click the backrest (index 1)
  await items.nth(1).click();
  const selHas1 = await page.evaluate(() => window.selectedBodies.has(1));
  expect(selHas1).toBe(true);
  await expect(items.nth(1)).toHaveClass(/active/);

  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS, '11_parts-panel-highlight.png') });

  // Click again to deselect
  await items.nth(1).click();
  selCount = await page.evaluate(() => window.selectedBodies.size);
  expect(selCount).toBe(0);
});
