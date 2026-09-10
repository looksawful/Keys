# KEYS

KEYS is a dependency-free browser trainer for learning keyboard shortcuts. The current application is a static HTML/CSS/JavaScript build; the earlier Electron application is historical and is not the active runtime.

## Current architecture

- `src/renderer/data.js` — shortcut catalog and palette data, including optional ordered `steps` for sequential shortcut chords.
- `src/renderer/logic.js` — keyboard normalization, unordered single-step comparison, chord-step normalization, and shuffle. It is UMD and can be required from Node tests.
- `src/renderer/app.js` — browser UI, category heuristics, quiz/chord state, timer, and configuration persistence.
- `src/renderer/index.html` / `styles.css` — static shell and presentation.
- `scripts/browser-build.cjs` — deterministic copy build into `dist/browser`.
- `scripts/browser-server.cjs` — local development server bound to loopback by default.
- `docs/` — deployment, verification, browser-smoke, cleanup, and shortcut-provenance contracts.

The browser version currently persists quiz configuration only. Learning history, editor functionality, persistent progress, and recommendations from older revisions are not part of the active runtime.

Sequential chords are now represented explicitly as ordered steps while ordinary shortcuts keep the existing flat `k` array. The VS Code `Ctrl+K`, then `Ctrl+W` and `Ctrl+K`, then `Ctrl+F` commands are active again rather than being flattened into impossible simultaneous keypresses.

## Commands

```bash
npm run check
npm test
npm run browser:build
npm start
```

`npm run check` performs syntax validation, permanent Node tests, and the browser build. The project requires Node.js 20 or newer and has no runtime npm dependencies.

## Repository topology

`codex/browser-github-pages` is the source/default branch. `gh-pages` is a deployment-artifact branch with separate history. Do not hand-edit or mechanically merge `gh-pages`; update source, verify it, then deploy the exact five renderer blobs deliberately.

There are no pull requests. The active technical trackers are:

- Issue #1 — complete the authoritative row-by-row shortcut catalog audit;
- Issue #2 — implementation of ordered shortcut chords is complete; only real-browser keypress verification remains before the tracker can be closed.

Confirmed bad shortcut data found during cleanup was corrected for Figma, VS Code, Windows Terminal, Notion, ComfyUI, and PowerToys and protected by regression tests.

## Maintenance rules

Read `AGENTS.md` before changing the repository and use the matching workflow under `.agents/skills/`. Keep the browser architecture dependency-free unless a concrete requirement justifies otherwise. Read `docs/shortcut-sources.md` before shortcut-content changes, and verify edits against current first-party documentation rather than memory.

See `docs/README.md` for the project documentation index.
