---
name: keys-vendor-skills
description: Route KEYS work to a minimal verified set of external Agent Skills while preserving project-local behavior and evidence rules.
---

# Curated external skills for KEYS

Project-local AGENTS.md, tests, shortcut data and product behavior are authoritative. External skills are supplemental only.

## Approved

- `addyosmani/agent-skills`: `accessibility-checklist`. Use when changing interactive UI, keyboard navigation, focus behavior, semantics or visual states.
- `gwagjiug/technical-writing`: `technical-writing`. Use for README, architecture notes, troubleshooting and contributor documentation.
- `github/gh-aw`: `.squad/templates/skills/fact-checking`. Use as an evidence-review method when documenting platform/browser shortcut claims or other externally verifiable facts.

## Conditional

- `addyosmani/agent-skills`: `browser-testing-with-devtools`. Use only when a browser-runtime issue cannot be proved by the repository's existing tests or static inspection.

## Excluded

- React, Next.js, Tailwind, Three.js, GSAP and framework-specific skills: they do not match the current project.
- Broad Superpowers/ECC/wshobson installs: they add process overlap without improving KEYS-specific shortcut correctness.
- Generic copywriting/marketing skills: product facts and shortcut behavior matter more than persuasive copy here.

## Guardrails

Do not let an external skill change shortcut mappings, platform assumptions, keyboard semantics or UX behavior without repository evidence. Prefer the smallest change that keeps current tests meaningful. Do not add a dependency merely because a skill demonstrates one.

If installing an upstream skill with the `skills` CLI, install only the named skill, keep it project-scoped, review its license and contents, and record the resolved upstream revision. Never use a whole-pack `--all` install in this repository.
