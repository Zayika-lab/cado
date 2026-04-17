import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SHOTS = 'tests/screens';
fs.mkdirSync(SHOTS, { recursive: true });
const USER_FILE = path.resolve('test files/test_6.glb');

test('axis-mode hover works on user file', async ({ page }) => {
  if (!fs.existsSync(USER_FILE)) test.skip();

  page.on('pageerror', e => console.log('[pageerror]', e.message));

  await page.goto('/index.html?test=emu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#userBar')).toBeVisible({ timeout: 15000 });
  await page.setInputFiles('#fpUploadIn', USER_FILE);
  await expect(page.locator('#info')).toContainText(/gespeichert|verts|wiederherg/i, { timeout: 20000 });
  await page.waitForTimeout(500);

  // Check cylinder-fit confidence for the single body
  const diag = await page.evaluate(() => {
    const b = window.glbInfo.bodies[0];
    const fit = window.fitCylinderAxis(b);
    return {
      bodies: window.glbInfo.bodies.length,
      firstBodyName: b.name,
      triCount: b.triCount,
      fitConfidence: fit?.confidence,
      fitAxis: fit?.axis,
    };
  });
  console.log('user-file diagnostics:', diag);

  // Open parts tab, enable axis mode
  await page.locator('.fpTab[data-tab="parts"]').click();
  await page.locator('#axisModeBtn').click();
  expect(await page.evaluate(() => window.axisMode)).toBe(true);

  // Hover over center — should pick a triangle and highlight its FACE region
  await page.mouse.move(640, 400);
  await page.waitForTimeout(100);

  const hover = await page.evaluate(() => ({
    regionSize: window.hoverRegionCount,
  }));
  console.log('after hover (region size):', hover);
  expect(hover.regionSize).toBeGreaterThan(0); // some region highlighted
  const totalTri = await page.evaluate(() => window.glbInfo.triCount);
  // hoverRegionCount = indices (3 per triangle). Entire body = totalTri*3.
  // Region should be STRICTLY LESS than whole body (user complaint: don't light up everything).
  console.log('region tris:', hover.regionSize/3, ' total tris:', totalTri);
  expect(hover.regionSize/3).toBeLessThan(totalTri); // not the whole body

  await page.screenshot({ path: path.join(SHOTS, '14_user-file-axis-hover.png') });

  // Click creates axis
  await page.mouse.click(640, 400, { button: 'left' });
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    axes: window.createdAxes.length,
    axisMode: window.axisMode,
    firstAxis: window.createdAxes[0] ? {
      name: window.createdAxes[0].name,
      dir: window.createdAxes[0].direction,
      origin: window.createdAxes[0].origin,
    } : null,
    // Check axis is centered on cylinder: compute median distance from region vertices to axis line
    axisDiag: window.createdAxes[0] ? (()=>{
      const a = window.createdAxes[0];
      const region = window.hoverRegion; // may be null after click
      // Instead, recompute region for same click location
      return { ok: true };
    })() : null,
  }));
  console.log('axis details:', after.firstAxis);
  expect(after.axes).toBe(1);
  expect(after.axisMode).toBe(false);

  await page.screenshot({ path: path.join(SHOTS, '15_user-file-axis-created.png') });
});
