# Cado — Statuslog

Живий список з "Geplante Änderungen" + нотатки аналізу/тестів/виконання.

**Легенда:** ⏳ planned · 🔍 analysis · 🔧 implementing · 🧪 tested (emu) · 🚢 committed+pushed · ⚠️ blocked

---

## 1. Sphäre — Darstellung 🚢

- **Аналіз:** рендер wireframe з `genSphereWireframe`, завжди поверх (`depthTest` off)
- **Виконання:** 6 паралелей + 8 меридіанів, 48 сегментів на коло — мало ліній, реально кругла
- **Тест:** `tests/e2e/sphere-nav.spec.js` — sphere-before/after screenshots differ
- **Коміти:** `1f5ad9a5`, `c82915ed`, `748b7c32`

## 2. Sphäre — Rotation / Navigation 🚢

- **Аналіз:** arcQ = orientation камери; user-intent = "обертати об'єкт" → потрібен `q0 * dq^{-1}`
- **Виконання:**
  - Inside-drag: Shoemake trackball, модель і сфера рухаються разом із курсором
  - Outside-drag: чистий roll навколо локальної Z камери (view-axis зберігається → обертання строго в площині екрана через центр сфери)
- **Тест:** `middle-drag INSIDE/OUTSIDE` перевіряють `arcQ` delta; outside додатково `col2 dot = 1.0000` (view-axis не змінюється)
- **Коміти:** `c82915ed`, `87d06b90`, `748b7c32`

## 3. Sphäre — Größe & Mittelpunkt 🚢

- **Аналіз:** hardcoded `sphereScale=0.54`; потрібен slider, центр = `target`
- **Виконання:** slider "Kugel" (0.1–1.5) у нижній панелі, `_sphereScale` mutable, sw[12..14] = target
- **Тест:** `sphere size slider exists and updates _sphereScale`
- **Коміти:** `c82915ed`

## 4. Mittelklick auf Modell 🚢

- **Аналіз:** ray-pick → частина/точка; single vs double через timer; face-align = col2(rot) ← normal
- **Виконання:**
  - Ray→tri (Möller-Trumbore) → hit + worldNormal
  - `onMidClick`: single fires після `CLICK_DELAY=220ms` (dual-purpose з double-window — гарантовано one-or-other)
  - Single → `target` анімується до точки (ease-out cubic, 220ms)
  - Double → face-aligned (slerp arcQ)
- **Тест:** `single/double/middle-drag` у `middle-click.spec.js`
- **Коміти:** `c82915ed`, `87d06b90`, `0827cdbf`, `f662cb9f`

## 5. GLB-Eigenschaften 🚢

- **Аналіз:** `parseGLB` треба розширити щоб видавав per-part tri-range, materials
- **Виконання:**
  - `parseGLB` віддає `parts[]` (name, triStart, triCount, materialIdx) + `materials[]` (baseColor, metallic, roughness)
  - `window.glbInfo` глобальний стан
  - Rechtsklick → pickModel → partFromTri → popup з назвою/матеріалом/кольором + зведення по файлу
  - ESC/outside-click закриває
- **Тест:** `glb-info.spec.js` — 6 parts, wood #c4a076, popup містить "wood" і "chair.glb"
- **Коміти:** `14693254`

## 6. Teile-Panel (links) 🔧

- **Аналіз:** таби в `filesPanel` для розділення файлів і частин; highlight через додатковий render pass по `triStart..triCount`
- **Виконання (v1, MVP):**
  - Таби "Dateien" / "Teile"
  - Список з color swatch матеріалу + tri-count
  - Клік → виділити (`selectedPartIdx`), ще клік → зняти
  - Highlight pass: `pSphere` програма з `gl.drawElements` по діапазону, orange overlay без depth-test
- **ВІДКЛАДЕНО на v2:**
  - Створення осі з циліндричної поверхні (треба детекція циліндра по нормалях)
  - Створення площини з 2 осей або осі + системної осі
- **Тест:** `parts-panel.spec.js` — список має 6 item, клік змінює `selectedPartIdx`, screenshot з highlight
- **Коміт:** (в процесі)

## 7. Schnitt als eigene Funktion ⏳

- **Аналіз:** зараз X/Y/Z + слайдер на axis-aligned; треба — довільна площина, збереження
- **План:** додати окремий "Schnitt"-режим, ввімкнути/вимкнути; довільна нормаль (з face pick чи axis); збереження у Firestore
- **Залежить від:** наявності "площин" (item 6 v2)

## 8. Ausrichten-Funktion ⏳

- **Аналіз:** axis align — обертати модель так щоб обрана вісь збіглася з X/Y/Z system; face align — площина паралельна XY/XZ/YZ
- **План:** кнопки "Achse → X/Y/Z" і "Fläche → XY/XZ/YZ" після вибору; використати slerp для плавності

## 9. Schnitt-Erweiterung ⏳

- **Аналіз:** поточні X/Y/Z = перпендикулярно осі = YZ/XZ/XY площина; потрібно явні XY/XZ/YZ-опції
- **План:** перейменувати/додати кнопки з явними назвами площин

---

## Інфраструктура (готова 🚢)

- Playwright E2E + Chromium
- Firebase emulators (auth/firestore/storage) — режим `?test=emu`
- `chair.glb` як fixture (6 boxes, wood material)
- `scripts/deploy-rules.js` — деплой правил через Admin SDK (SA key)
- Auto-commit hook у `.claude/settings.local.json` (виключає `claude-a/`)
- `tests/screens/` — PNG-скріни від Playwright для візуальної перевірки
