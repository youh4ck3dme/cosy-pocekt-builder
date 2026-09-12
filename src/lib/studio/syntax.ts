export type TokenType =
  | "plain"
  | "comment"
  | "doctype"
  | "tag-bracket"
  | "tag-name"
  | "attr-name"
  | "attr-value"
  | "string"
  | "keyword"
  | "number"
  | "selector"
  | "property"
  | "value"
  | "punctuation";

export type Token = {
  type: TokenType;
  text: string;
};

export type CodeLine = {
  lineNumber: number;
  tokens: Token[];
};

const JS_KEYWORDS = new Set([
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "true",
  "false",
  "null",
  "undefined",
]);

/**
 * Tokenizes CSS text block into tokens.
 */
function tokenizeCssBlock(css: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = css.length;
  let inBraces = false;

  while (i < n) {
    // Comment /* ... */
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const text = end === -1 ? css.slice(i) : css.slice(i, end + 2);
      tokens.push({ type: "comment", text });
      i += text.length;
      continue;
    }

    // Whitespace
    if (/\s/.test(css[i])) {
      let j = i;
      while (j < n && /\s/.test(css[j])) j++;
      tokens.push({ type: "plain", text: css.slice(i, j) });
      i = j;
      continue;
    }

    // Braces
    if (css[i] === "{") {
      inBraces = true;
      tokens.push({ type: "punctuation", text: "{" });
      i++;
      continue;
    }
    if (css[i] === "}") {
      inBraces = false;
      tokens.push({ type: "punctuation", text: "}" });
      i++;
      continue;
    }

    // Inside rule body { ... }
    if (inBraces) {
      // String
      if (css[i] === '"' || css[i] === "'") {
        const quote = css[i];
        let j = i + 1;
        while (j < n && css[j] !== quote && css[j] !== "\n") {
          if (css[j] === "\\") j++;
          j++;
        }
        if (j < n && css[j] === quote) j++;
        tokens.push({ type: "string", text: css.slice(i, j) });
        i = j;
        continue;
      }

      // Property (before colon)
      const propMatch = css.slice(i).match(/^([a-zA-Z-][a-zA-Z0-9-]*)\s*:/);
      if (propMatch) {
        const propName = propMatch[1];
        tokens.push({ type: "property", text: propName });
        i += propName.length;
        // whitespace before colon
        while (i < n && /\s/.test(css[i])) {
          tokens.push({ type: "plain", text: css[i] });
          i++;
        }
        if (i < n && css[i] === ":") {
          tokens.push({ type: "punctuation", text: ":" });
          i++;
        }
        continue;
      }

      // Semicolon
      if (css[i] === ";") {
        tokens.push({ type: "punctuation", text: ";" });
        i++;
        continue;
      }

      // Colors (#hex)
      const colorMatch = css.slice(i).match(/^#[0-9a-fA-F]{3,8}\b/);
      if (colorMatch) {
        tokens.push({ type: "value", text: colorMatch[0] });
        i += colorMatch[0].length;
        continue;
      }

      // Numbers & units (e.g. 16px, 1.5rem, 100%)
      const numMatch = css
        .slice(i)
        .match(/^[+-]?\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax|s|ms|deg|fr)?\b/i);
      if (numMatch && numMatch[0].length > 0) {
        tokens.push({ type: "number", text: numMatch[0] });
        i += numMatch[0].length;
        continue;
      }

      // Other punctuation
      if (/[(),!:]/.test(css[i])) {
        tokens.push({ type: "punctuation", text: css[i] });
        i++;
        continue;
      }

      // Words/identifiers (like flex, inline-block, none, auto)
      const identMatch = css.slice(i).match(/^[a-zA-Z-_]+/);
      if (identMatch) {
        tokens.push({ type: "value", text: identMatch[0] });
        i += identMatch[0].length;
        continue;
      }

      tokens.push({ type: "plain", text: css[i] });
      i++;
    } else {
      // Outside rule: selectors or at-rules (@media, @keyframes)
      if (css[i] === "@") {
        const atMatch = css.slice(i).match(/^@[a-zA-Z-]+/);
        if (atMatch) {
          tokens.push({ type: "keyword", text: atMatch[0] });
          i += atMatch[0].length;
          continue;
        }
      }

      // Selector text until '{' or ';' or comment
      const nextBrace = css.indexOf("{", i);
      const nextComment = css.indexOf("/*", i);
      let end = n;
      if (nextBrace !== -1 && nextBrace < end) end = nextBrace;
      if (nextComment !== -1 && nextComment < end) end = nextComment;

      const selText = css.slice(i, end);
      if (selText.length > 0) {
        tokens.push({ type: "selector", text: selText });
        i += selText.length;
      } else {
        tokens.push({ type: "plain", text: css[i] });
        i++;
      }
    }
  }

  return tokens;
}

/**
 * Tokenizes JavaScript text block into tokens.
 */
function tokenizeJsBlock(js: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = js.length;

  while (i < n) {
    // Single-line comment // ...
    if (js[i] === "/" && js[i + 1] === "/") {
      let j = i + 2;
      while (j < n && js[j] !== "\n") j++;
      tokens.push({ type: "comment", text: js.slice(i, j) });
      i = j;
      continue;
    }

    // Multi-line comment /* ... */
    if (js[i] === "/" && js[i + 1] === "*") {
      const end = js.indexOf("*/", i + 2);
      const text = end === -1 ? js.slice(i) : js.slice(i, end + 2);
      tokens.push({ type: "comment", text });
      i += text.length;
      continue;
    }

    // Whitespace
    if (/\s/.test(js[i])) {
      let j = i;
      while (j < n && /\s/.test(js[j])) j++;
      tokens.push({ type: "plain", text: js.slice(i, j) });
      i = j;
      continue;
    }

    // Strings: single, double quote or template literal
    if (js[i] === '"' || js[i] === "'" || js[i] === "`") {
      const quote = js[i];
      let j = i + 1;
      while (j < n && js[j] !== quote) {
        if (js[j] === "\\" && j + 1 < n) j += 2;
        else if (quote !== "`" && js[j] === "\n") break;
        else j++;
      }
      if (j < n && js[j] === quote) j++;
      tokens.push({ type: "string", text: js.slice(i, j) });
      i = j;
      continue;
    }

    // Numbers
    const numMatch = js.slice(i).match(/^0x[0-9a-fA-F]+\b|^\d+(\.\d+)?([eE][+-]?\d+)?\b/);
    if (numMatch) {
      tokens.push({ type: "number", text: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }

    // Identifiers and keywords
    const identMatch = js.slice(i).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (identMatch) {
      const word = identMatch[0];
      if (JS_KEYWORDS.has(word)) {
        tokens.push({ type: "keyword", text: word });
      } else {
        tokens.push({ type: "plain", text: word });
      }
      i += word.length;
      continue;
    }

    // Punctuation and operators
    if (/[{}()[\];,.:?!~+\-*/%&|^<>=]/.test(js[i])) {
      tokens.push({ type: "punctuation", text: js[i] });
      i++;
      continue;
    }

    tokens.push({ type: "plain", text: js[i] });
    i++;
  }

  return tokens;
}

/**
 * Tokenizes an HTML tag string e.g. `<div class="main" id="root">` or `</script>`
 */
function tokenizeHtmlTag(tagStr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = tagStr.length;

  if (tagStr.startsWith("</")) {
    tokens.push({ type: "tag-bracket", text: "</" });
    i = 2;
  } else if (tagStr.startsWith("<")) {
    tokens.push({ type: "tag-bracket", text: "<" });
    i = 1;
  }

  // Tag name
  const nameMatch = tagStr.slice(i).match(/^[a-zA-Z0-9-]+/);
  if (nameMatch) {
    tokens.push({ type: "tag-name", text: nameMatch[0] });
    i += nameMatch[0].length;
  }

  // Tag attributes
  while (i < n) {
    if (tagStr.slice(i).startsWith("/>")) {
      tokens.push({ type: "tag-bracket", text: "/>" });
      i += 2;
      break;
    }
    if (tagStr[i] === ">") {
      tokens.push({ type: "tag-bracket", text: ">" });
      i += 1;
      break;
    }

    // Whitespace
    if (/\s/.test(tagStr[i])) {
      let j = i;
      while (j < n && /\s/.test(tagStr[j])) j++;
      tokens.push({ type: "plain", text: tagStr.slice(i, j) });
      i = j;
      continue;
    }

    // Attribute name
    const attrMatch = tagStr.slice(i).match(/^[a-zA-Z0-9-:@._]+/);
    if (attrMatch) {
      tokens.push({ type: "attr-name", text: attrMatch[0] });
      i += attrMatch[0].length;

      // Check for '='
      while (i < n && /\s/.test(tagStr[i])) {
        tokens.push({ type: "plain", text: tagStr[i] });
        i++;
      }
      if (i < n && tagStr[i] === "=") {
        tokens.push({ type: "punctuation", text: "=" });
        i++;

        while (i < n && /\s/.test(tagStr[i])) {
          tokens.push({ type: "plain", text: tagStr[i] });
          i++;
        }

        // Attribute value (quoted or unquoted)
        if (i < n && (tagStr[i] === '"' || tagStr[i] === "'")) {
          const q = tagStr[i];
          let endQ = i + 1;
          while (endQ < n && tagStr[endQ] !== q) endQ++;
          if (endQ < n && tagStr[endQ] === q) endQ++;
          tokens.push({ type: "attr-value", text: tagStr.slice(i, endQ) });
          i = endQ;
        } else {
          const valMatch = tagStr.slice(i).match(/^[^\s>]+/);
          if (valMatch) {
            tokens.push({ type: "attr-value", text: valMatch[0] });
            i += valMatch[0].length;
          }
        }
      }
      continue;
    }

    tokens.push({ type: "plain", text: tagStr[i] });
    i++;
  }

  return tokens;
}

/**
 * Tokenizes a full HTML document (with embedded <style> and <script>).
 */
export function tokenizeHtml(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = code.length;

  while (i < n) {
    // HTML comment <!-- ... -->
    if (code.startsWith("<!--", i)) {
      const end = code.indexOf("-->", i + 4);
      const text = end === -1 ? code.slice(i) : code.slice(i, end + 3);
      tokens.push({ type: "comment", text });
      i += text.length;
      continue;
    }

    // DOCTYPE <!DOCTYPE ...>
    if (/^<!doctype/i.test(code.slice(i, i + 10))) {
      const end = code.indexOf(">", i + 9);
      const text = end === -1 ? code.slice(i) : code.slice(i, end + 1);
      tokens.push({ type: "doctype", text });
      i += text.length;
      continue;
    }

    // <style> block
    const styleMatch = code.slice(i).match(/^<style\b[^>]*>/i);
    if (styleMatch) {
      tokens.push(...tokenizeHtmlTag(styleMatch[0]));
      i += styleMatch[0].length;

      const endStyleIdx = code.slice(i).search(/<\/style>/i);
      if (endStyleIdx === -1) {
        tokens.push(...tokenizeCssBlock(code.slice(i)));
        i = n;
      } else {
        const cssContent = code.slice(i, i + endStyleIdx);
        tokens.push(...tokenizeCssBlock(cssContent));
        i += endStyleIdx;
        const closeTag = code.slice(i, i + 8);
        tokens.push(...tokenizeHtmlTag(closeTag));
        i += 8;
      }
      continue;
    }

    // <script> block
    const scriptMatch = code.slice(i).match(/^<script\b[^>]*>/i);
    if (scriptMatch) {
      tokens.push(...tokenizeHtmlTag(scriptMatch[0]));
      i += scriptMatch[0].length;

      const endScriptIdx = code.slice(i).search(/<\/script>/i);
      if (endScriptIdx === -1) {
        tokens.push(...tokenizeJsBlock(code.slice(i)));
        i = n;
      } else {
        const jsContent = code.slice(i, i + endScriptIdx);
        tokens.push(...tokenizeJsBlock(jsContent));
        i += endScriptIdx;
        const closeTag = code.slice(i, i + 9);
        tokens.push(...tokenizeHtmlTag(closeTag));
        i += 9;
      }
      continue;
    }

    // General HTML tag <...>
    if (code[i] === "<") {
      let j = i + 1;
      let inQuote = false;
      let quoteChar = "";
      while (j < n) {
        if (!inQuote && (code[j] === '"' || code[j] === "'")) {
          inQuote = true;
          quoteChar = code[j];
        } else if (inQuote && code[j] === quoteChar) {
          inQuote = false;
        } else if (!inQuote && code[j] === ">") {
          j++;
          break;
        }
        j++;
      }
      const tagStr = code.slice(i, j);
      tokens.push(...tokenizeHtmlTag(tagStr));
      i = j;
      continue;
    }

    // Plain text until next '<'
    const nextTag = code.indexOf("<", i);
    const text = nextTag === -1 ? code.slice(i) : code.slice(i, nextTag);
    tokens.push({ type: "plain", text });
    i += text.length;
  }

  return tokens;
}

/**
 * Splits token array into lines for line-by-line rendering with line numbers.
 */
export function tokensToLines(tokens: Token[]): CodeLine[] {
  const lines: CodeLine[] = [{ lineNumber: 1, tokens: [] }];

  for (const token of tokens) {
    if (!token.text.includes("\n")) {
      lines[lines.length - 1].tokens.push(token);
      continue;
    }

    const parts = token.text.split("\n");
    for (let p = 0; p < parts.length; p++) {
      if (p > 0) {
        lines.push({ lineNumber: lines.length + 1, tokens: [] });
      }
      if (parts[p].length > 0) {
        lines[lines.length - 1].tokens.push({
          type: token.type,
          text: parts[p],
        });
      }
    }
  }

  return lines;
}

/**
 * Extracts pure CSS from <style> blocks.
 */
export function extractStyles(html: string): string {
  const matches = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
  return matches.map((m) => m[1].trim()).filter(Boolean).join("\n\n/* ───────────────────────── */\n\n");
}

/**
 * Extracts pure JavaScript from <script> blocks.
 */
export function extractScripts(html: string): string {
  const matches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  return matches.map((m) => m[1].trim()).filter(Boolean).join("\n\n// ─────────────────────────\n\n");
}

/**
 * Extracts HTML markup omitting embedded <style> and <script> contents.
 */
export function extractMarkup(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "<style>/* styles extracted */</style>")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "<script>// scripts extracted</script>")
    .trim();
}
