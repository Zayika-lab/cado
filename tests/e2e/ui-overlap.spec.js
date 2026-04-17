import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });

async function forceLoadedState(page) {
  await page.route('**/firebasejs/**', r => r.abort());
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.getElementById('auth').classList.add('hide');
    document.getElementById('filesPanel').classList.add('show');
    document.getElementById('fpToggle').classList.add('show');
    document.getElementById('drop').classList.add('hide');
    // Replicate exactly what uploadMesh() does in index.html:592-598
    if (!document.getElementById('loadBtn')) {
      const lb = document.createElement('button');
      lb.id = 'loadBtn';
      lb.textContent = '\u{1F4C2} Datei laden';
      lb.style.cssText = 'position:fixed;top:10px;left:10px;z-index:20;background:rgba(20,22,28,0.9);border:1px solid rgba(74,142,255,0.3);border-radius:7px;padding:7px 14px;color:#4a8eff;cursor:pointer;font:12px system-ui;backdrop-filter:blur(8px)';
      document.body.appendChild(lb);
    }
    document.getElementById('info').textContent = '';
  });
  await page.waitForTimeout(150);
}

function overlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.width && b.x < a.x + a.width &&
         a.y < b.y + b.height && b.y < a.y + a.height;
}

test('fpToggle and loadBtn do not overlap (panel closed)', async ({ page }) => {
  await forceLoadedState(page);
  await page.screenshot({ path: path.join(SHOTS, 'panel-closed.png') });
  const t = await page.locator('#fpToggle').boundingBox();
  const l = await page.locator('#loadBtn').boundingBox();
  console.log('panel-closed  fpToggle=', t, 'loadBtn=', l);
  expect(overlap(t, l), 'fpToggle and loadBtn overlap').toBe(false);
});

test('fpToggle and loadBtn do not overlap (panel open)', async ({ page }) => {
  await forceLoadedState(page);
  await page.evaluate(() => {
    document.getElementById('filesPanel').classList.add('open');
    document.getElementById('fpToggle').classList.add('shifted');
  });
  await page.waitForTimeout(300); // wait for CSS transition
  await page.screenshot({ path: path.join(SHOTS, 'panel-open.png') });
  const t = await page.locator('#fpToggle').boundingBox();
  const l = await page.locator('#loadBtn').boundingBox();
  console.log('panel-open    fpToggle=', t, 'loadBtn=', l);
  expect(overlap(t, l), 'fpToggle and loadBtn overlap when panel open').toBe(false);
});
