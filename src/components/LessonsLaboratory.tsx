import React, { useState, useEffect } from 'react';
import {
  escapeHTML,
  EditorBlock,
  buildFullHTMLDocument,
  renderMarkdownFromModel,
} from '../types/editor';
import { Code2, Eye, Layers, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

interface LessonsLaboratoryProps {
  model: EditorBlock[];
  onLoadPresetIntoStudio: (blocks: EditorBlock[]) => void;
}

interface InteractiveLesson {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  explanation: string;
  rawCode: string;
  defaultInput: string;
  challengeHint: string;
}

const LESSONS: InteractiveLesson[] = [
  {
    id: 'lez-1',
    step: '01. Il Trucco Fondamentale: L’Escaping',
    title: 'Separare il codice “usato” dal codice “menzionato”',
    subtitle: 'Come mostrare <p> come testo senza che il browser lo esegua e lo faccia sparire.',
    explanation:
      'Se scrivi <p>Ciao</p> nel sorgente di una pagina HTML, il browser interpreta <p> come istruzione strutturale e non mostra le parentesi angolari. Per insegnare l’HTML dentro l’HTML, devi usare le entità &lt; e &gt; nel livello menzionato (<pre><code>), mentre nel livello usato (<iframe sandbox>) lasci che il browser interpreti i tag.',
    rawCode: `<p>Questo è un paragrafo eseguito dal browser.</p>`,
    defaultInput: `<p>Ciao, mondo! Modifica questo <strong>paragrafo</strong> per vedere la differenza tra codice scritto ed eseguito.</p>`,
    challengeHint: 'Prova ad aggiungere &lt;strong&gt; nel testo per vedere come il browser mostra i tag letterali senza eseguirli.',
  },
  {
    id: 'lez-2',
    step: '02. Enfasi Semantica e Auto-Riferimento',
    title: 'La pagina usa ciò che sta spiegando',
    subtitle: 'I tre ruoli simultanei: Medium (la struttura), Soggetto (la lezione) ed Esempio (il sorgente).',
    explanation:
      'Quando una lezione spiega i tag <strong> (importanza forte) ed <em> (enfasi), usa quegli stessi tag per formattare la propria spiegazione. Chi studia può ispezionare la pagina stessa o sperimentare nel sandbox isolato qui sotto.',
    rawCode: `<p>Questo concetto è <strong>fondamentale</strong> e va letto con <em>attenzione</em>.</p>`,
    defaultInput: `<p>In un editor basato su modello, il <strong>significato</strong> precede sempre la <em>rappresentazione</em>.</p>`,
    challengeHint: 'Aggiungi un secondo paragrafo <p> o annida <em> dentro <strong>.',
  },
  {
    id: 'lez-3',
    step: '03. Elementi Attivi e Azioni UI',
    title: 'Dalla struttura statica al “tasto che fa una certa cosa”',
    subtitle: 'Collegare un elemento <button> o <a> a un comportamento osservabile nel target.',
    explanation:
      'In un editor di testo il pulsante “B” applica il grassetto. In un editor HTML, se vuoi nella tua schermata un tasto che compia un’azione, hai due vie: usare una UI che genera <button onclick="..."> dal modello, oppure inserire uno snippet HTML pre-impostato.',
    rawCode: `<button onclick="document.getElementById('out').textContent = 'Attivato!'">Cliccami</button>\n<p id="out">Stato iniziale</p>`,
    defaultInput: `<div style="padding:1rem; border:1px solid #cbd5e1; border-radius:8px;">\n  <p id="stato-demo" style="margin:0 0 0.75rem; font-weight:600; color:#0f172a;">Premi il pulsante per mutare il DOM del sandbox</p>\n  <button onclick="const s=document.getElementById('stato-demo'); s.textContent='DOM aggiornato con successo alle ' + new Date().toLocaleTimeString(); s.style.color='#0284c7';" style="padding:0.5rem 1rem; background:#0284c7; color:white; border:none; border-radius:6px; cursor:pointer;">Esegui Azione</button>\n</div>`,
    challengeHint: 'Cambia il testo o il colore applicato nell’attributo onclick e clicca il pulsante nell’anteprima.',
  },
];

export const LessonsLaboratory: React.FC<LessonsLaboratoryProps> = ({
  model,
  onLoadPresetIntoStudio,
}) => {
  const [lessonInputs, setLessonInputs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    LESSONS.forEach((l) => {
      init[l.id] = l.defaultInput;
    });
    return init;
  });

  // Interactive Escaping Machine (Gödel Numbering of HTML)
  const [escapeProbe, setEscapeProbe] = useState<string>(
    `<button onclick="alert('Ciao!')">Clicca <strong>qui</strong></button>`
  );
  const [doubleEscape, setDoubleEscape] = useState<boolean>(false);

  // Self-Inspection Quine State (fetches or inspects the actual live page DOM)
  const [pageQuineSource, setPageQuineSource] = useState<string>('');
  const [quineTargetView, setQuineTargetView] = useState<'html' | 'markdown' | 'json'>('html');

  const inspectLiveApplicationSource = () => {
    const docClone = document.documentElement.outerHTML;
    setPageQuineSource(docClone.slice(0, 2800) + '\n<!-- ... [Sorgente live del DOM ispezionato] ... -->');
  };

  useEffect(() => {
    inspectLiveApplicationSource();
  }, []);

  const escapedOnce = escapeHTML(escapeProbe);
  const escapedTwice = escapeHTML(escapedOnce);

  return (
    <div className="space-y-12 pb-16">
      {/* Section 1: Escaping Interactive Machine (Gödel Level Separation) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
        <div className="max-w-3xl mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <span>Meccanismo 01</span>
            <span aria-hidden="true">·</span>
            <span>Livello Menzionato vs Livello Usato</span>
            <span aria-hidden="true">·</span>
            <span>Numerazione di Gödel dell’HTML</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            La Macchina dell’Escaping: come l’HTML parla di se stesso
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Senza escaping, gli esempi di codice verrebbero interpretati dal browser come struttura della pagina e sparirebbero come testo. Digita qualsiasi frammento HTML qui sotto per osservare simultaneamente i tre livelli di rappresentazione.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Input Raw */}
          <div className="flex flex-col border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="escape-probe-input" className="text-xs font-semibold text-slate-700">
                1. Input Utente (Stringa nel Modello)
              </label>
              <span className="text-xs text-slate-500 font-mono">Dato grezzo</span>
            </div>
            <textarea
              id="escape-probe-input"
              value={escapeProbe}
              onChange={(e) => setEscapeProbe(e.target.value)}
              rows={4}
              className="w-full flex-1 font-mono text-xs p-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDoubleEscape(!doubleEscape)}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
              >
                {doubleEscape ? 'Mostra Escaping Singolo (1° ordine)' : 'Mostra Doppio Escaping (2° ordine)'}
              </button>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {escapeProbe.length} car.
              </span>
            </div>
          </div>

          {/* Escaped Entity Level (Mentioned) */}
          <div className="flex flex-col border border-slate-200 rounded-lg p-4 bg-slate-900 text-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-sky-400">
                2. Livello Menzionato (Sorgente Escapato)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {doubleEscape ? '&amp;lt;' : '&lt;...&gt;'}
              </span>
            </div>
            <pre className="flex-1 font-mono text-xs p-3 bg-slate-950 rounded-md overflow-x-auto whitespace-pre-wrap break-all text-amber-300 border border-slate-800">
              <code>{doubleEscape ? escapedTwice : escapedOnce}</code>
            </pre>
            <p className="mt-3 text-xs text-slate-400 leading-normal">
              {doubleEscape
                ? 'Per spiegare come si scrive &lt;, la pagina deve scrivere &amp;lt; nel proprio sorgente.'
                : 'Ciò che devi scrivere dentro <pre><code> affinché il browser mostri il codice come testo.'}
            </p>
          </div>

          {/* Executed Level (Used in Sandbox) */}
          <div className="flex flex-col border border-slate-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-700">
                3. Livello Usato (Eseguito in Sandbox)
              </span>
              <span className="text-xs text-slate-500 font-mono">&lt;iframe srcdoc&gt;</span>
            </div>
            <iframe
              title="Anteprima Escaping Probe"
              sandbox="allow-scripts allow-modals"
              srcDoc={`<!DOCTYPE html><html><head><style>body{font-family:system-ui,sans-serif;padding:0.75rem;margin:0;color:#0f172a;}button{padding:0.4rem 0.85rem;background:#0284c7;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;}</style></head><body>${escapeProbe}</body></html>`}
              className="w-full flex-1 min-h-[96px] border border-slate-200 rounded-md bg-white"
            />
            <p className="mt-3 text-xs text-slate-500 leading-normal">
              Qui i caratteri <code className="font-mono text-slate-700">&lt;</code> e <code className="font-mono text-slate-700">&gt;</code> sono interpretati dal parser HTML.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Interactive Self-Teaching Lessons */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Percorso Didattico Interattivo</span>
              <span aria-hidden="true">·</span>
              <span>3 Lezioni Live</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Impara l’HTML con l’HTML: Esercizi Auto-Eseguibili
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-md">
            Ogni lezione contiene il codice menzionato (<code className="font-mono">escape</code>) e un banco di prova isolato (<code className="font-mono">&lt;iframe sandbox&gt;</code>).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {LESSONS.map((lesson) => {
            const currentVal = lessonInputs[lesson.id] ?? lesson.defaultInput;
            return (
              <article
                key={lesson.id}
                className="bg-white border border-slate-200 rounded-xl p-6 transition-colors"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left: Theory & Escaped Example */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="text-xs font-semibold text-blue-700 font-mono">
                      {lesson.step}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {lesson.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {lesson.explanation}
                    </p>
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span>Esempio mostrato con <code className="font-mono">&lt;pre&gt;&lt;code&gt;</code>:</span>
                        <span className="font-mono text-slate-400">Sorgente: {escapeHTML(lesson.rawCode).slice(0, 22)}…</span>
                      </div>
                      <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
                        <code>{lesson.rawCode}</code>
                      </pre>
                    </div>
                    <p className="text-xs text-slate-500 pt-1">
                      Suggerimento: {lesson.challengeHint}
                    </p>
                  </div>

                  {/* Right: Live Editor + Sandboxed Preview */}
                  <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor={`ed-${lesson.id}`}
                          className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                        >
                          <Code2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Sorgente (&lt;textarea&gt;)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setLessonInputs((prev) => ({
                              ...prev,
                              [lesson.id]: lesson.defaultInput,
                            }))
                          }
                          className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Ripristina</span>
                        </button>
                      </div>
                      <textarea
                        id={`ed-${lesson.id}`}
                        value={currentVal}
                        onChange={(e) =>
                          setLessonInputs((prev) => ({
                            ...prev,
                            [lesson.id]: e.target.value,
                          }))
                        }
                        rows={7}
                        className="w-full flex-1 font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                      />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Target (&lt;iframe sandbox&gt;)</span>
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Isolato</span>
                      </div>
                      <iframe
                        title={`Preview ${lesson.title}`}
                        sandbox="allow-scripts allow-modals"
                        srcDoc={`<!DOCTYPE html><html><head><style>body{font-family:system-ui,sans-serif;padding:0.85rem;margin:0;line-height:1.5;color:#0f172a;}</style></head><body>${currentVal}</body></html>`}
                        className="w-full flex-1 min-h-[160px] border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Section 3: Architecture Abstraction & Multi-Target Mapping (Model -> HTML / Markdown / JSON) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Separazione dei Livelli</span>
              <span aria-hidden="true">·</span>
              <span>Modello ≠ Mapping ≠ Target</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Perché il Modello non è HTML: un solo Modello, molteplici Target
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Quando chiedi nell’editor <em>“voglio un tasto che faccia una certa cosa”</em>, la UI aggiorna una struttura dati pura. Poiché il modello descrive il <strong>significato</strong> e non i tag, possiamo cambiare la funzione di <strong>mapping</strong> per generare un documento HTML completo, un file Markdown o ispezionare il sorgente live di questa stessa applicazione (Quine).
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-semibold text-slate-900">1. Percorso UI → Elemento Configurato</div>
                <p className="text-xs text-slate-600 mt-1">
                  Scegli “Button” dalla palette → il modello riceve <code className="font-mono text-slate-800">{`{ kind: 'element', tag: 'button' }`}</code> → la modale configura l’azione → il mapping produce il tag.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-semibold text-slate-900">2. Percorso Snippet Pre-impostato</div>
                <p className="text-xs text-slate-600 mt-1">
                  Scegli uno snippet (Card, Contatore, Form) → il modello incapsula una porzione di codice HTML pre-impostata pronta da personalizzare.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  onLoadPresetIntoStudio([
                    {
                      id: 'preset_1',
                      kind: 'text',
                      type: 'h1',
                      runs: [{ text: 'Laboratorio Interattivo Caricato', marks: {} }],
                    },
                    {
                      id: 'preset_2',
                      kind: 'element',
                      tag: 'button',
                      text: 'Cambia Tema della Card Sottostante',
                      attrs: {
                        onclick:
                          "const c = document.getElementById('card-demo'); if(c){ c.style.background = c.style.background === 'rgb(15, 23, 42)' ? '#ffffff' : '#0f172a'; c.style.color = c.style.color === 'rgb(248, 250, 252)' ? '#0f172a' : '#f8fafc'; }",
                      },
                    },
                    {
                      id: 'preset_3',
                      kind: 'snippet',
                      name: 'counter',
                      title: 'Widget Contatore Interattivo',
                      html: `<div class="card" id="card-demo" style="transition: all 200ms ease;">\n  <h3>Card Bersaglio del Pulsante</h3>\n  <p>Clicca il pulsante sopra per invertire i colori di questa card, oppure usa il contatore qui sotto:</p>\n  <button type="button" onclick="this.textContent = 'Conteggio clic: ' + (Number(this.dataset.c = (Number(this.dataset.c||0)+1)))">Conteggio clic: 0</button>\n</div>`,
                    },
                  ])
                }
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Carica Esempio Interattivo nello Studio
              </button>
            </div>
          </div>

          {/* Right: Multi-Mapping Live Compiler Output */}
          <div className="lg:col-span-7 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuineTargetView('html')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    quineTargetView === 'html'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mapping → HTML
                </button>
                <button
                  type="button"
                  onClick={() => setQuineTargetView('markdown')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    quineTargetView === 'markdown'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mapping → Markdown
                </button>
                <button
                  type="button"
                  onClick={() => {
                    inspectLiveApplicationSource();
                    setQuineTargetView('json');
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    quineTargetView === 'json'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ispeziona DOM di Questa App (Quine)
                </button>
              </div>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {model.length} blocchi nel modello attivo
              </span>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[380px] leading-relaxed">
              <code>
                {quineTargetView === 'html' && buildFullHTMLDocument(model)}
                {quineTargetView === 'markdown' && renderMarkdownFromModel(model)}
                {quineTargetView === 'json' && pageQuineSource}
              </code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};
