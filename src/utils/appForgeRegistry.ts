export interface ConfigField {
  key: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  label: string;
  options?: Array<string | number>;
  default: string | number;
  hint?: string;
  raw?: boolean;
}

export interface RegistryComponentDef {
  id: string;
  category: 'Testo' | 'Controlli' | 'Media' | 'Layout' | 'Dati' | 'Editor' | '3D' | 'Avanzato';
  label: string;
  icon: string;
  container?: boolean;
  accepts?: string[];
  html: string;
  css: string;
  js?: string;
  config: ConfigField[];
}

export interface AppForgeBlock {
  id: string;
  component: string;
  props: Record<string, string | number | undefined>;
  children?: AppForgeBlock[];
}

export type RegionName = 'header' | 'main' | 'footer';

export interface AppForgeModel {
  name: string;
  regions: Record<RegionName, AppForgeBlock[]>;
  customCSS: string;
  customJS: string;
}

export function createBlockId(): string {
  return 'af_' + Math.random().toString(36).slice(2, 9);
}

export function escapeHTML(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c] || c;
  });
}

// Safe local SVG data URI for images so no external domain can break in hermetic sandboxes
export const SAFE_LOCAL_MEDIA_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260" viewBox="0 0 600 260">
    <rect width="600" height="260" rx="10" fill="#0F172A"/>
    <circle cx="140" cy="130" r="55" fill="#1E293B" stroke="#38BDF8" stroke-width="2"/>
    <polygon points="128,108 168,130 128,152" fill="#38BDF8"/>
    <text x="235" y="118" fill="#F8FAFC" font-family="system-ui,sans-serif" font-size="18" font-weight="700">AppForge Media Preview</text>
    <text x="235" y="145" fill="#94A3B8" font-family="monospace" font-size="12">Componente Registry Autosufficiente</text>
  </svg>`
)}`;

export const INITIAL_APPFORGE_REGISTRY: Record<string, RegistryComponentDef> = {
  /* ---- TESTO ---- */
  heading: {
    id: 'heading',
    category: 'Testo',
    label: 'Titolo',
    icon: 'H',
    html: '<h{{level}} class="af-h">{{text}}</h{{level}}>',
    css: '.af-h{font-family:inherit;margin:0 0 .5rem;color:#1a1a1a}',
    config: [
      { key: 'text', type: 'text', label: 'Testo', default: 'Titolo Applicazione' },
      { key: 'level', type: 'select', label: 'Livello', options: [1, 2, 3, 4], default: 1 },
    ],
  },
  paragraph: {
    id: 'paragraph',
    category: 'Testo',
    label: 'Paragrafo',
    icon: '¶',
    html: '<p class="af-p">{{text}}</p>',
    css: '.af-p{line-height:1.6;margin:0 0 .75rem;color:#333}',
    config: [
      {
        key: 'text',
        type: 'textarea',
        label: 'Testo (usa {{chiave}} per leggere lo stato reattivo)',
        default: 'Benvenuto in {{name}}. Modifica i campi per osservare lo stato reattivo.',
      },
    ],
  },

  /* ---- CONTROLLI ---- */
  button: {
    id: 'button',
    category: 'Controlli',
    label: 'Bottone',
    icon: '▣',
    html: '<button type="button" class="af-btn" data-action="{{action}}">{{text}}</button>',
    css: '.af-btn{padding:.5rem 1rem;border:1px solid #0b5fff;background:#0b5fff;color:#fff;border-radius:6px;font:inherit;font-size:.9rem;font-weight:600;cursor:pointer}.af-btn:hover{filter:brightness(1.08)}',
    js: 'document.querySelectorAll(".af-btn").forEach(b=>b.addEventListener("click",()=>{try{new Function("store", b.dataset.action)(window.afStore)}catch(e){console.error(e)}}));',
    config: [
      { key: 'text', type: 'text', label: 'Testo', default: 'Esegui Azione' },
      {
        key: 'action',
        type: 'text',
        label: 'Azione JS',
        default: "alert('Stato attuale: ' + JSON.stringify(store.state))",
        hint: "Codice eseguito al click nel sandbox (hai accesso a 'store')",
      },
    ],
  },
  input: {
    id: 'input',
    category: 'Controlli',
    label: 'Campo input',
    icon: '⌨',
    html: '<label class="af-field"><span>{{label}}</span><input type="{{type}}" placeholder="{{placeholder}}" value="{{defaultVal}}" data-bind="{{bind}}"></label>',
    css: '.af-field{display:flex;flex-direction:column;gap:.3rem;font-size:.85rem;margin:0 0 .75rem}.af-field input,.af-field textarea,.af-field select{padding:.45rem .7rem;border:1px solid #ccc;border-radius:6px;font:inherit}',
    config: [
      { key: 'label', type: 'text', label: 'Etichetta', default: 'Nome Progetto' },
      {
        key: 'type',
        type: 'select',
        label: 'Tipo',
        options: ['text', 'email', 'number', 'password', 'date'],
        default: 'text',
      },
      { key: 'placeholder', type: 'text', label: 'Placeholder', default: 'Inserisci valore...' },
      { key: 'defaultVal', type: 'text', label: 'Valore iniziale', default: 'AppForge Studio' },
      {
        key: 'bind',
        type: 'text',
        label: 'Chiave stato reattivo (data-bind)',
        default: 'name',
        hint: 'Aggiorna automaticamente qualsiasi testo che contiene {{name}}',
      },
    ],
  },
  textarea: {
    id: 'textarea',
    category: 'Controlli',
    label: 'Area testo',
    icon: '▤',
    html: '<label class="af-field"><span>{{label}}</span><textarea placeholder="{{placeholder}}" data-bind="{{bind}}" rows="3"></textarea></label>',
    css: '',
    config: [
      { key: 'label', type: 'text', label: 'Etichetta', default: 'Note Operative' },
      { key: 'placeholder', type: 'text', label: 'Placeholder', default: 'Scrivi qui...' },
      { key: 'bind', type: 'text', label: 'Chiave stato (data-bind)', default: 'notes' },
    ],
  },
  select: {
    id: 'select',
    category: 'Controlli',
    label: 'Tendina',
    icon: '▾',
    html: '<label class="af-field"><span>{{label}}</span><select data-bind="{{bind}}">{{options}}</select></label>',
    css: '.af-field select{background:#fff}',
    config: [
      { key: 'label', type: 'text', label: 'Etichetta', default: 'Modalità' },
      { key: 'options', type: 'text', label: 'Opzioni (separate da virgola)', default: 'Standard,Avanzata,Debug' },
      { key: 'bind', type: 'text', label: 'Chiave stato (data-bind)', default: 'mode' },
    ],
  },
  slider: {
    id: 'slider',
    category: 'Controlli',
    label: 'Slider',
    icon: '━',
    html: '<label class="af-field"><span>{{label}}: <strong data-bind-text="{{bind}}">{{value}}</strong></span><input type="range" min="{{min}}" max="{{max}}" step="{{step}}" value="{{value}}" data-bind="{{bind}}"></label>',
    css: '.af-field input[type=range]{width:100%;accent-color:#0b5fff;padding:0}',
    config: [
      { key: 'label', type: 'text', label: 'Etichetta', default: 'Intensità Effetto' },
      { key: 'min', type: 'number', label: 'Min', default: 0 },
      { key: 'max', type: 'number', label: 'Max', default: 100 },
      { key: 'step', type: 'number', label: 'Step', default: 1 },
      { key: 'value', type: 'number', label: 'Valore iniziale', default: 65 },
      { key: 'bind', type: 'text', label: 'Chiave stato (data-bind)', default: 'intensity' },
    ],
  },
  color: {
    id: 'color',
    category: 'Controlli',
    label: 'Selettore colore',
    icon: '◈',
    html: '<label class="af-field"><span>{{label}}</span><input type="color" value="{{value}}" data-bind="{{bind}}"></label>',
    css: '.af-field input[type=color]{height:36px;width:64px;padding:2px;cursor:pointer}',
    config: [
      { key: 'label', type: 'text', label: 'Etichetta', default: 'Colore Accento' },
      { key: 'value', type: 'text', label: 'Valore default', default: '#0b5fff' },
      { key: 'bind', type: 'text', label: 'Chiave stato', default: 'color' },
    ],
  },

  /* ---- MEDIA & FORGE VIDEO EDITOR ---- */
  image: {
    id: 'image',
    category: 'Media',
    label: 'Immagine',
    icon: '🖼',
    html: '<img class="af-img" src="{{src}}" alt="{{alt}}">',
    css: '.af-img{max-width:100%;height:auto;border-radius:8px;display:block}',
    config: [
      { key: 'src', type: 'text', label: 'URL / Data URI', default: SAFE_LOCAL_MEDIA_SVG },
      { key: 'alt', type: 'text', label: 'Testo Alternativo', default: 'Anteprima Media' },
    ],
  },
  transport: {
    id: 'transport',
    category: 'Media',
    label: 'Transport Player (Forge)',
    icon: '▶',
    html: '<div class="af-transport"><button type="button" data-tl="rew">⏮ 00:00</button><button type="button" data-tl="play">▶ Play / Pausa</button><button type="button" data-tl="step">+1 Frame ⏭</button><span class="af-tc" id="afTimecode">00:00:04:12</span></div>',
    css: '.af-transport{display:flex;align-items:center;gap:.5rem;background:#18181b;color:#f4f4f5;padding:.5rem .75rem;border-radius:8px}.af-transport button{background:#27272a;color:#fff;border:1px solid #3f3f46;padding:.35rem .75rem;border-radius:5px;font-size:.8rem;cursor:pointer}.af-transport button:hover{background:#3f3f46}.af-tc{margin-left:auto;font-family:monospace;color:#facc15;font-weight:700}',
    js: `(()=>{let playing=false,pos=20,timer=null;const updatePlayhead=()=>{document.querySelectorAll(".af-tl-playhead").forEach(p=>p.style.left=pos+"%");const tc=document.getElementById("afTimecode");if(tc)tc.textContent="00:00:"+String(Math.floor(pos/4)).padStart(2,"0")+":"+String(Math.floor((pos%4)*6)).padStart(2,"0")};document.querySelectorAll(".af-transport").forEach(tr=>{tr.addEventListener("click",e=>{const b=e.target.closest("button[data-tl]");if(!b)return;const act=b.dataset.tl;if(act==="rew"){pos=0;updatePlayhead()}else if(act==="step"){pos=(pos+2)%100;updatePlayhead()}else if(act==="play"){playing=!playing;if(playing){timer=setInterval(()=>{pos=(pos+1)%100;updatePlayhead()},120)}else clearInterval(timer)}})})})();`,
    config: [],
  },
  timeline: {
    id: 'timeline',
    category: 'Media',
    label: 'Timeline Multi-Traccia (Forge)',
    icon: '⏱',
    html: '<div class="af-timeline" style="height:{{height}}px"><div class="af-tl-tracks" data-tracks="{{tracks}}"></div><div class="af-tl-playhead"></div></div>',
    css: '.af-timeline{position:relative;background:#18181b;border-radius:8px;overflow:hidden;border:1px solid #27272a}.af-tl-tracks{display:flex;flex-direction:column;padding-top:8px}.af-tl-track{height:42px;border-bottom:1px solid #27272a;position:relative}.af-tl-clip{position:absolute;top:5px;height:32px;background:#2563eb;border:1px solid #60a5fa;border-radius:5px;display:flex;align-items:center;padding:0 8px;font-size:11px;font-weight:600;color:#fff;overflow:hidden;white-space:nowrap}.af-tl-playhead{position:absolute;top:0;bottom:0;width:2px;background:#facc15;left:20%;pointer-events:none}',
    js: 'document.querySelectorAll(".af-timeline").forEach(t=>{const tracks=(t.querySelector(".af-tl-tracks").dataset.tracks||"").split(";");const wrap=t.querySelector(".af-tl-tracks");wrap.innerHTML=tracks.map(tr=>{const clips=(tr||"").split(",").filter(Boolean);return `<div class="af-tl-track">${clips.map(c=>{const [label,start,dur]=c.split(":");return `<div class="af-tl-clip" style="left:${start||0}%;width:${dur||25}%">${label||"Clip"}</div>`}).join("")}</div>`}).join("")});',
    config: [
      { key: 'height', type: 'number', label: 'Altezza (px)', default: 155 },
      {
        key: 'tracks',
        type: 'textarea',
        label: 'Tracce (nome:inizio%:durata%)',
        default: 'Video Principale:0:42,Titoli Intro:45:28;Colonna Sonora:0:75;Effetti SFX:20:30',
        hint: '; separa le tracce, , separa le clip (es. Video:0:40)',
      },
    ],
  },

  /* ---- LAYOUT & CONTENITORI ANNIDATI (PUNTO 6 DELLA ROADMAP) ---- */
  grid: {
    id: 'grid',
    category: 'Layout',
    label: 'Griglia Contenitore (Annidabile)',
    icon: '⊞',
    container: true,
    accepts: ['card', 'paragraph', 'button', 'input', 'slider', 'chart', 'table'],
    html: '<div class="af-grid" style="grid-template-columns:repeat({{cols}},minmax(0,1fr));gap:{{gap}}px">{{children}}</div>',
    css: '.af-grid{display:grid;width:100%;margin:0 0 .75rem}',
    config: [
      { key: 'cols', type: 'number', label: 'Numero Colonne', default: 2 },
      { key: 'gap', type: 'number', label: 'Spaziatura Gap (px)', default: 12 },
    ],
  },
  card: {
    id: 'card',
    category: 'Layout',
    label: 'Card Contenitore (Annidabile)',
    icon: '▢',
    container: true,
    accepts: ['heading', 'paragraph', 'button', 'input', 'slider', 'select'],
    html: '<div class="af-card"><h3>{{title}}</h3><p>{{body}}</p><div class="af-card-children">{{children}}</div></div>',
    css: '.af-card{background:#fff;border:1px solid #e2e2e2;border-radius:10px;padding:1rem;margin:0 0 .75rem}.af-card h3{margin:0 0 .35rem;font-size:1rem;color:#0f172a}.af-card p{margin:0 0 .5rem;color:#475569;font-size:.88rem}.af-card-children{margin-top:.5rem}',
    config: [
      { key: 'title', type: 'text', label: 'Titolo Card', default: 'Modulo Operativo' },
      { key: 'body', type: 'textarea', label: 'Descrizione', default: 'Puoi annidare altri componenti qui dentro.' },
    ],
  },
  tabs: {
    id: 'tabs',
    category: 'Layout',
    label: 'Barra Tab / Ribbon (Office)',
    icon: '🗂',
    html: '<div class="af-tabs" data-tabs="{{tabs}}"></div>',
    css: '.af-tabs{display:flex;gap:.25rem;border-bottom:1px solid #e2e2e2;margin:0 0 .75rem}.af-tabs button{padding:.5rem 1rem;border:none;background:transparent;cursor:pointer;border-bottom:2px solid transparent;font-size:.85rem}.af-tabs button.active{border-bottom-color:#0b5fff;color:#0b5fff;font-weight:600}',
    js: 'document.querySelectorAll(".af-tabs").forEach(t=>{const tabs=(t.dataset.tabs||"").split(",");t.innerHTML=tabs.map((x,i)=>`<button type="button" class="${i===0?"active":""}">${x.trim()}</button>`).join("");t.addEventListener("click",e=>{if(!e.target.matches("button"))return;t.querySelectorAll("button").forEach(b=>b.classList.remove("active"));e.target.classList.add("active")})});',
    config: [
      { key: 'tabs', type: 'text', label: 'Schede (separate da virgola)', default: 'Word,Excel,Progetto,Esporta' },
    ],
  },
  divider: {
    id: 'divider',
    category: 'Layout',
    label: 'Separatore',
    icon: '—',
    html: '<hr class="af-hr">',
    css: '.af-hr{border:none;border-top:1px solid #e2e2e2;margin:1rem 0}',
    config: [],
  },
  spacer: {
    id: 'spacer',
    category: 'Layout',
    label: 'Spazio verticale',
    icon: '⬍',
    html: '<div style="height:{{h}}px"></div>',
    css: '',
    config: [{ key: 'h', type: 'number', label: 'Altezza (px)', default: 20 }],
  },

  /* ---- DATI & OFFICE SPREADSHEET ---- */
  spreadsheet: {
    id: 'spreadsheet',
    category: 'Dati',
    label: 'Foglio di Calcolo + Formula Bar (Office)',
    icon: 'ƒx',
    html: '<div class="af-sheet" data-init="{{initialData}}"><div class="af-fxbar"><span class="af-cellref">A1</span><span class="af-fxicon">ƒx</span><input class="af-fxinput" placeholder="Scrivi valore o =SOMMA(B1:B3) e premi Invio"></div><div class="af-table-wrap"><table class="af-sheet-grid"></table></div></div>',
    css: '.af-sheet{border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff;margin:0 0 .75rem}.af-fxbar{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f8fafc;border-bottom:1px solid #cbd5e1}.af-cellref{font-family:monospace;font-weight:700;padding:2px 8px;background:#fff;border:1px solid #cbd5e1;border-radius:4px;font-size:12px}.af-fxicon{font-family:serif;font-style:italic;font-weight:700;color:#64748b}.af-fxinput{flex:1;padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-family:monospace;font-size:12px}.af-sheet-grid{border-collapse:collapse;width:100%;font-size:12px}.af-sheet-grid th{background:#f1f5f9;border:1px solid #cbd5e1;padding:4px 6px;text-align:center;color:#475569}.af-sheet-grid td{border:1px solid #e2e8f0;padding:4px 8px;min-width:75px;height:26px;cursor:cell;font-variant-numeric:tabular-nums}.af-sheet-grid td.active{outline:2px solid #16a34a;outline-offset:-2px;background:#f0fdf4}',
    js: `document.querySelectorAll(".af-sheet").forEach(root=>{const cells={};(root.dataset.init||"").split(";").forEach(pair=>{const [k,v]=pair.split("=");if(k&&v!==undefined)cells[k.trim()]=v.trim()});let cur="B4";const refEl=root.querySelector(".af-cellref"),inpEl=root.querySelector(".af-fxinput"),tbl=root.querySelector(".af-sheet-grid");const evalCell=raw=>{const s=String(raw??"");if(!s.startsWith("="))return s;const m=/^(SOMMA|SUM|MEDIA|AVG)\\(([A-D][1-5]):([A-D][1-5])\\)$/i.exec(s.slice(1).trim());if(!m)return s;const fn=m[1].toUpperCase(),c1=m[2].charCodeAt(0)-65,r1=+m[2].slice(1),c2=m[3].charCodeAt(0)-65,r2=+m[3].slice(1),nums=[];for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++){const n=parseFloat(evalCell(cells[String.fromCharCode(65+c)+r]||"0"));if(!Number.isNaN(n))nums.push(n)}if(!nums.length)return 0;const sum=nums.reduce((a,b)=>a+b,0);return fn==="MEDIA"||fn==="AVG"?(sum/nums.length).toFixed(2):sum};const paint=()=>{const cols=["A","B","C","D"];let h="<thead><tr><th style='width:34px'>#</th>"+cols.map(c=>"<th>"+c+"</th>").join("")+"</tr></thead><tbody>";for(let r=1;r<=5;r++){h+="<tr><th>"+r+"</th>";for(const c of cols){const ref=c+r,raw=cells[ref]||"",val=evalCell(raw);h+="<td data-ref='"+ref+"' class='"+(ref===cur?"active":"")+"'>"+val+"</td>"}h+="</tr>"}tbl.innerHTML=h+"</tbody>";refEl.textContent=cur;inpEl.value=cells[cur]||""};tbl.addEventListener("click",e=>{const td=e.target.closest("td[data-ref]");if(!td)return;cur=td.dataset.ref;paint();inpEl.focus()});inpEl.addEventListener("keydown",e=>{if(e.key==="Enter"){cells[cur]=inpEl.value;paint()}});paint()});`,
    config: [
      {
        key: 'initialData',
        type: 'textarea',
        label: 'Celle iniziali (Cella=Valore separate da ;)',
        default: 'A1=Voce;B1=1200;A2=Sviluppo;B2=950;A3=Design;B3=600;A4=TOTALE;B4==SOMMA(B1:B3)',
      },
    ],
  },
  table: {
    id: 'table',
    category: 'Dati',
    label: 'Tabella Dati',
    icon: '▦',
    html: '<div class="af-table-wrap"><table class="af-table" data-cols="{{cols}}" data-rows="{{rows}}"></table></div>',
    css: '.af-table-wrap{overflow:auto;border:1px solid #e2e2e2;border-radius:8px;margin:0 0 .75rem;background:#fff}.af-table{border-collapse:collapse;width:100%;font-size:.85rem}.af-table th,.af-table td{border-bottom:1px solid #eee;padding:.5rem .75rem;text-align:left}.af-table th{background:#f8f8f8;font-weight:600}',
    js: 'document.querySelectorAll(".af-table").forEach(t=>{const cols=(t.dataset.cols||"").split(",");const rows=parseInt(t.dataset.rows||"4");let h="<thead><tr>"+cols.map(c=>`<th>${c.trim()}</th>`).join("")+"</tr></thead><tbody>";for(let i=0;i<rows;i++)h+="<tr>"+cols.map((c,ci)=>`<td>${c.trim()} #${i+1}</td>`).join("")+"</tr>";t.innerHTML=h+"</tbody>"});',
    config: [
      { key: 'cols', type: 'text', label: 'Colonne (separate da virgola)', default: 'Componente,Categoria,Stato' },
      { key: 'rows', type: 'number', label: 'Numero Righe', default: 4 },
    ],
  },
  chart: {
    id: 'chart',
    category: 'Dati',
    label: 'Grafico a barre (Canvas 2D)',
    icon: '📊',
    html: '<canvas class="af-chart" data-values="{{values}}" data-labels="{{labels}}" width="560" height="240"></canvas>',
    css: '.af-chart{max-width:100%;background:#fff;border:1px solid #e2e2e2;border-radius:8px;display:block;margin:0 0 .75rem}',
    js: 'document.querySelectorAll(".af-chart").forEach(c=>{const vals=(c.dataset.values||"").split(",").map(Number);const labs=(c.dataset.labels||"").split(",");const ctx=c.getContext("2d");const W=c.width,H=c.height,pad=36,maxV=Math.max(1,...vals);ctx.clearRect(0,0,W,H);const bw=(W-pad*2)/vals.length*.65;vals.forEach((v,i)=>{const x=pad+i*((W-pad*2)/vals.length)+8;const bh=(H-pad*2)*(v/maxV);ctx.fillStyle="#0b5fff";ctx.beginPath();ctx.roundRect(x,H-pad-bh,bw,bh,4);ctx.fill();ctx.fillStyle="#334155";ctx.font="11px system-ui";ctx.textAlign="center";ctx.fillText((labs[i]||"").trim(),x+bw/2,H-pad+15);ctx.fillText(String(v),x+bw/2,H-pad-bh-6)})});',
    config: [
      { key: 'values', type: 'text', label: 'Valori (virgola)', default: '18,34,26,48,39,55' },
      { key: 'labels', type: 'text', label: 'Etichette (virgola)', default: 'Gen,Feb,Mar,Apr,Mag,Giu' },
    ],
  },

  /* ---- EDITOR ---- */
  contenteditable: {
    id: 'contenteditable',
    category: 'Editor',
    label: 'Foglio Documento Modificabile (Word)',
    icon: '✎',
    html: '<div class="af-editable" contenteditable="true">{{content}}</div>',
    css: '.af-editable{min-height:180px;padding:1.25rem;background:#fff;border:1px solid #cbd5e1;border-radius:8px;line-height:1.65;outline:none;font-family:Georgia,serif;margin:0 0 .75rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)}',
    config: [
      {
        key: 'content',
        type: 'textarea',
        label: 'Contenuto HTML iniziale',
        default: '<h2>Documento Modificabile</h2><p>Scrivi direttamente qui dentro come in Office Studio...</p>',
        raw: true,
      },
    ],
  },
  codeEditor: {
    id: 'codeEditor',
    category: 'Editor',
    label: 'Editor di Codice',
    icon: '{ }',
    html: '<textarea class="af-code" spellcheck="false">{{initial}}</textarea>',
    css: '.af-code{width:100%;min-height:160px;padding:.75rem;font-family:ui-monospace,monospace;font-size:.82rem;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#38bdf8;resize:vertical;tab-size:2;margin:0 0 .75rem}',
    config: [
      {
        key: 'initial',
        type: 'textarea',
        label: 'Codice iniziale',
        default: '<!-- Scrivi codice o configurazione qui -->\n<section class="modulo">\n  <h1>Titolo</h1>\n</section>',
        raw: true,
      },
    ],
  },

  /* ---- 3D (2D23D PIPELINE) ---- */
  threeCanvas: {
    id: 'threeCanvas',
    category: '3D',
    label: 'Viewport 3D Interattiva (2D23D)',
    icon: '◈',
    html: '<div class="af-3d-wrap"><canvas class="af-3d-canvas" data-speed="{{speed}}" data-wire="{{wireframe}}" width="640" height="{{height}}"></canvas><div class="af-3d-overlay">Viewport 3D · Trascina per ruotare il solido</div></div>',
    css: '.af-3d-wrap{position:relative;background:#090d16;border-radius:8px;overflow:hidden;border:1px solid #1e293b;margin:0 0 .75rem}.af-3d-canvas{width:100%;display:block;cursor:grab}.af-3d-overlay{position:absolute;bottom:8px;left:12px;font-size:11px;color:#94a3b8;font-family:monospace;pointer-events:none}',
    js: `document.querySelectorAll(".af-3d-canvas").forEach(cv=>{const ctx=cv.getContext("2d");let rx=0.5,ry=0.6,drag=false,lx=0,ly=0;const spd=parseFloat(cv.dataset.speed||"1")*0.012;cv.addEventListener("mousedown",e=>{drag=true;lx=e.clientX;ly=e.clientY});window.addEventListener("mouseup",()=>drag=false);window.addEventListener("mousemove",e=>{if(!drag)return;ry+=(e.clientX-lx)*0.01;rx+=(e.clientY-ly)*0.01;lx=e.clientX;ly=e.clientY});const pts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7],[0,2],[4,6]];function draw(){ctx.fillStyle="#090d16";ctx.fillRect(0,0,cv.width,cv.height);if(!drag)ry+=spd;const proj=pts.map(([x,y,z])=>{let x1=x*Math.cos(ry)-z*Math.sin(ry),z1=z*Math.cos(ry)+x*Math.sin(ry);let y2=y*Math.cos(rx)-z1*Math.sin(rx),z2=z1*Math.cos(rx)+y*Math.sin(rx);const s=220/(z2+4.2);return [cv.width/2+x1*s,cv.height/2+y2*s]});ctx.strokeStyle="#38bdf8";ctx.lineWidth=2;edges.forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(proj[a][0],proj[a][1]);ctx.lineTo(proj[b][0],proj[b][1]);ctx.stroke()});proj.forEach(([px,py])=>{ctx.fillStyle="#facc15";ctx.beginPath();ctx.arc(px,py,3.5,0,Math.PI*2);ctx.fill()});requestAnimationFrame(draw)}draw()});`,
    config: [
      { key: 'height', type: 'number', label: 'Altezza Viewport (px)', default: 280 },
      { key: 'speed', type: 'number', label: 'Velocità Rotazione', default: 1 },
      { key: 'wireframe', type: 'select', label: 'Modalità Mesh', options: ['Wireframe CAD', 'Nodi + Spigoli'], default: 'Wireframe CAD' },
    ],
  },

  /* ---- AVANZATO ---- */
  htmlEmbed: {
    id: 'htmlEmbed',
    category: 'Avanzato',
    label: 'Snippet HTML Raw',
    icon: '</>',
    html: '<div class="af-html">{{code}}</div>',
    css: '.af-html{padding:.6rem;border:1px dashed #cbd5e1;border-radius:6px;background:#fff;margin:0 0 .75rem}',
    config: [
      {
        key: 'code',
        type: 'textarea',
        label: 'Markup HTML Libero',
        default: '<div><strong>Componente Custom:</strong> puoi inserire qualunque markup HTML qui dentro.</div>',
        raw: true,
      },
    ],
  },
};

export function getDefaultPropsForComponent(reg: RegistryComponentDef): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  (reg.config || []).forEach((c) => {
    out[c.key] = c.default;
  });
  return out;
}

export function renderComponentTemplate(
  reg: RegistryComponentDef,
  props: Record<string, string | number | undefined>,
  childrenHtml: string = ''
): string {
  const merged = { ...getDefaultPropsForComponent(reg), ...props };
  return reg.html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (key === 'children') {
      return childrenHtml;
    }
    const v = merged[key] ?? '';
    if (key === 'options') {
      return String(v)
        .split(',')
        .map((x) => `<option value="${escapeHTML(x.trim())}">${escapeHTML(x.trim())}</option>`)
        .join('');
    }
    const cfg = (reg.config || []).find((c) => c.key === key);
    if (cfg?.raw) return String(v);
    return escapeHTML(String(v));
  });
}

function collectUsedComponentsAndRenderBlock(
  block: AppForgeBlock,
  registry: Record<string, RegistryComponentDef>,
  usedSet: Set<string>
): string {
  const reg = registry[block.component];
  if (!reg) return '';
  usedSet.add(block.component);

  let childrenHtml = '';
  if (reg.container && block.children && block.children.length > 0) {
    childrenHtml = block.children
      .map((child) => collectUsedComponentsAndRenderBlock(child, registry, usedSet))
      .join('\n');
  }

  const inner = renderComponentTemplate(reg, block.props, childrenHtml);
  return `<div class="af-block" data-comp="${escapeHTML(block.component)}">${inner}</div>`;
}

/**
 * Compiles an AppForgeModel + Registry into a single, standalone HTML file
 * Includes reactive data-bind store so inputs update {{key}} bindings in real time!
 */
export function buildAppForgeExportHTML(
  model: AppForgeModel,
  registry: Record<string, RegistryComponentDef>
): string {
  const used = new Set<string>();
  const sections: Record<RegionName, string> = {
    header: '',
    main: '',
    footer: '',
  };

  (['header', 'main', 'footer'] as RegionName[]).forEach((region) => {
    sections[region] = (model.regions[region] || [])
      .map((b) => collectUsedComponentsAndRenderBlock(b, registry, used))
      .join('\n');
  });

  const cssList = [...used]
    .map((id) => registry[id]?.css || '')
    .filter(Boolean)
    .join('\n  ');

  const jsList = [...used]
    .map((id) => registry[id]?.js || '')
    .filter(Boolean)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(model.name)}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a}
  .af-app{display:flex;flex-direction:column;min-height:100vh}
  .af-header{padding:1rem 1.5rem;background:#fff;border-bottom:1px solid #e2e8f0}
  .af-main{padding:1.5rem;flex:1;max-width:1040px;margin:0 auto;width:100%}
  .af-footer{padding:1rem 1.5rem;background:#f1f5f9;border-top:1px solid #e2e8f0;font-size:.85rem;color:#475569}
  .af-block{margin:0 0 .85rem}
  ${cssList}
  ${model.customCSS || ''}
</style>
</head>
<body>
<div class="af-app">
  ${sections.header ? `<header class="af-header">\n${sections.header}\n  </header>` : ''}
  <main class="af-main">\n${sections.main || ''}\n  </main>
  ${sections.footer ? `<footer class="af-footer">\n${sections.footer}\n  </footer>` : ''}
</div>
<script>
  // Store Reattivo (Roadmap #3: data-bind sincronizza automaticamente input e testi)
  window.afStore = {
    state: {},
    listeners: [],
    set(key, val) {
      this.state[key] = val;
      document.querySelectorAll('[data-bind-text="' + key + '"]').forEach(el => {
        el.textContent = val;
      });
      this.listeners.forEach(fn => fn(this.state));
    }
  };
  document.querySelectorAll('[data-bind]').forEach(inp => {
    const key = inp.dataset.bind;
    if (!key) return;
    window.afStore.state[key] = inp.value;
    inp.addEventListener('input', () => window.afStore.set(key, inp.value));
  });

  ${jsList}
  ${model.customJS || ''}
</script>
</body>
</html>`;
}

export const APPFORGE_TEMPLATES: Record<string, { label: string; desc: string; build: () => AppForgeModel }> = {
  office: {
    label: 'Office Studio (Word + Excel)',
    desc: 'Barra Tab multifunzione + Foglio Documento contenteditable + Griglia Spreadsheet con formule =SOMMA.',
    build: () => ({
      name: 'Office Studio — Word & Excel',
      regions: {
        header: [
          {
            id: createBlockId(),
            component: 'heading',
            props: { text: 'Office Studio — Word & Excel', level: 1 },
          },
          {
            id: createBlockId(),
            component: 'tabs',
            props: { tabs: 'File,Home,Inserisci,Formule,Dati,Visualizza' },
          },
        ],
        main: [
          {
            id: createBlockId(),
            component: 'grid',
            props: { cols: 2, gap: 16 },
            children: [
              {
                id: createBlockId(),
                component: 'contenteditable',
                props: {
                  content:
                    '<h3>Documento Word A4</h3><p>Modifica direttamente questo testo formattato mentre a destra il foglio Excel calcola le formule in tempo reale.</p>',
                },
              },
              {
                id: createBlockId(),
                component: 'spreadsheet',
                props: {
                  initialData:
                    'A1=Voce;B1=1200;A2=Licenze;B2=850;A3=Supporto;B3=450;A4=TOTALE;B4==SOMMA(B1:B3)',
                },
              },
            ],
          },
        ],
        footer: [
          {
            id: createBlockId(),
            component: 'paragraph',
            props: { text: 'Pronto · 100% locale, generato dal catalogo AppForge.' },
          },
        ],
      },
      customCSS: '',
      customJS: '',
    }),
  },
  videoEditor: {
    label: 'Forge — Video Editor',
    desc: 'Player media + Barra di trasporto (Play/Pausa/Timecode) + Timeline multi-traccia + Pannello parametri clip.',
    build: () => ({
      name: 'Forge — Video Editor',
      regions: {
        header: [
          {
            id: createBlockId(),
            component: 'heading',
            props: { text: 'Forge Video Studio', level: 1 },
          },
        ],
        main: [
          {
            id: createBlockId(),
            component: 'grid',
            props: { cols: 2, gap: 14 },
            children: [
              {
                id: createBlockId(),
                component: 'image',
                props: { src: SAFE_LOCAL_MEDIA_SVG, alt: 'Monitor Preview Video' },
              },
              {
                id: createBlockId(),
                component: 'card',
                props: {
                  title: 'Parametri Clip Selezionata',
                  body: 'Regola opacità e titolo della clip attiva sulla timeline:',
                },
                children: [
                  {
                    id: createBlockId(),
                    component: 'input',
                    props: {
                      label: 'Titolo Sovrimpressione',
                      type: 'text',
                      placeholder: 'Titolo clip...',
                      defaultVal: 'Intro_Scena_01.mp4',
                      bind: 'clipName',
                    },
                  },
                  {
                    id: createBlockId(),
                    component: 'slider',
                    props: {
                      label: 'Opacità Traccia (%)',
                      min: 0,
                      max: 100,
                      step: 1,
                      value: 90,
                      bind: 'opacity',
                    },
                  },
                ],
              },
            ],
          },
          {
            id: createBlockId(),
            component: 'transport',
            props: {},
          },
          {
            id: createBlockId(),
            component: 'timeline',
            props: {
              height: 165,
              tracks: 'Video A:0:42,B-Roll:45:32;Audio Master:0:78;Sottotitoli:10:50',
            },
          },
        ],
        footer: [],
      },
      customCSS: '',
      customJS: '',
    }),
  },
  viewer3d: {
    label: '2D23D — Ricostruttore 3D',
    desc: 'Viewport 3D interattiva + Slider parametri di estrusione + Azione di esportazione mesh.',
    build: () => ({
      name: '2D23D — Pipeline Mesh 3D',
      regions: {
        header: [
          {
            id: createBlockId(),
            component: 'heading',
            props: { text: '2D23D — Generatore & Viewport 3D', level: 1 },
          },
        ],
        main: [
          {
            id: createBlockId(),
            component: 'grid',
            props: { cols: 2, gap: 16 },
            children: [
              {
                id: createBlockId(),
                component: 'threeCanvas',
                props: { height: 290, speed: 1, wireframe: 'Wireframe CAD' },
              },
              {
                id: createBlockId(),
                component: 'card',
                props: {
                  title: 'Parametri di Ricostruzione 2D → 3D',
                  body: 'Configura profondità ed estrusione della mesh:',
                },
                children: [
                  {
                    id: createBlockId(),
                    component: 'slider',
                    props: {
                      label: 'Profondità Estrusione (mm)',
                      min: 5,
                      max: 120,
                      step: 5,
                      value: 45,
                      bind: 'depth',
                    },
                  },
                  {
                    id: createBlockId(),
                    component: 'button',
                    props: {
                      text: 'Esporta Mesh .OBJ',
                      action: "alert('Mesh 3D generata con profondità: ' + (store.state.depth || 45) + 'mm')",
                    },
                  },
                ],
              },
            ],
          },
        ],
        footer: [],
      },
      customCSS: '',
      customJS: '',
    }),
  },
  dashboard: {
    label: 'Dashboard Analitica',
    desc: 'Grafico a barre Canvas 2D + Tabella metriche + Controlli filtro.',
    build: () => ({
      name: 'Dashboard Telemetria & KPI',
      regions: {
        header: [
          {
            id: createBlockId(),
            component: 'heading',
            props: { text: 'Dashboard Analitica', level: 1 },
          },
        ],
        main: [
          {
            id: createBlockId(),
            component: 'chart',
            props: {
              values: '24,42,31,64,52,78',
              labels: 'Gen,Feb,Mar,Apr,Mag,Giu',
            },
          },
          {
            id: createBlockId(),
            component: 'table',
            props: {
              cols: 'Reparto,Operazioni,Stato',
              rows: 5,
            },
          },
        ],
        footer: [],
      },
      customCSS: '',
      customJS: '',
    }),
  },
};
