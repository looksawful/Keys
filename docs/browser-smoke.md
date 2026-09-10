# Browser smoke checklist

Use this checklist after renderer changes and before calling a deployment verified.

## Load/render

- GitHub Pages URL loads without a fatal screen.
- Main landmark is present.
- All expected program cards render.
- Each program exposes the shortcut-reference and training actions.

## Interaction

Run in a real browser with click/keyboard automation or manually when automation is unavailable:

- open a program shortcut list;
- return to home;
- start training;
- exercise input mode;
- exercise multiple-choice mode;
- skip a question;
- allow the timer to update;
- reach results;
- restart;
- verify fatal reset recovery;
- verify keyboard-only focus visibility and navigation.

## Keyboard-specific checks

- modifiers;
- symbol keys;
- shifted symbols;
- function keys;
- Cyrillic keyboard layout mapped through physical `KeyboardEvent.code`.

## Evidence

Record separately what was actually tested. A successful GitHub Pages deployment and a readable accessibility tree prove load/render only; they do not prove click, focus, or physical keyboard behavior.
