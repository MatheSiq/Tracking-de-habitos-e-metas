/**
 * METAS 2027 — MAIN UI CONTROLLER
 */

(function () {
  const store = window.store;
  const {
    exportHtmlBackup,
    exportPdfReport,
    importHtmlBackupFile,
    MONTH_NAMES_PT
  } = window.BackupManager;

  const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const WEEKDAYS_FULL = [
    'DOMINGO',
    'SEGUNDA-FEIRA',
    'TERÇA-FEIRA',
    'QUARTA-FEIRA',
    'QUINTA-FEIRA',
    'SEXTA-FEIRA',
    'SÁBADO'
  ];

  let activeView = 'goals';
  let activeAreaFilter = 'all';
  let activeNoteDateKey = null;
  let noteSaveTimer = null;

  // DOM Elements
  const segBtns = document.querySelectorAll('.seg-btn');
  const views = {
    goals: document.getElementById('view-goals'),
    tracker: document.getElementById('view-tracker'),
    notes: document.getElementById('view-notes')
  };

  // KPI Elements
  const kpiAreas = document.getElementById('kpi-areas');
  const kpiGoals = document.getElementById('kpi-goals');
  const kpiActivities = document.getElementById('kpi-activities');
  const kpiCompletion = document.getElementById('kpi-completion');
  const kpiChecksCount = document.getElementById('kpi-checks-count');
  const kpiCompletionBar = document.getElementById('kpi-completion-bar');

  // Goals View Elements
  const areasContainer = document.getElementById('areas-container');
  const btnNewArea = document.getElementById('btn-new-area');
  const btnResetDemo = document.getElementById('btn-reset-demo');

  // Tracker View Elements
  const trackerAreaFilter = document.getElementById('tracker-area-filter');
  const trackerMonthLabel = document.getElementById('tracker-month-label');
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  const trackerThead = document.getElementById('tracker-thead');
  const trackerTbody = document.getElementById('tracker-tbody');

  // Notes View & Drawer Elements
  const notesGallery = document.getElementById('notes-gallery');
  const btnNewNoteToday = document.getElementById('btn-new-note-today');
  const noteDrawer = document.getElementById('note-drawer');
  const noteDrawerBackdrop = document.getElementById('note-drawer-backdrop');
  const noteDrawerWeekday = document.getElementById('note-drawer-weekday');
  const noteDrawerDate = document.getElementById('note-drawer-date');
  const noteDayHabits = document.getElementById('note-day-habits');
  const noteEditor = document.getElementById('note-editor');
  const noteSaveStatus = document.getElementById('note-save-status');
  const noteWordCount = document.getElementById('note-word-count');
  const btnCloseNoteDrawer = document.getElementById('btn-close-note-drawer');
  const btnDeleteNote = document.getElementById('btn-delete-note');
  const btnNotePrevDay = document.getElementById('btn-note-prev-day');
  const btnNoteNextDay = document.getElementById('btn-note-next-day');
  const btnInsertChecklist = document.getElementById('btn-insert-checklist');

  // Backup & Theme Buttons
  const btnImportHtml = document.getElementById('btn-import-html');
  const importHtmlInput = document.getElementById('import-html-input');
  const btnExportHtml = document.getElementById('btn-export-html');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');

  // Modal Elements
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalForm = document.getElementById('modal-form');
  const btnModalClose = document.getElementById('btn-modal-close');

  // ==========================================
  // UTILITIES
  // ==========================================
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3200);
  }

  function makeDateKey(year, monthIndex, day) {
    const m = String(monthIndex + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  function parseDateKey(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }

  // ==========================================
  // NAVIGATION & THEME
  // ==========================================
  function switchView(viewName) {
    activeView = viewName;
    segBtns.forEach(btn => {
      const isMatch = btn.dataset.view === viewName;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });
    Object.keys(views).forEach(key => {
      views[key].classList.toggle('active', key === viewName);
    });
    renderAll();
  }

  segBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Theme Initialization
  const savedTheme = localStorage.getItem('metas_2027_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  btnThemeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('metas_2027_theme', next);
  });

  // ==========================================
  // KPI SUMMARY STRIP
  // ==========================================
  function renderKPIs() {
    const state = store.state;
    const totalAreas = state.areas.length;
    let totalGoals = 0;
    let totalActivities = 0;

    state.areas.forEach(a => {
      totalGoals += a.goals.length;
      a.goals.forEach(g => {
        totalActivities += g.activities.length;
      });
    });

    const { year, month } = state.currentMonth || { year: 2027, month: 0 };
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const allActs = store.getAllActivities();
    const validIds = new Set(allActs.map(a => a.id));

    let monthChecks = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = makeDateKey(year, month, d);
      const dayList = state.checks[dk] || [];
      dayList.forEach(id => {
        if (validIds.has(id)) monthChecks++;
      });
    }

    const totalPossible = totalActivities * daysInMonth;
    const pct = totalPossible > 0 ? Math.round((monthChecks / totalPossible) * 100) : 0;

    kpiAreas.textContent = totalAreas;
    kpiGoals.textContent = totalGoals;
    kpiActivities.textContent = totalActivities;
    kpiCompletion.textContent = `${pct}%`;
    kpiChecksCount.textContent = `${monthChecks} check-ins em ${MONTH_NAMES_PT[month]}`;
    kpiCompletionBar.style.width = `${Math.min(100, pct)}%`;
  }

  // ==========================================
  // VIEW 1: HIERARCHICAL GOALS RENDERING
  // ==========================================
  function renderGoalsView() {
    const { areas } = store.state;

    if (areas.length === 0) {
      areasContainer.innerHTML = `
        <div class="empty-state">
          <h3>Comece estruturando suas Áreas da Vida para 2027</h3>
          <p>Crie categorias como "Minha Saúde", "Vida Profissional" ou "Finanças" ou restaure um arquivo HTML de backup.</p>
        </div>
      `;
      return;
    }

    areasContainer.innerHTML = areas.map(area => {
      const goalsCount = area.goals.length;
      const goalsHtml = area.goals.length === 0
        ? `<p class="form-hint" style="padding:0.25rem 0">Nenhuma meta cadastrada nesta área ainda.</p>`
        : area.goals.map(goal => {
            const activitiesHtml = goal.activities.map(act => `
              <div class="activity-item">
                <div class="activity-left">
                  <span class="tag-pill" style="background:${area.color}18;color:${area.color};border:1px solid ${area.color}35">${escapeHtml(act.tag)}</span>
                  <span class="activity-name" title="${escapeHtml(act.name)}">${escapeHtml(act.name)}</span>
                </div>
                <div class="card-actions">
                  <button type="button" class="icon-btn-sm" data-action="edit-activity" data-area="${area.id}" data-goal="${goal.id}" data-act="${act.id}" title="Editar atividade e tag">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                  <button type="button" class="icon-btn-sm danger" data-action="delete-activity" data-area="${area.id}" data-goal="${goal.id}" data-act="${act.id}" title="Remover atividade">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>
            `).join('');

            return `
              <div class="goal-block">
                <div class="goal-header">
                  <div>
                    <div class="goal-title">${escapeHtml(goal.title)}</div>
                    ${goal.description ? `<div class="goal-desc">${escapeHtml(goal.description)}</div>` : ''}
                  </div>
                  <div class="card-actions">
                    <button type="button" class="icon-btn-sm" data-action="edit-goal" data-area="${area.id}" data-goal="${goal.id}" title="Editar meta">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button type="button" class="icon-btn-sm danger" data-action="delete-goal" data-area="${area.id}" data-goal="${goal.id}" title="Excluir meta">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>

                <div class="activities-list">
                  ${activitiesHtml}
                </div>

                <button type="button" class="btn-inline-add" data-action="add-activity" data-area="${area.id}" data-goal="${goal.id}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span>Adicionar Atividade + Tag</span>
                </button>
              </div>
            `;
          }).join('');

      return `
        <article class="area-card">
          <header class="area-header">
            <div class="area-title-group">
              <span class="area-swatch" style="background:${escapeHtml(area.color)}"></span>
              <h2 class="area-name">${escapeHtml(area.name)}</h2>
              <span class="area-count-badge">${goalsCount} ${goalsCount === 1 ? 'meta' : 'metas'}</span>
            </div>
            <div class="card-actions">
              <button type="button" class="icon-btn-sm" data-action="edit-area" data-area="${area.id}" title="Editar Área">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
              <button type="button" class="icon-btn-sm danger" data-action="delete-area" data-area="${area.id}" title="Excluir Área">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </header>

          <div class="area-body">
            ${goalsHtml}
          </div>

          <footer class="area-footer">
            <button type="button" class="btn-add-goal" data-action="add-goal" data-area="${area.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Nova Meta em ${escapeHtml(area.name)}</span>
            </button>
          </footer>
        </article>
      `;
    }).join('');
  }

  // Event delegation for Hierarchical Goals cards
  areasContainer.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const areaId = btn.dataset.area;
    const goalId = btn.dataset.goal;
    const actId = btn.dataset.act;

    if (action === 'edit-area') openAreaModal(areaId);
    if (action === 'delete-area') {
      const area = store.state.areas.find(a => a.id === areaId);
      if (area && confirm(`Excluir a área "${area.name}" e todas as suas metas?`)) {
        store.deleteArea(areaId);
        showToast('Área removida');
      }
    }
    if (action === 'add-goal') openGoalModal(areaId);
    if (action === 'edit-goal') openGoalModal(areaId, goalId);
    if (action === 'delete-goal') {
      if (confirm('Excluir esta meta e suas atividades?')) {
        store.deleteGoal(areaId, goalId);
        showToast('Meta removida');
      }
    }
    if (action === 'add-activity') openActivityModal(areaId, goalId);
    if (action === 'edit-activity') openActivityModal(areaId, goalId, actId);
    if (action === 'delete-activity') {
      store.deleteActivity(areaId, goalId, actId);
      showToast('Atividade removida');
    }
  });

  // ==========================================
  // VIEW 2: MONTHLY TRACKER RENDERING
  // ==========================================
  function renderTrackerFilterOptions() {
    const areas = store.state.areas;
    const prevValue = activeAreaFilter;
    trackerAreaFilter.innerHTML = `<option value="all">Todas as Áreas (${areas.length})</option>` +
      areas.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
    if (areas.some(a => a.id === prevValue)) {
      trackerAreaFilter.value = prevValue;
    } else {
      activeAreaFilter = 'all';
      trackerAreaFilter.value = 'all';
    }
  }

  function renderTrackerView() {
    renderTrackerFilterOptions();

    const { year, month } = store.state.currentMonth || { year: 2027, month: 0 };
    trackerMonthLabel.textContent = `${MONTH_NAMES_PT[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const activities = store.getAllActivities(activeAreaFilter);

    const now = new Date();
    const todayKey = makeDateKey(now.getFullYear(), now.getMonth(), now.getDate());

    // Build Table Head with clickable day numbers
    let headCells = `<th class="col-habit">Hábito / Tag Identificadora</th>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const weekdayShort = WEEKDAYS_SHORT[dateObj.getDay()];
      const dateKey = makeDateKey(year, month, d);
      const hasNote = store.hasNote(dateKey);
      const isToday = dateKey === todayKey;

      headCells += `
        <th class="day-th">
          <button
            type="button"
            class="day-header-btn ${hasNote ? 'has-note' : ''} ${isToday ? 'is-today' : ''}"
            data-date="${dateKey}"
            title="Clique para abrir a nota do dia ${d} de ${MONTH_NAMES_PT[month]}"
          >
            <span class="day-weekday">${weekdayShort}</span>
            <span class="day-num">${d}</span>
            <span class="day-note-dot"></span>
          </button>
        </th>
      `;
    }
    headCells += `<th class="col-summary">Mês</th>`;
    trackerThead.innerHTML = `<tr>${headCells}</tr>`;

    // Build Table Body with dynamic Tag rows
    if (activities.length === 0) {
      trackerTbody.innerHTML = `
        <tr>
          <td colspan="${daysInMonth + 2}" style="padding:2.5rem;text-align:center;color:var(--text-secondary)">
            Nenhuma atividade encontrada. Adicione atividades com Tags Identificadoras na aba <strong>Metas &amp; Áreas</strong>.
          </td>
        </tr>
      `;
      return;
    }

    trackerTbody.innerHTML = activities.map(act => {
      let rowCells = '';
      let completedCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const dateKey = makeDateKey(year, month, d);
        const checked = store.isChecked(dateKey, act.id);
        if (checked) completedCount++;

        rowCells += `
          <td class="check-td ${isWeekend ? 'weekend-col' : ''}">
            <button
              type="button"
              class="check-btn ${checked ? 'checked' : ''}"
              style="--habit-color: ${escapeHtml(act.areaColor)}"
              data-check-date="${dateKey}"
              data-check-act="${act.id}"
              aria-label="${escapeHtml(act.tag)} dia ${d}"
              aria-pressed="${checked ? 'true' : 'false'}"
            >
              <span class="check-box">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            </button>
          </td>
        `;
      }

      const pct = Math.round((completedCount / daysInMonth) * 100);

      return `
        <tr>
          <td class="col-habit">
            <div class="habit-cell-inner">
              <div class="habit-tag-row">
                <span class="tag-pill" style="background:${act.areaColor}18;color:${act.areaColor};border:1px solid ${act.areaColor}35">${escapeHtml(act.tag)}</span>
              </div>
              <span class="habit-subname" title="${escapeHtml(act.name)} — Meta: ${escapeHtml(act.goalTitle)}">${escapeHtml(act.name)}</span>
            </div>
          </td>
          ${rowCells}
          <td class="col-summary">${completedCount}/${daysInMonth} (${pct}%)</td>
        </tr>
      `;
    }).join('');
  }

  // Click on Day Number Header -> Open Daily Note Drawer
  trackerThead.addEventListener('click', e => {
    const dayBtn = e.target.closest('.day-header-btn');
    if (!dayBtn) return;
    openNoteDrawer(dayBtn.dataset.date);
  });

  // Click on Habit Cell -> Toggle Completion
  trackerTbody.addEventListener('click', e => {
    const checkBtn = e.target.closest('.check-btn');
    if (!checkBtn) return;
    const dateKey = checkBtn.dataset.checkDate;
    const actId = checkBtn.dataset.checkAct;
    store.toggleCheck(dateKey, actId);
  });

  trackerAreaFilter.addEventListener('change', e => {
    activeAreaFilter = e.target.value;
    renderTrackerView();
  });

  btnPrevMonth.addEventListener('click', () => {
    let { year, month } = store.state.currentMonth;
    month--;
    if (month < 0) {
      month = 11;
      year--;
    }
    store.setMonth(year, month);
  });

  btnNextMonth.addEventListener('click', () => {
    let { year, month } = store.state.currentMonth;
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
    store.setMonth(year, month);
  });

  // ==========================================
  // VIEW 3: NOTES GALLERY (CADERNO DE NOTAS)
  // ==========================================
  function renderNotesGallery() {
    const notesMap = store.state.notes || {};
    const dates = Object.keys(notesMap)
      .filter(dk => store.hasNote(dk))
      .sort((a, b) => b.localeCompare(a));

    if (dates.length === 0) {
      notesGallery.innerHTML = `
        <div class="empty-state">
          <h3>Seu Caderno de Notas está vazio</h3>
          <p>No <strong>Tracker Mensal</strong>, clique no número de qualquer dia no topo da tabela para escrever sua nota diária.</p>
        </div>
      `;
      return;
    }

    const allActs = store.getAllActivities();

    notesGallery.innerHTML = dates.map(dateKey => {
      const { year, month, day } = parseDateKey(dateKey);
      const dateObj = new Date(year, month, day);
      const weekday = WEEKDAYS_FULL[dateObj.getDay()];
      const html = store.getNote(dateKey);
      const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const checksCount = (store.state.checks[dateKey] || []).filter(id =>
        allActs.some(a => a.id === id)
      ).length;

      return `
        <article class="note-card" data-open-note="${dateKey}">
          <div>
            <div class="note-card-date">${weekday} • ${day} DE ${MONTH_NAMES_PT[month].toUpperCase()} ${year}</div>
            <div class="note-card-preview">${escapeHtml(plainText)}</div>
          </div>
          <div class="note-card-footer">
            <span>${checksCount} ${checksCount === 1 ? 'hábito concluído' : 'hábitos concluídos'}</span>
            <span>Abrir nota →</span>
          </div>
        </article>
      `;
    }).join('');
  }

  notesGallery.addEventListener('click', e => {
    const card = e.target.closest('[data-open-note]');
    if (!card) return;
    openNoteDrawer(card.dataset.openNote);
  });

  btnNewNoteToday.addEventListener('click', () => {
    const { year, month } = store.state.currentMonth || { year: 2027, month: 0 };
    openNoteDrawer(makeDateKey(year, month, 1));
  });

  // ==========================================
  // APPLE NOTES SLIDE-OVER EDITOR
  // ==========================================
  function openNoteDrawer(dateKey) {
    activeNoteDateKey = dateKey;
    const { year, month, day } = parseDateKey(dateKey);
    const dateObj = new Date(year, month, day);

    noteDrawerWeekday.textContent = WEEKDAYS_FULL[dateObj.getDay()];
    noteDrawerDate.textContent = `${day} de ${MONTH_NAMES_PT[month]} de ${year}`;

    // Render habits completed on this day
    const allActs = store.getAllActivities();
    const checkedIds = store.state.checks[dateKey] || [];
    const doneActs = allActs.filter(a => checkedIds.includes(a.id));

    if (doneActs.length === 0) {
      noteDayHabits.innerHTML = `<span class="note-day-habits-label">Nenhum hábito marcado neste dia ainda.</span>`;
    } else {
      noteDayHabits.innerHTML =
        `<span class="note-day-habits-label">Concluídos no dia:</span>` +
        doneActs
          .map(
            a =>
              `<span class="tag-pill" style="background:${a.areaColor}18;color:${a.areaColor};font-size:0.66rem;padding:0.12rem 0.45rem">${escapeHtml(a.tag)}</span>`
          )
          .join('');
    }

    noteEditor.innerHTML = store.getNote(dateKey);
    updateNoteWordCount();
    noteSaveStatus.textContent = 'Salvo';

    noteDrawerBackdrop.hidden = false;
    noteDrawer.classList.add('open');
    noteDrawer.setAttribute('aria-hidden', 'false');
    setTimeout(() => noteEditor.focus(), 160);
  }

  function closeNoteDrawer() {
    if (activeNoteDateKey) {
      store.saveNote(activeNoteDateKey, noteEditor.innerHTML);
    }
    noteDrawer.classList.remove('open');
    noteDrawer.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      noteDrawerBackdrop.hidden = true;
    }, 280);
  }

  function updateNoteWordCount() {
    const text = noteEditor.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    noteWordCount.textContent = `${words} ${words === 1 ? 'palavra' : 'palavras'}`;
  }

  noteEditor.addEventListener('input', () => {
    updateNoteWordCount();
    noteSaveStatus.textContent = 'Salvando...';
    clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(() => {
      if (activeNoteDateKey) {
        store.saveNote(activeNoteDateKey, noteEditor.innerHTML);
        noteSaveStatus.textContent = 'Salvo';
      }
    }, 350);
  });

  // Rich Text Formatting Commands
  document.querySelectorAll('.rt-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      const val = btn.dataset.val || null;
      noteEditor.focus();
      document.execCommand(cmd, false, val);
      noteEditor.dispatchEvent(new Event('input'));
    });
  });

  btnInsertChecklist.addEventListener('click', () => {
    noteEditor.focus();
    document.execCommand(
      'insertHTML',
      false,
      '<div><input type="checkbox" style="margin-right:8px;transform:scale(1.1)" /><span>Item da lista</span></div>'
    );
    noteEditor.dispatchEvent(new Event('input'));
  });

  btnCloseNoteDrawer.addEventListener('click', closeNoteDrawer);
  noteDrawerBackdrop.addEventListener('click', closeNoteDrawer);

  btnDeleteNote.addEventListener('click', () => {
    if (!activeNoteDateKey) return;
    if (confirm('Deseja limpar todo o conteúdo da nota deste dia?')) {
      noteEditor.innerHTML = '';
      store.saveNote(activeNoteDateKey, '');
      updateNoteWordCount();
      showToast('Nota do dia limpa');
    }
  });

  function shiftNoteDay(delta) {
    if (!activeNoteDateKey) return;
    store.saveNote(activeNoteDateKey, noteEditor.innerHTML);
    const { year, month, day } = parseDateKey(activeNoteDateKey);
    const d = new Date(year, month, day + delta);
    const nextKey = makeDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (d.getMonth() !== store.state.currentMonth.month || d.getFullYear() !== store.state.currentMonth.year) {
      store.setMonth(d.getFullYear(), d.getMonth());
    }
    openNoteDrawer(nextKey);
  }

  btnNotePrevDay.addEventListener('click', () => shiftNoteDay(-1));
  btnNoteNextDay.addEventListener('click', () => shiftNoteDay(1));

  // ==========================================
  // MODALS FOR AREAS, GOALS & ACTIVITIES
  // ==========================================
  function closeModal() {
    modalBackdrop.hidden = true;
    modalForm.innerHTML = '';
    modalForm.onsubmit = null;
  }

  btnModalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
  });

  function openAreaModal(editAreaId = null) {
    const existing = editAreaId ? store.state.areas.find(a => a.id === editAreaId) : null;
    modalTitle.textContent = existing ? 'Editar Área da Vida' : 'Nova Área da Vida';

    let selectedColor = existing ? existing.color : window.AREA_COLORS[0].hex;

    const swatchesHtml = window.AREA_COLORS.map(
      c => `
      <button
        type="button"
        class="color-swatch-btn ${c.hex === selectedColor ? 'selected' : ''}"
        style="background:${c.hex}"
        data-color="${c.hex}"
        title="${c.name}"
      ></button>
    `
    ).join('');

    modalForm.innerHTML = `
      <div class="form-field">
        <label for="input-area-name">Nome da Área</label>
        <input type="text" id="input-area-name" class="form-input" placeholder="Ex: Minha Saúde, Vida Profissional, Finanças..." value="${existing ? escapeHtml(existing.name) : ''}" required />
      </div>
      <div class="form-field">
        <label>Cor de Identificação</label>
        <div class="color-picker-row" id="color-picker-row">${swatchesHtml}</div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="btn-cancel-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">${existing ? 'Salvar Alterações' : 'Criar Área'}</button>
      </div>
    `;

    const colorRow = document.getElementById('color-picker-row');
    colorRow.addEventListener('click', e => {
      const swatch = e.target.closest('.color-swatch-btn');
      if (!swatch) return;
      selectedColor = swatch.dataset.color;
      colorRow.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('selected'));
      swatch.classList.add('selected');
    });

    document.getElementById('btn-cancel-modal').onclick = closeModal;

    modalForm.onsubmit = e => {
      e.preventDefault();
      const name = document.getElementById('input-area-name').value.trim();
      if (!name) return;
      if (existing) {
        store.updateArea(existing.id, name, selectedColor);
        showToast('Área atualizada');
      } else {
        store.addArea(name, selectedColor);
        showToast('Nova área criada');
      }
      closeModal();
    };

    modalBackdrop.hidden = false;
    document.getElementById('input-area-name').focus();
  }

  function openGoalModal(areaId, editGoalId = null) {
    const area = store.state.areas.find(a => a.id === areaId);
    if (!area) return;
    const existing = editGoalId ? area.goals.find(g => g.id === editGoalId) : null;

    modalTitle.textContent = existing ? 'Editar Meta' : `Nova Meta — ${area.name}`;
    modalForm.innerHTML = `
      <div class="form-field">
        <label for="input-goal-title">Objetivo / Meta para 2027</label>
        <input type="text" id="input-goal-title" class="form-input" placeholder="Ex: Conseguir um emprego melhor com bons benefícios" value="${existing ? escapeHtml(existing.title) : ''}" required />
      </div>
      <div class="form-field">
        <label for="input-goal-desc">Descrição ou Critério de Sucesso (Opcional)</label>
        <input type="text" id="input-goal-desc" class="form-input" placeholder="Ex: Salário +30%, trabalho remoto e plano de carreira" value="${existing ? escapeHtml(existing.description || '') : ''}" />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="btn-cancel-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">${existing ? 'Salvar' : 'Adicionar Meta'}</button>
      </div>
    `;

    document.getElementById('btn-cancel-modal').onclick = closeModal;

    modalForm.onsubmit = e => {
      e.preventDefault();
      const title = document.getElementById('input-goal-title').value.trim();
      const desc = document.getElementById('input-goal-desc').value.trim();
      if (!title) return;
      if (existing) {
        store.updateGoal(areaId, existing.id, title, desc);
        showToast('Meta atualizada');
      } else {
        store.addGoal(areaId, title, desc);
        showToast('Meta adicionada');
      }
      closeModal();
    };

    modalBackdrop.hidden = false;
    document.getElementById('input-goal-title').focus();
  }

  function openActivityModal(areaId, goalId, editActId = null) {
    const area = store.state.areas.find(a => a.id === areaId);
    if (!area) return;
    const goal = area.goals.find(g => g.id === goalId);
    if (!goal) return;
    const existing = editActId ? goal.activities.find(a => a.id === editActId) : null;

    modalTitle.textContent = existing ? 'Editar Atividade & Tag' : 'Nova Atividade & Tag';
    modalForm.innerHTML = `
      <div class="form-field">
        <label for="input-act-tag">Tag Identificadora Única (Curta)</label>
        <input type="text" id="input-act-tag" class="form-input" style="font-family:var(--font-mono);text-transform:uppercase" maxlength="14" placeholder="Ex: TREINO, CORRIDA, ESTUDO" value="${existing ? escapeHtml(existing.tag) : ''}" required />
        <span class="form-hint">Esta Tag aparecerá automaticamente como uma linha na tabela do Tracker Mensal.</span>
      </div>
      <div class="form-field">
        <label for="input-act-name">Nome da Atividade / Hábito</label>
        <input type="text" id="input-act-name" class="form-input" placeholder="Ex: Estudar arquitetura de software por 1 hora" value="${existing ? escapeHtml(existing.name) : ''}" required />
      </div>
      <div id="modal-error-msg" style="color:var(--accent-danger);font-size:0.8rem;display:none"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="btn-cancel-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">${existing ? 'Salvar' : 'Criar Atividade'}</button>
      </div>
    `;

    document.getElementById('btn-cancel-modal').onclick = closeModal;

    modalForm.onsubmit = e => {
      e.preventDefault();
      const rawTag = document.getElementById('input-act-tag').value;
      const name = document.getElementById('input-act-name').value;
      const errEl = document.getElementById('modal-error-msg');

      try {
        if (existing) {
          store.updateActivity(areaId, goalId, existing.id, name, rawTag);
          showToast('Atividade atualizada');
        } else {
          store.addActivity(areaId, goalId, name, rawTag);
          showToast('Atividade adicionada ao Tracker');
        }
        closeModal();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    };

    modalBackdrop.hidden = false;
    document.getElementById('input-act-tag').focus();
  }

  btnNewArea.addEventListener('click', () => openAreaModal());

  btnResetDemo.addEventListener('click', () => {
    modalTitle.textContent = 'Gerenciar Dados da Sessão';
    modalForm.innerHTML = `
      <p style="font-size:0.88rem;color:var(--text-secondary)">
        Você pode carregar o conjunto de metas de exemplo para 2027 ou limpar todos os dados para começar do zero. Lembre-se de usar <strong>Exportar HTML</strong> para salvar seu backup.
      </p>
      <div class="modal-actions" style="justify-content:space-between;margin-top:1rem">
        <button type="button" class="btn btn-ghost" id="btn-clear-all-data" style="color:var(--accent-danger)">Limpar Tudo (Zero)</button>
        <div style="display:flex;gap:0.5rem">
          <button type="button" class="btn btn-ghost" id="btn-cancel-modal">Fechar</button>
          <button type="button" class="btn btn-primary" id="btn-load-demo">Restaurar Exemplos</button>
        </div>
      </div>
    `;
    document.getElementById('btn-cancel-modal').onclick = closeModal;
    document.getElementById('btn-load-demo').onclick = () => {
      store.resetToDemo();
      closeModal();
      showToast('Dados de exemplo carregados');
    };
    document.getElementById('btn-clear-all-data').onclick = () => {
      if (confirm('Tem certeza que deseja zerar todas as áreas, metas e notas atuais?')) {
        store.clearAll();
        closeModal();
        showToast('Dados limpos');
      }
    };
    modalBackdrop.hidden = false;
  });

  // ==========================================
  // BACKUP ACTIONS: EXPORT HTML, IMPORT HTML, PDF
  // ==========================================
  btnExportHtml.addEventListener('click', () => {
    if (activeNoteDateKey && noteDrawer.classList.contains('open')) {
      store.saveNote(activeNoteDateKey, noteEditor.innerHTML);
    }
    exportHtmlBackup(store.state);
    showToast('Relatório HTML com backup embutido baixado!');
  });

  btnExportPdf.addEventListener('click', () => {
    if (activeNoteDateKey && noteDrawer.classList.contains('open')) {
      store.saveNote(activeNoteDateKey, noteEditor.innerHTML);
    }
    exportPdfReport(store.state);
  });

  btnImportHtml.addEventListener('click', () => {
    importHtmlInput.value = '';
    importHtmlInput.click();
  });

  importHtmlInput.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const restoredState = await importHtmlBackupFile(file);
      store.replaceState(restoredState);
      showToast('Backup HTML importado e restaurado com sucesso!');
    } catch (err) {
      alert(err.message || 'Erro ao importar o arquivo HTML.');
    }
  });

  // ==========================================
  // MASTER RENDER & SUBSCRIPTION
  // ==========================================
  function renderAll() {
    renderKPIs();
    renderGoalsView();
    renderTrackerView();
    renderNotesGallery();
  }

  store.subscribe(renderAll);
  renderAll();
})();
