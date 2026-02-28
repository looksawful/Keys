const test = require('node:test');
const assert = require('node:assert/strict');

const hkLogic = require('../src/renderer/logic.js');
const hkProgramImport = require('../src/renderer/program-import.js');

const MODIFIER_ORDER = {
  Shift: 0,
  Alt: 1,
  Ctrl: 2,
  Win: 3,
};

const DEFAULT_COLOR = '#007acc';
const COLOR_SET = new Set(['#007acc', '#1abcfe', '#4d4d4d']);

function formatKeyList(keys) {
  const unique = Array.from(new Set(keys)).filter(Boolean);
  const modifiers = [];
  const rest = [];
  for (const key of unique) {
    if (Object.prototype.hasOwnProperty.call(MODIFIER_ORDER, key)) modifiers.push(key);
    else rest.push(key);
  }
  modifiers.sort((a, b) => MODIFIER_ORDER[a] - MODIFIER_ORDER[b]);
  rest.sort((a, b) => String(a).localeCompare(String(b)));
  return [...modifiers, ...rest];
}

function sanitizeColor(value) {
  const candidate = String(value || '').trim().toLowerCase();
  if (!candidate || !COLOR_SET.has(candidate)) return DEFAULT_COLOR;
  return candidate;
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
    now: () => 1000,
  });
}

test('parseText supports programs array and normalizes shortcuts', () => {
  const importer = createImporter();
  const input = JSON.stringify({
    programs: [
      {
        id: 'My App',
        name: 'My App',
        color: '#1abcfe',
        shortcuts: [
          { action: 'Open', keys: 'Ctrl+O', difficulty: 'easy' },
          { action: 'Open duplicate', keys: ['Ctrl', 'O'], difficulty: 'hard' },
          { action: 'Run', keys: ['F5'], difficulty: 'unknown' },
        ],
      },
    ],
  });

  const res = importer.parseText(input);
  assert.equal(res.ok, true);
  assert.equal(res.programs.length, 1);
  assert.equal(res.programs[0].id, 'my_app');
  assert.equal(res.programs[0].color, '#1abcfe');
  assert.equal(res.programs[0].sc.length, 2);
  assert.deepEqual(res.programs[0].sc[0].k, ['Ctrl', 'O']);
  assert.equal(res.programs[0].sc[1].d, 'easy');
});

test('parseText supports dictionary payload and inferred IDs', () => {
  const importer = createImporter();
  const input = JSON.stringify({
    vscode_profile: {
      name: 'VS Code',
      sc: [{ a: 'Quick Open', k: ['Ctrl', 'P'], d: 'medium' }],
    },
  });

  const res = importer.parseText(input);
  assert.equal(res.ok, true);
  assert.equal(res.programs.length, 1);
  assert.equal(res.programs[0].id, 'vscode_profile');
  assert.equal(res.programs[0].sc[0].d, 'medium');
});

test('parseText returns stable error codes', () => {
  const importer = createImporter();
  assert.deepEqual(importer.parseText('   '), { ok: false, code: 'empty_text' });
  assert.deepEqual(importer.parseText('{'), { ok: false, code: 'invalid_json' });

  const noPrograms = importer.parseText(JSON.stringify({ foo: 'bar' }));
  assert.equal(noPrograms.ok, false);
  assert.equal(noPrograms.code, 'no_programs_found');

  const invalidPrograms = importer.parseText(
    JSON.stringify({ programs: [{ name: 'Broken', shortcuts: [{ action: '', keys: [] }] }] }),
  );
  assert.equal(invalidPrograms.ok, false);
  assert.equal(invalidPrograms.code, 'no_valid_programs');
});

test('mergePrograms keeps existing entries and renames duplicate IDs', () => {
  const importer = createImporter();
  const existing = {
    vscode: {
      name: 'VS Code old',
      color: '#4d4d4d',
      sc: [{ id: 1, a: 'Old', k: ['Ctrl', 'O'], d: 'easy' }],
    },
  };

  const parsed = importer.parseText(
    JSON.stringify({
      programs: [
        {
          id: 'vscode',
          name: 'VS Code',
          shortcuts: [{ action: 'Open', keys: 'Ctrl+P', difficulty: 'easy' }],
        },
        {
          id: 'figma',
          name: 'Figma',
          shortcuts: [{ action: 'Run', keys: 'Ctrl+Enter', difficulty: 'hard' }],
        },
      ],
    }),
  );
  assert.equal(parsed.ok, true);

  const merged = importer.mergePrograms(existing, parsed.programs);
  assert.equal(merged.ok, true);
  assert.equal(merged.importedPrograms, 2);
  assert.equal(merged.importedShortcuts, 2);
  assert.equal(merged.renamedIds, 1);
  assert.ok(merged.programs.vscode);
  assert.ok(merged.programs.vscode_1);
  assert.ok(merged.programs.figma);
  assert.equal(merged.lastImportedId, 'figma');
});

test('helper exports remain stable', () => {
  assert.equal(hkProgramImport.sanitizeProgramId('My App', '', () => 1), 'my_app');
  assert.equal(
    hkProgramImport.normalizeImportedDifficulty('MEDIUM', isValidDifficulty),
    'medium',
  );
  assert.deepEqual(hkProgramImport.getImportedProgramsList({ programs: [1, 2] }), [1, 2]);
});
