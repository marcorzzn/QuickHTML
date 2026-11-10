export interface InlineMarks {
  bold?: boolean;
  italic?: boolean;
  link?: string;
}

export interface TextRun {
  text: string;
  marks: InlineMarks;
}

export type TextBlockType = 'h1' | 'h2' | 'p' | 'quote';
export type ElementTagType = 'button' | 'a' | 'img' | 'input' | 'hr';
export type ContainerTagType = 'section' | 'div' | 'article';
export type SnippetName = 'card' | 'nav' | 'form' | 'table' | 'counter' | 'custom';

export interface TextBlock {
  id: string;
  kind: 'text';
  type: TextBlockType;
  runs: TextRun[];
}

export interface ElementBlock {
  id: string;
  kind: 'element';
  tag: ElementTagType;
  text?: string;
  attrs: Record<string, string>;
}

export interface SnippetBlock {
  id: string;
  kind: 'snippet';
  name: SnippetName;
  title: string;
  html: string;
}

export interface ContainerBlock {
  id: string;
  kind: 'container';
  tag: ContainerTagType;
  label: string;
  attrs: Record<string, string>;
  children: EditorBlock[];
}

export type EditorBlock = TextBlock | ElementBlock | SnippetBlock | ContainerBlock;

export function createId(): string {
  return 'blk_' + Math.random().toString(36).substring(2, 9);
}

// Local SVG data URI for images so no external domain can ever break in hermetic sandboxes
export const LOCAL_ILLUSTRATION_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280">
    <rect width="600" height="280" rx="12" fill="#0F172A"/>
    <g stroke="#1E293B" stroke-width="1">
      <line x1="0" y1="70" x2="600" y2="70"/>
      <line x1="0" y1="140" x2="600" y2="140"/>
      <line x1="0" y1="210" x2="600" y2="210"/>
      <line x1="150" y1="0" x2="150" y2="280"/>
      <line x1="300" y1="0" x2="300" y2="280"/>
      <line x1="450" y1="0" x2="450" y2="280"/>
    </g>
    <rect x="48" y="52" width="160" height="176" rx="8" fill="#1E293B" stroke="#38BDF8" stroke-width="2"/>
    <text x="128" y="115" fill="#F8FAFC" font-family="monospace" font-size="14" text-anchor="middle" font-weight="bold">MODELLO</text>
    <text x="128" y="140" fill="#94A3B8" font-family="monospace" font-size="11" text-anchor="middle">{ kind: "element" }</text>
    <text x="128" y="162" fill="#38BDF8" font-family="monospace" font-size="11" text-anchor="middle">Fonte di Verità</text>
    <path d="M 225 140 L 285 140" stroke="#38BDF8" stroke-width="2" stroke-dasharray="4 4"/>
    <polygon points="285,135 295,140 285,145" fill="#38BDF8"/>
    <rect x="305" y="84" width="110" height="112" rx="8" fill="#0284C7"/>
    <text x="360" y="135" fill="#FFFFFF" font-family="monospace" font-size="13" text-anchor="middle" font-weight="bold">MAPPING</text>
    <text x="360" y="156" fill="#E0F2FE" font-family="monospace" font-size="10" text-anchor="middle">renderHTML()</text>
    <path d="M 425 140 L 465 140" stroke="#38BDF8" stroke-width="2"/>
    <polygon points="465,135 475,140 465,145" fill="#38BDF8"/>
    <rect x="480" y="52" width="84" height="176" rx="8" fill="#0F172A" stroke="#10B981" stroke-width="2"/>
    <text x="522" y="128" fill="#10B981" font-family="monospace" font-size="13" text-anchor="middle" font-weight="bold">TARGET</text>
    <text x="522" y="150" fill="#94A3B8" font-family="monospace" font-size="10" text-anchor="middle">&lt;iframe&gt;</text>
  </svg>`
)}`;

export const ELEMENT_DEFAULTS: Record<ElementTagType, { tag: ElementTagType; text?: string; attrs: Record<string, string> }> = {
  button: {
    tag: 'button',
    text: 'Esegui Azione',
    attrs: {
      onclick: "const el = document.getElementById('feedback-box'); if(el) { el.textContent = 'Azione eseguita alle ' + new Date().toLocaleTimeString(); el.style.display = 'block'; } else { alert('Ciao dal pulsante generato dal modello!'); }",
    },
  },
  a: {
    tag: 'a',
    text: 'Approfondisci la specifica HTML (MDN)',
    attrs: {
      href: 'https://developer.mozilla.org/it/docs/Web/HTML',
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  },
  img: {
    tag: 'img',
    attrs: {
      src: LOCAL_ILLUSTRATION_SVG,
      alt: 'Diagramma Architetturale: Modello -> Mapping -> Target',
    },
  },
  input: {
    tag: 'input',
    attrs: {
      type: 'text',
      placeholder: 'Scrivi un valore di prova qui...',
    },
  },
  hr: {
    tag: 'hr',
    attrs: {},
  },
};

export const SNIPPETS: Record<SnippetName, { title: string; description: string; html: string }> = {
  card: {
    title: 'Card Informativa con Output',
    description: 'Contenitore strutturato con area di stato pronta a ricevere eventi dal pulsante.',
    html: `<div class="card" id="card-demo">
  <h3>Modulo Osservatore Eventi</h3>
  <p>Questa porzione di codice è uno <strong>snippet pre-impostato</strong> inserito nel modello come unità pronta all'uso.</p>
  <div id="feedback-box" style="margin-top:0.75rem; padding:0.6rem 0.85rem; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; color:#0369a1; font-size:0.9rem;">
    In attesa di interazione dal pulsante...
  </div>
</div>`,
  },
  counter: {
    title: 'Widget Contatore Interattivo',
    description: 'Porzione di codice autonoma con stato locale e pulsanti +1 / Reset.',
    html: `<div class="card" style="display:flex; align-items:center; justify-content:space-between; gap:1rem;">
  <div>
    <strong style="display:block;">Contatore Interattivo in HTML</strong>
    <span style="font-size:0.85rem; color:#64748b;">Dimostra un tasto pre-impostato che modifica il DOM</span>
  </div>
  <div style="display:flex; align-items:center; gap:0.5rem;">
    <button type="button" onclick="const c=this.nextElementSibling; c.textContent = Number(c.textContent)+1;">Incrementa +1</button>
    <output style="font-family:monospace; font-size:1.25rem; font-weight:700; min-width:2.5rem; text-align:center; padding:0.25rem 0.5rem; background:#f1f5f9; border-radius:6px;">0</output>
  </div>
</div>`,
  },
  nav: {
    title: 'Barra di Navigazione',
    description: 'Struttura semantica <nav> con link orizzontali.',
    html: `<nav aria-label="Navigazione di esempio">
  <a href="#sezione-1">Panoramica</a>
  <a href="#sezione-2">Struttura DOM</a>
  <a href="#sezione-3">Sicurezza Sandbox</a>
</nav>`,
  },
  form: {
    title: 'Form di Invio con Intercettazione',
    description: 'Modulo <form> con input e pulsante submit che mostra il valore inserito.',
    html: `<form onsubmit="event.preventDefault(); const val = this.elements.messaggio.value || '(vuoto)'; const out = this.querySelector('.form-out'); out.textContent = 'Ricevuto dal form: ' + val; out.style.display='block';">
  <label style="display:block; margin-bottom:0.5rem; font-weight:500;">
    Messaggio da inviare al sandbox:
    <input type="text" name="messaggio" placeholder="Es. L'HTML descrive, il JS esegue" style="display:block; width:100%; margin-top:0.35rem; padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px;">
  </label>
  <button type="submit">Invia Dati</button>
  <p class="form-out" style="display:none; margin-top:0.75rem; padding:0.5rem 0.75rem; background:#ecfdf5; border:1px solid #a7f3d0; color:#047857; border-radius:6px; font-size:0.9rem;"></p>
</form>`,
  },
  table: {
    title: 'Tabella Comparativa Livelli',
    description: 'Tabella HTML con intestazioni semantiche <thead> e <tbody>.',
    html: `<table>
  <thead>
    <tr>
      <th>Strato Architetturale</th>
      <th>Rappresentazione</th>
      <th>Ruolo nell'Editor</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Modello Dati</td>
      <td>Albero JSON (kind, tag, attrs)</td>
      <td>Fonte di verità astratta</td>
    </tr>
    <tr>
      <td>Mapping</td>
      <td>renderBlockHTML() + escapeHTML()</td>
      <td>Traduzione verso il linguaggio target</td>
    </tr>
    <tr>
      <td>Target Isolato</td>
      <td>&lt;iframe sandbox srcdoc="..."&gt;</td>
      <td>Esecuzione sicura della pagina creata</td>
    </tr>
  </tbody>
</table>`,
  },
  custom: {
    title: 'Blocco HTML Libero',
    description: 'Inserisci qualunque markup personalizzato da testare nel sandbox.',
    html: `<section class="card">
  <h4>Blocco HTML Personalizzato</h4>
  <p>Modifica liberamente questo codice HTML per sperimentare nuovi tag e attributi.</p>
</section>`,
  },
};

export const INITIAL_MODEL: EditorBlock[] = [
  {
    id: 'blk_init_1',
    kind: 'text',
    type: 'h1',
    runs: [{ text: 'Costruire HTML usando l’HTML', marks: {} }],
  },
  {
    id: 'blk_init_2',
    kind: 'text',
    type: 'p',
    runs: [
      { text: 'Questa pagina è generata dal ', marks: {} },
      { text: 'modello astratto', marks: { bold: true } },
      { text: ' a sinistra e iniettata in tempo reale in un ', marks: {} },
      { text: 'iframe sandbox', marks: { italic: true } },
      { text: '. Usa la UI per configurare il pulsante o inserisci uno snippet pre-impostato.', marks: {} },
    ],
  },
  {
    id: 'blk_init_3',
    kind: 'element',
    tag: 'button',
    text: 'Attiva Segnale nel Box Sottostante',
    attrs: {
      onclick:
        "const el = document.getElementById('feedback-box'); if(el) { el.textContent = 'Segnale ricevuto dal pulsante! Timestamp: ' + new Date().toLocaleTimeString(); el.style.background = '#dcfce7'; el.style.borderColor = '#86efac'; el.style.color = '#166534'; } else { alert('Pulsante cliccato!'); }",
    },
  },
  {
    id: 'blk_init_4',
    kind: 'snippet',
    name: 'card',
    title: SNIPPETS.card.title,
    html: SNIPPETS.card.html,
  },
];

export function escapeHTML(s: string = ''): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderRunHTML(r: TextRun): string {
  let t = escapeHTML(r.text || '');
  const m = r.marks || {};
  if (m.link) t = `<a href="${escapeHTML(m.link)}" target="_blank" rel="noopener noreferrer">${t}</a>`;
  if (m.italic) t = `<em>${t}</em>`;
  if (m.bold) t = `<strong>${t}</strong>`;
  return t;
}

const TEXT_TAGS: Record<TextBlockType, string> = {
  p: 'p',
  h1: 'h1',
  h2: 'h2',
  quote: 'blockquote',
};

export function renderBlockHTML(b: EditorBlock, indent: string = '  '): string {
  if (b.kind === 'text') {
    const tag = TEXT_TAGS[b.type] || 'p';
    const inner = (b.runs || []).map(renderRunHTML).join('');
    return `${indent}<${tag}>${inner}</${tag}>`;
  }
  if (b.kind === 'element') {
    const attrs = Object.entries(b.attrs || {})
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => ` ${k}="${escapeHTML(v)}"`)
      .join('');
    if (['img', 'hr', 'input'].includes(b.tag)) {
      return `${indent}<${b.tag}${attrs}>`;
    }
    return `${indent}<${b.tag}${attrs}>${escapeHTML(b.text || '')}</${b.tag}>`;
  }
  if (b.kind === 'snippet') {
    return b.html
      .split('\n')
      .map((line) => `${indent}${line}`)
      .join('\n');
  }
  if (b.kind === 'container') {
    const attrs = Object.entries(b.attrs || {})
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => ` ${k}="${escapeHTML(v)}"`)
      .join('');
    const childrenHTML = (b.children || [])
      .map((child) => renderBlockHTML(child, indent + '  '))
      .join('\n');
    return `${indent}<${b.tag}${attrs}>\n${childrenHTML}\n${indent}</${b.tag}>`;
  }
  return '';
}

export function buildFullHTMLDocument(model: EditorBlock[]): string {
  const body = model.map((b) => renderBlockHTML(b, '  ')).join('\n\n');
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Documento Generato dal Modello</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 680px;
      margin: 2rem auto;
      padding: 0 1.25rem;
      line-height: 1.65;
      color: #0f172a;
      background: #ffffff;
    }
    h1 { font-size: 1.85rem; line-height: 1.25; margin: 0 0 0.75rem; color: #0f172a; letter-spacing: -0.02em; }
    h2 { font-size: 1.35rem; line-height: 1.3; margin: 1.5rem 0 0.5rem; color: #1e293b; }
    h3, h4 { margin: 0 0 0.5rem; color: #0f172a; }
    p { margin: 0 0 1rem; color: #334155; }
    button {
      padding: 0.55rem 1.1rem;
      border: 1px solid #0284c7;
      background: #0284c7;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.92rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background 150ms ease;
    }
    button:hover { background: #0369a1; }
    a { color: #0284c7; text-decoration: underline; text-underline-offset: 3px; }
    img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0.75rem 0; }
    input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.95rem;
      width: 100%;
      max-width: 360px;
    }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
    blockquote {
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #475569;
      font-style: italic;
    }
    .card, section.container-box, div.container-box, article.container-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.15rem;
      margin: 1rem 0;
      background: #ffffff;
    }
    nav {
      display: flex;
      gap: 1.25rem;
      padding: 0.65rem 0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 1rem;
    }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.9rem; }
    th, td { border: 1px solid #e2e8f0; padding: 0.6rem 0.75rem; text-align: left; }
    th { background: #f8fafc; font-weight: 600; color: #1e293b; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export function renderMarkdownFromModel(model: EditorBlock[]): string {
  return model
    .map((b) => {
      if (b.kind === 'text') {
        const text = b.runs
          .map((r) => {
            let t = r.text;
            if (r.marks.bold) t = `**${t}**`;
            if (r.marks.italic) t = `*${t}*`;
            if (r.marks.link) t = `[${t}](${r.marks.link})`;
            return t;
          })
          .join('');
        if (b.type === 'h1') return `# ${text}`;
        if (b.type === 'h2') return `## ${text}`;
        if (b.type === 'quote') return `> ${text}`;
        return text;
      }
      if (b.kind === 'element') {
        if (b.tag === 'button') return `[Pulsante UI: "${b.text}" -> onclick=${b.attrs.onclick || 'nessuna'}]`;
        if (b.tag === 'a') return `[${b.text || 'Link'}](${b.attrs.href || '#'})`;
        if (b.tag === 'img') return `![${b.attrs.alt || 'Immagine'}](${b.attrs.src || ''})`;
        if (b.tag === 'hr') return `---`;
        if (b.tag === 'input') return `[Input (${b.attrs.type || 'text'}): "${b.attrs.placeholder || ''}"]`;
      }
      if (b.kind === 'snippet') {
        return `<!-- Snippet pre-impostato: ${b.title} -->\n${b.html}`;
      }
      if (b.kind === 'container') {
        const inner = renderMarkdownFromModel(b.children);
        return `::: ${b.tag} (${b.label})\n${inner}\n:::`;
      }
      return '';
    })
    .join('\n\n');
}

export const KNOWN_INLINE: Record<string, 'bold' | 'italic'> = {
  STRONG: 'bold',
  B: 'bold',
  EM: 'italic',
  I: 'italic',
};

export function parseInlineNodes(nodes: NodeListOf<ChildNode> | ChildNode[], marks: InlineMarks = {}): TextRun[] {
  const runs: TextRun[] = [];
  const list = Array.from(nodes);
  for (const node of list) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        runs.push({ text: node.textContent, marks: { ...marks } });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR') {
        runs.push({ text: '\n', marks: { ...marks } });
      } else if (el.tagName === 'A') {
        runs.push(
          ...parseInlineNodes(el.childNodes, {
            ...marks,
            link: el.getAttribute('href') || '',
          })
        );
      } else if (KNOWN_INLINE[el.tagName]) {
        runs.push(
          ...parseInlineNodes(el.childNodes, {
            ...marks,
            [KNOWN_INLINE[el.tagName]]: true,
          })
        );
      } else {
        runs.push(...parseInlineNodes(el.childNodes, marks));
      }
    }
  }
  return runs.length > 0 ? runs : [{ text: '', marks: {} }];
}
