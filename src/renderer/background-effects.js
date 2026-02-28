(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.hkBackgroundEffects = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const BACKGROUND_EFFECT_MODES = ['off', 'aurora', 'equalizer'];
  const DEFAULT_BACKGROUND_EFFECT_MODE = 'off';

  function normalizeBackgroundEffectMode(value) {
    const mode = String(value || '')
      .trim()
      .toLowerCase();
    return BACKGROUND_EFFECT_MODES.includes(mode) ? mode : DEFAULT_BACKGROUND_EFFECT_MODE;
  }

  function createBackgroundEffects(options = {}) {
    const canvas = options.canvas;
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new Error('background-effects: canvas with 2d context is required');
    }

    const runtime = options.runtime || (typeof window !== 'undefined' ? window : globalThis);
    const requestFrame =
      typeof runtime.requestAnimationFrame === 'function'
        ? runtime.requestAnimationFrame.bind(runtime)
        : (cb) => setTimeout(() => cb(Date.now()), 16);
    const cancelFrame =
      typeof runtime.cancelAnimationFrame === 'function'
        ? runtime.cancelAnimationFrame.bind(runtime)
        : (id) => clearTimeout(id);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('background-effects: 2d context is unavailable');
    }

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let frameId = 0;
    let isRunning = false;
    let mode = DEFAULT_BACKGROUND_EFFECT_MODE;
    let eqPhase = 0;
    const startedAt = Date.now();

    function setCanvasActive(active) {
      if (canvas.classList && typeof canvas.classList.toggle === 'function') {
        canvas.classList.toggle('is-active', !!active);
      }
    }

    function resize() {
      const fallbackWidth = Number(canvas.width) || 1;
      const fallbackHeight = Number(canvas.height) || 1;
      width = Math.max(1, Number(canvas.clientWidth) || fallbackWidth);
      height = Math.max(1, Number(canvas.clientHeight) || fallbackHeight);
      pixelRatio = Math.min(Number(runtime.devicePixelRatio) || 1, 1.5);

      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      if (typeof context.setTransform === 'function') {
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      }
    }

    function clear() {
      context.clearRect(0, 0, width, height);
    }

    function drawAurora(time) {
      for (let index = 0; index < 5; index += 1) {
        const gradient = context.createLinearGradient(0, 0, width, height * 0.7);
        const h1 = (210 + index * 22 + time * 14) % 360;
        const h2 = (250 + index * 18 + time * 20) % 360;
        gradient.addColorStop(0, `hsla(${h1},50%,75%,${0.08 - index * 0.012})`);
        gradient.addColorStop(0.5, `hsla(${h2},40%,80%,${0.05 - index * 0.007})`);
        gradient.addColorStop(1, `hsla(${(h1 + 60) % 360},30%,85%,0.03)`);
        context.fillStyle = gradient;

        context.beginPath();
        const yBase = height * (0.12 + index * 0.13);
        context.moveTo(-10, height + 10);
        for (let x = -10; x <= width + 10; x += 6) {
          const nx = x / Math.max(width, 1);
          const w1 =
            Math.sin(nx * 5 + time * 0.6 + index) * Math.cos(nx * 3 - time * 0.3);
          const w2 =
            Math.sin(nx * 7 - time * 0.4 + index * 0.5) *
            Math.cos(nx * 2 + time * 0.5);
          context.lineTo(x, yBase + (w1 * 0.2 + w2 * 0.12) * height * 0.3);
        }
        context.lineTo(width + 10, height + 10);
        context.closePath();
        context.fill();
      }
    }

    function drawEqualizer() {
      const barAreaHeight = Math.max(110, Math.min(240, height * 0.24));
      const yOffset = height - barAreaHeight;
      const bars = Math.max(20, Math.floor(width / 14));
      const gap = 3;
      const barWidth = Math.max(2, width / bars - gap);

      const backdrop = context.createLinearGradient(0, yOffset, 0, height);
      backdrop.addColorStop(0, 'rgba(24,25,28,0)');
      backdrop.addColorStop(1, 'rgba(24,25,28,0.18)');
      context.fillStyle = backdrop;
      context.fillRect(0, yOffset, width, barAreaHeight);

      for (let index = 0; index < bars; index += 1) {
        const x = index * (barWidth + gap);
        const wave = Math.abs(Math.sin(eqPhase * 1.5 + index * 0.25));
        const barHeight = 10 + wave * barAreaHeight * 0.7;
        context.fillStyle =
          index % 7 === 0 ? 'rgba(223,97,57,0.52)' : 'rgba(24,25,28,0.3)';
        context.fillRect(x, height - barHeight, barWidth, barHeight);
      }
      eqPhase += 0.016;
    }

    function tick() {
      if (!isRunning) return;
      clear();
      if (mode === 'aurora') {
        const time = (Date.now() - startedAt) * 0.00025;
        drawAurora(time);
      } else if (mode === 'equalizer') {
        drawEqualizer();
      }
      frameId = requestFrame(tick);
    }

    function stop() {
      isRunning = false;
      if (frameId) {
        cancelFrame(frameId);
        frameId = 0;
      }
      clear();
    }

    function start() {
      if (isRunning) return;
      isRunning = true;
      frameId = requestFrame(tick);
    }

    function setMode(nextMode) {
      mode = normalizeBackgroundEffectMode(nextMode);
      setCanvasActive(mode !== 'off');
      if (mode === 'off') {
        stop();
      } else {
        resize();
        start();
      }
      return mode;
    }

    function getMode() {
      return mode;
    }

    function destroy() {
      stop();
      if (typeof runtime.removeEventListener === 'function') {
        runtime.removeEventListener('resize', resize);
      }
      if (canvas.classList && typeof canvas.classList.remove === 'function') {
        canvas.classList.remove('is-active');
      }
    }

    if (typeof runtime.addEventListener === 'function') {
      runtime.addEventListener('resize', resize);
    }
    resize();
    setCanvasActive(false);

    return {
      setMode,
      getMode,
      destroy,
      resize,
    };
  }

  return {
    BACKGROUND_EFFECT_MODES,
    DEFAULT_BACKGROUND_EFFECT_MODE,
    normalizeBackgroundEffectMode,
    createBackgroundEffects,
  };
});
