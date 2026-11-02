/*
 * The Cardiac Case Files — answer widgets for each step type (CCF.UI.steps). Format: DESIGN §6.3.
 *
 *   var w = CCF.UI.steps.widget(kase, step, { onChange })
 *   w.el                 the answer UI                 w.checkLabel / w.instructions
 *   w.evaluate()         → { status: "empty" | "invalid" | "correct" | "wrong", key, detail, message }
 *   w.markWrong(result)  marks the wrong choice(s) and keeps their feedback next to them
 *   w.restoreWrong(keys) re-applies saved wrong attempts (resume)
 *   w.solve(how)         locks in the correct answer ("answered" | "shown")
 *   w.solvedDetail()     feedback for the correct answer (e.g. the right option's "why")
 *   w.focusFirst()
 *
 * Options are shuffled deterministically per case + step (CCF.UI.util.shuffledIndices) unless
 * the step sets keepOrder. Keys saved for resuming are the options' ORIGINAL indices (or the
 * numbers typed, for numeric steps), so a reload shows the same marks.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
  var u = UI.util;
  var h = u.h;
  var R = function () { return UI.rich; };

  var LETTERS = "ABCDEFGH";
  var EPS = 1e-9;

  function seedFor(kase, step) { return (kase && kase.id) + ":" + (step && step.id); }

  function orderFor(kase, step, n) {
    if (step.keepOrder) {
      var idx = [];
      for (var i = 0; i < n; i++) idx.push(i);
      return idx;
    }
    return u.shuffledIndices(n, seedFor(kase, step));
  }

  function mark(kind) {
    return h("span", { class: "choice-mark mark-" + kind, "aria-hidden": "true" }, u.icon(kind === "right" ? "correct" : "wrong"));
  }

  // ------------------------------------------------------------------------------------
  // single / test / multi
  // ------------------------------------------------------------------------------------

  function choiceWidget(kase, step, opts) {
    var multi = step.type === "multi";
    var options = step.options || [];
    var order = orderFor(kase, step, options.length);
    var name = u.uid("choice");
    var inputs = [];   // by original index
    var labels = [];
    var whys = [];
    var legend = h("legend", { class: "sr-only" }, multi ? "Select all that apply" : "Choose one answer");
    var list = h("div", { class: "choices" + (multi ? " choices-multi" : "") });
    order.forEach(function (orig, pos) {
      var o = options[orig];
      var id = u.uid("opt");
      var input = h("input", { type: multi ? "checkbox" : "radio", name: name, id: id, value: String(orig), class: "choice-input" });
      input.addEventListener("change", function () {
        if (!multi) labels.forEach(function (l) { if (l) l.classList.toggle("is-selected", l.querySelector("input").checked); });
        else labels[orig].classList.toggle("is-selected", input.checked);
        if (opts.onChange) opts.onChange();
      });
      var why = h("p", { class: "choice-why", hidden: true });
      var label = h("label", { class: "choice", for: id, dataset: { index: String(orig) } },
        input,
        h("span", { class: "choice-key", "aria-hidden": "true" }, multi ? "" : LETTERS[pos]),
        h("span", { class: "choice-main" },
          h("span", { class: "choice-text" }, R().inline(o.text)),
          why),
        h("span", { class: "choice-state" }));
      inputs[orig] = input;
      labels[orig] = label;
      whys[orig] = why;
      list.appendChild(label);
    });
    var el = h("fieldset", { class: "answer answer-choices" }, legend, list);

    function selected() {
      var out = [];
      inputs.forEach(function (inp, i) { if (inp && inp.checked && !inp.disabled) out.push(i); });
      return out;
    }

    function setState(orig, kind, showWhy, srText) {
      var label = labels[orig];
      if (!label) return;
      label.classList.remove("is-selected");
      label.classList.add(kind === "right" ? "is-correct" : "is-wrong");
      var state = label.querySelector(".choice-state");
      u.clear(state);
      state.appendChild(mark(kind));
      state.appendChild(h("span", { class: "sr-only" }, srText || (kind === "right" ? " (correct)" : " (incorrect)")));
      if (showWhy && options[orig].why) {
        u.clear(whys[orig]);
        whys[orig].appendChild(R().inline(options[orig].why));
        whys[orig].hidden = false;
      }
    }

    function markWrongIndex(orig) {
      if (!inputs[orig]) return;
      inputs[orig].checked = false;
      inputs[orig].disabled = true;
      setState(orig, "wrong", true);
    }

    function whyDetail(orig) {
      var o = options[orig];
      return o && o.why ? h("p", null, R().inline(o.why)) : null;
    }

    return {
      el: el,
      type: step.type,
      checkLabel: step.type === "test" ? "Order this test" : "Check answer",
      instructions: multi ? "Select all that apply." : step.type === "test" ? "Choose the test." : "Choose one answer.",
      evaluate: function () {
        var sel = selected();
        if (!sel.length) return { status: "empty", message: multi ? "Select at least one answer first." : step.type === "test" ? "Choose a test first." : "Choose an answer first." };
        if (!multi) {
          var orig = sel[0];
          if (options[orig].correct) return { status: "correct", key: orig, detail: whyDetail(orig) };
          return { status: "wrong", key: orig, detail: whyDetail(orig) };
        }
        var wrongPicks = sel.filter(function (i) { return !options[i].correct; });
        var missing = options.filter(function (o, i) { return o.correct && sel.indexOf(i) < 0; }).length;
        if (!wrongPicks.length && !missing) return { status: "correct", key: sel };
        var detail = h("div", null,
          wrongPicks.length ? h("ul", { class: "feedback-list" }, wrongPicks.map(function (i) {
            return h("li", null, h("strong", null, R().inline(options[i].text)), " — ", R().inline(options[i].why || "doesn't belong here."));
          })) : null,
          missing ? h("p", null, wrongPicks.length
            ? "And at least one more choice belongs on your list."
            : "Everything you chose belongs — but at least one more choice does too.") : null);
        return { status: "wrong", key: wrongPicks, detail: detail };
      },
      markWrong: function (result) {
        if (multi) (result.key || []).forEach(markWrongIndex);
        else markWrongIndex(result.key);
      },
      restoreWrong: function (keys) {
        (keys || []).forEach(function (k) { if (typeof k === "number" && options[k] && !options[k].correct) markWrongIndex(k); });
      },
      solve: function () {
        options.forEach(function (o, i) {
          inputs[i].disabled = true;
          if (o.correct) {
            inputs[i].checked = true;
            setState(i, "right", multi);
          } else {
            inputs[i].checked = false;
            if (multi) setState(i, "wrong", true, " (doesn't belong)");
            else if (!labels[i].classList.contains("is-wrong")) labels[i].classList.add("is-dimmed");
          }
        });
        el.classList.add("is-solved");
      },
      solvedDetail: function () {
        if (multi) return null;
        var right = options.map(function (o, i) { return o.correct ? i : -1; }).filter(function (i) { return i >= 0; })[0];
        return right === undefined ? null : whyDetail(right);
      },
      correctText: function () {
        return options.filter(function (o) { return o.correct; }).map(function (o) { return R().plainInline(o.text); }).join("; ");
      },
      focusFirst: function () {
        var first = inputs.filter(function (i) { return i && !i.disabled; });
        var byPos = order.map(function (orig) { return inputs[orig]; }).filter(function (i) { return i && !i.disabled; });
        u.focusEl(byPos[0] || first[0], { preventScroll: true });
      }
    };
  }

  // ------------------------------------------------------------------------------------
  // numeric
  // ------------------------------------------------------------------------------------

  /** The first number in a string ("0,85", ".85", "5 L/min") or null. */
  function parseNumber(text) {
    var t = String(text || "").trim().replace(/\s+/g, "").replace(/−/g, "-");
    if (/^[-+]?\d+,\d+$/.test(t)) t = t.replace(",", ".");
    t = t.replace(/,/g, "");
    var m = /^[-+]?(\d+(\.\d*)?|\.\d+)/.exec(t);
    if (!m) return null;
    var v = parseFloat(m[0]);
    return isFinite(v) ? v : null;
  }

  function formatNumber(v) {
    if (typeof v !== "number" || !isFinite(v)) return String(v);
    var r = Math.round(v * 1000) / 1000;
    return String(r);
  }

  function numericWidget(kase, step, opts) {
    var id = u.uid("num");
    var unitId = id + "-unit";
    var input = h("input", {
      type: "text", id: id, class: "input numeric-input", inputmode: "decimal", autocomplete: "off", spellcheck: "false",
      "aria-describedby": step.unit ? unitId : null
    });
    input.addEventListener("input", function () { if (opts.onChange) opts.onChange(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); if (opts.onSubmit) opts.onSubmit(); }
    });
    var tries = h("ul", { class: "numeric-tries", "aria-label": "Answers you've tried" });
    var result = h("p", { class: "numeric-result", hidden: true });
    var el = h("div", { class: "answer answer-numeric" },
      h("label", { class: "field-label", for: id }, "Your answer"),
      h("div", { class: "numeric-row" }, input, step.unit ? h("span", { class: "numeric-unit", id: unitId }, step.unit) : null),
      tries, result);

    function addTry(v) {
      tries.appendChild(h("li", { class: "numeric-try" }, mark("wrong"), " ", formatNumber(v), step.unit ? " " + step.unit : "", h("span", { class: "sr-only" }, " (incorrect)")));
    }

    return {
      el: el,
      type: "numeric",
      checkLabel: "Check answer",
      instructions: "Type a number" + (step.unit ? " (in " + step.unit + ")" : "") + ".",
      evaluate: function () {
        var raw = input.value;
        if (!String(raw).trim()) return { status: "empty", message: "Type a number first." };
        var v = parseNumber(raw);
        if (v === null) return { status: "invalid", message: "That doesn't look like a number. Type digits only, like 5.2." };
        var tol = typeof step.tolerance === "number" ? step.tolerance : 0;
        if (Math.abs(v - step.answer) <= tol + EPS) return { status: "correct", key: v };
        var trap = (step.traps || []).filter(function (t) { return Math.abs(v - t.value) <= (t.tolerance || 0) + EPS; })[0];
        if (trap) return { status: "wrong", key: v, detail: h("p", null, R().inline(trap.why)) };
        return { status: "wrong", key: v, detail: h("p", null, "That's not it. Check which numbers from the chart you used, then work through the calculation again.") };
      },
      markWrong: function (res) {
        addTry(res.key);
        input.select && u.safe(function () { input.select(); });
      },
      restoreWrong: function (keys) {
        (keys || []).forEach(function (k) { if (typeof k === "number") addTry(k); });
      },
      solve: function (how) {
        input.disabled = true;
        if (how === "shown" || parseNumber(input.value) === null) input.value = formatNumber(step.answer);
        result.hidden = false;
        u.clear(result);
        result.appendChild(mark("right"));
        result.appendChild(document.createTextNode(" Answer: " + formatNumber(step.answer) + (step.unit ? " " + step.unit : "") +
          (step.tolerance ? " (anything within ±" + formatNumber(step.tolerance) + " counts)" : "")));
        el.classList.add("is-solved");
      },
      solvedDetail: function () { return null; },
      correctText: function () { return formatNumber(step.answer) + (step.unit ? " " + step.unit : ""); },
      focusFirst: function () { u.focusEl(input, { preventScroll: true }); }
    };
  }

  // ------------------------------------------------------------------------------------
  // classify
  // ------------------------------------------------------------------------------------

  function classifyWidget(kase, step, opts) {
    var items = step.items || [];
    var cats = step.categories || [];
    var order = orderFor(kase, step, items.length);
    var groups = [];   // by original index: [inputs...]
    var rows = [];
    var whys = [];
    var list = h("div", { class: "sort-list" });
    order.forEach(function (orig) {
      var it = items[orig];
      var name = u.uid("sort");
      var radios = cats.map(function (c, ci) {
        var id = u.uid("sortopt");
        var input = h("input", { type: "radio", name: name, id: id, value: String(ci), class: "sort-input" });
        input.addEventListener("change", function () {
          row.classList.add("is-sorted");
          if (opts.onChange) opts.onChange();
        });
        return { input: input, label: h("label", { class: "sort-option", for: id }, input, h("span", null, R().inline(c))) };
      });
      var why = h("p", { class: "sort-why", hidden: true });
      var state = h("span", { class: "sort-state" });
      var row = h("fieldset", { class: "sort-item", dataset: { index: String(orig) } },
        h("legend", { class: "sort-text" }, R().inline(it.text)),
        h("div", { class: "sort-options" }, radios.map(function (r) { return r.label; })),
        state, why);
      groups[orig] = radios.map(function (r) { return r.input; });
      rows[orig] = row;
      whys[orig] = why;
      list.appendChild(row);
    });
    var legendText = cats.map(function (c) { return R().plainInline(c); }).join(" or ");
    var el = h("div", { class: "answer answer-classify", role: "group", "aria-label": "Sort each item: " + legendText },
      h("p", { class: "sort-key", "aria-hidden": "true" }, cats.map(function (c, i) { return h("span", { class: "sort-key-item cat-" + i }, R().inline(c)); })),
      list);

    function chosen(orig) {
      var g = groups[orig];
      for (var i = 0; i < g.length; i++) if (g[i].checked) return i;
      return -1;
    }

    return {
      el: el,
      type: "classify",
      checkLabel: "Check answer",
      instructions: "Sort each item into its group.",
      evaluate: function () {
        var left = items.filter(function (it, i) { return chosen(i) < 0; }).length;
        if (left) return { status: "empty", message: "Sort every item first — " + u.plural(left, "item") + " to go." };
        var right = items.filter(function (it, i) { return chosen(i) === it.category; }).length;
        if (right === items.length) return { status: "correct" };
        return {
          status: "wrong",
          detail: h("p", null, h("strong", null, right + " of " + items.length), " are in the right group. Look again at the ones you were least sure about.")
        };
      },
      markWrong: function () {},
      restoreWrong: function () {},
      solve: function () {
        items.forEach(function (it, i) {
          groups[i].forEach(function (inp, ci) { inp.checked = ci === it.category; inp.disabled = true; });
          rows[i].classList.add("is-correct");
          var state = rows[i].querySelector(".sort-state");
          u.clear(state);
          state.appendChild(mark("right"));
          state.appendChild(h("span", { class: "sr-only" }, " Goes with " + R().plainInline(cats[it.category]) + "."));
          if (it.why) { u.clear(whys[i]); whys[i].appendChild(R().inline(it.why)); whys[i].hidden = false; }
        });
        el.classList.add("is-solved");
      },
      solvedDetail: function () { return null; },
      correctText: function () {
        return items.map(function (it) { return R().plainInline(it.text) + " → " + R().plainInline(cats[it.category]); }).join("; ");
      },
      focusFirst: function () {
        var firstOrig = order[0];
        if (firstOrig !== undefined) u.focusEl(groups[firstOrig][0], { preventScroll: true });
      }
    };
  }

  // ------------------------------------------------------------------------------------
  // order
  // ------------------------------------------------------------------------------------

  function orderWidget(kase, step, opts) {
    var items = step.items || [];
    var n = items.length;
    var current = u.shuffledIndices(n, seedFor(kase, step));
    var identity = current.every(function (v, i) { return v === i; });
    if (identity && n > 1) current.push(current.shift());
    var solved = false;
    var live = h("p", { class: "sr-only", "aria-live": "polite" });
    var list = h("ol", { class: "order-list" });
    var el = h("div", { class: "answer answer-order" },
      h("p", { class: "order-help" }, "Use the arrows to move each item. First at the top."),
      list, live);

    function render(focus) {
      u.clear(list);
      current.forEach(function (orig, pos) {
        var text = R().plainInline(items[orig]);
        var up = h("button", { type: "button", class: "order-btn order-up", "aria-label": "Move “" + text + "” up", disabled: solved || pos === 0 }, h("span", { "aria-hidden": "true" }, "▲"));
        var down = h("button", { type: "button", class: "order-btn order-down", "aria-label": "Move “" + text + "” down", disabled: solved || pos === n - 1 }, h("span", { "aria-hidden": "true" }, "▼"));
        up.addEventListener("click", function () { move(pos, -1, "up"); });
        down.addEventListener("click", function () { move(pos, 1, "down"); });
        var li = h("li", { class: "order-item" + (solved ? " is-correct" : ""), dataset: { index: String(orig) } },
          h("span", { class: "order-pos", "aria-hidden": "true" }, String(pos + 1)),
          h("span", { class: "order-text" }, R().inline(items[orig])),
          solved ? h("span", { class: "order-state" }, mark("right")) : h("span", { class: "order-btns" }, up, down));
        list.appendChild(li);
        if (focus && focus.orig === orig) {
          var target = focus.dir === "up" ? (pos === 0 ? down : up) : (pos === n - 1 ? up : down);
          setTimeout(function () { u.focusEl(target, { preventScroll: true }); }, 0);
        }
      });
    }

    function move(pos, delta, dir) {
      var to = pos + delta;
      if (to < 0 || to >= n) return;
      var orig = current[pos];
      current[pos] = current[to];
      current[to] = orig;
      render({ orig: orig, dir: dir });
      live.textContent = "“" + R().plainInline(items[orig]) + "” is now number " + (to + 1) + " of " + n + ".";
      UI.sound.play("click");
      if (opts.onChange) opts.onChange();
    }

    render();
    return {
      el: el,
      type: "order",
      checkLabel: "Check the order",
      instructions: "Put the items in order.",
      evaluate: function () {
        var right = current.filter(function (orig, pos) { return orig === pos; }).length;
        if (right === n) return { status: "correct" };
        return { status: "wrong", detail: h("p", null, h("strong", null, right + " of " + n), " are in the right place. Start from the first item and think about what has to happen before what.") };
      },
      markWrong: function () {},
      restoreWrong: function () {},
      solve: function () {
        current = items.map(function (it, i) { return i; });
        solved = true;
        render();
        el.classList.add("is-solved");
      },
      solvedDetail: function () { return null; },
      correctText: function () { return items.map(function (t, i) { return (i + 1) + ". " + R().plainInline(t); }).join("; "); },
      focusFirst: function () { var b = list.querySelector("button:not([disabled])"); if (b) u.focusEl(b, { preventScroll: true }); }
    };
  }

  function widget(kase, step, opts) {
    opts = opts || {};
    switch (step.type) {
      case "single":
      case "test":
      case "multi":
        return choiceWidget(kase, step, opts);
      case "numeric":
        return numericWidget(kase, step, opts);
      case "classify":
        return classifyWidget(kase, step, opts);
      case "order":
        return orderWidget(kase, step, opts);
      default:
        return null;
    }
  }

  var TYPE_LABELS = {
    single: "Choose one", multi: "Select all that apply", test: "Choose a test",
    numeric: "Calculate", classify: "Sort them", order: "Put in order"
  };

  UI.steps = { widget: widget, parseNumber: parseNumber, formatNumber: formatNumber, TYPE_LABELS: TYPE_LABELS, seedFor: seedFor };
})(typeof window !== "undefined" ? window : globalThis);
