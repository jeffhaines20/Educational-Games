/*
 * The Cardiac Case Files — RichText renderer (CCF.UI.rich). Format: docs/DESIGN.md §6.
 *
 * RichText is a string (one paragraph) or an array of blocks: strings (paragraphs),
 * { list: [...] }, { olist: [...] }, { tip: inline }, { warn: inline } (a red flag),
 * { quote: inline, by: "…" } and { table: { head: [...], rows: [[...]] } }.
 * Inline markup: **bold** and *italic*. Everything else is text: strings only ever become
 * text nodes, never HTML.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
  var u = UI.util;
  var h = u.h;

  // **bold**  |  *italic* (the * must hug the words and not sit inside a word, so 2*3*4 stays as is)
  var EMPHASIS = /\*\*(?=\S)([\s\S]*?\S)\*\*|(^|[^\w*\\])\*(?=[^\s*])([^*\n]*?[^\s*\\])\*(?![\w*])/;

  function appendPlain(parent, text) {
    var lines = String(text).split("\n");
    lines.forEach(function (line, index) {
      if (index > 0) parent.appendChild(h("br"));
      if (line) parent.appendChild(document.createTextNode(line));
    });
  }

  function appendEmphasis(parent, text) {
    var rest = text;
    var guard = 0;
    while (rest && guard++ < 500) {
      var m = EMPHASIS.exec(rest);
      if (!m) break;
      if (m[1] !== undefined) {
        appendPlain(parent, rest.slice(0, m.index));
        var strong = h("strong");
        appendEmphasis(strong, m[1]);
        parent.appendChild(strong);
      } else {
        appendPlain(parent, rest.slice(0, m.index) + m[2]);
        var em = h("em");
        appendEmphasis(em, m[3]);
        parent.appendChild(em);
      }
      rest = rest.slice(m.index + m[0].length);
    }
    if (rest) appendPlain(parent, rest);
  }

  /** Inline markup (**bold**, *italic*) → DocumentFragment. */
  function inline(text) {
    var frag = document.createDocumentFragment();
    if (text === null || text === undefined) return frag;
    appendEmphasis(frag, String(text));
    return frag;
  }

  /** Plain text version of inline markup. */
  function plainInline(text) {
    return String(text == null ? "" : text)
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?!\w)/g, "$1$2");
  }

  /** Plain text version of RichText (markup removed) for labels, search and announcements. */
  function plainText(rich) {
    if (rich === null || rich === undefined) return "";
    if (typeof rich === "number") return String(rich);
    if (typeof rich === "string") return plainInline(rich);
    if (Array.isArray(rich)) return rich.map(plainText).filter(Boolean).join(" ");
    if (typeof rich === "object") {
      if (Array.isArray(rich.list)) return rich.list.map(plainText).join(" ");
      if (Array.isArray(rich.olist)) return rich.olist.map(plainText).join(" ");
      if (rich.tip !== undefined) return plainText(rich.tip);
      if (rich.warn !== undefined) return plainText(rich.warn);
      if (rich.quote !== undefined) return "“" + plainText(rich.quote) + "”" + (rich.by ? " — " + plainText(rich.by) : "");
      if (rich.table) {
        var t = rich.table;
        var rows = [(t.head || []).map(plainText).join(", ")];
        (t.rows || []).forEach(function (r) { rows.push((r || []).map(plainText).join(", ")); });
        return rows.join(". ");
      }
      return "";
    }
    return String(rich);
  }

  function callout(kind, iconKey, label, content) {
    return h("div", { class: "callout callout-" + kind, role: "note", "aria-label": label },
      h("span", { class: "callout-icon", "aria-hidden": "true" }, u.icon(iconKey)),
      h("div", { class: "callout-body" }, h("p", null, h("span", { class: "callout-label" }, label + ": "), inline(content))));
  }

  function listItems(items) {
    return items.map(function (item) {
      var li = h("li");
      if (Array.isArray(item) || (item && typeof item === "object")) li.appendChild(render(item));
      else li.appendChild(inline(item));
      return li;
    });
  }

  /** A table (RichText table block or an exhibit table): head + rows; numbers allowed in cells. */
  function table(head, rows, opts) {
    opts = opts || {};
    var thead = head && head.length ? h("thead", null, h("tr", null, head.map(function (cell) {
      return h("th", { scope: "col" }, inline(cell));
    }))) : null;
    var tbody = h("tbody", null, (rows || []).map(function (row) {
      return h("tr", null, (row || []).map(function (cell, i) {
        var isNum = typeof cell === "number";
        var td = h(i === 0 && opts.rowHeaders ? "th" : "td", {
          class: isNum ? "num" : null,
          scope: i === 0 && opts.rowHeaders ? "row" : null
        });
        td.appendChild(isNum ? document.createTextNode(String(cell)) : inline(cell));
        return td;
      }));
    }));
    var t = h("table", { class: "rt-table" + (opts.className ? " " + opts.className : "") },
      opts.caption ? h("caption", { class: "sr-only" }, opts.caption) : null, thead, tbody);
    return h("div", { class: "table-wrap", role: "region", tabindex: "0", "aria-label": opts.caption || "Table" }, t);
  }

  function renderBlock(block) {
    if (block === null || block === undefined || block === "") return null;
    if (typeof block === "string" || typeof block === "number") return h("p", null, inline(String(block)));
    if (Array.isArray(block)) return render(block);
    if (typeof block !== "object") return null;
    if (Array.isArray(block.list)) return h("ul", { class: "rt-list" }, listItems(block.list));
    if (Array.isArray(block.olist)) return h("ol", { class: "rt-olist" }, listItems(block.olist));
    if (block.tip !== undefined) return callout("tip", "tip", "Tip", block.tip);
    if (block.warn !== undefined) return callout("warn", "warn", "Red flag", block.warn);
    if (block.quote !== undefined) {
      return h("figure", { class: "rt-quote" },
        h("blockquote", null, h("p", null, inline(block.quote))),
        block.by ? h("figcaption", null, "— ", inline(block.by)) : null);
    }
    if (block.table) return table(block.table.head, block.table.rows);
    // An unknown block: show whatever text it carries rather than nothing.
    var texts = Object.keys(block).map(function (k) { return block[k]; })
      .filter(function (v) { return typeof v === "string" || typeof v === "number"; });
    return texts.length ? h("p", null, inline(texts.join(" "))) : null;
  }

  /** RichText → DocumentFragment. */
  function render(rich) {
    var frag = document.createDocumentFragment();
    if (rich === null || rich === undefined || rich === "") return frag;
    var blocks = Array.isArray(rich) ? rich : [rich];
    blocks.forEach(function (b) {
      var node = u.safe(function () { return renderBlock(b); }, null);
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
    plainInline: plainInline,
    table: table
  };
})(typeof window !== "undefined" ? window : globalThis);
