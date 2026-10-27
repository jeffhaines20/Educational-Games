/*
 * Syntax & Sorcery — showing what a cast did (SS.UI.results).
 *
 *   render(container, result, { trials, inputs, onGoToLine(line), getLine(n) })
 *   casting(container, label)      the "Casting…" state
 *   idle(container, text)          before the first cast
 *   announcement(result)           a short sentence for the aria-live region
 *
 * Layout of a result: one verdict card at the top that says what happened and,
 * for problems, why (the friendly explanation, the offending line and Python's
 * real traceback, or the first failed trial); then the Scrying Pool (what the
 * spell printed) and the Trials list.
 *
 * A RunResult (docs/DESIGN.md §5.2) comes from Python, so every string in it is
 * untrusted: it is inserted as text, and friendly errors / trial messages go
 * through SS.UI.rich.inline(…, { codeOnly: true }) which only formats `code`.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  var u = UI.util;
  var h = u.h;

  function codeText(text) {
    return UI.rich.inline(text, { codeOnly: true });
  }

  function lineButton(line, opts, label) {
    if (!line) return null;
    if (!opts || !opts.onGoToLine) return h("span", { class: "line-ref" }, label || "line " + line);
    return h("button", {
      type: "button",
      class: "line-link",
      title: "Jump to line " + line + " in your spell",
      on: { click: function () { opts.onGoToLine(line); } }
    }, label || "line " + line);
  }

  function firstFailure(result) {
    var tests = result.tests || [];
    for (var i = 0; i < tests.length; i++) if (!tests[i].passed) return tests[i];
    return null;
  }

  function isProblem(status) {
    return status === "error" || status === "timeout" || status === "internal-error";
  }

  function summary(result) {
    var err = result.error || {};
    var total = result.total || 0, passed = result.passed || 0;
    var where = err.line ? " on line " + err.line : "";
    switch (result.status) {
      case "passed":
        return { tone: "passed", icon: "✨", headline: "Spell mastered!", detail: total ? "All " + u.plural(total, "trial") + " passed." : "It worked." };
      case "failed":
        return { tone: "failed", icon: "⚖️", headline: passed + " of " + u.plural(total, "trial") + " passed", detail: "Not quite yet. Here is the first trial that didn't pass:" };
      case "error":
        if (err.phase === "syntax") {
          return { tone: "error", icon: "📜", headline: "Python couldn't read your spell", detail: (err.type || "SyntaxError") + where + ". Nothing ran yet." };
        }
        return { tone: "error", icon: "💥", headline: "Your spell stopped with an error", detail: (err.type || "Error") + where + "." };
      case "timeout":
        return { tone: "timeout", icon: "⏳", headline: "Your spell ran for too long", detail: "The academy's wards stopped it." };
      case "internal-error":
        return { tone: "internal", icon: "🌀", headline: "The academy's machinery hiccuped", detail: "This isn't a problem with your spell." };
      case "ran":
        return { tone: "ran", icon: "✅", headline: "Your spell ran", detail: result.stdout ? "Here is what it printed." : "It ran without printing anything." };
      default:
        return { tone: "internal", icon: "🌀", headline: "Something unexpected happened", detail: "Try casting again." };
    }
  }

  function formatDuration(ms) {
    if (typeof ms !== "number" || !isFinite(ms)) return "";
    return ms < 1000 ? Math.max(1, Math.round(ms)) + " ms" : (ms / 1000).toFixed(1) + " s";
  }

  function trialMeter(tests) {
    var meter = h("ol", { class: "trial-meter", "aria-hidden": "true" });
    tests.forEach(function (t) { meter.appendChild(h("li", { class: t.passed ? "pass" : "fail" })); });
    return meter;
  }

  function tracebackBlock(err, status) {
    var text = err.traceback || "";
    if (!text && err.type && status === "error") text = err.type + (err.message ? ": " + err.message : "");
    if (!text) return null;
    if (status === "internal-error") {
      return h("details", { class: "traceback traceback-tech" },
        h("summary", null, "Technical details (for your instructor)"),
        h("pre", { class: "traceback-text", tabindex: "0" }, text));
    }
    return h("div", { class: "traceback" },
      h("p", { class: "traceback-label" }, u.emoji("🐍"), " Python's own words:"),
      h("pre", { class: "traceback-text", tabindex: "0", "aria-label": "Python's error message" }, text));
  }

  /** The "why" part of an error / timeout / internal error, placed inside the verdict. */
  function problemDetails(result, opts) {
    var err = result.error || {};
    var status = result.status;
    var parts = [];
    if (status === "error" && err.line && opts && opts.getLine) {
      var src = opts.getLine(err.line);
      if (src !== null && src !== undefined && String(src).trim() !== "") {
        parts.push(h("pre", { class: "error-line-code", "aria-label": "Line " + err.line + " of your spell" },
          h("span", { class: "error-line-no", "aria-hidden": "true" }, String(err.line)), String(src)));
      }
    }
    var friendly = err.friendly || err.message || "Something went wrong while casting.";
    parts.push(h("p", { class: "error-friendly" }, codeText(friendly)));
    parts.push(tracebackBlock(err, status));
    return parts;
  }

  function verdict(result, opts) {
    var s = summary(result);
    var err = result.error || {};
    var detail = h("p", { class: "verdict-detail" });
    if (result.status === "error") {
      var type = err.type || (err.phase === "syntax" ? "SyntaxError" : "Error");
      u.append(detail, [h("strong", { class: "error-type" }, type),
        err.line ? [" on ", lineButton(err.line, opts)] : null,
        err.phase === "syntax" ? ". Nothing ran yet." : "."]);
    } else {
      detail.textContent = s.detail;
    }
    var problem = isProblem(result.status);
    var text = h("div", { class: "verdict-text" },
      h("p", { class: "verdict-headline" }, s.headline),
      detail);
    var el = h("div", {
      class: "verdict verdict-" + s.tone + (problem ? " verdict-problem" : ""),
      role: problem ? "group" : null,
      "aria-label": problem ? "What went wrong" : null
    },
      h("span", { class: "verdict-icon", "aria-hidden": "true" }, s.icon),
      text,
      h("div", { class: "verdict-side" },
        result.total ? trialMeter(result.tests || []) : null,
        typeof result.durationMs === "number" ? h("span", { class: "verdict-time", title: "How long the cast took" }, formatDuration(result.durationMs)) : null));
    if (problem) {
      u.append(text, problemDetails(result, opts));
    } else if (result.status === "failed") {
      var fail = firstFailure(result);
      if (fail) {
        text.appendChild(h("div", { class: "first-fail" },
          h("p", { class: "first-fail-name" }, h("span", { class: "x", "aria-hidden": "true" }, "✗ "), fail.name),
          fail.message ? h("p", { class: "first-fail-msg" }, codeText(fail.message)) : null,
          fail.line ? h("p", { class: "first-fail-line" }, "Look at ", lineButton(fail.line, opts), " of your spell.") : null));
      }
    }
    return el;
  }

  function outputSection(result, opts) {
    var text = result.stdout || "";
    var err = result.error || {};
    var body;
    if (text) {
      body = h("pre", { class: "pool-output", tabindex: "0", "aria-label": "What your spell printed" }, text);
    } else if (result.status === "error" && err.phase === "syntax") {
      body = h("p", { class: "pool-empty" }, "Nothing ran: Python must understand the whole spell before it runs any of it.");
    } else if (result.status === "timeout" || result.status === "internal-error") {
      body = h("p", { class: "pool-empty" }, "No output was kept from this cast.");
    } else {
      body = h("p", { class: "pool-empty" }, "(Your spell didn't print anything.)");
    }
    var inputs = (opts && opts.inputs) || [];
    return h("section", { class: "pool", "aria-label": "Scrying Pool: what your spell printed" },
      h("h3", { class: "result-heading" }, u.emoji("🔮"), " Scrying Pool",
        h("span", { class: "result-sub" }, result.status === "error" && text ? "printed before the error" : "what your spell printed")),
      body,
      result.truncated ? h("p", { class: "pool-note" }, "⚠️ The output was cut off: your spell printed far too much.") : null,
      inputs.length ? h("p", { class: "pool-inputs" }, "Answers given to ", h("code", { class: "inline-code" }, "input()"), ": ",
        inputs.map(function (value, i) { return [i ? " " : "", h("code", { class: "inline-code input-chip" }, String(value))]; })) : null);
  }

  function trialsSection(result, opts) {
    var tests = result.tests || [];
    var section = h("section", { class: "trials", "aria-label": "Trials" },
      h("h3", { class: "result-heading" }, u.emoji("⚖️"), " Trials",
        tests.length ? h("span", { class: "trial-count" }, result.passed + " / " + result.total + " passed") : null));
    if (!tests.length) {
      var why = "The trials will appear here after you cast.";
      if (result.status === "error") why = "The trials didn't run, because your spell stopped with an error. Fix it and cast again.";
      else if (result.status === "timeout") why = "The trials didn't run, because your spell was stopped.";
      else if (result.status === "internal-error") why = "The trials couldn't run this time.";
      section.appendChild(h("p", { class: "trials-empty" }, why));
      return section;
    }
    var list = h("ol", { class: "trial-list" });
    var first = firstFailure(result);
    tests.forEach(function (t) {
      var isFirst = t === first;
      // The first failure's message is already shown in the verdict card above.
      var showMessage = !t.passed && t.message && !(isFirst && result.status === "failed");
      list.appendChild(h("li", { class: "trial " + (t.passed ? "pass" : "fail") + (isFirst ? " first-fail" : "") },
        h("span", { class: "trial-mark", "aria-hidden": "true" }, t.passed ? "✓" : "✗"),
        h("div", { class: "trial-body" },
          h("p", { class: "trial-name" }, h("span", { class: "sr-only" }, t.passed ? "Passed: " : "Failed: "), t.name),
          showMessage ? h("p", { class: "trial-msg" }, codeText(t.message)) : null,
          !t.passed && t.line && !isFirst ? h("p", { class: "trial-line" }, "See ", lineButton(t.line, opts), ".") : null)));
    });
    section.appendChild(list);
    return section;
  }

  function render(container, result, opts) {
    opts = opts || {};
    u.clear(container);
    if (!result || typeof result !== "object") {
      result = { status: "internal-error", stdout: "", tests: [], passed: 0, total: 0, error: { type: "InternalError", friendly: "No result came back from Python." } };
    }
    container.setAttribute("data-status", result.status);
    container.appendChild(verdict(result, opts));
    container.appendChild(outputSection(result, opts));
    if (opts.trials !== false) container.appendChild(trialsSection(result, opts));
  }

  function casting(container, label) {
    u.clear(container);
    container.setAttribute("data-status", "casting");
    container.appendChild(h("div", { class: "verdict verdict-casting" },
      h("span", { class: "casting-orb", "aria-hidden": "true" }),
      h("div", { class: "verdict-text" },
        h("p", { class: "verdict-headline" }, label || "Casting your spell…"),
        h("p", { class: "verdict-detail" }, "Python is running your code, then the trials check it."))));
  }

  function idle(container, text) {
    u.clear(container);
    container.setAttribute("data-status", "idle");
    container.appendChild(h("div", { class: "results-idle" },
      h("span", { class: "idle-icon", "aria-hidden": "true" }, "🔮"),
      h("p", null, text || "Cast your spell to see what happens. The Scrying Pool shows what it prints, and the Trials show whether it worked.")));
  }

  function announcement(result) {
    if (!result) return "";
    var s = summary(result);
    var plain = function (t) { return UI.rich.plainText(String(t || "")); };
    if (result.status === "failed") {
      var fail = firstFailure(result);
      return s.headline + ". " + (fail ? "First failed trial: " + fail.name + ". " + plain(fail.message) : "");
    }
    if (isProblem(result.status)) {
      var err = result.error || {};
      return s.headline + ". " + s.detail + " " + plain(err.friendly || err.message);
    }
    return s.headline + ". " + s.detail;
  }

  UI.results = {
    render: render,
    casting: casting,
    idle: idle,
    summary: summary,
    announcement: announcement,
    firstFailure: firstFailure
  };
})(typeof window !== "undefined" ? window : globalThis);
