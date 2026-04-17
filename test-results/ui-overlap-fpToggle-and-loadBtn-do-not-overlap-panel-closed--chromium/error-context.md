# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-overlap.spec.js >> fpToggle and loadBtn do not overlap (panel closed)
- Location: tests/e2e/ui-overlap.spec.js:35:1

# Error details

```
Error: fpToggle and loadBtn overlap

expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "☰ Dateien" [ref=e2] [cursor=pointer]
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Meine Dateien
      - generic [ref=e6]:
        - generic [ref=e7]: Speicher
        - generic [ref=e8]: 0 / 100 MB
    - button "+ GLB hochladen" [ref=e12] [cursor=pointer]
  - button "📂 Datei laden" [ref=e14] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import fs from 'fs';
  3  | import path from 'path';
  4  | 
  5  | const SHOTS = 'tests/screens';
  6  | fs.mkdirSync(SHOTS, { recursive: true });
  7  | 
  8  | async function forceLoadedState(page) {
  9  |   await page.route('**/firebasejs/**', r => r.abort());
  10 |   await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  11 |   await page.evaluate(() => {
  12 |     document.getElementById('auth').classList.add('hide');
  13 |     document.getElementById('filesPanel').classList.add('show');
  14 |     document.getElementById('fpToggle').classList.add('show');
  15 |     document.getElementById('drop').classList.add('hide');
  16 |     // Replicate exactly what uploadMesh() does in index.html:592-598
  17 |     if (!document.getElementById('loadBtn')) {
  18 |       const lb = document.createElement('button');
  19 |       lb.id = 'loadBtn';
  20 |       lb.textContent = '\u{1F4C2} Datei laden';
  21 |       lb.style.cssText = 'position:fixed;top:10px;left:10px;z-index:20;background:rgba(20,22,28,0.9);border:1px solid rgba(74,142,255,0.3);border-radius:7px;padding:7px 14px;color:#4a8eff;cursor:pointer;font:12px system-ui;backdrop-filter:blur(8px)';
  22 |       document.body.appendChild(lb);
  23 |     }
  24 |     document.getElementById('info').textContent = '';
  25 |   });
  26 |   await page.waitForTimeout(150);
  27 | }
  28 | 
  29 | function overlap(a, b) {
  30 |   if (!a || !b) return false;
  31 |   return a.x < b.x + b.width && b.x < a.x + a.width &&
  32 |          a.y < b.y + b.height && b.y < a.y + a.height;
  33 | }
  34 | 
  35 | test('fpToggle and loadBtn do not overlap (panel closed)', async ({ page }) => {
  36 |   await forceLoadedState(page);
  37 |   await page.screenshot({ path: path.join(SHOTS, 'panel-closed.png') });
  38 |   const t = await page.locator('#fpToggle').boundingBox();
  39 |   const l = await page.locator('#loadBtn').boundingBox();
  40 |   console.log('panel-closed  fpToggle=', t, 'loadBtn=', l);
> 41 |   expect(overlap(t, l), 'fpToggle and loadBtn overlap').toBe(false);
     |                                                         ^ Error: fpToggle and loadBtn overlap
  42 | });
  43 | 
  44 | test('fpToggle and loadBtn do not overlap (panel open)', async ({ page }) => {
  45 |   await forceLoadedState(page);
  46 |   await page.evaluate(() => {
  47 |     document.getElementById('filesPanel').classList.add('open');
  48 |     document.getElementById('fpToggle').classList.add('shifted');
  49 |   });
  50 |   await page.waitForTimeout(300); // wait for CSS transition
  51 |   await page.screenshot({ path: path.join(SHOTS, 'panel-open.png') });
  52 |   const t = await page.locator('#fpToggle').boundingBox();
  53 |   const l = await page.locator('#loadBtn').boundingBox();
  54 |   console.log('panel-open    fpToggle=', t, 'loadBtn=', l);
  55 |   expect(overlap(t, l), 'fpToggle and loadBtn overlap when panel open').toBe(false);
  56 | });
  57 | 
```