---
name: keys-shortcut-data
description: Use when adding or editing KEYS programs, shortcut definitions, key combinations, difficulty metadata, categories, or documentation provenance.
---

# KEYS shortcut data

Shortcut content is product data, not filler. Prefer verified smaller catalogs over confident-looking invented commands.

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

## Integration checklist

When adding a new program, update its catalog plus the matching runtime metadata in `app.js` when needed: brand/icon, color, category list, and category heuristics. Verify that category labels produced by the heuristic are actually present in the visible category list.

Run `npm run check` after catalog edits. The data test validates structure but does not verify factual correctness of the shortcut documentation, so source review remains required.
