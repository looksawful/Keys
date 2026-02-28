const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const effects = require('../src/renderer/background-effects.js');

function createClassList() {
  const names = new Set();
  return {
    toggle(name, force) {
      if (force === undefined) {
        if (names.has(name)) names.delete(name);
        else names.add(name);
        return;
      }
      if (force) names.add(name);
      else names.delete(name);
    },
    remove(name) {
      names.delete(name);
    },
    contains(name) {
      return names.has(name);
    },
  };
}

function createRuntime() {
  const frames = new Map();
  let id = 0;
  return {
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(cb) {
      const next = ++id;
      frames.set(next, cb);
      return next;
    },
    cancelAnimationFrame(frameId) {
      frames.delete(frameId);
    },
    runOneFrame() {
      const next = frames.entries().next();
      if (next.done) return false;
      const [frameId, cb] = next.value;
      frames.delete(frameId);
      cb(Date.now());
      return true;
    },
    pendingFrames() {
      return frames.size;
    },
  };
}

function createContextSpy() {
  const calls = {
    clearRect: 0,
    fillRect: 0,
  };
  return {
    calls,
    setTransform() {},
    clearRect() {
      calls.clearRect += 1;
    },
    createLinearGradient() {
      return {
        addColorStop() {},
      };
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    fillRect() {
      calls.fillRect += 1;
    },
  };
}

function createCanvas(context) {
  return {
    clientWidth: 960,
    clientHeight: 540,
    width: 0,
    height: 0,
    classList: createClassList(),
    getContext(type) {
      return type === '2d' ? context : null;
    },
  };
}

test('hypothesis: shader mode is normalized so invalid dev options fail safe', () => {
  assert.equal(effects.normalizeBackgroundEffectMode('Aurora'), 'aurora');
  assert.equal(effects.normalizeBackgroundEffectMode('EQUALIZER'), 'equalizer');
  assert.equal(effects.normalizeBackgroundEffectMode('unknown-mode'), 'off');
  assert.equal(effects.normalizeBackgroundEffectMode(''), 'off');
});

test('hypothesis: canvas background switches cleanly between aurora/equalizer/off', () => {
  const runtime = createRuntime();
  const context = createContextSpy();
  const canvas = createCanvas(context);
  const manager = effects.createBackgroundEffects({ canvas, runtime });

  assert.equal(manager.getMode(), 'off');
  assert.equal(canvas.classList.contains('is-active'), false);

  assert.equal(manager.setMode('aurora'), 'aurora');
  assert.equal(canvas.classList.contains('is-active'), true);
  assert.ok(runtime.pendingFrames() > 0, 'aurora mode should request animation frames');
  runtime.runOneFrame();

  assert.equal(manager.setMode('equalizer'), 'equalizer');
  runtime.runOneFrame();
  assert.ok(context.calls.fillRect > 0, 'equalizer mode should render bars');

  assert.equal(manager.setMode('off'), 'off');
  assert.equal(canvas.classList.contains('is-active'), false);
  assert.equal(runtime.pendingFrames(), 0, 'off mode should stop scheduled animation');
  manager.destroy();
});

test('hypothesis: renderer shell exposes top dev switch for comparing shader backgrounds', () => {
  const rootDir = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(rootDir, 'src', 'renderer', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(rootDir, 'src', 'renderer', 'app.js'), 'utf8');

  assert.ok(html.includes('id="appBackgroundCanvas"'), 'background canvas is missing in HTML');
  assert.ok(html.includes('id="devTools"'), 'dev tools mount node is missing in header');
  assert.ok(
    html.includes('src="./background-effects.js"'),
    'background-effects module is not loaded before app.js',
  );
  assert.ok(
    app.includes('data-action="set-background-effect"'),
    'shader switch buttons are missing in app template',
  );
});
