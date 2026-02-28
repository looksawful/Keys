(function () {
  function fatal(title, details) {
    try {
      if (typeof window.__hkFatal === 'function') {
        window.__hkFatal(title, details);
        return;
      }
    } catch {}
    try {
      const msg = (details && String(details)) || '';
      document.body.innerHTML = `
        <div class="fatal-screen">
          <h1 class="fatal-title">${escapeHtml(title)}</h1>
          <pre class="fatal-details">${escapeHtml(msg)}</pre>
        </div>`;
    } catch {}
  }

  try {
    if (!window.hkData || !window.hkLogic || !window.hkProgramImport || !window.hkProgramImportSession) {
      fatal(
        'Ошибка загрузки модулей',
        `hkData=${!!window.hkData} hkLogic=${!!window.hkLogic} hkProgramImport=${!!window.hkProgramImport} hkProgramImportSession=${!!window.hkProgramImportSession}`,
      );
      return;
    }

    const { defaultPrograms, colorOptions } = window.hkData;
    const {
      normalizeKey,
      normalizeKeySet,
      parseKeyCombo,
      compareKeySets,
      shuffle,
      createQuizState,
      calcProgramProgress,
      calcAverageScore,
    } = window.hkLogic;
    const { createImporter } = window.hkProgramImport;
    const {
      buildPreviewFromText,
      buildPreviewFromSources,
      applyPreview,
      undoImport,
    } = window.hkProgramImportSession;
    const hkBackgroundEffects = window.hkBackgroundEffects || null;
    const hasBackgroundEffects =
      !!hkBackgroundEffects &&
      typeof hkBackgroundEffects.createBackgroundEffects === 'function';
    const createBackgroundEffects =
      hasBackgroundEffects &&
      typeof hkBackgroundEffects.createBackgroundEffects === 'function'
        ? hkBackgroundEffects.createBackgroundEffects
        : null;
    const normalizeBackgroundEffectMode =
      hasBackgroundEffects &&
      typeof hkBackgroundEffects.normalizeBackgroundEffectMode === 'function'
        ? hkBackgroundEffects.normalizeBackgroundEffectMode
        : (value) => {
            const normalized = String(value || '')
              .trim()
              .toLowerCase();
            if (normalized === 'aurora' || normalized === 'equalizer') {
              return normalized;
            }
            return 'off';
          };

    const DEFAULT_COLOR = colorOptions[0] || '#2563eb';
    const COLOR_SET = new Set(colorOptions.map((c) => String(c).toLowerCase()));

    const STORAGE_KEYS = {
      programs: 'hk_p',
      stats: 'hk_s',
      showShortcuts: 'hk_sh',
      settings: 'hk_cfg',
      survey: 'hk_sv',
    };
    const ICONS = {
      home: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-home"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
  <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
</svg>`,
      editor: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-edit-3"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M13 21h8" />
  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
</svg>`,
      stats: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-bar-chart-3"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M3 3v16a2 2 0 0 0 2 2h16" />
  <path d="M18 17V9" />
  <path d="M13 17V5" />
  <path d="M8 17v-3" />
</svg>`,
      settings: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-sliders-horizontal"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M10 5H3" />
  <path d="M12 19H3" />
  <path d="M14 3v4" />
  <path d="M16 17v4" />
  <path d="M21 12h-9" />
  <path d="M21 19h-5" />
  <path d="M21 5h-7" />
  <path d="M8 10v4" />
  <path d="M8 12H3" />
</svg>`,
      help: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-help-circle"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="12" r="10" />
  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
  <path d="M12 17h.01" />
</svg>`,
      study: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-book-open"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 7v14" />
  <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
</svg>`,
      quiz: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-play"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
</svg>`,
      add: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-plus"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M5 12h14" />
  <path d="M12 5v14" />
</svg>`,
      trash: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-trash-2"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M10 11v6" />
  <path d="M14 11v6" />
  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  <path d="M3 6h18" />
  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
</svg>`,
      reset: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-rotate-ccw"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
  <path d="M3 3v5h5" />
</svg>`,
      history: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-clock"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 6v6l4 2" />
  <circle cx="12" cy="12" r="10" />
</svg>`,
      survey: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-clipboard-list"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  <path d="M12 11h4" />
  <path d="M12 16h4" />
  <path d="M8 11h.01" />
  <path d="M8 16h.01" />
</svg>`,
      submit: `<svg aria-hidden="true" focusable="false"
  class="lucide lucide-check-circle"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M21.801 10A10 10 0 1 1 17 3.335" />
  <path d="m9 11 3 3L22 4" />
</svg>`,
    };

    function icon(name) {
      const svg = ICONS[name];
      return svg ? `<span class="icon">${svg}</span>` : '';
    }

    const MODIFIER_ORDER = {
      Shift: 0,
      Alt: 1,
      Ctrl: 2,
      Win: 3,
    };

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (ch) => {
        switch (ch) {
          case '&':
            return '&amp;';
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case '"':
            return '&quot;';
          case "'":
            return '&#39;';
          default:
            return ch;
        }
      });
    }

    function escapeAttr(value) {
      return escapeHtml(value).replace(/`/g, '&#96;');
    }

    function sanitizeColor(value) {
      if (typeof value !== 'string') return DEFAULT_COLOR;
      const candidate = value.trim().toLowerCase();
      if (!candidate || !COLOR_SET.has(candidate)) return DEFAULT_COLOR;
      return colorOptions.find((c) => String(c).toLowerCase() === candidate) || DEFAULT_COLOR;
    }

    function getProgramNameById(id) {
      const entry = id && progs[id];
      return entry ? entry.name : '';
    }

    function getProgramInitial(name) {
      if (!name) return '';
      return String(name).trim().charAt(0) || '';
    }

    function isModifierKey(key) {
      return key === 'Shift' || key === 'Alt' || key === 'Ctrl' || key === 'Win';
    }

    function isFunctionKey(key) {
      return /^F\d+$/i.test(String(key || ''));
    }

    function formatKeyList(keys) {
      const unique = Array.from(new Set(keys)).filter(Boolean);
      const modifiers = [];
      const functionKeys = [];
      const rest = [];
      for (const key of unique) {
        if (isModifierKey(key)) modifiers.push(key);
        else if (isFunctionKey(key)) functionKeys.push(key);
        else rest.push(key);
      }
      modifiers.sort(
        (a, b) => (MODIFIER_ORDER[a] ?? 999) - (MODIFIER_ORDER[b] ?? 999),
      );
      functionKeys.sort((a, b) => {
        const aNum = Number(String(a).slice(1));
        const bNum = Number(String(b).slice(1));
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
        return String(a).localeCompare(String(b));
      });
      rest.sort((a, b) => String(a).localeCompare(String(b)));
      return [...modifiers, ...functionKeys, ...rest];
    }

    function formatKeyCombo(keys) {
      return formatKeyList(keys).join(' + ');
    }

    function normalizeSearchText(value) {
      return String(value || '').trim().toLowerCase();
    }

    function normalizeSearchCompact(value) {
      return normalizeSearchText(value).replace(/\s+/g, '');
    }

    function shortcutMatchesSearch(shortcut, query, compactQuery, plainQuery) {
      if (!query) return true;
      const action = String(shortcut.a || '').toLowerCase();
      if (action.includes(query)) return true;
      const combo = formatKeyCombo(shortcut.k).toLowerCase();
      if (combo.includes(query)) return true;
      const comboCompact = combo.replace(/\s+/g, '');
      if (compactQuery && comboCompact.includes(compactQuery)) return true;
      if (plainQuery && comboCompact.replace(/\+/g, '').includes(plainQuery)) return true;
      return false;
    }

    function programMatchesSearch(program, query, compactQuery, plainQuery) {
      if (!query) return true;
      const name = String(program.name || '').toLowerCase();
      if (name.includes(query)) return true;
      return Array.isArray(program.sc)
        ? program.sc.some((s) => shortcutMatchesSearch(s, query, compactQuery, plainQuery))
        : false;
    }

    function suppressEvent(e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    }

    const HOTKEY_DEFAULTS = {
      nav: {
        home: 'F2',
        editor: 'F3',
        stats: 'F4',
        settings: 'F6',
        help: 'F1',
      },
      quiz: {
        check: 'F7, Enter',
        deleteLast: 'F8, Backspace',
        reset: 'F9, Esc',
        skip: 'F10',
        quit: 'F11',
      },
    };

    const DEFAULT_SETTINGS = {
      confirmQuit: true,
      confirmDestructive: true,
      defaultDifficulty: 'all',
      defaultCount: 10,
      showShortcutsInQuiz: false,
      defaultMode: 'input',
      theme: 'dark',
      hotkeys: JSON.parse(JSON.stringify(HOTKEY_DEFAULTS)),
    };

    const NAV_ITEMS = [
      { id: 'home', label: 'Главная', view: 'home', hotkeyId: 'nav.home', icon: 'home' },
      { id: 'editor', label: 'Редактор', view: 'editor', hotkeyId: 'nav.editor', icon: 'editor' },
      { id: 'stats', label: 'Статистика', view: 'stats', hotkeyId: 'nav.stats', icon: 'stats' },
      { id: 'settings', label: 'Параметры', view: 'settings', hotkeyId: 'nav.settings', icon: 'settings' },
      { id: 'help', label: 'Подсказки', action: 'show-help', hotkeyId: 'nav.help', icon: 'help' },
    ];

    const QUIZ_SHORTCUTS = [
      { label: 'Тест: проверить/далее', hotkeyId: 'quiz.check' },
      { label: 'Тест: удалить последний', hotkeyId: 'quiz.deleteLast' },
      { label: 'Тест: сброс', hotkeyId: 'quiz.reset' },
      { label: 'Тест: пропуск', hotkeyId: 'quiz.skip' },
      { label: 'Тест: выход', hotkeyId: 'quiz.quit' },
    ];
    const BACKGROUND_EFFECT_OPTIONS = [
      { id: 'off', label: 'Выкл' },
      { id: 'aurora', label: 'Aurora' },
      { id: 'equalizer', label: 'Equalizer' },
    ];
    const BACKGROUND_EFFECT_DEFAULT = 'aurora';

    function clonePrograms() {
      return JSON.parse(JSON.stringify(defaultPrograms));
    }

    function mergeProgramsWithDefaults(stored) {
      const defaults = clonePrograms();
      if (!stored) return defaults;
      return { ...defaults, ...stored };
    }

    function isValidDifficulty(d) {
      return d === 'easy' || d === 'medium' || d === 'hard';
    }

    function isValidMode(mode) {
      return mode === 'input' || mode === 'choice';
    }

    function isValidTheme(theme) {
      return theme === 'dark' || theme === 'light';
    }

    const programImporter = createImporter({
      normalizeKey,
      parseKeyCombo,
      formatKeyList,
      sanitizeColor,
      isValidDifficulty,
    });

    function normalizeHotkeyString(value, fallback) {
      if (typeof value !== 'string') return fallback;
      const trimmed = value.trim();
      return trimmed ? trimmed : fallback;
    }

    function sanitizeHotkeys(input) {
      const out = JSON.parse(JSON.stringify(HOTKEY_DEFAULTS));
      if (!input || typeof input !== 'object') return out;
      if (input.nav && typeof input.nav === 'object') {
        out.nav.home = normalizeHotkeyString(input.nav.home, out.nav.home);
        out.nav.editor = normalizeHotkeyString(input.nav.editor, out.nav.editor);
        out.nav.stats = normalizeHotkeyString(input.nav.stats, out.nav.stats);
        out.nav.settings = normalizeHotkeyString(input.nav.settings, out.nav.settings);
        out.nav.help = normalizeHotkeyString(input.nav.help, out.nav.help);
      }
      if (input.quiz && typeof input.quiz === 'object') {
        out.quiz.check = normalizeHotkeyString(input.quiz.check, out.quiz.check);
        out.quiz.deleteLast = normalizeHotkeyString(input.quiz.deleteLast, out.quiz.deleteLast);
        out.quiz.reset = normalizeHotkeyString(input.quiz.reset, out.quiz.reset);
        out.quiz.skip = normalizeHotkeyString(input.quiz.skip, out.quiz.skip);
        out.quiz.quit = normalizeHotkeyString(input.quiz.quit, out.quiz.quit);
      }
      return out;
    }

    function parseHotkeyList(value) {
      const parts = String(value || '')
        .split(/[,;]+/)
        .map((part) => part.trim())
        .filter(Boolean);
      const combos = parts
        .map((part) => parseKeyCombo(part))
        .filter((combo) => combo.length);
      return combos.length ? combos : null;
    }

    function buildHotkeyCache(hotkeys) {
      const source = sanitizeHotkeys(hotkeys);
      const nav = {
        home: parseHotkeyList(source.nav.home) || parseHotkeyList(HOTKEY_DEFAULTS.nav.home),
        editor:
          parseHotkeyList(source.nav.editor) || parseHotkeyList(HOTKEY_DEFAULTS.nav.editor),
        stats: parseHotkeyList(source.nav.stats) || parseHotkeyList(HOTKEY_DEFAULTS.nav.stats),
        settings:
          parseHotkeyList(source.nav.settings) ||
          parseHotkeyList(HOTKEY_DEFAULTS.nav.settings),
        help: parseHotkeyList(source.nav.help) || parseHotkeyList(HOTKEY_DEFAULTS.nav.help),
      };
      const quiz = {
        check:
          parseHotkeyList(source.quiz.check) || parseHotkeyList(HOTKEY_DEFAULTS.quiz.check),
        deleteLast:
          parseHotkeyList(source.quiz.deleteLast) ||
          parseHotkeyList(HOTKEY_DEFAULTS.quiz.deleteLast),
        reset:
          parseHotkeyList(source.quiz.reset) || parseHotkeyList(HOTKEY_DEFAULTS.quiz.reset),
        skip: parseHotkeyList(source.quiz.skip) || parseHotkeyList(HOTKEY_DEFAULTS.quiz.skip),
        quit: parseHotkeyList(source.quiz.quit) || parseHotkeyList(HOTKEY_DEFAULTS.quiz.quit),
      };
      return { nav, quiz };
    }

    function sanitizePrograms(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
      const out = {};
      for (const [id, p] of Object.entries(input)) {
        if (!p || typeof p !== 'object') continue;
        const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : null;
        const color = sanitizeColor(p.color);
        const scRaw = Array.isArray(p.sc) ? p.sc : [];
        const sc = scRaw
          .map((s) => {
            if (!s || typeof s !== 'object') return null;
            const action = typeof s.a === 'string' ? s.a.trim() : '';
            const keys = Array.isArray(s.k)
              ? formatKeyList(
                  s.k
                    .filter((k) => typeof k === 'string' && k.trim())
                    .map((k) => normalizeKey(k))
                    .filter(Boolean),
                )
              : [];
            const diff = isValidDifficulty(s.d) ? s.d : 'easy';
            const sid = Number.isFinite(Number(s.id)) ? Number(s.id) : null;
            if (!action || !keys.length || sid === null) return null;
            return { id: sid, a: action, k: keys, d: diff };
          })
          .filter(Boolean);

        if (!name) continue;
        out[id] = { name, color, sc };
      }
      return Object.keys(out).length ? out : null;
    }

    function loadPrograms() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.programs);
        if (raw) {
          const parsed = JSON.parse(raw);
          const sanitized = sanitizePrograms(parsed);
          if (sanitized) return mergeProgramsWithDefaults(sanitized);
        }
      } catch (err) {
      }
      return mergeProgramsWithDefaults(null);
    }

    function loadStats() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.stats);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            h: Array.isArray(parsed.h) ? parsed.h : [],
            t: Number.isFinite(parsed.t) ? parsed.t : 0,
            c: Number.isFinite(parsed.c) ? parsed.c : 0,
          };
        }
      } catch (err) {
      }
      return { h: [], t: 0, c: 0 };
    }

    function sanitizeSettings(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
      const out = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      if (typeof input.confirmQuit === 'boolean') out.confirmQuit = input.confirmQuit;
      if (typeof input.confirmDestructive === 'boolean') out.confirmDestructive = input.confirmDestructive;
      if (input.defaultDifficulty === 'all' || isValidDifficulty(input.defaultDifficulty)) {
        out.defaultDifficulty = input.defaultDifficulty;
      }
      if (Number.isFinite(Number(input.defaultCount)) && Number(input.defaultCount) > 0) {
        out.defaultCount = Math.round(Number(input.defaultCount));
      }
      if (typeof input.showShortcutsInQuiz === 'boolean') {
        out.showShortcutsInQuiz = input.showShortcutsInQuiz;
      }
      if (isValidTheme(input.theme)) {
        out.theme = input.theme;
      }
      if (isValidMode(input.defaultMode)) {
        out.defaultMode = input.defaultMode;
      }
      if (input.hotkeys) {
        out.hotkeys = sanitizeHotkeys(input.hotkeys);
      } else {
        out.hotkeys = sanitizeHotkeys(out.hotkeys);
      }
      return out;
    }

    function loadSettings() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.settings);
        if (raw) {
          const parsed = JSON.parse(raw);
          const sanitized = sanitizeSettings(parsed);
          if (sanitized) return sanitized;
        }
      } catch {}
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    function applyTheme(theme) {
      const nextTheme = theme === 'light' ? 'light' : 'dark';
      document.documentElement.dataset.theme = nextTheme;
    }

    function saveSettings() {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
      applyTheme(settings.theme);
      hotkeyCache = buildHotkeyCache(settings.hotkeys);
    }

    function getHotkeyCombosById(id) {
      if (!id) return [];
      const [group, key] = id.split('.');
      const bucket = hotkeyCache[group];
      return bucket && bucket[key] ? bucket[key] : [];
    }

    function formatHotkeyLabels(id) {
      const combos = getHotkeyCombosById(id);
      return combos.map((combo) => formatKeyCombo(combo));
    }

    function getPrimaryHotkeyLabel(id) {
      const labels = formatHotkeyLabels(id);
      return labels[0] || '';
    }

    function getHotkeyTooltip(id) {
      const labels = formatHotkeyLabels(id);
      return labels.length ? labels.join(' / ') : '';
    }

    function comboIdFromSet(set) {
      return formatKeyList(Array.from(set))
        .map((key) => String(key).toLowerCase())
        .join('+');
    }

    function matchesHotkey(id, downSet) {
      const combos = getHotkeyCombosById(id);
      return combos.some((combo) => compareKeySets(Array.from(downSet), combo));
    }

    function tryHotkey(id, downSet, comboId, handler) {
      if (!matchesHotkey(id, downSet)) return false;
      if (!comboId || comboId === hotkeyState.lastCombo) return false;
      hotkeyState.lastCombo = comboId;
      handler();
      return true;
    }

    function getDefaultHotkeyString(id) {
      const [group, key] = id.split('.');
      return HOTKEY_DEFAULTS[group] && HOTKEY_DEFAULTS[group][key]
        ? HOTKEY_DEFAULTS[group][key]
        : '';
    }

    function normalizeHotkeyInput(value, fallback) {
      const combos = parseHotkeyList(value);
      if (!combos) return fallback || '';
      return combos.map((combo) => formatKeyCombo(combo)).join(', ');
    }

    function setHotkeySetting(id, value) {
      const [group, key] = id.split('.');
      if (!group || !key) return;
      const fallback = getDefaultHotkeyString(id);
      const normalized = normalizeHotkeyInput(value, fallback);
      if (!settings.hotkeys[group]) settings.hotkeys[group] = {};
      settings.hotkeys[group][key] = normalized;
      saveSettings();
      return normalized;
    }

    function loadSurvey() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.survey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch {}
      return [];
    }

    function saveSurvey() {
      localStorage.setItem(STORAGE_KEYS.survey, JSON.stringify(survey));
    }

    function exportHotkeys() {
      const payload = { hotkeys: settings.hotkeys };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hotkeys.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    function importHotkeys(file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || ''));
          if (!data || typeof data !== 'object' || !data.hotkeys) {
            alert('Файл не содержит горячие клавиши.');
            return;
          }
          settings.hotkeys = sanitizeHotkeys(data.hotkeys);
          saveSettings();
          render();
        } catch {
          alert('Не удалось прочитать файл.');
        }
      };
      reader.onerror = () => alert('Не удалось прочитать файл.');
      reader.readAsText(file);
    }

    function readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('read_failed'));
        reader.readAsText(file);
      });
    }

    function normalizeImportStatusLine(line) {
      const text = String(line || '');
      const mapCode = (code) => {
        if (code === 'empty_text') return 'Пустой JSON';
        if (code === 'invalid_json') return 'Синтаксическая ошибка JSON';
        if (code === 'no_programs_found') return 'Программы не найдены';
        if (code === 'no_valid_programs') return 'Нет валидных профилей';
        if (code === 'read_failed') return 'Файл не удалось прочитать';
        if (code === 'invalid_programs_store') return 'Некорректное хранилище программ';
        if (code === 'no_programs_to_import') return 'Нет данных для импорта';
        if (code === 'no_preview') return 'Нет подготовленного предпросмотра';
        if (code === 'no_snapshot') return 'Нет состояния для отмены';
        return code;
      };
      const parts = text.split(':');
      if (parts.length < 2) return text;
      const left = parts.shift();
      const right = parts.join(':').trim();
      return `${left}: ${mapCode(right)}`;
    }

    function setImportStatus(status) {
      if (!status) {
        importStatus = null;
        return;
      }
      importStatus = {
        kind: status.kind || 'info',
        title: status.title || 'Статус импорта',
        details: Array.isArray(status.details)
          ? status.details.map((line) => normalizeImportStatusLine(line))
          : [],
      };
    }

    function clearImportPreview() {
      importPreview = null;
    }

    function prepareImportPreviewFromText(text, sourceLabel) {
      const result = buildPreviewFromText({
        importer: programImporter,
        currentPrograms: progs,
        source: sourceLabel || 'JSON',
        text,
      });
      importPreview = result.ok ? result.preview : null;
      setImportStatus(result.status);
      return result;
    }

    async function prepareImportPreviewFromFiles(fileList) {
      const files = Array.from(fileList || []).filter(Boolean);
      if (!files.length) return null;

      const sources = [];
      for (const file of files) {
        const fileName = (file && file.name) || 'JSON';
        try {
          const text = await readFileAsText(file);
          sources.push({ source: fileName, text });
        } catch {
          sources.push({ source: fileName, code: 'read_failed' });
        }
      }

      const result = buildPreviewFromSources({
        importer: programImporter,
        currentPrograms: progs,
        sources,
      });
      importPreview = result.ok ? result.preview : null;
      setImportStatus(result.status);
      return result;
    }

    function applyPreparedImport() {
      const result = applyPreview({
        currentPrograms: progs,
        preview: importPreview,
      });
      if (!result.ok) {
        setImportStatus(result.status);
        return result;
      }
      importLastSnapshot = result.lastSnapshot;
      progs = result.programs;
      if (result.selectedProgramId) {
        eprog = result.selectedProgramId;
        sel = result.selectedProgramId;
      }
      clearImportPreview();
      importProgramsDraft = '';
      saveState();
      setImportStatus(result.status);
      return result;
    }

    function undoLastProgramsImport() {
      const result = undoImport({
        lastSnapshot: importLastSnapshot,
      });
      if (!result.ok) {
        setImportStatus(result.status);
        return result;
      }
      progs = result.programs;
      importLastSnapshot = null;
      clearImportPreview();
      saveState();
      setImportStatus(result.status);
      return result;
    }

    function recalcTotals() {
      st.t = st.h.length;
      st.c = st.h.reduce((sum, entry) => sum + (entry.c || 0), 0);
    }

    function confirmAction(message) {
      if (!settings.confirmDestructive) return true;
      return confirm(message);
    }

    function resetSurveyDraft() {
      surveyDraft = {
        rating: 0,
        track: 'design',
        frequency: 'weekly',
        comment: '',
      };
    }

    let settings = loadSettings();
    applyTheme(settings.theme);
    let hotkeyCache = buildHotkeyCache(settings.hotkeys);
    let hotkeyState = { down: new Set(), lastCombo: '' };
    let view = 'home';
    let progs = loadPrograms();
    let st = loadStats();
    let sel = Object.keys(progs)[0] || null;
    let qcfg = {
      d: settings.defaultDifficulty,
      n: settings.defaultCount,
      mode: settings.defaultMode,
    };
    let qz = null;
    let res = null;
    let sfil = 'all';
    let progQuery = '';
    let studyQuery = '';
    let editorProgramQuery = '';
    let editorShortcutQuery = '';
    let importProgramsDraft = '';
    let importDropActive = false;
    let importPreview = null;
    let importStatus = null;
    let importLastSnapshot = null;
    let eprog = Object.keys(progs)[0] || null;
    let mdl = null;
    let showShortcutsPanel = loadShowShortcuts();
    let showShortcutsPanelInQuiz = settings.showShortcutsInQuiz;
    let statsProgram = 'all';
    let survey = loadSurvey();
    let surveyDraft;
    let keyCapture = { active: false, keys: new Set(), down: new Set(), prevValue: '' };
    let quizCapture = { down: new Set(), resetOnNext: false };
    let backgroundEffects = null;
    let backgroundEffectMode = normalizeBackgroundEffectMode(BACKGROUND_EFFECT_DEFAULT);

    function initBackgroundEffects() {
      if (!createBackgroundEffects) return;
      const canvas = document.getElementById('appBackgroundCanvas');
      if (!canvas) return;
      try {
        backgroundEffects = createBackgroundEffects({ canvas });
      } catch {
        backgroundEffects = null;
      }
    }

    function setBackgroundEffect(mode) {
      const nextMode = normalizeBackgroundEffectMode(mode);
      if (!backgroundEffects) {
        backgroundEffectMode = 'off';
        return backgroundEffectMode;
      }
      backgroundEffectMode = backgroundEffects.setMode(nextMode);
      return backgroundEffectMode;
    }

    resetSurveyDraft();
    initBackgroundEffects();
    setBackgroundEffect(backgroundEffectMode);

    function loadShowShortcuts() {
      const saved = localStorage.getItem(STORAGE_KEYS.showShortcuts);
      return saved !== 'false';
    }

    function saveShowShortcuts() {
      localStorage.setItem(STORAGE_KEYS.showShortcuts, showShortcutsPanel);
    }

    function saveQuizShortcuts() {
      settings.showShortcutsInQuiz = showShortcutsPanelInQuiz;
      saveSettings();
    }

    function ensureSelectedProgram() {
      if (!sel || !progs[sel]) {
        sel = Object.keys(progs)[0] || null;
      }
    }

    function ensureEditorProgram() {
      if (!eprog || !progs[eprog]) {
        eprog = Object.keys(progs)[0] || null;
      }
    }

    function ensureStatsProgram() {
      if (statsProgram !== 'all' && !progs[statsProgram]) {
        statsProgram = 'all';
      }
    }

    function saveState() {
      localStorage.setItem(STORAGE_KEYS.programs, JSON.stringify(progs));
      localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(st));
    }

    function isTypingTarget(el) {
      return (
        !!el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      );
    }

    function orderKeys(keys) {
      return formatKeyList(keys);
    }


    function updateCaptureButton(active) {
      const btn = document.querySelector('[data-action="toggle-capture"]');
      if (!btn) return;
      btn.classList.toggle('is-active', active);
      const label = btn.querySelector('.record-label');
      if (label) label.textContent = active ? 'Запись' : 'Записать';
    }

    function startKeyCapture() {
      const input = document.getElementById('mk');
      keyCapture.prevValue = input ? input.value : '';
      keyCapture.keys = new Set();
      keyCapture.down = new Set();
      keyCapture.active = true;
      if (input) {
        input.value = '';
        input.classList.add('input-recording');
        input.placeholder = 'Нажмите комбинацию';
        input.focus();
      }
      updateCaptureButton(true);
    }

    function stopKeyCapture(restorePrev) {
      const input = document.getElementById('mk');
      keyCapture.active = false;
      keyCapture.down = new Set();
      if (restorePrev && input) {
        input.value = keyCapture.prevValue || '';
      }
      if (input) {
        input.classList.remove('input-recording');
        input.placeholder = '';
      }
      updateCaptureButton(false);
    }

    function updateCaptureInput() {
      const input = document.getElementById('mk');
      if (!input) return;
      input.value = formatKeyCombo(Array.from(keyCapture.keys));
    }

    function handleCaptureKeydown(e, normalizedKey) {
      if (!keyCapture.active) return false;
      if (e.repeat) return true;
      if (!normalizedKey) return true;
      if (normalizedKey === 'Esc') {
        stopKeyCapture(true);
        return true;
      }
      suppressEvent(e);
      if (!keyCapture.down.has(normalizedKey)) {
        keyCapture.down.add(normalizedKey);
        keyCapture.keys.add(normalizedKey);
        updateCaptureInput();
      }
      return true;
    }

    function handleCaptureKeyup(normalizedKey) {
      if (!keyCapture.active) return false;
      if (!normalizedKey) return true;
      keyCapture.down.delete(normalizedKey);
      if (keyCapture.down.size === 0 && keyCapture.keys.size) {
        stopKeyCapture(false);
      }
      return true;
    }

    function resetQuizInputState() {
      if (!qz) return;
      qz.k = [];
      qz.choice = null;
      quizCapture.down = new Set();
      quizCapture.resetOnNext = false;
    }

    function resetKeyStates() {
      hotkeyState.down = new Set();
      hotkeyState.lastCombo = '';
      if (keyCapture.active) {
        stopKeyCapture(true);
      }
      if (qz && (!qz.mode || qz.mode === 'input') && !qz.sh) {
        quizCapture.down = new Set();
        quizCapture.resetOnNext = !!qz.k.length;
      } else {
        quizCapture.down = new Set();
        quizCapture.resetOnNext = false;
      }
    }

    function buildChoiceOptions(shortcuts, current, count = 4) {
      const options = [];
      const used = new Set();
      const pushOption = (shortcut) => {
        const label = formatKeyCombo(shortcut.k);
        const keyId = label.toLowerCase();
        if (used.has(keyId)) return;
        used.add(keyId);
        options.push({ label, keys: shortcut.k });
      };
      pushOption(current);
      const pool = shortcuts.filter((shortcut) => shortcut.id !== current.id);
      const shuffled = shuffle(pool);
      for (const candidate of shuffled) {
        if (options.length >= count) break;
        pushOption(candidate);
      }
      return shuffle(options);
    }

    function go(v, p) {
      view = v;
      if (p) sel = p;
      if (v !== 'editor') importDropActive = false;
      render();
    }

    function prog(id) {
      return calcProgramProgress(st.h, id);
    }

    function navItemsH() {
      return NAV_ITEMS.map((item) => {
        const isActive = item.view && view === item.view;
        const classes = [
          'app-nav-link',
          isActive ? 'active' : '',
          item.id === 'help' ? 'app-nav-help' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const action = item.action || 'go';
        const viewAttr = item.view ? ` data-view="${item.view}"` : '';
        const hotkeyLabel = getPrimaryHotkeyLabel(item.hotkeyId);
        return `<button class="${classes}" data-action="${action}"${viewAttr} data-tooltip="${hotkeyLabel}">
        <span class="app-nav-label">${icon(item.icon)}<span>${item.label}</span></span>
        <span class="app-nav-key">${hotkeyLabel}</span>
      </button>`;
      }).join('');
    }

    function devEffectsH() {
      if (!backgroundEffects) return '';
      const items = BACKGROUND_EFFECT_OPTIONS.map((item) => {
        const isActive = item.id === backgroundEffectMode;
        return `<button class="app-dev-btn${
          isActive ? ' active' : ''
        }" data-action="set-background-effect" data-effect="${item.id}" aria-pressed="${
          isActive ? 'true' : 'false'
        }">${item.label}</button>`;
      }).join('');
      return `<div class="app-dev-card">
      <div class="app-dev-title">Dev: фон</div>
      <div class="app-dev-actions">${items}</div>
    </div>`;
    }

    function shortcutItemH(label, keys) {
      return `<div class="shortcuts-hint-item">
          <span class="shortcuts-hint-label">${label}</span>
          <div class="shortcuts-hint-keys">
            ${keys.map((k) => `<span class="shortcuts-hint-key">${k}</span>`).join('')}
          </div>
        </div>`;
    }

    function searchFieldH({ action, value, placeholder, clearTarget }) {
      const safeValue = escapeAttr(value || '');
      const safePlaceholder = escapeAttr(placeholder || '');
      const clearBtn = value
        ? `<button class="btn btn-ghost btn-sm search-clear" data-action="clear-search" data-target="${clearTarget}">Очистить</button>`
        : '';
      return `<div class="search-row"><div class="search-field">
        <input class="input search-input" data-action="${action}" value="${safeValue}" placeholder="${safePlaceholder}">
        ${clearBtn}
      </div></div>`;
    }

    function editorImportH() {
      const dropClass = importDropActive ? ' is-active' : '';
      const statusBlock = importStatus
        ? `<div class="import-status import-status-${escapeAttr(importStatus.kind)}" role="status" aria-live="polite">
      <div class="import-status-title">${escapeHtml(importStatus.title)}</div>
      ${
        importStatus.details && importStatus.details.length
          ? `<ul class="import-status-list">${importStatus.details
              .map((line) => `<li>${escapeHtml(line)}</li>`)
              .join('')}</ul>`
          : ''
      }
    </div>`
        : '';
      const previewBlock = importPreview
        ? `<div class="import-preview">
      <div class="import-preview-title">Предпросмотр</div>
      <div class="import-preview-metrics">
        <span>Профилей: <strong>${importPreview.merged.importedPrograms}</strong></span>
        <span>Клавиш: <strong>${importPreview.merged.importedShortcuts}</strong></span>
        <span>Переименовано ID: <strong>${importPreview.merged.renamedIds}</strong></span>
      </div>
      <div class="editor-import-actions">
        <button class="btn btn-primary btn-sm" data-action="apply-programs-import">Применить импорт</button>
        <button class="btn btn-ghost btn-sm" data-action="clear-programs-import-preview">Сбросить предпросмотр</button>
      </div>
    </div>`
        : '';
      return `<div class="editor-import">
    <div class="editor-import-title">${icon('add')}<span>Импорт профиля программы</span></div>
    <div class="editor-dropzone${dropClass}" data-dropzone="program-import" data-action="choose-programs-json" role="button" tabindex="0" aria-label="Выбрать JSON файлы для импорта профилей">
      <strong>Перетащите JSON сюда</strong>
      <span>или нажмите Enter/Space для выбора файла</span>
    </div>
    <div class="editor-import-actions">
      <button class="btn btn-secondary btn-sm" data-action="choose-programs-json">Выбрать JSON</button>
      <button class="btn btn-secondary btn-sm" data-action="paste-programs-json">Вставить из буфера</button>
      <input class="hidden-input" type="file" id="programsJsonFile" data-action="programs-json-file" accept=".json,application/json" multiple>
    </div>
    <div class="editor-import-instruction">
      <strong>Короткая инструкция:</strong>
      <span>1) Экспортируйте хоткеи в JSON.</span>
      <span>2) Сформируйте профиль: <code>name</code> + <code>shortcuts[]</code>.</span>
      <span>3) В каждой клавише укажите <code>action</code>, <code>keys</code> (строка или массив), <code>difficulty</code> (<code>easy|medium|hard</code>).</span>
    </div>
    <details class="editor-import-example-wrap">
      <summary>Показать пример JSON</summary>
      <pre class="editor-import-example">{
  "programs": [
    {
      "id": "my_app",
      "name": "My App",
      "color": "#007acc",
      "shortcuts": [
        { "action": "Открыть файл", "keys": "Ctrl+O", "difficulty": "easy" }
      ]
    }
  ]
}</pre>
    </details>
    <textarea class="textarea editor-import-text" data-action="import-programs-json" placeholder='Вставьте JSON профиля сюда'>${escapeHtml(
      importProgramsDraft,
    )}</textarea>
    <div class="editor-import-actions">
      <button class="btn btn-primary btn-sm" data-action="import-programs-json-text">Подготовить предпросмотр</button>
      <button class="btn btn-ghost btn-sm" data-action="clear-programs-json-text"${
        importProgramsDraft ? '' : ' disabled'
      }>Очистить</button>
      <button class="btn btn-secondary btn-sm" data-action="undo-programs-import"${
        importLastSnapshot ? '' : ' disabled'
      }>Отменить последний импорт</button>
    </div>
    ${previewBlock}
    ${statusBlock}
  </div>`;
    }

    function render() {
      const active = document.activeElement;
      const activeSearch =
        active &&
        active.dataset &&
        active.dataset.action &&
        active.dataset.action.startsWith('search-')
          ? {
              action: active.dataset.action,
              start: active.selectionStart,
              end: active.selectionEnd,
            }
          : null;

      const m = document.getElementById('main');
      const prevScrollTop = m ? m.scrollTop : 0;

      ensureSelectedProgram();
      ensureEditorProgram();
      ensureStatsProgram();
      const devTools = document.getElementById('devTools');
      if (devTools) {
        devTools.innerHTML = devEffectsH();
      }
      document.getElementById('nav').innerHTML = navItemsH();
      const m = document.getElementById('main');
      if (view === 'home') m.innerHTML = homeH();
      else if (view === 'study') m.innerHTML = studyH();
      else if (view === 'setup') m.innerHTML = setupH();
      else if (view === 'quiz') m.innerHTML = quizH();
      else if (view === 'results') m.innerHTML = resultsH();
      else if (view === 'editor') m.innerHTML = editorH();
      else if (view === 'stats') m.innerHTML = statsH();
      else if (view === 'settings') m.innerHTML = settingsH();

      let extraUI = '';
      if (mdl) extraUI += mdl;
      {
        const showShortcutsHere = view === 'quiz' ? showShortcutsPanelInQuiz : showShortcutsPanel;
        if (showShortcutsHere && !mdl) extraUI += shortcutsHintH();
      }
      document.getElementById('mroot').innerHTML = extraUI;
      document.getElementById('mroot').setAttribute('aria-hidden', extraUI ? 'false' : 'true');

      if (m) m.scrollTop = prevScrollTop;

      if (activeSearch) {
        const input = document.querySelector(`[data-action="${activeSearch.action}"]`);
        if (input && typeof input.focus === 'function') {
          input.focus();
          if (
            typeof input.setSelectionRange === 'function' &&
            Number.isFinite(activeSearch.start)
          ) {
            input.setSelectionRange(activeSearch.start, activeSearch.end ?? activeSearch.start);
          }
        }
      }
    }
    function shortcutsHintH() {
      const navItems = NAV_ITEMS.map((item) =>
        shortcutItemH(item.label, formatHotkeyLabels(item.hotkeyId)),
      ).join('');
      const quizItems = QUIZ_SHORTCUTS.map((item) =>
        shortcutItemH(item.label, formatHotkeyLabels(item.hotkeyId)),
      ).join('');
      return `<div class="shortcuts-hint">
      <div class="shortcuts-hint-header">
        <span class="shortcuts-hint-title">Горячие клавиши</span>
        <button class="shortcuts-hint-close" data-action="hide-shortcuts">X</button>
      </div>
      <div class="shortcuts-hint-list">${navItems}${quizItems}</div>
    </div>`;
    }

    function homeH() {
      const query = normalizeSearchText(progQuery);
      const compactQuery = normalizeSearchCompact(progQuery);
      const plainQuery = compactQuery.replace(/\+/g, '');
      const search = searchFieldH({
        action: 'search-programs',
        value: progQuery,
        placeholder: 'Поиск программ или клавиш (например Ctrl+S)',
        clearTarget: 'programs',
      });
      const programCards = Object.entries(progs)
        .filter(([, p]) => programMatchesSearch(p, query, compactQuery, plainQuery))
        .map(([id, p]) => {
          const pr = prog(id);
          const safeName = escapeHtml(p.name);
          const safeInitial = escapeHtml(getProgramInitial(p.name));
          const safeColor = sanitizeColor(p.color);
          return `<div class="card card-interactive program-card" data-action="open-study" data-program="${id}">
        <div class="program-header"><div class="program-icon" style="--prog-color:${safeColor}">${safeInitial}</div><div class="program-name">${safeName}</div></div>
        <div class="program-meta"><span class="meta-pill" data-tooltip="Количество клавиш">Клавиш: ${p.sc.length}</span><span class="meta-pill" data-tooltip="Прогресс">Прогресс: ${pr}%</span></div>
        <div class="progress" data-tooltip="Прогресс: ${pr}%" style="--progress:${pr}%"><div class="progress-fill"></div></div>
        <div class="program-actions">
          <button class="btn btn-secondary btn-sm btn-flex" data-action="open-study" data-program="${id}" data-tooltip="Список клавиш">${icon('study')}<span>Клавиши</span></button>
          <button class="btn btn-primary btn-sm btn-flex" data-action="open-setup" data-program="${id}" data-tooltip="Запустить тест">${icon('quiz')}<span>Тест</span></button>
        </div></div>`;
        })
        .join('') || '<div class="empty-state">Ничего не найдено.</div>';
      return `<div class="page-header"><h1 class="page-title">Программы</h1><p class="page-subtitle">Выберите набор горячих клавиш и перейдите в изучение или тест.</p></div>
    ${search}
    <div class="grid">${programCards}</div>`;
    }

    function studyH() {
      if (!sel || !progs[sel])
        return '<div class="empty-state">Нет программы</div>';
      const p = progs[sel];
      const safeName = escapeHtml(p.name);
      const safeInitial = escapeHtml(getProgramInitial(p.name));
      const safeColor = sanitizeColor(p.color);
      const query = normalizeSearchText(studyQuery);
      const compactQuery = normalizeSearchCompact(studyQuery);
      const plainQuery = compactQuery.replace(/\+/g, '');
      const list = p.sc
        .filter((s) => sfil === 'all' || s.d === sfil)
        .filter((s) => shortcutMatchesSearch(s, query, compactQuery, plainQuery));
      const search = searchFieldH({
        action: 'search-study',
        value: studyQuery,
        placeholder: 'Поиск по действиям или клавишам',
        clearTarget: 'study',
      });
      const shortcuts = list.length
        ? list
            .map(
              (s) => `<div class="shortcut-item"><div class="shortcut-action">${
                escapeHtml(s.a)
              }</div><div class="shortcut-keys">
      ${formatKeyList(s.k)
        .map((k) => `<span class="key">${escapeHtml(k)}</span>`)
        .join('<span class="key-separator">+</span>')}
      <span class="badge badge-${s.d}">${
                s.d === 'easy' ? 'Лёгкий' : s.d === 'medium' ? 'Средний' : 'Сложный'
              }</span></div></div>`,
            )
            .join('')
        : '<div class="empty-state">Ничего не найдено.</div>';
      return `<div class="study-container"><div class="study-header"><button class="back-btn" data-action="go" data-view="home" data-tooltip="Esc">Назад</button><button class="btn btn-primary" data-action="open-setup" data-tooltip="Запустить тест">${icon('quiz')}<span>Тест</span></button></div>
    <div class="study-program"><div class="study-program-icon" style="--prog-color:${safeColor}">${safeInitial}</div><div class="study-program-info"><h2>${safeName}</h2><p>${p.sc.length} клавиш</p></div></div>
    ${search}
    <div class="filter-bar">
      <button class="filter-btn${
        sfil === 'all' ? ' active' : ''
      }" data-action="set-filter" data-filter="all" data-tooltip="Фильтр: все">Все</button>
      <button class="filter-btn${
        sfil === 'easy' ? ' active' : ''
      }" data-action="set-filter" data-filter="easy" data-tooltip="Фильтр: легкий"><span class="difficulty-dot difficulty-easy"></span>Лёгкие</button>
      <button class="filter-btn${
        sfil === 'medium' ? ' active' : ''
      }" data-action="set-filter" data-filter="medium" data-tooltip="Фильтр: средний"><span class="difficulty-dot difficulty-medium"></span>Средние</button>
      <button class="filter-btn${
        sfil === 'hard' ? ' active' : ''
      }" data-action="set-filter" data-filter="hard" data-tooltip="Фильтр: сложный"><span class="difficulty-dot difficulty-hard"></span>Сложные</button>
    </div>
    <div class="shortcut-list">${shortcuts}</div></div>`;
    }
    function setupH() {
      if (!sel || !progs[sel])
        return '<div class="empty-state">Нет программы</div>';
      const p = progs[sel];
      const safeName = escapeHtml(p.name);
      const max = p.sc.filter((s) => qcfg.d === 'all' || s.d === qcfg.d).length;
      const baseCounts = [5, 10, 15, 20].filter((c) => c <= max);
      const counts = baseCounts.length ? baseCounts : max ? [max] : [];
      if (!counts.includes(qcfg.n)) {
        qcfg.n = counts[0] || 0;
      }
      if (!isValidMode(qcfg.mode)) {
        qcfg.mode = settings.defaultMode;
      }
      return `<div class="setup-container"><button class="back-btn" data-action="go" data-view="home" data-tooltip="Esc">Назад</button>
    <div class="card setup-card">
    <h2 class="setup-title">Тест: ${safeName}</h2>
    <div class="setup-group"><label class="setup-label">Сложность</label><div class="setup-options">
      <button class="option-btn${
        qcfg.d === 'all' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="all" data-tooltip="Сложность: все">Все</button>
      <button class="option-btn${
        qcfg.d === 'easy' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="easy" data-tooltip="Сложность: легкая"><span class="difficulty-dot difficulty-easy"></span>Лёгкие</button>
      <button class="option-btn${
        qcfg.d === 'medium' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="medium" data-tooltip="Сложность: средняя"><span class="difficulty-dot difficulty-medium"></span>Средние</button>
      <button class="option-btn${
        qcfg.d === 'hard' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="hard" data-tooltip="Сложность: сложная"><span class="difficulty-dot difficulty-hard"></span>Сложные</button>
    </div></div>
    <div class="setup-group"><label class="setup-label">Режим</label><div class="setup-options">
      <button class="option-btn${
        qcfg.mode === 'input' ? ' selected' : ''
      }" data-action="set-mode" data-mode="input">Ввод клавиш</button>
      <button class="option-btn${
        qcfg.mode === 'choice' ? ' selected' : ''
      }" data-action="set-mode" data-mode="choice">Опрос</button>
    </div></div>
    <div class="setup-group"><label class="setup-label">Вопросов (макс: ${max})</label><div class="setup-options">
      ${counts
        .map(
          (c) =>
            `<button class="option-btn${
              qcfg.n === c ? ' selected' : ''
            }" data-action="set-count" data-count="${c}">${c}</button>`,
        )
        .join('')}
    </div></div>
    <button class="btn btn-primary btn-full" data-action="start-quiz"${
      max === 0 ? ' disabled' : ''
    } data-tooltip="Enter">Начать тест</button></div></div>`;
    }

    function quizH() {
      if (!qz || !qz.qs.length)
        return '<div class="empty-state">Нет вопросов</div>';
      const q = qz.qs[qz.i];
      const pct = ((qz.i + 1) / qz.qs.length) * 100;
      const safeProgramName = escapeHtml(progs[sel].name);
      const safeQuestion = escapeHtml(q.a);
      const isChoiceMode = qz.mode === 'choice';
      const choiceOptions = isChoiceMode
        ? q.opts || buildChoiceOptions(progs[sel].sc, q)
        : [];
      const kh = qz.k.length
        ? formatKeyList(qz.k)
            .map((k) => `<span class="quiz-input-key">${escapeHtml(k)}</span>`)
            .join('<span class="key-separator">+</span>')
        : '<span class="quiz-input-placeholder">Нажмите клавиши</span>';
      const choiceInput = qz.choice
        ? `<span class="quiz-input-key">${escapeHtml(formatKeyCombo(qz.choice))}</span>`
        : '<span class="quiz-input-placeholder">Выберите вариант</span>';
      const choiceList = isChoiceMode
        ? `<div class="quiz-choice-list">${choiceOptions
            .map((opt, idx) => {
              const isSelected =
                qz.choice && compareKeySets(qz.choice, opt.keys);
              return `<button class="option-btn quiz-choice-btn${
                isSelected ? ' selected' : ''
              }" data-action="select-choice" data-choice="${idx}">${escapeHtml(
                opt.label,
              )}</button>`;
            })
            .join('')}</div>`
        : '';
      const cls = qz.sh ? (qz.ok ? ' correct' : ' incorrect') : '';
      return `<div class="quiz-container"><div class="quiz-progress"><div class="quiz-progress-bar" style="--progress:${pct}%"><div class="quiz-progress-fill"></div></div><span class="quiz-progress-text">${
        qz.i + 1
      }/${qz.qs.length}</span></div>
    <div class="quiz-top-actions">
      <button class="btn btn-ghost quiz-exit-btn" data-action="quit-quiz" data-tooltip="${getHotkeyTooltip(
        'quiz.quit',
      )}">Выйти</button>
    </div>
    <div class="card quiz-card"><div class="quiz-program-name">${safeProgramName}</div><div class="quiz-question">${safeQuestion}</div>
    <div class="quiz-input${cls}">${isChoiceMode ? choiceInput : kh}</div>
    ${choiceList}
    ${
      qz.sh
        ? `<div class="quiz-result${qz.ok ? ' correct' : ' incorrect'}">${
            qz.ok ? 'Правильно' : 'Неправильно'
          }</div>`
        : ''
    }
    ${qz.sh && !qz.ok ? `<div class="quiz-answer">Правильный ответ: <strong>${escapeHtml(
      formatKeyCombo(q.k),
    )}</strong></div>` : ''}
    <div class="quiz-actions">${
      qz.sh
        ? `<button class="btn btn-primary" data-action="next-question" data-tooltip="${getHotkeyTooltip(
          'quiz.check',
        )}">${
            qz.i + 1 >= qz.qs.length ? 'Завершить' : 'Далее'
          }</button>`
        : `<button class="btn btn-secondary" data-action="reset-answer" data-tooltip="${getHotkeyTooltip(
          'quiz.reset',
        )}">Сбросить</button>
      <button class="btn btn-primary" data-action="check-answer"${
        isChoiceMode ? (!qz.choice ? ' disabled' : '') : qz.k.length === 0 ? ' disabled' : ''
      } data-tooltip="${getHotkeyTooltip('quiz.check')}">Проверить</button>
      <button class="btn btn-ghost" data-action="skip-question" data-tooltip="${getHotkeyTooltip(
        'quiz.skip',
      )}">Пропустить</button>`
    }</div></div></div>`;
    }

    function resultsH() {
      if (!res) return '';
      const pct = Math.round((res.c / res.t) * 100);
      const title = 'Результат теста';
      const safeName = escapeHtml(res.n || '');
      return `<div class="results-container"><div class="card results-card">
    <div class="results-kicker">Итоги теста</div>
    <h2 class="results-title">${title}</h2><div class="results-score">${pct}%</div>
    <p class="results-program">${safeName}</p><div class="results-stats">
      <div class="results-stat"><div class="results-stat-value success">${
        res.c
      }</div><div class="results-stat-label">Верно</div></div>
      <div class="results-stat"><div class="results-stat-value error">${
        res.t - res.c
      }</div><div class="results-stat-label">Ошибок</div></div>
      <div class="results-stat"><div class="results-stat-value">${
        res.t
      }</div><div class="results-stat-label">Всего</div></div>
    </div><div class="results-actions">
      <button class="btn btn-secondary" data-action="go" data-view="home" data-tooltip="Esc">Главная</button>
      <button class="btn btn-primary" data-action="restart-quiz" data-tooltip="Повторить тест">Повторить</button>
    </div></div></div>`;
    }
    function editorH() {
      if (!eprog || !progs[eprog])
        return '<div class="empty-state">Нет программы</div>';
      const p = progs[eprog];
      const safeName = escapeHtml(p.name);
      const safeInitial = escapeHtml(getProgramInitial(p.name));
      const safeColor = sanitizeColor(p.color);
      const programQuery = normalizeSearchText(editorProgramQuery);
      const programCompact = normalizeSearchCompact(editorProgramQuery);
      const programPlain = programCompact.replace(/\+/g, '');
      const programSearch = searchFieldH({
        action: 'search-editor-programs',
        value: editorProgramQuery,
        placeholder: 'Поиск программ',
        clearTarget: 'editor-programs',
      });
      const programsFiltered = Object.entries(progs).filter(([, pr]) =>
        programMatchesSearch(pr, programQuery, programCompact, programPlain),
      );
      const programList = programsFiltered.length
        ? programsFiltered
            .map(
              ([id, pr]) => {
                const itemName = escapeHtml(pr.name);
                const itemColor = sanitizeColor(pr.color);
                return `<div class="editor-item${eprog === id ? ' active' : ''}" data-action="select-program" data-program="${id}">
      <span class="editor-item-name" style="--prog-color:${itemColor}">${itemName}</span><span class="editor-item-count">${pr.sc.length}</span></div>`;
              },
            )
            .join('')
        : '<div class="empty-state">Ничего не найдено.</div>';
      const shortcutQuery = normalizeSearchText(editorShortcutQuery);
      const shortcutCompact = normalizeSearchCompact(editorShortcutQuery);
      const shortcutPlain = shortcutCompact.replace(/\+/g, '');
      const shortcutSearch = searchFieldH({
        action: 'search-editor-shortcuts',
        value: editorShortcutQuery,
        placeholder: 'Поиск клавиш или действий',
        clearTarget: 'editor-shortcuts',
      });
      const shortcutsFiltered = p.sc.filter((s) =>
        shortcutMatchesSearch(s, shortcutQuery, shortcutCompact, shortcutPlain),
      );
      const shortcutsCount = editorShortcutQuery
        ? `${shortcutsFiltered.length}/${p.sc.length}`
        : p.sc.length;
      const shortcutList = shortcutsFiltered.length
        ? shortcutsFiltered
            .map(
              (s) => `<div class="editor-shortcut-item"><div class="editor-shortcut-action">${
                escapeHtml(s.a)
              }<br><span class="badge badge-${s.d}">${
                s.d === 'easy' ? 'Лёгкий' : s.d === 'medium' ? 'Средний' : 'Сложный'
              }</span></div>
      <div class="editor-shortcut-keys">${escapeHtml(formatKeyCombo(s.k))}</div><div class="editor-shortcut-actions"><button class="icon-btn icon-btn-edit" data-action="show-shortcut-modal" data-shortcut="${
                s.id
              }" data-tooltip="Редактировать">${icon('editor')}<span>Изм.</span></button><button class="icon-btn icon-btn-delete" data-action="delete-shortcut"  data-shortcut="${
                s.id
              }" data-tooltip="Удалить">${icon('trash')}<span>Удал.</span></button></div></div>`,
            )
            .join('')
        : '<div class="empty-state">Ничего не найдено.</div>';
      return `<div class="editor-grid"><div class="editor-sidebar"><div class="editor-section-title"><span>Программы</span><button class="btn btn-primary btn-sm" data-action="show-program-modal" data-tooltip="Создать новую программу">${icon('add')}<span>Добавить</span></button></div>
    ${programSearch}
    <div class="editor-list">${programList}</div>
    ${editorImportH()}</div>
    <div class="editor-main"><div class="editor-section-title"><div class="editor-program-header">
      <div class="editor-program-icon" style="--prog-color:${safeColor}">${safeInitial}</div><span>${safeName}</span></div>
      <div class="editor-actions"><button class="btn btn-secondary btn-sm" data-action="show-program-modal" data-program="${eprog}" data-tooltip="Изменить название и цвет">${icon('editor')}<span>Изменить</span></button><button class="btn btn-danger btn-sm" data-action="delete-program" data-tooltip="Удалить программу">${icon('trash')}<span>Удалить</span></button></div></div>
    <div class="editor-shortcuts-header">
      <h3 class="editor-shortcuts-title">Клавиши (${shortcutsCount})</h3><button class="btn btn-primary btn-sm" data-action="show-shortcut-modal" data-tooltip="Добавить новую горячую клавишу">${icon('add')}<span>Добавить</span></button></div>
    ${shortcutSearch}
    <div class="editor-shortcut-list">${shortcutList}</div></div></div>`;
    }
    function statsH() {
      const avg = calcAverageScore(st.h);
      const tot = Object.values(progs).reduce((sum, p) => sum + p.sc.length, 0);
      const history = st.h.map((entry, index) => ({ ...entry, i: index }));
      const filtered =
        statsProgram === 'all'
          ? history
          : history.filter((entry) => entry.p === statsProgram);
      const viewHistory = filtered.slice().reverse().slice(0, 20);
      const programOptions = Object.entries(progs)
        .map(
          ([id, p]) =>
            `<option value="${escapeAttr(id)}"${
              statsProgram === id ? ' selected' : ''
            }>${escapeHtml(p.name)}</option>`,
        )
        .join('');
      const historyList = viewHistory.length
        ? `<div class="history-list">${viewHistory
            .map((h) => {
              const pct = Math.round((h.c / h.t) * 100);
              const historyName = escapeHtml(getProgramNameById(h.p) || h.n || '—');
              return `<div class="history-item"><div class="history-item-info"><strong>${
                historyName
              }</strong><br><span class="history-item-date">${new Date(h.dt).toLocaleDateString('ru')}</span></div>
      <div class="history-item-right"><div class="history-item-result ${pct >= 70 ? 'success' : 'error'}">${h.c}/${h.t} (${pct}%)</div><button class="icon-btn icon-btn-delete" data-action="delete-history" data-history="${
                h.i
              }" data-tooltip="Удалить запись">${icon('trash')}</button></div></div>`;
            })
            .join('')}</div>`
        : '<div class="empty-state">История пуста.</div>';
      return `<div class="page-header"><h1 class="page-title">Статистика</h1><p class="page-subtitle">История тестов и средние результаты по всем программам.</p></div>
    <div class="stats-grid"><div class="card stats-card" data-tooltip="Количество пройденных тестов"><div class="stats-value">${
      st.t
    }</div><div class="stats-label">Тестов</div></div>
    <div class="card stats-card" data-tooltip="Правильных ответов за всё время"><div class="stats-value">${
      st.c
    }</div><div class="stats-label">Верно</div></div>
    <div class="card stats-card" data-tooltip="Средний процент правильных ответов"><div class="stats-value">${avg}%</div><div class="stats-label">Средний %</div></div>
    <div class="card stats-card" data-tooltip="Всего клавиш в базе"><div class="stats-value">${tot}</div><div class="stats-label">Всего клавиш</div></div></div>
    <div class="stats-management"><div class="card stats-control-card"><div class="stats-control-header"><span class="stats-control-title">${icon('history')}<span>Управление историей</span></span></div>
      <div class="stats-control-body"><div class="field-group"><label class="field-label">Фильтр программы</label><select class="select" data-action="stats-program"><option value="all">Все программы</option>${programOptions}</select></div>
      <div class="stats-control-actions"><button class="btn btn-secondary btn-sm" data-action="reset-program-progress"${
        statsProgram === 'all' ? ' disabled' : ''
      } data-tooltip="Сбросить прогресс выбранной программы">${icon('reset')}<span>Сбросить прогресс</span></button></div></div></div></div>
    <div class="card history-card"><div class="history-header">
      <h3 class="history-title">История тестов</h3>
      <div class="history-actions">
        <button class="btn btn-secondary btn-sm" data-action="reset-programs" data-tooltip="Вернуть программы к начальным значениям">${icon('reset')}<span>Сбросить программы</span></button>
        <button class="btn btn-danger btn-sm" data-action="reset-stats" data-tooltip="Удалить всю историю">${icon('trash')}<span>Очистить статистику</span></button>
      </div>
    </div>
    ${historyList}</div>`;
    }

    function settingsH() {
      const countOptions = [5, 10, 15, 20];
      const trackLabels = {
        design: 'Дизайн',
        dev: 'Разработка',
        office: 'Офис',
        study: 'Учёба',
        other: 'Другое',
      };
      const frequencyLabels = {
        daily: 'Каждый день',
        weekly: 'Несколько раз в неделю',
        monthly: 'Раз в неделю',
        rare: 'Редко',
      };
      const surveyList = survey.length
        ? `<div class="survey-list">${survey
            .slice(0, 3)
            .map((entry) => {
              const date = new Date(entry.dt).toLocaleDateString('ru');
              return `<div class="survey-item"><div class="survey-item-main"><div class="survey-item-title">${
                trackLabels[entry.track] || 'Другое'
              }</div><div class="survey-item-meta">${date} · ${
                frequencyLabels[entry.frequency] || 'Редко'
              }</div></div><div class="survey-score">${entry.rating}/5</div></div>${
                entry.comment
                  ? `<div class="survey-comment">${escapeHtml(entry.comment)}</div>`
                  : ''
              }`;
            })
            .join('')}</div>`
        : '<div class="empty-state">Ответов пока нет.</div>';
      return `<div class="page-header"><h1 class="page-title">Параметры</h1><p class="page-subtitle">Настройте приложение и пройдите короткий опрос.</p></div>
    <div class="settings-grid"><div class="card settings-card">
      <div class="settings-card-title">${icon('settings')}<span>Параметры</span></div>
      <div class="settings-row"><div class="settings-label"><span>Панель подсказок</span><span class="settings-note">Показывать подсказки на главных экранах</span></div>
        <div class="settings-options"><button class="option-btn${showShortcutsPanel ? ' selected' : ''}" data-action="set-shortcuts" data-value="true">Вкл</button><button class="option-btn${!showShortcutsPanel ? ' selected' : ''}" data-action="set-shortcuts" data-value="false">Выкл</button></div></div>
      <div class="settings-row"><div class="settings-label"><span>Подсказки в тесте</span><span class="settings-note">Показывать панель горячих клавиш в режиме теста</span></div>
        <div class="settings-options"><button class="option-btn${showShortcutsPanelInQuiz ? ' selected' : ''}" data-action="set-shortcuts-quiz" data-value="true">Вкл</button><button class="option-btn${!showShortcutsPanelInQuiz ? ' selected' : ''}" data-action="set-shortcuts-quiz" data-value="false">Выкл</button></div></div>
      <div class="settings-row"><div class="settings-label"><span>Тема</span><span class="settings-note">Глубокая тёмная тема по умолчанию</span></div>
        <div class="settings-options"><button class="option-btn${settings.theme === 'dark' ? ' selected' : ''}" data-action="set-theme" data-theme="dark">Тёмная</button><button class="option-btn${settings.theme === 'light' ? ' selected' : ''}" data-action="set-theme" data-theme="light">Светлая</button></div></div>
      <div class="settings-row"><div class="settings-label"><span>Подтверждать выход из теста</span><span class="settings-note">Показывать диалог при выходе из теста</span></div>
        <div class="settings-options"><button class="option-btn${settings.confirmQuit ? ' selected' : ''}" data-action="set-confirm-quit" data-value="true">Вкл</button><button class="option-btn${!settings.confirmQuit ? ' selected' : ''}" data-action="set-confirm-quit" data-value="false">Выкл</button></div></div>
      <div class="settings-row"><div class="settings-label"><span>Подтверждать удаления</span><span class="settings-note">Диалог перед удалением и сбросом данных</span></div>
        <div class="settings-options"><button class="option-btn${settings.confirmDestructive ? ' selected' : ''}" data-action="set-confirm-destructive" data-value="true">Вкл</button><button class="option-btn${!settings.confirmDestructive ? ' selected' : ''}" data-action="set-confirm-destructive" data-value="false">Выкл</button></div></div>
      <div class="settings-row"><div class="settings-label"><span>Сложность по умолчанию</span></div>
        <div class="settings-options"><button class="option-btn${settings.defaultDifficulty === 'all' ? ' selected' : ''}" data-action="set-default-difficulty" data-difficulty="all">Все</button><button class="option-btn${settings.defaultDifficulty === 'easy' ? ' selected' : ''}" data-action="set-default-difficulty" data-difficulty="easy">Лёгкие</button><button class="option-btn${settings.defaultDifficulty === 'medium' ? ' selected' : ''}" data-action="set-default-difficulty" data-difficulty="medium">Средние</button><button class="option-btn${settings.defaultDifficulty === 'hard' ? ' selected' : ''}" data-action="set-default-difficulty" data-difficulty="hard">Сложные</button></div></div>
      <div class="settings-row"><div class="settings-label"><span>Вопросов по умолчанию</span></div>
        <div class="settings-options">${countOptions
          .map(
            (count) =>
              `<button class="option-btn${settings.defaultCount === count ? ' selected' : ''}" data-action="set-default-count" data-count="${count}">${count}</button>`,
          )
          .join('')}</div></div>
      <div class="settings-row"><div class="settings-label"><span>Режим теста по умолчанию</span></div>
        <div class="settings-options"><button class="option-btn${
          settings.defaultMode === 'input' ? ' selected' : ''
        }" data-action="set-default-mode" data-mode="input">Ввод клавиш</button><button class="option-btn${
          settings.defaultMode === 'choice' ? ' selected' : ''
        }" data-action="set-default-mode" data-mode="choice">Опрос</button></div></div>
      <div class="settings-actions"><button class="btn btn-secondary btn-sm" data-action="reset-settings">${icon('reset')}<span>Сбросить параметры</span></button></div>
    </div>
    <div class="card settings-card">
      <div class="settings-card-title">${icon('editor')}<span>Горячие клавиши приложения</span></div>
      <div class="settings-row"><div class="settings-label"><span>Навигация: Главная</span></div>
        <input class="input hotkey-input" data-action="hotkey-edit" data-hotkey="nav.home" value="${escapeAttr(
          settings.hotkeys.nav.home,
        )}"></div>
      <div class="settings-row"><div class="settings-label"><span>Навигация: Редактор</span></div>
        <input class="input hotkey-input" data-action="hotkey-edit" data-hotkey="nav.editor" value="${escapeAttr(
          settings.hotkeys.nav.editor,
        )}"></div>
      <div class="settings-row"><div class="settings-label"><span>Навигация: Статистика</span></div>
        <input class="input hotkey-input" data-action="hotkey-edit" data-hotkey="nav.stats" value="${escapeAttr(
          settings.hotkeys.nav.stats,
        )}"></div>
      <div class="settings-row"><div class="settings-label"><span>Навигация: Параметры</span></div>
        <input class="input hotkey-input" data-action="hotkey-edit" data-hotkey="nav.settings" value="${escapeAttr(
          settings.hotkeys.nav.settings,
        )}"></div>
      <div class="settings-row"><div class="settings-label"><span>Навигация: Подсказки</span></div>
        <input class="input hotkey-input" data-action="hotkey-edit" data-hotkey="nav.help" value="${escapeAttr(
          settings.hotkeys.nav.help,
        )}"></div>
      <div class="settings-row"><div class="settings-label"><span>Тест: проверить/далее</span></div>
        <input class="input hotkey-input" data-action="hotkey-edit" data-hotkey="quiz.check" value="${escapeAttr(
          settings.hotkeys.quiz.check,
        )}"></div>
      <div class="settings-row"><div class="settings-label"><span>Тест: удалить последний</span></div>
        <input class="input hotkey-input" data-action="hotkey-edit" data-hotkey="quiz.deleteLast" value="${escapeAttr(
          settings.hotkeys.quiz.deleteLast,
        )}"></div>
      <div class="settings-row"><div class="settings-label"><span>Тест: сброс</span></div>
        <input class="input hotkey-input" data-action="hotkey-edit" data-hotkey="quiz.reset" value="${escapeAttr(
          settings.hotkeys.quiz.reset,
        )}"></div>
      <div class="settings-row"><div class="settings-label"><span>Тест: пропуск</span></div>
        <input class="input hotkey-input" data-action="hotkey-edit" data-hotkey="quiz.skip" value="${escapeAttr(
          settings.hotkeys.quiz.skip,
        )}"></div>
      <div class="settings-row"><div class="settings-label"><span>Тест: выход</span></div>
        <input class="input hotkey-input" data-action="hotkey-edit" data-hotkey="quiz.quit" value="${escapeAttr(
          settings.hotkeys.quiz.quit,
        )}"></div>
      <div class="settings-actions hotkey-actions">
        <button class="btn btn-secondary btn-sm" data-action="export-hotkeys">Экспорт</button>
        <button class="btn btn-secondary btn-sm" data-action="import-hotkeys">Импорт</button>
        <input class="hidden-input" type="file" id="hotkeysFile" data-action="hotkeys-file" accept=".json,application/json">
      </div>
      <div class="field-hint">Формат: комбинации через запятую. Например: <strong>Ctrl + K, Ctrl + S</strong></div>
    </div>
    <div class="card settings-card">
      <div class="settings-card-title">${icon('survey')}<span>Опрос</span></div>
      <div class="settings-row"><div class="settings-label"><span>Насколько полезен тренажер?</span></div>
        <div class="settings-options">${[1, 2, 3, 4, 5]
          .map(
            (score) =>
              `<button class="option-btn${surveyDraft.rating === score ? ' selected' : ''}" data-action="set-survey-rating" data-rating="${score}">${score}</button>`,
          )
          .join('')}</div></div>
      <div class="settings-row"><div class="settings-label"><span>Основной сценарий</span></div>
        <div class="settings-options"><button class="option-btn${surveyDraft.track === 'design' ? ' selected' : ''}" data-action="set-survey-track" data-track="design">Дизайн</button><button class="option-btn${surveyDraft.track === 'dev' ? ' selected' : ''}" data-action="set-survey-track" data-track="dev">Разработка</button><button class="option-btn${surveyDraft.track === 'office' ? ' selected' : ''}" data-action="set-survey-track" data-track="office">Офис</button><button class="option-btn${surveyDraft.track === 'study' ? ' selected' : ''}" data-action="set-survey-track" data-track="study">Учёба</button><button class="option-btn${surveyDraft.track === 'other' ? ' selected' : ''}" data-action="set-survey-track" data-track="other">Другое</button></div></div>
      <div class="settings-row"><div class="settings-label"><span>Как часто тренируетесь</span></div>
        <div class="settings-options"><button class="option-btn${surveyDraft.frequency === 'daily' ? ' selected' : ''}" data-action="set-survey-frequency" data-frequency="daily">Каждый день</button><button class="option-btn${surveyDraft.frequency === 'weekly' ? ' selected' : ''}" data-action="set-survey-frequency" data-frequency="weekly">Несколько раз</button><button class="option-btn${surveyDraft.frequency === 'monthly' ? ' selected' : ''}" data-action="set-survey-frequency" data-frequency="monthly">Раз в неделю</button><button class="option-btn${surveyDraft.frequency === 'rare' ? ' selected' : ''}" data-action="set-survey-frequency" data-frequency="rare">Редко</button></div></div>
      <div class="settings-row"><div class="settings-label"><span>Комментарий</span></div>
        <textarea id="surveyComment" class="textarea" data-action="survey-comment" placeholder="Что можно улучшить?">${escapeHtml(
          surveyDraft.comment || '',
        )}</textarea></div>
      <div class="settings-actions"><button class="btn btn-primary" data-action="submit-survey">${icon('submit')}<span>Отправить</span></button><button class="btn btn-ghost" data-action="clear-survey"${
        survey.length ? '' : ' disabled'
      }>${icon('trash')}<span>Очистить ответы</span></button></div>
      <div class="survey-history"><div class="survey-history-title">Последние ответы</div>${surveyList}</div>
    </div></div>`;
    }

    function showPM(edit) {
      stopKeyCapture(false);
      const p = edit && progs[edit] ? progs[edit] : null;
      const editId = p ? edit : '';
      mdl = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" data-action="modal-body">
    <div class="modal-header"><h2 class="modal-title">${p ? 'Редактировать' : 'Новая программа'}</h2></div>
    <div class="modal-content">
    <div class="field-group"><label class="field-label">Название</label><input class="input" id="mn" value="${
      p ? escapeAttr(p.name) : ''
    }"></div>
    <div class="field-group"><label class="field-label">Цвет</label><div class="color-options">${colorOptions
      .map(
        (c) =>
          `<div class="color-option${
            p && p.color === c ? ' selected' : ''
          }" style="--prog-color:${c}" data-action="select-color" data-color="${c}"></div>`,
      )
      .join('')}</div></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal">Отмена</button><button class="btn btn-primary" data-action="save-program" data-program="${editId}">${
        p ? 'Сохранить' : 'Создать'
      }</button></div></div></div>`;
      render();
    }

    function showSM(edit) {
      stopKeyCapture(false);
      if (!eprog || !progs[eprog]) return;
      const p = progs[eprog];
      const s = edit ? p.sc.find((x) => x.id === edit) : null;
      const editId = s ? s.id : 0;
      mdl = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" data-action="modal-body">
    <div class="modal-header"><h2 class="modal-title">${s ? 'Редактировать' : 'Новая клавиша'}</h2></div>
    <div class="modal-content">
    <div class="field-group"><label class="field-label">Действие</label><input class="input" id="ma" value="${
      s ? escapeAttr(s.a) : ''
    }"></div>
    <div class="field-group"><label class="field-label">Клавиши (через +)</label>
      <div class="field-inline"><input class="input" id="mk" value="${
        s ? escapeAttr(formatKeyCombo(s.k)) : ''
      }"><button class="btn btn-secondary btn-sm record-btn" data-action="toggle-capture"><span class="record-label">Записать</span></button></div>
      <div class="field-hint">Нажмите "Записать" и введите комбинацию</div>
    </div>
    <div class="field-group"><label class="field-label">Сложность</label><select class="select" id="md">
      <option value="easy"${s && s.d === 'easy' ? ' selected' : ''}>Лёгкий</option>
      <option value="medium"${s && s.d === 'medium' ? ' selected' : ''}>Средний</option>
      <option value="hard"${s && s.d === 'hard' ? ' selected' : ''}>Сложный</option></select></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal">Отмена</button><button class="btn btn-primary" data-action="save-shortcut" data-shortcut="${editId}">${
        s ? 'Сохранить' : 'Добавить'
      }</button></div></div></div>`;
      render();
    }

    function startQ() {
      ensureSelectedProgram();
      if (!sel || !progs[sel]) return;
      const p = progs[sel];
      qz = createQuizState(p.sc, { difficulty: qcfg.d, count: qcfg.n });
      qz.mode = qcfg.mode || 'input';
      qz.choice = null;
      if (qz.mode === 'choice') {
        qz.qs = qz.qs.map((q) => ({
          ...q,
          opts: buildChoiceOptions(p.sc, q),
        }));
      }
      quizCapture.down = new Set();
      quizCapture.resetOnNext = false;
      res = null;
      go('quiz');
    }

        function handleKeydown(e) {
      const keyRaw = e.key;
      const normalizedKey = normalizeKey(keyRaw, e.code);
      const inQuiz = view === 'quiz' && !!qz;
      const targetIsInput = isTypingTarget(e.target);

      if (normalizedKey) {
        hotkeyState.down.add(normalizedKey);
      }

      if (keyCapture.active) {
        if (handleCaptureKeydown(e, normalizedKey)) return;
      }

      const expected =
        inQuiz && qz.qs && qz.qs[qz.i] && Array.isArray(qz.qs[qz.i].k)
          ? qz.qs[qz.i].k
          : [];
      const expectedComboMatch =
        inQuiz && expected.length && compareKeySets(Array.from(hotkeyState.down), expected);
      const comboId = comboIdFromSet(hotkeyState.down);

      if (mdl && keyRaw === 'Escape') {
        suppressEvent(e);
        stopKeyCapture(false);
        mdl = null;
        render();
        return;
      }

      if (mdl && keyRaw === 'Enter') {
        const saveBtn = document.querySelector('[data-action="save-program"], [data-action="save-shortcut"]');
        if (saveBtn) {
          suppressEvent(e);
          saveBtn.click();
          return;
        }
      }

      const actionTarget =
        e.target && typeof e.target.closest === 'function'
          ? e.target.closest('[data-action]')
          : null;
      if (
        actionTarget &&
        actionTarget.dataset.action === 'choose-programs-json' &&
        (keyRaw === 'Enter' || keyRaw === ' ' || keyRaw === 'Spacebar')
      ) {
        suppressEvent(e);
        actionTarget.click();
        return;
      }

      if (!inQuiz && targetIsInput) return;

      if (!mdl && !inQuiz) {
        if (
          tryHotkey('nav.help', hotkeyState.down, comboId, () => {
            suppressEvent(e);
            showShortcutsPanel = !showShortcutsPanel;
            saveShowShortcuts();
            render();
          })
        ) {
          return;
        }
        if (
          tryHotkey('nav.home', hotkeyState.down, comboId, () => {
            suppressEvent(e);
            go('home');
          })
        ) {
          return;
        }
        if (
          tryHotkey('nav.editor', hotkeyState.down, comboId, () => {
            suppressEvent(e);
            go('editor');
          })
        ) {
          return;
        }
        if (
          tryHotkey('nav.stats', hotkeyState.down, comboId, () => {
            suppressEvent(e);
            go('stats');
          })
        ) {
          return;
        }
        if (
          tryHotkey('nav.settings', hotkeyState.down, comboId, () => {
            suppressEvent(e);
            go('settings');
          })
        ) {
          return;
        }

        if (!inQuiz && view === 'setup' && keyRaw === 'Enter') {
          suppressEvent(e);
          startQ();
          return;
        }

        if (!inQuiz && keyRaw === 'Escape' && (view === 'study' || view === 'setup' || view === 'results')) {
          suppressEvent(e);
          go('home');
          return;
        }
      }

      if (!mdl && inQuiz && qz) {
        if (e.repeat) return;

        if (!(qz.mode === 'input' && expectedComboMatch)) {
          if (
            tryHotkey('nav.help', hotkeyState.down, comboId, () => {
              suppressEvent(e);
              showShortcutsPanelInQuiz = !showShortcutsPanelInQuiz;
              saveQuizShortcuts();
              render();
            })
          ) {
            return;
          }
          if (
            tryHotkey('quiz.reset', hotkeyState.down, comboId, () => {
              suppressEvent(e);
              resetQuizInputState();
              render();
            })
          ) {
            return;
          }
          if (
            tryHotkey('quiz.deleteLast', hotkeyState.down, comboId, () => {
              suppressEvent(e);
              if (qz.mode === 'choice') qz.choice = null;
              else qz.k.pop();
              render();
            })
          ) {
            return;
          }
          if (
            tryHotkey('quiz.quit', hotkeyState.down, comboId, () => {
              suppressEvent(e);
              if (!settings.confirmQuit || confirm('Выйти из теста? Прогресс будет потерян.')) {
                qz = null;
                go('home');
              }
            })
          ) {
            return;
          }
          if (
            tryHotkey('quiz.check', hotkeyState.down, comboId, () => {
              suppressEvent(e);
              if (qz.sh) nextQ();
              else if (qz.mode === 'choice' ? qz.choice : qz.k.length > 0) checkQ();
            })
          ) {
            return;
          }
          if (
            tryHotkey('quiz.skip', hotkeyState.down, comboId, () => {
              suppressEvent(e);
              skipQ();
            })
          ) {
            return;
          }
        }
      }

      if (view !== 'quiz' || !qz || qz.sh || qz.mode === 'choice') return;
      if (e.repeat) return;
      suppressEvent(e);
      const key = normalizedKey;
      if (!key) return;
      if (quizCapture.resetOnNext) {
        resetQuizInputState();
      }
      if (!qz.k.includes(key)) {
        qz.k.push(key);
        render();
      }
      quizCapture.down.add(key);
    }

        function handleKeyup(e) {
      const normalizedKey = normalizeKey(e.key, e.code);
      if (normalizedKey) {
        hotkeyState.down.delete(normalizedKey);
        if (hotkeyState.down.size === 0) {
          hotkeyState.lastCombo = '';
        }
        if (view === 'quiz' && qz && (!qz.mode || qz.mode === 'input') && !qz.sh) {
          quizCapture.down.delete(normalizedKey);
          if (quizCapture.down.size === 0 && qz.k.length) {
            quizCapture.resetOnNext = true;
          }
        }
      }
      if (keyCapture.active) {
        handleCaptureKeyup(normalizedKey);
      }
    }

    function checkQ() {
      if (!qz || !qz.qs.length) return;
      const q = qz.qs[qz.i];
      if (qz.mode === 'choice') {
        if (!qz.choice) return;
        qz.ok = compareKeySets(qz.choice, q.k);
      } else {
        qz.ok = compareKeySets(qz.k, q.k);
      }
      qz.sh = true;
      if (qz.ok) qz.c += 1;
      render();
    }

    function skipQ() {
      nextQ();
    }

    function nextQ() {
      if (!qz || !qz.qs.length) {
        go('home');
        return;
      }
      if (qz.i + 1 >= qz.qs.length) {
        const resName = progs[sel].name;
        res = { p: sel, n: resName, c: qz.c, t: qz.qs.length, dt: new Date().toISOString() };
        if (res.t) {
          st.h.push({ p: res.p, c: res.c, t: res.t, dt: res.dt });
          st.t += 1;
          st.c += res.c;
          saveState();
        }
        go('results');
      } else {
        qz.i += 1;
        resetQuizInputState();
        qz.sh = false;
        qz.ok = false;
        render();
      }
    }

    function deleteHistory(index) {
      if (!Number.isFinite(index) || index < 0 || index >= st.h.length) return;
      if (!confirmAction('Удалить запись?')) return;
      st.h.splice(index, 1);
      recalcTotals();
      saveState();
      render();
    }

    function resetProgramProgress() {
      if (statsProgram === 'all') return;
      if (!confirmAction('Сбросить прогресс выбранной программы?')) return;
      st.h = st.h.filter((entry) => entry.p !== statsProgram);
      recalcTotals();
      saveState();
      render();
    }

    function submitSurvey() {
      const comment = document.getElementById('surveyComment')?.value.trim() || '';
      if (!surveyDraft.rating) {
        alert('Выберите оценку');
        return;
      }
      const entry = {
        rating: surveyDraft.rating,
        track: surveyDraft.track,
        frequency: surveyDraft.frequency,
        comment,
        dt: new Date().toISOString(),
      };
      survey.unshift(entry);
      if (survey.length > 20) survey.length = 20;
      saveSurvey();
      resetSurveyDraft();
      render();
    }

    function clearSurvey() {
      if (!survey.length) return;
      if (!confirmAction('Очистить ответы опроса?')) return;
      survey = [];
      saveSurvey();
      resetSurveyDraft();
      render();
    }

    function saveP(edit) {
      const name = document.getElementById('mn')?.value.trim();
      const color = sanitizeColor(
        document.querySelector('.color-option.selected')?.dataset.color || colorOptions[0],
      );
      if (!name) {
        alert('Введите название программы');
        return;
      }
      if (edit && progs[edit]) {
        progs[edit].name = name;
        progs[edit].color = color;
      } else {
        let id =
          name
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '') || `p${Date.now()}`;
        if (progs[id]) {
          id = `${id}_${Date.now()}`;
        }
        progs[id] = { name, color, sc: [] };
        eprog = id;
        sel = id;
      }
      mdl = null;
      saveState();
      render();
    }

    function delP() {
      if (Object.keys(progs).length <= 1) {
        alert('Нельзя удалить последнюю');
        return;
      }
      if (confirmAction('Удалить?')) {
        const removed = eprog;
        delete progs[eprog];
        eprog = Object.keys(progs)[0] || null;
        if (sel === removed) {
          sel = eprog;
        }
        saveState();
        render();
      }
    }

    function saveS(edit) {
      stopKeyCapture(false);
      const a = document.getElementById('ma')?.value.trim();
      const ks = document.getElementById('mk')?.value.trim();
      const d = document.getElementById('md')?.value || 'easy';
      if (!a) {
        alert('Введите название действия');
        return;
      }
      if (!ks) {
        alert('Введите комбинацию клавиш');
        return;
      }
      const k = formatKeyList(parseKeyCombo(ks));
      if (!k.length) {
        alert('Некорректная комбинация клавиш');
        return;
      }
      const p = progs[eprog];
      if (!p) return;

      const duplicate = p.sc.find((s) => {
        if (edit && s.id === edit) return false;
        return compareKeySets(s.k, k);
      });
      if (duplicate) {
        alert(`Такая комбинация уже существует: "${duplicate.a}"`);
        return;
      }

      if (edit) {
        const s = p.sc.find((x) => x.id === edit);
        if (s) {
          s.a = a;
          s.k = k;
          s.d = d;
        }
      } else {
        const mx = p.sc.reduce((m, s) => Math.max(m, s.id), 0);
        p.sc.push({ id: mx + 1, a, k, d });
      }
      mdl = null;
      saveState();
      render();
    }

    function delS(id) {
      if (!eprog || !progs[eprog]) return;
      if (confirmAction('Удалить?')) {
        progs[eprog].sc = progs[eprog].sc.filter((s) => s.id !== id);
        saveState();
        render();
      }
    }

    function handleClick(event) {
      const actionEl = event.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;

      if (action === 'modal-body') {
        event.stopPropagation();
        return;
      }

      if (action === 'close-modal') {
        stopKeyCapture(false);
        mdl = null;
        render();
        return;
      }

      if (action === 'select-color') {
        document.querySelectorAll('.color-option').forEach((el) => el.classList.remove('selected'));
        actionEl.classList.add('selected');
        return;
      }

      switch (action) {
        case 'go':
          go(actionEl.dataset.view);
          break;
        case 'open-study':
          if (actionEl.dataset.program) sel = actionEl.dataset.program;
          go('study');
          break;
        case 'open-setup':
          if (actionEl.dataset.program) sel = actionEl.dataset.program;
          go('setup');
          break;
        case 'set-filter':
          sfil = actionEl.dataset.filter || 'all';
          render();
          break;
        case 'set-difficulty':
          qcfg.d = actionEl.dataset.difficulty || 'all';
          render();
          break;
        case 'set-count':
          qcfg.n = Number(actionEl.dataset.count) || qcfg.n;
          render();
          break;
        case 'set-mode':
          qcfg.mode = actionEl.dataset.mode || 'input';
          render();
          break;
        case 'set-background-effect':
          setBackgroundEffect(actionEl.dataset.effect || 'off');
          render();
          break;
        case 'set-shortcuts':
          showShortcutsPanel = actionEl.dataset.value !== 'false';
          saveShowShortcuts();
          render();
          break;
        case 'set-shortcuts-quiz':
          showShortcutsPanelInQuiz = actionEl.dataset.value !== 'false';
          saveQuizShortcuts();
          render();
          break;
        case 'set-theme':
          settings.theme = isValidTheme(actionEl.dataset.theme)
            ? actionEl.dataset.theme
            : 'dark';
          saveSettings();
          render();
          break;
        case 'set-confirm-quit':
          settings.confirmQuit = actionEl.dataset.value !== 'false';
          saveSettings();
          render();
          break;
        case 'set-confirm-destructive':
          settings.confirmDestructive = actionEl.dataset.value !== 'false';
          saveSettings();
          render();
          break;
        case 'set-default-difficulty':
          settings.defaultDifficulty = actionEl.dataset.difficulty || 'all';
          qcfg.d = settings.defaultDifficulty;
          saveSettings();
          render();
          break;
        case 'set-default-count':
          settings.defaultCount = Number(actionEl.dataset.count) || settings.defaultCount;
          qcfg.n = settings.defaultCount;
          saveSettings();
          render();
          break;
        case 'set-default-mode':
          settings.defaultMode = actionEl.dataset.mode || 'input';
          qcfg.mode = settings.defaultMode;
          saveSettings();
          render();
          break;
        case 'reset-settings':
          settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
          qcfg = {
            d: settings.defaultDifficulty,
            n: settings.defaultCount,
            mode: settings.defaultMode,
          };
          showShortcutsPanel = true;
          showShortcutsPanelInQuiz = settings.showShortcutsInQuiz;
          saveShowShortcuts();
          saveSettings();
          render();
          break;
        case 'start-quiz':
          startQ();
          break;
        case 'reset-answer':
          if (qz) {
            resetQuizInputState();
            render();
          }
          break;
        case 'check-answer':
          checkQ();
          break;
        case 'select-choice':
          if (qz && qz.mode === 'choice' && !qz.sh) {
            const idx = Number(actionEl.dataset.choice);
            const current = qz.qs[qz.i];
            if (current) {
              const opts = current.opts || buildChoiceOptions(progs[sel].sc, current);
              current.opts = opts;
              if (opts[idx]) {
                qz.choice = opts[idx].keys;
                render();
              }
            }
          }
          break;
        case 'skip-question':
          skipQ();
          break;
        case 'next-question':
          nextQ();
          break;
        case 'restart-quiz':
          startQ();
          break;
        case 'quit-quiz':
          if (view === 'quiz') {
            if (!settings.confirmQuit || confirm('Выйти из теста? Прогресс будет потерян.')) {
              qz = null;
              go('home');
            }
          }
          break;
        case 'show-program-modal':
          showPM(actionEl.dataset.program || null);
          break;
        case 'select-program':
          if (actionEl.dataset.program) {
            eprog = actionEl.dataset.program;
            render();
          }
          break;
        case 'delete-program':
          delP();
          break;
        case 'show-shortcut-modal':
          showSM(actionEl.dataset.shortcut ? Number(actionEl.dataset.shortcut) : null);
          break;
        case 'toggle-capture':
          if (keyCapture.active) stopKeyCapture(false);
          else startKeyCapture();
          break;
        case 'delete-shortcut':
          delS(Number(actionEl.dataset.shortcut));
          break;
        case 'save-program':
          saveP(actionEl.dataset.program || '');
          break;
        case 'save-shortcut':
          saveS(Number(actionEl.dataset.shortcut || 0));
          break;
        case 'reset-program-progress':
          resetProgramProgress();
          break;
        case 'delete-history':
          deleteHistory(Number(actionEl.dataset.history));
          break;
        case 'set-survey-rating':
          surveyDraft.rating = Number(actionEl.dataset.rating) || 0;
          render();
          break;
        case 'set-survey-track':
          surveyDraft.track = actionEl.dataset.track || 'other';
          render();
          break;
        case 'set-survey-frequency':
          surveyDraft.frequency = actionEl.dataset.frequency || 'weekly';
          render();
          break;
        case 'submit-survey':
          submitSurvey();
          break;
        case 'clear-survey':
          clearSurvey();
          break;
        case 'export-hotkeys':
          exportHotkeys();
          break;
        case 'import-hotkeys': {
          const input = document.getElementById('hotkeysFile');
          if (input) input.click();
          break;
        }
        case 'choose-programs-json': {
          const input = document.getElementById('programsJsonFile');
          if (input) input.click();
          break;
        }
        case 'paste-programs-json':
          if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
            setImportStatus({
              kind: 'error',
              title: 'Буфер обмена недоступен',
              details: ['clipboard: unsupported'],
            });
            render();
            break;
          }
          navigator.clipboard
            .readText()
            .then((text) => {
              if (!String(text || '').trim()) {
                setImportStatus({
                  kind: 'error',
                  title: 'Буфер обмена пуст',
                  details: ['clipboard: empty_text'],
                });
                render();
                return;
              }
              importProgramsDraft = String(text || '');
              setImportStatus({
                kind: 'info',
                title: 'JSON вставлен из буфера',
                details: ['clipboard: ready_for_preview'],
              });
              render();
            })
            .catch(() => {
              setImportStatus({
                kind: 'error',
                title: 'Не удалось прочитать буфер обмена',
                details: ['clipboard: read_failed'],
              });
              render();
            });
          break;
        case 'import-programs-json-text': {
          prepareImportPreviewFromText(importProgramsDraft, 'текст');
          setProgramImportDropState(false);
          render();
          break;
        }
        case 'apply-programs-import': {
          applyPreparedImport();
          setProgramImportDropState(false);
          render();
          break;
        }
        case 'clear-programs-import-preview':
          clearImportPreview();
          setImportStatus({
            kind: 'info',
            title: 'Предпросмотр очищен',
            details: [],
          });
          render();
          break;
        case 'undo-programs-import':
          undoLastProgramsImport();
          render();
          break;
        case 'clear-programs-json-text':
          importProgramsDraft = '';
          clearImportPreview();
          setImportStatus({
            kind: 'info',
            title: 'Черновик очищен',
            details: [],
          });
          render();
          break;
        case 'reset-stats':
          if (confirmAction('Очистить всю статистику и историю?')) {
            st = { h: [], t: 0, c: 0 };
            saveState();
            render();
          }
          break;
        case 'reset-programs':
          if (confirmAction('Сбросить все программы к значениям по умолчанию?')) {
            progs = clonePrograms();
            eprog = Object.keys(progs)[0] || null;
            sel = eprog;
            saveState();
            render();
          }
          break;
        case 'hide-shortcuts':
          if (view === 'quiz') {
            showShortcutsPanelInQuiz = false;
            saveQuizShortcuts();
          } else {
            showShortcutsPanel = false;
            saveShowShortcuts();
          }
          render();
          break;
        case 'show-help':
          if (view === 'quiz') {
            showShortcutsPanelInQuiz = !showShortcutsPanelInQuiz;
            saveQuizShortcuts();
          } else {
            showShortcutsPanel = !showShortcutsPanel;
            saveShowShortcuts();
          }
          render();
          break;
        case 'clear-search': {
          const target = actionEl.dataset.target || '';
          if (target === 'programs') progQuery = '';
          if (target === 'study') studyQuery = '';
          if (target === 'editor-programs') editorProgramQuery = '';
          if (target === 'editor-shortcuts') editorShortcutQuery = '';
          render();
          break;
        }
        default:
          break;
      }
    }

    function handleChange(event) {
      const el = event.target;
      if (!el || !el.dataset) return;
      if (el.dataset.action === 'stats-program') {
        statsProgram = el.value || 'all';
        render();
      }
      if (el.dataset.action === 'hotkey-edit') {
        const normalized = setHotkeySetting(el.dataset.hotkey || '', el.value || '');
        if (typeof normalized === 'string') {
          el.value = normalized;
        }
        render();
      }
      if (el.dataset.action === 'hotkeys-file') {
        const file = el.files && el.files[0];
        if (file) importHotkeys(file);
        el.value = '';
      }
      if (el.dataset.action === 'programs-json-file') {
        setProgramImportDropState(false);
        prepareImportPreviewFromFiles(el.files).then(() => {
          render();
        });
        el.value = '';
      }
    }

    function handleInput(event) {
      const el = event.target;
      if (!el || !el.dataset) return;
      if (el.dataset.action === 'search-programs') {
        progQuery = el.value || '';
        render();
      }
      if (el.dataset.action === 'search-study') {
        studyQuery = el.value || '';
        render();
      }
      if (el.dataset.action === 'search-editor-programs') {
        editorProgramQuery = el.value || '';
        render();
      }
      if (el.dataset.action === 'search-editor-shortcuts') {
        editorShortcutQuery = el.value || '';
        render();
      }
      if (el.dataset.action === 'import-programs-json') {
        importProgramsDraft = el.value || '';
      }
      if (el.dataset.action === 'survey-comment') {
        surveyDraft.comment = el.value || '';
      }
    }

    function getProgramImportDropzone(target) {
      if (!target || typeof target.closest !== 'function') return null;
      return target.closest('[data-dropzone="program-import"]');
    }

    function eventHasFilePayload(event) {
      const dt = event && event.dataTransfer;
      if (!dt) return false;
      if (dt.files && dt.files.length > 0) return true;
      if (dt.types && typeof dt.types.includes === 'function') return dt.types.includes('Files');
      if (dt.types && typeof dt.types.indexOf === 'function') return dt.types.indexOf('Files') >= 0;
      return false;
    }

    function setProgramImportDropState(active) {
      const next = !!active;
      if (importDropActive === next) return;
      importDropActive = next;
      if (view === 'editor') render();
    }

    function handleDragEnter(event) {
      if (!eventHasFilePayload(event)) return;
      const zone = getProgramImportDropzone(event.target);
      event.preventDefault();
      if (zone) {
        setProgramImportDropState(true);
      }
    }

    function handleDragOver(event) {
      if (!eventHasFilePayload(event)) return;
      const zone = getProgramImportDropzone(event.target);
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = zone ? 'copy' : 'none';
      }
      setProgramImportDropState(!!zone);
    }

    function handleDragLeave(event) {
      const zone = getProgramImportDropzone(event.target);
      if (!zone) return;
      const next = event.relatedTarget;
      if (next && zone.contains(next)) return;
      setProgramImportDropState(false);
    }

    function handleDrop(event) {
      if (!eventHasFilePayload(event)) return;
      event.preventDefault();
      const zone = getProgramImportDropzone(event.target);
      if (!zone) {
        setProgramImportDropState(false);
        return;
      }
      setProgramImportDropState(false);
      const files =
        (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length
          ? event.dataTransfer.files
          : null) || [];
      if (!files.length) {
        setImportStatus({
          kind: 'error',
          title: 'Файл не найден',
          details: ['drop: no_file_payload'],
        });
        render();
        return;
      }
      prepareImportPreviewFromFiles(files).then(() => {
        render();
      });
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('keyup', handleKeyup, true);
    document.addEventListener('change', handleChange);
    document.addEventListener('input', handleInput);
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    window.addEventListener('blur', () => {
      resetKeyStates();
      setProgramImportDropState(false);
    });
    window.addEventListener('beforeunload', () => {
      if (backgroundEffects) {
        backgroundEffects.destroy();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) resetKeyStates();
    });

    render();
  } catch (err) {
    fatal('Ошибка запуска приложения', err && (err.stack || err.message || String(err)));
  }
})();











