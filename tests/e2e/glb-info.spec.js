import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });
const CHAIR = path.resolve('tests/fixtures/chair.glb');

test('right-click on chair shows part + material info popup', async ({ page }) => {
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });

  // Upload chair.glb through the panel upload input
  await page.setInputFiles('#fpUploadIn', CHAIR);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts/i, { timeout: 15000 });
  await page.waitForTimeout(300);

  // Verify glbInfo populated
  const info = await page.evaluate(() => ({
    fileName: window.glbInfo?.fileName,
    parts: window.glbInfo?.parts?.length,
    materials: window.glbInfo?.materials?.length,
    mat0: window.glbInfo?.materials?.[0]?.name,
    mat0Color: window.glbInfo?.materials?.[0]?.baseColor,
  }));
  console.log('glbInfo:', info);
  expect(info.fileName).toBe('chair.glb');
  expect(info.parts).toBe(6); // seat + backrest + 4 legs
  expect(info.materials).toBe(1);
  expect(info.mat0).toBe('wood');
  // Wood color from generator: [0.55, 0.35, 0.18, 1.0]
  expect(info.mat0Color[0]).toBeCloseTo(0.55, 1);

  // Right-click near the screen center (the chair should be there after upload)
  await page.mouse.move(640, 400);
  await page.mouse.click(640, 400, { button: 'right' });
  await page.waitForTimeout(150);

  // Popup should be visible
  const pop = page.locator('#glbPop');
  await expect(pop).toBeVisible();
  const popText = await pop.textContent();
  console.log('popup text:', popText);
  expect(popText).toMatch(/wood/i);
  expect(popText).toMatch(/chair\.glb/);

  await page.screenshot({ path: path.join(SHOTS, 'glb-info-popup.png') });

  // ESC hides it
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  await expect(pop).toBeHidden();
});
