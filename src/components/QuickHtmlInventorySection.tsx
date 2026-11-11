import React, { useState, useMemo } from 'react';
import {
  QuickHtmlInventoryItem,
  InventoryCategory,
  InventoryItemKind,
} from '../utils/quickHtmlInventoryDb';
import {
  RegionName,
  ConfigField,
  renderComponentTemplate,
} from '../utils/appForgeRegistry';
import {
  Search,
  Database,
  Plus,
  Code,
  Play,
  Copy,
  Check,
  Filter,
  Sparkles,
  Box,
  Cpu,
  Layers,
  Sliders,
  X,
  ArrowRight,
} from 'lucide-react';

interface QuickHtmlInventorySectionProps {
  items: QuickHtmlInventoryItem[];
  onInsertIntoEditor: (componentId: string, region: RegionName, openEditorAfter?: boolean) => void;
  onSendHtmlToSplitEditor: (rawHtml: string) => void;
  onAddNewCustomItem: (newItem: QuickHtmlInventoryItem) => void;
  onNotify: (msg: string) => void;
}

const ALL_CATEGORIES: InventoryCategory[] = [
  'Testo & Editoria',
  'Controlli & Form',
  'Layout & Contenitori',
  'Navigazione & Modali',
  'Dati & Fogli Calcolo',
  'Grafici & DataViz',
  'Editor & Codice',
  'Media, Audio & Video',
  '3D, Canvas & Fisica',
  'Calcolatori & Utilità',
  'Micro-App Produttività',
  'Funzioni & Motori JS',
];

const KIND_LABELS: Record<InventoryItemKind | 'all', string> = {
  all: 'Tutti i Tipi',
  'oggetto-ui': 'Oggetti HTML / UI',
  'widget-interattivo': 'Widget Interattivi',
  'contenitore-layout': 'Contenitori Annidabili',
  'funzione-js': 'Funzioni & Motori JS',
};

export const QuickHtmlInventorySection: React.FC<QuickHtmlInventorySectionProps> = ({
  items,
  onInsertIntoEditor,
  onSendHtmlToSplitEditor,
  onAddNewCustomItem,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'Tutte'>('Tutte');
  const [selectedKind, setSelectedKind] = useState<InventoryItemKind | 'all'>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<'Tutte' | 'Base' | 'Intermedio' | 'Avanzato'>('Tutte');
  const [insertRegion, setInsertRegion] = useState<RegionName>('main');

  // Detailed inspector modal for a specific catalog item
  const [inspectedItem, setInspectedItem] = useState<QuickHtmlInventoryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal to add a new object/function to the internal database
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [newId, setNewId] = useState<string>('customWidget');
  const [newLabel, setNewLabel] = useState<string>('Nuovo Oggetto Personalizzato');
  const [newCategory, setNewCategory] = useState<InventoryCategory>('Controlli & Form');
  const [newKind, setNewKind] = useState<InventoryItemKind>('widget-interattivo');
  const [newComplexity, setNewComplexity] = useState<'Base' | 'Intermedio' | 'Avanzato'>('Intermedio');
  const [newIcon, setNewIcon] = useState<string>('★');
  const [newDesc, setNewDesc] = useState<string>('Oggetto o funzione salvata nel database interno di QuickHTML.');
  const [newTags, setNewTags] = useState<string>('custom, html, funzione');
  const [newHtml, setNewHtml] = useState<string>('<div class="qh-custom-box"><h4>{{title}}</h4><p>{{text}}</p></div>');
  const [newCss, setNewCss] = useState<string>('.qh-custom-box{padding:1rem;background:#fff;border:1px solid #cbd5e1;border-radius:8px}');
  const [newJs, setNewJs] = useState<string>('');
  const [newConfigLines, setNewConfigLines] = useState<string>('title:Titolo:Oggetto Custom\ntext:Descrizione:Funzionalità pronta all’uso');

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory !== 'Tutte' && item.inventoryCategory !== selectedCategory) return false;
      if (selectedKind !== 'all' && item.kind !== selectedKind) return false;
      if (selectedComplexity !== 'Tutte' && item.complexity !== selectedComplexity) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.inventoryCategory.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, searchQuery, selectedCategory, selectedKind, selectedComplexity]);

  // Count by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Tutte: items.length };
    ALL_CATEGORIES.forEach((c) => {
      counts[c] = 0;
    });
    items.forEach((it) => {
      counts[it.inventoryCategory] = (counts[it.inventoryCategory] || 0) + 1;
    });
    return counts;
  }, [items]);

  const buildSingleItemStandaloneDoc = (item: QuickHtmlInventoryItem): string => {
    const rendered = renderComponentTemplate(
      item,
      {},
      '<div style="padding:8px;border:1px dashed #94a3b8;border-radius:6px;font-size:12px;color:#475569">Slot Contenitore Annidabile ({{children}})</div>'
    );
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:12px;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a}
  .af-field{display:flex;flex-direction:column;gap:.3rem;font-size:.85rem;margin:0 0 .5rem}
  .af-field input,.af-field textarea,.af-field select{padding:.4rem .65rem;border:1px solid #cbd5e1;border-radius:6px;font:inherit}
  ${item.css || ''}
</style>
</head>
<body>
${rendered}
<script>
  window.afStore = { state: {}, listeners: [], set(k,v){ this.state[k]=v; this.listeners.forEach(fn=>fn(this.state)); } };
  ${item.js || ''}
</script>
</body>
</html>`;
  };

  const handleCopySnippet = async (item: QuickHtmlInventoryItem) => {
    const rendered = renderComponentTemplate(item, {});
    const fullSnippet = `<!-- ${item.label} (${item.id}) -->\n${rendered}\n${
      item.css ? `<style>\n${item.css}\n</style>\n` : ''
    }${item.js ? `<script>\n${item.js}\n</script>` : ''}`;
    try {
      await navigator.clipboard.writeText(fullSnippet);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
      onNotify(`Codice completo di "${item.label}" copiato negli appunti.`);
    } catch {
      onNotify('Impossibile copiare automaticamente.');
    }
  };

  const handleCreateSubmit = () => {
    const cleanId = newId.trim().replace(/[^a-zA-Z0-9_]/g, '') || 'customObj_' + Date.now();
    const parsedConfig: ConfigField[] = newConfigLines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [k, lbl, def] = line.split(':');
        return {
          key: (k || 'text').trim(),
          type: 'text',
          label: (lbl || k || 'Parametro').trim(),
          default: (def ?? '').trim(),
        };
      });

    const created: QuickHtmlInventoryItem = {
      id: cleanId,
      category: 'Avanzato',
      inventoryCategory: newCategory,
      kind: newKind,
      container: newKind === 'contenitore-layout',
      label: newLabel.trim() || cleanId,
      icon: newIcon.trim() || '★',
      description: newDesc.trim(),
      complexity: newComplexity,
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      html: newHtml,
      css: newCss,
      js: newJs.trim() || undefined,
      config: parsedConfig,
    };

    onAddNewCustomItem(created);
    setCreateModalOpen(false);
    onNotify(`Salvataggio completato: "${created.label}" è ora nell'Inventario QuickHTML!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              <span>Database Interno QuickHTML · {items.length} Oggetti HTML, Widget &amp; Funzioni JS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Inventario Universale di Oggetti e Funzioni HTML
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Esplora, prova dal vivo e combina oltre <strong>{items.length} mattoni autoconsistenti</strong> organizzati in 12 categorie: tag semantici HTML5, form reattivi, griglie annidabili, fogli di calcolo, grafici Canvas/SVG, sintetizzatori WebAudio, simulatori fisici e motori JavaScript.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Inserisci in regione:</span>
              {(['header', 'main', 'footer'] as RegionName[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setInsertRegion(r)}
                  className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded cursor-pointer transition-colors ${
                    insertRegion === r
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuovo Oggetto / Funzione</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Multi-Facet Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per nome, tag HTML, funzione JS (es. table, audio, regex, csv, 3d, mutuo, dark mode)..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Kind Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value as InventoryItemKind | 'all')}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              {Object.entries(KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Complexity Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedComplexity}
              onChange={(e) =>
                setSelectedComplexity(e.target.value as 'Tutte' | 'Base' | 'Intermedio' | 'Avanzato')
              }
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              <option value="Tutte">Tutte le Complessità</option>
              <option value="Base">Complessità: Base</option>
              <option value="Intermedio">Complessità: Intermedio</option>
              <option value="Avanzato">Complessità: Avanzato</option>
            </select>
          </div>
        </div>

        {/* Category Selector Strip */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('Tutte')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              selectedCategory === 'Tutte'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tutte ({categoryCounts.Tutte})
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Results Summary Bar */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span>
          Visualizzati <strong className="text-slate-900 font-mono">{filteredItems.length}</strong> su{' '}
          <strong className="text-slate-900 font-mono">{items.length}</strong> oggetti e funzioni disponibili
        </span>
        <span className="text-slate-500">
          Destinazione attiva nell&apos;Editor: <strong className="uppercase text-blue-700">{insertRegion}</strong>
        </span>
      </div>

      {/* Catalog Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            Nessun oggetto o funzione corrisponde ai filtri selezionati.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Tutte');
              setSelectedKind('all');
              setSelectedComplexity('Tutte');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg cursor-pointer"
          >
            Mostra tutto il catalogo ({items.length})
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const previewHtml = renderComponentTemplate(
              item,
              {},
              '<div style="padding:6px;border:1px dashed #cbd5e1;border-radius:4px;font-size:11px;color:#64748b">Slot Contenitore ({{children}})</div>'
            );

            return (
              <article
                key={item.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-xs flex flex-col justify-between overflow-hidden transition-all"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-3.5 border-b border-slate-100 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-slate-200">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <span>{item.inventoryCategory}</span>
                          <span>·</span>
                          <span className="font-mono text-slate-400">#{item.id}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug truncate">
                          {item.label}
                        </h3>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500 shrink-0">
                      {item.kind === 'funzione-js'
                        ? 'JS Engine'
                        : item.kind === 'contenitore-layout'
                        ? 'Container'
                        : item.kind === 'widget-interattivo'
                        ? 'Widget'
                        : 'HTML UI'}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="px-3.5 pt-2.5 pb-2">
                    <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                  </div>

                  {/* Structural Preview Box */}
                  <div className="px-3.5 py-2">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 max-h-36 overflow-y-auto text-xs pointer-events-none">
                      <style>{item.css}</style>
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 mt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onInsertIntoEditor(item.id, insertRegion, false)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ In {insertRegion.toUpperCase()}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onInsertIntoEditor(item.id, insertRegion, true)}
                      title="Inserisci e vai subito all'Editor"
                      className="px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Apri in Editor</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setInspectedItem(item)}
                      className="px-2 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Play className="w-3 h-3 text-emerald-600" />
                      <span>Prova &amp; Codice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopySnippet(item)}
                      title="Copia HTML + CSS + JS"
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal 1: Live Interactive Sandbox & DNA Inspector for an Inventory Item */}
      {inspectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full p-5 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-mono text-sm font-bold flex items-center justify-center">
                  {inspectedItem.icon}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{inspectedItem.label}</h3>
                  <p className="text-xs text-slate-500">
                    Categoria: {inspectedItem.inventoryCategory} · ID: <code>{inspectedItem.id}</code> · Complessità: {inspectedItem.complexity}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Live Sandbox Execution */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Esecuzione Interattiva in Sandbox Isolato
                </div>
                <iframe
                  title={`Sandbox ${inspectedItem.label}`}
                  srcDoc={buildSingleItemStandaloneDoc(inspectedItem)}
                  sandbox="allow-scripts allow-modals"
                  className="w-full h-72 bg-slate-50 rounded-lg border border-slate-300"
                />
              </div>

              {/* Raw HTML / CSS / JS DNA */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                <div>
                  <span className="text-[11px] font-mono uppercase text-slate-500 font-bold">
                    Markup HTML:
                  </span>
                  <pre className="mt-1 p-2.5 bg-slate-900 text-emerald-300 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                    {inspectedItem.html}
                  </pre>
                </div>
                {inspectedItem.css && (
                  <div>
                    <span className="text-[11px] font-mono uppercase text-slate-500 font-bold">
                      Foglio di Stile CSS:
                    </span>
                    <pre className="mt-1 p-2.5 bg-slate-900 text-sky-300 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {inspectedItem.css}
                    </pre>
                  </div>
                )}
                {inspectedItem.js && (
                  <div>
                    <span className="text-[11px] font-mono uppercase text-slate-500 font-bold">
                      Motore JavaScript:
                    </span>
                    <pre className="mt-1 p-2.5 bg-slate-900 text-amber-300 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {inspectedItem.js}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const html = renderComponentTemplate(inspectedItem, {});
                  onSendHtmlToSplitEditor(html);
                  setInspectedItem(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Invia HTML all&apos;Editor Sorgente &amp; Cleaner
              </button>

              <div className="flex items-center gap-2">
                {(['header', 'main', 'footer'] as RegionName[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      onInsertIntoEditor(inspectedItem.id, r, true);
                      setInspectedItem(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                  >
                    + Inserisci in {r.toUpperCase()} e Apri Editor
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Create New Inventory Item */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-5 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Aggiungi Nuovo Oggetto o Funzione all&apos;Inventario QuickHTML
                </h3>
                <p className="text-xs text-slate-500">
                  Salva nel database interno un nuovo componente HTML/CSS/JS riutilizzabile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ID Univoco</label>
                <input
                  type="text"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Titolo Oggetto / Funzione</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Categoria Inventario</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as InventoryCategory)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo</label>
                <select
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value as InventoryItemKind)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="oggetto-ui">Oggetto HTML / UI</option>
                  <option value="widget-interattivo">Widget Interattivo</option>
                  <option value="contenitore-layout">Contenitore Annidabile</option>
                  <option value="funzione-js">Funzione / Motore JS</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Icona Breve</label>
                <input
                  type="text"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Descrizione</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tag di ricerca (virgola)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Template HTML (usa <code>{'{{prop}}'}</code> per parametri o <code>{'{{children}}'}</code> se contenitore)
              </label>
              <textarea
                rows={3}
                value={newHtml}
                onChange={(e) => setNewHtml(e.target.value)}
                className="w-full p-2.5 font-mono text-xs bg-slate-900 text-emerald-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Stile CSS</label>
                <textarea
                  rows={3}
                  value={newCss}
                  onChange={(e) => setNewCss(e.target.value)}
                  className="w-full p-2.5 font-mono text-xs bg-slate-900 text-sky-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Parametri Configurabili (<code>chiave:Etichetta:Default</code>)
                </label>
                <textarea
                  rows={3}
                  value={newConfigLines}
                  onChange={(e) => setNewConfigLines(e.target.value)}
                  className="w-full p-2.5 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Logica JavaScript (Opzionale)</label>
              <textarea
                rows={2}
                value={newJs}
                onChange={(e) => setNewJs(e.target.value)}
                className="w-full p-2.5 font-mono text-xs bg-slate-900 text-amber-300 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleCreateSubmit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Salva nell&apos;Inventario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
