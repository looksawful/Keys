(function () {
  function fatal(title, details) {
    try {
      if (typeof window.__hkFatal === 'function') {
        window.__hkFatal(title, details);
        return;
      }
    } catch {}
    // Fallback
    try {
      document.body.innerHTML = `<div style="padding:32px;font-family:system-ui,Segoe UI,Arial,sans-serif">${title}<pre>${String(
        details || '',
      )}</pre></div>`;
    } catch {}
  }

  try {
    // Проверка что все зависимости загружены
    if (!window.hkData || !window.hkLogic) {
      fatal('Ошибка загрузки модулей', `hkData=${!!window.hkData} hkLogic=${!!window.hkLogic}`);
      return;
    }

    const { defaultPrograms, colorOptions, programDocs } = window.hkData;
    const { normalizeKey, parseKeyCombo, compareKeySets, createQuizState, calcProgramProgress, calcAverageScore } =
      window.hkLogic;

    const STORAGE_KEYS = {
      programs: 'hk_p',
      stats: 'hk_s',
      onboarded: 'hk_onb',
      showShortcuts: 'hk_sh',
    };

    // Global keyboard shortcuts configuration
    // Function keys are used on purpose: Ctrl+H/Ctrl+S/etc are common training answers.
    const APP_SHORTCUTS = {
      help: { key: 'F1', desc: 'Подсказки' },
      home: { key: 'F2', desc: 'Главная' },
      editor: { key: 'F3', desc: 'Редактор' },
      stats: { key: 'F4', desc: 'Статистика' },
      quizReset: { key: 'F8', desc: 'Сбросить ответ' },
      quizSkip: { key: 'F9', desc: 'Пропустить' },
      quitQuiz: { key: 'F10', desc: 'Выйти из теста' },
    };

    function clonePrograms() {
      return JSON.parse(JSON.stringify(defaultPrograms));
    }

    function isValidDifficulty(d) {
      return d === 'easy' || d === 'medium' || d === 'hard';
    }

    function sanitizePrograms(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
      const out = {};
      for (const [id, p] of Object.entries(input)) {
        if (!p || typeof p !== 'object') continue;
        const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : null;
        const color = typeof p.color === 'string' && p.color.trim() ? p.color.trim() : '#2563eb';
        const scRaw = Array.isArray(p.sc) ? p.sc : [];
        const sc = scRaw
          .map((s) => {
            if (!s || typeof s !== 'object') return null;
            const action = typeof s.a === 'string' ? s.a.trim() : '';
            const keys = Array.isArray(s.k)
              ? s.k.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim())
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
          if (sanitized) return sanitized;
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
    let showShortcutsPanel = loadShowShortcuts();
    let showShortcutsPanelInQuiz = false;
    let showOnboarding = !localStorage.getItem(STORAGE_KEYS.onboarded);
    let onboardingStep = 0;

    function loadShowShortcuts() {
      const saved = localStorage.getItem(STORAGE_KEYS.showShortcuts);
      return saved !== 'false';
    }

    function saveShowShortcuts() {
      localStorage.setItem(STORAGE_KEYS.showShortcuts, showShortcutsPanel);
    }

    function completeOnboarding() {
      localStorage.setItem(STORAGE_KEYS.onboarded, 'true');
      showOnboarding = false;
      render();
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
      }" data-action="go" data-view="home" data-tooltip="F2">Главная</button>
      <button class="app-nav-link${
        view === 'editor' ? ' active' : ''
      }" data-action="go" data-view="editor" data-tooltip="F3">Редактор</button>
      <button class="app-nav-link${
        view === 'stats' ? ' active' : ''
      }" data-action="go" data-view="stats" data-tooltip="F4">Статистика</button>
      <button class="app-nav-link" data-action="show-help" data-tooltip="F1">?</button>`;
      const m = document.getElementById('main');
      if (view === 'home') m.innerHTML = homeH();
      else if (view === 'study') m.innerHTML = studyH();
      else if (view === 'setup') m.innerHTML = setupH();
      else if (view === 'quiz') m.innerHTML = quizH();
      else if (view === 'results') m.innerHTML = resultsH();
      else if (view === 'editor') m.innerHTML = editorH();
      else if (view === 'stats') m.innerHTML = statsH();

      // Render modals, shortcuts panel, and onboarding
      let extraUI = '';
      if (mdl) extraUI += mdl;
      {
        const showShortcutsHere = view === 'quiz' ? showShortcutsPanelInQuiz : showShortcutsPanel;
        if (showShortcutsHere && !mdl) extraUI += shortcutsHintH();
      }
      if (showOnboarding && !mdl) extraUI += onboardingH();
      document.getElementById('mroot').innerHTML = extraUI;
    }

    function shortcutsHintH() {
      return `<div class="shortcuts-hint">
      <div class="shortcuts-hint-header">
        <span class="shortcuts-hint-title">⌨️ Горячие клавиши</span>
        <button class="shortcuts-hint-close" data-action="hide-shortcuts">✕</button>
      </div>
      <div class="shortcuts-hint-list">
        <div class="shortcuts-hint-item">
          <span class="shortcuts-hint-label">Главная</span>
          <div class="shortcuts-hint-keys">
            <span class="shortcuts-hint-key">F2</span>
          </div>
        </div>
        <div class="shortcuts-hint-item">
          <span class="shortcuts-hint-label">Редактор</span>
          <div class="shortcuts-hint-keys">
            <span class="shortcuts-hint-key">F3</span>
          </div>
        </div>
        <div class="shortcuts-hint-item">
          <span class="shortcuts-hint-label">Статистика</span>
          <div class="shortcuts-hint-keys">
            <span class="shortcuts-hint-key">F4</span>
          </div>
        </div>
        <div class="shortcuts-hint-item">
          <span class="shortcuts-hint-label">Подсказки</span>
          <div class="shortcuts-hint-keys">
            <span class="shortcuts-hint-key">F1</span>
          </div>
        </div>
        <div class="shortcuts-hint-item">
          <span class="shortcuts-hint-label">Тест: проверить/далее</span>
          <div class="shortcuts-hint-keys">
            <span class="shortcuts-hint-key">F6</span>
            <span class="shortcuts-hint-key">Enter</span>
          </div>
        </div>
        <div class="shortcuts-hint-item">
          <span class="shortcuts-hint-label">Тест: удалить последний</span>
          <div class="shortcuts-hint-keys">
            <span class="shortcuts-hint-key">F7</span>
          </div>
        </div>
        <div class="shortcuts-hint-item">
          <span class="shortcuts-hint-label">Тест: сброс</span>
          <div class="shortcuts-hint-keys">
            <span class="shortcuts-hint-key">F8</span>
          </div>
        </div>
        <div class="shortcuts-hint-item">
          <span class="shortcuts-hint-label">Тест: пропуск</span>
          <div class="shortcuts-hint-keys">
            <span class="shortcuts-hint-key">F9</span>
          </div>
        </div>
        <div class="shortcuts-hint-item">
          <span class="shortcuts-hint-label">Тест: выход</span>
          <div class="shortcuts-hint-keys">
            <span class="shortcuts-hint-key">F10</span>
          </div>
        </div>
      </div>
    </div>`;
    }

    function onboardingH() {
      const steps = [
        {
          icon: '🎯',
          title: 'Добро пожаловать в keys!',
          desc: 'Изучайте горячие клавиши популярных программ в интерактивном формате.',
          features: [
            { icon: '📚', title: 'Изучение', desc: 'Просматривайте списки клавиш с фильтрацией по сложности' },
            { icon: '✍️', title: 'Тестирование', desc: 'Проверяйте знания в интерактивных тестах' },
            { icon: '📊', title: 'Статистика', desc: 'Отслеживайте прогресс и историю' },
          ],
        },
        {
          icon: '⌨️',
          title: 'Горячие клавиши приложения',
          desc: 'Управляйте приложением с помощью клавиатуры для максимальной эффективности.',
          features: [
            { icon: '🏠', title: 'F2', desc: 'Перейти на главную страницу' },
            { icon: '✏️', title: 'F3', desc: 'Открыть редактор программ' },
            { icon: '📈', title: 'F4', desc: 'Посмотреть статистику' },
          ],
        },
        {
          icon: '🚀',
          title: 'Готово!',
          desc: 'Теперь вы готовы начать изучение горячих клавиш. Выберите программу и начните!',
          features: [
            { icon: '💡', title: 'Подсказка', desc: 'Нажмите F1 для списка клавиш' },
            { icon: '📖', title: 'Документация', desc: 'Ссылки на официальные источники в карточках программ' },
            { icon: '🔧', title: 'Редактор', desc: 'Добавляйте свои программы и клавиши' },
          ],
        },
      ];
      const step = steps[onboardingStep];
      return `<div class="onboarding-overlay">
      <div class="onboarding-card">
        <div class="onboarding-icon">${step.icon}</div>
        <h2 class="onboarding-title">${step.title}</h2>
        <p class="onboarding-desc">${step.desc}</p>
        <div class="onboarding-features">
          ${step.features
            .map(
              (f) => `<div class="onboarding-feature">
              <div class="onboarding-feature-icon">${f.icon}</div>
              <div class="onboarding-feature-text">
                <h4>${f.title}</h4>
                <p>${f.desc}</p>
              </div>
            </div>`,
            )
            .join('')}
        </div>
        <div class="onboarding-progress">
          ${steps.map((_, i) => `<div class="onboarding-dot${i === onboardingStep ? ' active' : ''}"></div>`).join('')}
        </div>
        <div class="onboarding-actions">
          ${
            onboardingStep > 0 ? `<button class="btn btn-secondary" data-action="prev-onboarding">← Назад</button>` : ''
          }
          ${
            onboardingStep < steps.length - 1
              ? `<button class="btn btn-primary" data-action="next-onboarding">Далее →</button>`
              : `<button class="btn btn-primary" data-action="complete-onboarding">Начать!</button>`
          }
        </div>
      </div>
    </div>`;
    }

    function getDocsLink(programId) {
      const docs = programDocs && programDocs[programId];
      if (!docs) return '';
      return `<div class="program-docs">
      <a href="${docs.url}" target="_blank" class="docs-link" data-tooltip="Открыть официальную документацию">
        <span class="docs-link-icon">📖</span> ${docs.name}
      </a>
    </div>`;
    }

    function getStudyDocsSection(programId) {
      const docs = programDocs && programDocs[programId];
      if (!docs) return '';
      return `<div class="study-docs">
      <span class="study-docs-icon">📖</span>
      <div class="study-docs-text">
        <strong>Официальная документация</strong>
        <span>Полный список горячих клавиш и руководства</span>
      </div>
      <a href="${docs.url}" target="_blank" class="docs-link">
        Открыть ${docs.name} →
      </a>
    </div>`;
    }

    function homeH() {
      return `<div class="page-header"><h1 class="page-title">Изучай горячие клавиши</h1><p class="page-subtitle">Выбери программу для изучения или тестирования</p></div>
    <div class="grid">${Object.entries(progs)
      .map(([id, p]) => {
        const pr = prog(id);
        return `<div class="card card-interactive program-card" data-action="open-study" data-program="${id}">
        <div class="program-header"><div class="program-icon" style="background:${p.color}">${
          p.name[0]
        }</div><div class="program-name">${p.name}</div></div>
        <div class="program-meta"><span class="meta-pill" data-tooltip="Количество горячих клавиш">🔑 ${
          p.sc.length
        }</span><span class="meta-pill" data-tooltip="Ваш прогресс изучения">📊 ${pr}%</span></div>
        <div class="progress" data-tooltip="Прогресс: ${pr}%"><div class="progress-fill" style="width:${pr}%"></div></div>
        ${getDocsLink(id)}
        <div class="program-actions">
          <button class="btn btn-secondary btn-sm" style="flex:1" data-action="open-study" data-program="${id}" data-tooltip="Просмотр списка клавиш">📖 Изучать</button>
          <button class="btn btn-primary btn-sm" style="flex:1" data-action="open-setup" data-program="${id}" data-tooltip="Проверить знания">✍️ Тест</button>
        </div></div>`;
      })
      .join('')}</div>`;
    }

    function studyH() {
      if (!sel || !progs[sel])
        return '<div class="empty-state"><div class="empty-illustration">📭</div>Нет программы</div>';
      const p = progs[sel];
      const list = p.sc.filter((s) => sfil === 'all' || s.d === sfil);
      return `<div class="study-container"><div class="study-header"><button class="back-btn" data-action="go" data-view="home" data-tooltip="Esc">← Назад</button><button class="btn btn-primary" data-action="open-setup" data-tooltip="Начать тестирование">✍️ Тест</button></div>
    <div class="study-program"><div class="study-program-icon" style="background:${p.color}">${
        p.name[0]
      }</div><div class="study-program-info"><h2>${p.name}</h2><p>${p.sc.length} клавиш</p></div></div>
    ${getStudyDocsSection(sel)}
    <div class="filter-bar">
      <button class="filter-btn${
        sfil === 'all' ? ' active' : ''
      }" data-action="set-filter" data-filter="all" data-tooltip="Показать все клавиши">Все</button>
      <button class="filter-btn${
        sfil === 'easy' ? ' active' : ''
      }" data-action="set-filter" data-filter="easy" data-tooltip="Базовые клавиши"><span class="difficulty-dot difficulty-easy"></span>Лёгкие</button>
      <button class="filter-btn${
        sfil === 'medium' ? ' active' : ''
      }" data-action="set-filter" data-filter="medium" data-tooltip="Продвинутые клавиши"><span class="difficulty-dot difficulty-medium"></span>Средние</button>
      <button class="filter-btn${
        sfil === 'hard' ? ' active' : ''
      }" data-action="set-filter" data-filter="hard" data-tooltip="Профессиональные клавиши"><span class="difficulty-dot difficulty-hard"></span>Сложные</button>
    </div>
    <div class="shortcut-list">${
      list.length
        ? list
            .map(
              (s) => `<div class="shortcut-item"><div class="shortcut-action">${s.a}</div><div class="shortcut-keys">
      ${s.k.map((k) => `<span class="key">${k}</span>`).join('<span class="key-separator">+</span>')}
      <span class="badge badge-${s.d}">${
                s.d === 'easy' ? 'Лёгкий' : s.d === 'medium' ? 'Средний' : 'Сложный'
              }</span></div></div>`,
            )
            .join('')
        : '<div class="empty-state"><div class="empty-illustration">🔍</div>Нет клавиш для выбранного фильтра</div>'
    }</div></div>`;
    }

    function setupH() {
      if (!sel || !progs[sel])
        return '<div class="empty-state"><div class="empty-illustration">📭</div>Нет программы</div>';
      const p = progs[sel];
      const max = p.sc.filter((s) => qcfg.d === 'all' || s.d === qcfg.d).length;
      const baseCounts = [5, 10, 15, 20].filter((c) => c <= max);
      const counts = baseCounts.length ? baseCounts : max ? [max] : [];
      if (!counts.includes(qcfg.n)) {
        qcfg.n = counts[0] || 0;
      }
      return `<div class="setup-container"><button class="back-btn" data-action="go" data-view="home" data-tooltip="Esc">← Назад</button>
    <div class="card setup-card">
    <h2 class="setup-title">🎯 Тест: ${p.name}</h2>
    <div class="setup-group"><label class="setup-label">Сложность</label><div class="setup-options">
      <button class="option-btn${
        qcfg.d === 'all' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="all" data-tooltip="Все уровни сложности">Все</button>
      <button class="option-btn${
        qcfg.d === 'easy' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="easy" data-tooltip="Базовые команды"><span class="difficulty-dot difficulty-easy"></span>Лёгкие</button>
      <button class="option-btn${
        qcfg.d === 'medium' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="medium" data-tooltip="Продвинутые команды"><span class="difficulty-dot difficulty-medium"></span>Средние</button>
      <button class="option-btn${
        qcfg.d === 'hard' ? ' selected' : ''
      }" data-action="set-difficulty" data-difficulty="hard" data-tooltip="Экспертные команды"><span class="difficulty-dot difficulty-hard"></span>Сложные</button>
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
    } data-tooltip="Enter">🚀 Начать тест</button></div></div>`;
    }

    function quizH() {
      if (!qz || !qz.qs.length)
        return '<div class="empty-state"><div class="empty-illustration">❓</div>Нет вопросов</div>';
      const q = qz.qs[qz.i];
      const pct = ((qz.i + 1) / qz.qs.length) * 100;
      const kh = qz.k.length
        ? qz.k.map((k) => `<span class="quiz-input-key">${k}</span>`).join('<span class="key-separator">+</span>')
        : '<span class="quiz-input-placeholder">⌨️ Нажмите клавиши...</span>';
      const cls = qz.sh ? (qz.ok ? ' correct' : ' incorrect') : '';
      return `<div class="quiz-container"><div class="quiz-progress"><div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${pct}%"></div></div><span class="quiz-progress-text">${
        qz.i + 1
      }/${qz.qs.length}</span></div>
    <div class="quiz-top-actions">
      <button class="btn btn-ghost quiz-exit-btn" data-action="quit-quiz" data-tooltip="F10">⛔ Выйти</button>
    </div>
    <div class="card quiz-card"><div class="quiz-program-name">${progs[sel].name}</div><div class="quiz-question">${
        q.a
      }</div>
    <div class="quiz-input${cls}">${kh}</div>
    ${
      qz.sh
        ? `<div class="quiz-result${qz.ok ? ' correct' : ' incorrect'}">${
            qz.ok ? '✅ Правильно!' : '❌ Неправильно'
          }</div>`
        : ''
    }
    ${qz.sh && !qz.ok ? `<div class="quiz-answer">Правильный ответ: <strong>${q.k.join(' + ')}</strong></div>` : ''}
    <div class="quiz-actions">${
      qz.sh
        ? `<button class="btn btn-primary" data-action="next-question" data-tooltip="F6 / Enter">${
            qz.i + 1 >= qz.qs.length ? '🏁 Завершить' : '→ Далее'
          }</button>`
        : `<button class="btn btn-secondary" data-action="reset-answer" data-tooltip="F8">🔄 Сбросить</button>
      <button class="btn btn-primary" data-action="check-answer"${
        qz.k.length === 0 ? ' disabled' : ''
      } data-tooltip="F6 / Enter">✓ Проверить</button>
      <button class="btn btn-ghost" data-action="skip-question" data-tooltip="F9">→ Пропустить</button>`
    }</div></div></div>`;
    }

    function resultsH() {
      if (!res) return '';
      const pct = Math.round((res.c / res.t) * 100);
      const title = pct >= 90 ? '🏆 Отлично!' : pct >= 70 ? '👍 Хорошо!' : pct >= 50 ? '💪 Неплохо!' : '📚 Продолжай!';
      const emoji = pct >= 90 ? '🎉' : pct >= 70 ? '⭐' : pct >= 50 ? '👌' : '💡';
      return `<div class="results-container"><div class="card results-card">
    <div class="success-illustration">${emoji}</div>
    <div class="results-kicker">Результат</div><h2 class="results-title">${title}</h2><div class="results-score">${pct}%</div>
    <p class="results-program">${res.n}</p><div class="results-stats">
      <div class="results-stat"><div class="results-stat-value success">${
        res.c
      }</div><div class="results-stat-label">✓ Правильно</div></div>
      <div class="results-stat"><div class="results-stat-value error">${
        res.t - res.c
      }</div><div class="results-stat-label">✗ Ошибок</div></div>
      <div class="results-stat"><div class="results-stat-value">${
        res.t
      }</div><div class="results-stat-label">Всего</div></div>
    </div><div class="results-actions">
      <button class="btn btn-secondary" data-action="go" data-view="home" data-tooltip="Esc">🏠 Главная</button>
      <button class="btn btn-primary" data-action="restart-quiz" data-tooltip="Пройти тест ещё раз">🔄 Ещё раз</button>
    </div></div></div>`;
    }

    function editorH() {
      if (!eprog || !progs[eprog])
        return '<div class="empty-state"><div class="empty-illustration">📭</div>Нет программы</div>';
      const p = progs[eprog];
      return `<div class="editor-grid"><div class="editor-sidebar"><div class="editor-section-title"><span>Программы</span><button class="btn btn-primary btn-sm" data-action="show-program-modal" data-tooltip="Создать новую программу">+ Добавить</button></div>
    <div class="editor-list">${Object.entries(progs)
      .map(
        ([id, pr]) => `<div class="editor-item${
          eprog === id ? ' active' : ''
        }" data-action="select-program" data-program="${id}">
      <span style="color:${pr.color}">${pr.name}</span><span class="editor-item-count">${pr.sc.length}</span></div>`,
      )
      .join('')}</div></div>
    <div class="editor-main"><div class="editor-section-title"><div class="editor-program-header">
      <div class="editor-program-icon" style="background:${p.color}">${p.name[0]}</div><span>${p.name}</span></div>
      <div style="display:flex;gap:.5rem"><button class="btn btn-secondary btn-sm" data-action="show-program-modal" data-program="${eprog}" data-tooltip="Изменить название и цвет">✏️ Изменить</button><button class="btn btn-danger btn-sm" data-action="delete-program" data-tooltip="Удалить программу">🗑 Удалить</button></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:1.5rem 0 1rem">
      <h3 style="color:var(--text-muted)">🔑 Клавиши (${
        p.sc.length
      })</h3><button class="btn btn-primary btn-sm" data-action="show-shortcut-modal" data-tooltip="Добавить новую горячую клавишу">+ Добавить</button></div>
    <div class="editor-shortcut-list">${
      p.sc.length
        ? p.sc
            .map(
              (s) => `<div class="editor-shortcut-item"><div class="editor-shortcut-action">${
                s.a
              }<br><span class="badge badge-${s.d}">${
                s.d === 'easy' ? 'Лёгкий' : s.d === 'medium' ? 'Средний' : 'Сложный'
              }</span></div>
      <div class="editor-shortcut-keys">${s.k.join(
        ' + ',
      )}</div><div class="editor-shortcut-actions"><button class="icon-btn icon-btn-edit" data-action="show-shortcut-modal" data-shortcut="${
                s.id
              }" data-tooltip="Редактировать">✏️</button><button class="icon-btn icon-btn-delete" data-action="delete-shortcut" data-shortcut="${
                s.id
              }" data-tooltip="Удалить">🗑</button></div></div>`,
            )
            .join('')
        : '<div class="empty-state"><div class="empty-illustration">⌨️</div>Нет клавиш. Нажмите "+ Добавить" чтобы создать.</div>'
    }</div></div></div>`;
    }

    function statsH() {
      const avg = calcAverageScore(st.h);
      const tot = Object.values(progs).reduce((sum, p) => sum + p.sc.length, 0);
      return `<div class="page-header"><h1 class="page-title">📊 Статистика</h1><p class="page-subtitle">Ваш прогресс обучения</p></div>
    <div class="stats-grid"><div class="card stats-card" data-tooltip="Количество пройденных тестов"><div class="stats-value">${
      st.t
    }</div><div class="stats-label">🎯 Тестов</div></div>
    <div class="card stats-card" data-tooltip="Правильных ответов за всё время"><div class="stats-value">${
      st.c
    }</div><div class="stats-label">✓ Правильно</div></div>
    <div class="card stats-card" data-tooltip="Средний процент правильных ответов"><div class="stats-value">${avg}%</div><div class="stats-label">📈 Средний %</div></div>
    <div class="card stats-card" data-tooltip="Всего горячих клавиш в базе"><div class="stats-value">${tot}</div><div class="stats-label">⌨️ Всего клавиш</div></div></div>
    <div class="card history-card"><div class="history-header">
      <h3 class="history-title">📜 История тестов</h3>
      <div class="history-actions">
        <button class="btn btn-secondary btn-sm" data-action="reset-programs" data-tooltip="Вернуть программы к начальным значениям">🔄 Сбросить программы</button>
        <button class="btn btn-danger btn-sm" data-action="reset-stats" data-tooltip="Удалить всю историю">🗑 Очистить статистику</button>
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
              return `<div class="history-item"><div class="history-item-info"><strong>${
                h.n
              }</strong><br><span class="history-item-date">📅 ${new Date(h.dt).toLocaleDateString('ru')}</span></div>
      <div class="history-item-result ${pct >= 70 ? 'success' : 'error'}">${h.c}/${h.t} (${pct}%)</div></div>`;
            })
            .join('')}</div>`
        : '<div class="empty-state"><div class="empty-illustration">📭</div>История пуста. Пройдите первый тест!</div>'
    }</div>`;
    }

    function showPM(edit) {
      const p = edit && progs[edit] ? progs[edit] : null;
      const editId = p ? edit : '';
      mdl = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" data-action="modal-body">
    <div class="modal-header"><h2 class="modal-title">${p ? 'Редактировать' : 'Новая программа'}</h2></div>
    <div class="modal-content">
    <div class="field-group"><label class="field-label">Название</label><input class="input" id="mn" value="${
      p ? p.name : ''
    }"></div>
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
    <div class="field-group"><label class="field-label">Действие</label><input class="input" id="ma" value="${
      s ? s.a : ''
    }"></div>
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
      const keyRaw = e.key;
      const inQuiz = view === 'quiz' && !!qz;

      // Закрыть онбординг по Escape
      if (showOnboarding && keyRaw === 'Escape') {
        completeOnboarding();
        return;
      }

      // Закрыть модальное окно по Escape
      if (mdl && keyRaw === 'Escape') {
        mdl = null;
        render();
        return;
      }

      // Enter в модальных окнах для сохранения
      if (mdl && keyRaw === 'Enter') {
        const saveBtn = document.querySelector('[data-action="save-program"], [data-action="save-shortcut"]');
        if (saveBtn) {
          saveBtn.click();
          return;
        }
      }

      // App shortcuts (function keys to avoid collisions with training answers)
      if (!mdl && !showOnboarding) {
        // F1 - Toggle shortcuts panel
        if (keyRaw === 'F1') {
          e.preventDefault();
          if (inQuiz) {
            showShortcutsPanelInQuiz = !showShortcutsPanelInQuiz;
          } else {
            showShortcutsPanel = !showShortcutsPanel;
            saveShowShortcuts();
          }
          render();
          return;
        }
        // F2 - Home
        if (keyRaw === 'F2') {
          e.preventDefault();
          go('home');
          return;
        }
        // F3 - Editor
        if (keyRaw === 'F3') {
          e.preventDefault();
          go('editor');
          return;
        }
        // F4 - Stats
        if (keyRaw === 'F4') {
          e.preventDefault();
          go('stats');
          return;
        }

        // Enter in setup - start quiz
        if (!inQuiz && view === 'setup' && keyRaw === 'Enter') {
          e.preventDefault();
          startQ();
          return;
        }

        // Escape - Go back (but NOT in quiz; Esc is a valid answer key)
        if (!inQuiz && keyRaw === 'Escape' && (view === 'study' || view === 'setup' || view === 'results')) {
          e.preventDefault();
          go('home');
          return;
        }
      }

      // Quiz controls (do not pollute answer buffer)
      if (!mdl && !showOnboarding && inQuiz && qz) {
        if (e.repeat) return;

        const expected = qz.qs && qz.qs[qz.i] && Array.isArray(qz.qs[qz.i].k) ? qz.qs[qz.i].k : [];
        const expectedLower = expected.map((k) => String(k).toLowerCase());
        const enterIsAnswer = expectedLower.includes('enter');

        // F10 - quit quiz (Esc must remain available as an answer)
        if (keyRaw === 'F10') {
          e.preventDefault();
          if (confirm('Выйти из теста? Прогресс будет потерян.')) {
            qz = null;
            go('home');
          }
          return;
        }

        // F6 - check/next (always available)
        if (keyRaw === 'F6') {
          e.preventDefault();
          if (qz.sh) nextQ();
          else if (qz.k.length > 0) checkQ();
          return;
        }

        // Enter - check/next (only if Enter is NOT a valid answer key for this question)
        if (keyRaw === 'Enter' && !enterIsAnswer) {
          e.preventDefault();
          if (qz.sh) nextQ();
          else if (qz.k.length > 0) checkQ();
          return;
        }

        // F9 - skip
        if (keyRaw === 'F9') {
          e.preventDefault();
          skipQ();
          return;
        }

        // F8 - reset answer
        if (keyRaw === 'F8') {
          e.preventDefault();
          qz.k = [];
          render();
          return;
        }

        // F7 - remove last key
        if (keyRaw === 'F7') {
          e.preventDefault();
          qz.k.pop();
          render();
          return;
        }
      }

      // Quiz key input
      if (view !== 'quiz' || !qz || qz.sh) return;
      if (e.repeat) return;

      // Do not capture function keys and navigation keys
      if (typeof keyRaw === 'string' && /^F\d{1,2}$/.test(keyRaw)) return;
      if (keyRaw === 'Tab') return;

      e.preventDefault();
      const key = normalizeKey(keyRaw);
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
      const color = document.querySelector('.color-option.selected')?.dataset.color || colorOptions[0];
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
        case 'hide-shortcuts':
          if (view === 'quiz') {
            showShortcutsPanelInQuiz = false;
          } else {
            showShortcutsPanel = false;
            saveShowShortcuts();
          }
          render();
          break;
        case 'show-help':
          if (view === 'quiz') {
            showShortcutsPanelInQuiz = !showShortcutsPanelInQuiz;
          } else {
            showShortcutsPanel = !showShortcutsPanel;
            saveShowShortcuts();
          }
          render();
          break;
        case 'next-onboarding':
          onboardingStep++;
          render();
          break;
        case 'prev-onboarding':
          onboardingStep = Math.max(0, onboardingStep - 1);
          render();
          break;
        case 'complete-onboarding':
          completeOnboarding();
          break;
        default:
          break;
      }
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);

    render();
  } catch (err) {
    fatal('Ошибка запуска приложения', err && (err.stack || err.message || String(err)));
  }
})();

