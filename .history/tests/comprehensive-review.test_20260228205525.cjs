/**
 * Comprehensive architecture / UX / feature review test suite.
 *
 * Goal: Validate every documented feature of keys against
 * industry-standard expectations for a hotkey-trainer application,
 * then expose gaps, duplications, and areas for improvement.
 *
 * Sections:
 *   A – Logic / Data layer
 *   B – Import subsystem
 *   C – UI contract (HTML / CSS / app.js surface checks)
 *   D – Architecture & code quality
 *   E – UX best-practice checks
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(rootDir, rel), 'utf8');

const hkLogic = require('../src/renderer/logic.js');
const hkProgramImport = require('../src/renderer/program-import.js');
const hkProgramImportSession = require('../src/renderer/program-import-session.js');
const hkData = require('../src/renderer/data.js');

const appSrc = read('src/renderer/app.js');
const cssSrc = read('src/renderer/styles.css');
const htmlSrc = read('src/renderer/index.html');

/* ── helpers ── */
function formatKeyList(keys) {
  const unique = Array.from(new Set(keys)).filter(Boolean);
  const MODIFIER_ORDER = { Shift: 0, Alt: 1, Ctrl: 2, Win: 3 };
  const mods = [];
  const fns = [];
  const rest = [];
  for (const k of unique) {
    if (MODIFIER_ORDER[k] != null) mods.push(k);
    else if (/^F\d+$/i.test(k)) fns.push(k);
    else rest.push(k);
  }
  mods.sort((a, b) => MODIFIER_ORDER[a] - MODIFIER_ORDER[b]);
  fns.sort();
  rest.sort();
  return [...mods, ...fns, ...rest];
}
function sanitizeColor(v) {
  const c = String(v || '').trim().toLowerCase();
  return c || '#007acc';
}
function isValidDifficulty(v) {
  return v === 'easy' || v === 'medium' || v === 'hard';
}
function createImporter() {
  return hkProgramImport.createImporter({
    normalizeKey: hkLogic.normalizeKey,
    parseKeyCombo: hkLogic.parseKeyCombo,
    formatKeyList,
    sanitizeColor,
    isValidDifficulty,
    now: () => 1,
  });
}

/* =========================================================================
 * A – LOGIC / DATA LAYER
 * ========================================================================= */

test('A01: data.js exports complete default programs list', () => {
  const { defaultPrograms, colorOptions } = hkData;
  assert.ok(Object.keys(defaultPrograms).length >= 5, 'Should ship ≥5 default programs');
  for (const [id, prog] of Object.entries(defaultPrograms)) {
    assert.ok(prog.name, `Program "${id}" must have a name`);
    assert.ok(Array.isArray(prog.sc) && prog.sc.length > 0, `Program "${id}" must have shortcuts`);
    assert.ok(typeof prog.color === 'string' && prog.color.startsWith('#'), `Program "${id}" colour`);
    for (const sc of prog.sc) {
      assert.ok(sc.a, `Shortcut id=${sc.id} in "${id}" must have "a" (action)`);
      assert.ok(Array.isArray(sc.k) && sc.k.length, `Shortcut id=${sc.id} in "${id}" must have keys`);
      assert.ok(['easy', 'medium', 'hard'].includes(sc.d), `Shortcut id=${sc.id} in "${id}" difficulty`);
    }
  }
  assert.ok(colorOptions.length >= 5, 'Should provide ≥5 colour choices');
});

test('A02: normalizeKey correctly maps keyboard event code+key pairs', () => {
  assert.equal(hkLogic.normalizeKey('a', 'KeyA'), 'A');
  assert.equal(hkLogic.normalizeKey(' ', 'Space'), 'Space');
  assert.equal(hkLogic.normalizeKey('Escape', 'Escape'), 'Esc');
  assert.equal(hkLogic.normalizeKey('ArrowUp', ''), '↑');
  assert.equal(hkLogic.normalizeKey(']', 'BracketRight'), ']');
});

test('A03: normalizeKey handles CapsLock / uncommon modifiers', () => {
  assert.equal(hkLogic.normalizeKey('CapsLock', 'CapsLock'), 'CapsLock');
  assert.equal(hkLogic.normalizeKey('AltGraph', ''), 'Alt');
});

test('A04: CYRILLIC_MAP covers all 33 lowercase cyrillic letters used on RU keyboard', () => {
  // The CYRILLIC_MAP in logic.js must cover all lower-case ё-я letters
  const cyrillic = 'ёйцукенгшщзхъфывапролджэячсмитьбю';
  for (const ch of cyrillic) {
    const normalised = hkLogic.normalizeKey(ch, '');
    assert.ok(normalised && normalised.length === 1, `Cyrillic "${ch}" should map to a Latin key, got "${normalised}"`);
  }
});

test('A05: parseKeyCombo edge-cases: empty, whitespace, lone plus', () => {
  assert.deepEqual(hkLogic.parseKeyCombo(''), []);
  assert.deepEqual(hkLogic.parseKeyCombo('   '), []);
  assert.deepEqual(hkLogic.parseKeyCombo(null), []);
  assert.deepEqual(hkLogic.parseKeyCombo('+'), ['+']);
});

test('A06: compareKeySets treats shifted symbols correctly', () => {
  // "!" is Shift+1
  assert.ok(hkLogic.compareKeySets(['!'], ['Shift', '1']), '"!" == Shift+1');
  assert.ok(hkLogic.compareKeySets(['Ctrl', '!'], ['Ctrl', 'Shift', '1']), 'Ctrl+! == Ctrl+Shift+1');
});

test('A07: shuffle with fixed rng is deterministic', () => {
  let i = 0;
  const rng = () => [0.1, 0.5, 0.9, 0.3, 0.6, 0.2, 0.8, 0.4][(i++) % 8];
  const items = [1, 2, 3, 4, 5];
  const a = hkLogic.shuffle(items, rng);
  i = 0;
  const b = hkLogic.shuffle(items, rng);
  assert.deepEqual(a, b, 'Same seed → same result');
  assert.notDeepEqual(a, items, 'Shuffled should differ from original ordering (in most seeds)');
});

test('A08: createQuizState respects count cap', () => {
  const sc = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, a: `A${i}`, k: ['A'], d: 'easy' }));
  const state = hkLogic.createQuizState(sc, { difficulty: 'all', count: 999 });
  assert.equal(state.qs.length, 30, 'Should cap at available shortcuts');
});

test('A09: calcProgramProgress returns 0 for unknown program', () => {
  const h = [{ p: 'vscode', c: 5, t: 5 }];
  assert.equal(hkLogic.calcProgramProgress(h, 'missing'), 0);
});

test('A10: calcAverageScore returns 0 for empty history', () => {
  assert.equal(hkLogic.calcAverageScore([]), 0);
});

test('A11: filterShortcuts is exported (needed for setup count calculation)', () => {
  assert.equal(typeof hkLogic.filterShortcuts, 'function');
  const sc = [
    { id: 1, d: 'easy' },
    { id: 2, d: 'hard' },
  ];
  assert.equal(hkLogic.filterShortcuts(sc, 'all').length, 2);
  assert.equal(hkLogic.filterShortcuts(sc, 'hard').length, 1);
});

/* =========================================================================
 * A-DATA: Check data quality across all default programs
 * ========================================================================= */

test('A12: no duplicate shortcut IDs within any default program', () => {
  for (const [id, prog] of Object.entries(hkData.defaultPrograms)) {
    const ids = prog.sc.map((s) => s.id);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, `Program "${id}" has duplicate shortcut IDs`);
  }
});

test('A13: no duplicate key combos within any default program', () => {
  for (const [id, prog] of Object.entries(hkData.defaultPrograms)) {
    const combos = new Set();
    for (const s of prog.sc) {
      const combo = hkLogic.normalizeKeySet(s.k).map((k) => k.toLowerCase()).sort().join('+');
      assert.ok(!combos.has(combo), `Program "${id}" has duplicate combo "${combo}" (action: "${s.a}")`);
      combos.add(combo);
    }
  }
});

test('A14: all default program colors are in colorOptions', () => {
  const colorSet = new Set(hkData.colorOptions.map((c) => c.toLowerCase()));
  for (const [id, prog] of Object.entries(hkData.defaultPrograms)) {
    assert.ok(
      colorSet.has(prog.color.toLowerCase()),
      `Program "${id}" color "${prog.color}" not in colorOptions`,
    );
  }
});

/* =========================================================================
 * B – IMPORT SUBSYSTEM
 * ========================================================================= */

test('B01: importer accepts "sc" field as shortcut source (internal format)', () => {
  const imp = createImporter();
  const res = imp.parseText(JSON.stringify({
    programs: [{ name: 'App', sc: [{ a: 'Test', k: ['Ctrl', 'T'], d: 'easy' }] }],
  }));
  assert.ok(res.ok);
  assert.equal(res.programs[0].sc.length, 1);
});

test('B02: importer accepts "hotkeys" field as shortcut source', () => {
  const imp = createImporter();
  const res = imp.parseText(JSON.stringify({
    programs: [{ name: 'App', hotkeys: [{ action: 'Go', keys: 'Ctrl+G' }] }],
  }));
  assert.ok(res.ok);
});

test('B03: importer deduplicates shortcuts by key combo', () => {
  const imp = createImporter();
  const res = imp.parseText(JSON.stringify({
    programs: [{
      name: 'App',
      shortcuts: [
        { action: 'A', keys: 'Ctrl+S' },
        { action: 'B', keys: 'Ctrl+S' },
      ],
    }],
  }));
  assert.ok(res.ok);
  assert.equal(res.programs[0].sc.length, 1, 'Duplicate combos should be collapsed');
});

test('B04: mergePrograms errors on non-object existing', () => {
  const imp = createImporter();
  const res = imp.mergePrograms(null, [{ id: 'a', name: 'A', color: '#000', sc: [{ id: 1, a: 'x', k: ['X'], d: 'easy' }] }]);
  assert.equal(res.ok, false);
  assert.equal(res.code, 'invalid_programs_store');
});

test('B05: session buildPreviewFromSources aggregates programs from multiple files', () => {
  const imp = createImporter();
  const r = hkProgramImportSession.buildPreviewFromSources({
    importer: imp,
    currentPrograms: {},
    sources: [
      { source: 'a.json', text: JSON.stringify({ programs: [{ name: 'A', shortcuts: [{ action: 'x', keys: 'X' }] }] }) },
      { source: 'b.json', text: JSON.stringify({ programs: [{ name: 'B', shortcuts: [{ action: 'y', keys: 'Y' }] }] }) },
    ],
  });
  assert.ok(r.ok);
  assert.equal(r.preview.merged.importedPrograms, 2);
});

/* =========================================================================
 * C – UI CONTRACT (surface checks on rendered HTML templates)
 * ========================================================================= */

test('C01: app.js contains all required views', () => {
  const views = ['home', 'study', 'setup', 'quiz', 'results', 'editor', 'stats', 'settings'];
  for (const v of views) {
    assert.ok(appSrc.includes(`view === '${v}'`), `View "${v}" should be referenced`);
  }
});

test('C02: nav items match VIEWS (no orphaned nav items)', () => {
  // NAV_ITEMS referenced in app.js must point to valid views or actions
  const navMatch = appSrc.match(/const NAV_ITEMS\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(navMatch, 'NAV_ITEMS definition should exist');
  const validViews = ['home', 'editor', 'stats', 'settings'];
  for (const v of validViews) {
    assert.ok(navMatch[1].includes(`view: '${v}'`), `NAV_ITEMS should include view "${v}"`);
  }
});

test('C03: settings page includes all expected user preferences', () => {
  const expected = [
    'set-theme',
    'set-confirm-quit',
    'set-confirm-destructive',
    'set-default-difficulty',
    'set-default-count',
    'set-default-mode',
    'set-shortcuts',
    'set-shortcuts-quiz',
  ];
  for (const action of expected) {
    assert.ok(appSrc.includes(`data-action="${action}"`), `Settings should expose "${action}"`);
  }
});

test('C04: quiz UI has all action buttons', () => {
  const quizActions = ['check-answer', 'skip-question', 'next-question', 'reset-answer', 'quit-quiz'];
  for (const action of quizActions) {
    assert.ok(appSrc.includes(`data-action="${action}"`), `Quiz should have data-action="${action}"`);
  }
});

test('C05: editor allows CRUD on programs and shortcuts', () => {
  const crudActions = [
    'show-program-modal',
    'save-program',
    'delete-program',
    'show-shortcut-modal',
    'save-shortcut',
    'delete-shortcut',
    'select-program',
  ];
  for (const action of crudActions) {
    assert.ok(appSrc.includes(`'${action}'`), `CRUD action "${action}" should exist`);
  }
});

test('C06: search functionality exists on home, study, and editor', () => {
  const searches = ['search-programs', 'search-study', 'search-editor-programs', 'search-editor-shortcuts'];
  for (const s of searches) {
    assert.ok(appSrc.includes(`'${s}'`), `Search action "${s}" should exist`);
  }
});

test('C07: statistics page has history management actions', () => {
  const statsActions = ['reset-stats', 'reset-programs', 'reset-program-progress', 'delete-history'];
  for (const action of statsActions) {
    assert.ok(appSrc.includes(`'${action}'`), `Stats action "${action}" should exist`);
  }
});

test('C08: CSS has responsive breakpoints', () => {
  assert.ok(cssSrc.includes('@media (max-width: 1024px)'), 'Should have tablet breakpoint');
  assert.ok(cssSrc.includes('@media (max-width: 768px)'), 'Should have mobile breakpoint');
});

test('C09: CSS respects prefers-reduced-motion', () => {
  assert.ok(cssSrc.includes('prefers-reduced-motion'), 'Should respect reduced motion preference');
});

test('C10: both dark and light themes defined', () => {
  assert.ok(cssSrc.includes('[data-theme="dark"]'), 'Dark theme CSS');
  assert.ok(htmlSrc.includes('data-theme='), 'Theme attribute in HTML');
  assert.ok(appSrc.includes("'dark'") && appSrc.includes("'light'"), 'Theme toggle logic');
});

test('C11: keyboard capture for shortcut recording exists', () => {
  assert.ok(appSrc.includes('startKeyCapture'), 'Key capture start');
  assert.ok(appSrc.includes('stopKeyCapture'), 'Key capture stop');
  assert.ok(appSrc.includes('toggle-capture'), 'Toggle capture action');
  assert.ok(appSrc.includes('input-recording'), 'Recording CSS class');
});

test('C12: quiz mode supports both "input" and "choice" modes', () => {
  assert.ok(appSrc.includes("mode === 'input'"), 'Input mode check');
  assert.ok(appSrc.includes("mode === 'choice'"), 'Choice mode check');
  assert.ok(appSrc.includes('quiz-choice-list'), 'Choice list UI');
  assert.ok(appSrc.includes('select-choice'), 'Choice selection action');
});

/* =========================================================================
 * D – ARCHITECTURE & CODE QUALITY CHECKS
 * ========================================================================= */

test('D01: app.js is a single IIFE (no top-level leaks)', () => {
  const trimmed = appSrc.trim();
  assert.ok(trimmed.startsWith('(function'), 'Should open with IIFE');
  assert.ok(trimmed.endsWith('})();') || trimmed.match(/\}\)\(\);\s*$/), 'Should close with IIFE invocation');
});

test('D02: all renderer modules use UMD pattern for testability', () => {
  const modules = ['data.js', 'logic.js', 'program-import.js', 'program-import-session.js'];
  for (const mod of modules) {
    const src = read(`src/renderer/${mod}`);
    assert.ok(
      src.includes('module.exports') && src.includes('root.hk'),
      `${mod} should use UMD pattern (module.exports + window global)`,
    );
  }
});

test('D03: REVIEW: app.js monolith size exceeds recommended threshold', () => {
  const loc = appSrc.split('\n').length;
  // Industry recommendation: single file <500 LOC for maintainability.
  // This is an informational test; it will "pass" but flag the issue.
  if (loc > 800) {
    console.log(`  ⚠ app.js is ${loc} LOC (recommended <500 for maintainability)`);
  }
  assert.ok(loc > 0);
});

test('D04: REVIEW: escapeHtml duplicated between index.html and app.js', () => {
  const htmlHasEscape = htmlSrc.includes('function') && htmlSrc.includes('escapeHtml');
  const appHasEscape = appSrc.includes('function escapeHtml');
  if (htmlHasEscape && appHasEscape) {
    console.log('  ⚠ escapeHtml is duplicated in index.html (inline) and app.js');
  }
  // Just detect, always pass
  assert.ok(true);
});

test('D05: REVIEW: formatKeyList duplicated between app.js and test helpers', () => {
  // formatKeyList exists in app.js (inside IIFE) but is NOT part of logic.js public API
  const logicSrc = read('src/renderer/logic.js');
  const logicExports = logicSrc.includes("formatKeyList");
  // formatKeyList is NOT exported from logic.js even though multiple files need it
  if (!logicExports) {
    console.log('  ⚠ formatKeyList is defined inside app.js IIFE but not exported from logic.js');
    console.log('    → Tests had to re-implement it. This is a code duplication issue.');
  }
  assert.ok(true);
});

test('D06: REVIEW: full render() call on every small state mutation', () => {
  // Count how frequently render() is called
  const renderCalls = (appSrc.match(/\brender\(\)/g) || []).length;
  if (renderCalls > 30) {
    console.log(`  ⚠ render() is called ${renderCalls} times — full DOM re-render each time`);
    console.log('    → Consider lightweight state diffing or targeted DOM updates.');
  }
  assert.ok(renderCalls > 0);
});

test('D07: REVIEW: innerHTML used for rendering (XSS surface)', () => {
  const innerHTMLCount = (appSrc.match(/\.innerHTML\s*=/g) || []).length;
  const usesEscapeHtml = appSrc.includes('escapeHtml');
  if (innerHTMLCount > 3) {
    console.log(`  ⚠ innerHTML assigned ${innerHTMLCount} times in app.js`);
    if (usesEscapeHtml) {
      console.log('    ✓ escapeHtml is used to sanitise user content');
    }
  }
  assert.ok(true);
});

test('D08: REVIEW: localStorage keys use short/cryptic names', () => {
  const keys = ['hk_p', 'hk_s', 'hk_sh', 'hk_cfg', 'hk_sv'];
  for (const k of keys) {
    assert.ok(appSrc.includes(`'${k}'`), `Storage key "${k}" should exist`);
  }
  console.log('  ⚠ Storage keys (hk_p, hk_s, etc.) are cryptic — consider readable names');
  console.log('    → "hk_programs", "hk_stats", "hk_showShortcuts", "hk_settings", "hk_survey"');
});

test('D09: REVIEW: no data migration mechanism on schema changes', () => {
  const hasVersion = appSrc.includes('version') || appSrc.includes('migration') || appSrc.includes('schemaVersion');
  if (!hasVersion) {
    console.log('  ⚠ No versioning/migration for localStorage data.');
    console.log('    → If data schema changes, users lose data or get fatal errors.');
  }
  assert.ok(true);
});

test('D10: REVIEW: inline SVG icons define full SVG markup in JS (~200+ lines)', () => {
  const iconMatches = appSrc.match(/<svg[\s\S]*?<\/svg>/g) || [];
  if (iconMatches.length > 5) {
    console.log(`  ⚠ ${iconMatches.length} inline SVG icons embedded directly in app.js`);
    console.log('    → Consider extracting to a separate icons.js or using an SVG sprite sheet.');
  }
  assert.ok(true);
});

test('D11: REVIEW: shortcut data structure uses single-letter property names', () => {
  // { id, a, k, d } — cryptic property names
  const firstProg = Object.values(hkData.defaultPrograms)[0];
  if (firstProg && firstProg.sc && firstProg.sc[0]) {
    const sc0 = firstProg.sc[0];
    assert.ok('a' in sc0, 'action is stored as "a"');
    assert.ok('k' in sc0, 'keys stored as "k"');
    assert.ok('d' in sc0, 'difficulty stored as "d"');
    console.log('  ⚠ Shortcut properties use single letters: a, k, d');
    console.log('    → Readable names (action, keys, difficulty) improve maintainability.');
    console.log('    → Would need migration or backward compat for existing localStorage.');
  }
});

test('D12: REVIEW: quiz state uses single-letter property names', () => {
  const sc = [{ id: 1, a: 'Test', k: ['A'], d: 'easy' }];
  const qz = hkLogic.createQuizState(sc, { difficulty: 'all', count: 1 });
  assert.ok('qs' in qz && 'i' in qz && 'k' in qz && 'sh' in qz && 'ok' in qz && 'c' in qz);
  console.log('  ⚠ Quiz state uses: qs, i, k, sh, ok, c → hard to read/debug');
});

/* =========================================================================
 * E – UX BEST PRACTICE CHECKS
 * ========================================================================= */

test('E01: quiz provides immediate visual feedback (correct/incorrect classes)', () => {
  assert.ok(cssSrc.includes('.quiz-input.correct'), 'Green border on correct');
  assert.ok(cssSrc.includes('.quiz-input.incorrect'), 'Red border on incorrect');
  assert.ok(cssSrc.includes('.quiz-result.correct'), 'Correct result styling');
  assert.ok(cssSrc.includes('.quiz-result.incorrect'), 'Incorrect result styling');
});

test('E02: quiz shows the correct answer on wrong attempt', () => {
  assert.ok(appSrc.includes('quiz-answer'), 'quiz-answer block exists');
  assert.ok(appSrc.includes('Правильный ответ'), 'Correct answer text shown');
});

test('E03: progress bar exists in quiz and program cards', () => {
  assert.ok(appSrc.includes('quiz-progress-bar'), 'Quiz progress bar');
  assert.ok(appSrc.includes('progress-fill'), 'Program progress fill');
});

test('E04: REVIEW: no spaced repetition / SRS or learning curve adaptation', () => {
  const hasSRS = appSrc.includes('spaced') || appSrc.includes('interval') || appSrc.includes('retention');
  if (!hasSRS) {
    console.log('  ⚠ No spaced repetition algorithm (SRS) for optimising memorisation.');
    console.log('    → Industry best practice: prioritise shortcuts the user gets wrong more often.');
  }
  assert.ok(true);
});

test('E05: REVIEW: no per-shortcut statistics (only per-quiz aggregate)', () => {
  // History entries store only { p, c, t, dt } — no per-shortcut breakdown
  const hasPerShortcutStats = appSrc.includes('shortcutStats') || appSrc.includes('perShortcut');
  if (!hasPerShortcutStats) {
    console.log('  ⚠ Stats are per-quiz only. No tracking of which shortcuts are weakest.');
    console.log('    → Knowing error-prone shortcuts lets adaptive quizzes target gaps.');
  }
  assert.ok(true);
});

test('E06: REVIEW: no timed quiz mode', () => {
  const hasTiming = appSrc.includes('timer') || appSrc.includes('countdown') || appSrc.includes('timeLimit');
  if (!hasTiming) {
    console.log('  ⚠ No timed/speed quiz mode. Time pressure aids muscle memory.');
  }
  assert.ok(true);
});

test('E07: REVIEW: no sound or haptic feedback', () => {
  const hasAudio = appSrc.includes('Audio') || appSrc.includes('audio') || appSrc.includes('beep');
  if (!hasAudio) {
    console.log('  ⚠ No sound/audio feedback on correct/wrong answer.');
    console.log('    → Some trainers use subtle sounds to reinforce learning.');
  }
  assert.ok(true);
});

test('E08: REVIEW: settings page mixes app config with survey (unrelated concerns)', () => {
  const settingsHasSurvey = appSrc.includes("'submit-survey'") && appSrc.includes('settingsH');
  if (settingsHasSurvey) {
    console.log('  ⚠ Survey form is placed inside Settings page.');
    console.log('    → Survey is unrelated to application settings; should be a separate view or modal.');
  }
  assert.ok(true);
});

test('E09: REVIEW: "Подсказки" (hints panel) toggle exists in both nav and settings', () => {
  const navHelp = appSrc.includes("action: 'show-help'");
  const settingsHelp = appSrc.includes("set-shortcuts");
  if (navHelp && settingsHelp) {
    console.log('  ⚠ Hint panel can be toggled from both nav (F1) AND settings page.');
    console.log('    → Two different controls for the same feature can confuse users.');
  }
  assert.ok(true);
});

test('E10: REVIEW: quiz hotkey defaults conflict with F-key navigation', () => {
  // F2=home, F3=editor, F4=stats, F5=settings, F6=check, F7=deleteLast, F8=reset, F9=skip, F10=quit
  // F5 conflicts with browser/electron reload if not properly intercepted
  console.log('  ⚠ F2-F10 are all claimed by the app for navigation + quiz controls.');
  console.log('    → F5 (settings) conflicts with Electron/OS "refresh". F11 = fullscreen.');
  console.log('    → Consider less conflicting defaults (e.g. Ctrl+1..4 for nav).');
  assert.ok(true);
});

test('E11: REVIEW: no keyboard shortcut for starting quiz from home', () => {
  // On the 'home' view, Enter starts quiz only on 'setup' view
  const homeEnter = appSrc.includes("view === 'home' && keyRaw === 'Enter'");
  if (!homeEnter) {
    console.log('  ⚠ No Enter shortcut to start quiz from home screen.');
    console.log('    → User must mouse-click "Тест" button on program card.');
  }
  assert.ok(true);
});

test('E12: REVIEW: export/import only for hotkeys, not for programs+stats', () => {
  const exportsPrograms = appSrc.includes('exportPrograms') || appSrc.includes('exportAll');
  if (!exportsPrograms) {
    console.log('  ⚠ Export/import only covers app hotkey config, not program data or stats.');
    console.log('    → Users who invest time customizing programs cannot back up their data.');
  }
  assert.ok(true);
});

test('E13: REVIEW: no confirmation or undo when deleting individual shortcuts', () => {
  // delS calls confirmAction (via confirmDestructive flag), which uses browser confirm()
  const hasConfirmDelS = appSrc.includes('confirmAction') && appSrc.includes('delS');
  if (hasConfirmDelS) {
    console.log('  ✓ Deletion asks for confirmation (via confirm()). But uses native dialog.');
    console.log('    → Consider in-app confirmation modal for better UX (no jarring native popup).');
  }
  assert.ok(true);
});

test('E14: REVIEW: program card shows only first letter as icon', () => {
  // getProgramInitial returns charAt(0)
  const hasInitial = appSrc.includes('getProgramInitial');
  if (hasInitial) {
    console.log('  ⚠ Program icon shows only the first character of the name.');
    console.log('    → Consider allowing users to pick a custom icon/emoji or use program logos.');
  }
  assert.ok(true);
});

test('E15: REVIEW: quiz does not track response time per question', () => {
  const tracksTime = appSrc.includes('responseTime') || appSrc.includes('startTime') || appSrc.includes('elapsed');
  if (!tracksTime) {
    console.log('  ⚠ No time tracking per question. Knowing speed is key for muscle memory.');
  }
  assert.ok(true);
});

test('E16: REVIEW: no onboarding or tutorial for first-time users', () => {
  const hasOnboarding = appSrc.includes('onboarding') || appSrc.includes('tutorial') || appSrc.includes('firstLaunch');
  if (!hasOnboarding) {
    console.log('  ⚠ No onboarding/tutorial flow. New users may not understand quiz modes.');
  }
  assert.ok(true);
});

test('E17: accessibility – focus-visible styles exist', () => {
  assert.ok(cssSrc.includes(':focus-visible'), 'focus-visible CSS rules');
  assert.ok(cssSrc.includes('box-shadow: 0 0 0 3px'), 'Visible focus ring');
});

test('E18: accessibility – aria attributes in import dropzone', () => {
  assert.ok(appSrc.includes('aria-label='), 'aria-label present');
  assert.ok(appSrc.includes('aria-live="polite"'), 'aria-live for status updates');
  assert.ok(appSrc.includes('role="status"'), 'role=status for import feedback');
});

test('E19: REVIEW: no ARIA landmarks or headings structure outside basic HTML', () => {
  const hasAria = htmlSrc.includes('role="main"') || htmlSrc.includes('role="navigation"');
  if (!hasAria) {
    console.log('  ⚠ No ARIA landmarks (role=main, role=navigation) in index.html.');
    console.log('    → Semantic HTML (main, nav) is used but explicit roles improve screen reader UX.');
  }
  assert.ok(true);
});

test('E20: REVIEW: entire UI re-rendered on each state change (no virtual DOM)', () => {
  // render() rewrites innerHTML of #main and #nav every time
  const renderBody = appSrc.match(/function render\(\)[\s\S]{0,500}/);
  if (renderBody && renderBody[0].includes('.innerHTML')) {
    console.log('  ⚠ Full innerHTML re-render on each state change loses scroll, focus, animations.');
    console.log('    → search input restoring is patched, but other states (scroll, selection) are lost.');
  }
  assert.ok(true);
});

/* =========================================================================
 * E-EXTRA: Duplication and consistency
 * ========================================================================= */

test('E21: REVIEW: difficulty labels displayed in multiple places with different formats', () => {
  // study view: "Лёгкий" / "Средний" / "Сложный"
  // setup view: "Лёгкие" / "Средние" / "Сложные"
  // editor view: "Лёгкий" / "Средний" / "Сложный"
  const singular = (appSrc.match(/Лёгкий/g) || []).length;
  const plural = (appSrc.match(/Лёгкие/g) || []).length;
  if (singular && plural) {
    console.log(`  ⚠ Difficulty labels mixed: singular (${singular}x "Лёгкий") + plural (${plural}x "Лёгкие")`);
    console.log('    → Extract to a shared labelling function for consistency.');
  }
  assert.ok(true);
});

test('E22: REVIEW: search feature duplicated 4 times with similar but not shared logic', () => {
  const searchVars = ['progQuery', 'studyQuery', 'editorProgramQuery', 'editorShortcutQuery'];
  for (const v of searchVars) {
    assert.ok(appSrc.includes(v), `Search variable "${v}" exists`);
  }
  console.log('  ⚠ 4 independent search variables and filter pipelines.');
  console.log('    → Could use a single reusable search controller function.');
  assert.ok(true);
});

test('E23: REVIEW: "Сбросить программы" button in Stats is unexpected', () => {
  // stats page has reset-programs which resets program data (not stats-related)
  assert.ok(appSrc.includes("'reset-programs'"));
  console.log('  ⚠ "Сбросить программы" button in Statistics page resets PROGRAM data.');
  console.log('    → This action belongs in Editor or Settings, not Statistics.');
  assert.ok(true);
});

test('E24: REVIEW: confirm() and alert() used for dialogs (blocks main thread)', () => {
  const confirmCount = (appSrc.match(/\bconfirm\(/g) || []).length;
  const alertCount = (appSrc.match(/\balert\(/g) || []).length;
  console.log(`  ⚠ Native dialogs: confirm() ${confirmCount}x, alert() ${alertCount}x`);
  console.log('    → Consider custom in-app modal dialogs for consistent UX.');
  assert.ok(true);
});

