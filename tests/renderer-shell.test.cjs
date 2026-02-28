const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');

function filePath(rel) {
  return path.join(rootDir, rel);
}

test('index.html loads renderer modules in strict order', () => {
  const html = fs.readFileSync(filePath('src/renderer/index.html'), 'utf8');
  const scripts = [
    './data.js',
    './logic.js',
    './program-import.js',
    './program-import-session.js',
    './background-effects.js',
    './app.js',
  ];
  const positions = scripts.map((script) => html.indexOf(`src="${script}"`));

  positions.forEach((pos, i) => {
    assert.notEqual(pos, -1, `${scripts[i]} is missing in index.html`);
  });

  for (let i = 1; i < positions.length; i += 1) {
    assert.ok(
      positions[i] > positions[i - 1],
      `${scripts[i]} should be loaded after ${scripts[i - 1]}`,
    );
  }
});

test('renderer scripts pass syntax checks', () => {
  const targets = [
    'src/renderer/data.js',
    'src/renderer/logic.js',
    'src/renderer/program-import.js',
    'src/renderer/program-import-session.js',
    'src/renderer/background-effects.js',
    'src/renderer/app.js',
  ];

  for (const rel of targets) {
    const result = spawnSync(process.execPath, ['--check', filePath(rel)], {
      cwd: rootDir,
      encoding: 'utf8',
    });
    assert.equal(
      result.status,
      0,
      `${rel} failed syntax check:\n${result.stdout || ''}${result.stderr || ''}`,
    );
  }
});
