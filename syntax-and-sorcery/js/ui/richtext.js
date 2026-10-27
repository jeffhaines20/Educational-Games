/*
 * Syntax & Sorcery — RichText renderer and Python highlighter (SS.UI.rich).
 *
 * RichText (docs/DESIGN.md §7.4) is a string (one paragraph) or an array of
 * blocks: "text", {code}, {code, output}, {output}, {list}, {steps}, {tip},
 * {warning}. Inline markup: `code`, **bold**, *italic*. Everything else is
 * escaped: text only ever becomes text nodes, never HTML.
 *
 * Untrusted strings from Python (trial messages, friendly errors) are rendered
 * with inline(text, { codeOnly: true }): only `backtick code` is formatted.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  var u = UI.util;
  var h = u.h;

  // --------------------------------------------------------------------------
  // Python syntax highlighting (offline, tiny, good enough for lessons)
  // --------------------------------------------------------------------------

  function toSet(words) {
    var set = Object.create(null);
    words.split(/\s+/).forEach(function (w) { if (w) set[w] = true; });
    return set;
  }

  var KEYWORDS = toSet("and as assert async await break class continue def del elif else except finally for from " +
    "global if import in is lambda nonlocal not or pass raise return try while with yield match case");
  var CONSTANTS = toSet("True False None NotImplemented Ellipsis");
  var SELF = toSet("self cls");
  var BUILTINS = toSet("abs all any ascii bin bool breakpoint bytearray bytes callable chr classmethod compile " +
    "complex delattr dict dir divmod enumerate eval exec filter float format frozenset getattr globals hasattr " +
    "hash help hex id input int isinstance issubclass iter len list locals map max memoryview min next object " +
    "oct open ord pow print property range repr reversed round set setattr slice sorted staticmethod str sum " +
    "super tuple type vars zip __import__ Exception BaseException ValueError TypeError KeyError IndexError " +
    "NameError ZeroDivisionError AttributeError RuntimeError StopIteration RecursionError NotImplementedError " +
    "AssertionError ArithmeticError LookupError OverflowError ImportError ModuleNotFoundError EOFError");

  // 1 comment | 2 string | 3 number | 4 decorator | 5 identifier | 6 whitespace | 7 anything else
  var TOKEN = /(#[^\n]*)|((?:[rRbBuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\[\s\S])*"?|'(?:[^'\\\n]|\\[\s\S])*'?))|(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?[jJ]?)|(@[A-Za-z_][\w.]*)|([A-Za-z_À-￿][\wÀ-￿]*)|(\s+)|([\s\S])/g;
  var OPERATOR = /[+\-*/%=<>!&|^~:]/;

  /** Split Python source into [cssClass|null, text] pairs. */
  function tokenize(source) {
    var out = [];
    var text = String(source == null ? "" : source);
    var match, prevWord = null, prevSig = "";
    TOKEN.lastIndex = 0;
    while ((match = TOKEN.exec(text)) !== null) {
      var tok = match[0];
      var cls = null;
      if (match[1] !== undefined) cls = "tok-com";
      else if (match[2] !== undefined) cls = "tok-str";
      else if (match[3] !== undefined) cls = "tok-num";
      else if (match[4] !== undefined) cls = "tok-deco";
      else if (match[5] !== undefined) {
        if (prevWord === "def" || prevWord === "class") cls = "tok-def";
        else if (KEYWORDS[tok]) cls = "tok-kw";
        else if (CONSTANTS[tok]) cls = "tok-const";
        else if (SELF[tok]) cls = "tok-self";
        else if (prevSig === ".") cls = /^\s*\(/.test(text.slice(TOKEN.lastIndex, TOKEN.lastIndex + 40)) ? "tok-call" : "tok-attr";
        else if (BUILTINS[tok]) cls = "tok-builtin";
        else if (/^\s*\(/.test(text.slice(TOKEN.lastIndex, TOKEN.lastIndex + 40))) cls = "tok-call";
      } else if (match[7] !== undefined && OPERATOR.test(tok)) {
        cls = "tok-op";
      }
      if (match[6] === undefined) {
        prevWord = match[5] !== undefined ? tok : null;
        prevSig = tok;
      }
      if (!tok) { TOKEN.lastIndex += 1; continue; } // never loop on an empty match
      var last = out[out.length - 1];
      if (last && last[0] === cls) last[1] += tok;
      else out.push([cls, tok]);
    }
    return out;
  }

  /** Highlighted Python as a DocumentFragment of spans and text nodes. */
  function highlight(source) {
    var frag = document.createDocumentFragment();
    tokenize(source).forEach(function (pair) {
      if (pair[0]) frag.appendChild(h("span", { class: pair[0] }, pair[1]));
      else frag.appendChild(document.createTextNode(pair[1]));
    });
    return frag;
  }

  // --------------------------------------------------------------------------
  // Inline markup
  // --------------------------------------------------------------------------

  var PLACEHOLDER = /(\d+)/g;

  /** Append text to parent, turning code placeholders into <code> and newlines into <br>. */
  function appendPlain(parent, text, codes) {
    var lines = text.split("\n");
    lines.forEach(function (line, index) {
      if (index > 0) parent.appendChild(h("br"));
      var last = 0, match;
      PLACEHOLDER.lastIndex = 0;
      while ((match = PLACEHOLDER.exec(line)) !== null) {
        if (match.index > last) parent.appendChild(document.createTextNode(line.slice(last, match.index)));
        parent.appendChild(h("code", { class: "inline-code" }, codes[Number(match[1])]));
        last = match.index + match[0].length;
      }
      if (last < line.length) parent.appendChild(document.createTextNode(line.slice(last)));
    });
  }

  // **bold**  |  *italic* (the * must hug the words and not sit inside a word, so 2*3*4 stays as is)
  var EMPHASIS = /\*\*(?=\S)([\s\S]*?\S)\*\*|(^|[^\w*\\])\*(?=[^\s*])([^*\n]*?[^\s*\\])\*(?![\w*])/;

  function appendEmphasis(parent, text, codes) {
    var rest = text;
    var guard = 0;
    while (rest && guard++ < 500) {
      var m = EMPHASIS.exec(rest);
      if (!m) break;
      if (m[1] !== undefined) {
        appendPlain(parent, rest.slice(0, m.index), codes);
        var strong = h("strong");
        appendEmphasis(strong, m[1], codes);
        parent.appendChild(strong);
      } else {
        appendPlain(parent, rest.slice(0, m.index) + m[2], codes);
        var em = h("em");
        appendEmphasis(em, m[3], codes);
        parent.appendChild(em);
      }
      rest = rest.slice(m.index + m[0].length);
    }
    if (rest) appendPlain(parent, rest, codes);
  }

  /**
   * Inline markup → DocumentFragment. opts.codeOnly: only `code` is formatted
   * (for messages produced by Python, which may legitimately contain * or **).
   */
  function inline(text, opts) {
    var frag = document.createDocumentFragment();
    if (text === null || text === undefined) return frag;
    var codes = [];
    var source = String(text).replace(/[]/g, "");
    source = source.replace(/`([^`]+)`/g, function (all, inner) {
      codes.push(inner);
      return "" + (codes.length - 1) + "";
    });
    if (opts && opts.codeOnly) appendPlain(frag, source, codes);
    else appendEmphasis(frag, source, codes);
    return frag;
  }

  /** Plain text version of RichText (markup removed) for labels and announcements. */
  function plainText(rich) {
    if (rich === null || rich === undefined) return "";
    if (Array.isArray(rich)) return rich.map(plainText).filter(Boolean).join(" ");
    if (typeof rich === "object") {
      if (rich.code !== undefined) return String(rich.code);
      if (rich.diagram !== undefined) return String(rich.diagram);
      if (rich.output !== undefined) return String(rich.output);
      if (Array.isArray(rich.list)) return rich.list.map(plainText).join(" ");
      if (Array.isArray(rich.steps)) return rich.steps.map(plainText).join(" ");
      if (rich.tip !== undefined) return plainText(rich.tip);
      if (rich.warning !== undefined) return plainText(rich.warning);
      return "";
    }
    return String(rich).replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?!\w)/g, "$1$2");
  }

  // --------------------------------------------------------------------------
  // Blocks
  // --------------------------------------------------------------------------

  function copyButton(getText, label) {
    var btn = u.button("Copy", { kind: "ghost", size: "xs", icon: "📋", class: "copy-btn", ariaLabel: label || "Copy code" });
    btn.addEventListener("click", function () {
      u.copyText(getText()).then(function (ok) {
        var text = btn.querySelector(".btn-label");
        if (text) text.textContent = ok ? "Copied!" : "Copy failed";
        u.announce(ok ? "Copied to the clipboard." : "Your browser blocked copying. Select the text and copy it yourself.");
        setTimeout(function () { if (text) text.textContent = "Copy"; }, 1800);
      });
    });
    return btn;
  }

  /** A read-only, highlighted Python example (plus its output, if given). */
  function codeBlock(source, output, opts) {
    opts = opts || {};
    var code = String(source == null ? "" : source).replace(/\n+$/, "");
    var pre = h("pre", { class: "code-block", tabindex: "0", "aria-label": opts.label || "Python example" },
      h("code", { class: "language-python" }, highlight(code)));
    var head = h("div", { class: "code-head" },
      h("span", { class: "code-lang" }, u.emoji("🐍"), " ", opts.title || "Python"),
      opts.noCopy ? null : copyButton(function () { return code; }, "Copy this example"));
    var figure = h("figure", { class: "rt-code" }, head, pre);
    if (output !== undefined && output !== null) {
      figure.appendChild(h("div", { class: "rt-output" },
        h("div", { class: "rt-output-label" }, u.emoji("🔮"), " Output"),
        h("pre", { class: "output-text" }, String(output))));
    }
    return figure;
  }

  /** A text picture or table (call trees, mazes, DP tables): exactly as written, never highlighted. */
  function diagramBlock(text) {
    var body = String(text == null ? "" : text).replace(/\n+$/, "");
    return h("figure", { class: "rt-diagram" },
      h("pre", { class: "diagram-text", tabindex: "0", "aria-label": "Diagram" }, body));
  }

  function outputBlock(output, label) {
    return h("figure", { class: "rt-output rt-output-alone" },
      h("figcaption", { class: "rt-output-label" }, u.emoji("🔮"), " ", label || "Expected output"),
      h("pre", { class: "output-text" }, String(output)));
  }

  function callout(kind, icon, title, content) {
    var body = h("div", { class: "callout-body" });
    if (Array.isArray(content)) body.appendChild(render(content));
    else body.appendChild(h("p", null, inline(content)));
    return h("aside", { class: "callout callout-" + kind, "aria-label": title },
      h("span", { class: "callout-icon", "aria-hidden": "true" }, icon), body);
  }

  function listItems(items) {
    return items.map(function (item) {
      var li = h("li");
      if (Array.isArray(item) || (item && typeof item === "object")) li.appendChild(render(item));
      else li.appendChild(inline(item));
      return li;
    });
  }

  function renderBlock(block) {
    if (block === null || block === undefined || block === "") return null;
    if (typeof block === "string" || typeof block === "number") return h("p", null, inline(String(block)));
    if (Array.isArray(block)) return render(block);
    if (typeof block !== "object") return null;
    if (block.code !== undefined) return codeBlock(block.code, block.output);
    if (block.diagram !== undefined) return diagramBlock(block.diagram);
    if (block.output !== undefined) return outputBlock(block.output, block.label);
    if (Array.isArray(block.list)) return h("ul", { class: "rt-list" }, listItems(block.list));
    if (Array.isArray(block.steps)) return h("ol", { class: "rt-steps" }, listItems(block.steps));
    if (block.tip !== undefined) return callout("tip", "💡", "Tip", block.tip);
    if (block.warning !== undefined) return callout("warning", "⚠️", "Careful", block.warning);
    if (block.text !== undefined) return h("p", null, inline(block.text));
    // An unknown block type: show whatever text it carries rather than nothing (or an error).
    var texts = Object.keys(block).map(function (k) { return block[k]; })
      .filter(function (v) { return typeof v === "string" || typeof v === "number"; });
    return texts.length ? h("p", null, inline(texts.join(" "))) : null;
  }

  /** RichText → DocumentFragment. */
  function render(rich) {
    var frag = document.createDocumentFragment();
    if (rich === null || rich === undefined || rich === "") return frag;
    var blocks = Array.isArray(rich) ? rich : [rich];
    blocks.forEach(function (block) {
      var node = u.safe(function () { return renderBlock(block); }, null);
      if (node) frag.appendChild(node);
    });
    return frag;
  }

  /** RichText wrapped in a <div class="rich">. */
  function block(rich, extraClass) {
    return h("div", { class: "rich" + (extraClass ? " " + extraClass : "") }, render(rich));
  }

  UI.rich = {
    render: render,
    block: block,
    inline: inline,
    plainText: plainText,
    highlight: highlight,
    tokenize: tokenize,
    codeBlock: codeBlock,
    diagramBlock: diagramBlock,
    outputBlock: outputBlock,
    copyButton: copyButton
  };
})(typeof window !== "undefined" ? window : globalThis);
