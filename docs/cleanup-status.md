# Cleanup status

Snapshot date: 2026-09-10.

The active browser runtime has been reduced to its current contracts, documented, covered by permanent Node tests, checked in GitHub Actions, synchronized to GitHub Pages, and smoke-checked at the load/render level in a real Opera browser.

## Completed

- current browser architecture documented;
- repository-local agent instructions and KEYS-specific skills added;
- stale Electron-era assumptions retired from current docs;
- browser server path handling hardened;
- fatal reset updated for the active localStorage key;
- unused historical logic helpers removed;
- CI added and updated to current GitHub Action majors;
- deployment and verification evidence levels documented;
- shortcut provenance map and audit policy added;
- source-verified corrections applied for Figma, VS Code, Windows Terminal, Notion, ComfyUI, and PowerToys;
- corrected high-risk bindings protected by regression tests;
- ordered sequential shortcut chords implemented without adding runtime dependencies;
- VS Code `Ctrl+K` → `Ctrl+W` and `Ctrl+K` → `Ctrl+F` commands restored using the ordered chord model;
- multiple-choice answers now use shortcut identity rather than ambiguous serialized key strings;
- public GitHub Pages load/render smoke confirmed with the expected ten program cards and no fatal screen.

## Explicit remaining work

- Issue #1: complete the authoritative row-by-row shortcut audit for every active catalog entry;
- Issue #2: implementation is complete; record a real browser click/keypress/focus smoke when a browser-control surface with interaction synthesis is available, then close it;
- full interactive browser smoke for the rest of the UI, which the currently connected browser interface cannot execute;
- optional product expansion such as persistent progress, spaced repetition, recommendations, or desktop packaging;
- repository-governance changes requiring administration capability, such as changing the historical default branch name or enabling branch protection.

These are tracked next-stage tasks, not hidden cleanup debt. Do not claim the shortcut catalog is fully authoritative or the interactive browser flow fully tested until the corresponding evidence exists.
