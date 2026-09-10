# Shortcut audit scope

Issue #1 is the authoritative work item for shortcut correctness.

## Policy

Only current first-party documentation can promote a shortcut correction into the catalog. Secondary sources may help locate a command but are not sufficient evidence for changing user-visible training data.

When a binding is configurable, context-dependent, OS-specific, deprecated, or absent from the current first-party list, record that status explicitly instead of inventing a universal default.

## Completion rule

The catalog audit is complete only when every active program has a documented source and every catalog entry has been either verified, corrected, or deliberately marked as configurable/context-specific.

Regression tests should cover corrected high-risk bindings, but tests do not replace provenance review.
