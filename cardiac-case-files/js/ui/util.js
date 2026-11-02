/*
 * The Cardiac Case Files — UI utilities (CCF.UI.util).
 *
 * Builds DOM without innerHTML (every string becomes a text node), plus small helpers the
 * screens share: formatting, stars and badges, screen-reader announcements, clipboard and
 * downloads (wrapped in try/catch: sandboxed LMS frames throw), a seeded shuffle, and safe
 * accessors for the engine (CCF.Save, CCF.Progress, CCF.config) and the content.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});

  var GAME_NAME = "The Cardiac Case Files";
  var CENTER = "Riverside Heart & Vascular Center";
  var DISCLAIMER = "For education only — not medical advice. All patients are fictional.";
  var SVG_NS = "http://www.w3.org/2000/svg";

  // Properties that must be set as DOM properties rather than attributes.
  var PROPS = { value: 1, checked: 1, disabled: 1, hidden: 1, selected: 1, readOnly: 1, open: 1, indeterminate: 1 };

  function append(parent, child) {
    if (child === null || child === undefined || child === false || child === true) return;
    if (Array.isArray(child)) {
      for (var i = 0; i < child.length; i++) append(parent, child[i]);
      return;
    }
    if (typeof child === "object" && typeof child.nodeType === "number") {
      parent.appendChild(child);
      return;
    }
    parent.appendChild(document.createTextNode(String(child)));
  }

  function setProps(el, props) {
    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value === undefined || value === null || value === false) return;
      if (key === "class") {
        el.setAttribute("class", Array.isArray(value) ? value.filter(Boolean).join(" ") : String(value));
      } else if (key === "text") {
        el.textContent = String(value);
      } else if (key === "style") {
        if (typeof value === "string") {
          el.style.cssText = value;
        } else {
          Object.keys(value).forEach(function (name) {
            if (value[name] === null || value[name] === undefined) return;
            if (name.indexOf("-") >= 0) el.style.setProperty(name, String(value[name]));
            else el.style[name] = value[name];
          });
        }
      } else if (key === "on") {
        Object.keys(value).forEach(function (type) { el.addEventListener(type, value[type]); });
      } else if (key === "dataset") {
        Object.keys(value).forEach(function (k) { if (value[k] !== null && value[k] !== undefined) el.dataset[k] = String(value[k]); });
      } else if (PROPS[key]) {
        el[key] = value;
      } else {
        el.setAttribute(key, value === true ? "" : String(value));
      }
    });
  }

  /** h("div", { class: "x", on: { click: fn } }, "text", child, [more]) — never parses HTML. */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) setProps(el, props);
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  /** Same as h() for SVG elements. */
  function svg(tag, props) {
    var el = document.createElementNS(SVG_NS, tag);
    if (props) setProps(el, props);
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function clear(el) {
    if (!el) return el;
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  function remove(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  /** Run fn, returning fallback (and logging a warning) if it throws. */
  function safe(fn, fallback) {
    try {
      return fn();
    } catch (err) {
      if (global.console && console.warn) console.warn("[Cardiac Case Files UI]", err);
      return fallback;
    }
  }

  /**
   * An icon (inline game-icons.net <svg>, see js/ui/icons.js): a UI key ("hint") or an icon
   * name ("stethoscope"). Decorative (aria-hidden) unless opts.label is given. Null if unknown.
   */
  function icon(value, opts) {
    if (value === null || value === undefined || value === "") return null;
    opts = typeof opts === "string" ? { label: opts } : (opts || {});
    var I = CCF.Icons;
    if (!I || !I.svg) return null;
    var name = I.nameFor(value);
    return name ? I.svg(name, { label: opts.label, className: "icon" + (opts.className ? " " + opts.className : "") }) : null;
  }

  /** A decorative paper clip (the game-icons.net "paper-clip", tinted silver by CSS). */
  function clip(extraClass) {
    return h("span", { class: "paper-clip" + (extraClass ? " " + extraClass : ""), "aria-hidden": "true" }, icon("clip"));
  }

  /** A <button type="button">. opts: { kind, icon, size, title, onClick, class, ariaLabel, id, dataset, disabled } */
  function button(label, opts) {
    opts = opts || {};
    var classes = ["btn"];
    if (opts.kind) classes.push("btn-" + opts.kind);
    if (opts.size) classes.push("btn-" + opts.size);
    if (opts.class) classes.push(opts.class);
    var props = {
      type: opts.type || "button",
      class: classes.join(" "),
      title: opts.title,
      "aria-label": opts.ariaLabel,
      "aria-describedby": opts.describedBy,
      disabled: opts.disabled,
      id: opts.id
    };
    if (opts.onClick) props.on = { click: opts.onClick };
    if (opts.dataset) props.dataset = opts.dataset;
    return h("button", props,
      opts.icon ? icon(opts.icon, { className: "btn-icon" }) : null,
      label ? h("span", { class: "btn-label" }, label) : null,
      opts.after ? icon(opts.after, { className: "btn-icon btn-icon-after" }) : null);
  }

  var uidCounter = 0;
  function uid(prefix) {
    uidCounter += 1;
    return (prefix || "ccf") + "-" + uidCounter;
  }

  function plural(count, word, many) {
    return count + " " + (count === 1 ? word : (many || word + "s"));
  }

  function toTime(value) {
    if (typeof value === "number") return value;
    var t = Date.parse(value);
    return isFinite(t) ? t : null;
  }

  function formatDate(value, withTime) {
    var t = toTime(value);
    if (t === null) return "";
    try {
      var opts = { year: "numeric", month: "short", day: "numeric" };
      if (withTime) { opts.hour = "numeric"; opts.minute = "2-digit"; }
      return new Date(t).toLocaleString(undefined, opts);
    } catch (err) {
      return new Date(t).toDateString();
    }
  }

  function relativeTime(value) {
    var t = toTime(value);
    if (t === null) return "";
    var diff = Date.now() - t;
    var minute = 60000, hour = 60 * minute, day = 24 * hour;
    if (diff < minute) return "just now";
    if (diff < hour) return plural(Math.round(diff / minute), "minute") + " ago";
    if (diff < day) return plural(Math.round(diff / hour), "hour") + " ago";
    if (diff < 7 * day) return plural(Math.round(diff / day), "day") + " ago";
    return formatDate(t);
  }

  /** ★★☆ with an accessible label. */
  function stars(count, max, size) {
    max = max || 3;
    count = Math.max(0, Math.min(max, Math.round(count || 0)));
    var el = h("span", {
      class: "stars" + (size ? " stars-" + size : ""),
      role: "img",
      "aria-label": count + " of " + max + " stars"
    });
    for (var i = 0; i < max; i++) {
      el.appendChild(h("span", { class: "star " + (i < count ? "on" : "off"), "aria-hidden": "true" }, i < count ? "★" : "☆"));
    }
    return el;
  }

  var DIFFICULTY = {
    easy: { label: "Easy", icon: "easy" },
    medium: { label: "Medium", icon: "medium" },
    hard: { label: "Hard", icon: "hard" }
  };

  /** A labelled difficulty badge (text and chevrons — never colour alone). */
  function difficultyBadge(difficulty) {
    var info = DIFFICULTY[difficulty] || { label: String(difficulty || "Unknown"), icon: null };
    return h("span", { class: "badge diff diff-" + String(difficulty || "unknown") },
      icon(info.icon, { className: "badge-icon" }), h("span", null, info.label));
  }

  /** A progress bar. fraction 0..1 */
  function progressBar(fraction, label, extraClass) {
    var pct = Math.max(0, Math.min(100, Math.round((fraction || 0) * 100)));
    return h("div", {
      class: "bar" + (extraClass ? " " + extraClass : ""),
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": String(pct),
      "aria-label": label || "Progress"
    }, h("span", { class: "bar-fill", style: { width: pct + "%" } }));
  }

  var liveTimers = {};
  /** Speak a message to screen-reader users through the page's aria-live regions. */
  function announce(message, assertive) {
    var id = assertive ? "sr-alert" : "sr-live";
    var region = document.getElementById(id);
    if (!region) return;
    region.textContent = "";
    clearTimeout(liveTimers[id]);
    liveTimers[id] = setTimeout(function () { region.textContent = String(message || ""); }, 80);
  }

  var FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

  function focusables(root) {
    if (!root) return [];
    return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), function (el) {
      if (el.closest("[inert]")) return false;
      if (el.getAttribute("tabindex") === "-1") return false;
      var style = global.getComputedStyle ? getComputedStyle(el) : null;
      if (style && (style.visibility === "hidden" || style.display === "none")) return false;
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
    });
  }

  function focusEl(el, opts) {
    if (!el) return;
    if (!el.hasAttribute("tabindex") && !/^(BUTTON|A|INPUT|TEXTAREA|SELECT|SUMMARY)$/.test(el.tagName)) el.setAttribute("tabindex", "-1");
    try { el.focus({ preventScroll: !!(opts && opts.preventScroll) }); } catch (err) { try { el.focus(); } catch (e) { /* ignore */ } }
  }

  function reducedMotion() {
    try {
      if (document.documentElement.classList.contains("reduce-motion")) return true;
      return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (err) {
      return false;
    }
  }

  /** Scroll an element into view (smoothly unless motion is reduced). */
  function scrollIntoView(el, block) {
    if (!el || !el.scrollIntoView) return;
    try { el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: block || "start" }); } catch (err) { el.scrollIntoView(); }
  }

  /** Copy text to the clipboard. Resolves true on success (never rejects). */
  function copyText(text) {
    return new Promise(function (resolve) {
      var active = document.activeElement;
      function fallback() {
        try {
          var ta = h("textarea", { class: "sr-only", readonly: true, "aria-hidden": "true" });
          ta.value = String(text);
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand("copy");
          remove(ta);
          if (active && active.focus) focusEl(active);
          resolve(!!ok);
        } catch (err) {
          resolve(false);
        }
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText && global.isSecureContext !== false) {
          navigator.clipboard.writeText(String(text)).then(function () { resolve(true); }, fallback);
        } else {
          fallback();
        }
      } catch (err) {
        fallback();
      }
    });
  }

  /** Offer text as a downloaded file. Returns false if the browser blocks it. */
  function downloadText(filename, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = h("a", { href: url, download: filename, class: "sr-only", tabindex: "-1" });
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } remove(a); }, 1500);
      return true;
    } catch (err) {
      return false;
    }
  }

  /** True when the game runs inside a frame (an LMS page, a course site…). */
  function isFramed() {
    try { return global.self !== global.top; } catch (err) { return true; }
  }

  /** "Last, First" or "First Last" → "First". */
  function firstName(name) {
    if (!name) return "";
    var text = String(name).trim();
    if (text.indexOf(",") >= 0) text = text.split(",").slice(1).join(",").trim() || text.split(",")[0].trim();
    return text.split(/\s+/)[0] || "";
  }

  /** Tidy a name typed by the player: no control characters, single spaces, at most 24 characters. */
  function cleanName(name) {
    var text = String(name || "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
    return Array.from(text).slice(0, 24).join("").trim();
  }

  /** URL query parameters (lower-case keys). */
  function query() {
    var out = {};
    try {
      String(global.location.search || "").replace(/^\?/, "").split("&").forEach(function (pair) {
        if (!pair) return;
        var i = pair.indexOf("=");
        var k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, " ")).toLowerCase();
        var v = i < 0 ? "" : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
        out[k] = v;
      });
    } catch (err) { /* ignore */ }
    return out;
  }

  // ------------------------------------------------------------------------------------
  // Seeded randomness (deterministic option order per case + step)
  // ------------------------------------------------------------------------------------

  /** A 32-bit FNV-1a hash of a string. */
  function hash(text) {
    var hval = 0x811c9dc5;
    var s = String(text);
    for (var i = 0; i < s.length; i++) {
      hval ^= s.charCodeAt(i);
      hval = Math.imul(hval, 0x01000193) >>> 0;
    }
    return hval >>> 0;
  }

  /** mulberry32: a small seeded generator → function returning [0, 1). */
  function rng(seed) {
    var a = (typeof seed === "number" ? seed : hash(seed)) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Indices 0..n-1 in a seeded random order. */
  function shuffledIndices(n, seed) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(i);
    var rand = rng(seed);
    for (var j = n - 1; j > 0; j--) {
      var k = Math.floor(rand() * (j + 1));
      var tmp = out[j]; out[j] = out[k]; out[k] = tmp;
    }
    return out;
  }

  function randInt(lo, hi, rand) {
    var r = rand || Math.random;
    return lo + Math.floor(r() * (hi - lo + 1));
  }

  function pick(list, rand) {
    var r = rand || Math.random;
    return list[Math.floor(r() * list.length)];
  }

  // ------------------------------------------------------------------------------------
  // Engine and content accessors (defensive: any engine or content file may be missing)
  // ------------------------------------------------------------------------------------

  function config() {
    return CCF.config || {};
  }

  function profile() {
    return safe(function () { return CCF.Save && CCF.Save.current ? CCF.Save.current() : null; }, null);
  }

  function settings() {
    var defaults = { sound: true, reduceMotion: false, textSize: "md" };
    var p = profile();
    var s = p && p.settings ? p.settings : null;
    if (!s) s = safe(function () { return CCF.Save && CCF.Save.settings ? CCF.Save.settings() : null; }, null);
    return Object.assign({}, defaults, s || {});
  }

  function content() {
    return CCF.content || null;
  }

  function units() {
    var c = content();
    return c ? safe(function () { return c.units(); }, []) : [];
  }

  function cases(unitId) {
    var c = content();
    return c ? safe(function () { return c.cases(unitId); }, []) : [];
  }

  function getCase(id) {
    var c = content();
    return c ? safe(function () { return c.getCase(id); }, null) : null;
  }

  function entry(id) {
    var c = content();
    return c ? safe(function () { return c.entry(id); }, null) : null;
  }

  function caseNumber(kase) {
    var c = content();
    if (!c || !kase) return "";
    return safe(function () { return c.caseNumber(kase); }, "") || "";
  }

  function caseRecord(id) {
    var p = profile();
    return (p && p.cases && p.cases[id]) || null;
  }

  function isUnlocked(kase) {
    if (!kase) return false;
    if (config().unlockAll) return true;
    var p = profile();
    return !!safe(function () { return CCF.Progress.isUnlocked(p, kase.id); }, kase.order === 1);
  }

  function referenceOn() {
    return config().reference !== false && !!content();
  }

  function hintsOn() {
    return config().hints !== false;
  }

  function revealAfter() {
    var n = Number(config().revealAfter);
    return isFinite(n) && n >= 0 ? Math.floor(n) : 2;
  }

  function character(id) {
    var c = content();
    var ch = c && c.character ? safe(function () { return c.character(id); }, null) : null;
    return ch || { name: "", short: "", role: "" };
  }

  /** "Harold Brenner, 62" (+ " · M" when opts.sex). */
  function patientLine(kase, withSex) {
    var p = (kase && kase.patient) || {};
    var text = (p.name || "Patient") + (p.age ? ", " + p.age : "");
    if (withSex && p.sex) text += " · " + (p.sex === "F" ? "female" : p.sex === "M" ? "male" : p.sex);
    return text;
  }

  UI.util = {
    GAME_NAME: GAME_NAME,
    CENTER: CENTER,
    DISCLAIMER: DISCLAIMER,
    h: h,
    svg: svg,
    append: append,
    clear: clear,
    remove: remove,
    safe: safe,
    icon: icon,
    clip: clip,
    button: button,
    uid: uid,
    plural: plural,
    formatDate: formatDate,
    relativeTime: relativeTime,
    stars: stars,
    difficultyBadge: difficultyBadge,
    DIFFICULTY: DIFFICULTY,
    progressBar: progressBar,
    announce: announce,
    focusables: focusables,
    focusEl: focusEl,
    reducedMotion: reducedMotion,
    scrollIntoView: scrollIntoView,
    copyText: copyText,
    downloadText: downloadText,
    isFramed: isFramed,
    firstName: firstName,
    cleanName: cleanName,
    query: query,
    hash: hash,
    rng: rng,
    shuffledIndices: shuffledIndices,
    randInt: randInt,
    pick: pick,
    config: config,
    profile: profile,
    settings: settings,
    content: content,
    units: units,
    cases: cases,
    getCase: getCase,
    entry: entry,
    caseNumber: caseNumber,
    caseRecord: caseRecord,
    isUnlocked: isUnlocked,
    referenceOn: referenceOn,
    hintsOn: hintsOn,
    revealAfter: revealAfter,
    character: character,
    patientLine: patientLine
  };
})(typeof window !== "undefined" ? window : globalThis);
