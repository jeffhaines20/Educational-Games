/*
 * Syntax & Sorcery — UI utilities (SS.UI.util).
 *
 * Builds DOM without innerHTML (every string becomes a text node), plus small
 * helpers shared by the screens: formatting, stars/badges, announcements for
 * screen readers, clipboard and downloads (both wrapped in try/catch because
 * sandboxed LMS iframes throw), and safe accessors for content and the profile.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});

  // Properties that must be set as DOM properties rather than attributes.
  var PROPS = { value: 1, checked: 1, disabled: 1, hidden: 1, selected: 1, readOnly: 1, open: 1, indeterminate: 1 };
  var SVG_NS = "http://www.w3.org/2000/svg";

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
      } else if (key.length > 2 && key.slice(0, 2) === "on" && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value);
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

  /** A decorative emoji (hidden from screen readers) or, with a label, an accessible image. */
  function emoji(ch, label) {
    if (!ch) return null;
    return label
      ? h("span", { class: "emoji", role: "img", "aria-label": label }, ch)
      : h("span", { class: "emoji", "aria-hidden": "true" }, ch);
  }

  /** A <button type="button">. opts: { kind, icon, size, title, on..., class, label } */
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
      opts.icon ? emoji(opts.icon) : null,
      label ? h("span", { class: "btn-label" }, label) : null,
      opts.kbd ? h("kbd", { class: "btn-kbd" }, opts.kbd) : null);
  }

  var uidCounter = 0;
  function uid(prefix) {
    uidCounter += 1;
    return (prefix || "ss") + "-" + uidCounter;
  }

  function debounce(fn, ms) {
    var timer = null;
    function debounced() {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { timer = null; fn.apply(self, args); }, ms);
    }
    debounced.flush = function () {
      if (timer) { clearTimeout(timer); timer = null; fn(); }
    };
    debounced.cancel = function () { clearTimeout(timer); timer = null; };
    return debounced;
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /** Run fn, returning fallback (and logging) if it throws. */
  function safe(fn, fallback) {
    try {
      return fn();
    } catch (err) {
      if (global.console && console.warn) console.warn("[Syntax & Sorcery UI]", err);
      return fallback;
    }
  }

  function plural(count, word, many) {
    return count + " " + (count === 1 ? word : (many || word + "s"));
  }

  function roman(n) {
    var map = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    var out = "";
    n = Math.max(1, Math.floor(n));
    if (n > 39) return String(n);
    map.forEach(function (pair) { while (n >= pair[0]) { out += pair[1]; n -= pair[0]; } });
    return out;
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

  function difficultyInfo(difficulty) {
    var info = SS.DIFFICULTIES && SS.DIFFICULTIES[difficulty];
    return info || { label: difficulty ? String(difficulty) : "Unknown", icon: "✦", xp: 0 };
  }

  function difficultyBadge(difficulty) {
    var info = difficultyInfo(difficulty);
    return h("span", { class: "badge diff diff-" + String(difficulty || "unknown") },
      emoji(info.icon), h("span", null, info.label));
  }

  function chips(items, extraClass) {
    if (!items || !items.length) return null;
    return h("ul", { class: "chips" + (extraClass ? " " + extraClass : ""), "aria-label": "Concepts" },
      items.map(function (item) { return h("li", { class: "chip" }, String(item)); }));
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
  /** Speak a message to screen-reader users through an aria-live region. */
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

  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: false }); } catch (err) { try { el.focus(); } catch (e) { /* ignore */ } }
  }

  function reducedMotion() {
    try {
      if (document.documentElement.classList.contains("reduce-motion")) return true;
      return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (err) {
      return false;
    }
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

  /** "Last, First" or "First Last" → "First". */
  function firstName(name) {
    if (!name) return "";
    var text = String(name).trim();
    if (text.indexOf(",") >= 0) text = text.split(",").slice(1).join(",").trim() || text.split(",")[0].trim();
    return text.split(/\s+/)[0] || "";
  }

  /** Tidy a wizard name typed by the player: trimmed, single spaces, at most 24 characters (like SS.Save). */
  function cleanName(name) {
    var text = String(name || "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
    return Array.from(text).slice(0, 24).join("").trim();
  }

  // --------------------------------------------------------------------------
  // Content and profile accessors (defensive: any engine/content file may be missing)
  // --------------------------------------------------------------------------

  function chapters() {
    return (SS.content && Array.isArray(SS.content.chapters)) ? SS.content.chapters : [];
  }

  function chapterById(id) {
    var list = chapters();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function challengeById(id) {
    return (SS.content && SS.content.challengesById && SS.content.challengesById[id]) || null;
  }

  function allChallenges() {
    var out = [];
    chapters().forEach(function (chapter) { (chapter.challenges || []).forEach(function (c) { out.push(c); }); });
    return out;
  }

  function chapterNumber(chapter) {
    var index = chapters().indexOf(chapter);
    return index >= 0 ? index + 1 : (chapter && chapter.order) || 1;
  }

  function profile() {
    return safe(function () { return SS.Save && SS.Save.getProfile ? SS.Save.getProfile() : null; }, null);
  }

  function challengeState(id) {
    var p = profile();
    return (p && p.challenges && p.challenges[id]) || {};
  }

  function settings() {
    var defaults = { sound: true, reduceMotion: false, editorFontSize: 15, unlockAll: false };
    var s = safe(function () { return SS.Save && SS.Save.getSettings ? SS.Save.getSettings() : null; }, null);
    if (!s) { var p = profile(); s = p && p.settings; }
    return Object.assign({}, defaults, s || {});
  }

  function config() {
    return SS.config || {};
  }

  UI.util = {
    h: h,
    svg: svg,
    append: append,
    clear: clear,
    remove: remove,
    emoji: emoji,
    button: button,
    uid: uid,
    debounce: debounce,
    delay: delay,
    safe: safe,
    plural: plural,
    roman: roman,
    formatDate: formatDate,
    relativeTime: relativeTime,
    stars: stars,
    difficultyInfo: difficultyInfo,
    difficultyBadge: difficultyBadge,
    chips: chips,
    progressBar: progressBar,
    announce: announce,
    focusables: focusables,
    focusEl: focusEl,
    reducedMotion: reducedMotion,
    copyText: copyText,
    downloadText: downloadText,
    firstName: firstName,
    cleanName: cleanName,
    chapters: chapters,
    chapterById: chapterById,
    challengeById: challengeById,
    allChallenges: allChallenges,
    chapterNumber: chapterNumber,
    profile: profile,
    challengeState: challengeState,
    settings: settings,
    config: config
  };
})(typeof window !== "undefined" ? window : globalThis);
