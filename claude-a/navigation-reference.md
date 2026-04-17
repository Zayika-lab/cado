# CAD Viewer — Навігація, Arcball-сфера та зв'язок з координатними осями

Повний довідник, зібраний з усіх чатів проекту. Призначено для передачі в інший проект.

---

## 1. АРХІТЕКТУРА СЦЕНИ (критично для розуміння)

Три ієрархічні вузли, які треба розрізняти:

```
scene
├── pivot          (THREE.Group) — центр обертання, на нього копіюється arcball.q
│   └── partsGroup — містить усі меші моделі, зміщений у локальних координатах
├── axes           (AxesHelper)  — окремо від pivot, сидить у світовому просторі
├── sphere         (wireframe)   — окремо, йде за target, масштабується від камери
├── sphereRing     (RingGeometry)— екваторне кільце, завжди дивиться в камеру
└── outlineGroup, capScene ...   (для clipping, не стосується навігації)

camera — дивиться на target
target (Vector3) — точка, навколо якої обертається камера і де сидить сфера
```

**Ключове:**
- `target` — це point-of-interest камери. Сфера завжди там.
- `pivot.position` — дорівнює `target` (pivot = точка обертання моделі).
- `partsGroup.position` — зміщення **від pivot до центру моделі** в локальних координатах pivot. Коли клацаєш середньою кнопкою для recenter, змінюється `target` + `partsGroup.position` компенсується, щоб модель візуально не стрибнула.

---

## 2. ARCBALL КЛАС (повний, фінальна версія)

Shoemake trackball з коректним screen-Z roll ззовні сфери, `atan2`-нормалізацією дельти та безшовним переходом inside↔outside.

```javascript
class Arcball {
  constructor(){ this.q = new THREE.Quaternion(); this._on = false; }

  // Shoemake-проекція точки екрана на одиничну сферу
  _proj(mx, my, cx, cy, r){
    const x = (mx - cx) / r, y = -(my - cy) / r, d = x*x + y*y;
    if(d > 1){ const s = 1/Math.sqrt(d); return new THREE.Vector3(x*s, y*s, 0); }
    return new THREE.Vector3(x, y, Math.sqrt(1 - d));
  }

  _isOut(mx, my){ return Math.hypot(mx - this._cx, my - this._cy) > this._r; }

  // Нормалізація кутової дельти, щоб не було стрибків при перетині ±π
  _wrapDelta(d){ return Math.atan2(Math.sin(d), Math.cos(d)); }

  _initOutside(mx, my, camQ){
    this._startAngle = Math.atan2(-(my - this._cy), mx - this._cx);
    // Вісь обертання = нормаль до екрана (до камери) у world-space
    // ВАЖЛИВО: (0,0,1) а НЕ (0,0,-1), щоб обертання співпадало з напрямком миші
    this._spinAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(camQ).normalize();
  }

  _initInside(mx, my){
    this._v0 = this._proj(mx, my, this._cx, this._cy, this._r);
  }

  begin(mx, my, cx, cy, r, camQ){
    this._on = true; this._cx = cx; this._cy = cy; this._r = r;
    this._camQ = camQ;
    this._q0 = this.q.clone();
    this._outside = this._isOut(mx, my);
    if(this._outside) this._initOutside(mx, my, camQ);
    else this._initInside(mx, my);
  }

  move(mx, my, camQ){
    if(!this._on) return;
    if(camQ) this._camQ = camQ;

    const nowOut = this._isOut(mx, my);
    // ── Безшовний перехід inside ↔ outside ──
    // Зберігаємо поточний q як нову базу, ініціалізуємо новий режим
    if(nowOut !== this._outside){
      this._q0 = this.q.clone();
      this._outside = nowOut;
      if(nowOut) this._initOutside(mx, my, this._camQ);
      else this._initInside(mx, my);
      return;
    }

    if(this._outside){
      const angle = Math.atan2(-(my - this._cy), mx - this._cx);
      const delta = this._wrapDelta(angle - this._startAngle);
      const dq = new THREE.Quaternion().setFromAxisAngle(this._spinAxis, delta);
      this.q.copy(dq).multiply(this._q0).normalize();
    } else {
      const v1 = this._proj(mx, my, this._cx, this._cy, this._r);
      const axis = new THREE.Vector3().crossVectors(this._v0, v1);
      if(axis.lengthSq() < 1e-12) return;
      axis.normalize();
      const a = Math.acos(THREE.MathUtils.clamp(this._v0.dot(v1), -1, 1));
      const dq = new THREE.Quaternion().setFromAxisAngle(axis, a);
      this.q.copy(dq).multiply(this._q0).normalize();
    }
  }

  end(){ this._on = false; }
  get active(){ return this._on; }
}
```

### Hard-won уроки по Arcball:
- **`(0,0,1)` а не `(0,0,-1)`** для spinAxis — інакше обертання ззовні сфери йде в протилежний бік від миші.
- **`atan2(sin(d), cos(d))` нормалізація** — прибирає ривок при перетині межі ±π.
- **Передавати `camQ` в `move()`** — щоб при обертанні камери spinAxis залишався перпендикулярним до поточного екрана.
- **Зберігати `q0` при переході inside↔outside** — інакше стрибок орієнтації при перетині межі сфери.

---

## 3. СФЕРА — налаштування та зв'язок з осями

### Створення (один раз в конструкторі App):

```javascript
// ── Wireframe-сфера (візуалізація Arcball) ──
this.sphere = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1, 3),
  new THREE.MeshBasicMaterial({
    wireframe: true,
    color: 0x4a8eff,
    opacity: 0.16,
    transparent: true,
    depthTest: false          // завжди поверх моделі
  })
);
this.sphere.renderOrder = 998;
this.scene.add(this.sphere);   // у scene, а НЕ в pivot — так простіше масштабувати

// ── Екваторне кільце (завжди face-camera) ──
this.sphereRing = new THREE.Mesh(
  new THREE.RingGeometry(0.98, 1.0, 96),
  new THREE.MeshBasicMaterial({
    color: 0x4a8eff,
    opacity: 0.35,
    transparent: true,
    depthTest: false,
    side: THREE.DoubleSide
  })
);
this.sphereRing.renderOrder = 999;
this.scene.add(this.sphereRing);

// ── Система координат ──
this.axes = new THREE.AxesHelper(1);
this.scene.add(this.axes);
```

### Налаштування розміру через слайдер:

```html
<div class="srow">
  <span class="lbl">Sphere</span>
  <input type="range" id="sphereSize" min="0.1" max="1.5" step="0.05" value="0.54">
  <span class="val" id="sphereSizeV">0.54</span>
</div>
```

```javascript
this._sphereScale = 0.54;  // default

$('sphereSize').oninput = e => {
  this._sphereScale = +e.target.value;
  $('sphereSizeV').textContent = (+e.target.value).toFixed(2);
};
```

### Оновлення в render-loop (кожен кадр):

```javascript
_loop(){
  requestAnimationFrame(() => this._loop());

  // 1) Arcball → pivot (обертає всю модель)
  this.pivot.quaternion.copy(this.arc.q);

  // 2) Модель-origin у world space (для осей)
  // partsGroup сидить всередині pivot; його локальна позиція — це offset
  // від pivot до центру моделі в pivot-локальних координатах
  const mow = this._modelOriginWorld();

  // 3) ОСІ: сидять на origin моделі, обертаються з моделлю
  this.axes.position.copy(mow);
  this.axes.quaternion.copy(this.arc.q);

  // 4) СФЕРА: на центрі обертання (target), масштаб від розміру ortho / perspective
  const ss = this._orthoSize * this._sphereScale;   // для ortho-камери
  // АБО для perspective: const ss = this.camera.position.distanceTo(this.target) * this._sphereScale;

  this.sphere.position.copy(this.target);
  this.sphere.scale.setScalar(ss);
  this.sphere.quaternion.copy(this.arc.q);   // обертається разом з моделлю

  // 5) КІЛЬЦЕ: на target, завжди дивиться в камеру
  this.sphereRing.position.copy(this.target);
  this.sphereRing.scale.setScalar(ss);
  this.sphereRing.lookAt(this.camera.position);

  // 6) Clipping-plane normal — трансформується через pivot quaternion
  this.clip.updatePlane(this.arc.q, mow);

  this.camera.lookAt(this.target);
  this.renderer.render(this.scene, this.camera);
  this.hud.draw(this.arc.q);
}

// Допоміжний метод — позиція origin моделі у world space
_modelOriginWorld(){
  const localOffset = this.parts.group.position.clone();
  return this.pivot.position.clone().add(
    localOffset.applyQuaternion(this.pivot.quaternion)
  );
}
```

### ЗВ'ЯЗОК СФЕРИ З КООРДИНАТНИМИ ОСЯМИ — summary

| Об'єкт        | Позиція                  | Обертання            | Масштаб                        |
|---------------|--------------------------|----------------------|--------------------------------|
| `sphere`      | `target`                 | `arc.q`              | `orthoSize × sphereScale`       |
| `sphereRing`  | `target`                 | `lookAt(camera)`     | `orthoSize × sphereScale`       |
| `axes`        | `modelOriginWorld()`     | `arc.q`              | константний (1 одиниця)        |
| `pivot`       | `target`                 | `arc.q`              | 1                              |
| `partsGroup`  | offset від pivot         | (наслідує від pivot) | 1                              |

**Головна ідея:** осі і модель ОБЕРТАЮТЬСЯ РАЗОМ (обидва використовують `arc.q`). Сфера ТЕЖ обертається з `arc.q`, але сидить на `target` (не на origin моделі). Після middle-click recenter target переїжджає в точку кліку, але origin моделі залишається на місці — тому сфера і осі можуть бути в різних точках простору.

---

## 4. РАДІУС СФЕРИ ДЛЯ ARCBALL-ВВОДУ

Коли натискаєш середню кнопку, arcball.begin() треба подати радіус у пікселях екрана — це межа inside/outside сфери. Формула синхронізована з візуальним розміром сфери:

```javascript
// Для ortho-камери / загальний варіант
_sphereScreenR(){
  return Math.min(innerWidth, innerHeight) * this._sphereScale * 0.5;
}

// Альтернативно для perspective-камери (обчислює піксельний радіус з FOV)
_sphereScreenR(){
  const fovRad = this.camera.fov * Math.PI / 180;
  return (0.28 / Math.tan(fovRad/2)) * (innerHeight / 2);
}
```

---

## 5. МИША — повна система керування

### Стан:

```javascript
this._mb = { mid: false, left: false };   // кнопки
this._prev = { x: 0, y: 0 };              // остання позиція курсора
this._leftStart = { x: 0, y: 0 };         // старт лівої для click vs drag
this._leftMoved = false;
this._midStart = { x: 0, y: 0 };          // старт середньої
this._midMoved = false;
this._cat = false;                        // CATIA-zoom mode активний
this._catY = 0;                           // Y для CATIA-zoom
this._rc = new THREE.Raycaster();
```

### Повний input-binding:

```javascript
_input(){
  const c = this.renderer.domElement;
  c.addEventListener('contextmenu', e => e.preventDefault());

  c.addEventListener('pointerdown', e => {
    e.preventDefault();
    c.setPointerCapture(e.pointerId);   // не втрачати drag за межами вікна

    if(e.button === 1){
      // ── СЕРЕДНЯ: старт обертання (або recenter якщо не буде drag) ──
      this._mb.mid = true;
      this._midStart = { x: e.clientX, y: e.clientY };
      this._midMoved = false;
      const cx = innerWidth / 2, cy = innerHeight / 2;
      const r = this._sphereScreenR();
      this.arc.begin(e.clientX, e.clientY, cx, cy, r, this.camera.quaternion);
    }

    if(e.button === 0){
      this._mb.left = true;
      this._leftStart = { x: e.clientX, y: e.clientY };
      this._leftMoved = false;
      // Якщо середня вже натиснута — входимо в CATIA-zoom режим
      if(this._mb.mid){ this._cat = true; this._catY = e.clientY; }
      this._prev = { x: e.clientX, y: e.clientY };
    }
  });

  c.addEventListener('pointerup', e => {
    if(e.button === 1){
      // Середня клік (без drag) = recenter у точку моделі
      if(!this._midMoved){
        this._recenter(e.clientX, e.clientY);
      }
      this._mb.mid = false;
      this.arc.end();
      this._cat = false;
    }
    if(e.button === 0){
      // Ліва клік (без drag) = вибір деталі (part pick)
      if(!this._leftMoved && !this._cat){
        this._pickPart(e.clientX, e.clientY);
      }
      this._mb.left = false;
      this._cat = false;
    }
  });

  c.addEventListener('pointermove', e => {
    const dx = e.clientX - this._prev.x;
    const dy = e.clientY - this._prev.y;

    // Поріг click vs drag
    if(this._mb.left && Math.hypot(e.clientX - this._leftStart.x, e.clientY - this._leftStart.y) > 4){
      this._leftMoved = true;
    }
    if(this._mb.mid && Math.hypot(e.clientX - this._midStart.x, e.clientY - this._midStart.y) > 3){
      this._midMoved = true;
    }

    if(this._cat && this._mb.mid){
      // CATIA-zoom: середня+ліва, рух Y = зум
      const zd = (e.clientY - this._catY) * 0.004 * this.sZ;
      this._catY = e.clientY;
      this._zoom(zd);
    } else if(this._mb.mid){
      // Тільки середня — обертання через Arcball
      this.arc.move(e.clientX, e.clientY, this.camera.quaternion);
    } else if(this._mb.left && this._leftMoved){
      // Тільки ліва з drag — pan
      this._pan(dx, dy);
    }

    this._prev = { x: e.clientX, y: e.clientY };
  });

  // Колесо — завжди zoom
  c.addEventListener('wheel', e => {
    e.preventDefault();
    this._zoom(e.deltaY * 0.002 * this.sZ);
  }, { passive: false });
}
```

### Pan (1:1 мапінг пікселів у world-units на глибині target):

```javascript
_pan(dx, dy){
  const d = this.camera.position.distanceTo(this.target);
  const vFov = this.camera.fov * Math.PI / 180;
  const worldPerPx = 2 * d * Math.tan(vFov/2) / innerHeight;
  const v = new THREE.Vector3(-dx * worldPerPx, dy * worldPerPx, 0)
    .applyQuaternion(this.camera.quaternion);

  this.camera.position.add(v);
  this.target.add(v);

  // КРИТИЧНО: pivot має слідувати за target, але partsGroup треба
  // зміщувати у протилежному напрямку в локальних координатах pivot,
  // щоб модель візуально не рухалась відносно target-a
  const delta = this.target.clone().sub(this.pivot.position);
  const localDelta = delta.clone().applyQuaternion(this.pivot.quaternion.clone().invert());
  this.parts.group.position.sub(localDelta);
  this.pivot.position.copy(this.target);
}
```

### Zoom (dolly камери вздовж view-direction):

```javascript
_zoom(delta){
  const dir = new THREE.Vector3();
  this.camera.getWorldDirection(dir);
  const d = this.camera.position.distanceTo(this.target);
  this.camera.position.addScaledVector(dir, delta * d);
}
```

### Recenter (середня-клік без drag):

```javascript
_recenter(mx, my){
  if(!this._loaded) return;
  const ndc = new THREE.Vector2(
    (mx / innerWidth) * 2 - 1,
    -(my / innerHeight) * 2 + 1
  );
  this._rc.setFromCamera(ndc, this.camera);
  // ВАЖЛИВО: recursive: false — інакше raycast влучає в дочірні EdgeLines
  // без .face і все ламається
  const hits = this._rc.intersectObjects(this.parts.meshes(), false);
  if(!hits.length) return;

  const hitPoint = hits[0].point.clone();
  const camOffset = this.camera.position.clone().sub(this.target);
  this.target.copy(hitPoint);
  this.camera.position.copy(hitPoint).add(camOffset);

  // Компенсація partsGroup, щоб модель не стрибала
  const delta = this.target.clone().sub(this.pivot.position);
  const localDelta = delta.clone().applyQuaternion(this.pivot.quaternion.clone().invert());
  this.parts.group.position.sub(localDelta);
  this.pivot.position.copy(this.target);
}
```

---

## 6. КЕРУВАННЯ — повний список

| Дія                                  | Результат                                            |
|--------------------------------------|------------------------------------------------------|
| Середня кнопка + drag                | Arcball rotate (inside=trackball, outside=screen-Z)  |
| Середня кнопка клік (без drag)       | Recenter — `target` перестрибує в точку моделі       |
| Ліва кнопка + drag                   | Pan (1:1 піксель↔світ)                               |
| Ліва кнопка клік (без drag)          | Pick part (вибір деталі через raycast)               |
| Середня + ліва (обидві) + рух Y      | CATIA-стиль zoom                                     |
| Колесо миші                          | Zoom (dolly камери)                                  |

---

## 7. HUD-КОМПАС (2D canvas, знизу екрану)

Візуалізує орієнтацію осей X/Y/Z — обертається з `arc.q`:

```javascript
class HUD {
  constructor(id){
    this.cvs = document.getElementById(id);
    this.ctx = this.cvs.getContext('2d');
    this.s = this.cvs.width;
  }
  draw(q){
    const { ctx, s } = this, cx = s/2, cy = s/2, len = 42;
    ctx.clearRect(0, 0, s, s);
    ctx.beginPath(); ctx.arc(cx, cy, len + 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(32,35,42,.55)'; ctx.fill();

    [{v: new THREE.Vector3(1,0,0), c: '#ee5544', l: 'X'},
     {v: new THREE.Vector3(0,1,0), c: '#44cc55', l: 'Y'},
     {v: new THREE.Vector3(0,0,1), c: '#4499ff', l: 'Z'}]
    .map(a => ({ ...a, p: a.v.clone().applyQuaternion(q) }))
    .sort((a, b) => a.p.z - b.p.z)   // depth-sort
    .forEach(a => {
      const px = cx + a.p.x * len, py = cy - a.p.y * len;
      const alpha = 0.3 + 0.7 * ((a.p.z + 1) / 2);
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py);
      ctx.strokeStyle = a.c; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = a.c; ctx.fill();
      ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = a.c;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(a.l, cx + a.p.x * (len + 13), cy - a.p.y * (len + 13));
      ctx.restore();
    });
  }
}
```

HTML: `<canvas id="hud" width="130" height="130"></canvas>`

---

## 8. КЛЮЧОВІ ЗАЛЕЖНОСТІ — summary для іншого проекту

1. **Arcball** → `pivot.quaternion` (модель обертається) + `axes.quaternion` (осі з моделлю) + `sphere.quaternion` (сфера візуально обертається з моделлю).
2. **Сфера** сидить на `target`, масштабується від `orthoSize` (або `distanceTo(target)` для perspective) × `sphereScale` (слайдер 0.1–1.5, default 0.54).
3. **Радіус Arcball-вводу** = `min(innerWidth, innerHeight) × sphereScale × 0.5` — синхронізований з візуальним розміром сфери.
4. **Координатні осі** (AxesHelper) сидять на `modelOriginWorld()` = `pivot.position + partsGroup.position ⊗ pivot.quaternion`.
5. **Після pan/recenter** `target` і `pivot.position` рухаються, але `partsGroup.position` компенсує це зміщення локально — тому origin моделі (де стоять осі) залишається на місці, а сфера переїжджає разом з target.
6. **Pointer capture** (`setPointerCapture`) обов'язковий — інакше drag втрачається при виході курсора за межі canvas.
7. **Raycast `recursive: false`** — інакше зачіпаються дочірні EdgeLines без `.face` і все падає.
8. **Clipping-plane normal** — задається в локальних координатах моделі і щокадру трансформується в world через `pivot.quaternion`, щоб площина розрізу оберталася разом з моделлю.
