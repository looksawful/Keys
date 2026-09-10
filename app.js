(function () {
  const d = window.hkData;
  const l = window.hkLogic;
  if (!d || !l) {
    document.body.textContent = 'Ошибка загрузки приложения';
    return;
  }

  const main = document.querySelector('#main');
  const progs = d.defaultPrograms;
  const ids = Object.keys(progs);
  const cfgKey = 'hk_browser_cfg';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (n, max) => Math.max(1, Math.min(Number(n) || 1, max || 1));
  const readCfg = () => {
    try { return JSON.parse(localStorage.getItem(cfgKey)) || {}; } catch { return {}; }
  };
  const cfg = readCfg();
  const saveCfg = () => localStorage.setItem(cfgKey, JSON.stringify({ cat, cnt, mode, timerOn, timerSec }));

  const brand = {
    figma: { c: '#1abcfe', icon: '<svg viewBox="0 0 24 24"><path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 8.981c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V8.981H8.148zM8.172 24c-2.489 0-4.515-2.014-4.515-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.563 4.539zm-.024-7.51a3.023 3.023 0 0 0-3.019 3.019c0 1.665 1.365 3.019 3.044 3.019 1.705 0 3.093-1.376 3.093-3.068v-2.97H8.148zm7.704 0h-.098c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h.098c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49zm-.097-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h.098c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-.098z"/></svg>' },
    vscode: { c: '#007acc', icon: '<svg viewBox="0 0 24 24"><path d="M22 4.8v14.4L17.4 21 7.8 12l9.6-9L22 4.8zM17.2 7.2 11.2 12l6 4.8V7.2zM7 8.4 3.8 5.8 2 6.7v10.6l1.8.9L7 15.6 4.4 12 7 8.4z"/></svg>' },
    chrome: { c: '#4285f4', icon: '<svg viewBox="0 0 24 24"><path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z"/></svg>' },
    terminal: { c: '#4d8cff', icon: '<svg viewBox="0 0 24 24"><path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm2.7 5.2 3 2.8-3 2.8 1.4 1.5 4.7-4.3-4.7-4.3-1.4 1.5zM12 15h6v-2h-6v2z"/></svg>' },
    powershell: { c: '#2671be', icon: '<svg viewBox="0 0 24 24"><path d="M3 4.5 21 3l-2.5 17.2L2 21l1-16.5zm4 4.1 4.1 3.4L6.7 16h3l4.2-4-4.2-3.4H7zm6 8.4h5v-2h-5v2z"/></svg>' },
    photoshop: { c: '#31a8ff', icon: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm4 14h2.2v-4h1.5c2.6 0 4.2-1.5 4.2-3.8 0-2.2-1.5-3.6-4-3.6H7V17zm2.2-5.8V7.4h1.4c1.3 0 2 .7 2 1.9 0 1.2-.8 1.9-2.1 1.9H9.2zm6.2 4.9c.7.6 1.8.9 3 .9 2 0 3.2-1 3.2-2.5 0-1.2-.7-1.9-2.3-2.4-1-.3-1.3-.5-1.3-.9 0-.4.4-.7 1.1-.7.8 0 1.5.3 2 .7v-1.9c-.5-.4-1.3-.6-2.3-.6-1.9 0-3.1 1.1-3.1 2.5 0 1.2.8 1.9 2.4 2.4.9.3 1.2.5 1.2.9 0 .5-.4.7-1.2.7-1 0-1.9-.4-2.6-1v1.9z"/></svg>' },
    comfyui: { c: '#8b5cf6', icon: '<svg viewBox="0 0 24 24"><path d="M12 2 4 6.5v11L12 22l8-4.5v-11L12 2zm0 3.2 5.2 3L12 11.1 6.8 8.2l5.2-3zM6.5 10.6l4 2.3v5.5l-4-2.3v-5.5zm11 0v5.5l-4 2.3v-5.5l4-2.3z"/></svg>' },
    notion: { c: '#f7f7f7', icon: '<svg viewBox="0 0 24 24"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/></svg>' },
    obsidian: { c: '#7c3aed', icon: '<svg viewBox="0 0 24 24"><path d="M19.355 18.538a68.967 68.959 0 0 0 1.858-2.954.81.81 0 0 0-.062-.9c-.516-.685-1.504-2.075-2.042-3.362-.553-1.321-.636-3.375-.64-4.377a1.707 1.707 0 0 0-.358-1.05l-3.198-4.064a3.744 3.744 0 0 1-.076.543c-.106.503-.307 1.004-.536 1.5-.134.29-.29.6-.446.914l-.31.626c-.516 1.068-.997 2.227-1.132 3.59-.124 1.26.046 2.73.815 4.481.128.011.257.025.386.044a6.363 6.363 0 0 1 3.326 1.505c.916.79 1.744 1.922 2.415 3.5zM8.199 22.569c.073.012.146.02.22.02.78.024 2.095.092 3.16.29.87.16 2.593.64 4.01 1.055 1.083.316 2.198-.548 2.355-1.664.114-.814.33-1.735.725-2.58l-.01.005c-.67-1.87-1.522-3.078-2.416-3.849a5.295 5.295 0 0 0-2.778-1.257c-1.54-.216-2.952.19-3.84.45.532 2.218.368 4.829-1.425 7.531zM5.533 9.938c-.023.1-.056.197-.098.29L2.82 16.059a1.602 1.602 0 0 0 .313 1.772l4.116 4.24c2.103-3.101 1.796-6.02.836-8.3-.728-1.73-1.832-3.081-2.55-3.831zM9.32 14.01c.615-.183 1.606-.465 2.745-.534-.683-1.725-.848-3.233-.716-4.577.154-1.552.7-2.847 1.235-3.95.113-.235.223-.454.328-.664.149-.297.288-.577.419-.86.217-.47.379-.885.46-1.27.08-.38.08-.72-.014-1.043-.095-.325-.297-.675-.68-1.06a1.6 1.6 0 0 0-1.475.36l-4.95 4.452a1.602 1.602 0 0 0-.513.952l-.427 2.83c.672.59 2.328 2.316 3.335 4.711.09.21.175.43.253.653z"/></svg>' },
    powertoys: { c: '#31a8ff', icon: '<svg viewBox="0 0 24 24"><path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"/></svg>' },
  };

  const cats = {
    figma: ['Essential', 'Tools', 'View', 'Zoom', 'Text', 'Shape', 'Selection', 'Cursor', 'Edit', 'Transform', 'Arrange', 'Components', 'Layout'],
    vscode: ['Файлы', 'Редактирование', 'Поиск', 'Навигация', 'Интерфейс', 'Отладка'],
    chrome: ['Вкладки', 'Окна', 'Навигация', 'Страница', 'Инструменты'],
    terminal: ['Вкладки', 'Панели', 'Навигация', 'Ввод'],
    powershell: ['Ввод', 'Навигация', 'Редактирование', 'Экран'],
    photoshop: ['Инструменты', 'Файл', 'Редактирование', 'Слои', 'Выделение', 'Цвет', 'Вид'],
    comfyui: ['Workflow', 'Nodes', 'Queue', 'View', 'Edit'],
    notion: ['Навигация', 'Блоки', 'Редактирование', 'Форматирование'],
    obsidian: ['Файлы', 'Навигация', 'Редактирование', 'Вид'],
    powertoys: ['Запуск', 'Окна', 'Инструменты'],
  };

  const has = (s, a) => a.some((x) => s.includes(x));
  const catOf = (id, x) => {
    const s = `${x.a} ${x.k.join(' ')}`.toLowerCase();
    if (id === 'figma') {
      if (has(s, ['текст', 'курсив', 'подч', 'межбукв', 'межстроч', 'выравнивание текста'])) return 'Text';
      if (has(s, ['масштаб', 'увелич', 'уменьш', 'вписать', 'zoom'])) return 'Zoom';
      if (has(s, ['прямоугольник', 'эллипс', 'линия', 'перо', 'карандаш', 'стрелка', 'секция'])) return 'Shape';
      if (has(s, ['выдел', 'слой', 'фрейм', 'групп', 'заблок'])) return 'Selection';
      if (has(s, ['копир', 'встав', 'вырез', 'отмен', 'повтор', 'дублир', 'новый файл', 'синхрониз'])) return 'Edit';
      if (has(s, ['трансформ', 'scale', 'маск', 'flatten'])) return 'Transform';
      if (has(s, ['выровн', 'перед', 'зад', 'распредел'])) return 'Arrange';
      if (has(s, ['компонент', 'instance', 'экземпляр'])) return 'Components';
      if (has(s, ['авто-лейаут', 'layout'])) return 'Layout';
      if (has(s, ['рука', 'курсор', 'перемещение', 'пипетка', 'комментарий'])) return 'Cursor';
      if (has(s, ['линейки', 'preview', 'dev mode', 'presentation'])) return 'View';
      if (has(s, ['рамка', 'быстрый', 'очистить', 'экспорт'])) return 'Essential';
      return 'Tools';
    }
    if (has(s, ['поиск', 'замена', 'найти'])) return ['vscode'].includes(id) ? 'Поиск' : 'Инструменты';
    if (has(s, ['файл', 'сохран', 'открыть', 'закрыть', 'новое окно', 'новая вкладка', 'вкладк'])) return id === 'chrome' ? 'Вкладки' : id === 'terminal' ? 'Вкладки' : 'Файлы';
    if (has(s, ['копир', 'встав', 'вырез', 'отмен', 'повтор', 'удал', 'строк', 'комментар', 'формат', 'жирный', 'курсив'])) return 'Редактирование';
    if (has(s, ['панель', 'боковая', 'расширения', 'терминал', 'полноэкран', 'экран', 'масштаб', 'история', 'загрузки', 'devtools'])) return id === 'photoshop' ? 'Вид' : id === 'chrome' ? 'Страница' : 'Интерфейс';
    if (has(s, ['назад', 'вперёд', 'перейти', 'символ', 'определен', 'ссылк', 'курсор', 'слово', 'начало', 'конец'])) return 'Навигация';
    if (has(s, ['отлад', 'breakpoint', 'шаг', 'f5', 'f9', 'f10', 'f11'])) return 'Отладка';
    if (id === 'photoshop' && has(s, ['кисть', 'пипетка', 'рука', 'залив', 'уровни', 'кривые', 'цвет', 'выделение', 'маск', 'слой'])) return has(s, ['слой']) ? 'Слои' : has(s, ['цвет', 'уровни', 'кривые']) ? 'Цвет' : has(s, ['выдел', 'маск']) ? 'Выделение' : 'Инструменты';
    if (id === 'comfyui') return has(s, ['queue', 'очеред']) ? 'Queue' : has(s, ['node', 'узел']) ? 'Nodes' : has(s, ['view', 'zoom', 'масштаб']) ? 'View' : has(s, ['copy', 'paste', 'edit']) ? 'Edit' : 'Workflow';
    if (id === 'powertoys') return has(s, ['run']) ? 'Запуск' : has(s, ['zones']) ? 'Окна' : 'Инструменты';
    return cats[id]?.[0] || 'Основное';
  };

  let view = 'home', sel = ids[0], cat = cfg.cat || 'all', cnt = Number.isFinite(cfg.cnt) ? cfg.cnt : 10;
  let mode = cfg.mode === 'choice' ? 'choice' : 'input';
  let timerOn = cfg.timerOn !== false, timerSec = Number(cfg.timerSec) || 60;
  let qz = null, down = new Set(), reset = false, tick = null, chordTick = null, flash = '', lastEsc = 0;

  const meta = (id = sel) => brand[id] || { c: progs[id]?.color || '#fff', icon: '' };
  const icon = (id = sel) => `<span class="logo" style="--c:${meta(id).c}">${meta(id).icon}</span>`;
  const combo = (a) => a.map((k) => `<span class="key ${keyCls(k)}">${esc(k)}</span>`).join('');
  const keyCls = (k) => /^ctrl$/i.test(k) ? 'mod ctrl' : /^shift$/i.test(k) ? 'mod shift' : /^alt$/i.test(k) ? 'mod alt' : /^win$/i.test(k) ? 'mod win' : /^[a-zа-я0-9]$/i.test(k) ? `letter k${String(k).toLowerCase().charCodeAt(0) % 8}` : 'spec';
  const modifierKeys = new Set(['Ctrl', 'Shift', 'Alt', 'Win']);
  const shortcutSteps = (shortcut) => l.shortcutSteps(shortcut);
  const chordHtml = (steps) => steps.map((step) => combo(step)).join('<span class="chord-sep" aria-hidden="true">→</span>');
  const shortcutCombo = (shortcut) => chordHtml(shortcutSteps(shortcut));
  const answerCombo = (steps) => chordHtml((steps || []).filter((step) => Array.isArray(step) && step.length));
  const catList = () => ['all', ...(cats[sel] || [])];
  const shown = (id = sel) => progs[id].sc.filter((x) => cat === 'all' || catOf(id, x) === cat);
  const counts = (max) => [5, 10, 15, max].filter((x, i, a) => x > 0 && x <= max && a.indexOf(x) === i);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function homeH() {
    return `<section class="page home"><div class="head"><h1>Тренировка горячих клавиш</h1></div><div class="grid">${ids.map((id) => {
      const p = progs[id], m = meta(id);
      return `<article class="card" style="--c:${m.c}"><button class="prog" data-open-test="${id}">${icon(id)}<b>${esc(p.name)}</b></button><button class="ghost" data-open-list="${id}">? <span>Клавиши</span></button><button class="train" data-open-test="${id}">Тренировать</button></article>`;
    }).join('')}</div></section>`;
  }

  function top(toStudy) {
    return `<div class="top"><button class="back" data-go="home" aria-label="Вернуться">←</button>${toStudy ? `<button class="ghost top-keys" data-go="study">? <span>Клавиши</span></button>` : `<button class="fab" data-go="setup">Тренировать</button>`}</div>`;
  }

  function titleH(text) {
    return `<div class="program-title" style="--c:${meta().c}">${icon()}<h1>${esc(text)}</h1></div>`;
  }

  function catBtns() {
    return `<div class="tabs">${catList().map((x) => `<button class="tab${cat === x ? ' active' : ''}" data-cat="${esc(x)}">${x === 'all' ? 'Все' : esc(x)}</button>`).join('')}</div>`;
  }

  function studyH() {
    return `<section class="page">${top(false)}${titleH(progs[sel].name)}${catBtns()}<div class="list">${shown().map((s) => `<div class="item"><span>${esc(s.a)}</span><span class="keys">${shortcutCombo(s)}</span></div>`).join('')}</div></section>`;
  }

  function setupH() {
    const max = shown().length;
    cnt = clamp(cnt, max);
    saveCfg();
    return `<section class="page narrow">${top(true)}${titleH(progs[sel].name)}<div class="panel" style="--c:${meta().c}"><label>Категории</label>${catBtns()}<label>Количество вопросов</label><div class="filters">${counts(max).map((n) => `<button class="chip${cnt === n ? ' active' : ''}" data-cnt="${n}">${n === max ? `Максимум ${n}` : n}</button>`).join('')}<input class="num" type="number" min="1" max="${max}" value="${cnt}" data-num></div><label>Режим теста</label><div class="filters"><button class="chip${mode === 'input' ? ' active' : ''}" data-mode="input">Клавиатурный ввод</button><button class="chip${mode === 'choice' ? ' active' : ''}" data-mode="choice">Выбор ответа</button></div><label>Таймер</label><div class="filters"><button class="chip${timerOn ? ' active' : ''}" data-timer="on">Включить</button><button class="chip${!timerOn ? ' active' : ''}" data-timer="off">Выключить</button>${[15, 30, 60, 180].map((s) => `<button class="chip${timerSec === s ? ' active' : ''}" data-time="${s}">${s < 60 ? `${s} секунд` : `${s / 60} минута${s === 180 ? 'ы' : ''}`}</button>`).join('')}<input class="num" type="number" min="5" value="${timerSec}" data-time-num></div><button class="start" data-start ${max ? '' : 'disabled'}>Начать тренировку</button></div></section>`;
  }

  function start() {
    const qs = shown();
    qz = { qs: l.shuffle(qs).slice(0, clamp(cnt, qs.length)), i: 0, c: 0, k: [], step: 0, entered: [], stepMatched: false, left: timerSec, mistakes: [], ok: [], skipped: [], mode };
    down = new Set(); reset = false; flash = ''; lastEsc = 0;
    clearInterval(tick);
    clearTimeout(chordTick); chordTick = null;
    if (timerOn) tick = setInterval(() => { if (!qz) return; qz.left -= 1; if (qz.left <= 0) finish(); else render(); }, 1000);
    setView('quiz');
  }

  function finish() {
    clearInterval(tick); tick = null;
    clearTimeout(chordTick); chordTick = null;
    view = 'results'; render();
  }

  function cur() { return qz?.qs[qz.i]; }
  function setView(v) { view = v; render(); }
  function goNext(delay = 0) { setTimeout(() => { if (!qz) return; qz.i += 1; qz.k = []; qz.step = 0; qz.entered = []; qz.stepMatched = false; down = new Set(); reset = false; flash = ''; clearTimeout(chordTick); chordTick = null; if (qz.i >= qz.qs.length) finish(); else render(); }, delay); }
  function pass() { if (!qz || !cur()) return; clearTimeout(chordTick); chordTick = null; qz.c += 1; qz.ok.push(cur()); flash = 'ok'; render(); goNext(650); }
  function fail(steps, skip) { if (!qz || !cur()) return; clearTimeout(chordTick); chordTick = null; qz.mistakes.push({ q: cur(), got: (steps || []).map((step) => step.slice()), skip: !!skip }); qz.skipped.push(cur()); if (skip) goNext(0); else { flash = 'bad'; render(); goNext(250); } }
  function currentSteps() { return cur() ? shortcutSteps(cur()) : []; }
  function checkChoice(id) { const selected = progs[sel].sc.find((s) => String(s.id) === String(id)); if (!selected || !cur()) return; selected.id === cur().id ? pass() : fail(shortcutSteps(selected), false); }
  function advanceChord() {
    if (!qz || !cur()) return;
    const steps = currentSteps();
    const matched = steps[qz.step];
    if (!matched || qz.step >= steps.length - 1) return;
    qz.entered.push(matched.slice());
    qz.step += 1;
    qz.k = Array.from(down);
    qz.stepMatched = false;
    clearTimeout(chordTick);
    chordTick = setTimeout(() => {
      if (view !== 'quiz' || !qz) return;
      qz.step = 0; qz.entered = []; qz.stepMatched = false; qz.k = Array.from(down);
      render();
    }, 2000);
    render();
  }

  function choices(c) {
    return l.shuffle([c, ...l.shuffle(progs[sel].sc.filter((s) => s.id !== c.id)).slice(0, 3)]).map((s) => `<button class="choice" data-choice-id="${s.id}">${shortcutCombo(s)}</button>`).join('');
  }

  function quizH() {
    const c = cur();
    if (!qz || !c) return resultsH();
    const steps = currentSteps();
    const entered = [...qz.entered, ...(qz.k.length ? [qz.k] : [])];
    const prompt = steps.length > 1 ? `Шаг ${Math.min(qz.step + 1, steps.length)} из ${steps.length}` : 'Удерживайте нужные клавиши';
    return `<section class="page narrow"><div class="quizTop"><button class="back" data-quit aria-label="Завершить">←</button><span>${qz.i + 1}/${qz.qs.length}</span>${timerOn ? `<b>${fmt(qz.left)}</b>` : '<b></b>'}</div><div class="quiz ${flash}" style="--c:${meta().c}"><p>${prompt}</p><h1>${esc(c.a)}</h1>${qz.mode === 'choice' ? `<div class="choices">${choices(c)}</div>` : `<div class="inputKeys">${entered.length ? answerCombo(entered) : '<span>Ожидание ввода</span>'}</div>`}<button class="skip" data-skip aria-label="Пропустить">×</button></div></section>`;
  }

  function resultsH() {
    const total = qz?.qs.length || 0, good = qz?.c || 0, bad = qz?.mistakes.length || 0, pct = total ? Math.round((good / total) * 100) : 0;
    return `<section class="page narrow"><div class="result"><h1>${pct}%</h1><p>${good} правильных ответов из ${total}</p><div class="stats"><span>Верно <b>${good}</b></span><span>Ошибки <b>${bad}</b></span><span>Категория <b>${cat === 'all' ? 'Все' : esc(cat)}</b></span></div></div>${bad ? `<div class="mistakes"><h2>Ошибки</h2>${qz.mistakes.map((m) => `<div class="mistake"><span>${esc(m.q.a)}</span><span>${m.skip ? 'Пропущено' : answerCombo(m.got)}</span><b>${shortcutCombo(m.q)}</b></div>`).join('')}</div>` : ''}<div class="actions"><button class="btn primary" data-restart>↻ Повторить</button><button class="btn" data-go="home">⌂ К программам</button></div></section>`;
  }

  function render() {
    document.querySelector('.app-header')?.remove();
    if (view === 'home') main.innerHTML = homeH();
    if (view === 'study') main.innerHTML = studyH();
    if (view === 'setup') main.innerHTML = setupH();
    if (view === 'quiz') main.innerHTML = quizH();
    if (view === 'results') main.innerHTML = resultsH();
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.go) setView(t.dataset.go);
    if (t.dataset.openList) { sel = t.dataset.openList; cat = 'all'; setView('study'); }
    if (t.dataset.openTest) { sel = t.dataset.openTest; cat = 'all'; setView('setup'); }
    if (t.dataset.cat) { cat = t.dataset.cat; cnt = clamp(cnt, shown().length); saveCfg(); render(); }
    if (t.dataset.cnt) { cnt = clamp(t.dataset.cnt, shown().length); saveCfg(); render(); }
    if (t.dataset.mode) { mode = t.dataset.mode; saveCfg(); render(); }
    if (t.dataset.timer) { timerOn = t.dataset.timer === 'on'; saveCfg(); render(); }
    if (t.dataset.time) { timerSec = Number(t.dataset.time); saveCfg(); render(); }
    if (t.hasAttribute('data-start')) start();
    if (t.hasAttribute('data-skip')) fail([], true);
    if (t.hasAttribute('data-quit') && confirm('Вы уверены, что хотите завершить тренировку?')) finish();
    if (t.hasAttribute('data-restart')) start();
    if (t.dataset.choiceId) checkChoice(t.dataset.choiceId);
  });

  document.addEventListener('input', (e) => {
    if (e.target.matches('[data-num]')) cnt = clamp(e.target.value, shown().length);
    if (e.target.matches('[data-time-num]')) timerSec = Math.max(5, Number(e.target.value) || 60);
    saveCfg();
  });

  document.addEventListener('keydown', (e) => {
    if (view !== 'quiz' || !qz || qz.mode === 'choice' || flash) return;
    const k = l.normalizeKey(e.key, e.code); if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    if (k === 'Esc') {
      const now = Date.now();
      if (now - lastEsc < 1200 && confirm('Вы уверены, что хотите завершить тренировку?')) { finish(); return; }
      lastEsc = now;
    }
    if (reset) { qz.k = []; down = new Set(); reset = false; }
    down.add(k); qz.k = Array.from(down);
    const steps = currentSteps();
    const expected = steps[qz.step] || steps[0];
    if (expected && l.compareKeySets(qz.k, expected)) {
      if (qz.step >= steps.length - 1) { pass(); return; }
      qz.stepMatched = true;
    }
    render();
  });

  document.addEventListener('keyup', (e) => {
    if (view !== 'quiz' || !qz || qz.mode === 'choice' || flash) return;
    const k = l.normalizeKey(e.key, e.code);
    down.delete(k);
    qz.k = Array.from(down);
    if (qz.stepMatched && qz.k.every((key) => modifierKeys.has(key))) { advanceChord(); return; }
    if (!down.size && qz.step === 0) reset = true;
    render();
  });

  render();
})();
