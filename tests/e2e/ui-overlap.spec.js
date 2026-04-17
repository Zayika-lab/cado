import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });

async function openWithLoadedMesh(page) {
  // Block Firebase CDN so auth script doesn't run; viewer script is independent
  await page.route('**/firebasejs/**', r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('[console] ' + msg.text());
  });

  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  // Force the post-login UI state that the auth module would normally set
  await page.evaluate(() => {
    document.getElementById('auth').classList.add('hide');
    document.getElementById('filesPanel').classList.add('show');
    document.getElementById('fpToggle').classList.add('show');
  });

  // Call the real uploadMesh() (global from inline script) with a tiny triangle —
  // this triggers the real #loadBtn creation code we're testing.
  await page.evaluate(() => {
    const positions = new Float32Array([-1,-1,0, 1,-1,0, 0,1,0]);
    const normals   = new Float32Array([0,0,1, 0,0,1, 0,0,1]);
    const indices   = new Uint16Array([0,1,2]);
    window.uploadMesh(positions, normals, indices);
  });

  await page.waitForTimeout(150);
  return { errors };
}

function overlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.width && b.x < a.x + a.width &&
         a.y < b.y + b.height && b.y < a.y + a.height;
}

test('fpToggle and loadBtn do not overlap — panel CLOSED', async ({ page }) => {
  const { errors } = await openWithLoadedMesh(page);
  await page.screenshot({ path: path.join(SHOTS, '01_overlap-panel-closed.png') });
  const t = await page.locator('#fpToggle').boundingBox();
  const l = await page.locator('#loadBtn').boundingBox();
  console.log('closed  fpToggle=', t, ' loadBtn=', l, ' errors=', errors.length);
  expect(l, '#loadBtn missing → uploadMesh did not run').not.toBeNull();
  expect(overlap(t, l), 'fpToggle overlaps loadBtn').toBe(false);
});

test('fpToggle and loadBtn do not overlap — panel OPEN', async ({ page }) => {
  await openWithLoadedMesh(page);
  await page.evaluate(() => {
    document.getElementById('filesPanel').classList.add('open');
    document.getElementById('fpToggle').classList.add('shifted');
  });
  await page.waitForTimeout(350); // CSS transition 220ms
  await page.screenshot({ path: path.join(SHOTS, '02_overlap-panel-open.png') });
  const t = await page.locator('#fpToggle').boundingBox();
  const l = await page.locator('#loadBtn').boundingBox();
  console.log('open    fpToggle=', t, ' loadBtn=', l);
  expect(overlap(t, l), 'fpToggle overlaps loadBtn when panel is open').toBe(false);
});
