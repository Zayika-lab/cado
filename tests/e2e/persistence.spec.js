import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const CHAIR = path.resolve('tests/fixtures/chair.glb');

test('axes + planes persist across reload via Firestore doc', async ({ page, context }) => {
  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', CHAIR);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts/i, { timeout: 15000 });
  await page.waitForTimeout(500);

  // Create 2 axes (use bodies programmatically) and a plane
  await page.evaluate(() => {
    window.createAxisForBody(0); // seat
    window.createAxisForBody(2); // leg-fl
  });
  await page.waitForTimeout(300); // wait for async Firestore updates

  await page.evaluate(() => {
    window.createPlaneFromAxes(window.createdAxes[0], window.createdAxes[1]);
  });
  await page.waitForTimeout(500); // wait for save

  const before = await page.evaluate(() => ({
    axes: window.createdAxes.length,
    planes: window.createdPlanes.length,
  }));
  expect(before.axes).toBe(2);
  expect(before.planes).toBe(1);

  // Reload page
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2500); // wait for file auto-load + scene-objects hook

  const after = await page.evaluate(() => ({
    axes: window.createdAxes?.length ?? 0,
    planes: window.createdPlanes?.length ?? 0,
    firstAxisName: window.createdAxes?.[0]?.name,
    fileCount: document.querySelectorAll('.fpItem').length,
    info: document.getElementById('info')?.textContent,
  }));
  console.log('after reload:', after);
  // Anonymous auth persists via IndexedDB — file + scene should load back.
  expect(after.fileCount).toBeGreaterThan(0);
  expect(after.axes).toBe(2);
  expect(after.planes).toBe(1);
});
