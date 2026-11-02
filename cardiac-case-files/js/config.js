/*
 * The Cardiac Case Files — configuration (CCF.config). Contract: docs/DESIGN.md §5.1.
 *
 * Values are applied in this order:
 *   1. the defaults below,
 *   2. window.CCF_CONFIG — an object defined *before* this file loads (tools/build.py bakes
 *      values in this way, and teachers who wrap the game in their own page can too),
 *   3. URL parameters: ?unlock=all, ?reference=off and ?hints=off.
 *      (?sound=off and ?motion=reduce belong to the UI; CCF.parseQuery() reads them.)
 *
 * Every known CCF_CONFIG value is validated: a value of the wrong type or out of range keeps
 * the default. Unknown keys are copied as they are (for wrappers and other modules).
 * URL parameters only work one way round — open every case, hide the Casebook, hide the
 * hints — so a URL can never turn the Casebook or hints back on when the page or the build
 * (`python3 tools/build.py --reference off`) turned them off.
 *
 * Extras (beyond DESIGN.md §5.1):
 *   CCF.parseQuery(search?)              → { key: value } with lower-case keys; without an
 *                                          argument it reads this page's URL. Never throws.
 *   CCF.buildConfig(overrides, location) → a fresh config built from the defaults, an
 *                                          overrides object (like CCF_CONFIG) and a location
 *                                          ({ search }); for tests and wrappers.
 *
 * Classic script (no modules): works from file://, in LMS iframes, and in Node.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});

  function defaults() {
    return {
      title: "The Cardiac Case Files",
      version: "1.0.0",                       // shown in About
      storageKey: "cardiac-case-files",       // prefix for localStorage keys
      saveSlots: 3,
      unlockAll: false,                       // ?unlock=all opens every case
      reference: true,                        // the Casebook; ?reference=off hides it (closed book)
      hints: true,                            // "Ask Dr. Okafor"; ?hints=off hides the hints
      revealAfter: 2,                         // wrong attempts on a step before "Show me the answer"
      // completionThreshold = share of the cases solved for "completed"/"passed" in an LMS.
      // Importing a save code is off in an LMS (it would change the gradebook) unless allowImport.
      scorm: { enabled: true, completionThreshold: 1.0, allowImport: false },
      // true in the SCORM package (tools/build.py): warn the player if no LMS can be reached.
      scormRequired: false
    };
  }

  // ---------------------------------------------------------------------------
  // CCF_CONFIG: each known value is validated; a bad value keeps the default.
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

  var VALIDATORS = {
    title: text(200),
    version: text(40),
    storageKey: text(64),
    saveSlots: number(1, 10, true),
    unlockAll: bool,
    reference: bool,
    hints: bool,
    revealAfter: number(0, 99, true),
    scormRequired: bool
  };

  var FORBIDDEN_KEYS = { "__proto__": true, "constructor": true, "prototype": true };

  function applyOverrides(config, overrides) {
    if (!isObject(overrides)) return config;
    Object.keys(overrides).forEach(function (key) {
      if (FORBIDDEN_KEYS[key]) return;
      var value = overrides[key];
      if (key === "scorm") {
        if (typeof value === "boolean") {
          config.scorm.enabled = value;
        } else if (isObject(value)) {
          config.scorm.enabled = bool(value.enabled, config.scorm.enabled);
          config.scorm.allowImport = bool(value.allowImport, config.scorm.allowImport);
          var threshold = number(0, 1, false)(value.completionThreshold, config.scorm.completionThreshold);
          if (threshold > 0) config.scorm.completionThreshold = threshold;
        }
      } else if (Object.prototype.hasOwnProperty.call(VALIDATORS, key)) {
        config[key] = VALIDATORS[key](value, config[key]);
      } else {
        config[key] = value;                  // extra keys for wrappers and other modules
      }
    });
    return config;
  }

  // ---------------------------------------------------------------------------
  // URL parameters
  // ---------------------------------------------------------------------------

  function readSearch() {
    try {
      var loc = global.location;
      return loc ? String(loc.search || "") : "";
    } catch (e) {
      return "";
    }
  }

  /** Parse "?a=1&B=two" into { a: "1", b: "two" } (keys lower-cased; never throws). */
  function parseQuery(search) {
    var params = {};
    if (search === undefined) search = readSearch();
    String(search || "").replace(/^\?/, "").split("&").forEach(function (pair) {
      if (!pair) return;
      var eq = pair.indexOf("=");
      var rawKey = eq === -1 ? pair : pair.slice(0, eq);
      var rawValue = eq === -1 ? "" : pair.slice(eq + 1);
      try {
        var key = decodeURIComponent(rawKey.replace(/\+/g, " ")).toLowerCase();
        if (!key || FORBIDDEN_KEYS[key]) return;
        params[key] = decodeURIComponent(rawValue.replace(/\+/g, " "));
      } catch (e) {
        // malformed escape sequence: ignore this parameter
      }
    });
    return params;
  }

  var OFF = { "off": true, "0": true, "false": true, "no": true, "none": true };
  var ALL = { "all": true, "1": true, "true": true, "yes": true };

  function applyUrlParams(config, loc) {
    if (!loc) return config;
    var params = parseQuery(String(loc.search || ""));
    var flag = function (name) {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]).trim().toLowerCase() : null;
    };
    if (ALL[flag("unlock")] === true) config.unlockAll = true;
    if (OFF[flag("reference")] === true) config.reference = false;
    if (OFF[flag("hints")] === true) config.hints = false;
    return config;
  }

  /**
   * A configuration built from the defaults, then `overrides` (like CCF_CONFIG), then the
   * URL parameters of `location` ({ search }). Exposed for tests and wrappers.
   */
  function buildConfig(overrides, location) {
    var config = defaults();
    applyOverrides(config, overrides);
    applyUrlParams(config, location || null);
    return config;
  }

  var pageOverrides = null;
  try { pageOverrides = global.CCF_CONFIG; } catch (e) { pageOverrides = null; }

  CCF.config = buildConfig(pageOverrides, { search: readSearch() });
  CCF.buildConfig = buildConfig;
  CCF.parseQuery = parseQuery;
})(typeof window !== "undefined" ? window : globalThis);
