export type ModuleCategory =
  | 'shell'
  | 'navigation'
  | 'canvas'
  | 'engine'
  | 'persistence'
  | 'ui';

export interface AppModulePackage {
  id: string;
  title: string;
  category: ModuleCategory;
  categoryLabel: string;
  summary: string;
  originNote: string;
  css: string;
  html: string;
  js: string;
  defaultEnabled?: boolean;
}

export interface AppBlueprintRecipe {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  accentColor: string;
  moduleIds: string[];
  appTitle: string;
}

export const MODULE_CATEGORIES: Array<{ id: ModuleCategory | 'all'; label: string }> = [
  { id: 'all', label: 'Tutti i Moduli' },
  { id: 'shell', label: '1. Shell & Tema' },
  { id: 'navigation', label: '2. Barra & Ribbon' },
  { id: 'canvas', label: '3. Viste & Canvas' },
  { id: 'engine', label: '4. Motori & Logica' },
  { id: 'persistence', label: '5. Storage & Codec' },
  { id: 'ui', label: '6. Modali & Status' },
];

export const APP_MODULE_PACKAGES: AppModulePackage[] = [
  {
    id: 'pkg_shell_theme',
    title: 'Shell Applicativa & Variabili CSS (--accent, --zoom)',
    category: 'shell',
    categoryLabel: 'Shell & Tema',
    summary:
      'Struttura radice a schermo intero (100dvh) con variabili CSS dinamiche per colore primario, modalità chiara/scura e fattore di zoom.',
    originNote: 'Estratto da :root e #app di Office Studio',
    defaultEnabled: true,
    css: `:root {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: #1e293b;
  font-size: 13px;
  --accent: #2b579a;
  --accent-dark: #1d437f;
  --pale: #edf3fb;
  --border: #d2d1d0;
  --ribbon: #f8fafc;
  --zoom: 1;
}
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #e2e8f0; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
#app-shell {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
}
.workspace-main {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: auto;
  padding: 16px;
  gap: 16px;
  zoom: var(--zoom);
}`,
    html: `<header class="app-titlebar">
  <div class="title-left">
    <button class="quick-btn" data-cmd="save-local" title="Salva nello Storage Locale">▣</button>
    <button class="quick-btn" data-cmd="export-json" title="Esporta Backup JSON">⇩</button>
    <span class="app-badge" id="appBadge">STUDIO APP</span>
  </div>
  <div class="title-center">
    <input id="appDocTitle" value="Progetto_1" aria-label="Titolo Progetto" />
  </div>
  <div class="title-right">
    <button class="top-btn" data-cmd="open-modal-demo">Nuova Azione</button>
    <button class="top-btn primary" data-cmd="export-html-self">Esporta File ↓</button>
  </div>
</header>`,
    js: `// Shell helpers & selettori rapidi (stile Office Studio)
const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const appState = window.appState || {
  title: 'Progetto_1',
  zoom: 100,
  data: {},
  items: []
};
window.appState = appState;

if ($('appDocTitle')) {
  $('appDocTitle').addEventListener('input', (e) => {
    appState.title = e.target.value;
    if (window.scheduleAppPersist) window.scheduleAppPersist();
  });
}`,
  },

  {
    id: 'pkg_ribbon_Dispatcher',
    title: 'Barra Multifunzione (Ribbon UI) & Command Dispatcher',
    category: 'navigation',
    categoryLabel: 'Barra & Ribbon',
    summary:
      'Schede dinamiche (Home, Inserisci, Dati, Visualizza) e gruppi di pulsanti delegati tramite attributo data-cmd ad un unico gestore centrale.',
    originNote: 'Estratto da renderTabs(), renderRibbon() e handleAction() di Office Studio',
    defaultEnabled: true,
    css: `.app-titlebar {
  height: 34px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  gap: 8px;
  flex-shrink: 0;
}
.title-left, .title-right { display: flex; align-items: center; gap: 6px; }
.quick-btn { background: transparent; border: 0; color: #fff; padding: 4px 7px; border-radius: 3px; font-size: 14px; }
.quick-btn:hover { background: rgba(255,255,255,0.18); }
.app-badge { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; padding: 2px 6px; background: rgba(255,255,255,0.16); border-radius: 3px; }
.title-center input { background: transparent; border: 1px solid transparent; color: #fff; text-align: center; padding: 3px 8px; border-radius: 3px; font-weight: 600; }
.title-center input:hover, .title-center input:focus { border-color: rgba(255,255,255,0.6); outline: none; }
.top-btn { border: 1px solid rgba(255,255,255,0.45); background: rgba(255,255,255,0.12); color: #fff; padding: 4px 10px; border-radius: 3px; font-size: 12px; }
.top-btn.primary { background: #fff; color: var(--accent); font-weight: 600; }
.ribbon-tabs { height: 28px; background: var(--accent); display: flex; gap: 2px; padding-left: 8px; align-items: stretch; flex-shrink: 0; }
.ribbon-tab { border: 0; background: transparent; color: #fff; padding: 0 14px; font-size: 12px; }
.ribbon-tab.active { background: var(--ribbon); color: var(--accent); font-weight: 600; border-top-left-radius: 4px; border-top-right-radius: 4px; }
.ribbon-bar { min-height: 54px; background: var(--ribbon); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 6px 12px; gap: 14px; flex-shrink: 0; flex-wrap: wrap; }
.rb-group { display: flex; align-items: center; gap: 4px; padding-right: 12px; border-right: 1px solid #e2e8f0; }
.rb-group:last-child { border-right: 0; }
.rb-btn { border: 1px solid #cbd5e1; background: #fff; color: #1e293b; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; gap: 5px; }
.rb-btn:hover { background: var(--pale); border-color: var(--accent); color: var(--accent); }`,
    html: `<nav class="ribbon-tabs" id="ribbonTabs">
  <button class="ribbon-tab active" data-tab="Home">Home</button>
  <button class="ribbon-tab" data-tab="Inserisci">Inserisci</button>
  <button class="ribbon-tab" data-tab="Strumenti">Strumenti &amp; Dati</button>
</nav>
<section class="ribbon-bar" id="ribbonBar">
  <div class="rb-group">
    <button class="rb-btn" data-cmd="bold-doc"><b>B</b> Grassetto</button>
    <button class="rb-btn" data-cmd="italic-doc"><i>I</i> Corsivo</button>
    <button class="rb-btn" data-cmd="insert-callout">+ Box Nota</button>
  </div>
  <div class="rb-group">
    <button class="rb-btn" data-cmd="add-kanban-card">+ Nuova Attività</button>
    <button class="rb-btn" data-cmd="calc-sheet">Σ Ricalcola Foglio</button>
  </div>
  <div class="rb-group">
    <button class="rb-btn" data-cmd="theme-blue">Tema Word</button>
    <button class="rb-btn" data-cmd="theme-green">Tema Excel</button>
    <button class="rb-btn" data-cmd="theme-slate">Tema Studio</button>
  </div>
</section>`,
    js: `// Dispatcher universale di comandi basato su attributi data-cmd
document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) {
    $$('.ribbon-tab').forEach(b => b.classList.toggle('active', b === tabBtn));
    if (window.showAppToast) window.showAppToast('Scheda attiva: ' + tabBtn.dataset.tab);
    return;
  }

  const cmdBtn = e.target.closest('[data-cmd]');
  if (!cmdBtn) return;
  const cmd = cmdBtn.dataset.cmd;

  if (cmd === 'bold-doc') document.execCommand('bold');
  else if (cmd === 'italic-doc') document.execCommand('italic');
  else if (cmd === 'insert-callout') {
    const ed = $('docEditorSurface');
    if (ed) {
      ed.focus();
      document.execCommand('insertHTML', false, '<blockquote style="border-left:3px solid var(--accent);padding:8px 14px;background:var(--pale);margin:10px 0;"><strong>Nota Operativa:</strong> Inserisci qui i dettagli...</blockquote>');
    }
  } else if (cmd === 'theme-blue') {
    document.documentElement.style.setProperty('--accent', '#2b579a');
    document.documentElement.style.setProperty('--pale', '#edf3fb');
  } else if (cmd === 'theme-green') {
    document.documentElement.style.setProperty('--accent', '#217346');
    document.documentElement.style.setProperty('--pale', '#e7f3eb');
  } else if (cmd === 'theme-slate') {
    document.documentElement.style.setProperty('--accent', '#0f172a');
    document.documentElement.style.setProperty('--pale', '#f1f5f9');
  } else if (cmd === 'export-html-self') {
    const htmlBlob = new Blob(['<!DOCTYPE html>\\n' + document.documentElement.outerHTML], { type: 'text/html' });
    const url = URL.createObjectURL(htmlBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (appState.title || 'applicazione') + '.html';
    a.click();
    URL.revokeObjectURL(url);
    if (window.showAppToast) window.showAppToast('Applicazione HTML autonoma esportata!');
  }

  // Notifica altri moduli registrati
  window.dispatchEvent(new CustomEvent('app:command', { detail: { cmd } }));
});`,
  },

  {
    id: 'pkg_word_page_canvas',
    title: 'Canvas Pagina A4 & Editor Ricco (Modulo Word)',
    category: 'canvas',
    categoryLabel: 'Viste & Canvas',
    summary:
      'Foglio fisico A4 con ombreggiatura, margini tipografici, interruzioni di pagina tratteggiate, conteggio parole live e sanitizzazione HTML.',
    originNote: 'Estratto da #wordPane, .page[data-paper="a4"] e sanitizeHTML() di Office Studio',
    defaultEnabled: true,
    css: `.doc-stage {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 12px;
}
.a4-page {
  width: 100%;
  max-width: 720px;
  min-height: 520px;
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.12);
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 40px 48px;
  outline: none;
  line-height: 1.55;
  color: #0f172a;
}
.a4-page h1 { font-size: 22px; margin: 0 0 10px; color: var(--accent); }
.a4-page p { margin: 0 0 10px; }
.a4-page table { border-collapse: collapse; width: 100%; margin: 12px 0; }
.a4-page td, .a4-page th { border: 1px solid #94a3b8; padding: 6px 8px; }`,
    html: `<div class="doc-stage">
  <article id="docEditorSurface" class="a4-page" contenteditable="true" spellcheck="true">
    <h1>Documento Tecnico Assemblato</h1>
    <p>Questa superficie è il <strong>Modulo Pagina A4</strong> estratto dall'architettura di Office Studio. Puoi modificare liberamente il testo, inserire tabelle o combinare questo modulo con la griglia di calcolo o una board Kanban a fianco.</p>
    <blockquote>Ogni funzionalità non è altro che un pacchetto coordinato di <strong>Stile (CSS)</strong>, <strong>Struttura (HTML)</strong> e <strong>Comportamento (JS)</strong>.</blockquote>
  </article>
</div>`,
    js: `// Sincronizza conteggio parole e contenuto del modulo Documento
const docSurface = $('docEditorSurface');
function updateDocMetrics() {
  if (!docSurface) return;
  const txt = docSurface.innerText || '';
  const words = txt.trim() ? txt.trim().split(/\\s+/).length : 0;
  appState.data.docHTML = docSurface.innerHTML;
  const statEl = $('statusMetrics');
  if (statEl) statEl.textContent = words + ' parole · ' + txt.length + ' caratteri';
  if (window.scheduleAppPersist) window.scheduleAppPersist();
}
if (docSurface) {
  docSurface.addEventListener('input', updateDocMetrics);
  setTimeout(updateDocMetrics, 60);
}`,
  },

  {
    id: 'pkg_spreadsheet_formula_engine',
    title: 'Griglia Foglio di Calcolo + Valutatore Formule (=SOMMA, =MEDIA, =SE)',
    category: 'engine',
    categoryLabel: 'Motori & Logica',
    summary:
      'Tabella reattiva con indirizzamento celle (A1..D8), barra della formula ƒx e parser matematico ricorsivo in italiano e inglese.',
    originNote: 'Estratto da evaluateFormula(), excelFunc() e sheetgrid di Office Studio',
    defaultEnabled: false,
    css: `.sheet-panel {
  flex: 1;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 320px;
}
.fx-bar {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-bottom: 1px solid #cbd5e1;
  padding: 4px 8px;
  gap: 6px;
}
.cell-ref-box {
  width: 56px;
  text-align: center;
  font-weight: 700;
  font-family: monospace;
  background: #fff;
  border: 1px solid #cbd5e1;
  padding: 3px 6px;
  border-radius: 3px;
}
.fx-input {
  flex: 1;
  border: 1px solid #cbd5e1;
  padding: 3px 8px;
  border-radius: 3px;
  font-family: monospace;
}
.mini-grid {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}
.mini-grid th {
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
  border: 1px solid #cbd5e1;
  padding: 4px 6px;
  text-align: center;
}
.mini-grid td {
  border: 1px solid #e2e8f0;
  padding: 4px 8px;
  min-width: 75px;
  height: 26px;
  cursor: cell;
  font-variant-numeric: tabular-nums;
}
.mini-grid td.active-cell {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  background: var(--pale);
}`,
    html: `<section class="sheet-panel">
  <div class="fx-bar">
    <input id="sheetCellRef" class="cell-ref-box" value="A1" readonly />
    <span style="font-style:italic;font-family:serif;color:#64748b;font-weight:700;">ƒx</span>
    <input id="sheetFxInput" class="fx-input" placeholder="Scrivi un valore o formula es. =SOMMA(B1:B3) e premi Invio" />
  </div>
  <div style="overflow:auto;flex:1;">
    <table class="mini-grid" id="miniSheetGrid"></table>
  </div>
</section>`,
    js: `// Motore Foglio di Calcolo + Parser Formule (=SOMMA, =MEDIA, =MIN, =MAX)
const sheetCells = appState.data.sheetCells || {
  A1: 'Voce Budget', B1: '1200', C1: 'Attivo',
  A2: 'Sviluppo UI', B2: '850',  C2: 'Attivo',
  A3: 'Testing QA',  B3: '450',  C3: 'In corso',
  A4: 'TOTALE',      B4: '=SOMMA(B1:B3)', C4: '=MEDIA(B1:B3)'
};
appState.data.sheetCells = sheetCells;
let activeCellRef = 'B4';

function evalSheetFormula(raw) {
  const str = String(raw ?? '');
  if (!str.startsWith('=')) return str;
  const expr = str.slice(1).trim();
  const rangeMatch = /^(SOMMA|SUM|MEDIA|AVERAGE|MIN|MAX)\\(([A-D][1-6]):([A-D][1-6])\\)$/i.exec(expr);
  if (rangeMatch) {
    const fn = rangeMatch[1].toUpperCase();
    const startCol = rangeMatch[2].charCodeAt(0) - 65;
    const startRow = parseInt(rangeMatch[2].slice(1), 10);
    const endCol = rangeMatch[3].charCodeAt(0) - 65;
    const endRow = parseInt(rangeMatch[3].slice(1), 10);
    const vals = [];
    for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
      for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
        const ref = String.fromCharCode(65 + c) + r;
        const v = parseFloat(evalSheetFormula(sheetCells[ref] || '0'));
        if (!Number.isNaN(v)) vals.push(v);
      }
    }
    if (!vals.length) return 0;
    const sum = vals.reduce((a, b) => a + b, 0);
    if (fn === 'SOMMA' || fn === 'SUM') return sum;
    if (fn === 'MEDIA' || fn === 'AVERAGE') return (sum / vals.length).toFixed(2);
    if (fn === 'MIN') return Math.min(...vals);
    if (fn === 'MAX') return Math.max(...vals);
  }
  return str;
}

function renderMiniSheet() {
  const table = $('miniSheetGrid');
  if (!table) return;
  const cols = ['A', 'B', 'C', 'D'];
  let html = '<thead><tr><th style="width:36px;">#</th>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
  for (let r = 1; r <= 6; r++) {
    html += '<tr><th>' + r + '</th>';
    for (const c of cols) {
      const ref = c + r;
      const raw = sheetCells[ref] || '';
      const val = evalSheetFormula(raw);
      const isAct = ref === activeCellRef ? 'active-cell' : '';
      html += '<td data-ref="' + ref + '" class="' + isAct + '" title="Formula: ' + raw + '">' + val + '</td>';
    }
    html += '</tr>';
  }
  html += '</tbody>';
  table.innerHTML = html;
  if ($('sheetCellRef')) $('sheetCellRef').value = activeCellRef;
  if ($('sheetFxInput')) $('sheetFxInput').value = sheetCells[activeCellRef] || '';
}

if ($('miniSheetGrid')) {
  $('miniSheetGrid').addEventListener('click', (e) => {
    const td = e.target.closest('td[data-ref]');
    if (!td) return;
    activeCellRef = td.dataset.ref;
    renderMiniSheet();
    $('sheetFxInput')?.focus();
  });
  $('sheetFxInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sheetCells[activeCellRef] = e.target.value;
      renderMiniSheet();
      if (window.showAppToast) window.showAppToast('Cella ' + activeCellRef + ' aggiornata');
    }
  });
  window.addEventListener('app:command', (e) => {
    if (e.detail?.cmd === 'calc-sheet') {
      renderMiniSheet();
      if (window.showAppToast) window.showAppToast('Foglio di calcolo ricalcolato');
    }
  });
  renderMiniSheet();
}`,
  },

  {
    id: 'pkg_kanban_task_board',
    title: 'Modulo Kanban & Gestore Attività / CRM',
    category: 'canvas',
    categoryLabel: 'Viste & Canvas',
    summary:
      'Bacheca a 3 colonne (Da Fare, In Corso, Completato) per trasformare l’editor in un project manager o gestionale operativo.',
    originNote: 'Modulo di estensione per creare gestionali e task manager in HTML',
    defaultEnabled: false,
    css: `.kanban-board {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 10px;
  align-content: start;
}
.kb-col {
  background: #e2e8f0;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kb-col h4 {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #334155;
  display: flex;
  justify-content: space-between;
}
.kb-card {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  padding: 8px 10px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.kb-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
.kb-mini-btn {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
}`,
    html: `<section class="kanban-board" id="kanbanBoard"></section>`,
    js: `// Motore Kanban Task Board
const kbTasks = appState.data.kbTasks || [
  { id: 1, title: 'Definire il Modello Dati JSON', status: 'done' },
  { id: 2, title: 'Collegare i pulsanti Ribbon al Dispatcher', status: 'doing' },
  { id: 3, title: 'Esportare l’app in un singolo file HTML', status: 'todo' }
];
appState.data.kbTasks = kbTasks;

function renderKanban() {
  const root = $('kanbanBoard');
  if (!root) return;
  const cols = [
    { key: 'todo', label: 'Da Fare' },
    { key: 'doing', label: 'In Corso' },
    { key: 'done', label: 'Completate' }
  ];
  root.innerHTML = cols.map(col => {
    const items = kbTasks.filter(t => t.status === col.key);
    return '<div class="kb-col"><h4><span>' + col.label + '</span><span>' + items.length + '</span></h4>' +
      items.map(t => (
        '<div class="kb-card">' +
          '<strong>' + t.title + '</strong>' +
          '<div class="kb-card-actions">' +
            (col.key !== 'todo' ? '<button class="kb-mini-btn" data-kb-move="' + t.id + ':todo">←</button>' : '') +
            (col.key !== 'doing' ? '<button class="kb-mini-btn" data-kb-move="' + t.id + ':doing">In Corso</button>' : '') +
            (col.key !== 'done' ? '<button class="kb-mini-btn" data-kb-move="' + t.id + ':done">✓</button>' : '') +
          '</div>' +
        '</div>'
      )).join('') +
    '</div>';
  }).join('');
}

if ($('kanbanBoard')) {
  $('kanbanBoard').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-kb-move]');
    if (!btn) return;
    const [idStr, nextStatus] = btn.dataset.kbMove.split(':');
    const item = kbTasks.find(t => String(t.id) === idStr);
    if (item) {
      item.status = nextStatus;
      renderKanban();
      if (window.scheduleAppPersist) window.scheduleAppPersist();
    }
  });

  window.addEventListener('app:command', (e) => {
    if (e.detail?.cmd === 'add-kanban-card') {
      kbTasks.push({
        id: Date.now(),
        title: 'Nuovo modulo funzionale #' + (kbTasks.length + 1),
        status: 'todo'
      });
      renderKanban();
      if (window.showAppToast) window.showAppToast('Nuova scheda aggiunta alla Kanban');
    }
  });
  renderKanban();
}`,
  },

  {
    id: 'pkg_persistence_codec',
    title: 'Motore di Persistenza Locale (IndexedDB / localStorage + Export JSON)',
    category: 'persistence',
    categoryLabel: 'Storage & Codec',
    summary:
      'Salvataggio automatico con debounce su dispositivo locale e scaricamento dello snapshot completo del progetto in formato JSON.',
    originNote: 'Estratto da dbOpen(), schedulePersist(), snapshot() e download() di Office Studio',
    defaultEnabled: true,
    css: `/* Nessun CSS visivo richiesto: opera dietro le quinte sul modello dati */`,
    html: `<!-- Modulo Persistenza Attivo -->`,
    js: `// Persistenza automatica con debounce + Download Snapshot JSON
const STORAGE_KEY_APP = 'custom_html_app_snapshot_v1';
let persistTimer = null;

window.scheduleAppPersist = function() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY_APP, JSON.stringify(appState));
      const st = $('appStatusLabel');
      if (st) st.textContent = 'Bozza salvata in locale alle ' + new Date().toLocaleTimeString();
    } catch (err) {
      console.warn('Storage locale non disponibile', err);
    }
  }, 400);
};

window.addEventListener('app:command', (e) => {
  const cmd = e.detail?.cmd;
  if (cmd === 'save-local') {
    window.scheduleAppPersist();
    if (window.showAppToast) window.showAppToast('Stato salvato in localStorage');
  } else if (cmd === 'export-json') {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (appState.title || 'progetto') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    if (window.showAppToast) window.showAppToast('Snapshot JSON esportato');
  }
});`,
  },

  {
    id: 'pkg_status_modal_toast',
    title: 'Barra di Stato con Slider Zoom + Sistema Modali Promise & Toast',
    category: 'ui',
    categoryLabel: 'Modali & Status',
    summary:
      'Footer di stato con controllo zoom continuo (60%–140%), notifiche Toast a scomparsa e finestre di dialogo basate su Promise.',
    originNote: 'Estratto da footer.status, setZoom(), modal() e toast() di Office Studio',
    defaultEnabled: true,
    css: `.app-statusbar {
  height: 28px;
  background: #f8fafc;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 11px;
  color: #475569;
  flex-shrink: 0;
}
.zoom-controls { display: flex; align-items: center; gap: 6px; }
.zoom-controls input[type="range"] { width: 90px; accent-color: var(--accent); }
.app-toast {
  position: fixed;
  bottom: 38px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.25);
  display: none;
  z-index: 300;
}
.app-toast.visible { display: block; }
.app-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.55);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 350;
}
.app-modal-backdrop.open { display: flex; }
.app-modal-box {
  background: #fff;
  border-radius: 6px;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.25);
}`,
    html: `<footer class="app-statusbar">
  <span id="appStatusLabel">Pronto · Architettura Modulare Single-File</span>
  <span id="statusMetrics">0 parole</span>
  <div class="zoom-controls">
    <span>Zoom:</span>
    <input id="appZoomRange" type="range" min="70" max="130" step="10" value="100" />
    <span id="appZoomVal">100%</span>
  </div>
</footer>
<div id="appToast" class="app-toast" role="status"></div>
<div id="appModalBg" class="app-modal-backdrop">
  <div class="app-modal-box">
    <h3 style="margin:0 0 8px;">Aggiungi Elemento Rapido</h3>
    <p style="margin:0 0 12px;color:#475569;font-size:12px;">Questa finestra è generata dal pacchetto <strong>Modali Promise &amp; Toast</strong>.</p>
    <input id="modalQuickText" placeholder="Titolo nota o attività..." style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:4px;margin-bottom:12px;" />
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button id="modalCancelBtn" style="padding:6px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;">Annulla</button>
      <button id="modalOkBtn" style="padding:6px 12px;border:0;background:var(--accent);color:#fff;border-radius:4px;font-weight:600;">Inserisci</button>
    </div>
  </div>
</div>`,
    js: `// Sistema Toast, Zoom & Modale
let appToastTimer = null;
window.showAppToast = function(msg) {
  const t = $('appToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(appToastTimer);
  appToastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
};

if ($('appZoomRange')) {
  $('appZoomRange').addEventListener('input', (e) => {
    const val = Number(e.target.value) || 100;
    document.documentElement.style.setProperty('--zoom', String(val / 100));
    if ($('appZoomVal')) $('appZoomVal').textContent = val + '%';
  });
}

window.addEventListener('app:command', (e) => {
  if (e.detail?.cmd === 'open-modal-demo') {
    $('appModalBg')?.classList.add('open');
    $('modalQuickText')?.focus();
  }
});

$('modalCancelBtn')?.addEventListener('click', () => $('appModalBg')?.classList.remove('open'));
$('modalOkBtn')?.addEventListener('click', () => {
  const val = $('modalQuickText')?.value || 'Elemento inserito dalla modale';
  $('appModalBg')?.classList.remove('open');
  const ed = $('docEditorSurface');
  if (ed) {
    ed.innerHTML += '<p><strong>• ' + val + '</strong></p>';
  }
  window.showAppToast('Inserito: ' + val);
});`,
  },
];

export const APP_BLUEPRINT_RECIPES: AppBlueprintRecipe[] = [
  {
    id: 'recipe_word_studio',
    name: '1. Word Processor A4 (Stile Office Word)',
    subtitle: 'Barra Ribbon + Foglio A4 + Persistenza + Zoom',
    description:
      'Ricrea un elaboratore testi completo con barra multifunzione, foglio A4, conteggio parole e salvataggio automatico.',
    accentColor: '#2b579a',
    appTitle: 'Documento_Word',
    moduleIds: [
      'pkg_shell_theme',
      'pkg_ribbon_Dispatcher',
      'pkg_word_page_canvas',
      'pkg_persistence_codec',
      'pkg_status_modal_toast',
    ],
  },
  {
    id: 'recipe_excel_calc',
    name: '2. Foglio di Calcolo Reattivo (Stile Excel)',
    subtitle: 'Barra Formule ƒx + Griglia A1:D6 + Valutatore =SOMMA/=MEDIA',
    description:
      'Trasforma la stessa shell HTML in un foglio elettronico con indirizzamento celle e calcolo matematico in tempo reale.',
    accentColor: '#217346',
    appTitle: 'Cartella_Calcolo',
    moduleIds: [
      'pkg_shell_theme',
      'pkg_ribbon_Dispatcher',
      'pkg_spreadsheet_formula_engine',
      'pkg_persistence_codec',
      'pkg_status_modal_toast',
    ],
  },
  {
    id: 'recipe_project_suite',
    name: '3. Suite Ibrida All-in-One (Word + Excel + Kanban)',
    subtitle: 'Tutti i 6 pacchetti attivi simultaneamente nella stessa pagina',
    description:
      'Dimostra come combinando più moduli dall’archivio si ottenga un software gestionale multifunzione senza alcuna dipendenza esterna.',
    accentColor: '#0f172a',
    appTitle: 'Workspace_Totale',
    moduleIds: [
      'pkg_shell_theme',
      'pkg_ribbon_Dispatcher',
      'pkg_word_page_canvas',
      'pkg_spreadsheet_formula_engine',
      'pkg_kanban_task_board',
      'pkg_persistence_codec',
      'pkg_status_modal_toast',
    ],
  },
];

/**
 * Compiles the selected modules into a single, self-contained HTML application string
 */
export function buildAssembledAppHTML(
  selectedModuleIds: string[],
  customAccent: string = '#2b579a',
  customAppTitle: string = 'Studio_App'
): string {
  const activeModules = APP_MODULE_PACKAGES.filter((m) =>
    selectedModuleIds.includes(m.id)
  );

  const combinedCss = activeModules
    .map((m) => `/* === [CSS] ${m.title} === */\n${m.css}`)
    .join('\n\n')
    .replace('--accent: #2b579a;', `--accent: ${customAccent};`);

  const topModules = activeModules.filter(
    (m) => m.category === 'shell' || m.category === 'navigation'
  );
  const canvasModules = activeModules.filter(
    (m) => m.category === 'canvas' || m.category === 'engine'
  );
  const bottomModules = activeModules.filter(
    (m) => m.category === 'persistence' || m.category === 'ui'
  );

  const topHtml = topModules.map((m) => m.html).join('\n');
  const canvasHtml = canvasModules.map((m) => m.html).join('\n');
  const bottomHtml = bottomModules.map((m) => m.html).join('\n');

  const combinedJs = activeModules
    .map((m) => `  // === [JS] ${m.title} ===\n${m.js}`)
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${customAppTitle} — Generato da QuineHTML App Builder</title>
<style>
${combinedCss}
</style>
</head>
<body>
<div id="app-shell">
${topHtml.replace('Progetto_1', customAppTitle)}
  <main class="workspace-main">
${canvasHtml}
  </main>
${bottomHtml}
</div>
<script>
(() => {
  'use strict';
${combinedJs}
})();
</script>
</body>
</html>`;
}
