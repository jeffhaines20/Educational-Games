/*
 * Syntax & Sorcery — SS.PythonRunner: real Python (Pyodide) in a Web Worker.
 *
 *   SS.PythonRunner.init()        → Promise<void>  start loading (idempotent; retries after "error")
 *   SS.PythonRunner.isReady()     → boolean        Python is loaded (state "ready" or "busy")
 *   SS.PythonRunner.getStatus()   → { state, message, detail, baseURL }
 *   SS.PythonRunner.onStatus(cb)  → unsubscribe    cb(status) on every change
 *   SS.PythonRunner.run({ code, tests, inputs, timeLimitMs }) → Promise<RunResult>  (never rejects)
 *   SS.PythonRunner.restart()     → Promise<void>  terminate + reload the worker
 *
 * How it works
 *   * The worker is created from a Blob URL (falling back to a data: URL), so it also
 *     works when the game is opened from file:// or inside an LMS iframe.
 *   * Each load attempt uses a fresh worker and one base URL from
 *     SS.config.pyodideBaseURLs, in order, until one works. The worker
 *     importScripts() pyodide.js, calls loadPyodide({ indexURL }), writes SS.HARNESS_PY
 *     to /home/pyodide/spellcheck.py, imports it and runs a quick self-test.
 *   * Spells are passed to Python as function arguments (never pasted into Python
 *     source) and the harness answers with JSON (see docs/DESIGN.md §5.2 and §6).
 *   * Runs are queued, one at a time. The time limit starts when the worker reports
 *     that the run has begun. On timeout the worker is terminated and a new one is
 *     loaded automatically; a crashed Python is restarted the same way.
 *   * Messages from the worker are untrusted (a spell can `import js` and post
 *     messages): only messages carrying this worker's secret session token are
 *     considered, and results are validated and normalised before use.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});

  // ---------------------------------------------------------------------------
  // The worker. This function is serialised with toString() and runs inside the
  // worker, so it must not use anything from the surrounding scope.
  // ---------------------------------------------------------------------------
  /* eslint-disable no-undef */
  function workerMain(session) {
    "use strict";
    var scope = self;
    // Captured now, so a spell that replaces js.postMessage cannot intercept results.
    var post = scope.postMessage.bind(scope);
    var clock = scope.performance && typeof scope.performance.now === "function"
      ? scope.performance.now.bind(scope.performance)
      : Date.now;
    var runSpell = null;
    var initialised = false;

    // Constant Python source (no player data is ever pasted in here). It imports the
    // harness and defines _ss_run(), which resets interpreter-wide state that a spell
    // may have changed (builtins, the harness module, sys streams and hooks, the
    // recursion limit, sys.path, warning filters) before every run.
    //
    // It also makes functools.lru_cache / functools.cache use CPython's own pure-Python
    // wrapper. A worker has a small native stack: recursion that passes through the C
    // wrapper overflows it after ~400 levels and kills Python, whereas Python-to-Python
    // calls barely use it. With the pure-Python wrapper, too-deep memoised recursion
    // raises a normal RecursionError, and sys.setrecursionlimit() works as on a desktop.
    var SETUP_PY = [
      "import builtins, functools, gc, importlib.util, sys, warnings",
      "if '/home/pyodide' not in sys.path:",
      "    sys.path.insert(0, '/home/pyodide')",
      "import spellcheck",
      "_ss_missing = object()",
      "",
      "def _ss_pure_lru_wrapper():",
      "    spec = importlib.util.find_spec('functools')",
      "    source = spec.loader.get_source('functools')",
      "    namespace = {'__name__': '_ss_pure_functools', '__builtins__': builtins}",
      "    saved = sys.modules.get('_functools', _ss_missing)",
      "    sys.modules['_functools'] = None",
      "    try:",
      "        exec(compile(source, spec.origin or 'functools.py', 'exec'), namespace)",
      "    finally:",
      "        if saved is _ss_missing:",
      "            sys.modules.pop('_functools', None)",
      "        else:",
      "            sys.modules['_functools'] = saved",
      "    wrapper = namespace['_lru_cache_wrapper']",
      "    if getattr(wrapper, '__module__', '') != '_ss_pure_functools':",
      "        raise RuntimeError('pure-Python lru_cache wrapper not found')",
      "    return wrapper",
      "",
      "try:",
      "    _ss_lru = _ss_pure_lru_wrapper()",
      "except Exception:",
      "    _ss_lru = None",
      "if _ss_lru is not None:",
      "    functools._lru_cache_wrapper = _ss_lru",
      "_ss_builtins = dict(builtins.__dict__)",
      "_ss_harness = dict(spellcheck.__dict__)",
      "_ss_sys = {name: getattr(sys, name) for name in ('stdout', 'stderr', 'stdin', 'displayhook', 'excepthook', 'breakpointhook') if hasattr(sys, name)}",
      "_ss_limit = sys.getrecursionlimit()",
      "_ss_path = list(sys.path)",
      "_ss_filters = list(warnings.filters)",
      "",
      "def _ss_restore(target, snapshot):",
      "    for key in [k for k in target if k not in snapshot]:",
      "        del target[key]",
      "    for key, value in snapshot.items():",
      "        if target.get(key, _ss_missing) is not value:",
      "            target[key] = value",
      "",
      "def _ss_run(code, tests, inputs_json, output_limit):",
      "    _ss_restore(builtins.__dict__, _ss_builtins)",
      "    _ss_restore(spellcheck.__dict__, _ss_harness)",
      "    for name, value in _ss_sys.items():",
      "        setattr(sys, name, value)",
      "    sys.settrace(None)",
      "    sys.setprofile(None)",
      "    sys.setrecursionlimit(_ss_limit)",
      "    sys.path[:] = _ss_path",
      "    warnings.filters[:] = _ss_filters",
      "    gc.enable()",
      "    if _ss_lru is not None:",
      "        functools._lru_cache_wrapper = _ss_lru",
      "    return _ss_harness['run_spell_json'](code, tests, inputs_json, output_limit)",
      ""
    ].join("\n");

    var SELF_TEST_CODE = "x = 6 * 7\nprint('ready')\n";
    var SELF_TEST_TRIALS = "@test('self-test')\ndef _():\n    expect_equal(spell['x'], 42)\n    expect_output('ready')\n";

    function send(message) {
      message.session = session;
      try { post(message); } catch (e) { /* never let a send failure escape */ }
    }

    function describe(error) {
      if (!error) return "unknown error";
      try {
        return String(error.message || error).slice(0, 2000);
      } catch (e) {
        return "unknown error";
      }
    }

    function init(message) {
      if (initialised) return;
      initialised = true;
      var base = String(message.base || "");
      try {
        scope.importScripts(base + "pyodide.js");
      } catch (e) {
        send({ type: "init-failed", stage: "bootstrap", message: describe(e) });
        return;
      }
      if (typeof scope.loadPyodide !== "function") {
        send({ type: "init-failed", stage: "bootstrap", message: "pyodide.js did not define loadPyodide()" });
        return;
      }
      send({ type: "bootstrapped" });
      var loading;
      try {
        loading = scope.loadPyodide({
          indexURL: base,
          stdout: function () {},
          stderr: function () {},
          stdin: function () { return null; }
        });
      } catch (e) {
        send({ type: "init-failed", stage: "load", message: describe(e) });
        return;
      }
      Promise.resolve(loading).then(function (pyodide) {
        var version = "";
        try {
          version = String(pyodide.version || "");
          try { pyodide.FS.mkdirTree("/home/pyodide"); } catch (e) { /* already exists */ }
          pyodide.FS.writeFile("/home/pyodide/spellcheck.py", String(message.harness || ""), { encoding: "utf8" });
          var namespace = pyodide.globals.get("dict")();
          pyodide.runPython(SETUP_PY, { globals: namespace });
          runSpell = namespace.get("_ss_run");
          var check = JSON.parse(runSpell(SELF_TEST_CODE, SELF_TEST_TRIALS, "[]", 10000));
          if (!check || check.status !== "passed") {
            throw new Error("the harness self-test did not pass: " + JSON.stringify(check).slice(0, 1500));
          }
        } catch (e) {
          runSpell = null;
          send({ type: "init-failed", stage: "setup", message: describe(e) });
          return;
        }
        send({ type: "ready", version: version });
      }, function (e) {
        send({ type: "init-failed", stage: "load", message: describe(e) });
      });
    }

    function run(message) {
      var id = message.id;
      if (!runSpell) {
        send({ type: "fatal", id: id, message: "Python is not loaded in this worker" });
        return;
      }
      send({ type: "started", id: id });
      var t0 = clock();
      var json;
      try {
        json = runSpell(String(message.code), String(message.tests), String(message.inputsJson), Number(message.outputLimit) || 50000);
      } catch (e) {
        // The harness catches every Python exception, so anything that lands here means
        // the interpreter itself is broken (e.g. a fatal stack overflow).
        runSpell = null;
        send({ type: "fatal", id: id, message: describe(e) });
        return;
      }
      send({ type: "result", id: id, json: String(json), durationMs: clock() - t0 });
    }

    scope.addEventListener("message", function (event) {
      var message = event.data;
      if (!message || typeof message !== "object" || message.session !== session) return;
      if (message.type === "init") init(message);
      else if (message.type === "run") run(message);
    });
    send({ type: "hello" });
  }
  /* eslint-enable no-undef */

  // ---------------------------------------------------------------------------
  // Messages shown to the player
  // ---------------------------------------------------------------------------

  var MSG = {
    idle: "The Python spirit is asleep. It wakes when the game starts.",
    loading: "Summoning the Python spirit… (the first visit downloads about 12 MB)",
    slow: "Still summoning the Python spirit… a slow connection can take a minute or two.",
    fallback: "The first portal was closed, so the Python spirit is coming another way… (about 12 MB)",
    afterTimeout: "The wards stopped a runaway spell. Summoning a fresh Python spirit…",
    afterCrash: "The Python spirit stumbled. Summoning a fresh one…",
    restart: "Summoning a fresh Python spirit…",
    ready: "The Python spirit is ready.",
    busy: "Casting your spell…",
    noWorker: "This browser can't cast spells here: it blocks the background worker that runs Python. " +
      "Try opening the game in its own tab, or in an up-to-date Chrome, Edge, Firefox or Safari.",
    noHarness: "The spell checker is missing (js/engine/harness.js did not load), so spells can't be cast. " +
      "Please tell your instructor.",
    badHarness: "The spell checker failed to start, so spells can't be cast. This is a bug in the game, " +
      "not in your spell. Please tell your instructor."
  };

  function unreachableMessage(urls) {
    var hosts = [];
    urls.forEach(function (url) {
      var match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url);
      var host = match ? match[1] : url;
      if (hosts.indexOf(host) === -1) hosts.push(host);
    });
    var where = hosts.length ? " (from " + hosts.join(" or ") + ")" : "";
    return "The Python spirit couldn't be summoned. The game downloads Python from the internet" + where +
      ". Check your connection — or ask your school to allow " + (hosts.length > 1 ? "those sites" : "that site") +
      " — then reload the page.";
  }

  function seconds(ms) {
    var s = Math.round(ms / 100) / 10;
    return (s === Math.round(s) ? String(Math.round(s)) : String(s)) + (s === 1 ? " second" : " seconds");
  }

  // ---------------------------------------------------------------------------
  // Results
  // ---------------------------------------------------------------------------

  var STATUSES = { passed: true, failed: true, error: true, timeout: true, "internal-error": true, ran: true };
  var PHASES = { syntax: true, runtime: true, trial: true, trials: true };

  function plainResult(status, error, durationMs) {
    return {
      status: status, stdout: "", truncated: false, error: error,
      tests: [], passed: 0, total: 0, durationMs: Math.max(0, Math.round(durationMs || 0))
    };
  }

  function timeoutResult(limitMs, durationMs) {
    var span = seconds(limitMs);
    return plainResult("timeout", {
      type: "Timeout",
      message: "The spell was stopped after running for more than " + span + ".",
      line: null,
      phase: "runtime",
      traceback: "",
      friendly: "Your spell ran for more than " + span + " and the academy's wards stopped it. The usual " +
        "culprit is a loop that never ends (check that a `while` loop's condition eventually becomes `False`) " +
        "or a recursive function without a base case. If your spell does a lot of work, look for a faster approach."
    }, durationMs);
  }

  function internalErrorResult(friendly, message, durationMs) {
    return plainResult("internal-error", {
      type: "InternalError",
      message: String(message || friendly),
      line: null,
      phase: "runtime",
      traceback: "",
      friendly: friendly
    }, durationMs);
  }

  var CRASH_FRIENDLY = "The Python spirit collapsed while casting your spell and had to be summoned again. " +
    "This can happen when a spell recurses extremely deeply or uses a huge amount of memory. Check for a " +
    "recursive function without a base case, or a list that keeps growing, then cast again.";

  var STACK_FRIENDLY = "Your spell went so deep that the browser ran out of room, and the Python spirit " +
    "collapsed (a fresh one has been summoned). Something kept calling itself: a recursive function without " +
    "a base case, or a method such as `__repr__` or `__str__` that uses itself (for example `str(self)` or an " +
    "f-string of `self` inside `__str__`). The browser has less room than a desktop Python, so very deep " +
    "recursion through `sorted(key=...)`, `map()` or `repr()` can also do this: try a loop instead.";

  function crashFriendly(reason) {
    return /call stack|stack overflow|too much recursion/i.test(String(reason)) ? STACK_FRIENDLY : CRASH_FRIENDLY;
  }

  function str(value, max) {
    if (typeof value !== "string") value = value === null || value === undefined ? "" : String(value);
    return max && value.length > max ? value.slice(0, max) : value;
  }

  function lineNumber(value) {
    return typeof value === "number" && isFinite(value) && value >= 0 ? Math.floor(value) : null;
  }

  function normaliseError(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      type: str(raw.type, 200) || "Error",
      message: str(raw.message, 5000),
      line: lineNumber(raw.line),
      phase: PHASES[raw.phase] ? raw.phase : "runtime",
      traceback: str(raw.traceback, 20000),
      friendly: str(raw.friendly, 5000)
    };
  }

  function normaliseTest(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    var test = {
      name: str(raw.name, 500) || "Trial",
      passed: raw.passed === true,
      message: str(raw.message, 5000),
      line: lineNumber(raw.line),
      crash: raw.crash === true
    };
    if (typeof raw.debug === "string") test.debug = str(raw.debug, 20000);
    return test;
  }

  /** Validate a harness result; returns null if it isn't a well-formed RunResult. */
  function normaliseResult(raw, outputLimit, durationMs) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || !STATUSES[raw.status]) return null;
    if (typeof raw.stdout !== "string" || !Array.isArray(raw.tests)) return null;
    var tests = raw.tests.slice(0, 500).map(normaliseTest);
    var passed = tests.filter(function (t) { return t.passed; }).length;
    var status = raw.status;
    if ((status === "passed" || status === "failed") && tests.length) {
      status = passed === tests.length ? "passed" : "failed";
    }
    var stdout = raw.stdout;
    var truncated = raw.truncated === true;
    var cap = Math.max(1000, outputLimit || 50000) + 1000;     // the harness already caps output
    if (stdout.length > cap) { stdout = stdout.slice(0, cap); truncated = true; }
    return {
      status: status,
      stdout: stdout,
      truncated: truncated,
      error: normaliseError(raw.error),
      tests: tests,
      passed: passed,
      total: tests.length,
      durationMs: Math.max(0, Math.round(durationMs || 0))
    };
  }

  // ---------------------------------------------------------------------------
  // Runner state
  // ---------------------------------------------------------------------------

  var HELLO_TIMEOUT_MS = 15000;      // the worker script must start within this
  var BOOTSTRAP_TIMEOUT_MS = 30000;  // pyodide.js (18 KB) must arrive within this
  var START_TIMEOUT_MS = 15000;      // a posted run must report "started" within this
  var SLOW_NOTICE_MS = 20000;

  var status = { state: "idle", message: MSG.idle, detail: null, baseURL: null };
  var listeners = [];
  var waiters = [];          // promises waiting for "ready" (init/restart)
  var queue = [];            // runs waiting for their turn
  var current = null;        // the run in progress
  var engine = null;         // the current load attempt / live worker
  var generation = 0;        // bumps on every (re)load so stale callbacks are ignored
  var preferredBase = null;  // the base URL that worked last time
  var nextRunId = 1;

  function config() { return SS.config || {}; }

  function now() {
    try {
      if (global.performance && typeof global.performance.now === "function") return global.performance.now();
    } catch (e) { /* fall through */ }
    return Date.now();
  }

  function snapshot() {
    return { state: status.state, message: status.message, detail: status.detail, baseURL: status.baseURL };
  }

  function setStatus(state, message, detail) {
    status = {
      state: state,
      message: message,
      detail: detail === undefined ? null : detail,
      baseURL: engine && engine.ready ? engine.base : (state === "error" ? null : status.baseURL)
    };
    var copy = snapshot();
    listeners.slice().forEach(function (cb) {
      try { cb(copy); } catch (e) {
        try { if (global.console) global.console.error("SS.PythonRunner status listener failed:", e); } catch (e2) { /* ignore */ }
      }
    });
  }

  function token() {
    var out = "";
    try {
      var cryptoObj = global.crypto || global.msCrypto;
      if (cryptoObj && cryptoObj.getRandomValues) {
        var bytes = new Uint32Array(4);
        cryptoObj.getRandomValues(bytes);
        for (var i = 0; i < bytes.length; i++) out += bytes[i].toString(36);
        return out;
      }
    } catch (e) { /* fall back */ }
    for (var j = 0; j < 4; j++) out += Math.floor(Math.random() * 0x100000000).toString(36);
    return out;
  }

  /** Configured base URLs, made absolute, the last working one first. */
  function baseURLs() {
    var list = config().pyodideBaseURLs;
    if (typeof list === "string") list = [list];
    if (!Array.isArray(list)) list = [];
    var base = null;
    try { base = (global.document && global.document.baseURI) || (global.location && global.location.href) || null; } catch (e) { base = null; }
    var out = [];
    list.forEach(function (url) {
      if (typeof url !== "string" || !url.trim()) return;
      url = url.trim();
      try {
        if (base && typeof global.URL === "function") url = new global.URL(url, base).href;
      } catch (e) { /* keep as written */ }
      if (url.charAt(url.length - 1) !== "/") url += "/";
      if (out.indexOf(url) === -1) out.push(url);
    });
    if (preferredBase && out.indexOf(preferredBase) > 0) {
      out.splice(out.indexOf(preferredBase), 1);
      out.unshift(preferredBase);
    }
    return out;
  }

  function workerSource(sessionToken) {
    return "(" + workerMain.toString() + ")(" + JSON.stringify(sessionToken) + ");\n";
  }

  /** Create a worker from a Blob URL, else a data: URL. Returns null if impossible. */
  function createWorker(sessionToken, avoidBlob) {
    if (typeof global.Worker !== "function") return null;
    var source = workerSource(sessionToken);
    if (!avoidBlob) {
      try {
        var blob = new global.Blob([source], { type: "text/javascript" });
        var url = global.URL.createObjectURL(blob);
        try {
          return { worker: new global.Worker(url), kind: "blob", url: url };
        } catch (e) {
          try { global.URL.revokeObjectURL(url); } catch (e2) { /* ignore */ }
        }
      } catch (e) { /* try a data: URL */ }
    }
    try {
      return { worker: new global.Worker("data:text/javascript;charset=utf-8," + encodeURIComponent(source)), kind: "data", url: null };
    } catch (e) {
      return null;
    }
  }

  function revoke(attempt) {
    if (attempt && attempt.url) {
      try { global.URL.revokeObjectURL(attempt.url); } catch (e) { /* ignore */ }
      attempt.url = null;
    }
  }

  function clearTimer(attempt, name) {
    if (attempt && attempt[name]) { clearTimeout(attempt[name]); attempt[name] = null; }
  }

  function stopEngine() {
    var attempt = engine;
    engine = null;
    if (!attempt) return;
    attempt.dead = true;
    clearTimer(attempt, "watchdog");
    clearTimer(attempt, "slowTimer");
    revoke(attempt);
    try { attempt.worker.terminate(); } catch (e) { /* ignore */ }
  }

  function settleWaiters(error) {
    var list = waiters;
    waiters = [];
    list.forEach(function (w) {
      if (error) w.reject(error); else w.resolve();
    });
  }

  function failAll(message, detail) {
    stopEngine();
    generation++;
    setStatus("error", message, detail || null);
    var error = new Error(message);
    if (detail) error.detail = detail;
    settleWaiters(error);
    var pending = queue;
    queue = [];
    pending.forEach(function (job) {
      job.resolve(internalErrorResult("Python isn't available right now. " + message, detail || message, 0));
    });
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  function startLoading(message) {
    stopEngine();
    generation++;
    var gen = generation;
    if (typeof SS.HARNESS_PY !== "string" || !SS.HARNESS_PY) { failAll(MSG.noHarness); return; }
    if (typeof global.Worker !== "function") { failAll(MSG.noWorker, "Worker is not available"); return; }
    var urls = baseURLs();
    if (!urls.length) { failAll(unreachableMessage([]), "SS.config.pyodideBaseURLs is empty"); return; }
    setStatus("loading", message || MSG.loading);
    tryBase(gen, urls, 0, [], false);
  }

  function tryBase(gen, urls, index, failures, avoidBlob) {
    if (gen !== generation) return;
    if (index >= urls.length) {
      var detail = failures.join("\n");
      var harnessBroken = failures.some(function (f) { return f.indexOf("[setup]") !== -1; });
      failAll(harnessBroken ? MSG.badHarness : unreachableMessage(urls), detail);
      return;
    }
    var base = urls[index];
    var sessionToken = token();
    var created = createWorker(sessionToken, avoidBlob);
    if (!created) { failAll(MSG.noWorker, "new Worker() failed"); return; }

    var attempt = {
      gen: gen, base: base, token: sessionToken, worker: created.worker, kind: created.kind, url: created.url,
      phase: "hello", ready: false, dead: false, watchdog: null, slowTimer: null
    };
    engine = attempt;
    if (index > 0) setStatus("loading", MSG.fallback);

    // This base URL didn't work: move on to the next one.
    function giveUp(reason) {
      if (attempt.dead || attempt !== engine) return;
      failures.push(base + " [" + attempt.phase + "] " + reason);
      stopEngine();
      tryBase(gen, urls, index + 1, failures, avoidBlob);
    }
    attempt.giveUp = giveUp;

    // The worker script itself never started (blocked blob: URL, CSP...): that's not
    // the CDN's fault, so retry once as a data: URL worker, then give up entirely.
    function cannotStart(reason) {
      if (attempt.dead || attempt !== engine) return;
      stopEngine();
      if (attempt.kind === "blob") tryBase(gen, urls, index, failures, true);
      else failAll(MSG.noWorker, "the worker could not start: " + reason);
    }

    function arm(ms, reason) {
      clearTimer(attempt, "watchdog");
      attempt.watchdog = setTimeout(function () {
        if (attempt.phase === "hello") cannotStart(reason); else giveUp(reason);
      }, ms);
    }

    attempt.slowTimer = setTimeout(function () {
      attempt.slowTimer = null;
      if (!attempt.dead && attempt === engine && !attempt.ready && status.state === "loading") {
        setStatus("loading", MSG.slow);
      }
    }, SLOW_NOTICE_MS);

    attempt.worker.onmessage = function (event) { onWorkerMessage(attempt, event, arm); };
    attempt.worker.onmessageerror = function () { /* junk: ignore */ };
    attempt.worker.onerror = function (event) {
      try { if (event && event.preventDefault) event.preventDefault(); } catch (e) { /* ignore */ }
      if (attempt.dead || attempt !== engine) return;
      var what = describeEvent(event);
      if (attempt.phase === "hello") {
        cannotStart(what);
      } else if (!attempt.ready) {
        giveUp("worker error: " + what);
      } else {
        onWorkerCrash("worker error: " + what);
      }
    };
    arm(HELLO_TIMEOUT_MS, "the worker did not start");
  }

  function describeEvent(event) {
    try {
      if (!event) return "unknown error";
      return String(event.message || (event.error && event.error.message) || event.type || "unknown error").slice(0, 500);
    } catch (e) {
      return "unknown error";
    }
  }

  function onWorkerMessage(attempt, event, arm) {
    if (attempt.dead || attempt !== engine) return;
    var data;
    try { data = event && event.data; } catch (e) { return; }
    if (!data || typeof data !== "object" || data.session !== attempt.token || typeof data.type !== "string") return;

    switch (data.type) {
      case "hello":
        if (attempt.phase !== "hello") return;
        attempt.phase = "bootstrap";
        revoke(attempt);
        arm(BOOTSTRAP_TIMEOUT_MS, "pyodide.js did not load in time");
        try {
          attempt.worker.postMessage({ type: "init", session: attempt.token, base: attempt.base, harness: SS.HARNESS_PY });
        } catch (e) {
          attempt.giveUp("could not send the harness: " + e);
        }
        return;
      case "bootstrapped":
        if (attempt.phase !== "bootstrap") return;
        attempt.phase = "load";
        arm(Math.max(5000, Number(config().pyodideLoadTimeoutMs) || 180000), "Pyodide did not finish loading in time");
        return;
      case "init-failed":
        if (attempt.ready) return;
        if (data.stage === "setup") attempt.phase = "setup";
        attempt.giveUp(str(data.message, 2000) || "loading failed");
        return;
      case "ready":
        if (attempt.ready || attempt.phase !== "load") return;
        attempt.ready = true;
        attempt.phase = "ready";
        clearTimer(attempt, "watchdog");
        clearTimer(attempt, "slowTimer");
        preferredBase = attempt.base;
        setStatus("ready", MSG.ready);
        settleWaiters(null);
        pump();
        return;
      case "started":
        if (current && current.attempt === attempt && data.id === current.id && !current.started) {
          current.started = true;
          current.startedAt = now();
          clearTimeout(current.timer);
          current.timer = setTimeout(onRunTimeout, current.limit);
        }
        return;
      case "result":
        if (!current || current.attempt !== attempt || data.id !== current.id || typeof data.json !== "string") return;
        var parsed = null;
        try { parsed = JSON.parse(data.json); } catch (e) { parsed = null; }
        var duration = typeof data.durationMs === "number" && isFinite(data.durationMs) && data.durationMs >= 0
          ? data.durationMs
          : now() - (current.startedAt || current.postedAt);
        var result = normaliseResult(parsed, current.outputLimit, duration);
        if (result) finishRun(result);
        return;
      case "fatal":
        if (current && current.attempt === attempt && data.id === current.id) {
          onWorkerCrash(str(data.message, 2000) || "Python crashed");
        }
        return;
      default:
        return;
    }
  }

  // ---------------------------------------------------------------------------
  // Running
  // ---------------------------------------------------------------------------

  function pump() {
    if (current || !queue.length || !engine || !engine.ready || status.state !== "ready") return;
    var job = queue.shift();
    job.attempt = engine;
    job.postedAt = now();
    current = job;
    setStatus("busy", MSG.busy);
    job.timer = setTimeout(function () {
      if (current === job && !job.started) onWorkerCrash("the run never started");
    }, START_TIMEOUT_MS);
    try {
      engine.worker.postMessage({
        type: "run", session: engine.token, id: job.id, code: job.code, tests: job.tests,
        inputsJson: job.inputsJson, outputLimit: job.outputLimit
      });
    } catch (e) {
      onWorkerCrash("could not send the spell: " + e);
    }
  }

  function finishRun(result) {
    var job = current;
    if (!job) return;
    current = null;
    clearTimeout(job.timer);
    if (status.state === "busy") setStatus("ready", MSG.ready);
    job.resolve(result);
    pump();
  }

  function onRunTimeout() {
    var job = current;
    if (!job) return;
    current = null;
    clearTimeout(job.timer);
    job.resolve(timeoutResult(job.limit, now() - (job.startedAt || job.postedAt)));
    startLoading(MSG.afterTimeout);
  }

  function onWorkerCrash(reason) {
    var job = current;
    current = null;
    if (job) {
      clearTimeout(job.timer);
      job.resolve(internalErrorResult(crashFriendly(reason), "Python stopped unexpectedly: " + reason,
        now() - (job.startedAt || job.postedAt)));
    }
    startLoading(MSG.afterCrash);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function waitForReady() {
    return new Promise(function (resolve, reject) { waiters.push({ resolve: resolve, reject: reject }); });
  }

  function init() {
    if (status.state === "ready" || status.state === "busy") return Promise.resolve();
    var promise = waitForReady();
    if (status.state === "idle" || status.state === "error") startLoading(MSG.loading);
    return promise;
  }

  function isReady() {
    return status.state === "ready" || status.state === "busy";
  }

  function getStatus() {
    return snapshot();
  }

  function onStatus(cb) {
    if (typeof cb !== "function") return function () {};
    listeners.push(cb);
    return function unsubscribe() {
      var i = listeners.indexOf(cb);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  function run(options) {
    options = options && typeof options === "object" ? options : {};
    var cfg = config();
    var limit = Number(options.timeLimitMs);
    if (!isFinite(limit) || limit <= 0) limit = Number(cfg.defaultTimeLimitMs) || 8000;
    limit = Math.min(600000, Math.max(250, Math.round(limit)));
    var inputs = Array.isArray(options.inputs) ? options.inputs : [];
    var job = {
      id: nextRunId++,
      code: options.code === undefined || options.code === null ? "" : String(options.code),
      tests: options.tests === undefined || options.tests === null ? "" : String(options.tests),
      inputsJson: JSON.stringify(inputs.map(function (v) { return v === null || v === undefined ? "" : String(v); })),
      outputLimit: Math.max(1000, Number(cfg.outputLimitChars) || 50000),
      limit: limit,
      started: false,
      timer: null
    };
    if (status.state === "error") {
      return Promise.resolve(internalErrorResult("Python isn't available right now. " + status.message,
        status.detail || status.message, 0));
    }
    var promise = new Promise(function (resolve) { job.resolve = resolve; });
    queue.push(job);
    if (status.state === "idle") init().catch(function () { /* reported through the status */ });
    else pump();
    return promise;
  }

  function restart() {
    var promise = waitForReady();
    var job = current;
    current = null;
    if (job) {
      clearTimeout(job.timer);
      job.resolve(internalErrorResult("The spell was interrupted because the Python spirit was restarted. Cast it again.",
        "interrupted by restart", now() - (job.startedAt || job.postedAt)));
    }
    startLoading(status.state === "idle" ? MSG.loading : MSG.restart);
    return promise;
  }

  SS.PythonRunner = {
    init: init,
    isReady: isReady,
    getStatus: getStatus,
    onStatus: onStatus,
    run: run,
    restart: restart,
    // Exposed for tests (pure helpers, no state).
    _normaliseResult: normaliseResult,
    _timeoutResult: timeoutResult
  };
})(typeof window !== "undefined" ? window : globalThis);
