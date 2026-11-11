import React, { useState, useMemo } from 'react';
import {
  RegistryComponentDef,
  AppForgeBlock,
  AppForgeModel,
  RegionName,
  createBlockId,
  getDefaultPropsForComponent,
  renderComponentTemplate,
  buildAppForgeExportHTML,
} from '../utils/appForgeRegistry';
import { QuickHtmlInventoryItem } from '../utils/quickHtmlInventoryDb';
import {
  Package,
  Layers,
  Play,
  Code,
  Download,
  Copy,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sliders,
  Search,
  X,
  CornerDownRight,
  Database,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface UniversalAppBuilderStudioProps {
  model: AppForgeModel;
  setModel: React.Dispatch<React.SetStateAction<AppForgeModel>>;
  registry: Record<string, RegistryComponentDef>;
  inventoryItems: QuickHtmlInventoryItem[];
  onNotify: (msg: string) => void;
  onSendToSplitCleaner?: (html: string) => void;
  onGoToSection?: (sec: 'editor' | 'inventario' | 'lezioni' | 'anteprima' | 'esporta') => void;
}

export const UniversalAppBuilderStudio: React.FC<UniversalAppBuilderStudioProps> = ({
  model,
  setModel,
  registry,
  inventoryItems,
  onNotify,
  onSendToSplitCleaner,
  onGoToSection,
}) => {
  // Active target region when clicking an object/function in the Palette
  const [targetRegion, setTargetRegion] = useState<RegionName>('main');
  // Optional target container block ID (if user wants to insert inside a `grid`, `card`, `flexRowContainer`, `collapsiblePanel`, etc.)
  const [targetContainerId, setTargetContainerId] = useState<string | null>(null);

  // Selected block ID for the right-hand Property Inspector (#params)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(() => {
    const firstMain = model.regions.main?.[0];
    return firstMain ? firstMain.id : null;
  });

  // Palette search query & category filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paletteCategoryFilter, setPaletteCategoryFilter] = useState<string>('Tutte');

  // Center viewport tab: 'canvas' (3 regions visual builder) | 'preview' (inline sandbox) | 'code' (compiled HTML)
  const [centerTab, setCenterTab] = useState<'canvas' | 'preview' | 'code'>('canvas');

  // Inspector sub-tab: 'props' (block properties) | 'dna' (component HTML/CSS/JS template) | 'global' (app customCSS / customJS)
  const [inspectorTab, setInspectorTab] = useState<'props' | 'dna' | 'global'>('props');

  // Compiled standalone HTML
  const compiledHTML = useMemo(() => {
    return buildAppForgeExportHTML(model, registry);
  }, [model, registry]);

  // Recursive helper to find a block by ID across all regions and nested containers
  const findBlockAnywhere = (id: string | null): { block: AppForgeBlock; region: RegionName } | null => {
    if (!id) return null;
    const searchInList = (
      list: AppForgeBlock[],
      regName: RegionName
    ): { block: AppForgeBlock; region: RegionName } | null => {
      for (const b of list) {
        if (b.id === id) return { block: b, region: regName };
        if (b.children && b.children.length > 0) {
          const found = searchInList(b.children, regName);
          if (found) return found;
        }
      }
      return null;
    };
    for (const r of ['header', 'main', 'footer'] as RegionName[]) {
      const res = searchInList(model.regions[r] || [], r);
      if (res) return res;
    }
    return null;
  };

  const selectedBlockInfo = useMemo(() => findBlockAnywhere(selectedBlockId), [model, selectedBlockId]);
  const selectedBlock = selectedBlockInfo?.block || null;
  const selectedRegDef = selectedBlock ? registry[selectedBlock.component] : null;

  // Recursive helper to update a block by ID
  const updateBlockInTree = (
    list: AppForgeBlock[],
    id: string,
    updater: (b: AppForgeBlock) => AppForgeBlock
  ): AppForgeBlock[] => {
    return list.map((b) => {
      if (b.id === id) return updater(b);
      if (b.children && b.children.length > 0) {
        return { ...b, children: updateBlockInTree(b.children, id, updater) };
      }
      return b;
    });
  };

  // Recursive helper to move/duplicate/delete a block in any list or nested container
  const operateOnBlockTree = (
    list: AppForgeBlock[],
    id: string,
    action: 'up' | 'down' | 'dup' | 'del'
  ): AppForgeBlock[] => {
    const idx = list.findIndex((b) => b.id === id);
    if (idx !== -1) {
      const next = [...list];
      if (action === 'up' && idx > 0) {
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      } else if (action === 'down' && idx < next.length - 1) {
        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      } else if (action === 'dup') {
        const clone: AppForgeBlock = JSON.parse(JSON.stringify(next[idx]));
        const assignNewIds = (blk: AppForgeBlock): AppForgeBlock => ({
          ...blk,
          id: createBlockId(),
          children: blk.children ? blk.children.map(assignNewIds) : undefined,
        });
        next.splice(idx + 1, 0, assignNewIds(clone));
      } else if (action === 'del') {
        next.splice(idx, 1);
      }
      return next;
    }
    return list.map((b) => {
      if (b.children && b.children.length > 0) {
        return { ...b, children: operateOnBlockTree(b.children, id, action) };
      }
      return b;
    });
  };

  const handleBlockAction = (id: string, action: 'up' | 'down' | 'dup' | 'del') => {
    setModel((prev) => ({
      ...prev,
      regions: {
        header: operateOnBlockTree(prev.regions.header, id, action),
        main: operateOnBlockTree(prev.regions.main, id, action),
        footer: operateOnBlockTree(prev.regions.footer, id, action),
      },
    }));
    if (action === 'del' && selectedBlockId === id) {
      setSelectedBlockId(null);
    }
    if (action === 'del' && targetContainerId === id) {
      setTargetContainerId(null);
    }
  };

  // Add an object or function from the Palette into either targetContainerId (if valid) or targetRegion
  const handleAddComponent = (compId: string) => {
    const reg = registry[compId];
    if (!reg) return;
    const newBlock: AppForgeBlock = {
      id: createBlockId(),
      component: compId,
      props: getDefaultPropsForComponent(reg),
      children: reg.container ? [] : undefined,
    };

    if (targetContainerId) {
      const containerInfo = findBlockAnywhere(targetContainerId);
      if (containerInfo && registry[containerInfo.block.component]?.container) {
        setModel((prev) => ({
          ...prev,
          regions: {
            header: updateBlockInTree(prev.regions.header, targetContainerId, (b) => ({
              ...b,
              children: [...(b.children || []), newBlock],
            })),
            main: updateBlockInTree(prev.regions.main, targetContainerId, (b) => ({
              ...b,
              children: [...(b.children || []), newBlock],
            })),
            footer: updateBlockInTree(prev.regions.footer, targetContainerId, (b) => ({
              ...b,
              children: [...(b.children || []), newBlock],
            })),
          },
        }));
        setSelectedBlockId(newBlock.id);
        onNotify(`Aggiunto "${reg.label}" dentro il contenitore selezionato.`);
        return;
      }
    }

    setModel((prev) => ({
      ...prev,
      regions: {
        ...prev.regions,
        [targetRegion]: [...(prev.regions[targetRegion] || []), newBlock],
      },
    }));
    setSelectedBlockId(newBlock.id);
    onNotify(`Aggiunto "${reg.label}" nella regione ${targetRegion.toUpperCase()}.`);
  };

  // Update a property of the currently selected block
  const handleUpdateBlockProp = (key: string, value: string | number) => {
    if (!selectedBlockId) return;
    setModel((prev) => ({
      ...prev,
      regions: {
        header: updateBlockInTree(prev.regions.header, selectedBlockId, (b) => ({
          ...b,
          props: { ...b.props, [key]: value },
        })),
        main: updateBlockInTree(prev.regions.main, selectedBlockId, (b) => ({
          ...b,
          props: { ...b.props, [key]: value },
        })),
        footer: updateBlockInTree(prev.regions.footer, selectedBlockId, (b) => ({
          ...b,
          props: { ...b.props, [key]: value },
        })),
      },
    }));
  };

  const handleClearCanvas = () => {
    setModel({
      name: model.name || 'Nuovo Progetto QuickHTML',
      regions: { header: [], main: [], footer: [] },
      customCSS: '',
      customJS: '',
    });
    setSelectedBlockId(null);
    setTargetContainerId(null);
    onNotify('Tela svuotata. Clicca gli oggetti nella Palette o dall’Inventario per comporre.');
  };

  // Group all inventory items by inventoryCategory for the Palette
  const groupedPalette = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const groups: Record<string, QuickHtmlInventoryItem[]> = {};
    inventoryItems.forEach((comp) => {
      if (paletteCategoryFilter !== 'Tutte' && comp.inventoryCategory !== paletteCategoryFilter) {
        return;
      }
      if (
        q &&
        !comp.label.toLowerCase().includes(q) &&
        !comp.inventoryCategory.toLowerCase().includes(q) &&
        !comp.id.toLowerCase().includes(q) &&
        !comp.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        return;
      }
      if (!groups[comp.inventoryCategory]) groups[comp.inventoryCategory] = [];
      groups[comp.inventoryCategory].push(comp);
    });
    return groups;
  }, [inventoryItems, searchQuery, paletteCategoryFilter]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    inventoryItems.forEach((i) => set.add(i.inventoryCategory));
    return ['Tutte', ...Array.from(set)];
  }, [inventoryItems]);

  // Render preview of a single block inside the Composer Canvas (supports nested children!)
  const renderCanvasBlockCard = (block: AppForgeBlock, depth: number = 0) => {
    const reg = registry[block.component];
    if (!reg) return null;
    const isSelected = selectedBlockId === block.id;
    const isTargetContainer = targetContainerId === block.id;

    const childrenPreviewHtml =
      reg.container && block.children && block.children.length > 0
        ? block.children
            .map((ch) => {
              const chReg = registry[ch.component];
              return chReg ? renderComponentTemplate(chReg, ch.props) : '';
            })
            .join('')
        : '<div style="padding:8px;border:1px dashed #cbd5e1;border-radius:6px;color:#64748b;font-size:12px">Contenitore vuoto (clicca "+ Inserisci qui dentro" e scegli un oggetto)</div>';

    const previewHtml = renderComponentTemplate(reg, block.props, childrenPreviewHtml);

    return (
      <div
        key={block.id}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedBlockId(block.id);
        }}
        className={`relative rounded-lg border transition-all p-3 bg-white cursor-pointer ${
          depth > 0 ? 'ml-4 mt-2 border-l-4 border-l-indigo-500' : 'mb-2.5'
        } ${
          isSelected
            ? 'border-blue-600 ring-2 ring-blue-500/15 shadow-xs'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Top bar of block card */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
              {reg.icon}
            </span>
            <span className="text-xs font-bold text-slate-800 truncate">{reg.label}</span>
            <span className="text-[11px] font-mono text-slate-400">#{block.component}</span>
            {reg.container && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetContainerId(isTargetContainer ? null : block.id);
                }}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isTargetContainer
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {isTargetContainer ? '✓ Inserimento attivo qui dentro' : '+ Inserisci qui dentro'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => handleBlockAction(block.id, 'up')}
              title="Sposta su"
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleBlockAction(block.id, 'down')}
              title="Sposta giù"
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleBlockAction(block.id, 'dup')}
              title="Duplica blocco"
              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleBlockAction(block.id, 'del')}
              title="Elimina blocco"
              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live structural preview of the block */}
        <div
          className="text-xs text-slate-700 bg-slate-50/70 rounded p-2.5 border border-slate-100 overflow-x-auto pointer-events-none"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />

        {/* If container has nested children, render their interactive cards */}
        {reg.container && block.children && block.children.length > 0 && (
          <div className="mt-2 pt-2 border-t border-dashed border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>Figli annidati dentro {reg.label} ({block.children.length}):</span>
            </div>
            {block.children.map((child) => renderCanvasBlockCard(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* QuickHTML Editor Toolbar (Clean, focused on project assembly and navigation to Inventory / Preview / Export) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="text-xs font-bold text-slate-600">Progetto:</label>
          <input
            type="text"
            value={model.name}
            onChange={(e) => setModel((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nome del progetto..."
            className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 w-52 sm:w-64"
          />

          {onGoToSection && (
            <button
              type="button"
              onClick={() => onGoToSection('inventario')}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Apri Catalogo Inventario ({inventoryItems.length} Oggetti &amp; Funzioni)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearCanvas}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Svuota Tela</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSendToSplitCleaner && (
            <button
              type="button"
              onClick={() => {
                onSendToSplitCleaner(compiledHTML);
                onNotify('Codice inviato all’Editor WYSIWYG ↔ Sorgente & Cleaner.');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Code className="w-3.5 h-3.5 text-blue-600" />
              <span>Modifica in WYSIWYG ↔ Sorgente</span>
            </button>
          )}

          {onGoToSection && (
            <>
              <button
                type="button"
                onClick={() => onGoToSection('anteprima')}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Sezione Anteprima</span>
              </button>
              <button
                type="button"
                onClick={() => onGoToSection('esporta')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sezione Esporta</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main 3-Column Workspace: #palette (Left) | #canvas (Center) | #params (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: #palette (Accesso rapido a tutti gli oggetti dell'Inventario) */}
        <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col max-h-[780px]">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Palette Rapida ({inventoryItems.length})
                </h3>
              </div>
            </div>

            {/* Target Destination Selector */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-500">
                Destinazione al click:
              </div>
              {targetContainerId ? (
                <div className="flex items-center justify-between gap-2 bg-indigo-50 text-indigo-800 px-2.5 py-1.5 rounded text-xs font-semibold">
                  <span className="truncate">Dentro Contenitore #{targetContainerId.slice(0, 6)}</span>
                  <button
                    type="button"
                    onClick={() => setTargetContainerId(null)}
                    className="text-indigo-600 hover:text-indigo-900 cursor-pointer"
                    title="Torna a inserire nelle Regioni"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {(['header', 'main', 'footer'] as RegionName[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTargetRegion(r)}
                      className={`py-1 text-[11px] font-bold uppercase rounded transition-colors cursor-pointer ${
                        targetRegion === r
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Dropdown */}
            <select
              value={paletteCategoryFilter}
              onChange={(e) => setPaletteCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c === 'Tutte' ? `Tutte le Categorie (${inventoryItems.length})` : c}
                </option>
              ))}
            </select>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca oggetto o funzione..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="p-3 overflow-y-auto space-y-4 divide-y divide-slate-100">
            {Object.entries(groupedPalette).map(([category, items]) => (
              <div key={category} className="pt-3 first:pt-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  {category} ({items.length})
                </div>
                <div className="space-y-1.5">
                  {items.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleAddComponent(comp.id)}
                      className="w-full text-left px-2.5 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-700 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                          {comp.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {comp.label}
                          </div>
                          {comp.container && (
                            <div className="text-[10px] text-indigo-600 font-medium">
                              Contenitore annidabile
                            </div>
                          )}
                        </div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER COLUMN: #canvas (Tela Regioni Header/Main/Footer) */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-[700px]">
          <div className="px-4 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setCenterTab('canvas')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  centerTab === 'canvas'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  2. Tela Compositore (
                  {model.regions.header.length +
                    model.regions.main.length +
                    model.regions.footer.length}{' '}
                  blocchi)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCenterTab('preview')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  centerTab === 'preview'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Test Rapido Sandbox</span>
              </button>
              <button
                type="button"
                onClick={() => setCenterTab('code')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  centerTab === 'code'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Sorgente HTML</span>
              </button>
            </div>
          </div>

          {centerTab === 'canvas' && (
            <div className="p-4 bg-slate-100/70 flex-1 overflow-y-auto space-y-4">
              {(['header', 'main', 'footer'] as RegionName[]).map((regionName) => {
                const blocks = model.regions[regionName] || [];
                const isTarget = !targetContainerId && targetRegion === regionName;
                return (
                  <div
                    key={regionName}
                    onClick={() => {
                      setTargetContainerId(null);
                      setTargetRegion(regionName);
                    }}
                    className={`rounded-xl border-2 border-dashed p-3.5 transition-colors ${
                      isTarget
                        ? 'border-blue-500 bg-blue-50/20'
                        : 'border-slate-300 bg-white/60 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Regione: {regionName.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ({blocks.length} blocchi)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetContainerId(null);
                          setTargetRegion(regionName);
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer ${
                          isTarget
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {isTarget ? 'Regione attiva per inserimento' : 'Seleziona destinazione'}
                      </button>
                    </div>

                    {blocks.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400">
                        Nessun blocco in <strong>{regionName}</strong>. Clicca un oggetto nella Palette a sinistra o nella sezione Inventario per aggiungerlo qui.
                      </div>
                    ) : (
                      <div>{blocks.map((b) => renderCanvasBlockCard(b, 0))}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {centerTab === 'preview' && (
            <div className="flex-1 bg-slate-200 p-3 flex flex-col">
              <iframe
                title="QuickHTML Inline Sandbox"
                srcDoc={compiledHTML}
                sandbox="allow-scripts allow-modals"
                className="w-full flex-1 min-h-[620px] bg-white rounded-lg border border-slate-300 shadow-inner"
              />
            </div>
          )}

          {centerTab === 'code' && (
            <div className="flex-1 bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-auto max-h-[680px]">
              <pre className="leading-relaxed whitespace-pre-wrap break-words">{compiledHTML}</pre>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: #params (Pannello Proprietà & DNA Oggetto) */}
        <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col max-h-[780px]">
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setInspectorTab('props')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  inspectorTab === 'props'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Proprietà
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('dna')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  inspectorTab === 'dna'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Codice Oggetto
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('global')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  inspectorTab === 'global'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                CSS/JS Globali
              </button>
            </div>
          </div>

          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {inspectorTab === 'props' && (
              <>
                {!selectedBlock || !selectedRegDef ? (
                  <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                    <Sliders className="w-6 h-6 text-slate-300 mx-auto" />
                    <p>Seleziona un blocco nella Tela centrale per configurarne i parametri.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-blue-50 text-blue-700 font-mono text-xs font-bold flex items-center justify-center">
                          {selectedRegDef.icon}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{selectedRegDef.label}</h4>
                          <p className="text-[11px] font-mono text-slate-400">
                            id: &quot;{selectedRegDef.id}&quot; · regione: {selectedBlockInfo?.region}
                          </p>
                        </div>
                      </div>
                    </div>

                    {(selectedRegDef.config || []).length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Questo oggetto/funzione è già autoconfigurato e pronto all&apos;uso.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedRegDef.config.map((cfg) => {
                          const currentVal = selectedBlock.props[cfg.key] ?? cfg.default;
                          return (
                            <div key={cfg.key} className="space-y-1">
                              <label className="block text-[11px] font-bold text-slate-700">
                                {cfg.label}
                              </label>
                              {cfg.type === 'textarea' ? (
                                <textarea
                                  rows={3}
                                  value={String(currentVal)}
                                  onChange={(e) => handleUpdateBlockProp(cfg.key, e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                                />
                              ) : cfg.type === 'select' ? (
                                <select
                                  value={String(currentVal)}
                                  onChange={(e) => handleUpdateBlockProp(cfg.key, e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                                >
                                  {(cfg.options || []).map((opt) => (
                                    <option key={String(opt)} value={String(opt)}>
                                      {String(opt)}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={cfg.type === 'number' ? 'number' : 'text'}
                                  value={String(currentVal)}
                                  onChange={(e) =>
                                    handleUpdateBlockProp(
                                      cfg.key,
                                      cfg.type === 'number' ? Number(e.target.value) : e.target.value
                                    )
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                                />
                              )}
                              {cfg.hint && (
                                <p className="text-[10px] text-slate-400 leading-snug">{cfg.hint}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {inspectorTab === 'dna' && (
              <div className="space-y-3">
                {!selectedRegDef ? (
                  <p className="text-xs text-slate-400">
                    Seleziona un blocco per ispezionare il suo codice HTML, CSS e JS.
                  </p>
                ) : (
                  <>
                    <div className="text-xs font-bold text-slate-800">
                      Sorgente di <code>{selectedRegDef.id}</code>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400">HTML:</span>
                      <pre className="p-2 bg-slate-900 text-emerald-300 rounded text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                        {selectedRegDef.html}
                      </pre>
                    </div>
                    {selectedRegDef.css && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400">CSS:</span>
                        <pre className="p-2 bg-slate-900 text-sky-300 rounded text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                          {selectedRegDef.css}
                        </pre>
                      </div>
                    )}
                    {selectedRegDef.js && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400">JavaScript:</span>
                        <pre className="p-2 bg-slate-900 text-amber-300 rounded text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                          {selectedRegDef.js}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {inspectorTab === 'global' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Custom CSS Globale
                  </label>
                  <textarea
                    rows={5}
                    value={model.customCSS}
                    onChange={(e) => setModel((prev) => ({ ...prev, customCSS: e.target.value }))}
                    placeholder="/* Stili extra per il progetto */"
                    className="w-full p-2 text-xs font-mono bg-slate-900 text-sky-300 rounded-lg border border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Custom JS Globale
                  </label>
                  <textarea
                    rows={5}
                    value={model.customJS}
                    onChange={(e) => setModel((prev) => ({ ...prev, customJS: e.target.value }))}
                    placeholder="// Logica extra con accesso a window.afStore"
                    className="w-full p-2 text-xs font-mono bg-slate-900 text-amber-300 rounded-lg border border-slate-700"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
