/*
 * The Cardiac Case Files — content registry (CCF.content).
 *
 * Content files call CCF.defineCase / CCF.defineEntry / CCF.defineStory; this file
 * defines the six units and the characters, validates everything as it is defined, and
 * keeps the lists the UI reads. The format is documented in docs/DESIGN.md §6.
 *
 * A case or entry with errors is NOT registered (a missing case is better than a broken
 * screen); the problems are kept in CCF.content.errors, which tools/validate_content.js
 * prints and the UI can show to developers. Warnings don't stop registration.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});

  var RULES = {
    difficulties: ["easy", "medium", "hard"],
    stepTypes: ["single", "multi", "test", "numeric", "classify", "order"],
    exhibitTypes: ["ecg", "labs", "table", "report", "note", "diagram"],
    entryKinds: ["condition", "concept", "drug", "tool"],
    speakers: ["okafor", "narrator"],
    vitalsKeys: ["hr", "bp", "rr", "spo2", "temp", "pain", "rpe", "weight", "rhythm", "other"],
    diagrams: ["auscultation"],
    rhythms: {
      // id: [lowest, highest] sensible ventricular rate (bpm); null = rate not used
      "nsr": [60, 100],
      "sinus-brady": [30, 59],
      "sinus-tach": [101, 180],
      "afib": [50, 180],
      "aflutter": [60, 160],
      "pvc": [50, 120],
      "av-block-1": [45, 100],
      "av-block-2-type1": [40, 90],
      "av-block-2-type2": [30, 80],
      "av-block-3": [20, 50],
      "vtach": [120, 250],
      "vfib": null,
      "paced": [50, 90]
    },
    pvcPatterns: ["isolated", "bigeminy", "couplets", "multifocal"],
    stSlopes: ["downsloping", "horizontal", "upsloping"],
    labFlags: ["high", "low", null],
    stepsByDifficulty: { easy: [3, 4], medium: [4, 5], hard: [5, 6] }
  };

  var UNITS = [
    { id: "basics", order: 1, title: "Heart Basics", subtitle: "Blood flow, rhythm, cardiac output and the vital signs", icon: "heart-organ" },
    { id: "coronary", order: 2, title: "Coronary Cases", subtitle: "Angina, heart attack and coronary artery disease", icon: "heart-beats" },
    { id: "rhythm", order: 3, title: "Rhythm Cases", subtitle: "Palpitations, arrhythmias, heart block and the defibrillator", icon: "pulse" },
    { id: "pump", order: 4, title: "Pump Failure", subtitle: "Heart failure, pulmonary edema, cardiomyopathy and cor pulmonale", icon: "lungs" },
    { id: "pressure", order: 5, title: "Pressure Cases", subtitle: "Hypertension, low blood pressure, atherosclerosis and aneurysm", icon: "speedometer" },
    { id: "vessels", order: 6, title: "Vessel Cases", subtitle: "Arteries, veins, clots and cold fingers", icon: "leg" }
  ];

  var CHARACTERS = {
    okafor: { name: "Dr. Maya Okafor, PT, DPT", short: "Dr. Okafor", role: "Your clinical instructor and supervising physical therapist" },
    narrator: { name: "", short: "", role: "" }
  };

  var content = {
    RULES: RULES,
    characters: CHARACTERS,
    unitList: [],
    caseList: [],
    entryList: [],
    story: null,
    errors: [],     // { where, message }
    warnings: [],   // { where, message }
    files: [],      // content files that ran (in order)
    _units: {},
    _cases: {},
    _entries: {},
    _finalized: false
  };
  CCF.content = content;

  // ------------------------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------------------------

  function currentFile() {
    try {
      var script = typeof document !== "undefined" ? document.currentScript : null;
      // The single-file build inlines scripts and records their path in data-inlined.
      var src = script && (script.getAttribute("data-inlined") || script.src);
      if (src) {
        src = src.split("?")[0];
        return src.slice(src.lastIndexOf("/") + 1);
      }
    } catch (e) { /* ignore */ }
    return global.__CCF_FILE__ || "?";
  }

  function noteFile() {
    var f = currentFile();
    if (content.files.indexOf(f) < 0) content.files.push(f);
    return f;
  }

  function isObj(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  function isStr(v) { return typeof v === "string" && v.trim().length > 0; }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function isInt(v) { return isNum(v) && Math.floor(v) === v; }

  var TAG_RE = /<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i;
  var BANNED_RE = /\b(all|none) of the above\b/i;

  function Checker(where) {
    this.where = where;
    this.errors = [];
    this.warnings = [];
  }
  Checker.prototype.err = function (path, message) { this.errors.push({ where: this.where + (path ? " → " + path : ""), message: message }); };
  Checker.prototype.warn = function (path, message) { this.warnings.push({ where: this.where + (path ? " → " + path : ""), message: message }); };
  Checker.prototype.flush = function () {
    Array.prototype.push.apply(content.errors, this.errors);
    Array.prototype.push.apply(content.warnings, this.warnings);
    return this.errors.length === 0;
  };

  function checkInline(c, path, value, required) {
    if (value === undefined || value === null || value === "") {
      if (required) c.err(path, "is required (text)");
      return;
    }
    if (typeof value !== "string") { c.err(path, "must be text"); return; }
    if (TAG_RE.test(value)) c.err(path, "must not contain HTML tags (use **bold** and *italic*)");
    if (/\bTODO\b|lorem ipsum/i.test(value)) c.err(path, "contains placeholder text");
    if ((value.match(/\*\*/g) || []).length % 2 === 1) c.warn(path, "has an unmatched ** (bold)");
  }

  function checkRich(c, path, value, required) {
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      if (required) c.err(path, "is required (RichText)");
      return;
    }
    var blocks = Array.isArray(value) ? value : [value];
    blocks.forEach(function (b, i) {
      var p = path + (Array.isArray(value) ? "[" + i + "]" : "");
      if (typeof b === "string") { checkInline(c, p, b, true); return; }
      if (!isObj(b)) { c.err(p, "must be a string or a block object"); return; }
      var keys = Object.keys(b);
      if (b.list !== undefined || b.olist !== undefined) {
        var items = b.list !== undefined ? b.list : b.olist;
        if (!Array.isArray(items) || !items.length) c.err(p, "list must be a non-empty array");
        else items.forEach(function (it, j) { checkInline(c, p + ".list[" + j + "]", it, true); });
      } else if (b.tip !== undefined) {
        checkInline(c, p + ".tip", b.tip, true);
      } else if (b.warn !== undefined) {
        checkInline(c, p + ".warn", b.warn, true);
      } else if (b.quote !== undefined) {
        checkInline(c, p + ".quote", b.quote, true);
        if (b.by !== undefined) checkInline(c, p + ".by", b.by, false);
      } else if (b.table !== undefined) {
        checkTable(c, p + ".table", b.table);
      } else {
        c.err(p, "unknown block (" + keys.join(", ") + "); use list, olist, tip, warn, quote or table");
      }
    });
  }

  function checkTable(c, path, t) {
    if (!isObj(t)) { c.err(path, "must be { head, rows }"); return; }
    if (!Array.isArray(t.head) || !t.head.length) c.err(path + ".head", "must be a non-empty array");
    else t.head.forEach(function (h, i) { checkInline(c, path + ".head[" + i + "]", String(h), true); });
    if (!Array.isArray(t.rows) || !t.rows.length) { c.err(path + ".rows", "must be a non-empty array of rows"); return; }
    t.rows.forEach(function (row, i) {
      if (!Array.isArray(row)) { c.err(path + ".rows[" + i + "]", "must be an array"); return; }
      if (Array.isArray(t.head) && row.length !== t.head.length) c.err(path + ".rows[" + i + "]", "has " + row.length + " cells; the head has " + t.head.length);
      row.forEach(function (cell, j) {
        if (typeof cell === "number") return;
        checkInline(c, path + ".rows[" + i + "][" + j + "]", cell, false);
      });
    });
  }

  function checkSources(c, path, sources) {
    if (!Array.isArray(sources) || !sources.length) { c.err(path, "needs at least one source (e.g. \"L2 s6–8 · Angina pectoris\")"); return; }
    sources.forEach(function (s, i) {
      checkInline(c, path + "[" + i + "]", s, true);
      if (typeof s === "string" && !/^L[12]\b/.test(s.trim())) c.warn(path + "[" + i + "]", "should start with L1 or L2 (the lecture)");
    });
  }

  // ------------------------------------------------------------------------------------
  // Exhibits
  // ------------------------------------------------------------------------------------

  function checkEcg(c, p, x) {
    var rates = RULES.rhythms;
    if (!Object.prototype.hasOwnProperty.call(rates, x.rhythm)) {
      c.err(p + ".rhythm", "unknown rhythm \"" + x.rhythm + "\"; use one of " + Object.keys(rates).join(", "));
      return;
    }
    var range = rates[x.rhythm];
    if (x.rate !== undefined) {
      if (!isNum(x.rate)) c.err(p + ".rate", "must be a number (bpm)");
      else if (range && (x.rate < range[0] || x.rate > range[1])) c.warn(p + ".rate", x.rate + " bpm is unusual for " + x.rhythm + " (" + range[0] + "–" + range[1] + ")");
    }
    if (x.seconds !== undefined && (!isNum(x.seconds) || x.seconds < 3 || x.seconds > 12)) c.err(p + ".seconds", "must be 3–12");
    if (x.seed !== undefined && !isInt(x.seed)) c.err(p + ".seed", "must be an integer");
    if (x.lead !== undefined) checkInline(c, p + ".lead", x.lead, true);
    if (x.st !== undefined && ["elevation", "depression"].indexOf(x.st) < 0) c.err(p + ".st", "must be \"elevation\" or \"depression\"");
    if (x.stMm !== undefined && (!isNum(x.stMm) || x.stMm < 0.5 || x.stMm > 5)) c.err(p + ".stMm", "must be 0.5–5 (mm)");
    if (x.stSlope !== undefined && RULES.stSlopes.indexOf(x.stSlope) < 0) c.err(p + ".stSlope", "must be one of " + RULES.stSlopes.join(", "));
    if (x.tWave !== undefined && x.tWave !== "inverted") c.err(p + ".tWave", "must be \"inverted\"");
    if (x.qWave !== undefined && typeof x.qWave !== "boolean") c.err(p + ".qWave", "must be true or false");
    if (x.qrs !== undefined && (!isNum(x.qrs) || x.qrs < 0.06 || x.qrs > 0.24)) c.err(p + ".qrs", "must be 0.06–0.24 (seconds)");
    if (x.pr !== undefined && (!isNum(x.pr) || x.pr < 0.10 || x.pr > 0.44)) c.err(p + ".pr", "must be 0.10–0.44 (seconds)");
    if (x.pvc !== undefined) {
      if (!isObj(x.pvc) || RULES.pvcPatterns.indexOf(x.pvc.pattern) < 0) c.err(p + ".pvc", "must be { pattern: " + RULES.pvcPatterns.join(" | ") + ", count? }");
      if (x.rhythm !== "pvc") c.warn(p + ".pvc", "only used when rhythm is \"pvc\"");
    }
    if (x.rhythm === "pvc" && x.pvc === undefined) c.warn(p, "rhythm \"pvc\" without a pvc pattern (defaults to isolated)");
    if (x.conduction !== undefined && [2, 3, 4, "variable"].indexOf(x.conduction) < 0) c.err(p + ".conduction", "must be 2, 3, 4 or \"variable\"");
    if (x.atrialRate !== undefined && (!isNum(x.atrialRate) || x.atrialRate < 40 || x.atrialRate > 350)) c.err(p + ".atrialRate", "must be 40–350");
    if (x.describe !== undefined) checkInline(c, p + ".describe", x.describe, true);
  }

  function checkExhibit(c, p, x, ids) {
    if (!isObj(x)) { c.err(p, "must be an object"); return; }
    if (!isStr(x.id)) c.err(p + ".id", "is required");
    else if (ids[x.id]) c.err(p + ".id", "\"" + x.id + "\" is used twice in this case");
    else ids[x.id] = x;
    if (RULES.exhibitTypes.indexOf(x.type) < 0) { c.err(p + ".type", "must be one of " + RULES.exhibitTypes.join(", ")); return; }
    checkInline(c, p + ".title", x.title, true);
    if (x.caption !== undefined) checkInline(c, p + ".caption", x.caption, true);
    if (x.sealed !== undefined && typeof x.sealed !== "boolean") c.err(p + ".sealed", "must be true or false");
    if (x.type === "ecg") checkEcg(c, p, x);
    else if (x.type === "labs") {
      if (!Array.isArray(x.rows) || !x.rows.length) c.err(p + ".rows", "needs at least one row");
      else x.rows.forEach(function (r, i) {
        var rp = p + ".rows[" + i + "]";
        if (!isObj(r)) { c.err(rp, "must be { name, value, unit, ref, flag }"); return; }
        checkInline(c, rp + ".name", r.name, true);
        if (!(isStr(r.value) || isNum(r.value))) c.err(rp + ".value", "is required");
        if (r.flag !== undefined && RULES.labFlags.indexOf(r.flag) < 0) c.err(rp + ".flag", "must be \"high\", \"low\" or null");
      });
      if (x.note !== undefined) checkRich(c, p + ".note", x.note, true);
    } else if (x.type === "table") {
      checkTable(c, p, { head: x.head, rows: x.rows });
      if (x.note !== undefined) checkRich(c, p + ".note", x.note, true);
    } else if (x.type === "report" || x.type === "note") {
      checkRich(c, p + ".text", x.text, true);
      if (x.author !== undefined) checkInline(c, p + ".author", x.author, true);
    } else if (x.type === "diagram") {
      if (RULES.diagrams.indexOf(x.name) < 0) c.err(p + ".name", "must be one of " + RULES.diagrams.join(", "));
      if (x.labels !== undefined && ["numbers", "names"].indexOf(x.labels) < 0) c.err(p + ".labels", "must be \"numbers\" or \"names\"");
    }
  }

  function checkVitals(c, p, v) {
    if (!isObj(v)) { c.err(p, "must be an object of vital signs"); return; }
    Object.keys(v).forEach(function (k) {
      if (RULES.vitalsKeys.indexOf(k) < 0) c.err(p + "." + k, "unknown vital (use " + RULES.vitalsKeys.join(", ") + ")");
      else if (k === "other") {
        if (!Array.isArray(v.other)) c.err(p + ".other", "must be [{ label, value }]");
        else v.other.forEach(function (o, i) {
          if (!isObj(o) || !isStr(o.label) || !(isStr(o.value) || isNum(o.value))) c.err(p + ".other[" + i + "]", "must be { label, value }");
        });
      } else if (!(isStr(v[k]) || isNum(v[k]))) c.err(p + "." + k, "must be a number or text");
    });
    if (v.bp !== undefined && !/^\d{2,3}\/\d{2,3}/.test(String(v.bp))) c.warn(p + ".bp", "expected \"systolic/diastolic\" (e.g. \"128/82\")");
  }

  // ------------------------------------------------------------------------------------
  // Steps
  // ------------------------------------------------------------------------------------

  function checkOptions(c, p, opts, min, max) {
    if (!Array.isArray(opts) || opts.length < min || opts.length > max) {
      c.err(p, "needs " + min + "–" + max + " options");
      return false;
    }
    var seen = {};
    opts.forEach(function (o, i) {
      var op = p + "[" + i + "]";
      if (!isObj(o)) { c.err(op, "must be { text, correct?, why }"); return; }
      checkInline(c, op + ".text", o.text, true);
      checkInline(c, op + ".why", o.why, true);
      if (o.correct !== undefined && typeof o.correct !== "boolean") c.err(op + ".correct", "must be true or false");
      if (typeof o.text === "string") {
        var key = o.text.trim().toLowerCase();
        if (seen[key]) c.err(op + ".text", "duplicates another option");
        seen[key] = true;
        if (BANNED_RE.test(o.text)) c.err(op + ".text", "don't use \"all/none of the above\"");
      }
    });
    return true;
  }

  function checkStep(c, p, s, ctx) {
    if (!isObj(s)) { c.err(p, "must be an object"); return; }
    if (!isStr(s.id)) c.err(p + ".id", "is required");
    else if (ctx.stepIds[s.id]) c.err(p + ".id", "\"" + s.id + "\" is used twice");
    else ctx.stepIds[s.id] = true;

    if (s.update !== undefined) {
      if (!isObj(s.update)) c.err(p + ".update", "must be an object");
      else {
        checkInline(c, p + ".update.title", s.update.title, true);
        checkRich(c, p + ".update.text", s.update.text, true);
        if (s.update.vitals !== undefined) checkVitals(c, p + ".update.vitals", s.update.vitals);
        if (s.update.exhibits !== undefined) {
          if (!Array.isArray(s.update.exhibits)) c.err(p + ".update.exhibits", "must be an array");
          else s.update.exhibits.forEach(function (x, i) { checkExhibit(c, p + ".update.exhibits[" + i + "]", x, ctx.exhibits); });
        }
      }
    }

    if (RULES.stepTypes.indexOf(s.type) < 0) { c.err(p + ".type", "must be one of " + RULES.stepTypes.join(", ")); return; }
    checkRich(c, p + ".prompt", s.prompt, true);
    checkRich(c, p + ".explain", s.explain, true);
    if (!Array.isArray(s.hints) || s.hints.length < 1 || s.hints.length > 2) c.err(p + ".hints", "needs 1–2 hints");
    else s.hints.forEach(function (h, i) { checkInline(c, p + ".hints[" + i + "]", h, true); });
    if (s.keepOrder !== undefined && typeof s.keepOrder !== "boolean") c.err(p + ".keepOrder", "must be true or false");

    var correct;
    if (s.type === "single" || s.type === "test") {
      if (checkOptions(c, p + ".options", s.options, 3, 5)) {
        correct = s.options.filter(function (o) { return o && o.correct === true; });
        if (correct.length !== 1) c.err(p + ".options", "needs exactly one correct option (has " + correct.length + ")");
        if (s.type === "test") {
          s.options.forEach(function (o, i) {
            if (!o) return;
            if (o.correct && (!Array.isArray(o.reveals) || !o.reveals.length)) c.err(p + ".options[" + i + "].reveals", "the correct test must reveal at least one sealed exhibit");
            if (!o.correct && o.reveals !== undefined) c.err(p + ".options[" + i + "].reveals", "only the correct option can reveal exhibits");
            if (o.correct && Array.isArray(o.reveals)) o.reveals.forEach(function (id) { ctx.reveals.push({ id: id, path: p + ".options[" + i + "].reveals" }); });
          });
        }
      }
    } else if (s.type === "multi") {
      if (checkOptions(c, p + ".options", s.options, 4, 7)) {
        correct = s.options.filter(function (o) { return o && o.correct === true; }).length;
        if (correct < 2) c.err(p + ".options", "multi needs at least 2 correct options (has " + correct + ")");
        if (correct >= s.options.length) c.err(p + ".options", "multi needs at least 1 incorrect option");
      }
    } else if (s.type === "numeric") {
      if (!isNum(s.answer)) c.err(p + ".answer", "must be a number");
      if (!isNum(s.tolerance) || s.tolerance < 0) c.err(p + ".tolerance", "must be a number ≥ 0");
      if (s.unit !== undefined && typeof s.unit !== "string") c.err(p + ".unit", "must be text");
      if (s.traps !== undefined) {
        if (!Array.isArray(s.traps)) c.err(p + ".traps", "must be [{ value, tolerance, why }]");
        else s.traps.forEach(function (t, i) {
          var tp = p + ".traps[" + i + "]";
          if (!isObj(t) || !isNum(t.value)) { c.err(tp, "must be { value, tolerance?, why }"); return; }
          checkInline(c, tp + ".why", t.why, true);
          var tt = isNum(t.tolerance) ? t.tolerance : 0;
          if (isNum(s.answer) && isNum(s.tolerance) && Math.abs(t.value - s.answer) <= tt + s.tolerance) c.err(tp, "overlaps the accepted answer range");
        });
      }
    } else if (s.type === "classify") {
      if (!Array.isArray(s.categories) || s.categories.length < 2 || s.categories.length > 5) c.err(p + ".categories", "needs 2–5 categories");
      else s.categories.forEach(function (cat, i) { checkInline(c, p + ".categories[" + i + "]", cat, true); });
      if (!Array.isArray(s.items) || s.items.length < 4 || s.items.length > 8) c.err(p + ".items", "needs 4–8 items");
      else {
        var used = {};
        s.items.forEach(function (it, i) {
          var ip = p + ".items[" + i + "]";
          if (!isObj(it)) { c.err(ip, "must be { text, category, why? }"); return; }
          checkInline(c, ip + ".text", it.text, true);
          if (!isInt(it.category) || !Array.isArray(s.categories) || it.category < 0 || it.category >= s.categories.length) c.err(ip + ".category", "must be the index of a category");
          else used[it.category] = true;
          if (it.why !== undefined) checkInline(c, ip + ".why", it.why, true);
        });
        if (Array.isArray(s.categories) && Object.keys(used).length < Math.min(2, s.categories.length)) c.err(p + ".items", "use at least two of the categories");
        if (Array.isArray(s.categories) && Object.keys(used).length < s.categories.length) c.warn(p + ".items", "some categories have no items");
      }
    } else if (s.type === "order") {
      if (!Array.isArray(s.items) || s.items.length < 4 || s.items.length > 8) c.err(p + ".items", "needs 4–8 items, in the correct order");
      else {
        var seenItems = {};
        s.items.forEach(function (it, i) {
          checkInline(c, p + ".items[" + i + "]", it, true);
          if (typeof it === "string") {
            if (seenItems[it]) c.err(p + ".items[" + i + "]", "duplicates another item");
            seenItems[it] = true;
          }
        });
      }
    }
  }

  // ------------------------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------------------------

  function defineUnit(def) {
    var c = new Checker("unit " + (def && def.id));
    if (!isObj(def) || !isStr(def.id)) { c.err("", "a unit needs an id"); c.flush(); return null; }
    if (content._units[def.id]) { c.err("", "unit defined twice"); c.flush(); return null; }
    checkInline(c, "title", def.title, true);
    checkInline(c, "subtitle", def.subtitle, true);
    if (!isInt(def.order)) c.err("order", "must be an integer");
    if (!c.flush()) return null;
    var unit = { id: def.id, order: def.order, title: def.title, subtitle: def.subtitle, icon: def.icon || "heart-organ", intro: def.intro || null };
    content._units[unit.id] = unit;
    content.unitList.push(unit);
    content.unitList.sort(function (a, b) { return a.order - b.order; });
    return unit;
  }

  function defineCase(def) {
    var file = noteFile();
    var id = def && def.id;
    var c = new Checker("case " + (id || "(no id)") + " [" + file + "]");
    if (!isObj(def)) { c.err("", "defineCase needs an object"); c.flush(); return null; }
    if (!isStr(id) || !/^[a-z0-9]+(-[a-z0-9]+)+$/.test(id)) c.err("id", "must be kebab-case, starting with the unit id");
    if (isStr(id) && content._cases[id]) c.err("id", "\"" + id + "\" is defined twice");
    if (!content._units[def.unit]) c.err("unit", "unknown unit \"" + def.unit + "\"");
    else if (isStr(id) && id.indexOf(def.unit + "-") !== 0) c.err("id", "must start with \"" + def.unit + "-\"");
    if (!isInt(def.order) || def.order < 1) c.err("order", "must be a positive integer");
    if (RULES.difficulties.indexOf(def.difficulty) < 0) c.err("difficulty", "must be easy, medium or hard");
    checkInline(c, "title", def.title, true);
    if (typeof def.title === "string" && def.title.length > 44) c.warn("title", "is long (" + def.title.length + " characters)");
    checkInline(c, "teaser", def.teaser, true);
    if (typeof def.teaser === "string" && def.teaser.length > 110) c.warn("teaser", "should be ≤ 100 characters (" + def.teaser.length + ")");

    var pt = def.patient;
    if (!isObj(pt)) c.err("patient", "is required: { name, age, sex }");
    else {
      checkInline(c, "patient.name", pt.name, true);
      if (!isInt(pt.age) || pt.age < 1 || pt.age > 110) c.err("patient.age", "must be a whole number of years");
      if (pt.sex !== "F" && pt.sex !== "M") c.err("patient.sex", "must be \"F\" or \"M\"");
    }
    checkInline(c, "setting", def.setting, true);

    var ctx = { stepIds: {}, exhibits: {}, reveals: [] };
    var f = def.file;
    if (!isObj(f)) c.err("file", "is required");
    else {
      checkRich(c, "file.referral", f.referral, true);
      checkRich(c, "file.history", f.history, true);
      if (!Array.isArray(f.medications)) c.err("file.medications", "must be an array (may be empty)");
      else f.medications.forEach(function (m, i) {
        var mp = "file.medications[" + i + "]";
        if (!isObj(m)) { c.err(mp, "must be { name, dose, class? }"); return; }
        checkInline(c, mp + ".name", m.name, true);
        if (m.dose !== undefined) checkInline(c, mp + ".dose", m.dose, true);
        if (m["class"] !== undefined) checkInline(c, mp + ".class", m["class"], true);
      });
      if (f.allergies !== undefined) checkInline(c, "file.allergies", f.allergies, true);
      if (f.vitals === undefined) c.err("file.vitals", "is required");
      else checkVitals(c, "file.vitals", f.vitals);
      checkRich(c, "file.exam", f.exam, true);
      if (f.tests !== undefined) {
        if (!Array.isArray(f.tests)) c.err("file.tests", "must be an array");
        else f.tests.forEach(function (x, i) { checkExhibit(c, "file.tests[" + i + "]", x, ctx.exhibits); });
      }
    }

    if (!Array.isArray(def.steps) || def.steps.length < 3 || def.steps.length > 6) c.err("steps", "needs 3–6 steps");
    if (Array.isArray(def.steps)) {
      def.steps.forEach(function (s, i) { checkStep(c, "steps[" + i + "] (" + (s && s.id) + ")", s, ctx); });
      var band = RULES.stepsByDifficulty[def.difficulty];
      if (band && (def.steps.length < band[0] || def.steps.length > band[1])) c.warn("steps", def.difficulty + " cases usually have " + band[0] + "–" + band[1] + " steps (this one has " + def.steps.length + ")");
    }

    // Sealed exhibits must be revealed by a test step, and only sealed ones can be revealed.
    ctx.reveals.forEach(function (r) {
      var x = ctx.exhibits[r.id];
      if (!x) c.err(r.path, "reveals \"" + r.id + "\", which is not an exhibit in this case");
      else if (!x.sealed) c.err(r.path, "reveals \"" + r.id + "\", which is not sealed");
    });
    Object.keys(ctx.exhibits).forEach(function (xid) {
      var x = ctx.exhibits[xid];
      if (x.sealed && !ctx.reveals.some(function (r) { return r.id === xid; })) c.err("exhibit " + xid, "is sealed but no test step reveals it");
    });

    var d = def.debrief;
    if (!isObj(d)) c.err("debrief", "is required");
    else {
      checkInline(c, "debrief.diagnosis", d.diagnosis, true);
      checkRich(c, "debrief.summary", d.summary, true);
      if (!Array.isArray(d.takeaways) || d.takeaways.length < 3 || d.takeaways.length > 5) c.err("debrief.takeaways", "needs 3–5 take-home points");
      else d.takeaways.forEach(function (t, i) { checkInline(c, "debrief.takeaways[" + i + "]", t, true); });
      checkSources(c, "debrief.sources", d.sources);
    }
    if (def.casebook !== undefined && !Array.isArray(def.casebook)) c.err("casebook", "must be an array of entry ids");

    if (!c.flush()) return null;
    var kase = def;
    kase._file = file;
    content._cases[id] = kase;
    content.caseList.push(kase);
    sortCases();
    content._finalized = false;
    return kase;
  }

  function sortCases() {
    content.caseList.sort(function (a, b) {
      var ua = content._units[a.unit], ub = content._units[b.unit];
      return (ua.order - ub.order) || (a.order - b.order);
    });
  }

  function defineEntry(def) {
    var file = noteFile();
    var c = new Checker("entry " + (def && def.id) + " [" + file + "]");
    if (!isObj(def) || !isStr(def.id) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(def.id)) { c.err("id", "a Casebook entry needs a kebab-case id"); c.flush(); return null; }
    if (content._entries[def.id]) c.err("id", "\"" + def.id + "\" is defined twice");
    if (RULES.entryKinds.indexOf(def.kind) < 0) c.err("kind", "must be one of " + RULES.entryKinds.join(", "));
    if (def.unit !== undefined && !content._units[def.unit]) c.err("unit", "unknown unit \"" + def.unit + "\"");
    checkInline(c, "title", def.title, true);
    if (def.aka !== undefined) {
      if (!Array.isArray(def.aka)) c.err("aka", "must be an array");
      else def.aka.forEach(function (a, i) { checkInline(c, "aka[" + i + "]", a, true); });
    }
    checkRich(c, "summary", def.summary, true);
    if (!Array.isArray(def.sections) || !def.sections.length) c.err("sections", "needs at least one { heading, body }");
    else def.sections.forEach(function (s, i) {
      if (!isObj(s)) { c.err("sections[" + i + "]", "must be { heading, body }"); return; }
      checkInline(c, "sections[" + i + "].heading", s.heading, true);
      checkRich(c, "sections[" + i + "].body", s.body, true);
    });
    checkSources(c, "sources", def.sources);
    if (!c.flush()) return null;
    def._file = file;
    content._entries[def.id] = def;
    content.entryList.push(def);
    content.entryList.sort(function (a, b) { return a.title.localeCompare(b.title); });
    content._finalized = false;
    return def;
  }

  function defineStory(def) {
    noteFile();
    var c = new Checker("story");
    if (!isObj(def)) { c.err("", "defineStory needs { intro, finale }"); c.flush(); return null; }
    ["intro", "finale"].forEach(function (k) {
      if (!Array.isArray(def[k]) || !def[k].length) { c.err(k, "needs at least one panel"); return; }
      def[k].forEach(function (panel, i) {
        if (!isObj(panel)) { c.err(k + "[" + i + "]", "must be { speaker, text }"); return; }
        if (RULES.speakers.indexOf(panel.speaker) < 0) c.err(k + "[" + i + "].speaker", "must be one of " + RULES.speakers.join(", "));
        checkRich(c, k + "[" + i + "].text", panel.text, true);
      });
    });
    if (!c.flush()) return null;
    content.story = def;
    return def;
  }

  /** Cross-reference checks; call once after all content files have run (the app and the validator do). */
  function finalize() {
    if (content._finalized) return content;
    content._finalized = true;
    // Unknown Casebook ids.
    content.caseList.forEach(function (k) {
      (k.casebook || []).forEach(function (eid) {
        if (!content._entries[eid]) content.warnings.push({ where: "case " + k.id + " [" + k._file + "]", message: "casebook id \"" + eid + "\" has no entry (yet)" });
      });
    });
    // Unit order numbers: 1..n without gaps or duplicates.
    content.unitList.forEach(function (u) {
      var list = casesIn(u.id);
      list.forEach(function (k, i) {
        if (k.order !== i + 1) content.warnings.push({ where: "unit " + u.id, message: "case orders should run 1, 2, 3 … without gaps (" + k.id + " has order " + k.order + ", expected " + (i + 1) + ")" });
      });
    });
    return content;
  }

  function casesIn(unitId) {
    return content.caseList.filter(function (k) { return k.unit === unitId; });
  }

  content.unit = function (id) { return content._units[id] || null; };
  content.units = function () { return content.unitList.slice(); };
  content.getCase = function (id) { return content._cases[id] || null; };
  content.cases = function (unitId) { return unitId ? casesIn(unitId) : content.caseList.slice(); };
  content.entry = function (id) { return content._entries[id] || null; };
  content.entries = function (kind) { return content.entryList.filter(function (e) { return !kind || e.kind === kind; }); };
  content.character = function (id) { return CHARACTERS[id] || CHARACTERS.narrator; };
  content.finalize = finalize;

  /** Position of a case in its unit, as shown to players: "2.3". */
  content.caseNumber = function (kase) {
    var u = kase && content._units[kase.unit];
    return u ? u.order + "." + kase.order : "";
  };

  CCF.defineUnit = defineUnit;
  CCF.defineCase = defineCase;
  CCF.defineEntry = defineEntry;
  CCF.defineStory = defineStory;

  UNITS.forEach(defineUnit);
})(typeof window !== "undefined" ? window : globalThis);
