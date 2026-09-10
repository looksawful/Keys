const test = require('node:test');
const assert = require('node:assert/strict');

const hkLogic = require('../src/renderer/logic.js');

test('normalizeKey supports aliases, physical codes, function keys, and cyrillic layout', () => {
  assert.equal(hkLogic.normalizeKey('control'), 'Ctrl');
  assert.equal(hkLogic.normalizeKey('ignored', 'KeyA'), 'A');
  assert.equal(hkLogic.normalizeKey('й'), 'Q');
  assert.equal(hkLogic.normalizeKey('f12'), 'F12');
});

test('compareKeySets ignores order and expands shifted symbols', () => {
  assert.equal(hkLogic.compareKeySets(['Ctrl', 'Shift', 'P'], ['P', 'Ctrl', 'Shift']), true);
  assert.equal(hkLogic.compareKeySets(['?'], ['Shift', '/']), true);
  assert.equal(hkLogic.compareKeySets(['Ctrl', 'P'], ['Ctrl', 'Shift', 'P']), false);
});

test('shuffle returns a deterministic copy when an rng is supplied', () => {
  const source = ['A', 'B', 'C', 'D'];
  const result = hkLogic.shuffle(source, () => 0);

  assert.deepEqual(result, ['B', 'C', 'D', 'A']);
  assert.deepEqual(source, ['A', 'B', 'C', 'D']);
  assert.notEqual(result, source);
});

test('shortcutSteps keeps flat shortcuts backward-compatible and clones ordered chords', () => {
  const flat = { k: ['Ctrl', 'P'] };
  const chord = { k: ['Ctrl', 'K'], steps: [['Ctrl', 'K'], ['Ctrl', 'W']] };
  const flatSteps = hkLogic.shortcutSteps(flat);
  const chordSteps = hkLogic.shortcutSteps(chord);
  assert.deepEqual(flatSteps, [['Ctrl', 'P']]);
  assert.deepEqual(chordSteps, [['Ctrl', 'K'], ['Ctrl', 'W']]);
  chordSteps[0][0] = 'Alt';
  assert.equal(chord.steps[0][0], 'Ctrl');
});
