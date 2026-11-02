/*
 * The Cardiac Case Files — CCF.Scorm: a small, defensive SCORM 1.2 / 2004 adapter.
 * CCF.Save is the only caller; the UI talks to CCF.Save (docs/DESIGN.md §5.2, §5.4).
 *
 *   CCF.Scorm.connect()                 → boolean (an LMS API was found and initialised)
 *   CCF.Scorm.isActive()                → boolean
 *   CCF.Scorm.version                   → "1.2" | "2004" | null
 *   CCF.Scorm.getLearner()              → { id, name }   ("Last, First" becomes "First Last")
 *   CCF.Scorm.isFreshAttempt()          → boolean: a new (or instructor-reset) attempt —
 *                                         1.2 lesson_status was "not attempted", 2004 entry "ab-initio"
 *   CCF.Scorm.loadSuspendData()         → string ("" if none)
 *   CCF.Scorm.saveSuspendData(text)     → boolean (refused when longer than the LMS's limit)
 *   CCF.Scorm.suspendDataLimit()        → number (4096 for 1.2, 64000 for 2004)
 *   CCF.Scorm.reportProgress({ solved, total }) → boolean
 *         score.raw = round(100 × solved ÷ total) (min 0, max 100; 2004 also score.scaled and
 *         progress_measure); status "completed" (2004: completion "completed" + success
 *         "passed") once solved ÷ total ≥ CCF.config.scorm.completionThreshold, else "incomplete".
 *         ({ completed, total } is accepted too.)
 *   CCF.Scorm.commit()                  → boolean (does nothing if no value changed since the last commit)
 *   CCF.Scorm.finish()                  → boolean (sets session_time and exit=suspend, commits,
 *                                         then LMSFinish / Terminate; only the first call does anything)
 *   CCF.Scorm.lastError()               → null | { call, code, text, diagnostic }
 *
 * The LMS API (`API` for 1.2, `API_1484_11` for 2004) is searched for in this window, its
 * parents (up to 10 levels) and the opener's chain. Every access is wrapped in try/catch:
 * cross-origin frames throw, and LMS APIs can be buggy. Nothing here ever throws. Failed LMS
 * calls are logged to the console with the LMS's own error code, text and diagnostic.
 * Values are only sent when they change, and commit() only talks to the LMS when something
 * was sent since the last commit. No score is written until there is progress to report,
 * and a completed status is never downgraded. exit is "suspend" so the LMS keeps
 * suspend_data for the next launch. CCF.config.scorm.enabled === false turns all of it off.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});

  var MAX_LEVELS = 10;

  var KEYS = {
    "1.2": {
      init: "LMSInitialize", get: "LMSGetValue", set: "LMSSetValue", commit: "LMSCommit",
      finish: "LMSFinish", lastError: "LMSGetLastError", errorString: "LMSGetErrorString", diagnostic: "LMSGetDiagnostic",
      learnerId: "cmi.core.student_id", learnerName: "cmi.core.student_name",
      status: "cmi.core.lesson_status", entry: "cmi.core.entry", exit: "cmi.core.exit", sessionTime: "cmi.core.session_time",
      raw: "cmi.core.score.raw", min: "cmi.core.score.min", max: "cmi.core.score.max",
      suspend: "cmi.suspend_data", limit: 4096
    },
    "2004": {
      init: "Initialize", get: "GetValue", set: "SetValue", commit: "Commit",
      finish: "Terminate", lastError: "GetLastError", errorString: "GetErrorString", diagnostic: "GetDiagnostic",
      learnerId: "cmi.learner_id", learnerName: "cmi.learner_name",
      status: "cmi.completion_status", success: "cmi.success_status", entry: "cmi.entry", exit: "cmi.exit",
      sessionTime: "cmi.session_time",
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
  var completeWord = "completed";   // "passed" if the LMS already said so (1.2)
  var initialStatus = "";
  var entry = "";
  var sent = {};           // value last sent for each element (so unchanged values aren't re-sent)
  var dirty = false;       // something was sent since the last commit
  var failure = null;      // the last failed LMS call

  function log(level, message, extra) {
    try {
      var c = global.console;
      if (c && c[level]) c[level]("[CCF.Scorm] " + message, extra === undefined ? "" : extra);
    } catch (e) { /* ignore */ }
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
      log("warn", keys[method] + " threw", e);
      return null;
    }
  }

  function truthy(result) {
    return result === true || String(result) === "true";
  }

  function lastErrorCode() {
    var code = invoke("lastError");
    return code === null || code === undefined ? "" : String(code);
  }

  /** Why the last LMS call failed, in the LMS's own words. */
  function describeFailure(call) {
    var code = lastErrorCode();
    var text = "", diagnostic = "";
    if (code && code !== "0") {
      text = String(invoke("errorString", code) || "");
      diagnostic = String(invoke("diagnostic", code) || "");
    }
    return { call: call, code: code, text: text, diagnostic: diagnostic };
  }

  function logFailure(f) {
    failure = f;
    log("warn", f.call + " failed" + (f.code ? ": error " + f.code : "") + (f.text ? " (" + f.text + ")" : "") +
      (f.diagnostic && f.diagnostic !== f.text ? " — " + f.diagnostic : ""));
    return f;
  }

  function noteFailure(call) {
    return logFailure(describeFailure(call));
  }

  function getValue(name) {
    var value = invoke("get", name);
    return value === null || value === undefined ? "" : String(value);
  }

  /** Send a value (skipped when it hasn't changed, unless force). */
  function setValue(name, value, force) {
    value = String(value);
    if (!force && Object.prototype.hasOwnProperty.call(sent, name) && sent[name] === value) return true;
    var ok = truthy(invoke("set", name, value));
    if (ok) {
      sent[name] = value;
      dirty = true;
    } else {
      delete sent[name];
      noteFailure(keys.set + "(" + name + ")");
    }
    return ok;
  }

  function threshold() {
    var config = CCF.config || {};
    var t = config.scorm && Number(config.scorm.completionThreshold);
    return t > 0 && t <= 1 ? t : 1;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function connect() {
    if (active) return true;
    if (finished) return false;
    var config = CCF.config || {};
    if (config.scorm === false || (config.scorm && config.scorm.enabled === false)) return false;
    var found = null;
    try { found = findAPI(global); } catch (e) { found = null; }
    if (!found) return false;
    api = found.api;
    keys = KEYS[found.version];
    var ok = truthy(invoke("init", ""));
    if (!ok) {
      // Already initialised (e.g. the game was reloaded inside the same LMS session)?
      var initFailure = describeFailure(keys.init);
      if (found.version === "2004" && initFailure.code === "103") ok = true;
      else if (found.version === "1.2") {
        getValue(keys.learnerId);
        ok = lastErrorCode() === "0";
      }
      if (!ok) {
        logFailure(initFailure);
        api = null;
        keys = null;
        return false;
      }
    }
    active = true;
    startedAt = Date.now();
    sent = {};
    dirty = false;
    CCF.Scorm.version = found.version;

    initialStatus = getValue(keys.status).toLowerCase();
    entry = getValue(keys.entry).toLowerCase();
    wasCompleted = initialStatus === "completed" || initialStatus === "passed";
    completeWord = initialStatus === "passed" ? "passed" : "completed";
    if (!wasCompleted && (initialStatus === "" || initialStatus === "not attempted" || initialStatus === "unknown" ||
        initialStatus === "browsed")) {
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

  /** A new attempt: nothing from an earlier attempt should be carried into it. */
  function isFreshAttempt() {
    if (!keys) return false;
    return CCF.Scorm.version === "2004" ? entry === "ab-initio" : initialStatus === "not attempted";
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
    var text = getValue(keys.suspend);
    sent[keys.suspend] = text;          // what the LMS holds now
    return text;
  }

  function saveSuspendData(text) {
    if (!active) return false;
    text = String(text === null || text === undefined ? "" : text);
    if (text.length > keys.limit) {
      log("warn", "suspend_data is " + text.length + " characters; the limit is " + keys.limit + ". Not saved.");
      return false;
    }
    return setValue(keys.suspend, text);
  }

  function reportProgress(progress) {
    if (!active) return false;
    progress = progress || {};
    var total = Math.max(0, Math.floor(Number(progress.total) || 0));
    var solvedValue = progress.solved !== undefined ? progress.solved : progress.completed;
    var solved = Math.min(total, Math.max(0, Math.floor(Number(solvedValue) || 0)));
    // Nothing to report yet: don't write a 0 score at the start (or over an earlier score).
    if (!solved && !Object.prototype.hasOwnProperty.call(sent, keys.raw)) return true;
    var raw = total ? Math.round((100 * solved) / total) : 0;
    var done = total > 0 && solved / total >= threshold() - 1e-9;
    if (done) wasCompleted = true;

    var ok = setValue(keys.raw, raw);
    setValue(keys.min, 0);
    setValue(keys.max, 100);
    if (keys.scaled) setValue(keys.scaled, String(raw / 100));
    if (keys.progress) setValue(keys.progress, String(total ? Math.round((10000 * solved) / total) / 10000 : 0));
    setValue(keys.status, wasCompleted ? completeWord : "incomplete");
    if (keys.success && wasCompleted) setValue(keys.success, "passed");
    return ok;
  }

  function commit() {
    if (!active) return false;
    if (!dirty) return true;
    var ok = truthy(invoke("commit", ""));
    if (ok) dirty = false;
    else noteFailure(keys.commit);
    return ok;
  }

  function pad(n, width) {
    var s = String(n);
    while (s.length < width) s = "0" + s;
    return s;
  }

  /** Session time: "HH:MM:SS.cc" (1.2, CMITimespan) or "PT#H#M#.##S" (2004, ISO 8601 duration). */
  function sessionTime(ms) {
    var centis = Math.max(0, Math.round(ms / 10));
    var hours = Math.floor(centis / 360000);
    var minutes = Math.floor((centis % 360000) / 6000);
    var secs = Math.floor((centis % 6000) / 100);
    var cs = centis % 100;
    if (CCF.Scorm.version === "2004") {
      return "PT" + hours + "H" + minutes + "M" + secs + "." + pad(cs, 2) + "S";
    }
    return pad(Math.min(hours, 9999), 2) + ":" + pad(minutes, 2) + ":" + pad(secs, 2) + "." + pad(cs, 2);
  }

  function finish() {
    if (!active || finished) return false;
    finished = true;
    setValue(keys.sessionTime, sessionTime(Date.now() - startedAt), true);
    setValue(keys.exit, "suspend", true);
    commit();
    var ok = truthy(invoke("finish", ""));
    if (!ok) noteFailure(keys.finish);
    active = false;
    return ok;
  }

  function lastError() {
    return failure ? { call: failure.call, code: failure.code, text: failure.text, diagnostic: failure.diagnostic } : null;
  }

  CCF.Scorm = {
    version: null,
    connect: connect,
    isActive: isActive,
    isFreshAttempt: isFreshAttempt,
    getLearner: getLearner,
    loadSuspendData: loadSuspendData,
    saveSuspendData: saveSuspendData,
    suspendDataLimit: suspendDataLimit,
    reportProgress: reportProgress,
    commit: commit,
    finish: finish,
    lastError: lastError,
    // For tests.
    _friendlyName: friendlyName,
    _sessionTime: sessionTime
  };
})(typeof window !== "undefined" ? window : globalThis);
