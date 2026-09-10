const test = require('node:test');
const assert = require('node:assert/strict');

const { defaultPrograms, colorOptions } = require('../src/renderer/data.js');

const difficulties = new Set(['easy', 'medium', 'hard']);
const hexColor = /^#[0-9a-f]{6}$/i;

test('shortcut catalog has a valid stable shape', () => {
  const entries = Object.entries(defaultPrograms);
  assert.ok(entries.length > 0, 'catalog must contain at least one program');

  for (const [programId, program] of entries) {
    assert.match(programId, /^[a-z0-9-]+$/);
    assert.equal(typeof program.name, 'string');
    assert.ok(program.name.trim(), `${programId}: missing name`);
    assert.match(program.color, hexColor, `${programId}: invalid color`);
    assert.ok(Array.isArray(program.sc) && program.sc.length > 0, `${programId}: empty shortcuts`);

    const ids = new Set();
    for (const shortcut of program.sc) {
      assert.ok(Number.isInteger(shortcut.id) && shortcut.id > 0, `${programId}: invalid shortcut id`);
      assert.equal(ids.has(shortcut.id), false, `${programId}: duplicate shortcut id ${shortcut.id}`);
      ids.add(shortcut.id);
      assert.equal(typeof shortcut.a, 'string');
      assert.ok(shortcut.a.trim(), `${programId}/${shortcut.id}: empty action`);
      assert.ok(Array.isArray(shortcut.k) && shortcut.k.length > 0, `${programId}/${shortcut.id}: empty keys`);
      for (const key of shortcut.k) {
        assert.equal(typeof key, 'string');
        assert.ok(key.trim(), `${programId}/${shortcut.id}: empty key token`);
      }
      assert.ok(difficulties.has(shortcut.d), `${programId}/${shortcut.id}: invalid difficulty ${shortcut.d}`);
    }
  }
});

test('color options are unique valid hex colors', () => {
  assert.ok(Array.isArray(colorOptions) && colorOptions.length > 0);
  assert.equal(new Set(colorOptions).size, colorOptions.length);
  for (const color of colorOptions) assert.match(color, hexColor);
});
