# Shortcut source map

This file records the evidence used to maintain `src/renderer/data.js`. The catalog is Windows-first and assumes an English/QWERTY physical layout unless a program documents otherwise.

Structural tests prove schema integrity only. They do not prove that a shortcut is factually current. Any shortcut edit must be checked against a current primary source before it is deployed.

## Audit status

| Program | Primary source | Status at 2026-09-10 | Notes |
| --- | --- | --- | --- |
| Figma | https://help.figma.com/hc/en-us/articles/360040328653-Use-shortcuts-and-quick-actions | partial verified | Detach instance, Dev Mode and Flatten corrected and regression-protected. Full row-by-row audit remains open. |
| VS Code | https://code.visualstudio.com/docs/reference/default-keybindings | partial verified | Close Window and Close Editor corrected. Ordered chord support is implemented and the verified `Ctrl+K` → `Ctrl+W/F` commands are restored. Full row-by-row audit remains open. |
| Google Chrome | https://support.google.com/chrome/answer/157179 | sample verified | Core tab/window/navigation shortcuts sampled. Full row-by-row audit remains open. |
| Windows Terminal | https://learn.microsoft.com/en-us/windows/terminal/customize-settings/actions | partial verified | Duplicate-pane automatic/down/right labels and defaults corrected and regression-protected. Full row-by-row audit remains open. |
| PowerShell | https://learn.microsoft.com/en-us/powershell/scripting/learn/shell/using-keyhandlers?view=powershell-7.6 | sample verified | PSReadLine bindings are customizable. `Ctrl+Spacebar` MenuComplete and `Ctrl+L` ClearScreen sampled. |
| Adobe Photoshop | https://helpx.adobe.com/photoshop/using/default-keyboard-shortcuts.html | pending full audit | Use current Adobe Windows defaults. Do not infer from older Photoshop versions. |
| ComfyUI | https://docs.comfy.org/interface/shortcuts | partial verified | Clear workflow, zoom, frame/sidebar/refresh/focus/fit-view entries corrected. Stale `Ctrl+D` load-default entry removed. |
| Notion | https://www.notion.com/help/keyboard-shortcuts | partial verified | Selected-block action, H1/H2/H3, list/checklist mappings and last-color action corrected and regression-protected. |
| Obsidian | https://obsidian.md/help/hotkeys | pending full audit | Distinguish configurable command hotkeys from OS/framework editing shortcuts. |
| Windows PowerToys | https://learn.microsoft.com/en-us/windows/powertoys/ | partial verified | Run, Color Picker, FancyZones and Text Extractor sampled. Screen Ruler corrected to `Win+Ctrl+Shift+M`. |

## Corrections protected by tests

`tests/verified-shortcuts.test.cjs` locks the source-verified corrections for Figma, VS Code, Windows Terminal, Notion, ComfyUI and PowerToys. The VS Code chord rows are also protected as ordered `steps`, and the stale ComfyUI `Ctrl+D` entry remains explicitly absent.

Tests are regression guards, not documentary evidence. Issue #1 remains open until every active catalog row is verified, corrected, or explicitly classified as configurable/context-specific.

## Sequential chords

The runtime now supports a backward-compatible ordered-step model:

- ordinary shortcuts keep `k: string[]`;
- a sequential shortcut adds `steps: string[][]` and keeps `k` equal to the first step;
- study, choice, quiz and results views render the ordered sequence;
- input mode advances after a matched step when only modifier keys remain held, so a user can keep `Ctrl` pressed between VS Code chord steps;
- the next step has a two-second reset window.

Restored verified VS Code commands:

- id 11 `Закрыть все`: `Ctrl+K` → `Ctrl+W`;
- id 42 `Форматировать выделение`: `Ctrl+K` → `Ctrl+F`.

Issue #2 is retained only until a real browser keypress smoke can be recorded. The connected browser interface used during cleanup can prove load/render state but cannot synthesize clicks or keyboard events.

## Maintenance rule

When an upstream application changes bindings:

1. update this source map or the relevant audit note;
2. change only shortcuts supported by current first-party evidence;
3. preserve program-local IDs;
4. represent sequential commands as ordered `steps` instead of flattening them;
5. add a narrow regression assertion for corrected high-risk bindings;
6. run `npm run check` and require green CI on the exact source SHA;
7. deploy only the five verified renderer blobs;
8. verify the GitHub Pages workflow on the exact deployment SHA.

Working trackers:
- Issue #1: authoritative shortcut-catalog audit;
- Issue #2: real-browser verification of implemented sequential shortcut chord support.
