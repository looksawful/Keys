const test = require('node:test');
const assert = require('node:assert/strict');

const { defaultPrograms } = require('../src/renderer/data.js');

function maybeShortcut(programId, shortcutId) {
  return defaultPrograms[programId].sc.find((entry) => entry.id === shortcutId);
}

function shortcut(programId, shortcutId) {
  const item = maybeShortcut(programId, shortcutId);
  assert.ok(item, `missing ${programId} shortcut ${shortcutId}`);
  return item;
}

test('verified Figma shortcut corrections stay aligned with current first-party docs', () => {
  assert.deepEqual(shortcut('figma', 35).k, ['Ctrl', 'Alt', 'B']);
  assert.deepEqual(shortcut('figma', 49).k, ['Shift', 'D']);
  assert.deepEqual(shortcut('figma', 71).k, ['Alt', 'Shift', 'F']);
});

test('verified VS Code Windows defaults and ordered chords stay aligned', () => {
  assert.deepEqual(shortcut('vscode', 4).k, ['Alt', 'F4']);
  assert.deepEqual(shortcut('vscode', 10).k, ['Ctrl', 'F4']);
  assert.deepEqual(shortcut('vscode', 11).steps, [['Ctrl', 'K'], ['Ctrl', 'W']]);
  assert.deepEqual(shortcut('vscode', 42).steps, [['Ctrl', 'K'], ['Ctrl', 'F']]);
});

test('verified Windows Terminal pane bindings stay aligned with current defaults', () => {
  assert.equal(shortcut('terminal', 8).a, 'Дублировать панель автоматически');
  assert.deepEqual(shortcut('terminal', 8).k, ['Alt', 'Shift', 'D']);
  assert.equal(shortcut('terminal', 9).a, 'Дублировать панель вниз');
  assert.deepEqual(shortcut('terminal', 9).k, ['Alt', 'Shift', '-']);
  assert.equal(shortcut('terminal', 10).a, 'Дублировать панель вправо');
  assert.deepEqual(shortcut('terminal', 10).k, ['Alt', 'Shift', '+']);
});

test('verified Notion Windows block shortcuts stay aligned with current docs', () => {
  assert.equal(shortcut('notion', 3).a, 'Изменить выбранные блоки');
  assert.deepEqual(shortcut('notion', 3).k, ['Ctrl', '/']);
  assert.deepEqual(shortcut('notion', 13).k, ['Ctrl', 'Shift', '1']);
  assert.deepEqual(shortcut('notion', 14).k, ['Ctrl', 'Shift', '2']);
  assert.deepEqual(shortcut('notion', 15).k, ['Ctrl', 'Shift', '3']);
  assert.deepEqual(shortcut('notion', 17).k, ['Ctrl', 'Shift', '5']);
  assert.deepEqual(shortcut('notion', 18).k, ['Ctrl', 'Shift', '6']);
  assert.deepEqual(shortcut('notion', 19).k, ['Ctrl', 'Shift', '4']);
  assert.equal(shortcut('notion', 25).a, 'Применить последний цвет текста / подсветки');
  assert.deepEqual(shortcut('notion', 25).k, ['Ctrl', 'Shift', 'H']);
});

test('verified ComfyUI shortcuts stay aligned and removed stale default-load entry stays absent', () => {
  assert.equal(shortcut('comfyui', 13).a, 'Очистить workflow');
  assert.deepEqual(shortcut('comfyui', 13).k, ['Backspace']);
  assert.equal(maybeShortcut('comfyui', 16), undefined);
  assert.deepEqual(shortcut('comfyui', 17).k, ['Alt', '=']);
  assert.equal(shortcut('comfyui', 20).a, 'Добавить рамку к выбранным узлам');
  assert.deepEqual(shortcut('comfyui', 20).k, ['Ctrl', 'G']);
  assert.equal(shortcut('comfyui', 22).a, 'Панель workflow');
  assert.deepEqual(shortcut('comfyui', 22).k, ['W']);
  assert.equal(shortcut('comfyui', 23).a, 'Обновить определения узлов');
  assert.deepEqual(shortcut('comfyui', 23).k, ['R']);
  assert.equal(shortcut('comfyui', 24).a, 'Режим фокуса');
  assert.deepEqual(shortcut('comfyui', 24).k, ['F']);
  assert.equal(shortcut('comfyui', 25).a, 'Вписать выбранные узлы');
  assert.deepEqual(shortcut('comfyui', 25).k, ['.']);
});

test('verified PowerToys Screen Ruler default stays aligned with current docs', () => {
  assert.deepEqual(shortcut('powertoys', 5).k, ['Win', 'Ctrl', 'Shift', 'M']);
});
