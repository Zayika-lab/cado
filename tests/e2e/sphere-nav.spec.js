import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });

// Bring up the viewer in a post-login, mesh-loaded state without any Firebase.
async function openLoaded(page) {
  await page.route('**/firebasejs/**', r => r.abort());
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.getElementById('auth').classList.add('hide');
    document.getElementById('filesPanel').classList.add('show');
    document.getElementById('fpToggle').classList.add('show');
    const positions = new Float32Array([-1,-1,0, 1,-1,0, 0,1,0]);
    const normals   = new Float32Array([0,0,1, 0,0,1, 0,0,1]);
    const indices   = new Uint16Array([0,1,2]);
    window.uploadMesh(positions, normals, indices);
  });
  await page.waitForTimeout(120);
}

test('sphere size slider exists and updates _sphereScale', async ({ page }) => {
  await openLoaded(page);
  await expect(page.locator('#sphR')).toBeVisible();
  await expect(page.locator('#sphV')).toHaveText('0.54');

  const before = await page.evaluate(() => window.__state().sphereScale);
  await page.evaluate(() => {
    const el = document.getElementById('sphR');
    el.value = '1.20';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const after = await page.evaluate(() => window.__state().sphereScale);
  await expect(page.locator('#sphV')).toHaveText('1.20');
  console.log('sphereScale before=', before, ' after=', after);
  expect(before).toBeCloseTo(0.54, 2);
  expect(after).toBeCloseTo(1.20, 2);

  await page.screenshot({ path: path.join(SHOTS, '09_sphere-slider-1.2.png') });
});

async function qDelta(a, b) {
  // crude rotation-change metric: 1 - |dot(a,b)|  (0 = no rotation)
  const d = Math.abs(a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3]);
  return 1 - d;
}

test('middle-drag INSIDE sphere rotates (arcball) and sphere visually rotates', async ({ page }) => {
  await openLoaded(page);
  const q0 = await page.evaluate(() => window.__state().arcQ);
  await page.screenshot({ path: path.join(SHOTS, '07_sphere-before.png') });

  // Viewport 1280×800, sphere r = 800*0.54/2 = 216px, center (640,400)
  // Drag from (640,400) → (780,470) → both inside sphere, bigger motion for visible change.
  await page.mouse.move(640, 400);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(780, 470, { steps: 10 });
  await page.mouse.up({ button: 'middle' });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(SHOTS, '08_sphere-after.png') });

  const q1 = await page.evaluate(() => window.__state().arcQ);
  const delta = await qDelta(q0, q1);
  console.log('inside-drag delta=', delta.toFixed(4));
  expect(delta).toBeGreaterThan(0.001);

  // Visual rotation check: the two saved screenshots must differ in the
  // sphere region (otherwise the sphere appears static despite arcQ changing).
  const fs2 = await import('fs');
  const bef = fs2.readFileSync(path.join(SHOTS, '07_sphere-before.png'));
  const aft = fs2.readFileSync(path.join(SHOTS, '08_sphere-after.png'));
  const differ = bef.length !== aft.length || !bef.equals(aft);
  console.log('screenshots differ:', differ, ' before=', bef.length, ' after=', aft.length);
  expect(differ, 'sphere rendered identically before and after rotation').toBe(true);
});

test('middle-drag OUTSIDE sphere rotates around screen-Z (pure roll, view axis preserved)', async ({ page }) => {
  await openLoaded(page);
  const q0 = await page.evaluate(() => window.__state().arcQ);

  // Move from (640,100) to (900,100) — both ≥ 250px from center → outside.
  await page.mouse.move(640, 100);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(900, 100, { steps: 8 });
  await page.mouse.up({ button: 'middle' });
  await page.waitForTimeout(80);

  const q1 = await page.evaluate(() => window.__state().arcQ);
  const delta = await qDelta(q0, q1);
  console.log('outside-drag delta=', delta.toFixed(4));
  expect(delta).toBeGreaterThan(0.001);

  // col2 of rot(arcQ) = view direction in world — must be preserved (pure roll).
  const col2 = q => {
    const [x,y,z,w] = q;
    return [2*(x*z+y*w), 2*(y*z-x*w), 1-2*(x*x+y*y)];
  };
  const [a0,b0,c0] = col2(q0);
  const [a1,b1,c1] = col2(q1);
  const axisDot = a0*a1 + b0*b1 + c0*c1; // should be ~1 (same direction)
  console.log('col2 dot (preserved view-axis):', axisDot.toFixed(6));
  expect(axisDot).toBeGreaterThan(0.9999); // view axis must not tilt
});

test('left-drag pans (target moves), does NOT rotate', async ({ page }) => {
  await openLoaded(page);
  const s0 = await page.evaluate(() => window.__state());

  await page.mouse.move(640, 400);
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(750, 500, { steps: 6 });
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(80);

  const s1 = await page.evaluate(() => window.__state());
  const dt = Math.hypot(s1.target[0]-s0.target[0], s1.target[1]-s0.target[1], s1.target[2]-s0.target[2]);
  const dq = await qDelta(s0.arcQ, s1.arcQ);
  console.log('left-drag target-delta=', dt.toFixed(4), ' q-delta=', dq.toFixed(6));
  expect(dt).toBeGreaterThan(0.001);
  expect(dq).toBeLessThan(1e-6);
});

test('wheel zooms (oSize changes)', async ({ page }) => {
  await openLoaded(page);
  const o0 = await page.evaluate(() => window.__state().oSize);
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(60);
  const o1 = await page.evaluate(() => window.__state().oSize);
  console.log('zoom oSize', o0, '→', o1);
  expect(o1).not.toBeCloseTo(o0, 5);
});
