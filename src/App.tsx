import React, { useState, useRef, useEffect } from 'react';
import {
  EditorBlock,
  TextBlock,
  ElementBlock,
  SnippetBlock,
  ContainerBlock,
  TextBlockType,
  ElementTagType,
  SnippetName,
  ContainerTagType,
  ELEMENT_DEFAULTS,
  SNIPPETS,
  LOCAL_ILLUSTRATION_SVG,
  createId,
  renderBlockHTML,
  buildFullHTMLDocument,
  parseInlineNodes,
} from './types/editor';
import { LessonsLaboratory } from './components/LessonsLaboratory';
import { SplitHtmlCleanerStudio } from './components/SplitHtmlCleanerStudio';
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Settings,
  Code,
  Bold,
  Italic,
  Link as LinkIcon,
  Save,
  FolderOpen,
  Download,
  RotateCcw,
  Plus,
  X,
  Check,
  Eye,
  FileCode,
  Braces,
  Columns,
  Blocks,
} from 'lucide-react';
import { INITIAL_MODEL } from './types/editor';

const STORAGE_KEY = 'quine_html_studio_model_v1';

export function App() {
  const [workspaceMode, setWorkspaceMode] = useState<'split-cleaner' | 'block-model'>('split-cleaner');

  const [model, setModel] = useState<EditorBlock[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_MODEL;
  });

  // Right pane tab: 'preview' (live sandbox iframe) | 'html' (generated HTML) | 'model' (raw JSON model)
  const [rightPaneTab, setRightPaneTab] = useState<'preview' | 'html' | 'model'>('preview');

  // Toast notification state (no window.alert)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Inline link insertion modal (replaces window.prompt)
  const [linkModalOpen, setLinkModalOpen] = useState<boolean>(false);
  const [linkUrlInput, setLinkUrlInput] = useState<string>('https://developer.mozilla.org');
  const savedSelectionRange = useRef<Range | null>(null);

  // Element configuration modal (replaces <dialog> for configuring "a button that does something" or other elements)
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [elemText, setElemText] = useState<string>('');
  const [elemActionPreset, setElemActionPreset] = useState<'feedback' | 'alert' | 'counter' | 'none' | 'custom'>('feedback');
  const [elemCustomJs, setElemCustomJs] = useState<string>('');
  const [elemHref, setElemHref] = useState<string>('');
  const [elemSrc, setElemSrc] = useState<string>('');
  const [elemAlt, setElemAlt] = useState<string>('');
  const [elemInputType, setElemInputType] = useState<string>('text');
  const [elemPlaceholder, setElemPlaceholder] = useState<string>('');

  // Snippet HTML editor modal
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [snippetTitleInput, setSnippetTitleInput] = useState<string>('');
  const [snippetHtmlInput, setSnippetHtmlInput] = useState<string>('');

  // Full HTML code export modal
  const [fullHtmlModalOpen, setFullHtmlModalOpen] = useState<boolean>(false);

  // Debounced srcDoc for iframe preview
  const [debouncedDoc, setDebouncedDoc] = useState<string>(() => buildFullHTMLDocument(model));
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDoc(buildFullHTMLDocument(model));
    }, 100);
    return () => clearTimeout(timer);
  }, [model]);

  // Helper to update a block anywhere (top-level or inside a container)
  const updateBlockById = (
    blocks: EditorBlock[],
    id: string,
    updater: (b: EditorBlock) => EditorBlock
  ): EditorBlock[] => {
    return blocks.map((b) => {
      if (b.id === id) return updater(b);
      if (b.kind === 'container') {
        return {
          ...b,
          children: updateBlockById(b.children, id, updater),
        };
      }
      return b;
    });
  };

  const findBlockById = (blocks: EditorBlock[], id: string): EditorBlock | null => {
    for (const b of blocks) {
      if (b.id === id) return b;
      if (b.kind === 'container') {
        const found = findBlockById(b.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Block operations (up, down, duplicate, delete) supporting top-level and nested container children
  const operateOnList = (
    list: EditorBlock[],
    id: string,
    action: 'up' | 'down' | 'dup' | 'del' | 'insertAfter',
    newBlock?: EditorBlock
  ): EditorBlock[] => {
    const idx = list.findIndex((b) => b.id === id);
    if (idx !== -1) {
      const copy = [...list];
      if (action === 'up' && idx > 0) {
        [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      } else if (action === 'down' && idx < copy.length - 1) {
        [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
      } else if (action === 'dup') {
        const cloned: EditorBlock = JSON.parse(JSON.stringify(copy[idx]));
        cloned.id = createId();
        copy.splice(idx + 1, 0, cloned);
      } else if (action === 'del') {
        copy.splice(idx, 1);
      } else if (action === 'insertAfter' && newBlock) {
        copy.splice(idx + 1, 0, newBlock);
      }
      return copy;
    }
    return list.map((b) => {
      if (b.kind === 'container') {
        return {
          ...b,
          children: operateOnList(b.children, id, action, newBlock),
        };
      }
      return b;
    });
  };

  const handleBlockAction = (id: string, action: 'up' | 'down' | 'dup' | 'del') => {
    setModel((prev) => operateOnList(prev, id, action));
  };

  // Palette Add Handlers
  const addTextBlock = (type: TextBlockType, parentContainerId?: string) => {
    const defaultLabels: Record<TextBlockType, string> = {
      h1: 'Nuovo Titolo Principale (H1)',
      h2: 'Nuovo Sottotitolo di Sezione (H2)',
      p: 'Nuovo paragrafo di testo. Clicca qui per scrivere o usa la barra sopra per applicare grassetto, corsivo e link.',
      quote: '“L’escaping è il meccanismo che separa il codice menzionato dal codice usato.”',
    };
    const newBlk: TextBlock = {
      id: createId(),
      kind: 'text',
      type,
      runs: [{ text: defaultLabels[type], marks: {} }],
    };
    if (parentContainerId) {
      setModel((prev) =>
        updateBlockById(prev, parentContainerId, (b) =>
          b.kind === 'container' ? { ...b, children: [...b.children, newBlk] } : b
        )
      );
    } else {
      setModel((prev) => [...prev, newBlk]);
    }
  };

  const addElementBlock = (tag: ElementTagType, parentContainerId?: string) => {
    const def = ELEMENT_DEFAULTS[tag];
    const newBlk: ElementBlock = {
      id: createId(),
      kind: 'element',
      tag: def.tag,
      text: def.text,
      attrs: { ...def.attrs },
    };
    if (parentContainerId) {
      setModel((prev) =>
        updateBlockById(prev, parentContainerId, (b) =>
          b.kind === 'container' ? { ...b, children: [...b.children, newBlk] } : b
        )
      );
    } else {
      setModel((prev) => [...prev, newBlk]);
    }
  };

  const addSnippetBlock = (name: SnippetName) => {
    const snip = SNIPPETS[name];
    const newBlk: SnippetBlock = {
      id: createId(),
      kind: 'snippet',
      name,
      title: snip.title,
      html: snip.html,
    };
    setModel((prev) => [...prev, newBlk]);
  };

  const addContainerBlock = (tag: ContainerTagType) => {
    const newBlk: ContainerBlock = {
      id: createId(),
      kind: 'container',
      tag,
      label: `Contenitore <${tag}>`,
      attrs: { class: 'container-box' },
      children: [
        {
          id: createId(),
          kind: 'text',
          type: 'h2',
          runs: [{ text: `Sezione Annidata (<${tag}>)`, marks: {} }],
        },
        {
          id: createId(),
          kind: 'element',
          tag: 'button',
          text: 'Pulsante Annidato',
          attrs: {
            onclick: "alert('Hai cliccato il pulsante dentro il contenitore <" + tag + ">!')",
          },
        },
      ],
    };
    setModel((prev) => [...prev, newBlk]);
  };

  // Open Element Configuration Modal
  const openElementConfig = (id: string) => {
    const found = findBlockById(model, id);
    if (!found || found.kind !== 'element') return;
    setEditingElementId(id);
    setElemText(found.text || '');
    const onclick = found.attrs.onclick || '';
    if (!onclick) {
      setElemActionPreset('none');
      setElemCustomJs('');
    } else if (onclick.includes('feedback-box')) {
      setElemActionPreset('feedback');
      setElemCustomJs(onclick);
    } else if (onclick.startsWith('alert(')) {
      setElemActionPreset('alert');
      setElemCustomJs(onclick);
    } else if (onclick.includes('dataset.count')) {
      setElemActionPreset('counter');
      setElemCustomJs(onclick);
    } else {
      setElemActionPreset('custom');
      setElemCustomJs(onclick);
    }
    setElemHref(found.attrs.href || 'https://');
    setElemSrc(found.attrs.src || LOCAL_ILLUSTRATION_SVG);
    setElemAlt(found.attrs.alt || '');
    setElemInputType(found.attrs.type || 'text');
    setElemPlaceholder(found.attrs.placeholder || '');
  };

  const saveElementConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingElementId) return;
    setModel((prev) =>
      updateBlockById(prev, editingElementId, (b) => {
        if (b.kind !== 'element') return b;
        const updatedAttrs = { ...b.attrs };
        let updatedText = b.text;

        if (b.tag === 'button') {
          updatedText = elemText || 'Clicca';
          if (elemActionPreset === 'none') {
            delete updatedAttrs.onclick;
          } else if (elemActionPreset === 'feedback') {
            updatedAttrs.onclick =
              "const el = document.getElementById('feedback-box'); if(el) { el.textContent = 'Segnale ricevuto da «" +
              (elemText || 'Pulsante').replace(/'/g, '') +
              "» alle ' + new Date().toLocaleTimeString(); el.style.background = '#dcfce7'; el.style.color = '#166534'; } else { alert('Azione eseguita!'); }";
          } else if (elemActionPreset === 'alert') {
            updatedAttrs.onclick = `alert('Ciao dal pulsante «${(elemText || 'Clicca').replace(/'/g, '')}»!')`;
          } else if (elemActionPreset === 'counter') {
            updatedAttrs.onclick =
              "this.dataset.count = Number(this.dataset.count || 0) + 1; this.textContent = '" +
              (elemText || 'Contatore').replace(/'/g, '') +
              " (' + this.dataset.count + ')';";
          } else {
            updatedAttrs.onclick = elemCustomJs;
          }
        } else if (b.tag === 'a') {
          updatedText = elemText || 'Link';
          updatedAttrs.href = elemHref || '#';
        } else if (b.tag === 'img') {
          updatedAttrs.src = elemSrc || LOCAL_ILLUSTRATION_SVG;
          updatedAttrs.alt = elemAlt || 'Immagine';
        } else if (b.tag === 'input') {
          updatedAttrs.type = elemInputType || 'text';
          updatedAttrs.placeholder = elemPlaceholder || '';
        }

        return {
          ...b,
          text: updatedText,
          attrs: updatedAttrs,
        };
      })
    );
    setEditingElementId(null);
    triggerToast('Configurazione elemento aggiornata nel modello');
  };

  // Open Snippet Configuration Modal
  const openSnippetConfig = (id: string) => {
    const found = findBlockById(model, id);
    if (!found || found.kind !== 'snippet') return;
    setEditingSnippetId(id);
    setSnippetTitleInput(found.title);
    setSnippetHtmlInput(found.html);
  };

  const saveSnippetConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSnippetId) return;
    setModel((prev) =>
      updateBlockById(prev, editingSnippetId, (b) => {
        if (b.kind !== 'snippet') return b;
        return {
          ...b,
          title: snippetTitleInput || 'Snippet HTML',
          html: snippetHtmlInput,
        };
      })
    );
    setEditingSnippetId(null);
    triggerToast('Codice HTML dello snippet aggiornato');
  };

  // Inline formatting commands on active contenteditable block
  const applyInlineFormat = (cmd: 'bold' | 'italic' | 'link') => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      triggerToast('Seleziona prima del testo dentro un blocco di testo');
      return;
    }
    const anchor =
      sel.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (sel.anchorNode as HTMLElement)
        : sel.anchorNode?.parentElement;
    const editableEl = anchor?.closest('[contenteditable="true"]') as HTMLElement | null;
    if (!editableEl) {
      triggerToast('Seleziona del testo dentro un paragrafo o titolo per formattarlo');
      return;
    }

    if (cmd === 'link') {
      savedSelectionRange.current = sel.getRangeAt(0).cloneRange();
      setLinkModalOpen(true);
      return;
    }

    document.execCommand(cmd, false);
    const blockId = editableEl.dataset.blockId;
    if (blockId) {
      const newRuns = parseInlineNodes(editableEl.childNodes);
      setModel((prev) =>
        updateBlockById(prev, blockId, (b) => (b.kind === 'text' ? { ...b, runs: newRuns } : b))
      );
    }
  };

  const confirmInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkModalOpen(false);
    if (!savedSelectionRange.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRange.current);
      document.execCommand('createLink', false, linkUrlInput || 'https://');
      const anchor =
        sel.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (sel.anchorNode as HTMLElement)
          : sel.anchorNode?.parentElement;
      const editableEl = anchor?.closest('[contenteditable="true"]') as HTMLElement | null;
      const blockId = editableEl?.dataset.blockId;
      if (editableEl && blockId) {
        const newRuns = parseInlineNodes(editableEl.childNodes);
        setModel((prev) =>
          updateBlockById(prev, blockId, (b) => (b.kind === 'text' ? { ...b, runs: newRuns } : b))
        );
      }
    }
  };

  // Persistence & Download
  const handleSaveLocal = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
    triggerToast('Modello salvato in localStorage');
  };

  const handleLoadLocal = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      triggerToast('Nessun modello salvato trovato');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setModel(parsed);
        triggerToast('Modello caricato da localStorage');
      }
    } catch {
      triggerToast('Errore nella lettura del modello salvato');
    }
  };

  const handleResetDefault = () => {
    setModel(INITIAL_MODEL);
    triggerToast('Modello ripristinato allo stato iniziale');
  };

  const handleDownloadHTML = () => {
    const fullDoc = buildFullHTMLDocument(model);
    const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pagina-generata.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    triggerToast('File pagina-generata.html scaricato');
  };

  const editingElementBlock = editingElementId
    ? (findBlockById(model, editingElementId) as ElementBlock | null)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio-workspace"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          QuineHTML Studio
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#studio-workspace"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Editor HTML
          </a>
          <a
            href="#laboratorio-auto-riferimento"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Escaping & Lezioni
          </a>
          <a
            href="#architettura-livelli"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Modello & Mapping
          </a>
          <button
            type="button"
            onClick={() => setFullHtmlModalOpen(true)}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Sorgente Generato
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadHTML}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Esporta File .HTML</span>
          </button>
        </div>
      </header>

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 pt-6 space-y-12">
        {/* Intro Strip */}
        <section id="studio-workspace" className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>Costruzione Visuale, Parsing Bidirezionale &amp; Sanitizzazione</span>
                <span aria-hidden="true">·</span>
                <span>DOM (WYSIWYG) ↔ Parser ↔ Sorgente HTML ↔ Target Sandbox</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Editor di HTML scritto in HTML
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Segmented Workspace Mode Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('split-cleaner')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    workspaceMode === 'split-cleaner'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5 text-red-600" />
                  <span>Split View: WYSIWYG ↔ Sorgente &amp; Cleaner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('block-model')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    workspaceMode === 'block-model'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Blocks className="w-3.5 h-3.5 text-blue-600" />
                  <span>Architettura a Blocchi (Modello JSON)</span>
                </button>
              </div>

              {/* Workspace Persistence Actions (shown in Block Model mode) */}
              {workspaceMode === 'block-model' && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFullHtmlModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Code className="w-3.5 h-3.5 text-blue-600" />
                    <span>&lt;/&gt; Vedi HTML</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLocal}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-600" />
                    <span>Salva</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadLocal}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
                    <span>Carica</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ripristina</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {workspaceMode === 'split-cleaner' ? (
            <SplitHtmlCleanerStudio onNotify={triggerToast} />
          ) : (
            /* 3-Column Studio Layout: Palette (Left) | Visual Block Editor (Center) | Live Target / Inspector (Right) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[640px]">
            {/* LEFT PANEL: Palette ("La UI che ti permette di fare una certa cosa" + "Snippet pre-impostati") */}
            <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-5">
              <div className="space-y-5">
                {/* Group 1: Text Blocks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-semibold text-slate-900">1. Blocchi di Testo</h2>
                    <span className="text-xs text-slate-400 font-mono">kind: text</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => addTextBlock('p')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      ¶ Paragrafo
                    </button>
                    <button
                      type="button"
                      onClick={() => addTextBlock('h1')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      H1 Titolo
                    </button>
                    <button
                      type="button"
                      onClick={() => addTextBlock('h2')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      H2 Sezione
                    </button>
                    <button
                      type="button"
                      onClick={() => addTextBlock('quote')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      “ Citazione
                    </button>
                  </div>
                </div>

                {/* Group 2: Interactive Elements (UI-Driven path) */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xs font-semibold text-slate-900">2. Elementi Configurabili</h2>
                    <span className="text-xs text-slate-400 font-mono">kind: element</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2.5">
                    Inserisci un elemento e usa <strong>Configura</strong> per scegliere cosa deve fare.
                  </p>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => addElementBlock('button')}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-blue-700 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 rounded-lg transition-colors flex items-center justify-between cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>+ Pulsante con Azione</span>
                      <code className="font-mono text-[11px] text-blue-600">&lt;button&gt;</code>
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => addElementBlock('a')}
                        className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Link &lt;a&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => addElementBlock('input')}
                        className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Input &lt;input&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => addElementBlock('img')}
                        className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Immagine &lt;img&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => addElementBlock('hr')}
                        className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Divisore &lt;hr&gt;
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group 3: Pre-set Code Snippets */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xs font-semibold text-slate-900">3. Snippet Pre-impostati</h2>
                    <span className="text-xs text-slate-400 font-mono">kind: snippet</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2.5">
                    Porzioni di codice HTML già pronte e ispezionabili.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => addSnippetBlock('card')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Card Evento
                    </button>
                    <button
                      type="button"
                      onClick={() => addSnippetBlock('counter')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Contatore +1
                    </button>
                    <button
                      type="button"
                      onClick={() => addSnippetBlock('form')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Form Invio
                    </button>
                    <button
                      type="button"
                      onClick={() => addSnippetBlock('nav')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Barra &lt;nav&gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => addSnippetBlock('table')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Tabella Dati
                    </button>
                    <button
                      type="button"
                      onClick={() => addSnippetBlock('custom')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      HTML Libero
                    </button>
                  </div>
                </div>

                {/* Group 4: Nested Containers */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <h2 className="text-xs font-semibold text-slate-900">4. Contenitori Annidati</h2>
                    <span className="text-xs text-slate-400 font-mono">kind: container</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => addContainerBlock('section')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      &lt;section&gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => addContainerBlock('div')}
                      className="px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      &lt;div&gt;
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between font-mono tabular-nums">
                <span>Blocchi radice: {model.length}</span>
                <span>Target: srcdoc</span>
              </div>
            </aside>

            {/* CENTER PANEL: Visual Block Editor Canvas */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
              {/* Inline Formatting Toolbar */}
              <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <div
                  className="flex items-center gap-1"
                  role="toolbar"
                  aria-label="Formattazione testo inline"
                >
                  <span className="text-xs font-medium text-slate-500 mr-1.5">Testo:</span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyInlineFormat('bold')}
                    title="Grassetto (<strong>)"
                    className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded hover:border-blue-400 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyInlineFormat('italic')}
                    title="Corsivo (<em>)"
                    className="px-2.5 py-1 text-xs italic font-serif text-slate-700 bg-white border border-slate-200 rounded hover:border-blue-400 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyInlineFormat('link')}
                    title="Inserisci Link (<a>)"
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:border-blue-400 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>Link</span>
                  </button>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Invio in un testo = nuovo paragrafo
                </span>
              </div>

              {/* Block List Canvas */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[640px]">
                {model.length === 0 ? (
                  <div className="text-center py-16 px-4 border border-dashed border-slate-200 rounded-xl">
                    <p className="text-sm font-medium text-slate-700">
                      Il modello del documento è vuoto
                    </p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Aggiungi un blocco di testo, un pulsante configurabile o uno snippet dalla palette a sinistra.
                    </p>
                    <button
                      type="button"
                      onClick={() => addElementBlock('button')}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      + Inserisci Primo Pulsante
                    </button>
                  </div>
                ) : (
                  model.map((block, index) => (
                    <BlockItemRenderer
                      key={block.id}
                      block={block}
                      index={index}
                      total={model.length}
                      onAction={handleBlockAction}
                      onOpenElementConfig={openElementConfig}
                      onOpenSnippetConfig={openSnippetConfig}
                      onUpdateTextRuns={(id, runs) => {
                        setModel((prev) =>
                          updateBlockById(prev, id, (b) =>
                            b.kind === 'text' ? { ...b, runs } : b
                          )
                        );
                      }}
                      onInsertParagraphAfter={(id) => {
                        const nextP: TextBlock = {
                          id: createId(),
                          kind: 'text',
                          type: 'p',
                          runs: [{ text: 'Nuovo paragrafo...', marks: {} }],
                        };
                        setModel((prev) => operateOnList(prev, id, 'insertAfter', nextP));
                      }}
                      onAddChildToContainer={(containerId, kind) => {
                        if (kind === 'p') addTextBlock('p', containerId);
                        if (kind === 'button') addElementBlock('button', containerId);
                      }}
                    />
                  ))
                )}
              </div>
            </section>

            {/* RIGHT PANEL: Isolated Sandbox Target (<iframe sandbox>) + Live Code / Model Inspector */}
            <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setRightPaneTab('preview')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                      rightPaneTab === 'preview'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Target Sandbox</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPaneTab('html')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                      rightPaneTab === 'html'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-600" />
                    <span>HTML</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPaneTab('model')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                      rightPaneTab === 'model'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Braces className="w-3.5 h-3.5 text-amber-600" />
                    <span>Modello JSON</span>
                  </button>
                </div>

                <span className="text-[11px] font-mono text-slate-500">
                  {rightPaneTab === 'preview' ? 'iframe[srcdoc]' : rightPaneTab === 'html' ? 'mapping()' : 'state'}
                </span>
              </div>

              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {rightPaneTab === 'preview' && (
                  <>
                    <div className="px-4 py-2 bg-emerald-50/70 border-b border-emerald-100 text-xs text-emerald-900 flex items-center justify-between">
                      <span>Esecuzione live isolata: clicca i pulsanti qui sotto per testarli</span>
                      <span className="font-mono text-[11px] text-emerald-700">sandbox</span>
                    </div>
                    <iframe
                      title="Anteprima Live Documento Generato"
                      sandbox="allow-scripts allow-modals allow-forms"
                      srcDoc={debouncedDoc}
                      className="w-full flex-1 min-h-[520px] border-0 bg-white"
                    />
                  </>
                )}

                {rightPaneTab === 'html' && (
                  <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <span>Risultato di <code className="font-mono text-sky-400">buildFullHTMLDocument(model)</code></span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(debouncedDoc);
                          triggerToast('Codice HTML copiato negli appunti');
                        }}
                        className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                      >
                        Copia HTML
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-200 overflow-auto flex-1 max-h-[540px] leading-relaxed">
                      <code>{debouncedDoc}</code>
                    </pre>
                  </div>
                )}

                {rightPaneTab === 'model' && (
                  <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <span>Fonte di verità astratta (nessuna sintassi HTML per testo/elementi)</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(JSON.stringify(model, null, 2));
                          triggerToast('Modello JSON copiato negli appunti');
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                      >
                        Copia JSON
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-amber-200 overflow-auto flex-1 max-h-[540px] leading-relaxed">
                      <code>{JSON.stringify(model, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </div>
            </aside>
          </div>
          )}
        </section>

        {/* Interactive Self-Teaching HTML Laboratory & Escaping Engine */}
        <div id="laboratorio-auto-riferimento">
          <LessonsLaboratory
            model={model}
            onLoadPresetIntoStudio={(blocks) => {
              setModel(blocks);
              setWorkspaceMode('block-model');
              setRightPaneTab('preview');
              triggerToast('Esempio interattivo caricato nell’editor a blocchi');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </main>

      {/* Clean Footer */}
      <footer id="architettura-livelli" className="border-t border-slate-200 bg-white py-6 px-6 mt-auto">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">QuineHTML Studio</span>
            <span aria-hidden="true">·</span>
            <span>Modello (Dati) → Mapping (escapeHTML / renderBlockHTML) → Target (&lt;iframe sandbox&gt;)</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setFullHtmlModalOpen(true)}
              className="hover:text-slate-900 underline underline-offset-4 cursor-pointer"
            >
              Ispeziona HTML Generato
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleDownloadHTML}
              className="hover:text-slate-900 underline underline-offset-4 cursor-pointer"
            >
              Scarica .HTML
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL 1: Element Configuration ("La UI che ti permette di fare una certa cosa") */}
      {editingElementBlock && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono text-blue-600">Configurazione Elemento UI</span>
                <h3 className="text-lg font-bold text-slate-900">
                  Modifica &lt;{editingElementBlock.tag}&gt;
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingElementId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveElementConfig} className="space-y-4">
              {editingElementBlock.tag === 'button' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Testo del pulsante
                    </label>
                    <input
                      type="text"
                      value={elemText}
                      onChange={(e) => setElemText(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Es. Clicca qui"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cosa deve fare questo tasto quando viene cliccato? (Comportamento)
                    </label>
                    <select
                      value={elemActionPreset}
                      onChange={(e) =>
                        setElemActionPreset(
                          e.target.value as 'feedback' | 'alert' | 'counter' | 'none' | 'custom'
                        )
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="feedback">
                        Aggiorna il box di stato (#feedback-box) nella pagina
                      </option>
                      <option value="counter">
                        Incrementa un contatore di clic direttamente sul pulsante
                      </option>
                      <option value="alert">
                        Mostra un avviso nel sandbox (alert)
                      </option>
                      <option value="custom">
                        Azione JavaScript personalizzata (onclick)
                      </option>
                      <option value="none">Nessuna azione</option>
                    </select>
                  </div>

                  {elemActionPreset === 'custom' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Codice JavaScript per l’attributo <code className="font-mono">onclick</code>
                      </label>
                      <textarea
                        rows={3}
                        value={elemCustomJs}
                        onChange={(e) => setElemCustomJs(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Es. document.body.style.background = '#f0f9ff';"
                      />
                    </div>
                  )}
                </>
              )}

              {editingElementBlock.tag === 'a' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Testo del collegamento
                    </label>
                    <input
                      type="text"
                      value={elemText}
                      onChange={(e) => setElemText(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Indirizzo URL (<code className="font-mono">href</code>)
                    </label>
                    <input
                      type="text"
                      value={elemHref}
                      onChange={(e) => setElemHref(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              {editingElementBlock.tag === 'img' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sorgente Immagine (<code className="font-mono">src</code>)
                    </label>
                    <input
                      type="text"
                      value={elemSrc}
                      onChange={(e) => setElemSrc(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Testo Alternativo (<code className="font-mono">alt</code>)
                    </label>
                    <input
                      type="text"
                      value={elemAlt}
                      onChange={(e) => setElemAlt(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              {editingElementBlock.tag === 'input' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tipo di campo (<code className="font-mono">type</code>)
                    </label>
                    <select
                      value={elemInputType}
                      onChange={(e) => setElemInputType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="text">text (Testo semplice)</option>
                      <option value="email">email (Indirizzo Email)</option>
                      <option value="number">number (Valore Numerico)</option>
                      <option value="password">password (Oscurato)</option>
                      <option value="date">date (Selettore Data)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Testo suggerito (<code className="font-mono">placeholder</code>)
                    </label>
                    <input
                      type="text"
                      value={elemPlaceholder}
                      onChange={(e) => setElemPlaceholder(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              {editingElementBlock.tag === 'hr' && (
                <p className="text-sm text-slate-600">
                  Il separatore orizzontale <code className="font-mono">&lt;hr&gt;</code> è un elemento vuoto e non richiede attributi aggiuntivi.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingElementId(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Salva nel Modello
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Snippet Raw HTML Editor ("Porzione di codice pre-impostata") */}
      {editingSnippetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono text-blue-600">Porzione di Codice Pre-impostata</span>
                <h3 className="text-lg font-bold text-slate-900">
                  Modifica HTML dello Snippet
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSnippetId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveSnippetConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Etichetta dello snippet nell’editor
                </label>
                <input
                  type="text"
                  value={snippetTitleInput}
                  onChange={(e) => setSnippetTitleInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Markup HTML grezzo (iniettato nel target)
                </label>
                <textarea
                  rows={10}
                  value={snippetHtmlInput}
                  onChange={(e) => setSnippetHtmlInput(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-slate-950 text-slate-100 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSnippetId(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Salva Snippet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Inline Link Insertion */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Inserisci Collegamento Ipertestuale</h3>
            <form onSubmit={confirmInsertLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL di destinazione
                </label>
                <input
                  type="url"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg cursor-pointer"
                >
                  Applica Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Full Generated HTML Document View */}
      {fullHtmlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono text-blue-600">Output del Mapping Modello → HTML</span>
                <h3 className="text-lg font-bold text-slate-900">
                  Sorgente HTML Completo Generato
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFullHtmlModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-[420px] leading-relaxed">
              <code>{buildFullHTMLDocument(model)}</code>
            </pre>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Puoi copiare questo codice in un file <code className="font-mono">index.html</code> e aprirlo in qualsiasi browser.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(buildFullHTMLDocument(model));
                    triggerToast('Sorgente HTML copiato negli appunti');
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Copia negli Appunti
                </button>
                <button
                  type="button"
                  onClick={() => setFullHtmlModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   BLOCK ITEM RENDERER (Supports Text, Element, Snippet, and Nested Containers)
   ============================================================================ */
interface BlockItemRendererProps {
  block: EditorBlock;
  index: number;
  total: number;
  onAction: (id: string, action: 'up' | 'down' | 'dup' | 'del') => void;
  onOpenElementConfig: (id: string) => void;
  onOpenSnippetConfig: (id: string) => void;
  onUpdateTextRuns: (id: string, runs: TextBlock['runs']) => void;
  onInsertParagraphAfter: (id: string) => void;
  onAddChildToContainer: (containerId: string, kind: 'p' | 'button') => void;
}

const BlockItemRenderer: React.FC<BlockItemRendererProps> = ({
  block,
  index,
  total,
  onAction,
  onOpenElementConfig,
  onOpenSnippetConfig,
  onUpdateTextRuns,
  onInsertParagraphAfter,
  onAddChildToContainer,
}) => {
  return (
    <div className="group relative border border-slate-200 hover:border-blue-300 rounded-lg p-3.5 bg-white transition-colors">
      {/* Top Block Meta & Action Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span className="font-semibold text-slate-700">
            {block.kind === 'text' && `<${block.type === 'quote' ? 'blockquote' : block.type}>`}
            {block.kind === 'element' && `<${block.tag}>`}
            {block.kind === 'snippet' && `snippet: ${block.title}`}
            {block.kind === 'container' && `<${block.tag}> contenitore`}
          </span>
          <span aria-hidden="true">·</span>
          <span>{block.kind}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onAction(block.id, 'up')}
            title="Sposta su"
            className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onAction(block.id, 'down')}
            title="Sposta giù"
            className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAction(block.id, 'dup')}
            title="Duplica blocco"
            className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAction(block.id, 'del')}
            title="Elimina blocco"
            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Block Body by Kind */}
      {block.kind === 'text' && (
        <EditableTextBlockView
          block={block}
          onUpdateRuns={(runs) => onUpdateTextRuns(block.id, runs)}
          onPressEnter={() => onInsertParagraphAfter(block.id)}
        />
      )}

      {block.kind === 'element' && (
        <div className="space-y-2.5">
          <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-700 truncate">
              {block.tag === 'button' && (
                <span className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-md text-xs">
                  {block.text || 'Clicca'}
                </span>
              )}
              {block.tag === 'a' && (
                <span className="text-blue-600 underline font-medium">
                  {block.text || 'Link'} ({block.attrs.href})
                </span>
              )}
              {block.tag === 'img' && (
                <div className="flex items-center gap-3">
                  <img
                    src={block.attrs.src || LOCAL_ILLUSTRATION_SVG}
                    alt={block.attrs.alt || 'Anteprima'}
                    referrerPolicy="no-referrer"
                    className="h-12 w-24 object-cover rounded border border-slate-200 bg-slate-900"
                  />
                  <span className="text-xs text-slate-500 font-mono truncate">
                    alt=&quot;{block.attrs.alt || ''}&quot;
                  </span>
                </div>
              )}
              {block.tag === 'input' && (
                <input
                  type={block.attrs.type || 'text'}
                  placeholder={block.attrs.placeholder || ''}
                  readOnly
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-600"
                />
              )}
              {block.tag === 'hr' && <hr className="border-slate-300 w-48 my-2" />}
            </div>

            <button
              type="button"
              onClick={() => onOpenElementConfig(block.id)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configura</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-500 bg-slate-900 text-slate-200 px-2.5 py-1.5 rounded overflow-x-auto">
            <code>{renderBlockHTML(block, '')}</code>
          </div>
        </div>
      )}

      {block.kind === 'snippet' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">
              Porzione di codice HTML pre-impostata (eseguita nel Target a destra)
            </span>
            <button
              type="button"
              onClick={() => onOpenSnippetConfig(block.id)}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 hover:border-blue-500 hover:text-blue-700 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Modifica HTML</span>
            </button>
          </div>
          <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-md text-[11px] font-mono overflow-x-auto max-h-28">
            <code>{block.html}</code>
          </pre>
        </div>
      )}

      {block.kind === 'container' && (
        <div className="space-y-3 pl-3 border-l border-slate-200 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">
              Figli annidati dentro <code className="font-mono">&lt;{block.tag}&gt;</code>:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onAddChildToContainer(block.id, 'p')}
                className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Paragrafo</span>
              </button>
              <button
                type="button"
                onClick={() => onAddChildToContainer(block.id, 'button')}
                className="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Pulsante</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {block.children.map((child, cIdx) => (
              <BlockItemRenderer
                key={child.id}
                block={child}
                index={cIdx}
                total={block.children.length}
                onAction={onAction}
                onOpenElementConfig={onOpenElementConfig}
                onOpenSnippetConfig={onOpenSnippetConfig}
                onUpdateTextRuns={onUpdateTextRuns}
                onInsertParagraphAfter={onInsertParagraphAfter}
                onAddChildToContainer={onAddChildToContainer}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   CONTENTEDITABLE TEXT BLOCK VIEW (Preserves Cursor Focus on Input)
   ============================================================================ */
interface EditableTextBlockViewProps {
  block: TextBlock;
  onUpdateRuns: (runs: TextBlock['runs']) => void;
  onPressEnter: () => void;
}

const EditableTextBlockView: React.FC<EditableTextBlockViewProps> = ({
  block,
  onUpdateRuns,
  onPressEnter,
}) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const isInternalChange = useRef<boolean>(false);

  // Sync initial or external model changes into DOM without clobbering active typing
  useEffect(() => {
    if (!elRef.current) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const tempHtml = block.runs
      .map((r) => {
        let t = r.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        if (r.marks.link) t = `<a href="${r.marks.link}" class="text-blue-600 underline">${t}</a>`;
        if (r.marks.italic) t = `<em>${t}</em>`;
        if (r.marks.bold) t = `<strong>${t}</strong>`;
        return t;
      })
      .join('');
    if (elRef.current.innerHTML !== tempHtml) {
      elRef.current.innerHTML = tempHtml;
    }
  }, [block.runs, block.type]);

  const styleByType: Record<TextBlockType, string> = {
    h1: 'text-xl font-bold text-slate-900 tracking-tight',
    h2: 'text-base font-bold text-slate-800',
    p: 'text-sm text-slate-700 leading-relaxed',
    quote: 'text-sm italic text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200',
  };

  return (
    <div
      ref={elRef}
      data-block-id={block.id}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => {
        isInternalChange.current = true;
        const runs = parseInlineNodes(e.currentTarget.childNodes);
        onUpdateRuns(runs);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onPressEnter();
        }
      }}
      className={`outline-none focus:bg-blue-50/40 rounded px-2 py-1 transition-colors min-h-[1.75rem] ${styleByType[block.type]}`}
    />
  );
};

export default App;
