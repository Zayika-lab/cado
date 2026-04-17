import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });

const CHAIR = path.resolve('tests/fixtures/chair.glb');

test('upload → list → open → delete (emulator, anonymous auth)', async ({ page }) => {
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });

  // Wait for anonymous sign-in to complete → userBar becomes visible
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: path.join(SHOTS, '03_emu-after-login.png') });

  // Panel should auto-open after login (onAuthStateChanged adds .open)
  await expect(page.locator('#filesPanel.open')).toBeVisible();

  // Upload the generated chair.glb via the panel's hidden file input
  await page.setInputFiles('#fpUploadIn', CHAIR);

  // Wait until info text confirms the save completed
  await expect(page.locator('#info')).toContainText(/gespeichert/i, { timeout: 15000 });
  await page.screenshot({ path: path.join(SHOTS, '04_emu-uploaded.png') });

  // File item appears in the list
  const items = page.locator('#fpList .fpItem');
  await expect(items).toHaveCount(1);
  await expect(items.first().locator('.fpName')).toHaveText('chair.glb');

  // Re-open (click the item) — tests the read/getBytes path
  await items.first().click();
  await expect(page.locator('#info')).toContainText(/chair\.glb/, { timeout: 10000 });
  await page.screenshot({ path: path.join(SHOTS, '05_emu-opened.png') });

  // Delete: confirm dialog → accept, then list should go empty
  page.once('dialog', d => d.accept());
  await items.first().locator('.fpDel').click({ force: true });
  await expect(items).toHaveCount(0, { timeout: 10000 });

  // Info must NOT contain "Löschen blockiert"
  const info = await page.locator('#info').textContent();
  console.log('final info =', JSON.stringify(info));
  expect(info || '').not.toMatch(/Löschen blockiert|permission-denied/);

  await page.screenshot({ path: path.join(SHOTS, '06_emu-after-delete.png') });

  // Surface any console errors that weren't Firebase-auth related
  const badErrors = logs.filter(l => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  if (badErrors.length) console.log('console errors:\n' + badErrors.join('\n'));
});
