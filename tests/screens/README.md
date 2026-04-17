# Скріншоти Playwright-тестів

Кожен e2e-тест може зберігати PNG-знімки сюди для візуальної перевірки.
Оновлюються при кожному запуску `npx playwright test`.

## Поточні файли

| Файл | Що показує |
|------|-----------|
| `emu-01-after-login.png` | Вхід через анонім-auth (режим `?test=emu`) |
| `emu-02-uploaded.png` | Після аплоаду `chair.glb` — стілець у viewer |
| `emu-03-opened.png` | Після кліку на файл у списку — wiederhergestellt |
| `emu-04-after-delete.png` | Порожній стан після видалення |
| `panel-closed.png` | `fpToggle` і `loadBtn` без накладання (панель закрита) |
| `panel-open.png` | Те саме при відкритій файловій панелі |
| `sphere-before.png` | Сфера до обертання (default view, slider=0.54) |
| `sphere-after.png` | Після inside-drag — сфера видимо повернулася |
| `sphere-slider-1.2.png` | Слайдер "Kugel" на 1.20 — велика щільна сфера |
| `sphere-inside-rotate.png` | (історичний) inside-rotate HUD-компас |
| `glb-info-popup.png` | Правий клік → popup з TEIL/GLB-DATEI |
| `parts-panel-highlight.png` | Обрано частину в панелі Teile (orange overlay) |
| `align-leg-to-x.png` | Після "Achse → X" для ніжки стільця |
