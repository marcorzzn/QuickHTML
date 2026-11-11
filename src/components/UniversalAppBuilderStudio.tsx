import React, { useState, useEffect } from 'react';
import {
  APP_MODULE_PACKAGES,
  APP_BLUEPRINT_RECIPES,
  MODULE_CATEGORIES,
  ModuleCategory,
  AppModulePackage,
  buildAssembledAppHTML,
} from '../utils/appModulesRegistry';
import {
  Package,
  Layers,
  Code2,
  Eye,
  Download,
  Copy,
  Check,
  Sparkles,
  FileCode2,
  Play,
  Sliders,
  Cpu,
  FolderOpen,
} from 'lucide-react';

interface UniversalAppBuilderStudioProps {
  onNotify: (msg: string) => void;
  onSendToSplitCleaner?: (htmlSource: string) => void;
}

export const UniversalAppBuilderStudio: React.FC<UniversalAppBuilderStudioProps> = ({
  onNotify,
  onSendToSplitCleaner,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    'pkg_shell_theme',
    'pkg_ribbon_Dispatcher',
    'pkg_word_page_canvas',
    'pkg_spreadsheet_formula_engine',
    'pkg_persistence_codec',
    'pkg_status_modal_toast',
  ]);
  const [activeCategory, setActiveCategory] = useState<ModuleCategory | 'all'>('all');
  const [accentColor, setAccentColor] = useState<string>('#2b579a');
  const [appTitle, setAppTitle] = useState<string>('Office_Studio_Custom');
  const [inspectingModule, setInspectingModule] = useState<AppModulePackage | null>(
    APP_MODULE_PACKAGES[1]
  );
  const [rightTab, setRightTab] = useState<'live-app' | 'compiled-source' | 'office-full'>(
    'live-app'
  );
  const [compiledHtml, setCompiledHtml] = useState<string>('');
  const [officeOriginalHtml, setOfficeOriginalHtml] = useState<string>('');
  const [loadingOfficeRef, setLoadingOfficeRef] = useState<boolean>(false);

  // Recompile single-file HTML app whenever modules, accent, or title change
  useEffect(() => {
    const out = buildAssembledAppHTML(selectedIds, accentColor, appTitle);
    setCompiledHtml(out);
  }, [selectedIds, accentColor, appTitle]);

  // Load the attached Office Studio single-file reference when requested
  const loadAttachedOfficeStudio = async () => {
    if (officeOriginalHtml) {
      setRightTab('office-full');
      return;
    }
    setLoadingOfficeRef(true);
    try {
      const res = await fetch(
        '/assets/aistudio/Paste_November_11__2026_-_3_58PM_2d8eb1a7'
      );
      if (res.ok) {
        const text = await res.text();
        setOfficeOriginalHtml(text);
        setRightTab('office-full');
        onNotify('Sorgente completo "Office Studio — Word & Excel" caricato nel Sandbox');
      } else {
        onNotify('Impossibile leggere il file allegato');
      }
    } catch {
      onNotify('Errore nel caricamento del riferimento Office Studio');
    } finally {
      setLoadingOfficeRef(false);
    }
  };

  const toggleModule = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyBlueprintRecipe = (recipeId: string) => {
    const recipe = APP_BLUEPRINT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    setSelectedIds(recipe.moduleIds);
    setAccentColor(recipe.accentColor);
    setAppTitle(recipe.appTitle);
    setRightTab('live-app');
    onNotify(`Ricetta "${recipe.name}" assemblata e compilata in HTML`);
  };

  const handleDownloadAssembledApp = () => {
    const codeToSave =
      rightTab === 'office-full' && officeOriginalHtml
        ? officeOriginalHtml
        : compiledHtml;
    const blob = new Blob([codeToSave], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appTitle.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onNotify(`Applicazione standalone "${a.download}" scaricata`);
  };

  const filteredModules = APP_MODULE_PACKAGES.filter(
    (m) => activeCategory === 'all' || m.category === activeCategory
  );

  return (
    <div className="space-y-6">
      {/* Architectural Explanation Header: How to build ANY software from an archive of HTML/CSS/JS packages */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Dal Documento al Software Completo</span>
              <span aria-hidden="true">·</span>
              <span>Scomposizione di &ldquo;Office Studio — Word &amp; Excel&rdquo; in Pacchetti Riutilizzabili</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Costruttore Universale di App: Archivio di Pacchetti, Funzioni e Motori
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Come si passa da un semplice testo HTML a un programma completo come il tuo <strong>Office Studio (Word &amp; Excel)</strong> o a qualunque altro software? Ogni funzionalità (la barra multifunzione, il foglio A4, il valutatore di formule <code className="font-mono">=SOMMA()</code>, la bacheca Kanban, il salvataggio IndexedDB/ZIP) è una <strong>tripla autonoma</strong>: <code className="font-mono">{`{ Stile CSS, Struttura HTML, Funzione JS }`}</code> collegata da un <em>Command Dispatcher</em> (<code className="font-mono">data-cmd</code>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAttachedOfficeStudio}
              disabled={loadingOfficeRef}
              className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>
                {loadingOfficeRef
                  ? 'Caricamento...'
                  : 'Esegui "Office Studio (Word & Excel)" Allegato'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleDownloadAssembledApp}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Scarica App (.HTML Unico)</span>
            </button>
          </div>
        </div>

        {/* Preset Software Blueprints ("Ricette pronte") */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {APP_BLUEPRINT_RECIPES.map((recipe) => (
            <div
              key={recipe.id}
              className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 hover:bg-white hover:border-blue-300 transition-colors flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-900">{recipe.name}</span>
                  <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {recipe.moduleIds.length} pacchetti
                  </span>
                </div>
                <p className="text-[11px] font-medium text-blue-700 mb-1">
                  {recipe.subtitle}
                </p>
                <p className="text-xs text-slate-600 leading-normal">
                  {recipe.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyBlueprintRecipe(recipe.id)}
                className="w-full py-1.5 px-3 text-xs font-semibold text-slate-800 bg-white hover:bg-blue-600 hover:text-white border border-slate-300 hover:border-blue-600 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Assembla questa App</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main 12-Col Builder Workspace: Left (Archive of Packages + Inspector) | Right (Live Running Software + Compiled HTML) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 5 COLS: Archive of Code Packages & Triplet Inspector */}
        <div className="lg:col-span-5 space-y-4">
          {/* Global Customization Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Personalizzazione Globale Shell (--accent &amp; Titolo)</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                {selectedIds.length}/{APP_MODULE_PACKAGES.length} moduli attivi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Nome Applicazione
                </label>
                <input
                  type="text"
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Colore Tema CSS (<code className="font-mono">--accent</code>)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-7 w-10 border border-slate-300 rounded cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setAccentColor('#2b579a')}
                    className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 rounded font-mono cursor-pointer"
                  >
                    Word #2b579a
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccentColor('#217346')}
                    className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 rounded font-mono cursor-pointer"
                  >
                    Excel #217346
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Package Archive List */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Archivio Pacchetti &amp; Funzioni (Scegli cosa includere)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Attiva o disattiva un pacchetto: il compilatore inietta istantaneamente il suo CSS, HTML e JS nell&apos;app a destra.
                </p>
              </div>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              {MODULE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeCategory === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Module Cards */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredModules.map((mod) => {
                const isEnabled = selectedIds.includes(mod.id);
                const isInspected = inspectingModule?.id === mod.id;
                return (
                  <div
                    key={mod.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isEnabled
                        ? 'bg-blue-50/40 border-blue-300'
                        : 'bg-slate-50 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleModule(mod.id)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {mod.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {mod.summary}
                          </div>
                          <div className="text-[10px] font-mono text-blue-700 mt-1">
                            {mod.originNote}
                          </div>
                        </div>
                      </label>

                      <button
                        type="button"
                        onClick={() => setInspectingModule(mod)}
                        className={`px-2 py-1 text-[11px] font-medium rounded border shrink-0 cursor-pointer ${
                          isInspected
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
                        }`}
                      >
                        Ispeziona Codice
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Single Package Anatomy Inspector (CSS + HTML + JS Triplet) */}
          {inspectingModule && (
            <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] font-mono text-sky-400">
                    Anatomia del singolo Pacchetto ({inspectingModule.categoryLabel})
                  </span>
                  <h4 className="text-xs font-bold text-white">
                    {inspectingModule.title}
                  </h4>
                </div>
                {onSendToSplitCleaner && (
                  <button
                    type="button"
                    onClick={() => {
                      onSendToSplitCleaner(inspectingModule.html);
                      onNotify(
                        `Markup HTML di "${inspectingModule.title}" inviato all'Editor Split View`
                      );
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Modifica HTML nello Split View
                  </button>
                )}
              </div>

              <div className="space-y-2 text-[11px] font-mono">
                <div>
                  <div className="text-amber-400 mb-1">1. Struttura HTML del modulo:</div>
                  <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 overflow-x-auto max-h-28 text-slate-200">
                    <code>{inspectingModule.html}</code>
                  </pre>
                </div>
                <div>
                  <div className="text-emerald-400 mb-1">
                    2. Logica &amp; Funzioni JS del modulo:
                  </div>
                  <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 overflow-x-auto max-h-36 text-slate-200">
                    <code>{inspectingModule.js}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 7 COLS: Live Running Assembled Application + Full Single-File Code */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-2xs">
            {/* Top Bar of the Preview / Compiler Output */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setRightTab('live-app')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    rightTab === 'live-app'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>App Assemblata Live</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('compiled-source')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    rightTab === 'compiled-source'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sorgente Unico Compilato ({compiledHtml.length} car.)</span>
                </button>
                <button
                  type="button"
                  onClick={loadAttachedOfficeStudio}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    rightTab === 'office-full'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Office Studio (Word &amp; Excel) Allegato</span>
                </button>
              </div>

              {onSendToSplitCleaner && rightTab === 'compiled-source' && (
                <button
                  type="button"
                  onClick={() => {
                    onSendToSplitCleaner(compiledHtml);
                    onNotify('Applicazione inviata allo Split View per editing fine');
                  }}
                  className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                >
                  Apri nello Split Editor
                </button>
              )}
            </div>

            {/* Viewport Content */}
            {rightTab === 'live-app' && (
              <div className="flex flex-col flex-1">
                <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-900 flex items-center justify-between">
                  <span>
                    <strong>Software in esecuzione nel Sandbox:</strong> prova i tasti della Ribbon, scrivi nel foglio A4, calcola <code className="font-mono">=SOMMA(B1:B3)</code> o sposta le card Kanban!
                  </span>
                  <span className="font-mono text-[11px] text-emerald-700">1 file HTML</span>
                </div>
                <iframe
                  title="Applicazione Assemblata Live"
                  sandbox="allow-scripts allow-modals allow-forms allow-downloads"
                  srcDoc={compiledHtml}
                  className="w-full h-[660px] border-0 bg-slate-100"
                />
              </div>
            )}

            {rightTab === 'compiled-source' && (
              <div className="flex flex-col flex-1 bg-slate-950 text-slate-100">
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>
                    Codice HTML+CSS+JS auto-contenuto generato combinando i{' '}
                    <strong>{selectedIds.length} pacchetti</strong> selezionati
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(compiledHtml);
                      onNotify('Codice completo dell’app copiato negli appunti');
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                  >
                    Copia Tutto il File .HTML
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-300 overflow-auto h-[660px] leading-relaxed">
                  <code>{compiledHtml}</code>
                </pre>
              </div>
            )}

            {rightTab === 'office-full' && (
              <div className="flex flex-col flex-1">
                <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-950 flex items-center justify-between">
                  <span>
                    <strong>Esecuzione Diretta del tuo file allegato:</strong> Office Studio — Word &amp; Excel (con codec ZIP/DEFLATE, DOCX/XLSX e motore formule completo)
                  </span>
                  <span className="font-mono text-[11px] text-indigo-700 tabular-nums">
                    {officeOriginalHtml.length} car.
                  </span>
                </div>
                <iframe
                  title="Office Studio Word & Excel Reference"
                  sandbox="allow-scripts allow-modals allow-forms allow-downloads"
                  srcDoc={officeOriginalHtml}
                  className="w-full h-[660px] border-0 bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
