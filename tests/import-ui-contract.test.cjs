const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appPath = path.join(__dirname, '..', 'src', 'renderer', 'app.js');
const cssPath = path.join(__dirname, '..', 'src', 'renderer', 'styles.css');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('hypothesis: import flow is two-step (preview before apply)', () => {
  const app = read(appPath);
  assert.ok(app.includes('buildPreviewFromText('), 'preview builder is missing');
  assert.ok(app.includes('applyPreparedImport'), 'apply step is missing');
  assert.ok(app.includes('data-action="apply-programs-import"'), 'apply action is missing in UI');
});

test('hypothesis: user can rollback last import (undo)', () => {
  const app = read(appPath);
  assert.ok(app.includes('undoLastProgramsImport'), 'undo function is missing');
  assert.ok(app.includes('data-action="undo-programs-import"'), 'undo action is missing in UI');
});

test('hypothesis: drag-and-drop should be safe outside import zone', () => {
  const app = read(appPath);
  assert.ok(app.includes('function eventHasFilePayload'), 'file payload guard is missing');
  assert.ok(app.includes('event.preventDefault();'), 'default drop prevention is missing');
  assert.ok(app.includes('if (!zone) {'), 'outside-zone guard is missing');
});

test('hypothesis: import feedback is inline and persistent in editor UI', () => {
  const app = read(appPath);
  const css = read(cssPath);

  assert.ok(app.includes('import-status'), 'inline status block is missing in UI template');
  assert.ok(app.includes('aria-live="polite"'), 'status block should be announced accessibly');
  assert.ok(css.includes('.import-status-error'), 'error status style is missing');
  assert.ok(css.includes('.import-status-success'), 'success status style is missing');
});

test('hypothesis: dropzone is keyboard-accessible', () => {
  const app = read(appPath);
  assert.ok(app.includes('data-dropzone="program-import" data-action="choose-programs-json"'), 'dropzone keyboard action is missing');
  assert.ok(app.includes('role="button"'), 'dropzone role button is missing');
  assert.ok(app.includes('tabindex="0"'), 'dropzone tabindex is missing');
});
