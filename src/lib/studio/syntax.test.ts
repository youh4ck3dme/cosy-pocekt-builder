import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  tokenizeHtml,
  tokensToLines,
  extractStyles,
  extractScripts,
  extractMarkup,
} from "./syntax.ts";

describe("syntax tokenizer", () => {
  it("tokenizes basic html document", () => {
    const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Hello</title>
    <style>
      body { color: #fff; font-size: 16px; }
    </style>
  </head>
  <body>
    <!-- Main content -->
    <h1 class="heading">Welcome</h1>
    <script>
      const msg = "Hello world";
      console.log(msg);
    </script>
  </body>
</html>`;

    const tokens = tokenizeHtml(html);
    assert.ok(tokens.length > 0);

    const doctype = tokens.find((t) => t.type === "doctype");
    assert.ok(doctype);
    assert.match(doctype.text, /<!DOCTYPE/i);

    const comment = tokens.find((t) => t.type === "comment");
    assert.ok(comment);
    assert.match(comment.text, /Main content/);

    const attr = tokens.find((t) => t.type === "attr-name");
    assert.ok(attr);
    assert.equal(attr.text, "class");

    const lines = tokensToLines(tokens);
    assert.ok(lines.length >= 15);
    assert.equal(lines[0].lineNumber, 1);
  });

  it("extracts styles, scripts, and markup cleanly", () => {
    const html = `<html>
<head><style>h1 { color: red; }</style></head>
<body><h1>Hi</h1><script>alert(1);</script></body>
</html>`;

    assert.equal(extractStyles(html), "h1 { color: red; }");
    assert.equal(extractScripts(html), "alert(1);");
    assert.match(extractMarkup(html), /<h1>Hi<\/h1>/);
  });
});
