import React, { useState, useMemo } from 'react';
import {
  AppForgeModel,
  RegistryComponentDef,
  buildAppForgeExportHTML,
  escapeHTML,
} from '../utils/appForgeRegistry';
import {
  Download,
  Copy,
  Check,
  FileCode,
  Braces,
  Package,
  Code,
  Upload,
} from 'lucide-react';

interface QuickHtmlExportSectionProps {
  model: AppForgeModel;
  registry: Record<string, RegistryComponentDef>;
  onImportModel: (newModel: AppForgeModel) => void;
  onNotify: (msg: string) => void;
}

export const QuickHtmlExportSection: React.FC<QuickHtmlExportSectionProps> = ({
  model,
  registry,
  onImportModel,
  onNotify,
}) => {
  const [exportTarget, setExportTarget] = useState<
    'single-html' | 'web-component' | 'json-model' | 'escaped-quine'
  >('single-html');
  const [minifyOutput, setMinifyOutput] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');

  const rawSingleHtml = useMemo(() => buildAppForgeExportHTML(model, registry), [model, registry]);

  const formattedOutput = useMemo(() => {
    if (exportTarget === 'single-html') {
      if (!minifyOutput) return rawSingleHtml;
      return rawSingleHtml
        .replace(/\n\s+/g, '\n')
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim();
    }

    if (exportTarget === 'web-component') {
      const safeTemplate = rawSingleHtml
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');
      return `/**
 * Web Component Autonomo generato da QuickHTML
 * Uso: <quick-html-app></quick-html-app>
 */
class QuickHtmlApp extends HTMLElement {
  connectedCallback() {
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.minHeight = '640px';
    iframe.style.border = 'none';
    iframe.srcdoc = \`${safeTemplate}\`;
    this.appendChild(iframe);
  }
}
customElements.define('quick-html-app', QuickHtmlApp);`;
    }

    if (exportTarget === 'json-model') {
      return JSON.stringify(model, null, 2);
    }

    // escaped-quine
    return `<pre class="quickhtml-escaped-source"><code>${escapeHTML(rawSingleHtml)}</code></pre>`;
  }, [exportTarget, rawSingleHtml, minifyOutput, model]);

  const handleDownload = () => {
    const slug = model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'quickhtml-app';
    let ext = '.html';
    let mime = 'text/html;charset=utf-8';
    if (exportTarget === 'web-component') {
      ext = '.js';
      mime = 'application/javascript;charset=utf-8';
    } else if (exportTarget === 'json-model') {
      ext = '.json';
      mime = 'application/json;charset=utf-8';
    }
    const blob = new Blob([formattedOutput], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug + ext;
    a.click();
    URL.revokeObjectURL(a.href);
    onNotify(`Scaricato file "${slug + ext}" (${formattedOutput.length} bytes).`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onNotify('Output compilato copiato negli appunti.');
    } catch {
      onNotify('Impossibile copiare automaticamente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono uppercase tracking-wider">
            <Download className="w-3.5 h-3.5" />
            <span>Compilatore &amp; Esportatore Multi-Target QuickHTML</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Esporta: {model.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Il compilatore raccoglie solo gli oggetti e le funzioni effettivamente usati nelle regioni <strong>Header</strong>, <strong>Main</strong> e <strong>Footer</strong>, unisce i relativi blocchi <code>&lt;style&gt;</code> e <code>&lt;script&gt;</code> e genera un pacchetto privo di dipendenze esterne.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiato!' : 'Copia negli Appunti'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Scarica File Compilato</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Target Selector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Formato di Esportazione
          </h3>

          <div className="space-y-2">
            {[
              {
                id: 'single-html',
                title: '1. Single-File HTML Autonomo (.html)',
                desc: 'Un unico file con HTML, CSS e JS integrati, apribile ovunque con doppio click.',
                icon: FileCode,
              },
              {
                id: 'web-component',
                title: '2. Web Component Custom Element (.js)',
                desc: 'Definisce il tag <quick-html-app> incapsulato pronto da includere in siti esistenti.',
                icon: Package,
              },
              {
                id: 'json-model',
                title: '3. Modello Progetto Portabile (.json)',
                desc: 'Salva l’albero strutturale delle regioni e dei parametri per riaprirlo in futuro.',
                icon: Braces,
              },
              {
                id: 'escaped-quine',
                title: '4. Sorgente Escapato Documentazione (&lt;...&gt;)',
                desc: 'Codice convertito in entità HTML per essere mostrato dentro una pagina web.',
                icon: Code,
              },
            ].map((t) => {
              const Icon = t.icon;
              const active = exportTarget === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setExportTarget(t.id as any)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                    active
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{t.title}</div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {exportTarget === 'single-html' && (
            <div className="pt-3 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={minifyOutput}
                  onChange={(e) => setMinifyOutput(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Compattezza / Rimuovi commenti e spazi superflui</span>
              </label>
            </div>
          )}

          {/* Import JSON Model Box */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Importa un Progetto JSON in QuickHTML</span>
            </div>
            <textarea
              rows={4}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='Incolla qui un modello JSON {"name": "...", "regions": {...}}'
              className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  const parsed = JSON.parse(importJsonText);
                  if (parsed && parsed.regions) {
                    onImportModel(parsed);
                    setImportJsonText('');
                    onNotify(`Progetto "${parsed.name || 'Importato'}" caricato nell'Editor!`);
                  } else {
                    onNotify('Il JSON non contiene la chiave "regions".');
                  }
                } catch {
                  onNotify('JSON non valido.');
                }
              }}
              className="w-full py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
            >
              Carica Progetto JSON
            </button>
          </div>
        </div>

        {/* Right Code Output */}
        <div className="lg:col-span-8 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 overflow-hidden shadow-xs">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Output Compilato ({exportTarget})</span>
            <span>{formattedOutput.length} caratteri</span>
          </div>
          <pre className="p-4 text-xs font-mono text-emerald-300 overflow-auto max-h-[640px] leading-relaxed whitespace-pre-wrap break-words">
            {formattedOutput}
          </pre>
        </div>
      </div>
    </div>
  );
};
