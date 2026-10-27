/*
 * Syntax & Sorcery — SS.Scorm: a small, defensive SCORM 1.2 / 2004 adapter.
 *
 *   SS.Scorm.connect()                 → boolean (an LMS API was found and initialised)
 *   SS.Scorm.isActive()                → boolean
 *   SS.Scorm.version                   → "1.2" | "2004" | null
 *   SS.Scorm.getLearner()              → { id, name }   ("Last, First" becomes "First Last")
 *   SS.Scorm.loadSuspendData()         → string ("" if none)
 *   SS.Scorm.saveSuspendData(text)     → boolean
 *   SS.Scorm.suspendDataLimit()        → number (4096 for 1.2, 64000 for 2004)
 *   SS.Scorm.reportProgress({ completed, total }) → boolean  (score raw/min/max + status)
 *   SS.Scorm.commit()                  → boolean
 *   SS.Scorm.finish()                  → boolean (only the first call does anything)
 *
 * The LMS API (`API` for 1.2, `API_1484_11` for 2004) is searched for in this window,
 * its parents (up to 10 levels) and the opener's chain. Every access is wrapped in
 * try/catch: cross-origin frames throw, and LMS APIs can be buggy. Nothing here ever
 * throws. A completed status is never downgraded to incomplete.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});

  var MAX_LEVELS = 10;

  var KEYS = {
    "1.2": {
      init: "LMSInitialize", get: "LMSGetValue", set: "LMSSetValue", commit: "LMSCommit",
      finish: "LMSFinish", lastError: "LMSGetLastError",
      learnerId: "cmi.core.student_id", learnerName: "cmi.core.student_name",
      status: "cmi.core.lesson_status", exit: "cmi.core.exit", sessionTime: "cmi.core.session_time",
      raw: "cmi.core.score.raw", min: "cmi.core.score.min", max: "cmi.core.score.max",
      suspend: "cmi.suspend_data", limit: 4096
    },
    "2004": {
      init: "Initialize", get: "GetValue", set: "SetValue", commit: "Commit",
      finish: "Terminate", lastError: "GetLastError",
      learnerId: "cmi.learner_id", learnerName: "cmi.learner_name",
      status: "cmi.completion_status", exit: "cmi.exit", sessionTime: "cmi.session_time",
      raw: "cmi.score.raw", min: "cmi.score.min", max: "cmi.score.max", scaled: "cmi.score.scaled",
      progress: "cmi.progress_measure",
      suspend: "cmi.suspend_data", limit: 64000
    }
  };

  var api = null;          // the LMS API object
  var keys = null;         // KEYS[version]
  var active = false;
  var finished = false;
  var startedAt = 0;
  var wasCompleted = false;
  var completeWord = "completed";   // "passed" if the LMS already said so

  function warn(message, error) {
    try { if (global.console && global.console.warn) global.console.warn("[SS.Scorm] " + message, error || ""); } catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Finding the API
  // ---------------------------------------------------------------------------

  function read(win, name) {
    try { return win[name]; } catch (e) { return null; }       // cross-origin: SecurityError
  }

  function probe(win) {
    var v12 = read(win, "API");
    if (v12 && typeof read(v12, "LMSInitialize") === "function") return { version: "1.2", api: v12 };
    var v2004 = read(win, "API_1484_11");
    if (v2004 && typeof read(v2004, "Initialize") === "function") return { version: "2004", api: v2004 };
    return null;
  }

  function searchChain(win) {
    for (var level = 0; win && level <= MAX_LEVELS; level++) {
      var found = probe(win);
      if (found) return found;
      var parent = read(win, "parent");
      if (!parent || parent === win) break;
      win = parent;
    }
    return null;
  }

  function findAPI(start) {
    var found = searchChain(start);
    if (found) return found;
    var opener = read(start, "opener");
    if (opener && opener !== start) {
      found = searchChain(opener);
      if (found) return found;
    }
    var top = read(start, "top");
    if (top && top !== start) {
      opener = read(top, "opener");
      if (opener && opener !== top) found = searchChain(opener);
    }
    return found || null;
  }

  // ---------------------------------------------------------------------------
  // Calling the API
  // ---------------------------------------------------------------------------

  function invoke(method) {
    if (!api) return null;
    var args = Array.prototype.slice.call(arguments, 1);
    try {
      var fn = api[keys[method]];
      if (typeof fn !== "function") return null;
      return fn.apply(api, args);
    } catch (e) {
      warn(keys[method] + " failed", e);
      return null;
    }
  }

  function truthy(result) {
    return result === true || String(result) === "true";
  }

  function lastError() {
    var code = invoke("lastError");
    return code === null || code === undefined ? "" : String(code);
  }

  function getValue(name) {
    var value = invoke("get", name);
    return value === null || value === undefined ? "" : String(value);
  }

  function setValue(name, value) {
    return truthy(invoke("set", name, String(value)));
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function connect() {
    if (active) return true;
    if (finished) return false;
    var config = SS.config || {};
    if (config.scorm && config.scorm.enabled === false) return false;
    var found = null;
    try { found = findAPI(global); } catch (e) { found = null; }
    if (!found) return false;
    api = found.api;
    keys = KEYS[found.version];
    var ok = truthy(invoke("init", ""));
    if (!ok) {
      // Already initialised (e.g. the game was reloaded inside the same LMS session)?
      var code = lastError();
      if (found.version === "2004" && code === "103") ok = true;
      else {
        getValue(keys.learnerId);
        ok = lastError() === "0";
      }
    }
    if (!ok) {
      api = null;
      keys = null;
      return false;
    }
    active = true;
    startedAt = Date.now();
    SS.Scorm.version = found.version;

    var status = getValue(keys.status).toLowerCase();
    wasCompleted = status === "completed" || status === "passed";
    completeWord = status === "passed" ? "passed" : "completed";
    if (!wasCompleted && (status === "" || status === "not attempted" || status === "unknown" || status === "browsed")) {
      setValue(keys.status, "incomplete");
    }
    // Keep the attempt open so the LMS gives suspend_data back next time.
    setValue(keys.exit, "suspend");
    commit();
    return true;
  }

  function isActive() {
    return active;
  }

  /** "Last, First" → "First Last" (other formats are kept as they are). */
  function friendlyName(name) {
    name = String(name || "").replace(/\s+/g, " ").trim();
    var parts = name.split(",");
    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
      return parts[1].trim() + " " + parts[0].trim();
    }
    return name;
  }

  function getLearner() {
    if (!active) return { id: "", name: "" };
    return { id: getValue(keys.learnerId).trim(), name: friendlyName(getValue(keys.learnerName)) };
  }

  function suspendDataLimit() {
    return keys ? keys.limit : 4096;
  }

  function loadSuspendData() {
    if (!active) return "";
    return getValue(keys.suspend);
  }

  function saveSuspendData(text) {
    if (!active) return false;
    text = String(text === null || text === undefined ? "" : text);
    if (text.length > keys.limit) {
      warn("suspend_data is " + text.length + " characters; the limit is " + keys.limit + ". Not saved.");
      return false;
    }
    return setValue(keys.suspend, text);
  }

  function reportProgress(progress) {
    if (!active) return false;
    progress = progress || {};
    var total = Math.max(0, Math.floor(Number(progress.total) || 0));
    var completed = Math.min(total, Math.max(0, Math.floor(Number(progress.completed) || 0)));
    var raw = total ? Math.round((100 * completed) / total) : 0;
    var config = SS.config || {};
    var threshold = config.scorm && Number(config.scorm.completionThreshold);
    if (!(threshold > 0 && threshold <= 1)) threshold = 1;
    var done = total > 0 && completed / total >= threshold - 1e-9;
    if (done) wasCompleted = true;

    var ok = setValue(keys.raw, raw);
    setValue(keys.min, 0);
    setValue(keys.max, 100);
    if (keys.scaled) setValue(keys.scaled, String(raw / 100));
    if (keys.progress) setValue(keys.progress, String(total ? Math.round((10000 * completed) / total) / 10000 : 0));
    setValue(keys.status, wasCompleted ? completeWord : "incomplete");
    return ok;
  }

  function commit() {
    if (!active) return false;
    return truthy(invoke("commit", ""));
  }

  function pad(n, width) {
    var s = String(n);
    while (s.length < width) s = "0" + s;
    return s;
  }

  function sessionTime(ms) {
    var centis = Math.max(0, Math.round(ms / 10));
    var hours = Math.floor(centis / 360000);
    var minutes = Math.floor((centis % 360000) / 6000);
    var secs = Math.floor((centis % 6000) / 100);
    var cs = centis % 100;
    if (SS.Scorm.version === "2004") {
      return "PT" + hours + "H" + minutes + "M" + secs + "." + pad(cs, 2) + "S";
    }
    return pad(Math.min(hours, 9999), 2) + ":" + pad(minutes, 2) + ":" + pad(secs, 2) + "." + pad(cs, 2);
  }

  function finish() {
    if (!active || finished) return false;
    finished = true;
    setValue(keys.sessionTime, sessionTime(Date.now() - startedAt));
    setValue(keys.exit, "suspend");
    commit();
    var ok = truthy(invoke("finish", ""));
    active = false;
    return ok;
  }

  SS.Scorm = {
    version: null,
    connect: connect,
    isActive: isActive,
    getLearner: getLearner,
    loadSuspendData: loadSuspendData,
    saveSuspendData: saveSuspendData,
    suspendDataLimit: suspendDataLimit,
    reportProgress: reportProgress,
    commit: commit,
    finish: finish,
    // For tests.
    _friendlyName: friendlyName,
    _sessionTime: sessionTime
  };
})(typeof window !== "undefined" ? window : globalThis);
