/**
 * METAS 2027 — ROBUST HTML BACKUP (EXPORT / IMPORT) & PDF GENERATOR
 *
 * Security & Reliability Strategy for HTML Backup:
 * 1. Embeds full JSON state inside <script id="metas2027-backup-json" type="application/json">
 *    with escaped closing tags.
 * 2. Also embeds UTF-8 Base64 encoded state inside <meta name="metas2027-backup-b64" content="...">
 *    and <div id="metas2027-backup-b64" data-state="..." hidden></div> so even if an email client
 *    or sanitizer strips <script> tags, the importer still recovers 100% of the data.
 */

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDatePt(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return `${d} de ${MONTH_NAMES_PT[m - 1]} de ${y}`;
}

/**
 * Generates the unified HTML document containing both:
 * - A complete, print-ready visual report of all Areas, Goals, Monthly Habit Matrix, and Daily Notes.
 * - The hidden JSON database payload for lossless restoration.
 */
function buildUnifiedReportHtml(state, { autoPrint = false } = {}) {
  const jsonString = JSON.stringify(state, null, 2);
  const safeScriptJson = jsonString.replace(/<\/script>/gi, '<\\/script>');
  const base64Payload = utf8ToBase64(jsonString);

  const exportDate = new Date().toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  const { year, month } = state.currentMonth || { year: 2027, month: 0 };
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = `${MONTH_NAMES_PT[month]} ${year}`;

  // Collect all activities
  const activities = [];
  for (const area of state.areas) {
    for (const goal of area.goals) {
      for (const act of goal.activities) {
        activities.push({
          ...act,
          areaName: area.name,
          areaColor: area.color,
          goalTitle: goal.title
        });
      }
    }
  }

  // Build Areas & Goals HTML
  const areasHtml = state.areas.length === 0
    ? `<p class="muted">Nenhuma área cadastrada.</p>`
    : state.areas.map(area => {
        const goalsHtml = area.goals.length === 0
          ? `<p class="muted">Nenhuma meta nesta área.</p>`
          : area.goals.map(goal => {
              const tagsHtml = goal.activities.map(act => `
                <div class="act-row">
                  <span class="tag-badge" style="background:${area.color}18;color:${area.color};border:1px solid ${area.color}40">${escapeHtml(act.tag)}</span>
                  <span class="act-name">${escapeHtml(act.name)}</span>
                </div>
              `).join('');
              return `
                <div class="goal-box">
                  <div class="goal-title">${escapeHtml(goal.title)}</div>
                  ${goal.description ? `<div class="goal-desc">${escapeHtml(goal.description)}</div>` : ''}
                  <div class="acts-wrap">${tagsHtml || '<span class="muted">Sem atividades</span>'}</div>
                </div>
              `;
            }).join('');

        return `
          <div class="area-box">
            <div class="area-head">
              <span class="dot" style="background:${escapeHtml(area.color)}"></span>
              <h3>${escapeHtml(area.name)}</h3>
            </div>
            <div class="goals-list">${goalsHtml}</div>
          </div>
        `;
      }).join('');

  // Build Monthly Tracker Matrix for Current Viewed Month
  let dayHeaders = '';
  for (let d = 1; d <= daysInMonth; d++) {
    dayHeaders += `<th>${d}</th>`;
  }

  const matrixRows = activities.length === 0
    ? `<tr><td colspan="${daysInMonth + 2}" class="muted">Nenhuma atividade cadastrada.</td></tr>`
    : activities.map(act => {
        let cells = '';
        let doneCount = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const checked = Array.isArray(state.checks[dateKey]) && state.checks[dateKey].includes(act.id);
          if (checked) doneCount++;
          cells += `<td class="${checked ? 'c-on' : 'c-off'}" style="${checked ? `--c:${act.areaColor}` : ''}">${checked ? '●' : '·'}</td>`;
        }
        const pct = Math.round((doneCount / daysInMonth) * 100);
        return `
          <tr>
            <td class="habit-col">
              <strong style="color:${escapeHtml(act.areaColor)}">${escapeHtml(act.tag)}</strong>
              <span>${escapeHtml(act.name)}</span>
            </td>
            ${cells}
            <td class="sum-col">${doneCount}/${daysInMonth} (${pct}%)</td>
          </tr>
        `;
      }).join('');

  // Build All Notes Chronologically
  const sortedNoteDates = Object.keys(state.notes || {}).sort();
  const notesHtml = sortedNoteDates.length === 0
    ? `<p class="muted">Nenhuma nota diária registrada até o momento.</p>`
    : sortedNoteDates.map(dateKey => {
        const noteObj = state.notes[dateKey];
        if (!noteObj || !noteObj.html) return '';
        const completedIds = state.checks[dateKey] || [];
        const completedTags = activities
          .filter(a => completedIds.includes(a.id))
          .map(a => `<span class="mini-tag">${escapeHtml(a.tag)}</span>`)
          .join('');

        return `
          <article class="note-entry">
            <div class="note-entry-head">
              <strong>${formatDatePt(dateKey)}</strong>
              <div class="note-tags">${completedTags}</div>
            </div>
            <div class="note-entry-body">${noteObj.html}</div>
          </article>
        `;
      }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="generator" content="Metas 2027 Personal SaaS" />
  <meta name="metas2027-backup-b64" content="${base64Payload}" />
  <title>Relatório & Backup — Metas 2027</title>
  <style>
    :root {
      --text: #1D1D1F;
      --muted: #6E6E73;
      --border: #E5E5EA;
      --bg: #F5F5F7;
      --card: #FFFFFF;
      --accent: #0071E3;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2.5rem 1.5rem;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-shell {
      max-width: 1140px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 2.5rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.04);
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    .report-header h1 {
      font-size: 1.9rem;
      letter-spacing: -0.03em;
    }
    .report-meta {
      text-align: right;
      font-size: 0.82rem;
      color: var(--muted);
    }
    .backup-banner {
      background: #F0F7FF;
      border: 1px solid #CCE4FF;
      color: #004C99;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-size: 0.82rem;
      margin-bottom: 2rem;
    }
    h2.sec-title {
      font-size: 1.25rem;
      letter-spacing: -0.02em;
      margin: 2rem 0 1rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid var(--border);
    }
    .areas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }
    .area-box {
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.1rem;
      break-inside: avoid;
    }
    .area-head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.8rem;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .goal-box {
      background: var(--bg);
      border-radius: 10px;
      padding: 0.8rem;
      margin-bottom: 0.65rem;
    }
    .goal-title {
      font-weight: 600;
      font-size: 0.92rem;
    }
    .goal-desc {
      font-size: 0.78rem;
      color: var(--muted);
      margin-top: 0.2rem;
    }
    .acts-wrap {
      margin-top: 0.6rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .act-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      background: #fff;
      padding: 0.35rem 0.55rem;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .tag-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }
    .matrix-wrap {
      overflow-x: auto;
      margin-top: 0.75rem;
    }
    table.matrix {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.72rem;
    }
    table.matrix th, table.matrix td {
      border: 1px solid var(--border);
      padding: 0.35rem 0.2rem;
      text-align: center;
    }
    table.matrix th {
      background: var(--bg);
      font-weight: 600;
    }
    table.matrix td.habit-col {
      text-align: left;
      padding: 0.4rem 0.6rem;
      min-width: 160px;
    }
    table.matrix td.habit-col span {
      display: block;
      font-size: 0.68rem;
      color: var(--muted);
    }
    table.matrix td.c-on {
      color: var(--c, var(--accent));
      font-weight: 700;
      background: rgba(0, 113, 227, 0.05);
    }
    table.matrix td.c-off {
      color: #D1D1D6;
    }
    table.matrix td.sum-col {
      font-family: ui-monospace, monospace;
      font-weight: 600;
      min-width: 75px;
    }
    .notes-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .note-entry {
      border: 1px solid var(--border);
      background: #FFFCF5;
      border-radius: 12px;
      padding: 1.1rem 1.35rem;
      break-inside: avoid;
    }
    .note-entry-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
      margin-bottom: 0.7rem;
      font-size: 0.88rem;
    }
    .mini-tag {
      font-family: ui-monospace, monospace;
      font-size: 0.68rem;
      background: #EFEFF4;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      margin-left: 0.25rem;
    }
    .note-entry-body {
      font-size: 0.9rem;
      line-height: 1.6;
    }
    .note-entry-body ul, .note-entry-body ol {
      padding-left: 1.25rem;
      margin: 0.35rem 0;
    }
    .muted { color: var(--muted); font-size: 0.85rem; }
    @media print {
      body { background: #fff; padding: 0; }
      .report-shell { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .backup-banner { display: none; }
    }
  </style>
</head>
<body>
  <div class="report-shell">
    <header class="report-header">
      <div>
        <h1>Metas 2027 — Relatório Unificado</h1>
        <p class="muted">Planejamento Hierárquico, Consistência Mensal e Diário de Notas</p>
      </div>
      <div class="report-meta">
        <div>Exportado em ${escapeHtml(exportDate)}</div>
        <div>Mês em foco: <strong>${escapeHtml(monthLabel)}</strong></div>
      </div>
    </header>

    <div class="backup-banner">
      <strong>Arquivo de Backup Ativo:</strong> Este documento HTML contém seus dados estruturados de forma oculta. Para restaurar suas metas, hábitos e notas no aplicativo Metas 2027 a qualquer momento, clique em <strong>"Importar HTML"</strong> e selecione este arquivo.
    </div>

    <section>
      <h2 class="sec-title">1. Arquitetura de Metas e Tags Identificadoras</h2>
      <div class="areas-grid">${areasHtml}</div>
    </section>

    <section>
      <h2 class="sec-title">2. Matriz de Hábitos — ${escapeHtml(monthLabel)}</h2>
      <div class="matrix-wrap">
        <table class="matrix">
          <thead>
            <tr>
              <th style="text-align:left;padding-left:0.6rem">TAG / Atividade</th>
              ${dayHeaders}
              <th>Progresso</th>
            </tr>
          </thead>
          <tbody>${matrixRows}</tbody>
        </table>
      </div>
    </section>

    <section>
      <h2 class="sec-title">3. Caderno de Notas Diárias</h2>
      <div class="notes-list">${notesHtml}</div>
    </section>
  </div>

  <!-- HIDDEN DATABASE PAYLOAD FOR LOSSLESS RESTORE -->
  <div id="metas2027-backup-b64" data-payload="${base64Payload}" hidden style="display:none!important"></div>
  <script id="metas2027-backup-json" type="application/json">
${safeScriptJson}
  </script>
  ${autoPrint ? `<script>window.addEventListener('load', () => { setTimeout(() => window.print(), 250); });</script>` : ''}
</body>
</html>`;
}

/**
 * Triggers download of the unified HTML backup file
 */
function exportHtmlBackup(state) {
  const html = buildUnifiedReportHtml(state, { autoPrint: false });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `metas-2027-backup-${dateStamp}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens a formatted print/PDF window and triggers the system PDF/Print dialog
 */
function exportPdfReport(state) {
  const html = buildUnifiedReportHtml(state, { autoPrint: true });
  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Permita pop-ups para gerar o PDF de impressão.');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}

/**
 * Extracts and validates the JSON state from an uploaded HTML backup file
 */
async function importHtmlBackupFile(file) {
  const rawHtml = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Strategy 1: Extract from <script id="metas2027-backup-json" type="application/json">
  const scriptEl = doc.getElementById('metas2027-backup-json');
  if (scriptEl && scriptEl.textContent.trim()) {
    try {
      const cleaned = scriptEl.textContent.trim().replace(/<\\\/script>/gi, '</script>');
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('Tentando fallback Base64 após erro no script JSON:', e);
    }
  }

  // Strategy 2: Extract from <div id="metas2027-backup-b64" data-payload="...">
  const b64Div = doc.getElementById('metas2027-backup-b64');
  if (b64Div && b64Div.getAttribute('data-payload')) {
    const jsonStr = base64ToUtf8(b64Div.getAttribute('data-payload'));
    return JSON.parse(jsonStr);
  }

  // Strategy 3: Extract from <meta name="metas2027-backup-b64" content="...">
  const metaEl = doc.querySelector('meta[name="metas2027-backup-b64"]');
  if (metaEl && metaEl.getAttribute('content')) {
    const jsonStr = base64ToUtf8(metaEl.getAttribute('content'));
    return JSON.parse(jsonStr);
  }

  // Strategy 4: Regex fallback directly on raw text
  const regexMatch = rawHtml.match(/data-payload="([A-Za-z0-9+/=]+)"/);
  if (regexMatch && regexMatch[1]) {
    const jsonStr = base64ToUtf8(regexMatch[1]);
    return JSON.parse(jsonStr);
  }

  throw new Error('Não foi possível encontrar dados de backup do Metas 2027 neste arquivo HTML.');
}

window.BackupManager = {
  exportHtmlBackup,
  exportPdfReport,
  importHtmlBackupFile,
  MONTH_NAMES_PT,
  formatDatePt
};
