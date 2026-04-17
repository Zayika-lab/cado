import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// This test opens the user's private file from 'test files/' (gitignored).
// Skips gracefully if the file isn't there (e.g. on CI).
const USER_FILE = path.resolve('test files/test_6.glb');

test('user file: 1 node + 2 primitives → should produce 1 body', async ({ page }) => {
  if (!fs.existsSync(USER_FILE)) test.skip();

  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });

  await page.setInputFiles('#fpUploadIn', USER_FILE);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts|wiederherg/i, { timeout: 20000 });
  await page.waitForTimeout(300);

  const info = await page.evaluate(() => ({
    parts: window.glbInfo?.parts?.length,
    bodies: window.glbInfo?.bodies?.length,
    bodyNames: window.glbInfo?.bodies?.map(b => b.name),
    partNames: window.glbInfo?.parts?.map(p => p.name),
  }));
  console.log('user-file info:', info);
  expect(info.parts).toBe(2);
  expect(info.bodies).toBe(1);
  expect(info.bodyNames[0]).toBe('Volumenkörper1');
});
