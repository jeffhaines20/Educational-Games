/*
 * Syntax & Sorcery — configuration (SS.config).
 *
 * Overrides are applied in this order:
 *   1. the defaults below,
 *   2. window.SS_CONFIG — an object defined *before* this file loads (used by the
 *      browser tests and by teachers who wrap the game in their own page),
 *   3. URL parameters: ?unlock=all, ?answers=off and ?localPyodide=1 (the last one
 *      only on localhost / 127.0.0.1, for tools/dev_server.js).
 *
 * The query string can never supply a URL: scripts are only ever loaded from
 * addresses written in code or in SS_CONFIG.
 *
 * Classic script (no modules): works from file://, in LMS iframes, and in Node
 * (`global.window = global; require("./js/config.js")`).
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});

  var PYODIDE_VERSION = "0.29.5";

  function defaults() {
    return {
      title: "Syntax & Sorcery",
      version: "1.0.0",
      pyodideVersion: PYODIDE_VERSION,
      pyodideBaseURLs: [                       // tried in order until one loads
        "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/",
        "https://unpkg.com/pyodide@" + PYODIDE_VERSION + "/"
      ],
      pyodideLoadTimeoutMs: 180000,            // give up on one base URL after this long
      defaultTimeLimitMs: 8000,                // per cast; a challenge may set timeLimitMs
      outputLimitChars: 50000,
      saveSlots: 3,
      storageKey: "syntax-and-sorcery",        // localStorage key prefix
      allowAnswerScroll: true,
      answerScrollAfterFailedCasts: 3,
      unlockAll: false,
      scorm: { enabled: true, completionThreshold: 1.0 }   // share of challenges for "completed"
    };
  }

  // ---------------------------------------------------------------------------
  // SS_CONFIG: each known value is validated; a bad value keeps the default.
  // ---------------------------------------------------------------------------

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function number(min, max, integer) {
    return function (value, fallback) {
      var n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      if (typeof n !== "number" || !isFinite(n)) return fallback;
      if (integer) n = Math.round(n);
      return Math.min(max, Math.max(min, n));
    };
  }

  function bool(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }

  function text(maxLength) {
    return function (value, fallback) {
      return typeof value === "string" && value.trim() !== "" && value.length <= maxLength ? value : fallback;
    };
  }

  /** A string or a list of strings; each gets a trailing "/" and duplicates are dropped. */
  function urlList(value, fallback) {
    if (typeof value === "string") value = [value];
    if (!Array.isArray(value)) return fallback;
    var list = [];
    value.forEach(function (url) {
      if (typeof url !== "string") return;
      url = url.trim();
      if (!url) return;
      if (url.charAt(url.length - 1) !== "/") url += "/";
      if (list.indexOf(url) === -1) list.push(url);
    });
    return list.length ? list : fallback;
  }

  var VALIDATORS = {
    title: text(200),
    version: text(40),
    pyodideVersion: text(40),
    pyodideBaseURLs: urlList,
    pyodideLoadTimeoutMs: number(5000, 1800000, true),
    defaultTimeLimitMs: number(250, 600000, true),
    outputLimitChars: number(1000, 10000000, true),
    saveSlots: number(1, 10, true),
    storageKey: text(64),
    allowAnswerScroll: bool,
    answerScrollAfterFailedCasts: number(0, 1000, true),
    unlockAll: bool
  };

  function applyOverrides(config, overrides) {
    if (!isObject(overrides)) return config;
    Object.keys(overrides).forEach(function (key) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") return;
      var value = overrides[key];
      if (key === "scorm") {
        if (typeof value === "boolean") {
          config.scorm.enabled = value;
        } else if (isObject(value)) {
          config.scorm.enabled = bool(value.enabled, config.scorm.enabled);
          var threshold = number(0, 1, false)(value.completionThreshold, config.scorm.completionThreshold);
          if (threshold > 0) config.scorm.completionThreshold = threshold;
        }
      } else if (VALIDATORS[key]) {
        config[key] = VALIDATORS[key](value, config[key]);
      } else {
        config[key] = value;                   // extra keys for wrappers / other modules
      }
    });
    return config;
  }

  // ---------------------------------------------------------------------------
  // URL parameters
  // ---------------------------------------------------------------------------

  /** Parse "?a=1&B=two" into { a: "1", b: "two" } (keys lower-cased; never throws). */
  function parseQuery(search) {
    var params = {};
    String(search || "").replace(/^\?/, "").split("&").forEach(function (pair) {
      if (!pair) return;
      var eq = pair.indexOf("=");
      var rawKey = eq === -1 ? pair : pair.slice(0, eq);
      var rawValue = eq === -1 ? "" : pair.slice(eq + 1);
      try {
        var key = decodeURIComponent(rawKey.replace(/\+/g, " ")).toLowerCase();
        params[key] = decodeURIComponent(rawValue.replace(/\+/g, " "));
      } catch (e) {
        // malformed escape sequence: ignore this parameter
      }
    });
    return params;
  }

  var LOCAL_HOSTS = { "localhost": true, "127.0.0.1": true, "[::1]": true, "::1": true };

  function applyUrlParams(config, loc) {
    if (!loc) return config;
    var params = parseQuery(loc.search);
    var flag = function (name) { return String(params[name] || "").trim().toLowerCase(); };
    if (flag("unlock") === "all") config.unlockAll = true;
    if (flag("answers") === "off") config.allowAnswerScroll = false;
    // Dev server only (tools/dev_server.js serves Pyodide at /pyodide/); ignored elsewhere.
    if (flag("localpyodide") === "1" && LOCAL_HOSTS[String(loc.hostname || "").toLowerCase()]) {
      config.pyodideBaseURLs = ["/pyodide/"];
    }
    return config;
  }

  function readLocation() {
    try {
      var loc = global.location;
      return loc ? { search: String(loc.search || ""), hostname: String(loc.hostname || "") } : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Build a configuration: defaults, then `overrides` (like SS_CONFIG), then the URL
   * parameters of `location` ({ search, hostname }). Exposed for tests and wrappers.
   */
  function buildConfig(overrides, location) {
    var config = defaults();
    applyOverrides(config, overrides);
    applyUrlParams(config, location || null);
    return config;
  }

  var pageOverrides = null;
  try { pageOverrides = global.SS_CONFIG; } catch (e) { pageOverrides = null; }

  SS.config = buildConfig(pageOverrides, readLocation());
  SS.buildConfig = buildConfig;
  SS.parseQuery = parseQuery;
})(typeof window !== "undefined" ? window : globalThis);
