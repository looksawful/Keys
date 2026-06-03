(function () {
  const d = window.hkData;
  const l = window.hkLogic;
  if (!d || !l) {
    document.body.textContent = 'Ошибка загрузки приложения';
    return;
  }

  const $ = (s) => document.querySelector(s);
  const main = $('#main');
  const nav = $('#nav');
  const progs = d.defaultPrograms;
  const ids = Object.keys(progs);
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const combo = (a) => a.map((k) => `<span class="key">${esc(k)}</span>`).join('');
  const txtCombo = (a) => a.join(' + ');
  const cfgKey = 'hk_browser_cfg';
  const readCfg = () => {
    try {
      return JSON.parse(localStorage.getItem(cfgKey)) || {};
    } catch {
      return {};
    }
  };
  const saveCfg = () => localStorage.setItem(cfgKey, JSON.stringify({ dif, cnt, mode }));
  const clamp = (n, max) => Math.max(1, Math.min(Number(n) || 1, max || 1));
  const cfg = readCfg();
  let view = 'home';
  let sel = ids[0];
  let dif = ['all', 'easy', 'medium', 'hard'].includes(cfg.dif) ? cfg.dif : 'all';
  let cnt = Number.isFinite(cfg.cnt) ? cfg.cnt : 10;
  let mode = cfg.mode === 'choice' ? 'choice' : 'input';
  let qz = null;
  let down = new Set();
  let reset = false;

  function shortcuts(id = sel) {
    const p = progs[id];
    if (!p) return [];
    return dif === 'all' ? p.sc.slice() : p.sc.filter((x) => x.d === dif);
  }

  function setView(v) {
    view = v;
    render();
  }

  function navH() {
    nav.innerHTML = [
      ['home', 'Программы'],
      ['study', 'Клавиши'],
      ['setup', 'Тест'],
    ]
      .map(([v, t]) => `<button class="nav-btn${view === v ? ' active' : ''}" data-go="${v}">${t}</button>`)
      .join('');
  }

  function homeH() {
    return `<section class="page">
      <div class="head"><h1>Тренировка горячих клавиш</h1><p>Выбери программу, посмотри список или запусти тест.</p></div>
      <div class="grid">${ids
        .map((id) => {
          const p = progs[id];
          return `<article class="card">
            <button class="prog" data-pick="${id}">
              <span class="dot" style="--c:${esc(p.color)}">${esc(p.name[0])}</span>
              <span><b>${esc(p.name)}</b><small>${p.sc.length} клавиш</small></span>
            </button>
            <div class="row">
              <button class="btn" data-open-list="${id}">Клавиши</button>
              <button class="btn primary" data-open-test="${id}">Тест</button>
            </div>
          </article>`;
        })
        .join('')}</div>
    </section>`;
  }

  function studyH() {
    const p = progs[sel];
    return `<section class="page">
      <div class="bar"><button class="btn" data-go="home">Назад</button><button class="btn primary" data-go="setup">Тест</button></div>
      <div class="head"><h1>${esc(p.name)}</h1><p>${p.sc.length} горячих клавиш</p></div>
      <div class="filters">${difBtns()}</div>
      <div class="list">${shortcuts()
        .map((s) => `<div class="item"><span>${esc(s.a)}</span><span class="keys">${combo(s.k)}</span></div>`)
        .join('')}</div>
    </section>`;
  }

  function difBtns() {
    return [
      ['all', 'Все'],
      ['easy', 'Лёгкие'],
      ['medium', 'Средние'],
      ['hard', 'Сложные'],
    ]
      .map(([v, t]) => `<button class="chip${dif === v ? ' active' : ''}" data-dif="${v}">${t}</button>`)
      .join('');
  }

  function countBtns(max) {
    return [5, 10, 15, 20, max]
      .filter((x, i, a) => x > 0 && x <= max && a.indexOf(x) === i)
      .map((n) => `<button class="chip${cnt === n ? ' active' : ''}" data-cnt="${n}">${n}</button>`)
      .join('');
  }

  function setupH() {
    const p = progs[sel];
    const max = shortcuts().length;
    cnt = clamp(cnt, max);
    saveCfg();
    return `<section class="page narrow">
      <div class="bar"><button class="btn" data-go="home">Назад</button><button class="btn" data-go="study">Клавиши</button></div>
      <div class="head"><h1>Тест: ${esc(p.name)}</h1><p>Настройки влияют только на текущую проверку.</p></div>
      <div class="panel">
        <label>Сложность</label><div class="filters">${difBtns()}</div>
        <label>Количество</label><div class="filters">${countBtns(max)}<input class="num" type="number" min="1" max="${max}" value="${cnt}" data-num></div>
        <label>Режим</label><div class="filters">
          <button class="chip${mode === 'input' ? ' active' : ''}" data-mode="input">Ввод с клавиатуры</button>
          <button class="chip${mode === 'choice' ? ' active' : ''}" data-mode="choice">Выбор ответа</button>
        </div>
        <button class="btn primary wide" data-start ${max ? '' : 'disabled'}>Начать</button>
      </div>
    </section>`;
  }

  function start() {
    const qs = shortcuts();
    qz = l.createQuizState(qs, { difficulty: 'all', count: clamp(cnt, qs.length) });
    qz.mode = mode;
    down = new Set();
    reset = false;
    setView('quiz');
  }

  function cur() {
    return qz?.qs[qz.i];
  }

  function choices(c) {
    const pool = l.shuffle(progs[sel].sc.filter((s) => s.id !== c.id)).slice(0, 3);
    return l.shuffle([c, ...pool])
      .map((s) => `<button class="choice" data-choice="${esc(txtCombo(s.k))}">${combo(s.k)}</button>`)
      .join('');
  }

  function quizH() {
    const c = cur();
    if (!qz || !c) return resultsH();
    const ok = qz.sh ? (qz.ok ? 'ok' : 'bad') : '';
    return `<section class="page narrow">
      <div class="bar"><button class="btn" data-quit>Выйти</button><span>${qz.i + 1}/${qz.qs.length}</span></div>
      <div class="quiz ${ok}">
        <p>Что нажать для действия:</p>
        <h1>${esc(c.a)}</h1>
        ${
          qz.mode === 'choice'
            ? `<div class="choices">${choices(c)}</div>`
            : `<div class="inputKeys">${qz.k.length ? combo(qz.k) : '<span>Нажми сочетание клавиш</span>'}</div>`
        }
        ${qz.sh ? `<div class="answer">Верно: <b>${combo(c.k)}</b></div>` : ''}
        <div class="row">
          <button class="btn" data-skip>Пропустить</button>
          <button class="btn primary" data-next>${qz.sh ? 'Дальше' : 'Проверить'}</button>
        </div>
      </div>
    </section>`;
  }

  function resultsH() {
    const total = qz?.qs.length || 0;
    const good = qz?.c || 0;
    return `<section class="page narrow">
      <div class="head"><h1>Результат</h1><p>${good}/${total} правильных ответов</p></div>
      <div class="panel"><button class="btn primary wide" data-restart>Повторить</button><button class="btn wide" data-go="home">К программам</button></div>
    </section>`;
  }

  function check(keys) {
    if (!qz || qz.sh) return;
    qz.k = keys.slice();
    qz.ok = l.compareKeySets(qz.k, cur().k);
    if (qz.ok) qz.c += 1;
    qz.sh = true;
    render();
  }

  function next() {
    if (!qz) return;
    if (!qz.sh) {
      check(qz.k || []);
      return;
    }
    qz.i += 1;
    qz.k = [];
    qz.sh = false;
    qz.ok = false;
    down = new Set();
    reset = false;
    view = qz.i >= qz.qs.length ? 'results' : 'quiz';
    render();
  }

  function render() {
    navH();
    if (view === 'home') main.innerHTML = homeH();
    if (view === 'study') main.innerHTML = studyH();
    if (view === 'setup') main.innerHTML = setupH();
    if (view === 'quiz') main.innerHTML = quizH();
    if (view === 'results') main.innerHTML = resultsH();
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.go) setView(t.dataset.go);
    if (t.dataset.pick) {
      sel = t.dataset.pick;
      setView('study');
    }
    if (t.dataset.openList) {
      sel = t.dataset.openList;
      setView('study');
    }
    if (t.dataset.openTest) {
      sel = t.dataset.openTest;
      setView('setup');
    }
    if (t.dataset.dif) {
      dif = t.dataset.dif;
      cnt = clamp(cnt, shortcuts().length);
      saveCfg();
      render();
    }
    if (t.dataset.cnt) {
      cnt = clamp(t.dataset.cnt, shortcuts().length);
      saveCfg();
      render();
    }
    if (t.dataset.mode) {
      mode = t.dataset.mode;
      saveCfg();
      render();
    }
    if (t.hasAttribute('data-start')) start();
    if (t.hasAttribute('data-next')) next();
    if (t.hasAttribute('data-skip')) {
      qz.sh = true;
      qz.ok = false;
      qz.k = [];
      render();
    }
    if (t.hasAttribute('data-quit')) setView('setup');
    if (t.hasAttribute('data-restart')) start();
    if (t.dataset.choice) check(t.dataset.choice.split(' + '));
  });

  document.addEventListener('input', (e) => {
    if (!e.target.matches('[data-num]')) return;
    cnt = clamp(e.target.value, shortcuts().length);
    saveCfg();
  });

  document.addEventListener('keydown', (e) => {
    if (view !== 'quiz' || !qz || qz.sh || qz.mode === 'choice') return;
    const k = l.normalizeKey(e.key, e.code);
    if (!k) return;
    e.preventDefault();
    if (reset) {
      qz.k = [];
      down = new Set();
      reset = false;
    }
    down.add(k);
    qz.k = Array.from(down);
    render();
  });

  document.addEventListener('keyup', (e) => {
    if (view !== 'quiz' || !qz || qz.sh || qz.mode === 'choice') return;
    const k = l.normalizeKey(e.key, e.code);
    down.delete(k);
    if (!down.size && qz.k.length) reset = true;
  });

  render();
})();
