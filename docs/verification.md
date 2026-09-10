# Verification

Current source verification command:

```bash
npm run check
```

It covers JavaScript syntax, Node tests, and deterministic browser build output.

A green CI run proves only the exact source SHA it checked. Deployment is verified separately by matching the five renderer blobs in `gh-pages` and confirming the GitHub Pages deployment workflow succeeds for that deploy commit.

Browser load/render smoke and interactive browser smoke are separate evidence levels; do not report one as the other.
