---
name: keys-shortcut-data
description: Use when adding or editing KEYS programs, shortcut definitions, key combinations, difficulty metadata, categories, or documentation provenance.
---

# KEYS shortcut data

Shortcut content is product data, not filler. Prefer verified smaller catalogs over confident-looking invented commands.

## Read first

Read `docs/shortcut-sources.md` before changing shortcut content. It records the current first-party source for each supported program, what has actually been audited, and known gaps. If the source map and `data.js` conflict, verify the upstream source before editing either file.

## Current schema

`src/renderer/data.js` stores programs keyed by stable lowercase IDs. Each program has `name`, `color`, and `sc`; each shortcut uses:

```text
{ id: positive integer, a: non-empty action label, k: non-empty key token array, d: easy|medium|hard }
```

IDs need only be unique inside one program. Do not renumber existing shortcuts merely to make the file prettier.

## Source discipline

- Verify shortcut changes against first-party or otherwise authoritative documentation for the relevant application/version.
- Preserve Windows-first key semantics unless the task explicitly introduces another platform model.
- Distinguish default shortcuts from user-configurable bindings. Do not present a configurable shortcut as universal without evidence.
- Keep context-dependent collisions when they are real; the same key combination may legitimately perform different actions in different contexts.
- Do not infer missing commands from neighboring applications or from a language model's memory.
- Update `docs/shortcut-sources.md` when a catalog is reviewed or its source changes.

## Integration checklist

When adding a new program, update its catalog plus the matching runtime metadata in `app.js` when needed: brand/icon, color, category list, and category heuristics. Verify that category labels produced by the heuristic are actually present in the visible category list.

Run `npm run check` after catalog edits. The data tests validate structure and selected verified regressions but do not prove the whole catalog is factually current, so source review remains required.
