# KEYS

KEYS is a dependency-free browser trainer for learning keyboard shortcuts. The current application is a static HTML/CSS/JavaScript build; the earlier Electron application is historical and is not the active runtime.

## Current architecture

- `src/renderer/data.js` — shortcut catalog and palette data.
- `src/renderer/logic.js` — keyboard normalization, combo comparison, and shuffle. It is UMD and can be required from Node tests.
- `src/renderer/app.js` — browser UI, category heuristics, quiz state, timer, and configuration persistence.
- `src/renderer/index.html` / `styles.css` — static shell and presentation.
- `scripts/browser-build.cjs` — deterministic copy build into `dist/browser`.
- `scripts/browser-server.cjs` — local development server bound to loopback by default.

The browser version currently persists quiz configuration only. Learning history, editor functionality, persistent progress, and recommendations from older revisions are not part of the active runtime.

## Commands

```bash
npm run check
npm test
npm run browser:build
npm start
```

`npm run check` performs syntax validation, permanent Node tests, and the browser build. The project requires Node.js 20 or newer and has no runtime npm dependencies.

## Repository topology

`codex/browser-github-pages` is the source/default branch. `gh-pages` is a deployment-artifact branch with separate history. Do not hand-edit or mechanically merge `gh-pages`; update source, verify it, then deploy deliberately. The 2026-09-10 cleanup established byte-for-byte parity for the five renderer files and confirmed a successful GitHub Pages deployment; re-check parity after every source change.

There are no pull requests. Issue #1 tracks the remaining authoritative shortcut-catalog audit after cleanup found a confirmed Figma shortcut mismatch. Project state, roadmap, audit notes, and historical decisions are maintained in the KEYS project documentation in Notion.

## Maintenance rules

Read `AGENTS.md` before changing the repository. Repository-local workflows live under `.agents/skills/`. Keep the browser architecture dependency-free unless a task explicitly justifies a migration or new dependency, and verify shortcut-content changes against authoritative documentation rather than guessing from memory.
