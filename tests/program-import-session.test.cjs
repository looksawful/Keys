const test = require('node:test');
const assert = require('node:assert/strict');

const hkLogic = require('../src/renderer/logic.js');
const hkProgramImport = require('../src/renderer/program-import.js');
const hkProgramImportSession = require('../src/renderer/program-import-session.js');

const MODIFIER_ORDER = { Shift: 0, Alt: 1, Ctrl: 2, Win: 3 };

function formatKeyList(keys) {
  const unique = Array.from(new Set(keys)).filter(Boolean);
  const mods = [];
  const rest = [];
  for (const key of unique) {
    if (Object.prototype.hasOwnProperty.call(MODIFIER_ORDER, key)) mods.push(key);
    else rest.push(key);
  }
  mods.sort((a, b) => MODIFIER_ORDER[a] - MODIFIER_ORDER[b]);
  rest.sort((a, b) => String(a).localeCompare(String(b)));
  return [...mods, ...rest];
}

function sanitizeColor(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : '#007acc';
}

function isValidDifficulty(value) {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

function createImporter() {
  return hkProgramImport.createImporter({
    normalizeKey: hkLogic.normalizeKey,
    parseKeyCombo: hkLogic.parseKeyCombo,
    formatKeyList,
    sanitizeColor,
    isValidDifficulty,
    now: () => 100,
  });
}

test('hypothesis: import should not mutate programs before explicit apply', () => {
  const importer = createImporter();
  const current = {
    base: { name: 'Base', color: '#007acc', sc: [{ id: 1, a: 'Open', k: ['Ctrl', 'O'], d: 'easy' }] },
  };
  const payload = JSON.stringify({
    programs: [
      { id: 'new_app', name: 'New App', shortcuts: [{ action: 'Run', keys: 'Ctrl+R', difficulty: 'easy' }] },
    ],
  });

  const preview = hkProgramImportSession.buildPreviewFromText({
    importer,
    currentPrograms: current,
    source: 'text',
    text: payload,
  });

  assert.equal(preview.ok, true);
  assert.equal(current.new_app, undefined);
  assert.equal(preview.preview.merged.programs.new_app.name, 'New App');
});

test('hypothesis: user needs structured status instead of blocking alert', () => {
  const importer = createImporter();
  const current = {};
  const result = hkProgramImportSession.buildPreviewFromText({
    importer,
    currentPrograms: current,
    source: 'text',
    text: '{',
  });

  assert.equal(result.ok, false);
  assert.equal(result.status.kind, 'error');
  assert.ok(Array.isArray(result.status.details));
  assert.ok(result.status.details.some((line) => String(line).includes('invalid_json')));
});

test('hypothesis: undo should fully restore previous programs snapshot', () => {
  const importer = createImporter();
  const current = {
    base: { name: 'Base', color: '#007acc', sc: [{ id: 1, a: 'Open', k: ['Ctrl', 'O'], d: 'easy' }] },
  };
  const payload = JSON.stringify({
    programs: [
      { id: 'new_app', name: 'New App', shortcuts: [{ action: 'Run', keys: 'Ctrl+R', difficulty: 'easy' }] },
    ],
  });

  const preview = hkProgramImportSession.buildPreviewFromText({ importer, currentPrograms: current, source: 'text', text: payload });
  const applied = hkProgramImportSession.applyPreview({ currentPrograms: current, preview: preview.preview });

  assert.equal(applied.ok, true);
  assert.ok(applied.programs.new_app);

  const undone = hkProgramImportSession.undoImport({ lastSnapshot: applied.lastSnapshot });
  assert.equal(undone.ok, true);
  assert.equal(undone.programs.new_app, undefined);
  assert.ok(undone.programs.base);
});

test('hypothesis: multi-file preview should expose per-file problems', () => {
  const importer = createImporter();
  const current = {};
  const result = hkProgramImportSession.buildPreviewFromSources({
    importer,
    currentPrograms: current,
    sources: [
      { source: 'ok.json', text: JSON.stringify({ programs: [{ name: 'A', shortcuts: [{ action: 'x', keys: 'Ctrl+X' }] }] }) },
      { source: 'bad.json', code: 'read_failed' },
      { source: 'broken.json', text: '{' },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.preview.parseErrors.length, 2);
  assert.ok(result.preview.parseErrors.some((x) => x.source === 'bad.json'));
  assert.ok(result.preview.parseErrors.some((x) => x.source === 'broken.json'));
});
