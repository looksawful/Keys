# Shortcut source map

This file records the evidence used to maintain `src/renderer/data.js`. The catalog is Windows-first and assumes an English/QWERTY physical layout unless a program documents otherwise.

Structural tests prove schema integrity only. They do not prove that a shortcut is factually current. Any shortcut edit must be checked against the primary source below before it is merged or deployed.

## Audit status

| Program | Primary source | Status at 2026-09-10 | Notes |
| --- | --- | --- | --- |
| Figma | https://help.figma.com/hc/en-us/articles/360040328653-Use-shortcuts-and-quick-actions | partial verified | Corrected Detach instance, Dev Mode, and Flatten against current Figma Help. Full catalog review remains open. |
| VS Code | https://code.visualstudio.com/docs/reference/default-keybindings | partial verified | Current Windows defaults reviewed for a representative set. Confirmed catalog mismatches for Close Window and Close Editor remain tracked in Issue #1 until patched. |
| Google Chrome | https://support.google.com/chrome/answer/157179 | sample verified | Core tab/window/navigation shortcuts sampled against current Windows/Linux documentation. |
| Windows Terminal | https://learn.microsoft.com/en-us/windows/terminal/customize-settings/actions | partial verified | Current split-pane defaults checked. The catalog's down/right duplicate-pane bindings are swapped and remain tracked in Issue #1 until patched. |
| PowerShell | https://learn.microsoft.com/en-us/powershell/scripting/learn/shell/using-keyhandlers?view=powershell-7.6 | sample verified | PSReadLine bindings are customizable. `Ctrl+Spacebar` MenuComplete and `Ctrl+L` ClearScreen were checked. |
| Adobe Photoshop | https://helpx.adobe.com/photoshop/using/default-keyboard-shortcuts.html | pending full audit | Use Adobe's current reference and Windows defaults. Do not infer from older Photoshop versions. |
| ComfyUI | https://docs.comfy.org/interface/shortcuts | partial verified | Current official list exposes several stale catalog entries, including clear workflow, zoom in, sidebar/focus labels, and removed/default bindings. Tracked in Issue #1 until patched. |
| Notion | https://www.notion.com/help/keyboard-shortcuts | partial verified | Current Windows content-creation mappings were checked. Heading/list/checklist mappings and several labels in the catalog need correction; tracked in Issue #1. |
| Obsidian | https://obsidian.md/help/hotkeys | pending full audit | Obsidian distinguishes customizable command hotkeys from OS/framework editing shortcuts. Verify defaults in current docs or app settings before changing data. |
| Windows PowerToys | https://learn.microsoft.com/en-us/windows/powertoys/ | partial verified | Run, Color Picker, FancyZones and Text Extractor sampled. Current Screen Ruler activation is `Win+Ctrl+Shift+M`, not the catalog's older binding; tracked in Issue #1. |

## Verified corrections already applied

### Figma

- shortcut id 35, `Отсоединить экземпляр`: `Ctrl+Alt+B`
- shortcut id 49, `Dev Mode`: `Shift+D`
- shortcut id 71, `Flatten (объединить в фигуру)`: `Alt+Shift+F`

Evidence:

- https://help.figma.com/hc/en-us/articles/14527541019415-Detach-an-instance-from-the-component
- https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode
- https://help.figma.com/hc/en-us/articles/360040450233-Flatten-selection

## Maintenance rule

When an upstream application changes bindings:

1. update this source map or its audit note;
2. change only shortcuts supported by evidence;
3. preserve program-local IDs unless a migration explicitly requires renumbering;
4. add a narrow regression assertion for a corrected high-risk binding when useful;
5. run `npm run check`;
6. deploy only after source CI is green and the five renderer blobs are re-checked against `gh-pages`.

Issue #1 is the working tracker for the remaining authoritative catalog audit.
