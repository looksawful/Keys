const test = require('node:test');
const assert = require('node:assert/strict');

const { defaultPrograms } = require('../src/renderer/data.js');

function shortcut(programId, shortcutId) {
  const item = defaultPrograms[programId].sc.find((entry) => entry.id === shortcutId);
  assert.ok(item, `missing ${programId} shortcut ${shortcutId}`);
  return item;
}

test('verified Figma shortcut corrections stay aligned with current first-party docs', () => {
  assert.deepEqual(shortcut('figma', 35).k, ['Ctrl', 'Alt', 'B']);
  assert.deepEqual(shortcut('figma', 49).k, ['Shift', 'D']);
  assert.deepEqual(shortcut('figma', 71).k, ['Alt', 'Shift', 'F']);
});
