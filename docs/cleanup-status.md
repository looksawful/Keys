# Cleanup status

Snapshot date: 2026-09-10.

The active browser runtime has been reduced to its current contracts, documented, covered by permanent Node tests, and checked in GitHub Actions.

## Completed

- current architecture documented;
- repository-local agent instructions and KEYS-specific skills added;
- stale Electron-era assumptions retired from current docs;
- browser server path handling hardened;
- fatal reset updated for the active localStorage key;
- unused historical logic helpers removed;
- CI added and updated to current action majors;
- shortcut provenance work started and tracked in Issue #1;
- verified Figma shortcut corrections protected by regression tests;
- deployment contract documented;
- browser load/render smoke checklist documented.

## Remaining by design

- full authoritative shortcut audit across every catalog entry;
- full interactive browser smoke with click/keypress/focus automation;
- any product expansion such as persistent progress, spaced repetition, recommendations, or desktop packaging;
- repository-governance changes that require administration capabilities, such as renaming the default branch or enabling branch protection.

These are explicit next-stage tasks, not hidden cleanup debt.
