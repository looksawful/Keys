const test = require('node:test');
const assert = require('node:assert/strict');

const hkLogic = require('../src/renderer/logic.js');

test('normalizeKey supports aliases, physical codes, function keys, and cyrillic layout', () => {
  assert.equal(hkLogic.normalizeKey('control'), 'Ctrl');
  assert.equal(hkLogic.normalizeKey('ignored', 'KeyA'), 'A');
  assert.equal(hkLogic.normalizeKey('й'), 'Q');
  assert.equal(hkLogic.normalizeKey('f12'), 'F12');
});

test('parseKeyCombo handles regular combos and the plus key', () => {
  assert.deepEqual(hkLogic.parseKeyCombo('Ctrl + Shift + P'), ['Ctrl', 'Shift', 'P']);
  assert.deepEqual(hkLogic.parseKeyCombo('Ctrl++'), ['Ctrl', '+']);
});

test('compareKeySets ignores order and expands shifted symbols', () => {
  assert.equal(hkLogic.compareKeySets(['Ctrl', 'Shift', 'P'], ['P', 'Ctrl', 'Shift']), true);
  assert.equal(hkLogic.compareKeySets(['?'], ['Shift', '/']), true);
  assert.equal(hkLogic.compareKeySets(['Ctrl', 'P'], ['Ctrl', 'Shift', 'P']), false);
});

test('createQuizState filters by difficulty and limits question count', () => {
  const shortcuts = [
    { id: 1, d: 'easy', a: 'A', k: ['A'] },
    { id: 2, d: 'hard', a: 'B', k: ['B'] },
    { id: 3, d: 'hard', a: 'C', k: ['C'] },
  ];
  const state = hkLogic.createQuizState(
    shortcuts,
    { difficulty: 'hard', count: 1 },
    () => 0,
  );
  assert.equal(state.qs.length, 1);
  assert.equal(state.qs[0].d, 'hard');
  assert.equal(state.i, 0);
  assert.equal(state.c, 0);
});

test('stats helpers calculate program progress and average score', () => {
  const history = [
    { p: 'vscode', c: 1, t: 2 },
    { p: 'vscode', c: 2, t: 2 },
    { p: 'vscode', c: 1, t: 2 },
    { p: 'vscode', c: 2, t: 2 },
    { p: 'vscode', c: 0, t: 2 },
    { p: 'vscode', c: 2, t: 2 },
    { p: 'figma', c: 1, t: 1 },
  ];

  assert.equal(hkLogic.calcProgramProgress(history, 'vscode'), 70);
  assert.equal(hkLogic.calcAverageScore(history), 71);
});
