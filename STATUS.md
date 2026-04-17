# Cado — Statuslog

> 🔔 **AWAITING YOU** — #7 v1 (custom cut plane), bodies-grouping фікс ("1 файл = 1 body, не 2"), 21/21 тестів ✅, запушено. Перевір в браузері: правий клік по грані → "Diese Fläche als Schnittebene".

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

## 7. Schnitt als eigene Funktion 🚢 (v1, без persistence)

- **Аналіз:** зараз X/Y/Z + слайдер; треба довільна нормаль. Рефакторнув усе через
  `cutNormal()`/`cutD()` (generic plane equation N·p = d). Shader uClip не
  міняв — обчислюю `cv4=[-N, d]` на CPU.
- **Виконання:**
  - `customPlane = { normal, dMin, dMax, t }` — null якщо axis-aligned
  - `setCustomCutFromFace(N, P0)` зберігає нормаль, обчислює dMin/dMax як проєкцію bbox
  - `capMat()`, `computeContour()`, pickModel — усі generic plane
  - У popup додано "Diese Fläche als Schnittebene" (не на cap-hit)
  - Slider керує `customPlane.t` якщо custom, інакше `clipT`
  - XY/XZ/YZ-кнопки очищають custom (clearCustomCut) і повертають axis-mode
- **ВІДКЛАДЕНО:** збереження площин на сервері (Firestore doc per user)
- **Тест:** `custom-cut.spec.js` — activates custom, clears on axis click
- **Коміти:** (в процесі)

## Фікс: "один файл = один body" 🚢

- **Аналіз:** користувач завантажив один GLB з одним node/multi-primitive і бачив 2 "частини". parseGLB віддавав parts[] по кожному primitive.
- **Виконання:** додано `bodies[]` — групує послідовні parts з однаковим `name` (один GLB-node) в один body. `materialIdxs[]` агрегує всі матеріали, `triStart/triCount` покриває всі primitives. Teile-панель показує bodies (не parts); highlight і alignPartTo працюють на body; popup і partFromTri лишились на primitive-рівні (щоб показувати материал клікнутого primitive).
- **Тест:** `custom-cut.spec.js` — chair 6 parts = 6 bodies (1:1 оскільки усі в окремих нодах)
- **Коміти:** (в процесі)

## 8. Ausrichten-Funktion 🚢

- **Аналіз:** axis align — обертати сцену так щоб primary direction обраної частини була вздовж screen-X/Y/Z; face align вже був реалізований у #4
- **Виконання:**
  - `principalDirection(part)`: PCA через power-iteration на вершинах частини
  - `alignPartTo(axisIdx)`: r_local rotates e_i → cs_D; apply as `arcQ = arcQ * r` → col_i(rot) = D_world
  - Кнопки "Achse → X/Y/Z" у Teile-панелі, з'являються коли частина обрана
  - Плавна slerp-анімація через startNavAnim
- **Тест:** `align.spec.js` — leg's PCA direction ≈ (0,±1,0); після "→ X" col0·D ≈ 1.0
- **Коміти:** (в процесі)

## 9. Schnitt-Erweiterung 🚢

- **Аналіз:** X/Y/Z = перпендикулярно осі = YZ/XZ/XY площина; перейменовано кнопки
- **Виконання:** "YZ" / "XZ" / "XY" як текст кнопок + tooltip який пояснює відповідну перпендикулярну вісь
- **Тест:** `align.spec.js` перевіряє текст кнопок
- **Коміти:** (в процесі)

## Додатково: click/right-click на Schnittfläche 🚢

- **Аналіз:** pickModel має впізнавати cap (поверхню розрізу), бо розріз — це видима "поверхня"
- **Виконання:**
  - Збираємо ВСІ ray-triangle intersections
  - Рахуємо скільки їх до cap-plane (непарно = всередині моделі → cap видимий тут)
  - Якщо cap ближче першого kept-hit і всередині bbox → cap hit з normal=±e_clipAxis
  - Double-click на cap → face-align = поворот екрана паралельно розрізу (бо normal уже axis-aligned)
  - Right-click на cap → popup "Schnittfläche" замість "Teil"
- **Тест:** `cap-pick.spec.js`
- **Коміти:** (в процесі)

---

## Інфраструктура (готова 🚢)

- Playwright E2E + Chromium
- Firebase emulators (auth/firestore/storage) — режим `?test=emu`
- `chair.glb` як fixture (6 boxes, wood material)
- `scripts/deploy-rules.js` — деплой правил через Admin SDK (SA key)
- Auto-commit hook у `.claude/settings.local.json` (виключає `claude-a/`)
- `tests/screens/` — PNG-скріни від Playwright для візуальної перевірки
