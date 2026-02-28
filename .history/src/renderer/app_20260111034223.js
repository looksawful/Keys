(function () {
  const { defaultPrograms, colorOptions } = window.hkData;
  const { normalizeKey, parseKeyCombo, compareKeySets, createQuizState, calcProgramProgress, calcAverageScore } =
    window.hkLogic;

  const STORAGE_KEYS = {
    programs: 'hk_p',
    stats: 'hk_s',
  };

  function clonePrograms() {
    return JSON.parse(JSON.stringify(defaultPrograms));
  }

  function loadPrograms() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.programs);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length) {
          return parsed;
        }
      }
    } catch (err) {
      // Ignore invalid storage entries.
    }
    return clonePrograms();
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
      // Ignore invalid storage entries.
    }
    return { h: [], t: 0, c: 0 };
  }

  let view = 'home';
  let progs = loadPrograms();
  let st = loadStats();
  let sel = Object.keys(progs)[0] || null;
  let qcfg = { d: 'all', n: 10 };
  let qz = null;
  let res = null;
  let sfil = 'all';
  let eprog = Object.keys(progs)[0] || null;
  let mdl = null;

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

  function saveState() {
    localStorage.setItem(STORAGE_KEYS.programs, JSON.stringify(progs));
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(st));
  }

  function go(v, p) {
    view = v;
    if (p) sel = p;
    render();
  }

  function prog(id) {
    return calcProgramProgress(st.h, id);
  }

  function render() {
    ensureSelectedProgram();
    ensureEditorProgram();
    document.getElementById('nav').innerHTML = `
      <button class="app-nav-link${
        view === 'home' ? ' active' : ''
      }" data-action="go" data-view="home">🏠 Главная</button>
      <button class="app-nav-link${
        view === 'editor' ? ' active' : ''
      }" data-action="go" data-view="editor">✏️ Редактор</button>
      <button class="app-nav-link${
        view === 'stats' ? ' active' : ''
      }" data-action="go" data-view="stats">📊 Статистика</button>`;
    const m = document.getElementById('main');
    if (view === 'home') m.innerHTML = homeH();
    else if (view === 'study') m.innerHTML = studyH();
    else if (view === 'setup') m.innerHTML = setupH();
    else if (view === 'quiz') m.innerHTML = quizH();
    else if (view === 'results') m.innerHTML = resultsH();
    else if (view === 'editor') m.innerHTML = editorH();
    else if (view === 'stats') m.innerHTML = statsH();
    document.getElementById('mroot').innerHTML = mdl || '';
  }

  function homeH() {
    return `<div class="page-header"><h1 class="page-title">Изучай горячие клавиши</h1><p class="page-subtitle">Выбери программу</p></div>
    <div class="grid">${Object.entries(progs)
      .map(([id, p]) => {
        const pr = prog(id);
        return `<div class="card card-interactive program-card" data-action="open-study" data-program="${id}">
        <div class="program-header"><div class="program-icon" style="background:${p.color}">${p.name[0]}</div><div class="program-name">${p.name}</div></div>
        <div class="program-meta"><span>📚 ${p.sc.length}</span><span>📈 ${pr}%</span></div>
        <div class="progress"><div class="progress-fill" style="width:${pr}%"></div></div>
        <div class="program-actions">
          <button class="btn btn-secondary btn-sm" style="flex:1" data-action="open-study" data-program="${id}">📖 Изучать</button>
          <button class="btn btn-primary btn-sm" style="flex:1" data-action="open-setup" data-program="${id}">🎯 Тест</button>
        </div></div>`;
      })
      .join('')}</div>`;
  }

  function studyH() {
    if (!sel || !progs[sel]) return '<div class="empty-state">Нет программы</div>';
    const p = progs[sel];
    const list = p.sc.filter((s) => sfil === 'all' || s.d === sfil);
    return `<div class="study-container"><div class="study-header"><button class="back-btn" data-action="go" data-view="home">← Назад</button><button class="btn btn-primary" data-action="open-setup">🎯 Тест</button></div>
    <div class="study-program"><div class="study-program-icon" style="background:${p.color}">${
      p.name[0]
    }</div><div class="study-program-info"><h2>${p.name}</h2><p>${p.sc.length} клавиш</p></div></div>
    <div class="filter-bar">
      <button class="filter-btn${
        sfil === 'all' ? ' active' : ''
      }" data-action="set-filter" data-filter="all">Все</button>
      <button class="filter-btn${
        sfil === 'easy' ? ' active' : ''
      }" data-action="set-filter" data-filter="easy">🟢 Лёгкие</button>
      <button class="filter-btn${
        sfil === 'medium' ? ' active' : ''
      }" data-action="set-filter" data-filter="medium">🟡 Средние</button>
      <button class="filter-btn${
        sfil === 'hard' ? ' active' : ''
      }" data-action="set-filter" data-filter="hard">🔴 Сложные</button>
    </div>
    <div class="shortcut-list">${list
      .map(
        (s) => `<div class="shortcut-item"><div class="shortcut-action">${s.a}</div><div class="shortcut-keys">
      ${s.k.map((k) => `<span class="key">${k}</span>`).join('<span class="key-separator">+</span>')}
      <span class="badge badge-${s.d}">${
          s.d === 'easy' ? 'Лёгкий' : s.d === 'medium' ? 'Средний' : 'Сложный'
        }</span></div></div>`,
      )
      .join('')}</div></div>`;
  }

  function setupH() {
    if (!sel || !progs[sel]) return '<div class="empty-state">Нет программы</div>';
    const p = progs[sel];
    const max = p.sc.filter((s) => qcfg.d === 'all' || s.d === qcfg.d).length;
    const baseCounts = [5, 10, 15, 20].filter((c) => c <= max);
    const counts = baseCounts.length ? baseCounts : max ? [max] : [];
    if (!counts.includes(qcfg.n)) {
      qcfg.n = counts[0] || 0;
    }
    return `<div class="setup-container"><button class="back-btn" data-action="go" data-view="home">← Назад</button>
    <div class="card setup-card">
    <h2 class="setup-title">Тест: ${p.name}</h2>
    <div class="setup-group"><label class="setup-label">Сложность</label><div class="setup-options">
      <button class="option-btn${
        qcfg.d === 'all' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="all">Все</button>
      <button class="option-btn${
        qcfg.d === 'easy' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="easy">🟢 Лёгкие</button>
      <button class="option-btn${
        qcfg.d === 'medium' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="medium">🟡 Средние</button>
      <button class="option-btn${
        qcfg.d === 'hard' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="hard">🔴 Сложные</button>
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
    }>🚀 Начать</button></div></div>`;
  }

  function quizH() {
    if (!qz || !qz.qs.length) return '<div class="empty-state">Нет вопросов</div>';
    const q = qz.qs[qz.i];
    const pct = ((qz.i + 1) / qz.qs.length) * 100;
    const kh = qz.k.length
      ? qz.k.map((k) => `<span class="quiz-input-key">${k}</span>`).join('<span class="key-separator">+</span>')
      : '<span class="quiz-input-placeholder">Нажмите клавиши...</span>';
    const cls = qz.sh ? (qz.ok ? ' correct' : ' incorrect') : '';
    return `<div class="quiz-container"><div class="quiz-progress"><div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${pct}%"></div></div><span class="quiz-progress-text">${
      qz.i + 1
    }/${qz.qs.length}</span></div>
    <div class="card quiz-card"><div class="quiz-program-name">${progs[sel].name}</div><div class="quiz-question">${
      q.a
    }</div>
    <div class="quiz-input${cls}">${kh}</div>
    ${
      qz.sh
        ? `<div class="quiz-result${qz.ok ? ' correct' : ' incorrect'}">${
            qz.ok ? '✓ Правильно!' : '✗ Неправильно'
          }</div>`
        : ''
    }
    ${qz.sh && !qz.ok ? `<div class="quiz-answer">Ответ: <strong>${q.k.join(' + ')}</strong></div>` : ''}
    <div class="quiz-actions">${
      qz.sh
        ? `<button class="btn btn-primary" data-action="next-question">${
            qz.i + 1 >= qz.qs.length ? 'Завершить' : 'Далее →'
          }</button>`
        : `<button class="btn btn-secondary" data-action="reset-answer">🔄 Сброс</button>
      <button class="btn btn-primary" data-action="check-answer"${
        qz.k.length === 0 ? ' disabled' : ''
      }>✓ Проверить</button>
      <button class="btn btn-ghost" data-action="skip-question">Пропустить →</button>`
    }</div></div></div>`;
  }

  function resultsH() {
    if (!res) return '';
    const pct = Math.round((res.c / res.t) * 100);
    const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '👍' : '💪';
    const title = pct >= 90 ? 'Отлично!' : pct >= 70 ? 'Хорошо!' : pct >= 50 ? 'Неплохо!' : 'Продолжай!';
    return `<div class="results-container"><div class="card results-card"><div class="results-emoji">${emoji}</div><h2 class="results-title">${title}</h2><div class="results-score">${pct}%</div>
    <p class="results-program">${res.n}</p><div class="results-stats">
      <div class="results-stat"><div class="results-stat-value success">${
        res.c
      }</div><div class="results-stat-label">Правильно</div></div>
      <div class="results-stat"><div class="results-stat-value error">${
        res.t - res.c
      }</div><div class="results-stat-label">Ошибок</div></div>
      <div class="results-stat"><div class="results-stat-value">${
        res.t
      }</div><div class="results-stat-label">Всего</div></div>
    </div><div class="results-actions">
      <button class="btn btn-secondary" data-action="go" data-view="home">🏠 Главная</button>
      <button class="btn btn-primary" data-action="restart-quiz">🔄 Ещё раз</button>
    </div></div></div>`;
  }

  function editorH() {
    if (!eprog || !progs[eprog]) return '<div class="empty-state">Нет программы</div>';
    const p = progs[eprog];
    return `<div class="editor-grid"><div class="editor-sidebar"><div class="editor-section-title"><span>Программы</span><button class="btn btn-primary btn-sm" data-action="show-program-modal">+ Добавить</button></div>
    <div class="editor-list">${Object.entries(progs)
      .map(
        ([id, pr]) => `<div class="editor-item${eprog === id ? ' active' : ''}" data-action="select-program" data-program="${id}">
      <span style="color:${pr.color}">${pr.name}</span><span class="editor-item-count">${pr.sc.length}</span></div>`,
      )
      .join('')}</div></div>
    <div class="editor-main"><div class="editor-section-title"><div class="editor-program-header">
      <div class="editor-program-icon" style="background:${p.color}">${p.name[0]}</div><span>${
      p.name
    }</span></div>
      <div style="display:flex;gap:.5rem"><button class="btn btn-secondary btn-sm" data-action="show-program-modal" data-program="${eprog}">✏️</button><button class="btn btn-danger btn-sm" data-action="delete-program">🗑️</button></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:1.5rem 0 1rem">
      <h3 style="color:var(--text-muted)">Клавиши (${
        p.sc.length
      })</h3><button class="btn btn-primary btn-sm" data-action="show-shortcut-modal">+ Добавить</button></div>
    <div class="editor-shortcut-list">${
      p.sc.length
        ? p.sc
            .map(
              (s) => `<div class="editor-shortcut-item"><div class="editor-shortcut-action">${s.a}<br><span class="badge badge-${s.d}">${
                s.d === 'easy' ? 'Лёгкий' : s.d === 'medium' ? 'Средний' : 'Сложный'
              }</span></div>
      <div class="editor-shortcut-keys">${s.k.join(
        ' + ',
      )}</div><div class="editor-shortcut-actions"><button class="icon-btn icon-btn-edit" data-action="show-shortcut-modal" data-shortcut="${
                s.id
              }">✏️</button><button class="icon-btn icon-btn-delete" data-action="delete-shortcut" data-shortcut="${
                s.id
              }">🗑️</button></div></div>`,
            )
            .join('')
        : '<div class="empty-state">Нет клавиш</div>'
    }</div></div></div>`;
  }

  function statsH() {
    const avg = calcAverageScore(st.h);
    const tot = Object.values(progs).reduce((sum, p) => sum + p.sc.length, 0);
    return `<div class="page-header"><h1 class="page-title">📊 Статистика</h1></div>
    <div class="stats-grid"><div class="card stats-card"><div class="stats-value">${st.t}</div><div class="stats-label">Тестов</div></div>
    <div class="card stats-card"><div class="stats-value">${st.c}</div><div class="stats-label">Правильно</div></div>
    <div class="card stats-card"><div class="stats-value">${avg}%</div><div class="stats-label">Средний %</div></div>
    <div class="card stats-card"><div class="stats-value">${tot}</div><div class="stats-label">Всего клавиш</div></div></div>
    <div class="card" style="margin-top:2rem;padding:var(--padding-xl)"><div class="history-header">
      <h3 class="history-title">История</h3>
      <div class="history-actions">
        <button class="btn btn-secondary btn-sm" data-action="reset-programs">🔄 Сбросить программы</button>
        <button class="btn btn-danger btn-sm" data-action="reset-stats">🗑️ Очистить статистику</button>
      </div>
    </div>
    ${
      st.h.length
        ? `<div class="history-list">${st.h
            .slice()
            .reverse()
            .slice(0, 20)
            .map((h) => {
              const pct = Math.round((h.c / h.t) * 100);
              return `<div class="history-item"><div class="history-item-info"><strong>${h.n}</strong><br><span class="history-item-date">${new Date(
                h.dt,
              ).toLocaleDateString('ru')}</span></div>
      <div class="history-item-result ${pct >= 70 ? 'success' : 'error'}">${h.c}/${
                h.t
              } (${pct}%)</div></div>`;
            })
            .join('')}</div>`
        : '<div class="empty-state">Нет истории</div>'
    }</div>`;
  }

  function showPM(edit) {
    const p = edit && progs[edit] ? progs[edit] : null;
    const editId = p ? edit : '';
    mdl = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" data-action="modal-body">
    <div class="modal-header"><h2 class="modal-title">${p ? 'Редактировать' : 'Новая программа'}</h2></div>
    <div class="modal-content">
    <div class="field-group"><label class="field-label">Название</label><input class="input" id="mn" value="${p ? p.name : ''}"></div>
    <div class="field-group"><label class="field-label">Цвет</label><div class="color-options">${colorOptions
      .map(
        (c) =>
          `<div class="color-option${
            p && p.color === c ? ' selected' : ''
          }" style="background:${c}" data-action="select-color" data-color="${c}"></div>`,
      )
      .join('')}</div></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal">Отмена</button><button class="btn btn-primary" data-action="save-program" data-program="${editId}">${
      p ? 'Сохранить' : 'Создать'
    }</button></div></div></div>`;
    render();
  }

  function showSM(edit) {
    if (!eprog || !progs[eprog]) return;
    const p = progs[eprog];
    const s = edit ? p.sc.find((x) => x.id === edit) : null;
    const editId = s ? s.id : 0;
    mdl = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" data-action="modal-body">
    <div class="modal-header"><h2 class="modal-title">${s ? 'Редактировать' : 'Новая клавиша'}</h2></div>
    <div class="modal-content">
    <div class="field-group"><label class="field-label">Действие</label><input class="input" id="ma" value="${s ? s.a : ''}"></div>
    <div class="field-group"><label class="field-label">Клавиши (через +)</label><input class="input" id="mk" value="${
      s ? s.k.join(' + ') : ''
    }"></div>
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
    res = null;
    go('quiz');
  }

  function handleKeydown(e) {
    // Закрыть модальное окно по Escape
    if (mdl && e.key === 'Escape') {
      mdl = null;
      render();
      return;
    }

    // Enter в модальных окнах для сохранения
    if (mdl && e.key === 'Enter') {
      const saveBtn = document.querySelector('[data-action="save-program"], [data-action="save-shortcut"]');
      if (saveBtn) {
        saveBtn.click();
        return;
      }
    }

    if (view !== 'quiz' || !qz || qz.sh) return;
    if (e.repeat) return;
    e.preventDefault();
    const key = normalizeKey(e.key);
    if (!qz.k.includes(key)) {
      qz.k.push(key);
      render();
    }
  }

  function checkQ() {
    if (!qz || !qz.qs.length) return;
    const q = qz.qs[qz.i];
    qz.ok = compareKeySets(qz.k, q.k);
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
      res = { p: sel, n: progs[sel].name, c: qz.c, t: qz.qs.length, dt: new Date().toISOString() };
      if (res.t) {
        st.h.push(res);
        st.t += 1;
        st.c += res.c;
        saveState();
      }
      go('results');
    } else {
      qz.i += 1;
      qz.k = [];
      qz.sh = false;
      qz.ok = false;
      render();
    }
  }

  function saveP(edit) {
    const name = document.getElementById('mn')?.value.trim();
    const color = document.querySelector('.copt.sel')?.dataset.color || colorOptions[0];
    if (!name) return;
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
    if (confirm('Удалить?')) {
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
    const k = parseKeyCombo(ks);
    if (!k.length) {
      alert('Некорректная комбинация клавиш');
      return;
    }
    const p = progs[eprog];
    if (!p) return;

    // Проверка на дубликаты
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
    if (confirm('Удалить?')) {
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
      mdl = null;
      render();
      return;
    }

    if (action === 'select-color') {
      document.querySelectorAll('.copt').forEach((el) => el.classList.remove('sel'));
      actionEl.classList.add('sel');
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
      case 'start-quiz':
        startQ();
        break;
      case 'reset-answer':
        if (qz) {
          qz.k = [];
          render();
        }
        break;
      case 'check-answer':
        checkQ();
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
      case 'delete-shortcut':
        delS(Number(actionEl.dataset.shortcut));
        break;
      case 'save-program':
        saveP(actionEl.dataset.program || '');
        break;
      case 'save-shortcut':
        saveS(Number(actionEl.dataset.shortcut || 0));
        break;
      case 'reset-stats':
        if (confirm('Очистить всю статистику и историю?')) {
          st = { h: [], t: 0, c: 0 };
          saveState();
          render();
        }
        break;
      case 'reset-programs':
        if (confirm('Сбросить все программы к значениям по умолчанию?')) {
          progs = clonePrograms();
          eprog = Object.keys(progs)[0] || null;
          sel = eprog;
          saveState();
          render();
        }
        break;
      default:
        break;
    }
  }

  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeydown);

  render();
})();
