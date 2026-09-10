# KEYS

KEYS is a dependency-free browser trainer for learning keyboard shortcuts. The current application is a static HTML/CSS/JavaScript build; the earlier Electron application is historical and is not the active runtime.

## Current architecture

- `src/renderer/data.js` — shortcut catalog and palette data.
- `src/renderer/logic.js` — keyboard normalization, combo comparison, quiz helpers, and legacy stats helpers. It is UMD and can be required from Node tests.
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

`codex/browser-github-pages` is the source/default branch. `gh-pages` is a deployment-artifact branch with separate history; at the 2026-09-10 cleanup snapshot its five files match `src/renderer` byte-for-byte. Do not hand-edit `gh-pages`; update source, verify it, then deploy deliberately.

There are no open or closed GitHub Issues and no pull requests at the cleanup snapshot. Project state, roadmap, audit notes, and historical decisions are maintained in the KEYS project documentation in Notion.

## Maintenance rules

Read `AGENTS.md` before changing the repository. Repository-local workflows live under `.agents/skills/`. Keep the browser architecture dependency-free unless a task explicitly justifies a migration or new dependency, and verify shortcut-content changes against authoritative documentation rather than guessing from memory.
