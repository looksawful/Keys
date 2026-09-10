# Shortcut source map

This file records the evidence used to maintain `src/renderer/data.js`. The catalog is Windows-first and assumes an English/QWERTY physical layout unless a program documents otherwise.

Structural tests prove schema integrity only. They do not prove that a shortcut is factually current. Any shortcut edit must be checked against a current primary source before it is deployed.

## Audit status

| Program | Primary source | Status at 2026-09-10 | Notes |
| --- | --- | --- | --- |
| Figma | https://help.figma.com/hc/en-us/articles/360040328653-Use-shortcuts-and-quick-actions | partial verified | Detach instance, Dev Mode and Flatten corrected and regression-protected. Full row-by-row audit remains open. |
| VS Code | https://code.visualstudio.com/docs/reference/default-keybindings | partial verified | Close Window and Close Editor corrected. Two sequential chord commands are temporarily excluded until Issue #2 adds an ordered chord model. |
| Google Chrome | https://support.google.com/chrome/answer/157179 | sample verified | Core tab/window/navigation shortcuts sampled. Full row-by-row audit remains open. |
| Windows Terminal | https://learn.microsoft.com/en-us/windows/terminal/customize-settings/actions | partial verified | Duplicate-pane automatic/down/right labels and defaults corrected and regression-protected. Full row-by-row audit remains open. |
| PowerShell | https://learn.microsoft.com/en-us/powershell/scripting/learn/shell/using-keyhandlers?view=powershell-7.6 | sample verified | PSReadLine bindings are customizable. `Ctrl+Spacebar` MenuComplete and `Ctrl+L` ClearScreen sampled. |
| Adobe Photoshop | https://helpx.adobe.com/photoshop/using/default-keyboard-shortcuts.html | pending full audit | Use current Adobe Windows defaults. Do not infer from older Photoshop versions. |
| ComfyUI | https://docs.comfy.org/interface/shortcuts | partial verified | Clear workflow, zoom, frame/sidebar/refresh/focus/fit-view entries corrected. Stale `Ctrl+D` load-default entry removed. |
| Notion | https://www.notion.com/help/keyboard-shortcuts | partial verified | Selected-block action, H1/H2/H3, list/checklist mappings and last-color action corrected and regression-protected. |
| Obsidian | https://obsidian.md/help/hotkeys | pending full audit | Distinguish configurable command hotkeys from OS/framework editing shortcuts. |
| Windows PowerToys | https://learn.microsoft.com/en-us/windows/powertoys/ | partial verified | Run, Color Picker, FancyZones and Text Extractor sampled. Screen Ruler corrected to `Win+Ctrl+Shift+M`. |

## Corrections protected by tests

`tests/verified-shortcuts.test.cjs` currently locks the source-verified corrections for Figma, VS Code, Windows Terminal, Notion, ComfyUI and PowerToys. It also asserts that unsupported VS Code sequential chords and the stale ComfyUI `Ctrl+D` entry remain absent until a correct product/runtime model exists.

Tests are regression guards, not documentary evidence. Issue #1 remains open until every active catalog row is verified, corrected, or explicitly classified as configurable/context-specific.

## Sequential chords

The current runtime represents one simultaneous unordered key set. It cannot correctly train ordered sequences such as VS Code `Ctrl+K`, then `Ctrl+W`.

Issue #2 tracks a proper ordered-step model. Until it is implemented, confirmed chord-only commands must not be flattened into impossible simultaneous combinations.

## Maintenance rule

When an upstream application changes bindings:

1. update this source map or the relevant audit note;
2. change only shortcuts supported by current first-party evidence;
3. preserve program-local IDs unless removal is necessary because the runtime cannot represent the command correctly;
4. add a narrow regression assertion for corrected high-risk bindings;
5. run `npm run check` and require green CI on the exact source SHA;
6. deploy only the five verified renderer blobs;
7. verify the GitHub Pages workflow on the exact deployment SHA.

Working trackers:
- Issue #1: authoritative shortcut-catalog audit;
- Issue #2: sequential shortcut chord support.
