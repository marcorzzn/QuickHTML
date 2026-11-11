import React, { useState } from 'react';
import {
  AppForgeModel,
  RegistryComponentDef,
  buildAppForgeExportHTML,
} from '../utils/appForgeRegistry';
import {
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  Code,
  Download,
  Sliders,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface QuickHtmlPreviewSectionProps {
  model: AppForgeModel;
  registry: Record<string, RegistryComponentDef>;
  onGoToSection: (sec: 'editor' | 'inventario' | 'lezioni' | 'anteprima' | 'esporta') => void;
  onNotify: (msg: string) => void;
}

export const QuickHtmlPreviewSection: React.FC<QuickHtmlPreviewSectionProps> = ({
  model,
  registry,
  onGoToSection,
  onNotify,
}) => {
  const [viewportWidth, setViewportWidth] = useState<'100%' | '1180px' | '768px' | '390px'>('100%');
  const [reloadKey, setReloadKey] = useState<number>(1);
  const [showSourceOverlay, setShowSourceOverlay] = useState<boolean>(false);

  const compiledHTML = buildAppForgeExportHTML(model, registry);
  const totalBlocks =
    (model.regions.header?.length || 0) +
    (model.regions.main?.length || 0) +
    (model.regions.footer?.length || 0);

  return (
    <div className="space-y-5">
      {/* Preview Control Header */}
      <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5" />
            <span>Ambiente di Simulazione ed Esecuzione Isolata (Sandbox)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Anteprima Live: {model.name}
          </h2>
        </div>

        {/* Viewport Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setViewportWidth('100%')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                viewportWidth === '100%' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Full (100%)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportWidth('768px')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                viewportWidth === '768px' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet (768px)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportWidth('390px')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer ${
                viewportWidth === '390px' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile (390px)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setReloadKey((k) => k + 1);
              onNotify('Sandbox riavviato da stato pulito.');
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Riavvia Sandbox</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSourceOverlay((s) => !s)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Code className="w-3.5 h-3.5 text-sky-400" />
            <span>{showSourceOverlay ? 'Mostra Vista Renderizzata' : 'Ispeziona Sorgente Compilato'}</span>
          </button>

          <button
            type="button"
            onClick={() => onGoToSection('esporta')}
            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Vai a Esporta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            Blocchi radice: <strong className="font-mono text-slate-900">{totalBlocks}</strong> (Header:{' '}
            {model.regions.header.length}, Main: {model.regions.main.length}, Footer:{' '}
            {model.regions.footer.length})
          </span>
          <span>·</span>
          <span>
            Dimensione bundle compilato:{' '}
            <strong className="font-mono text-slate-900">{compiledHTML.length} bytes</strong>
          </span>
          <span>·</span>
          <span>
            Store reattivo: <code className="text-blue-700 font-semibold">window.afStore</code> attivo
          </span>
        </div>

        <button
          type="button"
          onClick={() => onGoToSection('editor')}
          className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
        >
          ← Torna all&apos;Editor per modificare i blocchi
        </button>
      </div>

      {/* Viewport Stage */}
      {showSourceOverlay ? (
        <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-800 p-5 font-mono text-xs overflow-auto max-h-[720px]">
          <pre className="leading-relaxed whitespace-pre-wrap break-words">{compiledHTML}</pre>
        </div>
      ) : (
        <div className="bg-slate-200/80 border border-slate-300 rounded-xl p-4 sm:p-6 flex justify-center min-h-[680px]">
          <div
            style={{ width: viewportWidth }}
            className="bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden transition-all duration-200 flex flex-col"
          >
            <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>sandbox://quickhtml/{model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html</span>
              <span>Larghezza: {viewportWidth}</span>
            </div>
            <iframe
              key={reloadKey}
              title="QuickHTML Full Preview"
              srcDoc={compiledHTML}
              sandbox="allow-scripts allow-modals"
              className="w-full flex-1 min-h-[640px] border-0 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
