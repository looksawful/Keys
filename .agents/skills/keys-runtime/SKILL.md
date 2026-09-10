---
name: keys-runtime
description: Use for browser runtime, keyboard capture, UI state, localStorage, categories, and renderer changes in KEYS.
---

# KEYS runtime

Work with the current static browser architecture instead of importing the historical Electron/React plan.

## Read first

1. Read `AGENTS.md` and `README.md`.
2. Inspect `src/renderer/app.js`, `logic.js`, and the narrow affected data/styles.
3. Read `package.json` for the actual commands and Node floor.
4. Preserve shortcut wording and visual behavior unless the task explicitly changes product content or design.

## Runtime contracts

- `data.js` exposes `window.hkData`; `logic.js` exposes `window.hkLogic`; `app.js` consumes both.
- Keyboard matching is set-based and order-independent. `KeyboardEvent.code` is preferred where available so physical keys remain stable across layouts.
- Cyrillic letter input is normalized to the corresponding Latin QWERTY key. Do not remove this as cosmetic cleanup.
- Shifted symbols are normalized to their base key plus `Shift` before comparison.
- The active browser configuration key is `hk_browser_cfg`. Recovery may also clear historical `hk_*` keys so stale data cannot strand old users.
- Generated text inserted through `innerHTML` must remain escaped with the existing escaping path. Never interpolate external or user-controlled strings as markup.
- Category assignment in `app.js` is heuristic. When adding programs or category labels, verify that every intended category is reachable and that shortcuts are not silently stranded under `All` only.
- Session results are currently ephemeral. Do not describe the current browser version as having persistent learning history, spaced repetition, editor, XP, or recommendations.

## Small-change preference

Prefer local fixes over framework migration. Keep the browser runtime dependency-free unless the requested feature clearly needs more structure than the current code can safely provide.

## Verification

Run `npm run check`. For keyboard behavior changes, add or adjust focused logic tests. For browser-only interaction claims, use actual browser evidence when available and report the limitation when it is not.
