const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(repoRoot, 'src', 'renderer');
const outputRoot = path.join(repoRoot, 'dist', 'browser');
const expected = ['app.js', 'data.js', 'index.html', 'logic.js', 'styles.css'];

test('browser build copies exactly the deployable renderer files', () => {
  execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'browser-build.cjs')], {
    cwd: repoRoot,
    stdio: 'pipe',
  });

  assert.deepEqual(fs.readdirSync(outputRoot).sort(), expected.slice().sort());
  for (const file of expected) {
    assert.equal(
      fs.readFileSync(path.join(outputRoot, file), 'utf8'),
      fs.readFileSync(path.join(sourceRoot, file), 'utf8'),
      `${file} differs from source`,
    );
  }
});
