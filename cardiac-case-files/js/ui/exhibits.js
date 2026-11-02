/*
 * The Cardiac Case Files — the chart's building blocks (CCF.UI.exhibits).
 *
 *   render(exhibit, { isNew, compact })  → <article> for an ecg / labs / table / report / note / diagram exhibit
 *   sealedCard()                          → a "Not yet ordered" envelope (never shows the sealed title)
 *   ecgFigure(spec, opts)                 → CCF.ECG.render(spec) + a "Describe this strip" toggle
 *                                           (a neutral placeholder when CCF.ECG is missing)
 *   vitalsPanel(readings, { newIndex })   → the vital-sign tiles (latest values + earlier ones)
 *   vitalsLine(vitals)                    → "HR 104 bpm · BP 162/94 mmHg · …" for an update banner
 *   medsList(meds, allergies, opts)       → the medication list (+ Casebook look-ups)
 *   drugEntryFor(name)                    → the Casebook drug entry that names this medication, or null
 *
 * Vitals are shown as given, with units, and never flagged as abnormal (spotting that is
 * the player's job); lab rows carry their own flag.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
  var u = UI.util;
  var h = u.h;
  var R = function () { return UI.rich; };

  var TYPE_LABELS = { ecg: "Rhythm strip", labs: "Lab results", table: "Table", report: "Report", note: "Note", diagram: "Diagram" };

  var VITALS = [
    { key: "hr", short: "HR", label: "Heart rate", unit: "bpm" },
    { key: "bp", short: "BP", label: "Blood pressure", unit: "mmHg" },
    { key: "rr", short: "RR", label: "Respiratory rate", unit: "breaths/min" },
    { key: "spo2", short: "SpO₂", label: "Oxygen saturation", unit: "%" },
    { key: "temp", short: "Temp", label: "Temperature", unit: "" },
    { key: "pain", short: "Pain", label: "Pain", unit: "" },
    { key: "rpe", short: "RPE", label: "Rating of perceived exertion (Borg 6–20)", unit: "" },
    { key: "weight", short: "Weight", label: "Weight", unit: "" },
    { key: "rhythm", short: "Rhythm", label: "Pulse rhythm", unit: "" }
  ];

  function typeLabel(type) { return TYPE_LABELS[type] || "Exhibit"; }

  /** A vital's value as shown: numbers (and bare numbers in text) get their unit. */
  function formatVital(key, value) {
    if (value === null || value === undefined || value === "") return "";
    var def = VITALS.filter(function (v) { return v.key === key; })[0];
    var text = String(value).trim();
    var unit = def ? def.unit : "";
    if (!unit) return text;
    var bare = key === "bp" ? /^\d{2,3}\s*\/\s*\d{2,3}$/.test(text) : /^\d+(\.\d+)?$/.test(text);
    if (!bare) return text;
    return unit === "%" ? text + "%" : text + " " + unit;
  }

  // ------------------------------------------------------------------------------------
  // "Describe this …" toggles (text alternatives that sighted players can open too)
  // ------------------------------------------------------------------------------------

  function describeToggle(text, label) {
    if (!text) return null;
    var id = u.uid("describe");
    var panel = h("div", { class: "describe-text", id: id, hidden: true }, h("p", null, R().inline(text)));
    var btn = h("button", { type: "button", class: "describe-btn", "aria-expanded": "false", "aria-controls": id },
      u.icon("describe", { className: "btn-icon" }), h("span", { class: "btn-label" }, label || "Describe this strip"));
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      panel.hidden = !open;
    });
    return h("div", { class: "describe" }, btn, panel);
  }

  function ecgText(spec) {
    if (spec && typeof spec.describe === "string" && spec.describe.trim()) return spec.describe;
    if (CCF.ECG && CCF.ECG.describe) {
      var t = u.safe(function () { return CCF.ECG.describe(spec); }, "");
      if (t) return String(t);
    }
    return "";
  }

  /** A pink-paper placeholder when the ECG module is missing (never names the rhythm). */
  function ecgPlaceholder(spec) {
    return h("figure", { class: "ecg ecg-placeholder" },
      h("div", { class: "ecg-placeholder-paper", "aria-hidden": "true" }),
      h("figcaption", null,
        h("strong", null, "Rhythm strip" + (spec && spec.lead ? " · lead " + spec.lead : "")), " — ",
        "this strip can't be drawn right now. ", ecgText(spec) ? "Use “Describe this strip” below." : ""));
  }

  /** CCF.ECG.render(spec) with a describe toggle; opts: { width, compact, describeLabel }. */
  function ecgFigure(spec, opts) {
    opts = opts || {};
    var fig = null;
    if (CCF.ECG && CCF.ECG.render) {
      fig = u.safe(function () { return CCF.ECG.render(spec, { width: opts.width, compact: opts.compact }); }, null);
    }
    if (!fig || typeof fig.nodeType !== "number") fig = ecgPlaceholder(spec);
    return h("div", { class: "ecg-wrap" }, h("div", { class: "ecg-scroll" }, fig), describeToggle(ecgText(spec), opts.describeLabel || "Describe this strip"));
  }

  // ------------------------------------------------------------------------------------
  // Exhibits
  // ------------------------------------------------------------------------------------

  function labsTable(x) {
    var rows = (x.rows || []).map(function (r) {
      var flag = r.flag === "high" ? { text: "High", mark: "▲" } : r.flag === "low" ? { text: "Low", mark: "▼" } : null;
      return h("tr", { class: flag ? "flag-" + r.flag : null },
        h("th", { scope: "row" }, R().inline(r.name)),
        h("td", { class: "lab-value" }, String(r.value === undefined ? "" : r.value), r.unit ? h("span", { class: "lab-unit" }, " " + r.unit) : null),
        h("td", { class: "lab-ref" }, r.ref ? String(r.ref) : "—"),
        h("td", { class: "lab-flag" }, flag ? h("span", { class: "flag flag-" + r.flag }, h("span", { "aria-hidden": "true" }, flag.mark + " "), flag.text) : h("span", { class: "flag-none" }, "")));
    });
    var t = h("table", { class: "rt-table labs-table" },
      h("caption", { class: "sr-only" }, x.title || "Lab results"),
      h("thead", null, h("tr", null,
        h("th", { scope: "col" }, "Test"), h("th", { scope: "col" }, "Result"),
        h("th", { scope: "col" }, "Reference"), h("th", { scope: "col" }, "Flag"))),
      h("tbody", null, rows));
    return h("div", { class: "table-wrap", role: "region", tabindex: "0", "aria-label": x.title || "Lab results" }, t);
  }

  function exhibitBody(x, opts) {
    switch (x.type) {
      case "ecg":
        return ecgFigure(x, { compact: opts.compact });
      case "labs":
        return [labsTable(x), x.note ? R().block(x.note, "exhibit-note") : null];
      case "table":
        return [R().table(x.head, x.rows, { caption: x.title }), x.note ? R().block(x.note, "exhibit-note") : null];
      case "report":
        return h("div", { class: "report-sheet" },
          h("p", { class: "report-letterhead", "aria-hidden": "true" }, u.CENTER),
          R().block(x.text, "report-text"));
      case "note":
        return h("div", { class: "note-sheet" },
          R().block(x.text, "note-text"),
          x.author ? h("p", { class: "note-author" }, "— ", R().inline(x.author)) : null);
      case "diagram":
        return [UI.diagrams ? UI.diagrams.render(x) : h("p", null, "This drawing isn't available."),
          UI.diagrams ? describeToggle(UI.diagrams.describe(x.name, x.labels), "Describe this diagram") : null];
      default:
        return h("p", null, "This exhibit can't be shown.");
    }
  }

  /** opts: { isNew, compact, id } */
  function render(x, opts) {
    opts = opts || {};
    if (!x) return null;
    var titleId = u.uid("exhibit");
    var el = h("article", {
      class: "exhibit exhibit-" + (x.type || "unknown") + (opts.isNew ? " is-new" : ""),
      "aria-labelledby": titleId,
      dataset: { exhibit: x.id || "" },
      id: opts.id || null
    },
      h("header", { class: "exhibit-head" },
        h("span", { class: "exhibit-icon", "aria-hidden": "true" }, u.icon(CCF.Icons ? CCF.Icons.exhibit(x.type) : null)),
        h("div", { class: "exhibit-titles" },
          h("p", { class: "exhibit-type" }, typeLabel(x.type)),
          h("h4", { class: "exhibit-title", id: titleId }, R().inline(x.title || typeLabel(x.type)))),
        opts.isNew ? h("span", { class: "new-flag" }, "New") : null),
      h("div", { class: "exhibit-body" }, u.safe(function () { return exhibitBody(x, opts); }, h("p", null, "This exhibit can't be shown."))),
      x.caption ? h("p", { class: "exhibit-caption" }, R().inline(x.caption)) : null);
    return el;
  }

  /** A sealed result: an envelope that says it hasn't been ordered — its title stays hidden. */
  function sealedCard() {
    return h("article", { class: "exhibit exhibit-sealed", "aria-label": "Sealed result: not yet ordered" },
      h("span", { class: "sealed-icon", "aria-hidden": "true" }, u.icon("sealed")),
      h("div", null,
        h("p", { class: "sealed-title" }, "Not yet ordered"),
        h("p", { class: "sealed-help" }, "A result waits here, sealed. Choosing the right test opens it.")));
  }

  // ------------------------------------------------------------------------------------
  // Vitals
  // ------------------------------------------------------------------------------------

  function keysIn(readings) {
    var keys = [];
    VITALS.forEach(function (def) {
      if (readings.some(function (r) { return r.vitals && r.vitals[def.key] !== undefined && r.vitals[def.key] !== ""; })) keys.push(def.key);
    });
    return keys;
  }

  function otherLabels(readings) {
    var labels = [];
    readings.forEach(function (r) {
      ((r.vitals && r.vitals.other) || []).forEach(function (o) {
        if (o && o.label && labels.indexOf(o.label) < 0) labels.push(o.label);
      });
    });
    return labels;
  }

  function otherValue(vitals, label) {
    var found = ((vitals && vitals.other) || []).filter(function (o) { return o && o.label === label; })[0];
    return found ? found.value : undefined;
  }

  /**
   * readings: [{ label, vitals }] oldest first. opts.newIndex: the reading added by the current
   * step's update (its tiles get a "New" flag). Every tile shows the latest value; changed values
   * keep their earlier readings underneath.
   */
  function vitalsPanel(readings, opts) {
    opts = opts || {};
    readings = (readings || []).filter(function (r) { return r && r.vitals; });
    if (!readings.length) return h("p", { class: "muted" }, "No vital signs recorded.");
    var last = readings.length - 1;
    var tiles = [];

    function tile(label, full, values) {
      // values: [{ value, index }] for the readings that include this vital.
      var latest = values[values.length - 1];
      var isNew = opts.newIndex !== undefined && opts.newIndex !== null && latest.index === opts.newIndex && opts.newIndex > 0;
      var earlier = values.slice(0, -1);
      var stale = latest.index !== last;
      return h("div", { class: "vital" + (isNew ? " is-new" : "") },
        h("dt", { class: "vital-label" }, h("abbr", { title: full }, label), isNew ? h("span", { class: "new-flag" }, "New") : null),
        h("dd", { class: "vital-value" }, latest.text),
        earlier.length ? h("dd", { class: "vital-trail" },
          h("span", { class: "sr-only" }, "Earlier: "),
          earlier.map(function (e, i) {
            return [i ? h("span", { class: "trail-sep", "aria-hidden": "true" }, " → ") : null,
              h("span", { class: "trail-value", title: readings[e.index].label }, e.text)];
          }), h("span", { class: "trail-sep", "aria-hidden": "true" }, " → now")) : null,
        stale && readings.length > 1 ? h("dd", { class: "vital-when" }, readings[latest.index].label) : null);
    }

    keysIn(readings).forEach(function (key) {
      var def = VITALS.filter(function (v) { return v.key === key; })[0];
      var values = [];
      readings.forEach(function (r, i) {
        var v = r.vitals[key];
        if (v === undefined || v === null || v === "") return;
        var text = formatVital(key, v);
        if (values.length && values[values.length - 1].text === text) { values[values.length - 1].index = i; return; }
        values.push({ text: text, index: i });
      });
      if (values.length) tiles.push(tile(def.short, def.label, values));
    });
    otherLabels(readings).forEach(function (label) {
      var values = [];
      readings.forEach(function (r, i) {
        var v = otherValue(r.vitals, label);
        if (v === undefined || v === null || v === "") return;
        var text = String(v);
        if (values.length && values[values.length - 1].text === text) { values[values.length - 1].index = i; return; }
        values.push({ text: text, index: i });
      });
      if (values.length) tiles.push(tile(label, label, values));
    });

    var head = h("p", { class: "vitals-now" },
      h("span", { class: "vitals-now-label" }, readings.length > 1 ? "Latest" : "Vital signs"),
      readings.length > 1 ? [" · ", h("span", { class: "vitals-now-when" }, readings[last].label)] : null);
    var out = [head, h("dl", { class: "vitals-grid" }, tiles)];
    if (readings.length > 1) {
      out.push(h("details", { class: "vitals-log" },
        h("summary", null, "All readings (" + readings.length + ")"),
        h("ol", { class: "vitals-log-list" }, readings.map(function (r) {
          return h("li", null, h("span", { class: "vitals-log-when" }, r.label), h("span", { class: "vitals-log-values" }, vitalsLine(r.vitals)));
        }))));
    }
    return h("div", { class: "vitals-panel" }, out);
  }

  /** A compact one-line version: "HR 104 bpm · BP 162/94 mmHg · …". */
  function vitalsLine(vitals) {
    if (!vitals) return "";
    var parts = [];
    VITALS.forEach(function (def) {
      var v = vitals[def.key];
      if (v === undefined || v === null || v === "") return;
      parts.push(def.short + " " + formatVital(def.key, v));
    });
    (vitals.other || []).forEach(function (o) {
      if (o && o.label) parts.push(o.label + " " + o.value);
    });
    return parts.join(" · ");
  }

  /** Small vital chips for an update banner. */
  function vitalsChips(vitals) {
    if (!vitals) return null;
    var chips = [];
    VITALS.forEach(function (def) {
      var v = vitals[def.key];
      if (v === undefined || v === null || v === "") return;
      chips.push(h("li", { class: "vchip" }, h("abbr", { class: "vchip-label", title: def.label }, def.short), " ", h("span", { class: "vchip-value" }, formatVital(def.key, v))));
    });
    (vitals.other || []).forEach(function (o) {
      if (o && o.label) chips.push(h("li", { class: "vchip" }, h("span", { class: "vchip-label" }, o.label), " ", h("span", { class: "vchip-value" }, String(o.value))));
    });
    return chips.length ? h("ul", { class: "vchips", "aria-label": "New vital signs" }, chips) : null;
  }

  // ------------------------------------------------------------------------------------
  // Medications
  // ------------------------------------------------------------------------------------

  function words(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
  }

  /** The Casebook drug entry whose title or "aka" names this medication. */
  function drugEntryFor(name) {
    var c = u.content();
    if (!c) return null;
    var w = words(name);
    var full = " " + w.join(" ") + " ";
    var list = u.safe(function () { return c.entries("drug"); }, []) || [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      var terms = (e.aka || []).concat([e.title]);
      for (var j = 0; j < terms.length; j++) {
        var t = words(terms[j]).join(" ");
        if (t && t.length > 2 && full.indexOf(" " + t + " ") >= 0) return e;
      }
    }
    return null;
  }

  /** opts: { onLookup(entry) } — shows a "Look it up" button when the Casebook has the drug. */
  function medsList(meds, allergies, opts) {
    opts = opts || {};
    var items = (meds || []).map(function (m) {
      var entry = opts.onLookup ? drugEntryFor(m.name) : null;
      return h("li", { class: "med" },
        h("span", { class: "med-icon", "aria-hidden": "true" }, u.icon("pill")),
        h("div", { class: "med-text" },
          h("p", { class: "med-name" }, R().inline(m.name)),
          m.dose ? h("p", { class: "med-dose" }, R().inline(m.dose)) : null,
          m["class"] ? h("p", { class: "med-class" }, h("span", { class: "sr-only" }, "Drug class: "), R().inline(m["class"])) : null),
        entry ? u.button("Look up", {
          kind: "ghost", size: "xs", icon: "casebook", class: "med-lookup",
          ariaLabel: "Look up " + R().plainInline(m.name) + " in the Casebook",
          onClick: function () { opts.onLookup(entry); }
        }) : null);
    });
    return h("div", { class: "meds" },
      items.length ? h("ul", { class: "med-list" }, items) : h("p", { class: "muted" }, "No current medications."),
      allergies ? h("p", { class: "allergies" }, h("strong", null, "Allergies: "), R().inline(allergies)) : null);
  }

  UI.exhibits = {
    render: render,
    sealedCard: sealedCard,
    ecgFigure: ecgFigure,
    ecgText: ecgText,
    describeToggle: describeToggle,
    typeLabel: typeLabel,
    VITALS: VITALS,
    formatVital: formatVital,
    vitalsPanel: vitalsPanel,
    vitalsLine: vitalsLine,
    vitalsChips: vitalsChips,
    medsList: medsList,
    drugEntryFor: drugEntryFor
  };
})(typeof window !== "undefined" ? window : globalThis);
