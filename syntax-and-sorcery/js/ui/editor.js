/*
 * Syntax & Sorcery — the spell editor (SS.UI.Editor).
 *
 * Uses CodeMirror 5 (from cdnjs) when it can be loaded, otherwise a plain
 * <textarea> with line numbers, Tab indentation and auto-indent. CodeMirror is
 * loaded on demand without blocking the page; an editor created before it has
 * arrived starts as a textarea and upgrades itself in place.
 *
 *   var ed = SS.UI.Editor.create(hostEl, { value, label, fontSize, onChange(code), onCast() });
 *   ed.getValue() / ed.setValue(code) / ed.focus() / ed.goToLine(n)
 *   ed.markLine(n, "error"|"warning") / ed.clearMarks() / ed.setFontSize(px) / ed.refresh() / ed.destroy()
 *
 * Keyboard: Tab / Shift+Tab indent, Ctrl/⌘+Enter casts, Ctrl/⌘+/ toggles comments,
 * Esc then Tab moves focus out of the editor. `?editor=plain` (or
 * SS_CONFIG.plainEditor = true) forces the plain editor.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  var u = UI.util;
  var h = u.h;

  var DEFAULT_BASE = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/";
  var ADDONS = ["mode/python/python.min.js", "addon/edit/matchbrackets.min.js", "addon/edit/closebrackets.min.js"];
  var IS_MAC = /Mac|iPhone|iPad|iPod/.test((global.navigator && (navigator.platform || navigator.userAgent)) || "");
  var MOD = IS_MAC ? "⌘" : "Ctrl";

  var loadPromise = null;
  var live = []; // editors waiting to upgrade

  function wantsPlain() {
    var conf = SS.config || {};
    if (conf.plainEditor === true) return true;
    try { return /[?&]editor=plain\b/.test(global.location.search); } catch (err) { return false; }
  }

  function baseURL() {
    var conf = SS.config || {};
    var base = typeof conf.codeMirrorBaseURL === "string" && conf.codeMirrorBaseURL ? conf.codeMirrorBaseURL : DEFAULT_BASE;
    return base.charAt(base.length - 1) === "/" ? base : base + "/";
  }

  function loadScript(src, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var el = document.createElement("script");
      el.src = src;
      el.async = false;
      el.onload = function () { if (!done) { done = true; resolve(); } };
      el.onerror = function () { if (!done) { done = true; reject(new Error("failed: " + src)); } };
      setTimeout(function () { if (!done) { done = true; reject(new Error("timeout: " + src)); } }, timeoutMs || 15000);
      document.head.appendChild(el);
    });
  }

  function loadStylesheet(href, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      el.onload = function () { if (!done) { done = true; resolve(); } };
      el.onerror = function () { if (!done) { done = true; reject(new Error("failed: " + href)); } };
      setTimeout(function () { if (!done) { done = true; reject(new Error("timeout: " + href)); } }, timeoutMs || 15000);
      // Put it before our own stylesheet so the arcane theme wins.
      var ours = document.querySelector('link[href$="css/style.css"]');
      if (ours && ours.parentNode) ours.parentNode.insertBefore(el, ours);
      else document.head.appendChild(el);
    });
  }

  /** Load CodeMirror once. Resolves true when it is ready, false if it can't be used. */
  function loadCodeMirror() {
    if (loadPromise) return loadPromise;
    if (wantsPlain()) { loadPromise = Promise.resolve(false); return loadPromise; }
    if (global.CodeMirror && global.CodeMirror.modes && global.CodeMirror.modes.python) {
      loadPromise = Promise.resolve(true);
      return loadPromise;
    }
    var base = baseURL();
    var css = loadStylesheet(base + "codemirror.min.css");
    var js = (global.CodeMirror ? Promise.resolve() : loadScript(base + "codemirror.min.js")).then(function () {
      if (!global.CodeMirror) throw new Error("CodeMirror missing");
      return Promise.all(ADDONS.map(function (file) {
        return loadScript(base + file).catch(function () { return null; });
      }));
    });
    loadPromise = Promise.all([css, js]).then(function () { return !!global.CodeMirror; }, function () { return false; })
      .then(function (ok) {
        if (ok) live.slice().forEach(function (ed) { u.safe(function () { ed._upgrade(); }); });
        return ok;
      });
    return loadPromise;
  }

  // --------------------------------------------------------------------------
  // Shared editing helpers
  // --------------------------------------------------------------------------

  function commentToggleLines(lines) {
    var nonEmpty = lines.filter(function (l) { return l.trim() !== ""; });
    if (!nonEmpty.length) return lines;
    var allCommented = nonEmpty.every(function (l) { return /^\s*#/.test(l); });
    if (allCommented) {
      return lines.map(function (l) { return l.replace(/^(\s*)# ?/, "$1"); });
    }
    var indent = Math.min.apply(null, nonEmpty.map(function (l) { return l.match(/^ */)[0].length; }));
    return lines.map(function (l) { return l.trim() === "" ? l : l.slice(0, indent) + "# " + l.slice(indent); });
  }

  // --------------------------------------------------------------------------
  // CodeMirror implementation
  // --------------------------------------------------------------------------

  function createCodeMirror(surface, opts, hooks) {
    var CM = global.CodeMirror;
    var escaped = false;
    var marks = [];
    var hasPython = !!(CM.modes && CM.modes.python);

    function cast() { if (hooks.onCast) hooks.onCast(); }

    function toggleComment(cm) {
      var from = cm.getCursor("from"), to = cm.getCursor("to");
      var last = to.line;
      if (to.ch === 0 && last > from.line) last -= 1;
      var lines = [];
      for (var i = from.line; i <= last; i++) lines.push(cm.getLine(i));
      var next = commentToggleLines(lines);
      cm.operation(function () {
        for (var j = 0; j < next.length; j++) {
          if (next[j] !== lines[j]) cm.replaceRange(next[j], { line: from.line + j, ch: 0 }, { line: from.line + j, ch: lines[j].length }, "+comment");
        }
      });
    }

    var cm = CM(surface, {
      value: opts.value || "",
      mode: hasPython ? { name: "python", version: 3, singleLineStringErrors: false } : "text/plain",
      theme: "arcane",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      smartIndent: true,
      electricChars: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      lineWrapping: false,
      viewportMargin: Infinity,
      gutters: ["CodeMirror-linenumbers", "ss-marks"],
      inputStyle: "contenteditable",
      screenReaderLabel: opts.label || "Spell editor (Python)",
      spellcheck: false,
      autocorrect: false,
      autocapitalize: false,
      readOnly: !!opts.readOnly,
      extraKeys: {
        Tab: function (ed) {
          if (escaped) { escaped = false; return CM.Pass; }
          if (ed.somethingSelected()) ed.indentSelection("add");
          else ed.execCommand("insertSoftTab");
        },
        "Shift-Tab": function (ed) {
          if (escaped) { escaped = false; return CM.Pass; }
          ed.indentSelection("subtract");
        },
        Esc: function () { escaped = true; if (hooks.onEscape) hooks.onEscape(); },
        "Ctrl-Enter": cast,
        "Cmd-Enter": cast,
        "Ctrl-/": toggleComment,
        "Cmd-/": toggleComment,
        Backspace: function (ed) {
          if (ed.somethingSelected()) return CM.Pass;
          var cur = ed.getCursor();
          var before = ed.getLine(cur.line).slice(0, cur.ch);
          if (before.length && /^ +$/.test(before)) {
            var n = before.length % 4 || 4;
            ed.replaceRange("", { line: cur.line, ch: cur.ch - n }, cur, "+delete");
            return undefined;
          }
          return CM.Pass;
        }
      }
    });

    cm.on("keydown", function (ed, e) {
      if (e.key !== "Escape" && e.key !== "Tab" && e.key !== "Shift") escaped = false;
    });
    cm.on("blur", function () { escaped = false; if (hooks.onBlur) hooks.onBlur(); });
    cm.on("focus", function () { if (hooks.onFocus) hooks.onFocus(); });
    cm.on("change", function (ed, change) {
      if (marks.length) {
        var fromLine = change.from.line, toLine = change.from.line + Math.max(change.text.length - 1, change.to.line - change.from.line);
        marks = marks.filter(function (m) {
          var ln = ed.getLineNumber(m.handle);
          if (ln === null || (ln >= fromLine && ln <= toLine)) {
            if (ln !== null) {
              ed.removeLineClass(m.handle, "wrap", "cm-ss-line-" + m.kind);
              ed.setGutterMarker(m.handle, "ss-marks", null);
            }
            return false;
          }
          return true;
        });
      }
      if (hooks.onChange) hooks.onChange(ed.getValue());
    });
    var input = cm.getInputField();
    if (input && hooks.describedBy) input.setAttribute("aria-describedby", hooks.describedBy);

    return {
      kind: "codemirror",
      cm: cm,
      getValue: function () { return cm.getValue(); },
      setValue: function (value) { cm.setValue(String(value == null ? "" : value)); cm.clearHistory(); },
      replaceAll: function (value) {
        var last = cm.lastLine();
        cm.replaceRange(String(value == null ? "" : value), { line: cm.firstLine(), ch: 0 }, { line: last, ch: cm.getLine(last).length }, "+replace");
        cm.setCursor({ line: 0, ch: 0 });
      },
      focus: function () { cm.focus(); },
      hasFocus: function () { return cm.hasFocus(); },
      refresh: function () { cm.refresh(); },
      setReadOnly: function (on) { cm.setOption("readOnly", !!on); },
      getSelectionIndex: function () {
        return [cm.indexFromPos(cm.getCursor("from")), cm.indexFromPos(cm.getCursor("to"))];
      },
      setSelectionIndex: function (start, end) {
        cm.setSelection(cm.posFromIndex(start), cm.posFromIndex(end));
      },
      lineCount: function () { return cm.lineCount(); },
      goToLine: function (line) {
        var idx = Math.max(0, Math.min(cm.lineCount() - 1, line - 1));
        var text = cm.getLine(idx) || "";
        cm.focus();
        cm.setCursor({ line: idx, ch: text.length - text.replace(/^\s+/, "").length });
        cm.scrollIntoView({ line: idx, ch: 0 }, 80);
      },
      markLine: function (line, kind) {
        var idx = line - 1;
        if (idx < 0 || idx >= cm.lineCount()) return false;
        var handle = cm.addLineClass(idx, "wrap", "cm-ss-line-" + kind);
        cm.setGutterMarker(idx, "ss-marks", h("span", {
          class: "ss-gutter-mark " + kind,
          title: kind === "error" ? "Python stopped on this line" : "A trial pointed at this line"
        }, kind === "error" ? "✖" : "!"));
        marks.push({ handle: handle, kind: kind });
        cm.scrollIntoView({ line: idx, ch: 0 }, 80);
        return true;
      },
      clearMarks: function () {
        marks.forEach(function (m) {
          if (cm.getLineNumber(m.handle) !== null) cm.removeLineClass(m.handle, "wrap", "cm-ss-line-" + m.kind);
        });
        cm.clearGutter("ss-marks");
        marks = [];
      },
      markedLines: function () {
        return marks.map(function (m) { return { line: (cm.getLineNumber(m.handle) || 0) + 1, kind: m.kind }; });
      },
      destroy: function () {
        var wrapper = cm.getWrapperElement();
        u.remove(wrapper);
      }
    };
  }

  // --------------------------------------------------------------------------
  // Plain <textarea> implementation (no CDN needed)
  // --------------------------------------------------------------------------

  function createPlain(surface, opts, hooks) {
    var escaped = false;
    var marks = [];
    var lastCount = -1;
    var ta = h("textarea", {
      class: "plain-input",
      spellcheck: "false",
      autocapitalize: "off",
      autocomplete: "off",
      autocorrect: "off",
      wrap: "off",
      "aria-label": opts.label || "Spell editor (Python)",
      "aria-describedby": hooks.describedBy || null,
      "aria-multiline": "true",
      readonly: opts.readOnly ? true : null
    });
    ta.value = opts.value || "";
    var gutterInner = h("div", { class: "plain-gutter-inner" });
    var gutter = h("div", { class: "plain-gutter", "aria-hidden": "true" }, gutterInner);
    var marksLayer = h("div", { class: "plain-marks", "aria-hidden": "true" });
    var main = h("div", { class: "plain-main" }, marksLayer, ta);
    var root = h("div", { class: "plain-editor" }, gutter, main);
    surface.appendChild(root);

    function renumber() {
      var count = ta.value.split("\n").length;
      if (count === lastCount) return;
      lastCount = count;
      var nums = [];
      for (var i = 1; i <= count; i++) nums.push(i);
      gutterInner.textContent = nums.join("\n");
    }

    function syncScroll() {
      gutterInner.style.transform = "translateY(" + (-ta.scrollTop) + "px)";
      marksLayer.style.transform = "translateY(" + (-ta.scrollTop) + "px)";
    }

    function metrics() {
      var style = getComputedStyle(ta);
      var lineHeight = parseFloat(style.lineHeight);
      if (!isFinite(lineHeight)) lineHeight = parseFloat(style.fontSize) * 1.55;
      return { lineHeight: lineHeight, top: parseFloat(style.paddingTop) || 0 };
    }

    function drawMarks() {
      u.clear(marksLayer);
      var m = metrics();
      marks.forEach(function (mark) {
        marksLayer.appendChild(h("div", {
          class: "plain-mark " + mark.kind,
          style: { top: (m.top + (mark.line - 1) * m.lineHeight) + "px", height: m.lineHeight + "px" }
        }));
      });
    }

    function changed() {
      renumber();
      if (marks.length) { marks = []; drawMarks(); }
      if (hooks.onChange) hooks.onChange(ta.value);
    }

    /** Replace [start, end) with text, keeping the browser's undo history when possible. */
    function replace(start, end, text, selStart, selEnd) {
      var before = ta.value;
      ta.focus();
      ta.setSelectionRange(start, end);
      var ok = false;
      if (document.activeElement === ta) {
        try { ok = document.execCommand("insertText", false, text); } catch (err) { ok = false; }
      }
      var expected = before.slice(0, start) + text + before.slice(end);
      if (!ok || ta.value !== expected) {
        ta.value = expected;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (selStart !== undefined) ta.setSelectionRange(selStart, selEnd === undefined ? selStart : selEnd);
    }

    function lineBlock() {
      var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      var start = v.lastIndexOf("\n", s - 1) + 1;
      var endIdx = e;
      if (endIdx > s && v.charAt(endIdx - 1) === "\n") endIdx -= 1;
      var end = v.indexOf("\n", endIdx);
      if (end < 0) end = v.length;
      return { start: start, end: end, text: v.slice(start, end), s: s, e: e };
    }

    function indent() {
      var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      if (s === e || v.slice(s, e).indexOf("\n") < 0) {
        var lineStart = v.lastIndexOf("\n", s - 1) + 1;
        var n = 4 - ((s - lineStart) % 4);
        replace(s, e, "    ".slice(0, n), s + n);
        return;
      }
      var b = lineBlock();
      var out = b.text.split("\n").map(function (l) { return l.length ? "    " + l : l; }).join("\n");
      replace(b.start, b.end, out, b.start, b.start + out.length);
    }

    function dedent() {
      var b = lineBlock();
      var removedFirst = 0;
      var out = b.text.split("\n").map(function (l, i) {
        var m = l.match(/^( {1,4}|\t)/);
        var n = m ? m[0].length : 0;
        if (i === 0) removedFirst = n;
        return l.slice(n);
      }).join("\n");
      if (out === b.text) return;
      if (b.s === b.e) {
        var cursor = Math.max(b.start, b.s - removedFirst);
        replace(b.start, b.end, out, cursor);
      } else {
        replace(b.start, b.end, out, b.start, b.start + out.length);
      }
    }

    function newline() {
      var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      var lineStart = v.lastIndexOf("\n", s - 1) + 1;
      var line = v.slice(lineStart, s);
      var indentText = line.match(/^[ \t]*/)[0];
      var code = line.replace(/#.*$/, "").replace(/\s+$/, "");
      if (/:$/.test(code)) indentText += "    ";
      else if (/^\s*(return|pass|break|continue|raise)\b/.test(line)) indentText = indentText.slice(0, Math.max(0, indentText.length - 4));
      replace(s, e, "\n" + indentText, s + 1 + indentText.length);
    }

    function toggleComment() {
      var b = lineBlock();
      var out = commentToggleLines(b.text.split("\n")).join("\n");
      replace(b.start, b.end, out, b.start, b.start + out.length);
    }

    ta.addEventListener("keydown", function (e) {
      if (e.isComposing) return;
      if (e.key === "Escape") { escaped = true; if (hooks.onEscape) hooks.onEscape(); return; }
      if (e.key === "Tab") {
        if (escaped || e.ctrlKey || e.altKey || e.metaKey || opts.readOnly) { escaped = false; return; }
        e.preventDefault();
        if (e.shiftKey) dedent(); else indent();
        return;
      }
      if (e.key !== "Shift") escaped = false;
      if (opts.readOnly) return;
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (hooks.onCast) hooks.onCast(); return; }
      if (e.key === "Enter" && !e.shiftKey && !e.altKey) { e.preventDefault(); newline(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "/" || e.code === "Slash")) { e.preventDefault(); toggleComment(); return; }
      if (e.key === "Backspace" && ta.selectionStart === ta.selectionEnd) {
        var v = ta.value, s = ta.selectionStart;
        var before = v.slice(v.lastIndexOf("\n", s - 1) + 1, s);
        if (before.length && /^ +$/.test(before)) {
          e.preventDefault();
          var n = before.length % 4 || 4;
          replace(s - n, s, "", s - n);
        }
      }
    });
    ta.addEventListener("input", changed);
    ta.addEventListener("scroll", syncScroll);
    ta.addEventListener("blur", function () { escaped = false; if (hooks.onBlur) hooks.onBlur(); });
    ta.addEventListener("focus", function () { if (hooks.onFocus) hooks.onFocus(); });
    renumber();

    return {
      kind: "plain",
      textarea: ta,
      getValue: function () { return ta.value; },
      setValue: function (value) { ta.value = String(value == null ? "" : value); renumber(); marks = []; drawMarks(); syncScroll(); },
      replaceAll: function (value) { replace(0, ta.value.length, String(value == null ? "" : value), 0); ta.scrollTop = 0; syncScroll(); },
      focus: function () { u.focusEl(ta); },
      hasFocus: function () { return document.activeElement === ta; },
      refresh: function () { renumber(); drawMarks(); syncScroll(); },
      setReadOnly: function (on) { ta.readOnly = !!on; },
      getSelectionIndex: function () { return [ta.selectionStart, ta.selectionEnd]; },
      setSelectionIndex: function (start, end) { ta.setSelectionRange(start, end); },
      lineCount: function () { return ta.value.split("\n").length; },
      goToLine: function (line) {
        var lines = ta.value.split("\n");
        var idx = Math.max(0, Math.min(lines.length - 1, line - 1));
        var pos = 0;
        for (var i = 0; i < idx; i++) pos += lines[i].length + 1;
        pos += lines[idx].length - lines[idx].replace(/^\s+/, "").length;
        ta.focus();
        ta.setSelectionRange(pos, pos);
        var m = metrics();
        var top = (idx) * m.lineHeight;
        if (top < ta.scrollTop || top > ta.scrollTop + ta.clientHeight - m.lineHeight * 2) {
          ta.scrollTop = Math.max(0, top - ta.clientHeight / 3);
        }
        syncScroll();
      },
      markLine: function (line, kind) {
        if (line < 1 || line > ta.value.split("\n").length) return false;
        marks.push({ line: line, kind: kind });
        drawMarks();
        var m = metrics();
        var top = (line - 1) * m.lineHeight;
        if (top < ta.scrollTop || top > ta.scrollTop + ta.clientHeight - m.lineHeight) {
          ta.scrollTop = Math.max(0, top - ta.clientHeight / 3);
          syncScroll();
        }
        return true;
      },
      clearMarks: function () { marks = []; drawMarks(); },
      markedLines: function () { return marks.slice(); },
      destroy: function () { u.remove(root); }
    };
  }

  // --------------------------------------------------------------------------
  // Public wrapper
  // --------------------------------------------------------------------------

  function create(host, options) {
    var opts = Object.assign({ value: "", label: "Spell editor (Python)", fontSize: 15 }, options || {});
    var helpId = u.uid("editor-help");
    var surface = h("div", { class: "editor-surface" });
    var escapeNote = h("span", { class: "editor-escape-note", "aria-live": "polite" });
    var help = h("p", { class: "editor-help", id: helpId },
      h("span", null, h("kbd", null, "Tab"), " indents · ", h("kbd", null, MOD + "+Enter"), " casts · ",
        h("kbd", null, "Esc"), " then ", h("kbd", null, "Tab"), " leaves the editor"),
      escapeNote);
    var shell = h("div", { class: "editor-shell" }, surface, opts.showHelp === false ? null : help);
    host.appendChild(shell);

    var escapeTimer = null;
    var hooks = {
      describedBy: helpId,
      onChange: function (code) { if (opts.onChange) opts.onChange(code); },
      onCast: function () { if (opts.onCast) opts.onCast(); },
      onEscape: function () {
        escapeNote.textContent = "Press Tab to move out of the editor.";
        shell.classList.add("escaped");
        clearTimeout(escapeTimer);
        escapeTimer = setTimeout(function () { escapeNote.textContent = ""; shell.classList.remove("escaped"); }, 4000);
      },
      onFocus: function () { shell.classList.add("focused"); },
      onBlur: function () {
        shell.classList.remove("focused");
        shell.classList.remove("escaped");
        escapeNote.textContent = "";
      }
    };

    var impl = null;
    var destroyed = false;
    var api = {};

    function build(value) {
      var o = Object.assign({}, opts, { value: value });
      impl = (global.CodeMirror && !wantsPlain()) ? createCodeMirror(surface, o, hooks) : createPlain(surface, o, hooks);
      shell.classList.toggle("is-codemirror", impl.kind === "codemirror");
      shell.classList.toggle("is-plain", impl.kind === "plain");
    }

    function setFontSize(px) {
      var size = Math.max(11, Math.min(28, Number(px) || 15));
      shell.style.setProperty("--editor-font-size", size + "px");
      if (impl) impl.refresh();
    }

    api._upgrade = function () {
      if (destroyed || !impl || impl.kind === "codemirror" || !global.CodeMirror || wantsPlain()) return;
      var value = impl.getValue();
      var focused = impl.hasFocus();
      var sel = impl.getSelectionIndex();
      var oldMarks = impl.markedLines();
      impl.destroy();
      build(value);
      oldMarks.forEach(function (m) { impl.markLine(m.line, m.kind); });
      if (focused) {
        impl.focus();
        impl.setSelectionIndex(sel[0], sel[1]);
      }
      setTimeout(function () { if (impl) impl.refresh(); }, 30);
      if (opts.onUpgrade) opts.onUpgrade("codemirror");
    };

    api.getValue = function () { return impl ? impl.getValue() : ""; };
    api.setValue = function (v) { if (impl) impl.setValue(v); };
    api.replaceAll = function (v) { if (impl) impl.replaceAll(v); };
    api.focus = function () { if (impl) impl.focus(); };
    api.hasFocus = function () { return impl ? impl.hasFocus() : false; };
    api.refresh = function () { if (impl) impl.refresh(); };
    api.goToLine = function (line) { if (impl) impl.goToLine(line); };
    api.markLine = function (line, kind) { return impl ? impl.markLine(line, kind || "error") : false; };
    api.clearMarks = function () { if (impl) impl.clearMarks(); };
    api.markedLines = function () { return impl ? impl.markedLines() : []; };
    api.setFontSize = setFontSize;
    api.setReadOnly = function (on) { if (impl) impl.setReadOnly(on); };
    api.kind = function () { return impl ? impl.kind : "none"; };
    api.lineCount = function () { return impl ? impl.lineCount() : 0; };
    api.el = shell;
    api.destroy = function () {
      destroyed = true;
      var i = live.indexOf(api);
      if (i >= 0) live.splice(i, 1);
      if (impl) impl.destroy();
      impl = null;
      u.remove(shell);
    };

    build(opts.value);
    setFontSize(opts.fontSize);
    if (impl.kind === "plain" && !wantsPlain()) {
      live.push(api);
      loadCodeMirror();
    }
    return api;
  }

  UI.Editor = {
    create: create,
    loadCodeMirror: loadCodeMirror,
    modKey: MOD,
    isMac: IS_MAC
  };
})(typeof window !== "undefined" ? window : globalThis);
