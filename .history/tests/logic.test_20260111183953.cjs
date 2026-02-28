const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../src/renderer/logic.js');

test('normalizeKey handles modifiers and arrows', () => {
  assert.equal(logic.normalizeKey('Control'), 'Ctrl');
  assert.equal(logic.normalizeKey('Meta'), 'Win');
  assert.equal(logic.normalizeKey('ArrowUp'), '↑');
  assert.equal(logic.normalizeKey(' '), 'Space');
  assert.equal(logic.normalizeKey('a'), 'A');
  assert.equal(logic.normalizeKey('Escape'), 'Esc');
});

test('parseKeyCombo splits and trims', () => {
  assert.deepEqual(logic.parseKeyCombo('Ctrl + Shift + P'), ['Ctrl', 'Shift', 'P']);
  assert.deepEqual(logic.parseKeyCombo('  '), []);
});

test('compareKeySets ignores order and case', () => {
  assert.ok(logic.compareKeySets(['Ctrl', 'C'], ['c', 'ctrl']));
  assert.ok(!logic.compareKeySets(['Ctrl', 'C'], ['Ctrl', 'V']));
});

test('shuffle uses supplied rng', () => {
  const shuffled = logic.shuffle([1, 2, 3], () => 0);
  assert.deepEqual(shuffled, [2, 3, 1]);
});

test('filterShortcuts respects difficulty', () => {
  const shortcuts = [{ d: 'easy' }, { d: 'medium' }, { d: 'easy' }];
  assert.equal(logic.filterShortcuts(shortcuts, 'easy').length, 2);
  assert.equal(logic.filterShortcuts(shortcuts, 'all').length, 3);
});

test('createQuizState limits questions and filters', () => {
  const shortcuts = [
    { d: 'easy', id: 1 },
    { d: 'easy', id: 2 },
    { d: 'medium', id: 3 },
  ];
  const quiz = logic.createQuizState(shortcuts, { difficulty: 'easy', count: 5 }, () => 0.5);
  assert.equal(quiz.qs.length, 2);
  assert.equal(quiz.i, 0);
  assert.equal(quiz.c, 0);
});

test('calcProgramProgress averages last five results', () => {
  const history = [
    { p: 'a', c: 2, t: 4 },
    { p: 'a', c: 3, t: 4 },
    { p: 'a', c: 4, t: 4 },
    { p: 'a', c: 1, t: 4 },
    { p: 'a', c: 4, t: 4 },
    { p: 'a', c: 0, t: 4 },
    { p: 'b', c: 4, t: 4 },
  ];
  const pct = logic.calcProgramProgress(history, 'a');
  assert.equal(pct, 60);
});

test('calcAverageScore computes overall average', () => {
  const history = [
    { c: 2, t: 4 },
    { c: 3, t: 4 },
  ];
  assert.equal(logic.calcAverageScore(history), 63);
});
