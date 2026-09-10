---
name: keys-testing
description: Use for KEYS tests, browser build verification, local dev-server behavior, GitHub Actions, and evidence-first failure triage.
---

# KEYS testing and verification

The current project is small enough that verification should stay cheap, deterministic, and dependency-free.

## Permanent contracts

- `tests/logic.test.cjs` protects keyboard normalization, combo comparison, quiz helpers, and score helpers that remain exported by `logic.js`.
- `tests/data.test.cjs` protects the catalog shape, unique program-local IDs, key tokens, difficulty values, and palette shape.
- `tests/browser-server.test.cjs` protects request-path containment and malformed-URL handling without opening a network port.
- `tests/browser-build.test.cjs` protects the exact static deployment file set and byte-for-byte copy behavior.

Do not restore old tests for removed Electron, editor, import, statistics UI, or visual effects unless those features return to the active product.

## Verification order

1. Run the narrow relevant `node --test <file>` while iterating when practical.
2. Run `npm run check` before completion. It performs syntax checks, the permanent Node suite, and browser build.
3. For GitHub Actions failures, inspect the exact commit SHA, job, step, and first useful error before changing source or workflow configuration.
4. Retry only when evidence indicates a transient infrastructure failure. Do not weaken or delete a guard to turn red into green.

## Browser boundary

Node tests do not prove focus behavior, layout, visual state, timer rendering, or real browser keyboard-event behavior. Those claims need a browser smoke test. If that environment is unavailable, record the missing check explicitly.

## CI policy

The CI workflow should remain minimal: read-only repository permission, supported Node, and `npm run check`. Do not add package installation caches, browsers, services, or broad matrices until the project actually needs them.
