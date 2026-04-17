import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });

// Load viewer with a big triangle spanning the center of the screen, then
// simulate middle-click interactions on it.
async function openWithTriangle(page) {
  await page.route('**/firebasejs/**', r => r.abort());
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.getElementById('auth').classList.add('hide');
    document.getElementById('filesPanel').classList.add('show');
    document.getElementById('fpToggle').classList.add('show');
    // Large triangle in the XY plane, well within the sphere's projected radius
    const positions = new Float32Array([-0.6,-0.4,0.2, 0.6,-0.4,0.2, 0,0.6,0.2]);
    const normals   = new Float32Array([0,0,1, 0,0,1, 0,0,1]);
    const indices   = new Uint16Array([0,1,2]);
    window.uploadMesh(positions, normals, indices);
  });
  await page.waitForTimeout(120);
}

// Play a quick "click" at (x,y): mouse down, immediately up — no motion.
async function midClick(page, x, y) {
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.up({ button: 'middle' });
}

test('single middle-click on model recenters target after 0.3s', async ({ page }) => {
  await openWithTriangle(page);
  const s0 = await page.evaluate(() => window.__state());
  expect(s0.target[0]).toBeCloseTo(0, 3);

  // Click slightly off-center, which should hit the triangle
  await midClick(page, 700, 420);
  // Single-click action is delayed by MID_DELAY (300ms) to distinguish double.
  await page.waitForTimeout(400);

  const s1 = await page.evaluate(() => window.__state());
  const moved = Math.hypot(s1.target[0]-s0.target[0], s1.target[1]-s0.target[1], s1.target[2]-s0.target[2]);
  console.log('after single-click target:', s1.target, 'moved by', moved.toFixed(4));
  expect(moved).toBeGreaterThan(0.01);
});

test('double middle-click aligns face (arcQ changes) and recenters', async ({ page }) => {
  await openWithTriangle(page);
  const s0 = await page.evaluate(() => window.__state());

  // Two clicks < 300ms apart at screen center → double-click → face align
  await midClick(page, 640, 400);
  await page.waitForTimeout(60);
  await midClick(page, 640, 400);
  await page.waitForTimeout(80);

  const s1 = await page.evaluate(() => window.__state());
  const dq = 1 - Math.abs(s0.arcQ[0]*s1.arcQ[0] + s0.arcQ[1]*s1.arcQ[1] + s0.arcQ[2]*s1.arcQ[2] + s0.arcQ[3]*s1.arcQ[3]);
  console.log('double-click arcQ-delta:', dq.toFixed(4), 'new arcQ:', s1.arcQ);
  expect(dq).toBeGreaterThan(0.001);

  // After face-align, camera view direction (-col2 of rot) should roughly
  // match the triangle's normal (+Z in world).
  const arcQ = s1.arcQ;
  const [x,y,z,w] = arcQ;
  const col2z = 1-2*(x*x+y*y); // rot[10]
  console.log('rot[10] (expected ~1 if face-aligned to +Z):', col2z.toFixed(4));
  expect(col2z).toBeGreaterThan(0.95);
});

test('middle-drag does NOT trigger recenter', async ({ page }) => {
  await openWithTriangle(page);
  const s0 = await page.evaluate(() => window.__state());

  // Middle-drag (explicit motion) — should rotate, not recenter
  await page.mouse.move(640, 400);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(700, 440, { steps: 8 });
  await page.mouse.up({ button: 'middle' });
  await page.waitForTimeout(400); // wait past MID_DELAY

  const s1 = await page.evaluate(() => window.__state());
  const moved = Math.hypot(s1.target[0]-s0.target[0], s1.target[1]-s0.target[1], s1.target[2]-s0.target[2]);
  console.log('after middle-drag: target-delta=', moved.toFixed(6));
  expect(moved).toBeLessThan(1e-6); // target must stay put
});
