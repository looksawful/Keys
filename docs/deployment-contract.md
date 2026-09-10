# Deployment contract

The source/default branch is the development history. `gh-pages` is deployment output with separate history.

## Rule

Never merge `gh-pages` into source and never copy repository tooling, tests, docs, or agent instructions into `gh-pages`.

For a deployment, take the exact five verified renderer blobs from `src/renderer/` on a green source commit and write those blobs to the root of `gh-pages`:

- `index.html`
- `styles.css`
- `data.js`
- `logic.js`
- `app.js`

Then verify the GitHub Pages deployment workflow completed successfully for the resulting `gh-pages` commit.

This file is documentation only. `scripts/browser-build.cjs` remains the executable definition of browser build output.
