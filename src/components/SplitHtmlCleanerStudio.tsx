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
  Link as LinkIcon,
  Table as TableIcon,
  Undo2,
  FilePlus,
  Type,
  Code2,
  AlignJustify,
  Minimize2,
  Copy,
  Sparkles,
  Play,
  Plus,
  Trash2,
  FolderOpen,
  Download,
  FileText,
  Check,
  AlertTriangle,
  Eye,
  Wand2,
} from 'lucide-react';

interface SplitHtmlCleanerStudioProps {
  onNotify: (msg: string) => void;
  onSyncToSandboxPreview?: (cleanHtml: string) => void;
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

const LOREM_PARAGRAPH = `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>`;

export const SplitHtmlCleanerStudio: React.FC<SplitHtmlCleanerStudioProps> = ({
  onNotify,
  onSyncToSandboxPreview,
}) => {
  const [sourceHtml, setSourceHtml] = useState<string>(DEMO_DIRTY_HTML);
  const [undoStack, setUndoStack] = useState<string[]>([DEMO_DIRTY_HTML]);
  const [cleaningOpts, setCleaningOpts] = useState<CleaningOptions>(DEFAULT_CLEANING_OPTIONS);
  const [autoCleanOnPaste, setAutoCleanOnPaste] = useState<boolean>(true);
  const [autoScrollSync, setAutoScrollSync] = useState<boolean>(true);
  const [lastCleanSummary, setLastCleanSummary] = useState<string | null>(null);
  const [showLiveSandbox, setShowLiveSandbox] = useState<boolean>(false);

  // Find & Replace rules state (supports up to 10 rules, regex & ignoreCase)
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

  // Prevent infinite feedback loops during bidirectional sync
  const activeOrigin = useRef<'wysiwyg' | 'source' | null>(null);
  const debounceTimer = useRef<number | null>(null);

  // Push state to Undo history
  const pushUndoState = (nextHtml: string) => {
    setUndoStack((prev) => {
      if (prev[prev.length - 1] === nextHtml) return prev;
      return [...prev.slice(-19), nextHtml];
    });
  };

  // Sync initial or programmatic sourceHtml changes into WYSIWYG DOM
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

  // Handle typing inside Left WYSIWYG Editor -> debounced serialization to Right Source Editor
  const handleWysiwygInput = () => {
    if (!wysiwygRef.current) return;
    const currentDomHtml = wysiwygRef.current.innerHTML;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      activeOrigin.current = 'wysiwyg';
      pushUndoState(sourceHtml);
      setSourceHtml(currentDomHtml);
      onSyncToSandboxPreview?.(currentDomHtml);
    }, 120);
  };

  // Handle typing inside Right Source Editor -> debounced parsing into Left WYSIWYG DOM
  const handleSourceChange = (val: string) => {
    activeOrigin.current = 'source';
    setSourceHtml(val);
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      if (wysiwygRef.current && wysiwygRef.current.innerHTML !== val) {
        wysiwygRef.current.innerHTML = val;
      }
      onSyncToSandboxPreview?.(val);
    }, 120);
  };

  // Synchronized scrolling between WYSIWYG and Source panels
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

  // Intercept Paste in WYSIWYG (Word / Google Docs / AI paste sanitizer)
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

  // Execute WYSIWYG formatting command
  const execWysiwygCmd = (cmd: string, value?: string) => {
    if (!wysiwygRef.current) return;
    wysiwygRef.current.focus();
    document.execCommand(cmd, false, value);
    const updated = wysiwygRef.current.innerHTML;
    pushUndoState(sourceHtml);
    activeOrigin.current = 'wysiwyg';
    setSourceHtml(updated);
  };

  // Run all active Cleaning Options ("Clean" primary button)
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

  // Run a single cleaning rule on demand (triangleright icon next to each checkbox)
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

  // Above the Source Toolbar Actions
  const handleUndo = () => {
    if (undoStack.length === 0) {
      onNotify('Nessuna operazione precedente da annullare');
      return;
    }
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    activeOrigin.current = null;
    setSourceHtml(prev);
    onNotify('Ripristinato stato precedente (Undo)');
  };

  const handleNewPage = () => {
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

  // Under the WYSIWYG File / Export Actions
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
    pushUndoState(sourceHtml);
    activeOrigin.current = null;
    setSourceHtml(DEMO_DIRTY_HTML);
    setLastCleanSummary(null);
    onNotify('Documento Demo (con stili inline e artefatti Word/AI) caricato');
  };

  const handleDownloadHtml = () => {
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

  // Find & Replace execution
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

  // Word count & character telemetry
  const plainTextWords = sourceHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const isLargeDocument = sourceHtml.length > 30000;

  return (
    <div className="space-y-6">
      {/* Architecture Explainer Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Architettura Dual-View Sincronizzata</span>
            <span aria-hidden="true">·</span>
            <span>DOM (WYSIWYG) ↔ Parser ↔ Sorgente HTML ↔ Sanitizzazione</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Split View: Editor Visivo WYSIWYG, Sorgente Live &amp; HTML Cleaner
          </h2>
          <p className="text-xs text-slate-600 max-w-3xl">
            Modifica a sinistra usando i controlli visivi (<code className="font-mono">contenteditable</code>) o modifica a destra il codice sorgente puro: il listener bidirezionale con <em>debouncing</em> di 120ms mantiene DOM e testo sincronizzati, mentre il motore <strong>Clean</strong> rimuove stili inline, classi superflue e caratteri nascosti generati da Word o AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoCleanOnPaste}
              onChange={(e) => setAutoCleanOnPaste(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Pulisci automaticamente su Incolla (onpaste)</span>
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
            <span>{showLiveSandbox ? 'Nascondi Sandbox Isolato' : 'Mostra Sandbox Isolato'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Left (WYSIWYG + File/Export) | Right (Source + Cleaner + Regex Find/Replace) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: WYSIWYG Visual Editor + Under the WYSIWYG Controls */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-2xs">
            {/* WYSIWYG Formatting Toolbar */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1">
              <select
                aria-label="Formato blocco"
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
                  Formato...
                </option>
                <option value="H1">Titolo H1</option>
                <option value="H2">Titolo H2</option>
                <option value="H3">Titolo H3</option>
                <option value="P">Paragrafo ¶</option>
                <option value="BLOCKQUOTE">Citazione</option>
              </select>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('bold')}
                title="Grassetto"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('italic')}
                title="Corsivo"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('underline')}
                title="Sottolineato"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('strikeThrough')}
                title="Barrato"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <span className="h-4 w-px bg-slate-300 mx-1" aria-hidden="true" />

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('justifyLeft')}
                title="Allinea a sinistra"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('justifyCenter')}
                title="Centra"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('justifyRight')}
                title="Allinea a destra"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>

              <span className="h-4 w-px bg-slate-300 mx-1" aria-hidden="true" />

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('insertUnorderedList')}
                title="Elenco puntato"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('insertOrderedList')}
                title="Elenco numerato"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  execWysiwygCmd(
                    'insertHTML',
                    '<table><thead><tr><th>Intestazione 1</th><th>Intestazione 2</th></tr></thead><tbody><tr><td>Cella A</td><td>Cella B</td></tr></tbody></table>'
                  )
                }
                title="Inserisci Tabella"
                className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execWysiwygCmd('removeFormat')}
                title="Rimuovi formattazione selezione"
                className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 rounded ml-auto cursor-pointer whitespace-nowrap shrink-0"
              >
                Pulisci Selezione
              </button>
            </div>

            {/* Editable WYSIWYG Surface */}
            <div
              ref={wysiwygRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleWysiwygInput}
              onPaste={handleWysiwygPaste}
              onScroll={() => handleScroll('wysiwyg')}
              className="p-5 min-h-[420px] max-h-[480px] overflow-y-auto outline-none prose prose-slate max-w-none text-sm leading-relaxed focus:bg-blue-50/15 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_p]:mb-2.5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-1.5 [&_th]:border [&_th]:border-slate-300 [&_th]:p-1.5 [&_a]:text-blue-600 [&_a]:underline"
            />

            {/* Bottom Status Bar inside WYSIWYG */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
              <span>Vista DOM (contenteditable)</span>
              <span>Words: {plainTextWords}</span>
            </div>
          </div>

          {/* Under the WYSIWYG Controls: Open Doc/HTML, Demo, HTML, Docx */}
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
                  <span>Demo Sporco</span>
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
                  <span>Docx / Word</span>
                </button>
              </div>
            </div>

            {/* Performance & Debouncing Note from Screenshot */}
            <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">
                  Sincronizzazione Debounced (120ms) &amp; Controllo Dimensione:
                </span>{' '}
                Mantenere allineati il DOM visivo, l&apos;editor sorgente e l&apos;anteprima richiede parsing bidirezionale continuo.{' '}
                {isLargeDocument
                  ? 'Attenzione: il documento supera i 30.000 caratteri.'
                  : 'I documenti molto grandi vengono gestiti con debounce per non bloccare mai il thread principale del browser.'}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Above the Source Toolbar + Source Code Editor + Cleaning Options + Find & Replace */}
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
                  title="Undo: annulla l'ultima pulizia o modifica sorgente"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNewPage}
                  title="New page: svuota l'editor"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleInsertLorem}
                  title="Lipsum: aggiungi paragrafo Lorem Ipsum"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleEncodeEntities}
                  title="Encoding: converti caratteri speciali in entità HTML"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleIndentSource}
                  title="Indentation: formatta e indenta i tag HTML"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCompressSource}
                  title="Compress: rimuovi a capo e commenti"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCopySource}
                  title="Copy: copia il codice negli appunti"
                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Primary Clean Action Button */}
              <button
                type="button"
                onClick={handleRunFullClean}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Clean</span>
              </button>
            </div>

            {/* Source Code Editor (Right Pane) */}
            <div className="relative flex-1 bg-slate-950">
              <textarea
                ref={sourceTextareaRef}
                value={sourceHtml}
                onChange={(e) => handleSourceChange(e.target.value)}
                onScroll={() => handleScroll('source')}
                spellCheck={false}
                aria-label="Editor Codice Sorgente HTML"
                className="w-full min-h-[420px] max-h-[480px] p-4 font-mono text-xs leading-relaxed bg-slate-950 text-emerald-300 outline-none resize-y selection:bg-blue-600 selection:text-white"
              />
            </div>

            {/* Source Status Footer */}
            <div className="px-4 py-2 bg-slate-900 text-slate-400 border-t border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums">
              <span>Livello 5: Sorgente Testuale HTML</span>
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

          {/* Cleaning Options Matrix (10 checkboxes + individual instant run buttons) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Cleaning options (Livello di Validazione e Sanitizzazione)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Seleziona le regole per il pulsante <strong>Clean</strong> oppure clicca <Play className="w-2.5 h-2.5 inline" /> a destra di una voce per eseguire solo quella regola.
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

          {/* Find & Replace (Source Editor) with Regex & Ignore Case */}
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
                  title="Esegui tutte le regole in sequenza"
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
                    placeholder="Find (es. style=&quot;[^&quot;]*&quot;)"
                    className="sm:col-span-4 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <input
                    type="text"
                    value={rule.replace}
                    onChange={(e) =>
                      setFindRules((prev) =>
                        prev.map((r) => (r.id === rule.id ? { ...r, replace: e.target.value } : r))
                      )
                    }
                    placeholder="Replace with (vuoto = elimina)"
                    className="sm:col-span-4 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                        title="Esegui questa regola sul codice sorgente"
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
                          title="Rimuovi regola"
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

            {/* Quick Regex Preset Buttons from the Screenshot */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-500 font-medium mr-1">Esempi pratici Regex:</span>
              <button
                type="button"
                onClick={() =>
                  setFindRules([
                    {
                      id: 'preset_style',
                      find: 'style\\s*=\\s*"[^"]*"',
                      replace: '',
                      useRegex: true,
                      ignoreCase: true,
                    },
                  ])
                }
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono cursor-pointer"
              >
                Rimuovi style=&quot;...&quot;
              </button>
              <button
                type="button"
                onClick={() =>
                  setFindRules([
                    {
                      id: 'preset_p_to_div',
                      find: '<(/?)p>',
                      replace: '<$1div>',
                      useRegex: true,
                      ignoreCase: true,
                    },
                  ])
                }
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono cursor-pointer"
              >
                &lt;p&gt; → &lt;div&gt;
              </button>
              <button
                type="button"
                onClick={() =>
                  setFindRules([
                    {
                      id: 'preset_nbsp',
                      find: '&nbsp;',
                      replace: ' ',
                      useRegex: false,
                      ignoreCase: true,
                    },
                  ])
                }
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono cursor-pointer"
              >
                Rimuovi &amp;nbsp;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Optional 3rd View: Isolated Live Sandbox Preview of the Cleaned HTML */}
      {showLiveSandbox && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900 text-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold">
              Terza Vista: Target Isolato (&lt;iframe sandbox srcdoc&gt;) del Codice Pulito
            </span>
            <span className="font-mono text-emerald-400">Nessuno stile esterno dell&apos;editor</span>
          </div>
          <iframe
            title="Sandbox Anteprima Codice Pulito"
            sandbox="allow-scripts allow-modals"
            srcDoc={`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;max-width:740px;margin:1.5rem auto;padding:0 1rem;line-height:1.6;color:#0f172a;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #cbd5e1;padding:0.5rem;}</style></head><body>${sourceHtml}</body></html>`}
            className="w-full h-64 border-0 bg-white"
          />
        </div>
      )}
    </div>
  );
};
