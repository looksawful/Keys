(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.hkLogic = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  const KEY_ALIASES = {
    control: 'Ctrl',
    ctrl: 'Ctrl',
    meta: 'Win',
    win: 'Win',
    windows: 'Win',
    command: 'Win',
    cmd: 'Win',
    escape: 'Esc',
    esc: 'Esc',
    space: 'Space',
    spacebar: 'Space',
    arrowup: '↑',
    up: '↑',
    arrowdown: '↓',
    down: '↓',
    arrowleft: '←',
    left: '←',
    arrowright: '→',
    right: '→',
    pageup: 'PageUp',
    pagedown: 'PageDown',
    delete: 'Del',
    del: 'Del',
    return: 'Enter',
    enter: 'Enter',
    backspace: 'Backspace',
    tab: 'Tab',
    capslock: 'CapsLock',
    altgraph: 'Alt',
    option: 'Alt',
    alt: 'Alt',
    shift: 'Shift',
  };

  const CODE_MAP = {
    Space: 'Space',
    Tab: 'Tab',
    Enter: 'Enter',
    Escape: 'Esc',
    Backspace: 'Backspace',
    Delete: 'Del',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Home: 'Home',
    End: 'End',
    Insert: 'Insert',
    CapsLock: 'CapsLock',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    AltLeft: 'Alt',
    AltRight: 'Alt',
    MetaLeft: 'Win',
    MetaRight: 'Win',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    IntlBackslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Backquote: '`',
    Comma: ',',
    Period: '.',
    Slash: '/',
    Minus: '-',
    Equal: '=',
  };

  const CYRILLIC_MAP = {
    й: 'Q',
    ц: 'W',
    у: 'E',
    к: 'R',
    е: 'T',
    н: 'Y',
    г: 'U',
    ш: 'I',
    щ: 'O',
    з: 'P',
    х: '[',
    ъ: ']',
    ф: 'A',
    ы: 'S',
    в: 'D',
    а: 'F',
    п: 'G',
    р: 'H',
    о: 'J',
    л: 'K',
    д: 'L',
    ж: ';',
    э: "'",
    я: 'Z',
    ч: 'X',
    с: 'C',
    м: 'V',
    и: 'B',
    т: 'N',
    ь: 'M',
    б: ',',
    ю: '.',
    ё: '`',
  };

  const SHIFTED_SYMBOL_MAP = {
    '~': '`',
    '!': '1',
    '@': '2',
    '#': '3',
    $: '4',
    '%': '5',
    '^': '6',
    '&': '7',
    '*': '8',
    '(': '9',
    ')': '0',
    _: '-',
    '+': '=',
    '{': '[',
    '}': ']',
    '|': '\\',
    ':': ';',
    '"': "'",
    '<': ',',
    '>': '.',
    '?': '/',
  };

  function normalizeKeyCode(code) {
    if (!code) return '';
    if (CODE_MAP[code]) return CODE_MAP[code];
    if (code.startsWith('Key')) return code.slice(3).toUpperCase();
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) {
      const rest = code.slice(6);
      if (/^\d$/.test(rest)) return rest;
      if (rest === 'Add') return '+';
      if (rest === 'Subtract') return '-';
      if (rest === 'Multiply') return '*';
      if (rest === 'Divide') return '/';
      if (rest === 'Decimal') return '.';
      if (rest === 'Comma') return ',';
      if (rest === 'Enter') return 'Enter';
    }
    return '';
  }

  function normalizeKeyName(rawKey) {
    if (!rawKey) return '';
    if (rawKey === ' ') return 'Space';
    const str = String(rawKey).trim();
    if (!str) return '';
    if (/^f\d+$/i.test(str)) return str.toUpperCase();
    const lower = str.toLowerCase();
    if (KEY_ALIASES[lower]) return KEY_ALIASES[lower];
    if (str.length === 1) {
      if (CYRILLIC_MAP[lower]) return CYRILLIC_MAP[lower];
      return str.toUpperCase();
    }
    return str;
  }

  function normalizeKey(rawKey, rawCode) {
    const codeKey = normalizeKeyCode(rawCode);
    if (codeKey) return codeKey;
    return normalizeKeyName(rawKey);
  }

  function parseKeyCombo(input) {
    if (!input) return [];
    const compact = String(input).replace(/\s+/g, '');
    if (!compact) return [];
    const parts = [];
    let buf = '';
    for (const ch of compact) {
      if (ch === '+') {
        if (buf) {
          parts.push(buf);
          buf = '';
        } else {
          parts.push('+');
        }
      } else {
        buf += ch;
      }
    }
    if (buf) parts.push(buf);
    return parts.map((part) => normalizeKeyName(part)).filter(Boolean);
  }

  function normalizeKeyList(keys) {
    return keys.map((key) => normalizeKeyName(key)).filter(Boolean);
  }

  function expandShiftedSymbols(keys) {
    const out = [];
    let needsShift = false;
    for (const key of keys) {
      const base = SHIFTED_SYMBOL_MAP[key];
      if (base) {
        out.push(base);
        needsShift = true;
      } else {
        out.push(key);
      }
    }
    if (needsShift && !out.includes('Shift')) out.push('Shift');
    return out;
  }

  function normalizeKeySet(keys) {
    return expandShiftedSymbols(normalizeKeyList(keys));
  }

  function compareKeySets(inputKeys, expectedKeys) {
    const normalizedInput = normalizeKeySet(inputKeys);
    const normalizedExpected = normalizeKeySet(expectedKeys);
    const inputSet = Array.from(
      new Set(normalizedInput.map((key) => key.toLowerCase())),
    ).sort();
    const expectedSet = Array.from(
      new Set(normalizedExpected.map((key) => key.toLowerCase())),
    ).sort();
    if (inputSet.length !== expectedSet.length) return false;
    return expectedSet.every((key, index) => key === inputSet[index]);
  }

  function shuffle(list, rng = Math.random) {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function filterShortcuts(shortcuts, difficulty) {
    if (!difficulty || difficulty === 'all') return shortcuts.slice();
    return shortcuts.filter((shortcut) => shortcut.d === difficulty);
  }

  function createQuizState(shortcuts, config, rng = Math.random) {
    const filtered = filterShortcuts(shortcuts, config.difficulty);
    const shuffled = shuffle(filtered, rng);
    const count = Math.min(config.count, shuffled.length);
    return {
      qs: shuffled.slice(0, count),
      i: 0,
      k: [],
      sh: false,
      ok: false,
      c: 0
    };
  }

  function calcProgramProgress(history, programId, sampleSize = 5) {
    const records = history.filter((entry) => entry.p === programId);
    if (!records.length) return 0;
    const recent = records.slice(-sampleSize);
    const avg = recent.reduce((sum, entry) => sum + (entry.t ? entry.c / entry.t : 0), 0) / recent.length;
    return Math.round(avg * 100);
  }

  function calcAverageScore(history) {
    if (!history.length) return 0;
    const avg = history.reduce((sum, entry) => sum + (entry.t ? entry.c / entry.t : 0), 0) / history.length;
    return Math.round(avg * 100);
  }

  return {
    normalizeKey,
    normalizeKeySet,
    parseKeyCombo,
    compareKeySets,
    shuffle,
    filterShortcuts,
    createQuizState,
    calcProgramProgress,
    calcAverageScore
  };
});
