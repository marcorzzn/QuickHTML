export interface CleaningOptions {
  inlineStyles: boolean;
  classesAndIds: boolean;
  emptyTags: boolean;
  tagsWithOneSpace: boolean;
  repeatedSpaces: boolean;
  comments: boolean;
  tagAttributes: boolean;
  smartNbsp: boolean;
  toPlainText: boolean;
  aiCharacters: boolean;
}

export interface FindReplaceRule {
  id: string;
  find: string;
  replace: string;
  useRegex: boolean;
  ignoreCase: boolean;
}

export interface CleanStats {
  charsBefore: number;
  charsAfter: number;
  appliedRules: string[];
}

export const DEFAULT_CLEANING_OPTIONS: CleaningOptions = {
  inlineStyles: true,
  classesAndIds: true,
  emptyTags: true,
  tagsWithOneSpace: true,
  repeatedSpaces: true,
  comments: true,
  tagAttributes: false,
  smartNbsp: false,
  toPlainText: false,
  aiCharacters: true,
};

export const DEMO_DIRTY_HTML = `<!-- ======== HEY, I AM THE SOURCE EDITOR! ======== -->
<h1 class="aligncenter" style="color: #5e9ca0;">Puoi modificare <span style="color: #2b2301;">questo testo</span> demo!</h1>
<h2 id="howto-head" style="color: #2e6c80;">Come usare l'editor bidirezionale &ldquo;WYSIWYG &harr; Sorgente&rdquo;:</h2>
<p class="msoNormal" style="font-size: 15px; line-height: 1.6;">Incolla il tuo documento nell'editor visivo a sinistra o scrivi direttamente il codice HTML nell'editor sorgente a destra. <br>Modifica uno qualsiasi dei due pannelli e vedrai l'altro aggiornarsi in tempo reale\u200B\u200C!</p>
<p style="margin-top: 8px;">Clicca il pulsante <span style="background-color: #dc2626; color: #ffffff; display: inline-block; padding: 2px 8px; font-weight: bold; border-radius: 4px;">Clean</span> per ripulire il codice sorgente&nbsp;&nbsp;&nbsp;&nbsp;oppure attiva singolarmente i filtri sotto l'editor.</p>
<p>&nbsp;</p>
<p><span></span></p>
<!-- Commento generato da esportazione Word / AI che va rimosso -->
<table class="editorDemoTable" style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1;">
  <thead>
    <tr>
      <td style="font-weight: bold; background: #f8fafc; padding: 6px;">Funzione di Pulizia</td>
      <td style="font-weight: bold; background: #f8fafc; padding: 6px;">Esempio Sporco (Word / AI)</td>
      <td style="font-weight: bold; background: #f8fafc; padding: 6px;">Default</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Inline styles</td>
      <td>Non usare <span style="color: green; font-size: 13px;">mai <strong style="color: blue; text-decoration: underline;">stili inline</strong></span>!</td>
      <td>Attivo</td>
    </tr>
    <tr>
      <td>Classes &amp; IDs</td>
      <td>Usa <span id="demoId">le classi per <strong class="demoClass">stilizzare tutto</strong></span>.</td>
      <td>Attivo</td>
    </tr>
    <tr>
      <td>AI characters</td>
      <td>Normalizza &ldquo;virgolette curve&rdquo;, trattini lunghi &mdash; e caratteri zero-width invisibili.</td>
      <td>Attivo</td>
    </tr>
  </tbody>
</table>
<p> </p>`;

/**
 * Normalizes AI-generated typographic artifacts and invisible zero-width characters
 */
export function cleanAiCharacters(html: string): string {
  return html
    // Remove zero-width spaces, joiners, BOM, soft hyphens
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060]/g, '')
    // Normalize non-breaking space unicode to standard space or entity
    .replace(/\u00A0/g, ' ')
    // Normalize curly double quotes and HTML entities
    .replace(/[\u201C\u201D\u201E\u201F]|&ldquo;|&rdquo;|&bdquo;/g, '"')
    // Normalize curly single quotes and apostrophes
    .replace(/[\u2018\u2019\u201A\u201B]|&lsquo;|&rsquo;/g, "'")
    // Normalize em-dash and en-dash to standard hyphen/dash
    .replace(/[\u2013\u2014]|&mdash;|&ndash;/g, ' - ')
    // Normalize ellipsis
    .replace(/\u2026|&hellip;/g, '...');
}

/**
 * Applies a single cleaning rule or all selected cleaning options to an HTML string
 */
export function runHtmlCleaner(
  inputHtml: string,
  options: Partial<CleaningOptions>
): { html: string; stats: CleanStats } {
  const charsBefore = inputHtml.length;
  let out = inputHtml;
  const appliedRules: string[] = [];

  // 1. Remove HTML comments <!-- ... -->
  if (options.comments) {
    out = out.replace(/<!--[\s\S]*?-->/g, '');
    appliedRules.push('Comments');
  }

  // 2. AI character remover (smart quotes, em-dashes, zero-width chars)
  if (options.aiCharacters) {
    out = cleanAiCharacters(out);
    appliedRules.push('AI characters');
  }

  // Parse via DOMParser for structural DOM transformations
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${out}</body>`, 'text/html');
  const body = doc.body;

  // Always strip unsafe script/style tags during cleanup (as noted in the screenshot Tip)
  body.querySelectorAll('script, style').forEach((el) => el.remove());

  // 3. Inline styles (style, align, valign, bgcolor, color)
  if (options.inlineStyles) {
    body.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('style');
      el.removeAttribute('align');
      el.removeAttribute('valign');
      el.removeAttribute('bgcolor');
      el.removeAttribute('color');
    });
    appliedRules.push('Inline styles');
  }

  // 4. Classes & IDs
  if (options.classesAndIds) {
    body.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('class');
      el.removeAttribute('id');
    });
    appliedRules.push('Classes & IDs');
  }

  // 5. Tag attributes (strips all attributes except href on <a> and src/alt on <img>)
  if (options.tagAttributes) {
    body.querySelectorAll('*').forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const attrs = Array.from(el.attributes).map((a) => a.name);
      attrs.forEach((attrName) => {
        if (tag === 'a' && attrName === 'href') return;
        if (tag === 'img' && (attrName === 'src' || attrName === 'alt')) return;
        el.removeAttribute(attrName);
      });
    });
    appliedRules.push('Tag attributes');
  }

  // Unwrap useless <span> elements that have no attributes left
  if (options.inlineStyles || options.classesAndIds || options.tagAttributes) {
    let spans = Array.from(body.querySelectorAll('span'));
    for (const span of spans) {
      if (span.attributes.length === 0 && span.parentNode) {
        while (span.firstChild) {
          span.parentNode.insertBefore(span.firstChild, span);
        }
        span.parentNode.removeChild(span);
      }
    }
  }

  // 6. Tags with 1 space (e.g. <p>&nbsp;</p> or <p> </p>)
  if (options.tagsWithOneSpace) {
    const voidTags = new Set(['BR', 'HR', 'IMG', 'INPUT', 'META', 'LINK']);
    let changed = true;
    while (changed) {
      changed = false;
      body.querySelectorAll('*').forEach((el) => {
        if (voidTags.has(el.tagName)) return;
        if (el.children.length === 0) {
          const raw = el.innerHTML
            .replace(/&nbsp;/gi, ' ')
            .replace(/\u00A0/g, ' ');
          if (/^\s+$/.test(raw)) {
            el.remove();
            changed = true;
          }
        }
      });
    }
    appliedRules.push('Tags with 1 space');
  }

  // 7. Empty tags (e.g. <p></p>, <strong></strong>, <span></span>)
  if (options.emptyTags) {
    const voidTags = new Set(['BR', 'HR', 'IMG', 'INPUT', 'META', 'LINK', 'TD', 'TH']);
    let changed = true;
    while (changed) {
      changed = false;
      body.querySelectorAll('*').forEach((el) => {
        if (voidTags.has(el.tagName)) return;
        if (el.children.length === 0 && el.textContent === '') {
          el.remove();
          changed = true;
        }
      });
    }
    appliedRules.push('Empty tags');
  }

  out = body.innerHTML;

  // 8. Repeated spaces (collapse multiple &nbsp; and spaces)
  if (options.repeatedSpaces) {
    out = out.replace(/(&nbsp;\s*){2,}/gi, ' ');
    out = out.replace(/[ \t]{2,}/g, ' ');
    appliedRules.push('Repeated spaces');
  }

  // 9. Smart &nbsp; (bind short prepositions/conjunctions at word boundaries so they don't orphan at line ends)
  if (options.smartNbsp) {
    out = out.replace(
      /\b(a|e|i|o|u|in|su|per|con|tra|fra|il|lo|la|un|ed|ad|of|to|in|on|at|by|an)\s+(?=[a-zA-ZÀ-ÿ0-9])/gi,
      '$1&nbsp;'
    );
    appliedRules.push('Smart &nbsp;');
  }

  // 10. To plain text (strip all HTML tags and leave clean text)
  if (options.toPlainText) {
    const temp = parser.parseFromString(`<body>${out}</body>`, 'text/html');
    const blocks = temp.body.querySelectorAll('p, h1, h2, h3, h4, li, tr, div, blockquote');
    blocks.forEach((b) => {
      b.appendChild(temp.createTextNode('\n'));
    });
    out = (temp.body.textContent || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n\n');
    appliedRules.push('To plain text');
  }

  out = out.trim();

  return {
    html: out,
    stats: {
      charsBefore,
      charsAfter: out.length,
      appliedRules,
    },
  };
}

/**
 * Formats HTML with readable indentation (Above the source: Indentation button)
 */
export function formatHtmlIndentation(html: string): string {
  const tokens = html
    .replace(/>\s+</g, '><')
    .trim()
    .split(/(<[^>]+>)/g)
    .filter(Boolean);

  let indentLevel = 0;
  const indentStr = '  ';
  const voidElements = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
  const inlineElements = new Set(['strong', 'b', 'em', 'i', 'u', 'span', 'a', 'code', 'kbd', 'sub', 'sup']);

  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith('<!--')) {
      if (currentLine.trim()) {
        lines.push(indentStr.repeat(indentLevel) + currentLine.trim());
        currentLine = '';
      }
      lines.push(indentStr.repeat(indentLevel) + token);
    } else if (token.startsWith('</')) {
      const tagName = token.replace(/<\/([a-zA-Z0-9-]+)[^>]*>/, '$1').toLowerCase();
      if (inlineElements.has(tagName)) {
        currentLine += token;
      } else {
        if (currentLine.trim()) {
          lines.push(indentStr.repeat(indentLevel) + currentLine.trim());
          currentLine = '';
        }
        indentLevel = Math.max(0, indentLevel - 1);
        lines.push(indentStr.repeat(indentLevel) + token);
      }
    } else if (token.startsWith('<')) {
      const tagName = token.replace(/<([a-zA-Z0-9-]+)[\s>\/].*/, '$1').replace(/[<>\/]/g, '').toLowerCase();
      const isSelfClosing = token.endsWith('/>') || voidElements.has(tagName);
      if (inlineElements.has(tagName)) {
        currentLine += token;
      } else {
        if (currentLine.trim()) {
          lines.push(indentStr.repeat(indentLevel) + currentLine.trim());
          currentLine = '';
        }
        lines.push(indentStr.repeat(indentLevel) + token);
        if (!isSelfClosing) {
          indentLevel++;
        }
      }
    } else {
      currentLine += token;
    }
  }

  if (currentLine.trim()) {
    lines.push(indentStr.repeat(indentLevel) + currentLine.trim());
  }

  return lines.join('\n');
}

/**
 * Compresses HTML by removing extra line breaks and comments
 */
export function compressHtmlSource(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Encodes special UTF-8 characters into HTML named/numeric entities
 */
export function encodeSpecialHtmlEntities(html: string): string {
  const entityMap: Record<string, string> = {
    à: '&agrave;',
    è: '&egrave;',
    é: '&eacute;',
    ì: '&igrave;',
    ò: '&ograve;',
    ù: '&ugrave;',
    À: '&Agrave;',
    È: '&Egrave;',
    É: '&Eacute;',
    Ì: '&Igrave;',
    Ò: '&Ograve;',
    Ù: '&Ugrave;',
    '©': '&copy;',
    '®': '&reg;',
    '€': '&euro;',
    '—': '&mdash;',
    '–': '&ndash;',
    '“': '&ldquo;',
    '”': '&rdquo;',
  };
  return html.replace(/[àèéìòùÀÈÉÌÒÙ©®€—–“”]/g, (ch) => entityMap[ch] || ch);
}

/**
 * Executes a single Find & Replace rule or an array of rules on the HTML source string
 */
export function applyFindReplaceRules(
  source: string,
  rules: FindReplaceRule[]
): { result: string; totalMatches: number; error?: string } {
  let current = source;
  let totalMatches = 0;

  for (const rule of rules) {
    if (!rule.find) continue;
    try {
      let flags = 'g';
      if (rule.ignoreCase) flags += 'i';
      const pattern = rule.useRegex
        ? new RegExp(rule.find, flags)
        : new RegExp(rule.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

      const matches = current.match(pattern);
      if (matches) {
        totalMatches += matches.length;
        current = current.replace(pattern, rule.replace);
      }
    } catch (err) {
      return {
        result: current,
        totalMatches,
        error: `Regex non valida per "${rule.find}": ${(err as Error).message}`,
      };
    }
  }

  return { result: current, totalMatches };
}
