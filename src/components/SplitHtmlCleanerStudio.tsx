import React, { useState, useRef, useEffect } from 'react';
import {
  CleaningOptions,
  DEFAULT_CLEANING_OPTIONS,
  DEMO_DIRTY_HTML,
  FindReplaceRule,
  runHtmlCleaner,
  formatHtmlIndentation,
  compressHtmlSource,
  encodeSpecialHtmlEntities,
  applyFindReplaceRules,
} from '../utils/htmlCleaner';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
  Undo2,
  Redo2,
  FilePlus,
  Type,
  Code2,
  AlignJustify,
  Minimize2,
  Copy,
  Play,
  Plus,
  Trash2,
  FolderOpen,
  Download,
  FileText,
  AlertTriangle,
  Eye,
  Wand2,
  ChevronDown,
  Maximize2,
  Printer,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Bookmark,
  Clock,
  Eraser,
  X,
} from 'lucide-react';

interface SplitHtmlCleanerStudioProps {
  onNotify: (msg: string) => void;
  externalHtmlToLoad?: string | null;
  onClearExternalHtml?: () => void;
}

const CLEANING_OPTION_META: Array<{
  key: keyof CleaningOptions;
  label: string;
  desc: string;
}> = [
  {
    key: 'inlineStyles',
    label: 'Inline styles',
    desc: 'Rimuove style="...", align e attributi visivi inline',
  },
  {
    key: 'classesAndIds',
    label: 'Classes & IDs',
    desc: 'Elimina class="..." e id="..." per un markup neutro',
  },
  {
    key: 'emptyTags',
    label: 'Empty tags',
    desc: 'Rimuove tag privi di contenuto come <p></p> o <span></span>',
  },
  {
    key: 'tagsWithOneSpace',
    label: 'Tags with 1 space',
    desc: 'Elimina paragrafi che contengono solo <p>&nbsp;</p>',
  },
  {
    key: 'repeatedSpaces',
    label: 'Repeated spaces',
    desc: 'Collassa sequenze multiple di &nbsp; in uno spazio',
  },
  {
    key: 'comments',
    label: 'Comments',
    desc: 'Rimuove i commenti HTML <!-- ... -->',
  },
  {
    key: 'tagAttributes',
    label: 'Tag attributes',
    desc: 'Rimuove gli attributi preservando solo href e src/alt',
  },
  {
    key: 'toPlainText',
    label: 'To plain text',
    desc: 'Rimuove tutti i tag HTML lasciando solo il testo puro',
  },
  {
    key: 'smartNbsp',
    label: 'Smart &nbsp;',
    desc: 'Lega le preposizioni brevi alla parola seguente',
  },
  {
    key: 'aiCharacters',
    label: 'AI characters',
    desc: 'Rimuove caratteri zero-width invisibili, "smart quotes" e trattini —',
  },
];

const SPECIAL_CHARS = [
  '©', '®', '™', '€', '£', '¥', '§', '¶', '†', '‡', '•', '…',
  '←', '↑', '→', '↓', '↔', '⇒', '±', '×', '÷', '≠', '≤', '≥',
  '∞', '∑', '√', '∆', 'Ω', 'α', 'β', 'π', '«', '»', '“', '”',
];

const LOREM_PARAGRAPH = `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>`;

export const SplitHtmlCleanerStudio: React.FC<SplitHtmlCleanerStudioProps> = ({
  onNotify,
  externalHtmlToLoad,
  onClearExternalHtml,
}) => {
  const [sourceHtml, setSourceHtml] = useState<string>(DEMO_DIRTY_HTML);
  const [undoStack, setUndoStack] = useState<string[]>([DEMO_DIRTY_HTML]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [cleaningOpts, setCleaningOpts] = useState<CleaningOptions>(DEFAULT_CLEANING_OPTIONS);
  const [autoCleanOnPaste, setAutoCleanOnPaste] = useState<boolean>(true);
  const [autoScrollSync, setAutoScrollSync] = useState<boolean>(true);
  const [lastCleanSummary, setLastCleanSummary] = useState<string | null>(null);
  const [showLiveSandbox, setShowLiveSandbox] = useState<boolean>(false);

  // View Aids states (from Screenshot 2: View -> Show invisible characters, Show blocks, Visual aids, Fullscreen)
  const [showInvisibleChars, setShowInvisibleChars] = useState<boolean>(false);
  const [showBlocksOutline, setShowBlocksOutline] = useState<boolean>(false);
  const [visualAids, setVisualAids] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Classic Menu Bar active dropdown ('file' | 'edit' | 'insert' | 'view' | 'format' | 'table' | 'tools' | null)
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Interactive Table Hover Grid Picker (up to 6x6)
  const [hoverTableRows, setHoverTableRows] = useState<number>(3);
  const [hoverTableCols, setHoverTableCols] = useState<number>(3);

  // Modals for Insert -> Video, Image, Link, Anchor, Special Character, and Tools -> Source code
  const [activeInsertModal, setActiveInsertModal] = useState<
    null | 'link' | 'image' | 'video' | 'anchor' | 'specialchar' | 'sourcecode'
  >(null);
  const [modalInput1, setModalInput1] = useState<string>('');
  const [modalInput2, setModalInput2] = useState<string>('');

  // Find & Replace rules state
  const [findRules, setFindRules] = useState<FindReplaceRule[]>([
    {
      id: 'rule_1',
      find: 'style\\s*=\\s*"[^"]*"',
      replace: '',
      useRegex: true,
      ignoreCase: true,
    },
  ]);
  const [regexMatchInfo, setRegexMatchInfo] = useState<string | null>(null);

  const wysiwygRef = useRef<HTMLDivElement | null>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const activeOrigin = useRef<'wysiwyg' | 'source' | null>(null);
  const debounceTimer = useRef<number | null>(null);

  // Load external HTML when sent from the App Builder
  useEffect(() => {
    if (externalHtmlToLoad) {
      pushUndoState(sourceHtml);
      activeOrigin.current = null;
      setSourceHtml(externalHtmlToLoad);
      onClearExternalHtml?.();
    }
  }, [externalHtmlToLoad]);

  // Close top menu dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pushUndoState = (nextHtml: string) => {
    setUndoStack((prev) => {
      if (prev[prev.length - 1] === nextHtml) return prev;
      return [...prev.slice(-19), nextHtml];
    });
    setRedoStack([]);
  };

  useEffect(() => {
    if (!wysiwygRef.current) return;
    if (activeOrigin.current === 'wysiwyg') {
      activeOrigin.current = null;
      return;
    }
    if (wysiwygRef.current.innerHTML !== sourceHtml) {
      wysiwygRef.current.innerHTML = sourceHtml;
    }
  }, [sourceHtml]);

  const handleWysiwygInput = () => {
    if (!wysiwygRef.current) return;
    const currentDomHtml = wysiwygRef.current.innerHTML;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      activeOrigin.current = 'wysiwyg';
      pushUndoState(sourceHtml);
      setSourceHtml(currentDomHtml);
    }, 120);
  };

  const handleSourceChange = (val: string) => {
    activeOrigin.current = 'source';
    setSourceHtml(val);
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      if (wysiwygRef.current && wysiwygRef.current.innerHTML !== val) {
        wysiwygRef.current.innerHTML = val;
      }
    }, 120);
  };

  const handleScroll = (from: 'wysiwyg' | 'source') => {
    if (!autoScrollSync || !wysiwygRef.current || !sourceTextareaRef.current) return;
    const wEl = wysiwygRef.current;
    const sEl = sourceTextareaRef.current;
    if (from === 'wysiwyg') {
      const ratio = wEl.scrollTop / Math.max(1, wEl.scrollHeight - wEl.clientHeight);
      sEl.scrollTop = ratio * Math.max(0, sEl.scrollHeight - sEl.clientHeight);
    } else {
      const ratio = sEl.scrollTop / Math.max(1, sEl.scrollHeight - sEl.clientHeight);
      wEl.scrollTop = ratio * Math.max(0, wEl.scrollHeight - wEl.clientHeight);
    }
  };

  const handleWysiwygPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!autoCleanOnPaste) return;
    const pastedHtml = e.clipboardData.getData('text/html');
    const pastedText = e.clipboardData.getData('text/plain');
    if (!pastedHtml && !pastedText) return;

    e.preventDefault();
    const rawToClean = pastedHtml || `<p>${pastedText.replace(/\n+/g, '</p><p>')}</p>`;
    const { html: cleanedFragment, stats } = runHtmlCleaner(rawToClean, cleaningOpts);
    document.execCommand('insertHTML', false, cleanedFragment);
    if (wysiwygRef.current) {
      const next = wysiwygRef.current.innerHTML;
      pushUndoState(sourceHtml);
      activeOrigin.current = 'wysiwyg';
      setSourceHtml(next);
    }
    onNotify(
      `Incolla intercettato e pulito (${stats.charsBefore} → ${stats.charsAfter} car.)`
    );
  };

  const execWysiwygCmd = (cmd: string, value?: string) => {
    setOpenMenu(null);
    if (!wysiwygRef.current) return;
    wysiwygRef.current.focus();
    document.execCommand(cmd, false, value);
    const updated = wysiwygRef.current.innerHTML;
    pushUndoState(sourceHtml);
    activeOrigin.current = 'wysiwyg';
    setSourceHtml(updated);
  };

  const insertHtmlSnippetInWysiwyg = (snippet: string) => {
    setOpenMenu(null);
    if (!wysiwygRef.current) return;
    wysiwygRef.current.focus();
    document.execCommand('insertHTML', false, snippet);
    const updated = wysiwygRef.current.innerHTML;
    pushUndoState(sourceHtml);
    activeOrigin.current = 'wysiwyg';
    setSourceHtml(updated);
  };

  // Table Row / Column / Delete operations inside WYSIWYG (from Screenshot 4: Table -> Cell, Row, Column, Delete table)
  const manipulateActiveTable = (
    op: 'addRowAfter' | 'delRow' | 'addColAfter' | 'delCol' | 'delTable'
  ) => {
    setOpenMenu(null);
    const sel = window.getSelection();
    const anchor =
      sel?.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (sel.anchorNode as HTMLElement)
        : sel?.anchorNode?.parentElement;
    const table =
      (anchor?.closest('table') as HTMLTableElement | null) ||
      (wysiwygRef.current?.querySelector('table') as HTMLTableElement | null);

    if (!table) {
      onNotify('Nessuna tabella trovata nel documento');
      return;
    }

    pushUndoState(sourceHtml);
    if (op === 'delTable') {
      table.remove();
    } else if (op === 'addRowAfter') {
      const rows = table.querySelectorAll('tr');
      const lastRow = rows[rows.length - 1];
      const colsCount = lastRow ? lastRow.children.length : 2;
      const newTr = document.createElement('tr');
      for (let i = 0; i < colsCount; i++) {
        const td = document.createElement('td');
        td.innerHTML = 'Nuova cella';
        newTr.appendChild(td);
      }
      (table.querySelector('tbody') || table).appendChild(newTr);
    } else if (op === 'delRow') {
      const rows = table.querySelectorAll('tr');
      if (rows.length > 1) rows[rows.length - 1].remove();
      else table.remove();
    } else if (op === 'addColAfter') {
      table.querySelectorAll('tr').forEach((tr, idx) => {
        const cellEl = document.createElement(idx === 0 && tr.querySelector('th') ? 'th' : 'td');
        cellEl.innerHTML = idx === 0 ? 'Colonna' : 'Dato';
        tr.appendChild(cellEl);
      });
    } else if (op === 'delCol') {
      table.querySelectorAll('tr').forEach((tr) => {
        if (tr.children.length > 1) {
          tr.lastElementChild?.remove();
        }
      });
    }

    if (wysiwygRef.current) {
      activeOrigin.current = 'wysiwyg';
      setSourceHtml(wysiwygRef.current.innerHTML);
    }
    onNotify('Struttura tabella aggiornata');
  };

  const handleRunFullClean = () => {
    pushUndoState(sourceHtml);
    const { html: cleaned, stats } = runHtmlCleaner(sourceHtml, cleaningOpts);
    activeOrigin.current = null;
    setSourceHtml(cleaned);
    const diff = stats.charsBefore - stats.charsAfter;
    setLastCleanSummary(
      `Pulizia completata: ${stats.charsBefore} → ${stats.charsAfter} caratteri (${
        diff >= 0 ? `-${diff}` : `+${Math.abs(diff)}`
      } car., ${stats.appliedRules.length} filtri applicati)`
    );
    onNotify('Codice HTML sanitizzato e normalizzato');
  };

  const handleRunSingleRule = (key: keyof CleaningOptions, label: string) => {
    pushUndoState(sourceHtml);
    const singleOpt: Partial<CleaningOptions> = { [key]: true };
    const { html: cleaned, stats } = runHtmlCleaner(sourceHtml, singleOpt);
    activeOrigin.current = null;
    setSourceHtml(cleaned);
    setLastCleanSummary(
      `Regola "${label}" eseguita: ${stats.charsBefore} → ${stats.charsAfter} caratteri`
    );
    onNotify(`Filtro "${label}" applicato al modello`);
  };

  const handleUndo = () => {
    setOpenMenu(null);
    if (undoStack.length === 0) {
      onNotify('Nessuna operazione precedente da annullare');
      return;
    }
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, sourceHtml]);
    setUndoStack((s) => s.slice(0, -1));
    activeOrigin.current = null;
    setSourceHtml(prev);
    onNotify('Ripristinato stato precedente (Undo)');
  };

  const handleRedo = () => {
    setOpenMenu(null);
    if (redoStack.length === 0) {
      onNotify('Nessuna operazione da ripetere');
      return;
    }
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, sourceHtml]);
    setRedoStack((r) => r.slice(0, -1));
    activeOrigin.current = null;
    setSourceHtml(next);
    onNotify('Operazione ripetuta (Redo)');
  };

  const handleNewPage = () => {
    setOpenMenu(null);
    pushUndoState(sourceHtml);
    activeOrigin.current = null;
    setSourceHtml('<p>Nuovo documento HTML pulito.</p>');
    setLastCleanSummary(null);
    onNotify('Editor svuotato');
  };

  const handleInsertLorem = () => {
    pushUndoState(sourceHtml);
    activeOrigin.current = null;
    setSourceHtml((prev) => `${prev}\n${LOREM_PARAGRAPH}`);
    onNotify('Paragrafo Lorem Ipsum aggiunto');
  };

  const handleEncodeEntities = () => {
    pushUndoState(sourceHtml);
    activeOrigin.current = null;
    setSourceHtml((prev) => encodeSpecialHtmlEntities(prev));
    onNotify('Caratteri speciali convertiti in entità HTML');
  };

  const handleIndentSource = () => {
    pushUndoState(sourceHtml);
    activeOrigin.current = null;
    setSourceHtml((prev) => formatHtmlIndentation(prev));
    onNotify('Sorgente HTML indentato e formattato');
  };

  const handleCompressSource = () => {
    pushUndoState(sourceHtml);
    activeOrigin.current = null;
    setSourceHtml((prev) => compressHtmlSource(prev));
    onNotify('Sorgente HTML compresso su singola riga');
  };

  const handleCopySource = () => {
    navigator.clipboard?.writeText(sourceHtml);
    onNotify('Sorgente HTML copiato negli appunti');
  };

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      pushUndoState(sourceHtml);
      activeOrigin.current = null;
      setSourceHtml(content);
      onNotify(`File "${file.name}" importato nell'editor`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadDemo = () => {
    setOpenMenu(null);
    pushUndoState(sourceHtml);
    activeOrigin.current = null;
    setSourceHtml(DEMO_DIRTY_HTML);
    setLastCleanSummary(null);
    onNotify('Documento Demo caricato');
  };

  const handleDownloadHtml = () => {
    setOpenMenu(null);
    const blob = new Blob([sourceHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documento-pulito.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onNotify('File documento-pulito.html scaricato');
  };

  const handleDownloadDoc = () => {
    setOpenMenu(null);
    const wordDocContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Export Doc</title></head><body>${sourceHtml}</body></html>`;
    const blob = new Blob([wordDocContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documento-esportato.doc';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onNotify('Documento Word (.doc) esportato');
  };

  const handleRunSingleFindRule = (rule: FindReplaceRule) => {
    pushUndoState(sourceHtml);
    const { result, totalMatches, error } = applyFindReplaceRules(sourceHtml, [rule]);
    if (error) {
      setRegexMatchInfo(error);
      return;
    }
    activeOrigin.current = null;
    setSourceHtml(result);
    setRegexMatchInfo(`${totalMatches} occorrenze sostituite`);
    onNotify(`Find & Replace: ${totalMatches} sostituzioni eseguite`);
  };

  const handleRunAllFindRules = () => {
    pushUndoState(sourceHtml);
    const { result, totalMatches, error } = applyFindReplaceRules(sourceHtml, findRules);
    if (error) {
      setRegexMatchInfo(error);
      return;
    }
    activeOrigin.current = null;
    setSourceHtml(result);
    setRegexMatchInfo(`Totale: ${totalMatches} occorrenze sostituite su ${findRules.length} regole`);
    onNotify(`Eseguite tutte le regole Find & Replace (${totalMatches} match)`);
  };

  // Line numbers array for Source Editor (matching the screenshot line gutter)
  const sourceLinesCount = Math.max(1, sourceHtml.split('\n').length);

  const plainTextWords = sourceHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const isLargeDocument = sourceHtml.length > 30000;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-100 p-4 overflow-y-auto space-y-4'
          : 'space-y-6'
      }
    >
      {/* Architecture Explainer Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Architettura Dual-View Sincronizzata</span>
            <span aria-hidden="true">·</span>
            <span>Menu File/Edit/Insert/View/Format/Table/Tools + HTML Cleaner</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Split View: Editor Visivo WYSIWYG, Sorgente Numerato &amp; Sanitizzazione
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoCleanOnPaste}
              onChange={(e) => setAutoCleanOnPaste(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Pulisci su Incolla (onpaste)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowLiveSandbox(!showLiveSandbox)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              showLiveSandbox
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showLiveSandbox ? 'Nascondi Preview' : 'Preview Isolata'}</span>
          </button>
          {isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg cursor-pointer"
            >
              Esci da Schermo Intero
            </button>
          )}
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Classic Menu Bar + WYSIWYG Visual Editor + Under the WYSIWYG Controls */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl overflow-visible flex flex-col shadow-2xs">
            {/* Classic Menu Bar (File, Edit, Insert, View, Format, Table, Tools) exactly as in the 5 screenshots */}
            <div
              ref={menuContainerRef}
              className="px-2 py-1 bg-white border-b border-slate-200 flex flex-wrap items-center gap-0.5 text-xs relative z-20 rounded-t-xl"
            >
              {/* FILE MENU */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
                  className="px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>File</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {openMenu === 'file' && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
                    <button
                      type="button"
                      onClick={handleNewPage}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      <FilePlus className="w-3.5 h-3.5 text-slate-500" />
                      <span>New document</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                      <span>Open HTML / Doc...</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadDemo}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Load Demo text</span>
                    </button>
                    <hr className="my-1 border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        window.print();
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Print...</span>
                    </button>
                  </div>
                )}
              </div>

              {/* EDIT MENU */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
                  className="px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Edit</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {openMenu === 'edit' && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                    >
                      <span>Undo</span>
                      <span className="text-[10px] text-slate-400">Ctrl+Z</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                    >
                      <span>Redo</span>
                      <span className="text-[10px] text-slate-400">Ctrl+Y</span>
                    </button>
                    <hr className="my-1 border-slate-100" />
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('selectAll')}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                    >
                      <span>Select all</span>
                      <span className="text-[10px] text-slate-400">Ctrl+A</span>
                    </button>
                  </div>
                )}
              </div>

              {/* INSERT MENU (Screenshot 1: Insert video, image, link, Special character, Horizontal line, Anchor, Date/time, Nonbreaking space) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'insert' ? null : 'insert')}
                  className="px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Insert</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {openMenu === 'insert' && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        setModalInput1('https://www.w3schools.com/html/mov_bbb.mp4');
                        setActiveInsertModal('video');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5 text-slate-500" />
                      <span>Insert/edit video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        setModalInput1('https://');
                        setModalInput2('Descrizione immagine');
                        setActiveInsertModal('image');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Insert/edit image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        setModalInput1('https://developer.mozilla.org');
                        setModalInput2('Approfondimento');
                        setActiveInsertModal('link');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>Insert/edit link</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Ctrl+K</span>
                    </button>
                    <hr className="my-1 border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        setActiveInsertModal('specialchar');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <span className="font-serif font-bold w-3.5 text-center text-slate-600">
                        Ω
                      </span>
                      <span>Special character</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlSnippetInWysiwyg('<hr />')}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <span className="w-3.5 text-center text-slate-500">—</span>
                      <span>Horizontal line</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        setModalInput1('sezione-ancora');
                        setActiveInsertModal('anchor');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                      <span>Anchor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertHtmlSnippetInWysiwyg(
                          `<time datetime="${new Date().toISOString()}">${new Date().toLocaleString('it-IT')}</time>`
                        )
                      }
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Insert date/time</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlSnippetInWysiwyg('&nbsp;')}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <span className="w-3.5 text-center font-mono text-[10px] text-slate-500">
                        ␣
                      </span>
                      <span>Nonbreaking space</span>
                    </button>
                  </div>
                )}
              </div>

              {/* VIEW MENU (Screenshot 2: Show invisible characters, Show blocks, Visual aids, Preview, Fullscreen) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
                  className="px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>View</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {openMenu === 'view' && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInvisibleChars(!showInvisibleChars);
                        setOpenMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                    >
                      <span>Show invisible characters</span>
                      {showInvisibleChars && <span className="text-blue-600 font-bold">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBlocksOutline(!showBlocksOutline);
                        setOpenMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                    >
                      <span>Show blocks</span>
                      {showBlocksOutline && <span className="text-blue-600 font-bold">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVisualAids(!visualAids);
                        setOpenMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                    >
                      <span>Visual aids</span>
                      {visualAids && <span className="text-blue-600 font-bold">✓</span>}
                    </button>
                    <hr className="my-1 border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowLiveSandbox(true);
                        setOpenMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFullscreen(!isFullscreen);
                        setOpenMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Fullscreen</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Ctrl+Alt+F</span>
                    </button>
                  </div>
                )}
              </div>

              {/* FORMAT MENU (Screenshot 3: Bold, Italic, Underline, Strikethrough, Superscript, Subscript, Formats -> H1..H4, Paragraph, Block Quote, Red/Green/Blue text, Clear formatting) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'format' ? null : 'format')}
                  className="px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Format</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {openMenu === 'format' && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('bold')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 flex justify-between cursor-pointer"
                    >
                      <span><b>B</b> Bold</span>
                      <span className="text-[10px] text-slate-400">Ctrl+B</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('italic')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 flex justify-between cursor-pointer"
                    >
                      <span><i>I</i> Italic</span>
                      <span className="text-[10px] text-slate-400">Ctrl+I</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('underline')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 flex justify-between cursor-pointer"
                    >
                      <span><u>U</u> Underline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('strikeThrough')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 flex justify-between cursor-pointer"
                    >
                      <span><s>S</s> Strikethrough</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('superscript')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 flex justify-between cursor-pointer"
                    >
                      <span>x² Superscript</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('subscript')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 flex justify-between cursor-pointer"
                    >
                      <span>x₂ Subscript</span>
                    </button>
                    <hr className="my-1 border-slate-100" />
                    <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">
                      Formats
                    </div>
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('formatBlock', 'H1')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 font-bold text-base cursor-pointer"
                    >
                      Heading 1
                    </button>
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('formatBlock', 'H2')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 font-bold text-sm cursor-pointer"
                    >
                      Heading 2
                    </button>
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('formatBlock', 'H3')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 font-bold text-xs cursor-pointer"
                    >
                      Heading 3
                    </button>
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('formatBlock', 'P')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 cursor-pointer"
                    >
                      Paragraph
                    </button>
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('formatBlock', 'BLOCKQUOTE')}
                      className="w-full px-3 py-1 text-left hover:bg-slate-100 italic text-slate-600 cursor-pointer"
                    >
                      Block Quote
                    </button>
                    <div className="flex items-center gap-1 px-3 py-1">
                      <button
                        type="button"
                        onClick={() => execWysiwygCmd('foreColor', '#dc2626')}
                        className="px-2 py-0.5 text-[11px] font-semibold text-red-600 bg-red-50 rounded cursor-pointer"
                      >
                        Red text
                      </button>
                      <button
                        type="button"
                        onClick={() => execWysiwygCmd('foreColor', '#16a34a')}
                        className="px-2 py-0.5 text-[11px] font-semibold text-green-600 bg-green-50 rounded cursor-pointer"
                      >
                        Green text
                      </button>
                      <button
                        type="button"
                        onClick={() => execWysiwygCmd('foreColor', '#2563eb')}
                        className="px-2 py-0.5 text-[11px] font-semibold text-blue-600 bg-blue-50 rounded cursor-pointer"
                      >
                        Blue text
                      </button>
                    </div>
                    <hr className="my-1 border-slate-100" />
                    <button
                      type="button"
                      onClick={() => execWysiwygCmd('removeFormat')}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      <Eraser className="w-3.5 h-3.5 text-slate-500" />
                      <span>Clear formatting</span>
                    </button>
                  </div>
                )}
              </div>

              {/* TABLE MENU (Screenshot 4: Insert table grid, Row, Column, Delete table) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'table' ? null : 'table')}
                  className="px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Table</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {openMenu === 'table' && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 z-30 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-700 flex justify-between">
                      <span>Insert table</span>
                      <span className="font-mono text-blue-600">
                        {hoverTableRows} × {hoverTableCols}
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-1 p-1 bg-slate-50 rounded border border-slate-200">
                      {Array.from({ length: 6 }).map((_, rIdx) =>
                        Array.from({ length: 6 }).map((__, cIdx) => {
                          const r = rIdx + 1;
                          const c = cIdx + 1;
                          const active = r <= hoverTableRows && c <= hoverTableCols;
                          return (
                            <button
                              key={`${r}-${c}`}
                              type="button"
                              onMouseEnter={() => {
                                setHoverTableRows(r);
                                setHoverTableCols(c);
                              }}
                              onClick={() => {
                                const rowsHtml = Array.from({ length: r })
                                  .map(
                                    (_, ri) =>
                                      `<tr>${Array.from({ length: c })
                                        .map((__, ci) =>
                                          ri === 0
                                            ? `<th>Intestazione ${ci + 1}</th>`
                                            : `<td>Cella ${ri},${ci + 1}</td>`
                                        )
                                        .join('')}</tr>`
                                  )
                                  .join('');
                                insertHtmlSnippetInWysiwyg(
                                  `<table><tbody>${rowsHtml}</tbody></table><p></p>`
                                );
                              }}
                              className={`h-4 w-full rounded-xs border cursor-pointer ${
                                active
                                  ? 'bg-blue-500 border-blue-600'
                                  : 'bg-white border-slate-300'
                              }`}
                            />
                          );
                        })
                      )}
                    </div>
                    <hr className="border-slate-100" />
                    <button
                      type="button"
                      onClick={() => manipulateActiveTable('addRowAfter')}
                      className="w-full px-2 py-1 text-left hover:bg-slate-100 rounded cursor-pointer"
                    >
                      Row → Insert row after
                    </button>
                    <button
                      type="button"
                      onClick={() => manipulateActiveTable('delRow')}
                      className="w-full px-2 py-1 text-left hover:bg-slate-100 rounded cursor-pointer"
                    >
                      Row → Delete last row
                    </button>
                    <button
                      type="button"
                      onClick={() => manipulateActiveTable('addColAfter')}
                      className="w-full px-2 py-1 text-left hover:bg-slate-100 rounded cursor-pointer"
                    >
                      Column → Insert column after
                    </button>
                    <button
                      type="button"
                      onClick={() => manipulateActiveTable('delCol')}
                      className="w-full px-2 py-1 text-left hover:bg-slate-100 rounded cursor-pointer"
                    >
                      Column → Delete last column
                    </button>
                    <button
                      type="button"
                      onClick={() => manipulateActiveTable('delTable')}
                      className="w-full px-2 py-1 text-left text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    >
                      Delete table
                    </button>
                  </div>
                )}
              </div>

              {/* TOOLS MENU (Screenshot 5: Tools -> <> Source code) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'tools' ? null : 'tools')}
                  className="px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Tools</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {openMenu === 'tools' && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        setModalInput1(sourceHtml);
                        setActiveInsertModal('sourcecode');
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>&lt;&gt; Source code</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* WYSIWYG Icon Formatting Toolbar */}
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                title="Undo"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                title="Redo"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalInput1(sourceHtml);
                  setActiveInsertModal('sourcecode');
                }}
                title="Source code modal"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
              </button>

              <span className="h-4 w-px bg-slate-300 mx-0.5" aria-hidden="true" />

              <select
                aria-label="Formats"
                onChange={(e) => {
                  if (e.target.value) {
                    execWysiwygCmd('formatBlock', e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded text-slate-700 mr-1 cursor-pointer"
              >
                <option value="" disabled>
                  Formats
                </option>
                <option value="H1">Heading 1</option>
                <option value="H2">Heading 2</option>
                <option value="H3">Heading 3</option>
                <option value="P">Paragraph</option>
                <option value="BLOCKQUOTE">Blockquote</option>
              </select>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('bold')}
                title="Bold"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('italic')}
                title="Italic"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('underline')}
                title="Underline"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('strikeThrough')}
                title="Strikethrough"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <span className="h-4 w-px bg-slate-300 mx-0.5" aria-hidden="true" />

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('justifyLeft')}
                title="Align left"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('justifyCenter')}
                title="Align center"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('justifyRight')}
                title="Align right"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>

              <span className="h-4 w-px bg-slate-300 mx-0.5" aria-hidden="true" />

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('insertUnorderedList')}
                title="Bullet list"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('insertOrderedList')}
                title="Numbered list"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              {/* Foreground & Background Color Pickers */}
              <label
                title="Text color"
                className="px-1.5 py-1 hover:bg-slate-200 rounded cursor-pointer flex items-center text-xs font-bold text-slate-700"
              >
                <span>A</span>
                <input
                  type="color"
                  defaultValue="#2b579a"
                  onChange={(e) => execWysiwygCmd('foreColor', e.target.value)}
                  className="w-3.5 h-3.5 ml-0.5 border-0 p-0 cursor-pointer"
                />
              </label>
              <label
                title="Background color"
                className="px-1.5 py-1 hover:bg-slate-200 rounded cursor-pointer flex items-center text-xs font-bold text-slate-700"
              >
                <span className="bg-yellow-200 px-1 rounded-xs">A</span>
                <input
                  type="color"
                  defaultValue="#fef08a"
                  onChange={(e) => execWysiwygCmd('hiliteColor', e.target.value)}
                  className="w-3.5 h-3.5 ml-0.5 border-0 p-0 cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setModalInput1('https://developer.mozilla.org');
                  setModalInput2('Link');
                  setActiveInsertModal('link');
                }}
                title="Insert link"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalInput1('https://');
                  setModalInput2('Immagine');
                  setActiveInsertModal('image');
                }}
                title="Insert image"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveInsertModal('specialchar')}
                title="Special character (Ω)"
                className="px-2 py-1 text-xs font-serif font-bold text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                Ω
              </button>
            </div>

            {/* Editable WYSIWYG Surface with View Aids support */}
            <div
              ref={wysiwygRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleWysiwygInput}
              onPaste={handleWysiwygPaste}
              onScroll={() => handleScroll('wysiwyg')}
              className={`p-5 min-h-[420px] max-h-[480px] overflow-y-auto outline-none prose prose-slate max-w-none text-sm leading-relaxed focus:bg-blue-50/15 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_p]:mb-2.5 [&_table]:w-full [&_table]:border-collapse [&_a]:text-blue-600 [&_a]:underline ${
                visualAids
                  ? '[&_td]:border [&_td]:border-dashed [&_td]:border-slate-400 [&_td]:p-1.5 [&_th]:border [&_th]:border-dashed [&_th]:border-slate-400 [&_th]:p-1.5'
                  : '[&_td]:p-1.5 [&_th]:p-1.5'
              } ${
                showBlocksOutline
                  ? '[&_p]:border [&_p]:border-dashed [&_p]:border-sky-300 [&_p]:p-1 [&_h1]:border [&_h1]:border-dashed [&_h1]:border-indigo-300 [&_h2]:border [&_h2]:border-dashed [&_h2]:border-indigo-300 [&_div]:border [&_div]:border-dashed [&_div]:border-amber-300'
                  : ''
              }`}
            />

            {/* Bottom Status Bar inside WYSIWYG */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums rounded-b-xl">
              <div className="flex items-center gap-2">
                <span>DOM (contenteditable)</span>
                {showBlocksOutline && (
                  <span className="text-[10px] text-sky-700">· Blocchi visibili</span>
                )}
                {showInvisibleChars && (
                  <span className="text-[10px] text-amber-700">
                    · Spazi &amp;nbsp;: {(sourceHtml.match(/&nbsp;/g) || []).length}
                  </span>
                )}
              </div>
              <span>Words: {plainTextWords}</span>
            </div>
          </div>

          {/* Under the WYSIWYG Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.txt,.doc"
                onChange={handleOpenFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FolderOpen className="w-4 h-4 text-amber-700" />
                <span>Open Doc or HTML</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Demo</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>HTML</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDoc}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Docx</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">
                  Controllo Performance &amp; Debouncing (120ms):
                </span>{' '}
                {isLargeDocument
                  ? 'Attenzione: il documento supera i 30.000 caratteri.'
                  : 'I documenti molto grandi sono gestiti con debounce per evitare il blocco del browser durante il parsing continuo tra DOM e sorgente.'}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Above the Source Toolbar + Numbered Source Code Editor + Cleaning Options + Find & Replace */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-2xs">
            {/* Above the Source Control Bar + Prominent Red Clean Button */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs font-mono font-semibold text-slate-700 mr-2 tabular-nums">
                  Source: {sourceHtml.length}
                </span>

                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  title="Undo"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNewPage}
                  title="New page"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleInsertLorem}
                  title="Lipsum"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleEncodeEntities}
                  title="Encoding"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleIndentSource}
                  title="Indentation"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCompressSource}
                  title="Compress"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCopySource}
                  title="Copy"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleRunFullClean}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Clean</span>
              </button>
            </div>

            {/* Source Code Editor with Line Numbers Gutter */}
            <div className="relative flex-1 flex bg-slate-950 min-h-[420px] max-h-[480px] overflow-hidden">
              <div
                aria-hidden="true"
                className="py-4 px-2.5 bg-slate-900 text-slate-500 font-mono text-xs leading-relaxed text-right select-none border-r border-slate-800 overflow-hidden shrink-0 tabular-nums"
              >
                {Array.from({ length: Math.min(sourceLinesCount, 200) }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                ref={sourceTextareaRef}
                value={sourceHtml}
                onChange={(e) => handleSourceChange(e.target.value)}
                onScroll={() => handleScroll('source')}
                spellCheck={false}
                aria-label="Editor Codice Sorgente HTML"
                className="w-full flex-1 p-4 font-mono text-xs leading-relaxed bg-slate-950 text-emerald-300 outline-none resize-none overflow-y-auto selection:bg-blue-600 selection:text-white"
              />
            </div>

            {/* Source Status Footer */}
            <div className="px-4 py-2 bg-slate-900 text-slate-400 border-t border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums">
              <span>Righe: {sourceLinesCount}</span>
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px]">
                <input
                  type="checkbox"
                  checked={autoScrollSync}
                  onChange={(e) => setAutoScrollSync(e.target.checked)}
                  className="rounded border-slate-700 text-blue-500"
                />
                <span>Auto scroll sync</span>
              </label>
            </div>
          </div>

          {/* Cleaning Options Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Cleaning options (Sanitizzazione e Normalizzazione)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Attiva le regole per il tasto <strong>Clean</strong> o clicca <Play className="w-2.5 h-2.5 inline" /> per eseguire subito una regola singola.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCleaningOpts(DEFAULT_CLEANING_OPTIONS)}
                className="text-xs text-blue-600 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                Default setup
              </button>
            </div>

            {lastCleanSummary && (
              <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
                <span>{lastCleanSummary}</span>
                <button
                  type="button"
                  onClick={() => setLastCleanSummary(null)}
                  className="text-emerald-700 hover:underline text-[11px] ml-2 cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CLEANING_OPTION_META.map((item) => (
                <div
                  key={item.key}
                  title={item.desc}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-colors"
                >
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none truncate">
                    <input
                      type="checkbox"
                      checked={cleaningOpts[item.key]}
                      onChange={(e) =>
                        setCleaningOpts((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">{item.label}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRunSingleRule(item.key, item.label)}
                    title={`Esegui subito solo "${item.label}"`}
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-white cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Find & Replace (Source Editor) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900">
                  Find &amp; replace (source editor)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (findRules.length >= 10) return;
                    setFindRules((prev) => [
                      ...prev,
                      {
                        id: 'rule_' + Date.now(),
                        find: '',
                        replace: '',
                        useRegex: false,
                        ignoreCase: true,
                      },
                    ]);
                  }}
                  title="Aggiungi regola Find & Replace"
                  className="p-1 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRunAllFindRules}
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-3 h-3" />
                  <span>Esegui Tutte</span>
                </button>
              </div>

              {regexMatchInfo && (
                <span className="text-[11px] font-mono text-slate-600">
                  {regexMatchInfo}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {findRules.map((rule) => (
                <div
                  key={rule.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200"
                >
                  <input
                    type="text"
                    value={rule.find}
                    onChange={(e) =>
                      setFindRules((prev) =>
                        prev.map((r) => (r.id === rule.id ? { ...r, find: e.target.value } : r))
                      )
                    }
                    placeholder="Find"
                    className="sm:col-span-4 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    value={rule.replace}
                    onChange={(e) =>
                      setFindRules((prev) =>
                        prev.map((r) => (r.id === rule.id ? { ...r, replace: e.target.value } : r))
                      )
                    }
                    placeholder="Replace with"
                    className="sm:col-span-4 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                  />

                  <div className="sm:col-span-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-700">
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rule.useRegex}
                          onChange={(e) =>
                            setFindRules((prev) =>
                              prev.map((r) =>
                                r.id === rule.id ? { ...r, useRegex: e.target.checked } : r
                              )
                            )
                          }
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span>Regex</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rule.ignoreCase}
                          onChange={(e) =>
                            setFindRules((prev) =>
                              prev.map((r) =>
                                r.id === rule.id ? { ...r, ignoreCase: e.target.checked } : r
                              )
                            )
                          }
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span>Ignore case</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRunSingleFindRule(rule)}
                        className="px-2 py-1 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded cursor-pointer"
                      >
                        →
                      </button>
                      {findRules.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setFindRules((prev) => prev.filter((r) => r.id !== rule.id))
                          }
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Optional 3rd View: Isolated Live Sandbox Preview */}
      {showLiveSandbox && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900 text-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold">
              Terza Vista: Target Isolato (&lt;iframe sandbox srcdoc&gt;)
            </span>
            <span className="font-mono text-emerald-400">Esecuzione sicura</span>
          </div>
          <iframe
            title="Sandbox Anteprima Codice Pulito"
            sandbox="allow-scripts allow-modals"
            srcDoc={`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;max-width:740px;margin:1.5rem auto;padding:0 1rem;line-height:1.6;color:#0f172a;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #cbd5e1;padding:0.5rem;}</style></head><body>${sourceHtml}</body></html>`}
            className="w-full h-64 border-0 bg-white"
          />
        </div>
      )}

      {/* MODALS FOR MENU ACTIONS (Insert Link, Image, Video, Anchor, Special Character, Source Code) */}
      {activeInsertModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                {activeInsertModal === 'link' && 'Insert/edit link'}
                {activeInsertModal === 'image' && 'Insert/edit image'}
                {activeInsertModal === 'video' && 'Insert/edit video'}
                {activeInsertModal === 'anchor' && 'Insert Anchor (ID)'}
                {activeInsertModal === 'specialchar' && 'Select Special Character (Ω)'}
                {activeInsertModal === 'sourcecode' && 'Tools → <> Source code'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveInsertModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeInsertModal === 'specialchar' && (
              <div className="grid grid-cols-9 gap-1.5">
                {SPECIAL_CHARS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      insertHtmlSnippetInWysiwyg(ch);
                      setActiveInsertModal(null);
                    }}
                    className="p-2 text-sm font-mono bg-slate-50 hover:bg-blue-600 hover:text-white border border-slate-200 rounded text-center cursor-pointer"
                  >
                    {ch}
                  </button>
                ))}
              </div>
            )}

            {activeInsertModal === 'sourcecode' && (
              <div className="space-y-3">
                <textarea
                  rows={12}
                  value={modalInput1}
                  onChange={(e) => setModalInput1(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-slate-950 text-emerald-300 rounded-lg border border-slate-800"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveInsertModal(null)}
                    className="px-3 py-1.5 text-xs bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      pushUndoState(sourceHtml);
                      activeOrigin.current = null;
                      setSourceHtml(modalInput1);
                      setActiveInsertModal(null);
                      onNotify('Codice sorgente aggiornato');
                    }}
                    className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg cursor-pointer"
                  >
                    Ok
                  </button>
                </div>
              </div>
            )}

            {(activeInsertModal === 'link' ||
              activeInsertModal === 'image' ||
              activeInsertModal === 'video' ||
              activeInsertModal === 'anchor') && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (activeInsertModal === 'link') {
                    insertHtmlSnippetInWysiwyg(
                      `<a href="${modalInput1}" target="_blank" rel="noopener noreferrer">${modalInput2 || modalInput1}</a>`
                    );
                  } else if (activeInsertModal === 'image') {
                    insertHtmlSnippetInWysiwyg(
                      `<img src="${modalInput1}" alt="${modalInput2 || 'Immagine'}" style="max-width:100%;height:auto;" />`
                    );
                  } else if (activeInsertModal === 'video') {
                    insertHtmlSnippetInWysiwyg(
                      `<video controls src="${modalInput1}" style="max-width:100%;border-radius:6px;"></video>`
                    );
                  } else if (activeInsertModal === 'anchor') {
                    const cleanId = modalInput1.replace(/[^a-zA-Z0-9_-]/g, '');
                    insertHtmlSnippetInWysiwyg(`<a id="${cleanId}" name="${cleanId}"></a>`);
                  }
                  setActiveInsertModal(null);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {activeInsertModal === 'anchor' ? 'ID Ancora (es. capitolo-1)' : 'URL / Sorgente'}
                  </label>
                  <input
                    type="text"
                    value={modalInput1}
                    onChange={(e) => setModalInput1(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                    autoFocus
                  />
                </div>
                {(activeInsertModal === 'link' || activeInsertModal === 'image') && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {activeInsertModal === 'link' ? 'Testo da mostrare' : 'Testo alternativo (alt)'}
                    </label>
                    <input
                      type="text"
                      value={modalInput2}
                      onChange={(e) => setModalInput2(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveInsertModal(null)}
                    className="px-3 py-1.5 text-xs bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg cursor-pointer"
                  >
                    Inserisci
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
