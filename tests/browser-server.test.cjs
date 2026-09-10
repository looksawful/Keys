const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { resolveRequestPath } = require('../scripts/browser-server.cjs');

const root = path.resolve(process.cwd(), 'dist', 'browser');

test('browser server resolves normal files inside the build root', () => {
  assert.deepEqual(resolveRequestPath(root, '/'), {
    status: 200,
    file: path.join(root, 'index.html'),
  });
  assert.deepEqual(resolveRequestPath(root, '/styles.css?x=1'), {
    status: 200,
    file: path.join(root, 'styles.css'),
  });
});

test('browser server rejects traversal, including same-prefix sibling paths', () => {
  assert.equal(resolveRequestPath(root, '/../browser2/secret.txt').status, 403);
  assert.equal(resolveRequestPath(root, '/%2e%2e/browser2/secret.txt').status, 403);
});

test('browser server rejects malformed percent encoding without throwing', () => {
  assert.equal(resolveRequestPath(root, '/%E0%A4%A').status, 400);
});
