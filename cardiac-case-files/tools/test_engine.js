#!/usr/bin/env node
/*
 * The Cardiac Case Files — engine tests: CCF.config, CCF.Progress, CCF.Save, CCF.Scorm,
 * tools/build.py, tools/dev_server.js and scorm/imsmanifest.xml.
 *
 * Dependency-free. Every scenario loads the real engine files and the real content registry
 * into a fresh Node `vm` sandbox with a fake window, fake localStorage, fake timers and clock,
 * fake SCORM 1.2 / 2004 LMS APIs and a small generated set of cases (registered through
 * CCF.defineCase, so it passes the registry's own checks). The real content files are used
 * where it matters (suspend_data size with every case solved, distinct hashes), whatever
 * number of cases exists today.
 *
 *   node tools/test_engine.js            # all tests
 *   node tools/test_engine.js save       # only tests whose name contains "save"
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const http = require("http");
const assert = require("assert");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SOURCES = {};
function source(rel) {
  if (!SOURCES[rel]) SOURCES[rel] = fs.readFileSync(path.join(ROOT, rel), "utf8");
  return SOURCES[rel];
}

const ENGINE_FILES = ["js/config.js", "js/engine/scorm.js", "js/engine/save.js", "js/engine/progress.js", "js/content/registry.js"];
const START = Date.UTC(2026, 10, 2, 12, 0, 0);   // 2 Nov 2026, 12:00 UTC

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

/** Fake timers and a fake clock (a Date subclass) that move together. */
function makeTimers(start) {
  let now = start;
  let nextId = 1;
  const queue = new Map();
  class FakeDate extends Date {
    constructor(...args) { if (args.length === 0) super(now); else super(...args); }
    static now() { return now; }
  }
  return {
    Date: FakeDate,
    setTimeout(fn, ms) { const id = nextId++; queue.set(id, { fn, at: now + (Number(ms) || 0) }); return id; },
    clearTimeout(id) { queue.delete(id); },
    /** Move the clock forward, running timers in time order (including ones they schedule). */
    advance(ms) {
      const target = now + ms;
      for (;;) {
        const next = [...queue.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) break;
        queue.delete(next[0]);
        now = Math.max(now, next[1].at);
        next[1].fn();
      }
      now = target;
    },
    get now() { return now; },
    get pending() { return queue.size; },
  };
}

function makeLocalStorage() {
  const data = new Map();
  const ls = {
    failWrites: false,
    failWritesLongerThan: 0,      // like a nearly full storage: only big writes fail
    writes: 0,
    getItem(k) { k = String(k); return data.has(k) ? data.get(k) : null; },
    setItem(k, v) {
      if (ls.failWrites || (ls.failWritesLongerThan && String(v).length > ls.failWritesLongerThan)) {
        const e = new Error("The quota has been exceeded."); e.name = "QuotaExceededError"; throw e;
      }
      ls.writes++;
      data.set(String(k), String(v));
    },
    removeItem(k) { data.delete(String(k)); },
    clear() { data.clear(); },
    key(i) { return [...data.keys()][i] ?? null; },
    get length() { return data.size; },
    _data: data,
  };
  return ls;
}

/** A fake SCORM 1.2 LMS. Pass `shared` (another fake's .data) for a second launch of the same attempt. */
function makeScorm12(initial, shared) {
  const data = shared || Object.assign({
    "cmi.core.student_id": "learner-42",
    "cmi.core.student_name": "Doe, Jane",
    "cmi.core.lesson_status": "not attempted",
    "cmi.suspend_data": "",
  }, initial || {});
  const calls = [];
  let initialized = false;
  let lastError = "0";
  return {
    data, calls,
    LMSInitialize() { calls.push("init"); if (initialized) { lastError = "101"; return "false"; } initialized = true; lastError = "0"; return "true"; },
    LMSGetValue(k) { calls.push("get " + k); lastError = "0"; return data[k] === undefined ? "" : String(data[k]); },
    LMSSetValue(k, v) {
      calls.push("set " + k);
      if (k === "cmi.suspend_data" && String(v).length > 4096) { lastError = "405"; return "false"; }
      data[k] = String(v); lastError = "0"; return "true";
    },
    LMSCommit() { calls.push("commit"); return "true"; },
    LMSFinish() { calls.push("finish"); return "true"; },
    LMSGetLastError() { return lastError; },
    LMSGetErrorString() { return ""; },
    LMSGetDiagnostic() { return ""; },
    count(name) { return calls.filter((c) => c === name).length; },
    _setInitialized(v) { initialized = v; },
  };
}

function makeScorm2004(initial) {
  const data = Object.assign({
    "cmi.learner_id": "learner-2004",
    "cmi.learner_name": "Lovelace, Ada",
    "cmi.completion_status": "unknown",
    "cmi.suspend_data": "",
  }, initial || {});
  const calls = [];
  let initialized = false;
  let lastError = "0";
  return {
    data, calls,
    Initialize() { calls.push("init"); if (initialized) { lastError = "103"; return "false"; } initialized = true; return "true"; },
    GetValue(k) { calls.push("get " + k); return data[k] === undefined ? "" : String(data[k]); },
    SetValue(k, v) { calls.push("set " + k); data[k] = String(v); return "true"; },
    Commit() { calls.push("commit"); return "true"; },
    Terminate() { calls.push("finish"); return "true"; },
    GetLastError() { return lastError; },
    GetErrorString() { return ""; },
    GetDiagnostic() { return ""; },
    count(name) { return calls.filter((c) => c === name).length; },
    _setInitialized(v) { initialized = v; },
  };
}

/** A window whose properties throw, like a cross-origin parent (but `parent` works). */
function crossOriginWindow(parent) {
  return new Proxy({}, {
    get(target, key) {
      if (key === "parent") return parent;
      throw new Error("SecurityError: Blocked a frame with origin from accessing a cross-origin frame.");
    },
  });
}

function topWindow(props) {
  const win = Object.assign({}, props || {});
  win.parent = win;
  win.top = win;
  return win;
}

// ---------------------------------------------------------------------------
// Generated content (valid for js/content/registry.js)
// ---------------------------------------------------------------------------

function caseDef(id, unit, order, difficulty, stepCount) {
  const steps = [];
  for (let i = 0; i < stepCount; i++) {
    steps.push({
      id: "s" + (i + 1), type: "single", prompt: "Question " + (i + 1) + "?", hints: ["Think it through."], explain: "Because it is.",
      options: [{ text: "Right answer", correct: true, why: "Yes." }, { text: "Wrong answer", why: "No." }, { text: "Another wrong answer", why: "No." }],
    });
  }
  return {
    id, unit, order, difficulty,
    title: "Case " + id, teaser: "A generated test case.",
    patient: { name: "Test Patient", age: 50, sex: "F" }, setting: "Test clinic",
    file: { referral: "Referral.", history: "History.", medications: [], vitals: { hr: 80, bp: "120/80" }, exam: "Exam.", tests: [] },
    steps,
    debrief: { diagnosis: "Test", summary: "Summary.", takeaways: ["One.", "Two.", "Three."], sources: ["L1 s1 · Test"] },
    casebook: [],
  };
}

function contentScript(defs) {
  return defs.map((d) => "CCF.defineCase(" + JSON.stringify(d) + ");").join("\n");
}

// 6 cases: XP 10 + 10 + 20 + 20 + 30 + 30 = 120; units pump, pressure and vessels are empty.
const FAKE_CASES = [
  caseDef("basics-one", "basics", 1, "easy", 3),
  caseDef("basics-two", "basics", 2, "easy", 4),
  caseDef("basics-three", "basics", 3, "medium", 5),
  caseDef("coronary-one", "coronary", 1, "medium", 4),
  caseDef("coronary-two", "coronary", 2, "hard", 6),
  caseDef("rhythm-one", "rhythm", 1, "hard", 5),
];
const FAKE_CONTENT = contentScript(FAKE_CASES);
const FAKE_IDS = FAKE_CASES.map((c) => c.id);

/** 34 cases like the real plan (9 easy, 15 medium, 10 hard) with long, realistic ids. */
function plannedCases() {
  const units = ["basics", "coronary", "rhythm", "pump", "pressure", "vessels"];
  const per = [5, 6, 5, 5, 5, 8];
  const diffs = [].concat(Array(9).fill("easy"), Array(15).fill("medium"), Array(10).fill("hard"));
  const defs = [];
  let n = 0;
  units.forEach((u, ui) => {
    for (let i = 1; i <= per[ui]; i++) {
      const id = u + "-the-quite-long-case-title-number-" + i + "-of-" + per[ui];
      defs.push(caseDef(id, u, i, diffs[n++ % diffs.length], 5));
    }
  });
  return defs;
}

/**
 * A fresh engine in a vm sandbox.
 * options: { storage: fakeLocalStorage | "blocked" | "unreadable" | null, parent, opener, config,
 *            search, content: js string | false, files: [...], document, start }
 */
const engines = [];
function makeEngine(options) {
  options = options || {};
  const timers = makeTimers(options.start || START);
  const listeners = {};
  const docListeners = {};
  const logs = [];
  const quietConsole = { log() {}, info() {}, warn: (...a) => logs.push(a.map(String).join(" ")), error: (...a) => logs.push(a.map(String).join(" ")) };
  const sb = {
    console: quietConsole,
    Date: timers.Date,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
  };
  sb.window = sb;
  sb.self = sb;
  let top = sb;
  if (options.parent) { try { top = options.parent.top || options.parent; } catch (e) { top = options.parent; } }
  sb.top = top;
  sb.parent = options.parent || sb;
  if (options.opener) sb.opener = options.opener;
  if (options.search !== undefined) sb.location = { search: options.search, hostname: "localhost", href: "http://localhost/" + options.search };
  if (options.config) sb.CCF_CONFIG = options.config;
  if (options.storage === "blocked") {
    Object.defineProperty(sb, "localStorage", { get() { throw new Error("SecurityError: The operation is insecure."); } });
  } else if (options.storage === "unreadable") {
    sb.localStorage = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("SecurityError"); }, removeItem() {} };
  } else if (options.storage !== undefined) {
    sb.localStorage = options.storage;
  } else {
    sb.localStorage = makeLocalStorage();
  }
  sb.document = options.document || {
    visibilityState: "visible",
    addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
  };
  vm.createContext(sb);
  const files = options.files || ENGINE_FILES;
  for (const rel of files) vm.runInContext(source(rel), sb, { filename: rel });
  if (options.content !== false) {
    sb.__CCF_FILE__ = "fake-content.js";
    vm.runInContext(options.content || FAKE_CONTENT, sb, { filename: "fake-content.js" });
  }
  const engine = {
    sb, CCF: sb.CCF, timers, logs,
    get S() { return sb.CCF.Save; },
    get P() { return sb.CCF.Progress; },
    fire(type, event) { (listeners[type] || []).forEach((fn) => fn(event || {})); },
    hide() { sb.document.visibilityState = "hidden"; (docListeners.visibilitychange || []).forEach((fn) => fn({})); },
    run(code) { return vm.runInContext(code, sb); },
  };
  engines.push(engine);
  return engine;
}

/** Objects from the sandbox have another realm's prototypes: compare plain copies. */
function plain(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }

const minute = (iso) => new Date(Math.floor(Date.parse(iso) / 60000) * 60000).toISOString();

// ---------------------------------------------------------------------------
// Tiny test runner
// ---------------------------------------------------------------------------

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ---------------------------------------------------------------------------
// CCF.config
// ---------------------------------------------------------------------------

test("config: defaults match docs/DESIGN.md §5.1", () => {
  const { CCF } = makeEngine({ files: ["js/config.js"], content: false });
  assert.deepStrictEqual(plain(CCF.config), {
    title: "The Cardiac Case Files", version: "1.0.0", storageKey: "cardiac-case-files", saveSlots: 3,
    unlockAll: false, reference: true, hints: true, revealAfter: 2,
    scorm: { enabled: true, completionThreshold: 1, allowImport: false }, scormRequired: false,
  });
});

test("config: CCF_CONFIG overrides are validated; unknown keys are kept", () => {
  let { CCF } = makeEngine({
    files: ["js/config.js"], content: false,
    config: JSON.parse('{"saveSlots": 99, "revealAfter": "3", "reference": "maybe", "hints": false, "unlockAll": true, "title": "",' +
      '"storageKey": "ccf-test", "version": "2.0.0", "scorm": {"enabled": false, "completionThreshold": 0.8, "allowImport": true},' +
      '"scormRequired": true, "extra": 7, "__proto__": {"polluted": true}}'),
  });
  const c = plain(CCF.config);
  assert.strictEqual(c.saveSlots, 10);
  assert.strictEqual(c.revealAfter, 3);
  assert.strictEqual(c.reference, true, "not a boolean: keeps the default");
  assert.strictEqual(c.hints, false);
  assert.strictEqual(c.unlockAll, true);
  assert.strictEqual(c.title, "The Cardiac Case Files");
  assert.strictEqual(c.storageKey, "ccf-test");
  assert.strictEqual(c.version, "2.0.0");
  assert.deepStrictEqual(c.scorm, { enabled: false, completionThreshold: 0.8, allowImport: true });
  assert.strictEqual(c.scormRequired, true);
  assert.strictEqual(c.extra, 7);
  assert.strictEqual(CCF.config.polluted, undefined);
  ({ CCF } = makeEngine({ files: ["js/config.js"], content: false, config: { revealAfter: "abc", saveSlots: 0, scorm: { completionThreshold: 0 } } }));
  assert.strictEqual(CCF.config.revealAfter, 2);
  assert.strictEqual(CCF.config.saveSlots, 1);
  assert.strictEqual(CCF.config.scorm.completionThreshold, 1, "a threshold of 0 is ignored");
  ({ CCF } = makeEngine({ files: ["js/config.js"], content: false, config: { scorm: false } }));
  assert.strictEqual(CCF.config.scorm.enabled, false);
  ({ CCF } = makeEngine({ files: ["js/config.js"], content: false, config: "nonsense" }));
  assert.strictEqual(CCF.config.saveSlots, 3);
  // A teacher's wrapper page may write switches as words.
  ({ CCF } = makeEngine({ files: ["js/config.js"], content: false, config: { reference: "off", hints: "No", unlockAll: "yes", scormRequired: 1, scorm: { enabled: "off", allowImport: "on" } } }));
  assert.deepStrictEqual([CCF.config.reference, CCF.config.hints, CCF.config.unlockAll, CCF.config.scormRequired, CCF.config.scorm.enabled, CCF.config.scorm.allowImport], [false, false, true, true, false, true]);
});

test("config: URL parameters only switch things the safe way round", () => {
  let { CCF } = makeEngine({ files: ["js/config.js"], content: false, search: "?unlock=all&Reference=OFF&hints=off&sound=off" });
  assert.deepStrictEqual([CCF.config.unlockAll, CCF.config.reference, CCF.config.hints], [true, false, false]);
  assert.strictEqual(CCF.config.sound, undefined, "?sound is the UI's");
  assert.deepStrictEqual(plain(CCF.parseQuery()), { unlock: "all", reference: "OFF", hints: "off", sound: "off" }, "parseQuery() reads the page URL");
  assert.deepStrictEqual(plain(CCF.parseQuery("?Motion=reduce&x&a=1+2&b=%E2%9C%93&bad=%E0%A4%A")), { motion: "reduce", x: "", a: "1 2", b: "✓" });
  ({ CCF } = makeEngine({ files: ["js/config.js"], content: false, search: "?reference=on&hints=1&unlock=some", config: { reference: false, hints: false } }));
  assert.deepStrictEqual([CCF.config.unlockAll, CCF.config.reference, CCF.config.hints], [false, false, false], "a URL can't turn them back on");
  ({ CCF } = makeEngine({ files: ["js/config.js"], content: false, search: "?unlock=1&reference=0" }));
  assert.deepStrictEqual([CCF.config.unlockAll, CCF.config.reference], [true, false]);
  const built = plain(CCF.buildConfig({ saveSlots: 2 }, { search: "?hints=no" }));
  assert.deepStrictEqual([built.saveSlots, built.hints, built.reference], [2, false, true]);
});

// ---------------------------------------------------------------------------
// CCF.Progress
// ---------------------------------------------------------------------------

function profileWith(records) {
  return { v: 1, name: "Test", cases: records || {}, seen: {}, settings: {}, drills: {} };
}
const solved = (stars, extra) => Object.assign({ solved: true, bestStars: stars, bestStrikes: 3 - stars, plays: 1, current: null }, extra || {});
const busy = (at, extra) => Object.assign({ solved: false, bestStars: 0, current: { step: 1, strikes: 0, hints: 0, answers: [] }, lastPlayedAt: at }, extra || {});

test("progress: stars from strikes and the number of steps", () => {
  const { P } = makeEngine();
  const table = [[0, 4, 3], [1, 4, 2], [2, 4, 2], [3, 4, 1], [3, 5, 2], [4, 5, 1], [3, 6, 2], [4, 6, 1], [1, 1, 2], [2, 1, 1], [0, 3, 3], [2, 3, 2], [3, 3, 1]];
  for (const [strikes, steps, stars] of table) assert.strictEqual(P.starsFor(strikes, steps), stars, strikes + " strikes, " + steps + " steps");
  assert.strictEqual(P.starsFor(-2, 4), 3);
  assert.strictEqual(P.starsFor("2", "4"), 2);
  assert.strictEqual(P.starsFor(undefined, 4), 3);
  assert.strictEqual(P.starsFor(1, undefined), 2, "a missing step count counts as 1 step");
  assert.strictEqual(P.starsFor(3, P.getCase("basics-three")), 2, "a case definition works as the step count (5 steps)");
});

test("progress: XP, max XP and total XP (unknown ids are ignored)", () => {
  const { P } = makeEngine();
  const easy = P.getCase("basics-one"), medium = P.getCase("basics-three"), hard = P.getCase("rhythm-one");
  assert.deepStrictEqual([3, 2, 1, 0].map((s) => P.xpFor(easy, s)), [10, 7, 3, 0]);
  assert.deepStrictEqual([3, 2, 1].map((s) => P.xpFor(medium, s)), [20, 13, 7]);
  assert.deepStrictEqual([3, 2, 1].map((s) => P.xpFor(hard, s)), [30, 20, 10]);
  assert.strictEqual(P.xpFor("coronary-two", 3), 30);
  assert.strictEqual(P.xpFor("no-such-case", 3), 0);
  assert.strictEqual(P.xpFor(easy, 9), 10, "stars are capped at 3");
  assert.strictEqual(P.maxXp(), 120);
  assert.deepStrictEqual(plain(P.DIFFICULTY_XP), { easy: 10, medium: 20, hard: 30 });
  const prof = profileWith({ "basics-one": solved(3), "basics-three": solved(2), "vessels-ghost": solved(3), "rhythm-one": { solved: false, bestStars: 3 } });
  assert.strictEqual(P.totalXp(prof), 10 + 13);
  assert.strictEqual(P.totalXp(null), 0);
  assert.strictEqual(P.totalXp({ cases: "nope" }), 0);
});

test("progress: ranks by share of the maximum XP", () => {
  const { P } = makeEngine();
  assert.deepStrictEqual(plain(P.RANKS), [
    { title: "Student Clinician", share: 0 }, { title: "Rookie Investigator", share: 0.1 }, { title: "Case Detective", share: 0.3 },
    { title: "Senior Detective", share: 0.55 }, { title: "Chief Cardiac Detective", share: 0.8 },
  ]);
  assert.ok(Object.isFrozen(P.RANKS) && Object.isFrozen(P.RANKS[0]));
  const at = (xp, max) => P.rankFor(xp, max).title;
  // max 120: 12, 36, 66, 96
  assert.deepStrictEqual([0, 11, 12, 35, 36, 65, 66, 95, 96, 120].map((x) => P.rankFor(x).index), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  // 55 % of 700 is exactly 385 (0.55 × 700 is 385.00000000000006 in floating point)
  assert.deepStrictEqual([384, 385].map((x) => at(x, 700)), ["Case Detective", "Senior Detective"]);
  // 690 (the planned 34 cases): 69, 207, 380 (379.5), 552
  assert.deepStrictEqual([68, 69, 206, 207, 379, 380, 551, 552].map((x) => P.rankFor(x, 690).index), [0, 1, 1, 2, 2, 3, 3, 4]);
  const r = P.rankFor(24);
  assert.deepStrictEqual(plain(r), { index: 1, title: "Rookie Investigator", minXp: 12, nextTitle: "Case Detective", nextXp: 36, fraction: 0.5, share: 0.1, maxXp: 120 });
  const top = P.rankFor(120);
  assert.deepStrictEqual([top.title, top.nextTitle, top.nextXp, top.fraction], ["Chief Cardiac Detective", null, null, 1]);
  assert.strictEqual(P.rankFor(-5).index, 0);
  assert.deepStrictEqual(plain(P.rankFor(0, 0)), { index: 0, title: "Student Clinician", minXp: 0, nextTitle: "Rookie Investigator", nextXp: 1, fraction: 0, share: 0, maxXp: 0 });
});

test("progress: unlock rules (every unit open; case k needs k−1; unlockAll)", () => {
  const { P, CCF } = makeEngine();
  const fresh = profileWith({});
  assert.deepStrictEqual(FAKE_IDS.map((id) => P.isUnlocked(fresh, id)), [true, false, false, true, false, true]);
  assert.strictEqual(P.isUnlocked(fresh, "no-such-case"), false);
  assert.strictEqual(P.isUnlocked(null, "basics-one"), true);
  const one = profileWith({ "basics-one": solved(1) });
  assert.deepStrictEqual(FAKE_IDS.map((id) => P.isUnlocked(one, id)), [true, true, false, true, false, true]);
  // Solved (e.g. imported or with unlock=all) and in-progress cases stay open.
  const odd = profileWith({ "basics-three": solved(2), "coronary-two": busy("2026-11-01T10:00:00.000Z") });
  assert.deepStrictEqual(FAKE_IDS.map((id) => P.isUnlocked(odd, id)), [true, false, true, true, true, true]);
  assert.deepStrictEqual(FAKE_IDS.map((id) => P.caseState(odd, id)), ["open", "locked", "solved", "open", "in-progress", "open"]);
  assert.strictEqual(P.caseState(odd, "nope"), null);
  CCF.config.unlockAll = true;
  assert.ok(FAKE_IDS.every((id) => P.isUnlocked(fresh, id)));
  assert.strictEqual(P.isUnlocked(fresh, "no-such-case"), false);
  CCF.config.unlockAll = false;
  // ?unlock=all through the URL.
  const e = makeEngine({ search: "?unlock=all" });
  assert.ok(FAKE_IDS.every((id) => e.P.isUnlocked(null, id)));
});

test("progress: unit stats, overall stats and the report", () => {
  const { P } = makeEngine();
  const prof = profileWith({
    "basics-one": solved(3, { firstSolvedAt: "2026-10-01T09:00:00.000Z", lastPlayedAt: "2026-10-02T09:00:00.000Z", plays: 2, bestStrikes: 0 }),
    "basics-two": solved(1, { bestStrikes: 5 }),
    "coronary-one": busy("2026-11-01T10:00:00.000Z"),
    "vessels-ghost": solved(3),
  });
  assert.deepStrictEqual(plain(P.unitStats(prof, "basics")), { solved: 2, total: 3, stars: 4, maxStars: 9, inProgress: 0, xp: 13, maxXp: 40, complete: false });
  assert.deepStrictEqual(plain(P.unitStats(prof, "coronary")), { solved: 0, total: 2, stars: 0, maxStars: 6, inProgress: 1, xp: 0, maxXp: 50, complete: false });
  assert.deepStrictEqual(plain(P.unitStats(prof, "vessels")), { solved: 0, total: 0, stars: 0, maxStars: 0, inProgress: 0, xp: 0, maxXp: 0, complete: false });
  assert.deepStrictEqual(plain(P.unitStats(prof, "nope")), plain(P.unitStats(prof, "vessels")));
  assert.deepStrictEqual(plain(P.overall(prof)), { solved: 2, total: 6, stars: 4, maxStars: 18, xp: 13, complete: false, maxXp: 120, inProgress: 1, percent: 33 });
  const all = profileWith(Object.fromEntries(FAKE_IDS.map((id) => [id, solved(3)])));
  assert.deepStrictEqual(plain(P.overall(all)), { solved: 6, total: 6, stars: 18, maxStars: 18, xp: 120, complete: true, maxXp: 120, inProgress: 0, percent: 100 });
  assert.strictEqual(P.unitStats(all, "basics").complete, true);
  const rep = plain(P.report(prof));
  assert.strictEqual(rep.name, "Test");
  assert.strictEqual(rep.rank.title, "Rookie Investigator");
  assert.deepStrictEqual(rep.units.map((u) => [u.id, u.cases.length]), [["basics", 3], ["coronary", 2], ["rhythm", 1], ["pump", 0], ["pressure", 0], ["vessels", 0]]);
  assert.deepStrictEqual(rep.units[0].cases[0], {
    id: "basics-one", number: "1.1", title: "Case basics-one", difficulty: "easy", patient: "Test Patient", state: "solved",
    solved: true, stars: 3, bestStrikes: 0, plays: 2, xp: 10, firstSolvedAt: "2026-10-01T09:00:00.000Z", lastPlayedAt: "2026-10-02T09:00:00.000Z",
    inProgress: false, unlocked: true,
  });
  assert.deepStrictEqual([rep.units[1].cases[0].number, rep.units[1].cases[0].state, rep.units[0].cases[2].state], ["2.1", "in-progress", "open"]);
});

test("progress: nextCase (in progress first, then the first unlocked unsolved) and nextAfter", () => {
  const { P } = makeEngine();
  assert.strictEqual(P.nextCase(profileWith({})).id, "basics-one");
  assert.strictEqual(P.nextCase(profileWith({ "basics-one": solved(2) })).id, "basics-two");
  const two = profileWith({ "basics-one": solved(2), "coronary-one": busy("2026-11-01T10:00:00.000Z"), "rhythm-one": busy("2026-11-02T10:00:00.000Z") });
  assert.strictEqual(P.nextCase(two).id, "rhythm-one", "the most recently played case in progress");
  const allBasics = profileWith({ "basics-one": solved(2), "basics-two": solved(3), "basics-three": solved(1) });
  assert.strictEqual(P.nextCase(allBasics).id, "coronary-one");
  const replay = profileWith(Object.fromEntries(FAKE_IDS.map((id) => [id, solved(2)])));
  assert.strictEqual(P.nextCase(replay), null, "everything is solved");
  replay.cases["basics-two"].current = { step: 1 };
  replay.cases["basics-two"].lastPlayedAt = "2026-11-02T10:00:00.000Z";
  assert.strictEqual(P.nextCase(replay).id, "basics-two", "a replay in progress when nothing else is left");
  const replayAndNew = profileWith({ "basics-one": solved(3, { current: { step: 2 }, lastPlayedAt: "2026-11-02T10:00:00.000Z" }) });
  assert.strictEqual(P.nextCase(replayAndNew).id, "basics-two", "unsolved cases come before a replay");
  // "Next case" after closing a case.
  assert.strictEqual(P.nextAfter(profileWith({ "basics-one": solved(2) }), "basics-one").id, "basics-two");
  assert.strictEqual(P.nextAfter(allBasics, "basics-three").id, "coronary-one");
  assert.strictEqual(P.nextAfter(profileWith({ "basics-two": solved(2) }), "basics-two").id, "basics-three", "the next one in the unit");
  assert.strictEqual(P.nextAfter(replay, "basics-two"), null, "never the case just closed");
  assert.strictEqual(P.nextAfter(profileWith({}), "nope").id, "basics-one");
});

test("progress: no content and broken profiles never throw", () => {
  const { P } = makeEngine({ content: false, files: ["js/config.js", "js/engine/scorm.js", "js/engine/save.js", "js/engine/progress.js"] });
  assert.strictEqual(P.maxXp(), 0);
  assert.deepStrictEqual(plain(P.overall(null)), { solved: 0, total: 0, stars: 0, maxStars: 0, xp: 0, complete: false, maxXp: 0, inProgress: 0, percent: 0 });
  assert.deepStrictEqual(plain(P.unitStats(null, "basics")), { solved: 0, total: 0, stars: 0, maxStars: 0, inProgress: 0, xp: 0, maxXp: 0, complete: false });
  assert.strictEqual(P.isUnlocked(null, "basics-one"), false);
  assert.strictEqual(P.nextCase(undefined), null);
  assert.deepStrictEqual(plain(P.report(null)).units, []);
  const e = makeEngine();
  for (const bad of [null, undefined, 5, "x", [], { cases: null }, { cases: [] }, { cases: { "basics-one": "nope", "basics-two": null, "coronary-one": { solved: "yes", bestStars: "x" } } }]) {
    assert.strictEqual(e.P.overall(bad).solved, 0);
    assert.strictEqual(e.P.nextCase(bad).id, "basics-one");
    e.P.report(bad);
    e.P.unitStats(bad, "basics");
  }
  assert.strictEqual(e.P.bestStars({ cases: { "basics-one": { solved: true, bestStars: "lots" } } }, "basics-one"), 1);
});

// ---------------------------------------------------------------------------
// CCF.Save — local mode
// ---------------------------------------------------------------------------

const slotJSON = (storage, n) => JSON.parse(storage.getItem("cardiac-case-files:slot:" + n));

test("save: init, new profile, slots, copies and reload", () => {
  const storage = makeLocalStorage();
  let e = makeEngine({ storage });
  assert.deepStrictEqual(plain(e.S.init()), { mode: "local", storageOk: true, warning: null, learnerName: null, scormMissing: false, pending: false, scormVersion: null });
  const S = e.S;
  assert.strictEqual(S.isScorm(), false);
  assert.strictEqual(S.storageWarning(), null);
  assert.deepStrictEqual(plain(S.listSlots()), [0, 1, 2].map((slot) => ({ slot, empty: true, damaged: false, summary: null })));
  assert.strictEqual(S.current(), null);
  assert.strictEqual(S.currentSlot(), null);
  assert.strictEqual(S.lastSlot(), null);
  const p = S.newProfile(1, "  Jane\u0007 \n Doe‮ ");
  assert.strictEqual(p.name, "Jane Doe");
  assert.deepStrictEqual(Object.keys(p), ["v", "id", "name", "createdAt", "updatedAt", "settings", "seen", "cases", "drills"]);
  assert.deepStrictEqual(plain(p.settings), { sound: true, reduceMotion: false, textSize: "md" });
  assert.strictEqual(p.v, 1);
  assert.strictEqual(p.createdAt, new Date(START).toISOString());
  assert.strictEqual(S.currentSlot(), 1);
  assert.strictEqual(S.lastSlot(), 1);
  assert.strictEqual(storage.getItem("cardiac-case-files:lastSlot"), "1");
  assert.strictEqual(slotJSON(storage, 1).name, "Jane Doe");
  // Copies: changing what the API returned changes nothing.
  p.name = "Hacked";
  p.cases["basics-one"] = { solved: true, bestStars: 3 };
  const again = S.current();
  assert.strictEqual(again.name, "Jane Doe");
  assert.deepStrictEqual(plain(again.cases), {});
  assert.notStrictEqual(S.current(), S.current());
  const slots = plain(S.listSlots());
  assert.deepStrictEqual([slots[0].empty, slots[1].empty, slots[2].empty], [true, false, true]);
  assert.deepStrictEqual(slots[1].summary, {
    name: "Jane Doe", rankTitle: "Student Clinician", solved: 0, total: 6, stars: 0, updatedAt: again.updatedAt,
    rankIndex: 0, xp: 0, maxXp: 120, maxStars: 18, inProgress: 0, createdAt: again.createdAt, id: again.id,
  });
  assert.deepStrictEqual(plain(S.summary()), slots[1].summary);
  S.recordSolve("basics-one", { strikes: 0, hints: 0, stepCount: 3 });

  // "Reload the page": a new engine with the same storage.
  e = makeEngine({ storage });
  e.S.init();
  assert.strictEqual(e.S.current(), null, "nothing is loaded until the player picks a slot");
  assert.strictEqual(e.S.lastSlot(), 1);
  assert.strictEqual(e.S.listSlots()[1].summary.solved, 1);
  const loaded = e.S.load(1);
  assert.strictEqual(loaded.name, "Jane Doe");
  assert.strictEqual(loaded.cases["basics-one"].bestStars, 3);
  assert.strictEqual(e.S.load(0), null, "an empty slot");
  assert.strictEqual(e.S.currentSlot(), 1, "a failed load keeps the current profile");
  assert.strictEqual(e.S.load(7), null);
  assert.strictEqual(e.S.newProfile(3, "x"), null, "slots are 0..2");
  assert.ok(e.logs.some((l) => /slot from 1 to 3/.test(l)));
  assert.strictEqual(e.S.newProfile(-1, "x"), null);
  assert.strictEqual(e.S.newProfile("2", "\u0000‮  ").name, "Clinician", "a numeric string slot; an empty name gets the default");
  assert.strictEqual(e.S.currentSlot(), 2);
  assert.strictEqual(e.S.newProfile(0, "x".repeat(60)).name.length, 40);
  assert.strictEqual(e.S.init().mode, "local", "init() can be called again");
});

test("save: in-progress state survives a reload; clearing it", () => {
  const storage = makeLocalStorage();
  let e = makeEngine({ storage });
  e.S.init();
  e.S.newProfile(0, "Ada");
  const state = { step: 2, strikes: 1, hints: 1, answers: [{ step: "s1", tries: [2, 0] }, { step: "s2", tries: [1], hint: 1 }], seed: 12345, note: "Zoë ✓" };
  assert.strictEqual(e.S.saveCaseProgress("coronary-two", state), true);
  state.step = 99;                                      // the stored copy is not the caller's object
  let rec = plain(e.S.caseRecord("coronary-two"));
  assert.deepStrictEqual(rec, { solved: false, bestStars: 0, bestStrikes: null, xp: 0, plays: 0, firstSolvedAt: null, lastPlayedAt: new Date(START).toISOString(), current: Object.assign({}, state, { step: 2 }) });
  e.timers.advance(5000);
  assert.strictEqual(e.S.saveCaseProgress("coronary-two", { step: 3, strikes: 1, hints: 1, answers: [] }), true);
  assert.strictEqual(e.S.caseRecord("coronary-two").lastPlayedAt, new Date(START + 5000).toISOString());
  assert.strictEqual(e.P.nextCase(e.S.current()).id, "coronary-two");
  assert.strictEqual(e.S.caseRecord("basics-one"), null, "never played");

  e = makeEngine({ storage });
  e.S.init();
  e.S.load(e.S.lastSlot());
  assert.deepStrictEqual(plain(e.S.caseRecord("coronary-two").current), { step: 3, strikes: 1, hints: 1, answers: [] });
  // Things that can't be stored are refused, and the saved state stays.
  const circular = { step: 1 }; circular.self = circular;
  for (const bad of ["step 2", [1, 2], 42, circular, { big: "x".repeat(9000) }]) {
    assert.strictEqual(e.S.saveCaseProgress("coronary-two", bad), false);
  }
  assert.strictEqual(e.S.caseRecord("coronary-two").current.step, 3);
  assert.strictEqual(e.S.saveCaseProgress("not a valid id!", { step: 1 }), false);
  assert.strictEqual(e.S.saveCaseProgress("__proto__", { step: 1 }), false);
  assert.strictEqual(e.S.saveCaseProgress("constructor", { step: 1 }), false);
  // Prototype keys inside the payload are dropped.
  e.S.saveCaseProgress("basics-two", JSON.parse('{"step":1,"__proto__":{"polluted":true},"nested":{"constructor":{"x":1},"ok":[1,{"prototype":2}]}}'));
  assert.deepStrictEqual(plain(e.S.caseRecord("basics-two").current), { step: 1, nested: { ok: [1, {}] } });
  assert.strictEqual(e.run("({}).polluted"), undefined);
  // Clearing.
  assert.strictEqual(e.S.clearCaseProgress("coronary-two"), true);
  assert.strictEqual(e.S.caseRecord("coronary-two").current, null);
  assert.strictEqual(e.S.clearCaseProgress("rhythm-one"), true, "nothing to clear is fine");
  assert.strictEqual(e.S.caseRecord("rhythm-one"), null);
  e.S.saveCaseProgress("rhythm-one", { step: 1 });
  assert.strictEqual(e.S.saveCaseProgress("rhythm-one", null), true, "null clears");
  assert.strictEqual(e.S.caseRecord("rhythm-one").current, null);
  assert.strictEqual(slotJSON(storage, 0).cases["coronary-two"].current, null, "persisted at once");
  // A case the content doesn't know yet can still be saved (content may grow).
  assert.strictEqual(e.S.saveCaseProgress("vessels-future-case", { step: 1 }), true);
  e.S.clearCaseProgress("basics-two");
  assert.strictEqual(e.P.nextCase(e.S.current()).id, "basics-one", "…but it is never offered");
});

test("save: recordSolve — stars, XP, replays keep the best, rank-ups", () => {
  const e = makeEngine();
  e.S.init();
  e.S.newProfile(0, "Ada");
  const S = e.S;
  S.saveCaseProgress("basics-one", { step: 2, strikes: 1, hints: 0, answers: [] });
  let r = plain(S.recordSolve("basics-one", { strikes: 1, hints: 0, stepCount: 3 }));
  assert.deepStrictEqual(r, {
    stars: 2, firstSolve: true, improved: true, xpGained: 7, totalXp: 7, rankUp: null,
    caseId: "basics-one", bestStars: 2, previousStars: 0, strikes: 1, xp: 7, rank: plain(e.P.rankFor(7)),
  });
  const t0 = new Date(START).toISOString();
  assert.deepStrictEqual(plain(S.caseRecord("basics-one")), { solved: true, bestStars: 2, bestStrikes: 1, xp: 7, plays: 1, firstSolvedAt: t0, lastPlayedAt: t0, current: null });

  e.timers.advance(60000);
  r = plain(S.recordSolve("basics-one", { strikes: 3, hints: 1, stepCount: 3 }));
  assert.deepStrictEqual([r.stars, r.firstSolve, r.improved, r.xpGained, r.totalXp, r.rankUp, r.bestStars], [1, false, false, 0, 7, null, 2], "a worse replay");
  let rec = S.caseRecord("basics-one");
  assert.deepStrictEqual([rec.bestStars, rec.bestStrikes, rec.plays, rec.firstSolvedAt, rec.lastPlayedAt], [2, 1, 2, t0, new Date(START + 60000).toISOString()]);

  r = plain(S.recordSolve("basics-one", { strikes: 0, hints: 0, stepCount: 3 }));
  assert.deepStrictEqual([r.stars, r.improved, r.xpGained, r.totalXp, r.rankUp], [3, true, 3, 10, null], "only the difference is added");
  assert.deepStrictEqual([S.caseRecord("basics-one").bestStrikes, S.caseRecord("basics-one").xp], [0, 10]);
  r = plain(S.recordSolve("basics-one", { strikes: 0, hints: 0, stepCount: 3 }));
  assert.deepStrictEqual([r.stars, r.improved, r.xpGained, r.totalXp], [3, false, 0, 10]);

  // Rank up: 10 + 7 = 17 ≥ 12.
  r = plain(S.recordSolve("basics-two", { strikes: 2, stepCount: 4 }));
  assert.deepStrictEqual([r.stars, r.xpGained, r.totalXp], [2, 7, 17]);
  assert.deepStrictEqual(r.rankUp, { from: "Student Clinician", to: "Rookie Investigator", fromIndex: 0, toIndex: 1 });
  assert.strictEqual(r.rank.title, "Rookie Investigator");
  // Fewer strikes for the same stars is an improvement, but no XP.
  r = plain(S.recordSolve("basics-two", { strikes: 1, stepCount: 4 }));
  assert.deepStrictEqual([r.stars, r.improved, r.xpGained, r.rankUp, S.caseRecord("basics-two").bestStrikes], [2, true, 0, null, 1]);

  // strikes can't be lower than hints; the step count comes from the content when missing.
  r = plain(S.recordSolve("basics-three", { strikes: 0, hints: 4 }));
  assert.deepStrictEqual([r.stars, r.strikes], [1, 4], "5 steps: up to 3 strikes for 2 stars");
  r = plain(S.recordSolve("coronary-one", { strikes: 2 }));
  assert.strictEqual(r.stars, 2, "4 steps from the content");
  // A jump over two ranks.
  r = plain(S.recordSolve("coronary-two", { strikes: 0, stepCount: 6 }));
  assert.strictEqual(r.totalXp, 10 + 7 + 7 + 13 + 30);
  assert.deepStrictEqual(r.rankUp, { from: "Case Detective", to: "Senior Detective", fromIndex: 2, toIndex: 3 });

  // Solving clears the in-progress state.
  assert.strictEqual(S.caseRecord("basics-one").current, null);
  // A case the content doesn't know: recorded, no XP, stats unchanged.
  r = plain(S.recordSolve("vessels-future-case", { strikes: 0, stepCount: 4 }));
  assert.deepStrictEqual([r.stars, r.firstSolve, r.xpGained, r.totalXp], [3, true, 0, 67]);
  assert.strictEqual(e.P.overall(S.current()).solved, 5);
  assert.strictEqual(S.caseRecord("vessels-future-case").solved, true);
  // Junk is refused without throwing.
  assert.deepStrictEqual(plain(S.recordSolve("__proto__", { strikes: 0 })), { stars: 0, firstSolve: false, improved: false, xpGained: 0, totalXp: 67, rankUp: null });
  assert.strictEqual(Object.prototype.hasOwnProperty.call(S.current().cases, "__proto__"), false);
  assert.strictEqual(S.recordSolve("rhythm-one", "garbage").stars, 3, "bad details: 0 strikes");
  const none = makeEngine();
  assert.deepStrictEqual(plain(none.S.recordSolve("basics-one", { strikes: 0 })), { stars: 0, firstSolve: false, improved: false, xpGained: 0, totalXp: 0, rankUp: null });
});

test("save: settings, seen flags, rename and drills", () => {
  const storage = makeLocalStorage();
  const e = makeEngine({ storage });
  e.S.init();
  const S = e.S;
  // Before any profile: settings are kept for the session and given to the next new profile.
  assert.deepStrictEqual(plain(S.settings()), { sound: true, reduceMotion: false, textSize: "md" });
  assert.deepStrictEqual(plain(S.setSetting("textSize", "lg")), { sound: true, reduceMotion: false, textSize: "lg" });
  assert.deepStrictEqual(plain(S.recordDrill("rhythm", 4)), { best: 4, isBest: true, played: 1 });
  S.newProfile(0, "Ada");
  assert.strictEqual(S.settings().textSize, "lg");
  assert.deepStrictEqual(plain(S.current().drills), {}, "drills played before a profile are not saved");
  assert.deepStrictEqual(plain(S.setSetting("sound", false)), { sound: false, reduceMotion: false, textSize: "lg" });
  for (const [k, v] of [["sound", "no"], ["reduceMotion", 1], ["textSize", "<b>huge</b>"], ["textSize", ""], ["bogus key!", 1], ["__proto__", true], ["constructor", 1], ["toString", 1], ["note", "x".repeat(41)], ["note", { a: 1 }], [5, true]]) {
    S.setSetting(k, v);
  }
  assert.deepStrictEqual(plain(S.settings()), { sound: false, reduceMotion: false, textSize: "lg" }, "invalid settings are ignored");
  S.setSetting("highContrast", true);
  S.setSetting({ reduceMotion: true, volume: 0.5, theme: "dark", "bad key": 1 });
  assert.deepStrictEqual(plain(S.settings()), { sound: false, reduceMotion: true, textSize: "lg", highContrast: true, volume: 0.5, theme: "dark" });
  S.setSetting("theme", null);
  assert.strictEqual(S.settings().theme, undefined, "null removes an extra setting");
  assert.deepStrictEqual(slotJSON(storage, 0).settings, { sound: false, reduceMotion: true, textSize: "lg", highContrast: true, volume: 0.5 });
  // A new profile takes the current profile's settings.
  S.newProfile(1, "Bo");
  assert.strictEqual(S.settings().reduceMotion, true);
  S.load(0);
  // Seen flags.
  assert.strictEqual(S.hasSeen("intro"), false);
  assert.strictEqual(S.markSeen("intro"), true);
  assert.strictEqual(S.markSeen("unit:coronary:drawer-tip"), true);
  assert.strictEqual(S.hasSeen("intro"), true);
  for (const key of ["constructor", "toString", "__proto__", "", "a\u0000b", "x".repeat(101), null, 7]) {
    assert.strictEqual(S.markSeen(key), false, String(key));
    assert.strictEqual(S.hasSeen(key), false, String(key));
  }
  assert.deepStrictEqual(slotJSON(storage, 0).seen, { intro: true, "unit:coronary:drawer-tip": true });
  // Rename.
  assert.strictEqual(S.rename("  Ada \n Lovelace "), "Ada Lovelace");
  assert.strictEqual(S.rename("\u0000 "), "Ada Lovelace", "an empty name keeps the old one");
  assert.strictEqual(S.current().name, "Ada Lovelace");
  // Drills.
  assert.deepStrictEqual(plain(S.recordDrill("rhythm", 5)), { best: 5, isBest: true, played: 1 });
  assert.deepStrictEqual(plain(S.recordDrill("rhythm", 3)), { best: 5, isBest: false, played: 2 });
  assert.deepStrictEqual(plain(S.recordDrill("rhythm", 5)), { best: 5, isBest: false, played: 3 }, "equal is not a new best");
  assert.deepStrictEqual(plain(S.recordDrill("abi", "7")), { best: 7, isBest: true, played: 1 });
  assert.deepStrictEqual(plain(S.recordDrill("bad id!", 3)), { best: 3, isBest: false, played: 0 });
  assert.deepStrictEqual(plain(S.recordDrill("edema", -4)), { best: 0, isBest: false, played: 1 });
  assert.deepStrictEqual(slotJSON(storage, 0).drills, { rhythm: { best: 5, played: 3 }, abi: { best: 7, played: 1 }, edema: { best: 0, played: 1 } });
  // Without a profile nothing is stored.
  const bare = makeEngine();
  assert.strictEqual(bare.S.rename("X"), null);
  assert.strictEqual(bare.S.markSeen("intro"), false);
  assert.strictEqual(bare.S.saveCaseProgress("basics-one", { step: 1 }), false);
  assert.strictEqual(bare.S.exportCode(), "");
  assert.strictEqual(bare.S.caseRecord("basics-one"), null);
});

test("save: deleting a slot and the last-slot pointer", () => {
  const storage = makeLocalStorage();
  const e = makeEngine({ storage });
  e.S.init();
  e.S.newProfile(0, "One");
  e.S.newProfile(2, "Three");
  assert.deepStrictEqual(plain(e.S.listSlots()).map((s) => s.summary && s.summary.name), ["One", null, "Three"]);
  assert.strictEqual(e.S.lastSlot(), 2);
  e.S.load(0);
  assert.strictEqual(e.S.lastSlot(), 0);
  assert.strictEqual(e.S.deleteSlot(2), true);
  assert.strictEqual(e.S.currentSlot(), 0, "deleting another slot keeps the current profile");
  assert.strictEqual(storage.getItem("cardiac-case-files:slot:2"), null);
  assert.strictEqual(e.S.deleteSlot(0), true);
  assert.strictEqual(e.S.current(), null);
  assert.strictEqual(e.S.lastSlot(), null);
  assert.strictEqual(storage.getItem("cardiac-case-files:lastSlot"), null);
  assert.deepStrictEqual(plain(e.S.listSlots()).map((s) => s.empty), [true, true, true]);
  assert.strictEqual(e.S.deleteSlot(5), false);
  assert.strictEqual(e.S.deleteSlot("x"), false);
});

test("save: onChange — types, copies, unsubscribe, nested changes, failing listeners", () => {
  const e = makeEngine();
  e.S.init();
  const S = e.S;
  const seen = [];
  const off = S.onChange((profile, info) => seen.push(info.type + (info.caseId ? ":" + info.caseId : "") + (profile ? "" : "(none)")));
  S.onChange(() => { throw new Error("a broken listener"); });
  S.setSetting("sound", false);
  S.newProfile(0, "Ada");
  S.rename("Ada L");
  S.setSetting("textSize", "sm");
  S.markSeen("intro");
  S.saveCaseProgress("basics-one", { step: 1 });
  S.clearCaseProgress("basics-one");
  S.recordSolve("basics-one", { strikes: 0 });
  S.recordDrill("rhythm", 3);
  S.importCode(S.exportCode(), 1);
  S.load(0);
  S.deleteSlot(1);
  assert.deepStrictEqual(seen, ["settings(none)", "new", "rename", "settings", "seen", "progress:basics-one", "progress:basics-one", "solve:basics-one", "drill", "import", "load", "delete"]);
  assert.ok(e.logs.some((l) => /onChange listener failed/.test(l)));
  // Listeners get copies.
  let got = null;
  S.onChange((p) => { got = p; if (p) p.name = "changed by a listener"; });
  S.markSeen("finale");
  assert.strictEqual(S.current().name, "Ada L");
  assert.strictEqual(got.name, "changed by a listener");
  // A change made inside a listener is announced after the current round, not nested.
  const order = [];
  S.onChange((p, info) => {
    order.push("start " + info.type);
    if (info.type === "seen") S.recordDrill("abi", 1);
    order.push("end " + info.type);
  });
  S.markSeen("tutorial");
  assert.deepStrictEqual(order, ["start seen", "end seen", "start drill", "end drill"]);
  // A listener that keeps changing things can't loop forever.
  S.onChange((p, info) => { if (info.type === "drill") S.recordDrill("loop", 1); });
  S.recordDrill("abi", 2);
  assert.ok(e.logs.some((l) => /notices were dropped/.test(l)));
  off();
  const before = seen.length;
  S.markSeen("another");
  assert.strictEqual(seen.length, before, "unsubscribed");
  assert.strictEqual(typeof S.onChange("not a function"), "function");
});

test("save: blocked storage (private window) keeps working in memory, with a warning", () => {
  for (const storage of ["blocked", null, "unreadable"]) {
    const e = makeEngine({ storage });
    const r = plain(e.S.init());
    assert.deepStrictEqual([r.mode, r.storageOk], ["local", false], String(storage));
    assert.match(r.warning, /blocking saved games.*save code/);
    assert.strictEqual(e.S.storageWarning(), r.warning);
    const p = e.S.newProfile(0, "Ghost");
    e.S.saveCaseProgress("basics-one", { step: 1 });
    e.S.recordSolve("basics-two", { strikes: 0 });
    e.S.markSeen("intro");
    e.fire("pagehide", { persisted: false });
    e.hide();
    assert.strictEqual(e.S.current().id, p.id);
    assert.strictEqual(e.S.listSlots()[0].summary.name, "Ghost");
    assert.strictEqual(e.S.lastSlot(), 0);
    assert.strictEqual(e.S.load(0).cases["basics-two"].solved, true);
    assert.match(e.S.exportCode(), /^CCF1\./);
    assert.strictEqual(e.S.importCode(e.S.exportCode(), 2).ok, true);
    assert.strictEqual(e.S.deleteSlot(2), true);
  }
});

test("save: quota errors keep data in memory, warn, and recover", () => {
  const storage = makeLocalStorage();
  const e = makeEngine({ storage });
  e.S.init();
  const S = e.S;
  const types = [];
  S.onChange((p, info) => types.push(info.type));
  S.newProfile(0, "Full");
  S.newProfile(1, "Other");
  S.load(0);
  storage.failWritesLongerThan = 8;                // nearly full: tiny writes (the pointer) still fit
  S.recordSolve("basics-one", { strikes: 0 });
  assert.match(S.storageWarning(), /storage is full/);
  assert.ok(types.includes("status"), "the warning is announced");
  S.load(1);
  S.load(0);
  assert.match(S.storageWarning(), /storage is full/, "a tiny successful write doesn't clear the warning");
  assert.strictEqual(slotJSON(storage, 0).cases["basics-one"], undefined, "not stored yet");
  assert.strictEqual(S.caseRecord("basics-one").solved, true, "…but kept in memory");
  assert.strictEqual(S.listSlots()[0].summary.solved, 1, "and listed from memory");
  storage.failWritesLongerThan = 0;                // space freed
  e.hide();                                        // hiding the page retries
  assert.strictEqual(S.storageWarning(), null);
  assert.strictEqual(slotJSON(storage, 0).cases["basics-one"].solved, true);
  assert.strictEqual(types.filter((t) => t === "status").length, 2);
  // Storage already full when the game starts.
  const full = makeLocalStorage();
  full.failWrites = true;
  const e2 = makeEngine({ storage: full });
  const r = e2.S.init();
  assert.deepStrictEqual([r.storageOk, /storage is full/.test(r.warning)], [false, true]);
  assert.strictEqual(e2.S.newProfile(0, "Still works").name, "Still works");
});

test("save: corrupt and partly corrupt slots", () => {
  const storage = makeLocalStorage();
  storage.setItem("cardiac-case-files:slot:0", "{not json");
  storage.setItem("cardiac-case-files:slot:1", JSON.stringify({
    v: 1, name: 42, id: "bad id with spaces", createdAt: "yesterday-ish", updatedAt: "2026-10-01T10:00:00Z",
    settings: { sound: "loud", textSize: "lg", "<script>": 1, extra: { nested: 1 } },
    seen: { intro: 1, finale: true, "": true, constructor: true },
    cases: {
      "basics-one": { solved: true, bestStars: 7, bestStrikes: -4, xp: 9999, plays: "3", firstSolvedAt: "2026-09-01T10:00:00Z", lastPlayedAt: 5, current: "nope" },
      "basics-two": { solved: "yes", bestStars: 3, current: { step: 2 } },
      "bad id!": { solved: true }, "rhythm-one": "nope", "__proto__": { solved: true }, "constructor": { solved: true },
      "vessels-from-the-future": { solved: true, bestStars: 2, bestStrikes: 1, xp: 13 },
    },
    drills: { rhythm: { best: "9", played: -1 }, "no good!": { best: 1 }, abi: 5 },
    hack: "<script>",
  }));
  storage.setItem("cardiac-case-files:slot:2", "[1,2,3]");
  storage.setItem("cardiac-case-files:lastSlot", "0");
  const e = makeEngine({ storage });
  e.S.init();
  const slots = plain(e.S.listSlots());
  assert.deepStrictEqual(slots[0], { slot: 0, empty: false, damaged: true, summary: null }, "a damaged save is reported, not shown as empty");
  assert.deepStrictEqual(slots[2], { slot: 2, empty: false, damaged: true, summary: null });
  assert.strictEqual(slots[1].summary.name, "42");
  assert.strictEqual(e.S.lastSlot(), null, "the pointer points at a damaged slot");
  assert.strictEqual(e.S.load(0), null);
  const p = plain(e.S.load(1));
  assert.notStrictEqual(p.id, "bad id with spaces");
  assert.strictEqual(p.updatedAt, "2026-10-01T10:00:00.000Z");
  assert.ok(!isNaN(Date.parse(p.createdAt)));
  assert.deepStrictEqual(p.settings, { sound: true, reduceMotion: false, textSize: "lg" });
  assert.deepStrictEqual(p.seen, { finale: true });
  assert.deepStrictEqual(Object.keys(p.cases).sort(), ["basics-one", "basics-two", "vessels-from-the-future"]);
  assert.deepStrictEqual(p.cases["basics-one"], { solved: true, bestStars: 3, bestStrikes: 0, xp: 10, plays: 3, firstSolvedAt: "2026-09-01T10:00:00.000Z", lastPlayedAt: null, current: null });
  assert.deepStrictEqual(p.cases["basics-two"], { solved: false, bestStars: 0, bestStrikes: null, xp: 0, plays: 0, firstSolvedAt: null, lastPlayedAt: null, current: { step: 2 } });
  assert.strictEqual(p.cases["vessels-from-the-future"].xp, 13, "a case the content doesn't know keeps its stored XP");
  assert.deepStrictEqual(p.drills, { rhythm: { best: 9, played: 0 } });
  assert.strictEqual(p.hack, undefined);
  assert.strictEqual(e.P.overall(p).solved, 1, "unknown ids don't count");
  assert.strictEqual(e.run("({}).polluted"), undefined);
  storage.setItem("cardiac-case-files:lastSlot", "7");
  assert.strictEqual(e.S.lastSlot(), null, "a pointer to no slot");
  // Deleting the damaged slot makes it empty again.
  e.S.deleteSlot(0);
  assert.strictEqual(e.S.listSlots()[0].empty, true);
});

// ---------------------------------------------------------------------------
// Two tabs
// ---------------------------------------------------------------------------

test("save: two tabs on one slot merge instead of erasing each other", () => {
  const storage = makeLocalStorage();
  const A = makeEngine({ storage });
  A.S.init();
  A.S.newProfile(0, "Tester");
  const B = makeEngine({ storage });
  B.S.init();
  B.S.load(0);                                                     // the game opened twice
  A.S.recordSolve("basics-one", { strikes: 1 });                    // tab A closes a case
  B.S.load(0);                                                     // tab B: title → Continue
  assert.strictEqual(B.S.caseRecord("basics-one").solved, true, "load re-reads the slot");
  B.S.saveCaseProgress("coronary-one", { step: 1 });
  assert.strictEqual(slotJSON(storage, 0).cases["basics-one"].solved, true, "tab B's write kept tab A's solve");

  // A stale tab's next write merges what is stored first.
  A.S.recordSolve("basics-one", { strikes: 0 });
  assert.strictEqual(slotJSON(storage, 0).cases["coronary-one"].current.step, 1);
  assert.strictEqual(slotJSON(storage, 0).cases["basics-one"].bestStars, 3);

  // A storage event brings the other tab's changes in at once.
  const seen = [];
  B.S.onChange((p, info) => seen.push(info.type));
  B.fire("storage", { key: "cardiac-case-files:slot:0" });
  assert.deepStrictEqual(seen, ["sync"]);
  assert.strictEqual(B.S.caseRecord("basics-one").bestStars, 3);
  B.fire("storage", { key: "cardiac-case-files:slot:2" });
  assert.deepStrictEqual(seen, ["sync", "slots"], "another slot changed");
  B.fire("storage", { key: "something-else" });
  assert.deepStrictEqual(seen, ["sync", "slots"], "other keys are ignored");
  B.fire("storage", { key: null });                                // another tab cleared the storage
  assert.deepStrictEqual(seen, ["sync", "slots"], "nothing to merge");
  assert.strictEqual(B.S.current().name, "Tester", "this tab keeps its profile (and writes it back next time)");

  // The in-progress state follows whichever tab played more recently.
  A.timers.advance(10000);
  A.S.saveCaseProgress("coronary-one", { step: 3 });               // A moves on…
  B.timers.advance(5000);
  B.S.markSeen("intro");                                           // …while B (stale) writes something else
  assert.strictEqual(slotJSON(storage, 0).cases["coronary-one"].current.step, 3, "A's newer progress wins");
  B.timers.advance(20000);
  B.S.clearCaseProgress("coronary-one");                           // B restarts the case later
  A.S.markSeen("finale");
  assert.strictEqual(slotJSON(storage, 0).cases["coronary-one"].current, null, "a newer clear wins too");
  assert.strictEqual(A.S.caseRecord("coronary-one").current, null);

  // Names and settings follow the tab that changed them.
  B.S.rename("Renamed in B");
  A.S.setSetting("sound", false);
  const merged = slotJSON(storage, 0);
  assert.deepStrictEqual([merged.name, merged.settings.sound, merged.seen.intro, merged.seen.finale], ["Renamed in B", false, true, true]);
  assert.strictEqual(A.S.current().name, "Renamed in B");

  // Another tab starts a new game in the slot: this tab follows it.
  B.S.newProfile(0, "New Player");
  A.fire("storage", { key: "cardiac-case-files:slot:0" });
  assert.strictEqual(A.S.current().name, "New Player");
  assert.strictEqual(A.S.caseRecord("basics-one"), null);
});

// ---------------------------------------------------------------------------
// Save codes
// ---------------------------------------------------------------------------

test("save: save codes round-trip everything (compact, checksummed)", () => {
  const e = makeEngine();
  e.S.init();
  const S = e.S;
  S.newProfile(0, "Zoë 李 O'Brien-Smith");
  S.recordSolve("basics-one", { strikes: 1 });
  e.timers.advance(3 * 3600000);
  S.recordSolve("basics-one", { strikes: 3 });
  S.recordSolve("coronary-two", { strikes: 0 });
  S.saveCaseProgress("rhythm-one", { step: 3, strikes: 2, hints: 1, answers: [{ s: "s1", picked: [2, 0] }, { s: "s2", text: "5.0 L/min" }], note: "ünïcödé ✓ | , . : %" });
  S.recordSolve("vessels-from-the-future", { strikes: 2, stepCount: 4 });
  S.markSeen("intro");
  S.markSeen("tip: the casebook | drawer");
  S.setSetting({ sound: false, textSize: "xl", highContrast: true });
  S.recordDrill("rhythm", 12);
  S.recordDrill("rhythm", 4);
  S.recordDrill("abi", 3);
  const before = plain(S.current());
  const code = S.exportCode();
  assert.match(code, /^CCF1\.[A-Za-z0-9_-]+\.[0-9a-z]{6}$/);
  assert.ok(code.length < 800, "compact: " + code.length + " characters");

  const res = S.importCode("  \"" + code.slice(0, 50) + "\n  " + code.slice(50) + ".\"  ", 2);
  assert.strictEqual(res.ok, true, res.error);
  const after = plain(res.profile);
  assert.strictEqual(S.currentSlot(), 2, "the import becomes the current profile");
  assert.deepStrictEqual(plain(S.current()), after);
  assert.strictEqual(after.id, before.id);
  assert.strictEqual(after.name, before.name);
  assert.strictEqual(after.createdAt, minute(before.createdAt));
  assert.deepStrictEqual(after.settings, before.settings);
  assert.deepStrictEqual(after.seen, before.seen);
  assert.deepStrictEqual(after.drills, before.drills);
  const roundedCases = JSON.parse(JSON.stringify(before.cases));
  for (const rec of Object.values(roundedCases)) {
    if (rec.firstSolvedAt) rec.firstSolvedAt = minute(rec.firstSolvedAt);
    if (rec.lastPlayedAt) rec.lastPlayedAt = minute(rec.lastPlayedAt);
  }
  assert.deepStrictEqual(after.cases, roundedCases, "every case record, times to the minute");
  assert.strictEqual(after.cases["vessels-from-the-future"].solved, true, "unknown ids are kept");
  assert.strictEqual(e.P.overall(after).solved, 2, "…but don't count");
  // Exporting the import gives the same code (apart from the update time).
  const again = S.exportCode();
  const unpack = (c) => Buffer.from(c.split(".")[1], "base64url").toString("utf8").split("|").map((part, i) => (i === 1 ? part.split(".").slice(0, 2).join(".") : part));
  assert.deepStrictEqual(unpack(again), unpack(code));
  // Lower-case prefix and a code without the trailing dot also work.
  assert.strictEqual(S.importCode("ccf1." + code.slice(5), 1).ok, true);
  assert.strictEqual(S.load(1).name, before.name);
  // previewCode reads without importing.
  const preview = plain(S.previewCode(code));
  assert.deepStrictEqual([preview.ok, preview.summary.name, preview.summary.solved, preview.summary.total], [true, before.name, 2, 6]);
  assert.strictEqual(S.currentSlot(), 1);
});

test("save: importCode refuses junk with a message for the player, and changes nothing", () => {
  const e = makeEngine();
  e.S.init();
  const S = e.S;
  S.newProfile(0, "Ada");
  S.recordSolve("basics-one", { strikes: 0 });
  const good = S.exportCode();
  const payload = good.split(".")[1];
  const flipped = good.slice(0, 20) + (good[20] === "A" ? "B" : "A") + good.slice(21);
  const withCheck = (text) => { const p = Buffer.from(text).toString("base64url"); return "CCF1." + p + "." + S._hash6(p); };
  const cases = [
    ["", /Paste a save code/],
    [null, /Paste a save code/],
    [undefined, /Paste a save code/],
    ["   \n ", /Paste a save code/],
    ["hello there", /doesn't look like a save code/],
    ["PYRO1." + payload, /save code for Pyromancer/],
    ["SNS1.abcd", /save code for Pyromancer/],
    ["ABC1.abcd.123456", /doesn't look like a save code/],
    ["CCF2." + payload + ".abcdef", /newer version/],
    ["CCF0." + payload, /doesn't look like a save code/],
    ["CCF1." + payload, /damaged or incomplete/],
    [flipped, /damaged or incomplete/],
    [good.slice(0, good.length - 20) + good.slice(-7), /damaged or incomplete/],
    [good.slice(0, -1), /damaged or incomplete/],
    ["CCF1.!!!!." + S._hash6("!!!!"), /damaged or incomplete/],
    [withCheck("not a packed profile"), /damaged or incomplete/],
    [withCheck("C9|x|y|z|w|v|u|t"), /damaged or incomplete/],
    [withCheck("C1|short"), /damaged or incomplete/],
    ["CCF1." + "A".repeat(400001), /far too long/],
    [{ toString() { return good.slice(0, 30); } }, /damaged or incomplete/],
  ];
  for (const [input, message] of cases) {
    const r = plain(S.importCode(input, 1));
    assert.strictEqual(r.ok, false, String(input).slice(0, 40));
    assert.match(r.error, message, String(input).slice(0, 40) + " → " + r.error);
    assert.strictEqual(plain(S.previewCode(input)).ok, false);
  }
  assert.match(plain(S.importCode(good, 3)).error, /slot from 1 to 3/);
  assert.match(plain(S.importCode(good, "x")).error, /slot from 1 to 3/);
  assert.strictEqual(S.currentSlot(), 0, "failed imports change nothing");
  assert.deepStrictEqual(plain(S.listSlots()).map((s) => s.empty), [false, true, true]);
  assert.ok(!e.logs.some((l) => /internal error|importCode failed/.test(l)), e.logs.join("\n"));
});

test("save: imported codes are sanitised (bad entries skipped, names cleaned, no prototype keys)", () => {
  const e = makeEngine();
  e.S.init();
  const S = e.S;
  const packed = [
    "C1",
    "evil id!.zzzzzzzzzzz.1",
    encodeURIComponent("\u0007Mallory‮ the Destroyer of Worlds and Everything Else Too"),
    "3.%3Cb%3E." + Buffer.from(JSON.stringify({ "__proto__": 1, theme: "dark", huge: "x".repeat(100) })).toString("base64url"),
    ["intro", "constructor", "%E0%A4%A", "__proto__"].join("."),
    ["basics-one:7.0.2", "basics-two:9", "__proto__:7", "constructor:7", "toString:3", "coronary-one:3.zz.zz.zz", "rhythm-one:6", "bad id!:7", "vessels-x:1.1"].join(","),
    ["basics-two:" + Buffer.from(JSON.stringify({ step: 1, "__proto__": { polluted: 1 } })).toString("base64url"), "coronary-two:!!!", "rhythm-one:" + Buffer.from("[1,2]").toString("base64url")].join(","),
    ["rhythm:5.2", "constructor:1", "abi:zzzzzzzzz", "edema:3.4.5"].join(","),
  ].join("|");
  const p64 = Buffer.from(packed).toString("base64url");
  const r = S.importCode("CCF1." + p64 + "." + S._hash6(p64), 0);
  assert.strictEqual(r.ok, true, r.error);
  const p = plain(r.profile);
  assert.strictEqual(p.name, "Mallory the Destroyer of Worlds and Ever");
  assert.ok(/^p/.test(p.id) && p.id !== "evil id!");
  assert.deepStrictEqual(p.settings, { sound: true, reduceMotion: true, textSize: "md", theme: "dark" });
  assert.deepStrictEqual(p.seen, { intro: true });
  assert.deepStrictEqual(Object.keys(p.cases).sort(), ["basics-one", "basics-two", "coronary-one", "rhythm-one", "vessels-x"]);
  assert.deepStrictEqual(p.cases["basics-one"], { solved: true, bestStars: 3, bestStrikes: 0, xp: 10, plays: 2, firstSolvedAt: null, lastPlayedAt: null, current: null });
  assert.deepStrictEqual(p.cases["basics-two"].current, { step: 1 });
  assert.strictEqual(p.cases["coronary-one"].bestStars, 1);
  assert.strictEqual(p.cases["rhythm-one"].solved, false, "state 6 has no 'solved' bit");
  assert.deepStrictEqual(p.drills, { rhythm: { best: 5, played: 2 } });
  assert.strictEqual(e.run("({}).polluted"), undefined);
});

test("save: unknown case ids from a code count once the content knows them", () => {
  const e = makeEngine();
  e.S.init();
  e.S.newProfile(0, "Ada");
  e.S.recordSolve("vessels-late-arrival", { strikes: 0, stepCount: 4 });
  e.S.recordSolve("basics-one", { strikes: 0 });
  assert.deepStrictEqual([e.P.overall(e.S.current()).solved, e.P.overall(e.S.current()).total], [1, 6]);
  e.sb.__CCF_FILE__ = "u6-late.js";
  e.run(contentScript([caseDef("vessels-late-arrival", "vessels", 1, "hard", 5)]));
  const o = e.P.overall(e.S.current());
  assert.deepStrictEqual([o.solved, o.total, o.xp], [2, 7, 40]);
  assert.strictEqual(e.S.caseRecord("vessels-late-arrival").xp, 30, "the record's XP follows the content");
});

// ---------------------------------------------------------------------------
// CCF.Scorm
// ---------------------------------------------------------------------------

test("scorm: no LMS → not active, every call is a harmless no-op", () => {
  const { CCF } = makeEngine();
  const Sc = CCF.Scorm;
  assert.strictEqual(Sc.connect(), false);
  assert.strictEqual(Sc.isActive(), false);
  assert.strictEqual(Sc.version, null);
  assert.deepStrictEqual(plain(Sc.getLearner()), { id: "", name: "" });
  assert.strictEqual(Sc.isFreshAttempt(), false);
  assert.strictEqual(Sc.loadSuspendData(), "");
  assert.strictEqual(Sc.saveSuspendData("x"), false);
  assert.strictEqual(Sc.reportProgress({ solved: 1, total: 2 }), false);
  assert.strictEqual(Sc.commit(), false);
  assert.strictEqual(Sc.finish(), false);
  assert.strictEqual(Sc.lastError(), null);
});

test("scorm: finds a 1.2 API through a cross-origin frame and talks to it", () => {
  const api = makeScorm12();
  const { CCF, timers } = makeEngine({ parent: crossOriginWindow(topWindow({ API: api })) });
  const Sc = CCF.Scorm;
  assert.strictEqual(Sc.connect(), true);
  assert.strictEqual(Sc.connect(), true, "idempotent");
  assert.strictEqual(api.count("init"), 1);
  assert.strictEqual(Sc.version, "1.2");
  assert.strictEqual(api.data["cmi.core.lesson_status"], "incomplete");
  assert.strictEqual(api.data["cmi.core.exit"], "suspend");
  assert.strictEqual(Sc.isFreshAttempt(), true);
  assert.deepStrictEqual(plain(Sc.getLearner()), { id: "learner-42", name: "Jane Doe" });
  assert.strictEqual(Sc.saveSuspendData("C1|abc"), true);
  assert.strictEqual(Sc.loadSuspendData(), "C1|abc");
  assert.strictEqual(Sc.saveSuspendData("x".repeat(4097)), false);
  assert.strictEqual(Sc.suspendDataLimit(), 4096);
  assert.strictEqual(Sc.reportProgress({ solved: 1, total: 3 }), true);
  assert.deepStrictEqual(["raw", "min", "max", "lesson_status"].map((k) => api.data["cmi.core." + (k === "lesson_status" ? k : "score." + k)]), ["33", "0", "100", "incomplete"]);
  Sc.reportProgress({ solved: 3, total: 3 });
  assert.deepStrictEqual([api.data["cmi.core.score.raw"], api.data["cmi.core.lesson_status"]], ["100", "completed"]);
  Sc.reportProgress({ completed: 2, total: 3 });
  assert.deepStrictEqual([api.data["cmi.core.score.raw"], api.data["cmi.core.lesson_status"]], ["67", "completed"], "{ completed } works too; never downgraded");
  assert.strictEqual(Sc.commit(), true);
  timers.advance(3723450);
  assert.strictEqual(Sc.finish(), true);
  assert.strictEqual(Sc.finish(), false);
  assert.strictEqual(api.count("finish"), 1, "finish only once");
  assert.strictEqual(api.data["cmi.core.session_time"], "01:02:03.45");
  assert.strictEqual(Sc.isActive(), false);
  assert.strictEqual(Sc.connect(), false, "no reconnect after finish");
});

test("scorm: 2004 API, completion threshold, opener windows, 'already initialised', disabled", () => {
  const api = makeScorm2004();
  let { CCF } = makeEngine({ parent: topWindow({ API_1484_11: api }), config: { scorm: { completionThreshold: 0.5 } } });
  let Sc = CCF.Scorm;
  assert.strictEqual(Sc.connect(), true);
  assert.strictEqual(Sc.version, "2004");
  assert.strictEqual(api.data["cmi.completion_status"], "incomplete");
  assert.deepStrictEqual(plain(Sc.getLearner()), { id: "learner-2004", name: "Ada Lovelace" });
  assert.strictEqual(Sc.suspendDataLimit(), 64000);
  Sc.reportProgress({ solved: 1, total: 4 });
  assert.deepStrictEqual([api.data["cmi.completion_status"], api.data["cmi.score.scaled"], api.data["cmi.progress_measure"]], ["incomplete", "0.25", "0.25"]);
  Sc.reportProgress({ solved: 2, total: 4 });
  assert.deepStrictEqual([api.data["cmi.completion_status"], api.data["cmi.success_status"], api.data["cmi.score.raw"]], ["completed", "passed", "50"]);
  Sc.finish();
  assert.match(api.data["cmi.session_time"], /^PT\d+H\d+M\d+\.\d{2}S$/);
  assert.strictEqual(api.data["cmi.exit"], "suspend");

  // A popup launched by the LMS: the API lives in the opener's frame chain.
  const api2 = makeScorm12();
  ({ CCF } = makeEngine({ opener: { parent: topWindow({ API: api2 }) } }));
  assert.strictEqual(CCF.Scorm.connect(), true);
  assert.strictEqual(CCF.Scorm.version, "1.2");

  // The game was reloaded inside the same LMS session: Initialize fails with 103 / 101.
  const again = makeScorm2004();
  again._setInitialized(true);
  ({ CCF } = makeEngine({ parent: topWindow({ API_1484_11: again }) }));
  assert.strictEqual(CCF.Scorm.connect(), true);
  const again12 = makeScorm12();
  again12._setInitialized(true);
  ({ CCF } = makeEngine({ parent: topWindow({ API: again12 }) }));
  assert.strictEqual(CCF.Scorm.connect(), true);

  // A status from an earlier session is never downgraded ("passed" stays "passed").
  const old = makeScorm12({ "cmi.core.lesson_status": "passed" });
  ({ CCF } = makeEngine({ parent: topWindow({ API: old }) }));
  CCF.Scorm.connect();
  CCF.Scorm.reportProgress({ solved: 1, total: 5 });
  assert.strictEqual(old.data["cmi.core.lesson_status"], "passed");

  // Turned off by the configuration.
  for (const scorm of [false, { enabled: false }]) {
    const api3 = makeScorm12();
    ({ CCF } = makeEngine({ parent: topWindow({ API: api3 }), config: { scorm } }));
    assert.strictEqual(CCF.Scorm.connect(), false);
    assert.strictEqual(api3.count("init"), 0);
  }
});

test("scorm: 2004 success_status is 'passed' at the completion threshold, not before", () => {
  const api = makeScorm2004();
  const { CCF } = makeEngine({ parent: topWindow({ API_1484_11: api }) });
  CCF.Scorm.connect();
  CCF.Scorm.reportProgress({ solved: 0, total: 4 });
  assert.strictEqual(api.data["cmi.score.raw"], undefined, "nothing to report yet");
  CCF.Scorm.reportProgress({ solved: 3, total: 4 });
  assert.deepStrictEqual([api.data["cmi.completion_status"], api.data["cmi.success_status"], api.data["cmi.score.raw"]], ["incomplete", undefined, "75"]);
  CCF.Scorm.reportProgress({ solved: 4, total: 4 });
  assert.deepStrictEqual([api.data["cmi.completion_status"], api.data["cmi.success_status"], api.data["cmi.score.scaled"]], ["completed", "passed", "1"]);
  CCF.Scorm.reportProgress({ solved: 0, total: 0 });
  assert.strictEqual(api.data["cmi.score.raw"], "0", "no cases at all: 0, but status stays");
  assert.strictEqual(api.data["cmi.completion_status"], "completed");
});

test("scorm: a broken LMS API never makes the game throw", () => {
  const boom = () => { throw new Error("LMS exploded"); };
  const api = { LMSInitialize: boom, LMSGetValue: boom, LMSSetValue: boom, LMSCommit: boom, LMSFinish: boom, LMSGetLastError: boom };
  let e = makeEngine({ parent: topWindow({ API: api }) });
  assert.strictEqual(e.CCF.Scorm.connect(), false);
  assert.strictEqual(e.S.init().mode, "local", "the game falls back to local saves");
  const flaky = makeScorm12();
  flaky.LMSSetValue = boom;
  flaky.LMSCommit = boom;
  flaky.LMSFinish = boom;
  e = makeEngine({ parent: topWindow({ API: flaky }) });
  assert.strictEqual(e.CCF.Scorm.connect(), true);
  assert.strictEqual(e.CCF.Scorm.saveSuspendData("x"), false);
  assert.strictEqual(e.CCF.Scorm.reportProgress({ solved: 1, total: 1 }), false);
  assert.strictEqual(e.CCF.Scorm.commit(), true, "nothing was stored, so there is nothing to commit");
  assert.strictEqual(e.CCF.Scorm.finish(), false);
  // The same through CCF.Save: it reports the problem instead of throwing.
  const bad = makeScorm12();
  bad.LMSSetValue = () => "false";
  bad.LMSGetLastError = () => "351";
  e = makeEngine({ parent: topWindow({ API: bad }) });
  assert.strictEqual(e.S.init().mode, "scorm");
  e.S.recordSolve("basics-one", { strikes: 0 });
  assert.match(e.S.storageWarning(), /couldn't be sent to your course/);
  assert.ok(e.logs.some((l) => /LMSSetValue\(cmi\.suspend_data\) failed: error 351/.test(l)), e.logs.join("\n"));
  assert.strictEqual(e.CCF.Scorm._friendlyName("Smith, John"), "John Smith");
  assert.strictEqual(e.CCF.Scorm._friendlyName("  Grace  Hopper "), "Grace Hopper");
  assert.strictEqual(e.CCF.Scorm._friendlyName("a, b, c"), "a, b, c");
});

// ---------------------------------------------------------------------------
// CCF.Save — SCORM mode
// ---------------------------------------------------------------------------

test("save+scorm: one course profile named after the learner; score and status reach the LMS", () => {
  const api = makeScorm12();
  const storage = makeLocalStorage();
  const e = makeEngine({ parent: topWindow({ API: api }), storage });
  assert.deepStrictEqual(plain(e.S.init()), { mode: "scorm", storageOk: true, warning: null, learnerName: "Jane Doe", scormMissing: false, pending: false, scormVersion: "1.2" });
  const S = e.S;
  assert.strictEqual(S.isScorm(), true);
  const p = S.current();
  assert.strictEqual(p.name, "Jane Doe", "the learner's name is the default player name");
  assert.deepStrictEqual(plain(S.listSlots()).map((s) => [s.slot, s.empty, s.summary.name]), [[0, false, "Jane Doe"]]);
  assert.deepStrictEqual([S.currentSlot(), S.lastSlot()], [0, 0]);
  assert.strictEqual(S.deleteSlot(0), false, "the course profile can't be deleted");
  assert.ok(api.data["cmi.suspend_data"].startsWith("C1|"));
  assert.strictEqual(api.data["cmi.core.score.raw"], undefined, "no score before there is progress");
  S.markSeen("intro");
  S.saveCaseProgress("basics-one", { step: 1 });
  const commits = api.count("commit");
  S.recordSolve("basics-one", { strikes: 2 });
  assert.strictEqual(api.count("commit"), commits + 1, "a solve commits at once");
  assert.strictEqual(api.data["cmi.core.score.raw"], "17");
  assert.strictEqual(api.data["cmi.core.lesson_status"], "incomplete");
  // "New game" in SCORM mode keeps the progress and only takes the name.
  const renamed = S.newProfile(2, "Janie");
  assert.deepStrictEqual([renamed.name, renamed.id, renamed.cases["basics-one"].solved], ["Janie", p.id, true]);
  assert.strictEqual(S.load(1).name, "Janie", "slots are ignored");
  assert.strictEqual(storage.getItem("cardiac-case-files:slot:0"), null, "no local slots in SCORM mode");
  assert.strictEqual(JSON.parse(storage.getItem("cardiac-case-files:scorm:learner-42")).name, "Janie", "a local copy by learner id");
  for (const id of FAKE_IDS.slice(1)) S.recordSolve(id, { strikes: 0 });
  assert.deepStrictEqual([api.data["cmi.core.score.raw"], api.data["cmi.core.lesson_status"]], ["100", "completed"]);
  e.fire("pagehide", { persisted: true });
  assert.strictEqual(api.count("finish"), 0, "a page going into the back/forward cache is not finished");
  e.fire("pagehide", { persisted: false });
  e.fire("pagehide", { persisted: false });
  assert.strictEqual(api.count("finish"), 1);
  assert.strictEqual(api.data["cmi.core.exit"], "suspend");
});

test("save+scorm: suspend_data stays well under 4096 with 34 cases solved and a case in progress", () => {
  const defs = plannedCases();
  assert.strictEqual(defs.length, 34);
  const content = contentScript(defs);
  const api = makeScorm12({ "cmi.core.student_name": "李".repeat(40) });
  const e = makeEngine({ parent: topWindow({ API: api }), content });
  e.S.init();
  assert.deepStrictEqual(plain(e.CCF.content.errors), [], "the generated cases pass the registry");
  const S = e.S;
  defs.forEach((d, i) => {
    S.saveCaseProgress(d.id, { step: 1, strikes: 1, hints: 0, answers: [] });
    e.timers.advance(97 * 60000 + i * 1000);
    S.recordSolve(d.id, { strikes: i % 5, hints: i % 2, stepCount: 5 });
    if (i % 3 === 0) { e.timers.advance(86400000); S.recordSolve(d.id, { strikes: 9, stepCount: 5 }); }
  });
  ["intro", "finale", "certificate", "casebook-tip", "rounds-tip"].forEach((k) => S.markSeen(k));
  ["rhythm", "pressure", "abi", "edema"].forEach((k, i) => { S.recordDrill(k, 12 + i); S.recordDrill(k, 3); });
  S.setSetting({ textSize: "lg", reduceMotion: true, highContrast: true });
  // A replay in progress with a realistic payload (six steps of answers).
  const state = {
    step: 4, strikes: 3, hints: 1, seed: 918273,
    answers: Array.from({ length: 6 }, (_, i) => ({ id: "s" + (i + 1), tries: [2, 0, 1].slice(0, (i % 3) + 1), hints: i % 2, shown: false, done: i < 4, value: i === 2 ? "5.0" : null })),
  };
  S.saveCaseProgress(defs[7].id, state);
  let text = api.data["cmi.suspend_data"];
  assert.ok(text.length < 2000, "suspend_data is " + text.length + " characters");
  console.log("       (34 solved + 1 in progress, 40-character name: " + text.length + " characters)");
  assert.strictEqual(api.data["cmi.core.score.raw"], "100");
  assert.strictEqual(api.data["cmi.core.lesson_status"], "completed");

  // Everything survives a trip through the LMS alone (a new computer).
  const before = plain(S.current());
  let fresh = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": text, "cmi.core.lesson_status": "completed" }) }), storage: makeLocalStorage(), content });
  fresh.S.init();
  let after = plain(fresh.S.current());
  assert.strictEqual(after.name, before.name);
  assert.strictEqual(after.id, before.id);
  assert.deepStrictEqual(after.settings, before.settings);
  assert.deepStrictEqual(after.seen, before.seen);
  assert.deepStrictEqual(after.drills, before.drills);
  for (const d of defs) {
    const want = Object.assign({}, before.cases[d.id], { firstSolvedAt: minute(before.cases[d.id].firstSolvedAt), lastPlayedAt: minute(before.cases[d.id].lastPlayedAt) });
    assert.deepStrictEqual(after.cases[d.id], want, d.id);
  }
  assert.deepStrictEqual(after.cases[defs[7].id].current, state);

  // A second case in progress still fits with everything.
  e.timers.advance(60000);
  S.saveCaseProgress(defs[20].id, Object.assign({}, state, { step: 2 }));
  text = api.data["cmi.suspend_data"];
  assert.ok(text.length < 2600, "suspend_data is " + text.length + " characters");
  fresh = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": text }) }), storage: makeLocalStorage(), content });
  fresh.S.init();
  after = plain(fresh.S.current());
  assert.deepStrictEqual([after.cases[defs[7].id].current.step, after.cases[defs[20].id].current.step], [4, 2]);
  assert.strictEqual(after.cases[defs[0].id].firstSolvedAt, minute(before.cases[defs[0].id].firstSolvedAt), "dates kept");

  // A 2 KB payload (the most the UI should store) still fits, and so does every solve.
  const big = { step: 5, strikes: 0, hints: 0, answers: [{ notes: "n".repeat(1950) }] };
  assert.ok(JSON.stringify(big).length >= 1990 && JSON.stringify(big).length < 2048);
  e.timers.advance(60000);
  S.saveCaseProgress(defs[8].id, big);
  text = api.data["cmi.suspend_data"];
  assert.ok(text.length <= 4000, "suspend_data is " + text.length + " characters");
  fresh = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": text }) }), storage: makeLocalStorage(), content });
  fresh.S.init();
  after = plain(fresh.S.current());
  assert.deepStrictEqual(after.cases[defs[8].id].current, big);
  assert.ok(defs.every((d) => after.cases[d.id].solved && after.cases[d.id].bestStars === before.cases[d.id].bestStars));
  assert.strictEqual(fresh.P.overall(after).solved, 34);
});

test("save+scorm: too much to fit drops optional detail first, and never a solve", () => {
  const defs = plannedCases();
  const content = contentScript(defs);
  const api = makeScorm12();
  const e = makeEngine({ parent: topWindow({ API: api }), content });
  e.S.init();
  defs.forEach((d) => e.S.recordSolve(d.id, { strikes: 1 }));
  // Three payloads of 2 KB each can't all fit: only the most recent one is kept.
  [0, 1, 2].forEach((i) => { e.timers.advance(1000); e.S.saveCaseProgress(defs[i].id, { step: i, answers: [{ notes: String(i).repeat(1980) }] }); });
  const text = api.data["cmi.suspend_data"];
  assert.ok(text.length <= 4000, "length " + text.length);
  const back = e.S._decodeSuspend(text, null);
  assert.deepStrictEqual(defs.slice(0, 3).map((d) => back.cases[d.id].current && back.cases[d.id].current.step), [null, null, 2]);
  assert.ok(defs.every((d) => back.cases[d.id].solved && back.cases[d.id].bestStars === 2 && back.cases[d.id].bestStrikes === 1));
  assert.strictEqual(back.cases[defs[5].id].firstSolvedAt, null, "solve dates went first");
  assert.strictEqual(back.cases[defs[2].id].lastPlayedAt, minute(e.S.caseRecord(defs[2].id).lastPlayedAt), "…but the case in progress keeps its time");
  // Hundreds of cases: every solve is kept, even if the details go.
  const list = [];
  for (let i = 0; i < 300; i++) list.push(caseDef("vessels-huge-case-number-" + i, "vessels", i + 1, "easy", 3));
  const many = contentScript(list);
  const api2 = makeScorm12();
  const e2 = makeEngine({ parent: topWindow({ API: api2 }), content: many });
  e2.S.init();
  list.forEach((d) => e2.S.recordSolve(d.id, { strikes: 0 }));
  const text2 = api2.data["cmi.suspend_data"];
  assert.ok(text2.length <= 4000, "length " + text2.length);
  const back2 = e2.S._decodeSuspend(text2, null);
  assert.strictEqual(Object.values(back2.cases).filter((r) => r.solved && r.bestStars === 3).length, 300);
  assert.strictEqual(api2.data["cmi.core.score.raw"], "100");
});

test("save+scorm: resume on the same computer, on a new computer, and merging the two", () => {
  const api = makeScorm12();
  const storage = makeLocalStorage();
  let e = makeEngine({ parent: topWindow({ API: api }), storage });
  e.S.init();
  e.S.rename("Jane");
  e.S.recordSolve("basics-one", { strikes: 1 });
  e.S.saveCaseProgress("basics-two", { step: 2, strikes: 1, hints: 1, answers: [1, 2] });
  e.S.markSeen("intro");
  e.S.setSetting({ textSize: "lg", sound: false });
  e.S.recordDrill("rhythm", 6);
  e.fire("pagehide", { persisted: false });
  const suspend = api.data["cmi.suspend_data"];

  // Same computer, next session.
  e = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": suspend, "cmi.core.lesson_status": "incomplete" }) }), storage });
  e.S.init();
  let p = e.S.current();
  assert.deepStrictEqual([p.name, p.cases["basics-one"].bestStars, p.cases["basics-two"].current.step, p.settings.textSize, p.drills.rhythm.best], ["Jane", 2, 2, "lg", 6]);
  assert.strictEqual(e.S.hasSeen("intro"), true);

  // A new computer: everything comes back from the LMS alone.
  e = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": suspend }) }), storage: makeLocalStorage() });
  e.S.init();
  p = e.S.current();
  assert.deepStrictEqual([p.name, p.cases["basics-one"].bestStars, p.cases["basics-one"].bestStrikes, p.cases["basics-two"].current.answers.length, p.settings.sound], ["Jane", 2, 1, 2, false]);

  // Merging: the LMS knows something the local copy doesn't, and vice versa.
  const localCopy = JSON.parse(storage.getItem("cardiac-case-files:scorm:learner-42"));
  localCopy.cases["coronary-one"] = { solved: true, bestStars: 3, bestStrikes: 0, xp: 20, plays: 1, firstSolvedAt: "2026-10-30T10:00:00.000Z", lastPlayedAt: "2026-10-30T10:00:00.000Z", current: null };
  localCopy.name = "Old Local Name";
  const other = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": suspend }) }), storage: makeLocalStorage() });
  other.S.init();
  other.S.recordSolve("rhythm-one", { strikes: 0 });               // on another computer…
  other.S.rename("LMS Name");
  storage.setItem("cardiac-case-files:scorm:learner-42", JSON.stringify(localCopy));
  const api4 = makeScorm12({ "cmi.suspend_data": other.CCF.Scorm.loadSuspendData() });
  e = makeEngine({ parent: topWindow({ API: api4 }), storage });   // …then back on this one
  e.S.init();
  p = e.S.current();
  assert.strictEqual(p.name, "LMS Name", "the LMS wins for the name");
  assert.strictEqual(p.cases["rhythm-one"].solved, true, "from the LMS");
  assert.strictEqual(p.cases["coronary-one"].bestStars, 3, "from the local copy");
  assert.strictEqual(p.cases["basics-one"].bestStars, 2);
  assert.strictEqual(api4.data["cmi.core.score.raw"], "50", "the merged score is reported at once");
});

test("save+scorm: unknown suspend_data entries are kept, junk is ignored", () => {
  const S0 = makeEngine().S;
  const known = S0._hash6("basics-one");
  const unknown = S0._hash6("from-a-newer-version");
  const payload = Buffer.from(JSON.stringify({ step: 4 })).toString("base64url");
  const suspend = ["C1", "pabc.1.2", "Kay", "1.md", "intro", known + ":7.0.3," + unknown + ":5.1.2,BAD!,zz:9", unknown + ":" + payload + ",bad", "rhythm:4"].join("|");
  const api = makeScorm12({ "cmi.suspend_data": suspend });
  const e = makeEngine({ parent: topWindow({ API: api }) });
  e.S.init();
  const p = e.S.current();
  assert.deepStrictEqual([p.name, p.id, p.cases["basics-one"].bestStars, p.cases["basics-one"].plays, p.drills.rhythm.best], ["Kay", "pabc", 3, 3, 4]);
  e.S.saveCaseProgress("basics-two", { step: 1 });
  const saved = api.data["cmi.suspend_data"];
  assert.ok(saved.includes(unknown + ":5.1.2"), "records from a newer version are written back: " + saved);
  assert.ok(saved.includes(unknown + ":" + payload), "…with their in-progress state");
  assert.ok(!saved.includes("BAD!") && !saved.includes("zz:9"));
  assert.strictEqual(e.P.overall(e.S.current()).solved, 1);
  // Garbage in the LMS doesn't break anything: a fresh profile.
  for (const junk of ["{\"some\":\"other format\"}", "C1|", "S1|1f|Kay||", "C1|||||||||||"]) {
    const j = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": junk }) }) });
    j.S.init();
    assert.strictEqual(j.S.current().name, "Jane Doe", junk);
    assert.deepStrictEqual(plain(j.S.current().cases), {});
  }
});

test("save+scorm: progress is adopted when the cases register after the LMS connects", () => {
  const S0 = makeEngine().S;
  const payload = Buffer.from(JSON.stringify({ step: 2 })).toString("base64url");
  const suspend = ["C1", "", "Late", "1.md", "", S0._hash6("basics-one") + ":7.0.4," + S0._hash6("coronary-two") + ":3", S0._hash6("rhythm-one") + ":" + payload, ""].join("|");
  const api = makeScorm12({ "cmi.suspend_data": suspend });
  const e = makeEngine({ parent: topWindow({ API: api }), content: false });
  e.S.init();                                          // no cases yet
  assert.deepStrictEqual(plain(e.S.current().cases), {});
  e.run(FAKE_CONTENT);                                 // the cases register afterwards
  const p = e.S.current();
  assert.deepStrictEqual([p.cases["basics-one"].bestStars, p.cases["basics-one"].plays, p.cases["coronary-two"].bestStars], [3, 4, 1]);
  assert.deepStrictEqual(plain(p.cases["rhythm-one"].current), { step: 2 });
  e.S.recordSolve("coronary-one", { strikes: 0 });
  const saved = api.data["cmi.suspend_data"];
  assert.strictEqual(saved.split("|")[5].split(",").length, 4, "no duplicated entries: " + saved);
  assert.strictEqual(api.data["cmi.core.score.raw"], "50");
});

test("save+scorm: a fresh attempt (or an instructor reset) keeps only the name and settings", () => {
  const storage = makeLocalStorage();
  let api = makeScorm12();
  let e = makeEngine({ parent: topWindow({ API: api }), storage });
  e.S.init();
  e.S.rename("Janie");
  e.S.recordSolve("basics-one", { strikes: 0 });
  e.S.saveCaseProgress("basics-two", { step: 1 });
  e.S.setSetting("textSize", "xl");
  e.S.markSeen("intro");
  e.fire("pagehide", { persisted: false });

  // A normal relaunch resumes everything.
  let again = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": api.data["cmi.suspend_data"], "cmi.core.lesson_status": "incomplete" }) }), storage });
  again.S.init();
  assert.strictEqual(again.S.caseRecord("basics-one").solved, true);
  // The LMS lost its suspend_data but the attempt goes on: the local copy is kept in full.
  again = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.core.lesson_status": "incomplete" }) }), storage });
  again.S.init();
  assert.strictEqual(again.S.caseRecord("basics-one").solved, true);
  assert.strictEqual(again.S.caseRecord("basics-two").current.step, 1);

  // The instructor resets the attempt: the LMS forgets everything.
  api = makeScorm12();
  e = makeEngine({ parent: topWindow({ API: api }), storage });
  e.S.init();
  const p = e.S.current();
  assert.deepStrictEqual([p.name, p.settings.textSize], ["Janie", "xl"]);
  assert.deepStrictEqual(plain(p.cases), {});
  assert.strictEqual(e.S.hasSeen("intro"), false);
  assert.strictEqual(api.data["cmi.core.score.raw"], undefined, "no score is sent for the new attempt");
  assert.deepStrictEqual(JSON.parse(storage.getItem("cardiac-case-files:scorm:learner-42")).cases, {}, "the old progress can't come back later");
  // SCORM 2004: entry "ab-initio" means a new attempt.
  const api04 = makeScorm2004({ "cmi.entry": "ab-initio", "cmi.learner_id": "learner-42" });
  e = makeEngine({ parent: topWindow({ API_1484_11: api04 }), storage });
  e.S.init();
  assert.strictEqual(e.CCF.Scorm.isFreshAttempt(), true);
  assert.strictEqual(e.S.current().name, "Janie");
});

test("save+scorm: commits only when something changed, at most once a minute (at once when it matters)", () => {
  const api = makeScorm12();
  const e = makeEngine({ parent: topWindow({ API: api }) });
  e.S.init();
  const S = e.S;
  const commits = () => api.count("commit");
  const sets = () => api.calls.filter((c) => c.startsWith("set ")).length;
  let c0 = commits();
  for (let i = 0; i < 10; i++) S.saveCaseProgress("basics-one", { step: i });
  assert.ok(commits() - c0 <= 1, "10 steps: " + (commits() - c0) + " commits");
  e.timers.advance(60000);
  assert.ok(commits() - c0 >= 1 && commits() - c0 <= 2, "the minute's changes were committed");
  c0 = commits();
  let s0 = sets();
  S.flush();
  S.flush();
  e.timers.advance(120000);
  assert.deepStrictEqual([commits(), sets()], [c0, s0], "nothing changed: nothing sent, nothing committed");
  S.recordSolve("basics-one", { strikes: 0 });
  assert.strictEqual(commits(), c0 + 1, "a solve commits at once");
  S.markSeen("intro");
  e.hide();
  assert.strictEqual(commits(), c0 + 2, "hiding the page commits at once");
  s0 = sets();
  e.hide();
  assert.deepStrictEqual([commits(), sets()], [c0 + 2, s0]);
  e.fire("pagehide", { persisted: false });
  assert.strictEqual(api.count("finish"), 1);
  assert.match(api.data["cmi.core.session_time"], /^\d{2}:\d{2}:\d{2}\.\d{2}$/);
});

test("save+scorm: a SCORM package without an LMS warns at once, retries, and switches if the LMS appears", async () => {
  // No LMS at all.
  let e = makeEngine({ config: { scormRequired: true } });
  let r = plain(e.S.init());
  assert.deepStrictEqual([r.mode, r.scormMissing, r.pending], ["local", true, true]);
  assert.match(r.warning, /couldn't connect to your course/);
  let final = null;
  e.S.ready().then((x) => { final = plain(x); });
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(final, null, "still trying");
  e.timers.advance(5000);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepStrictEqual([final.mode, final.scormMissing, final.pending], ["local", true, false]);
  assert.ok(e.logs.some((l) => /no SCORM API in this window/.test(l)), e.logs.join("\n"));
  assert.strictEqual(e.S.newProfile(0, "Local").name, "Local", "the game still works on local slots");
  assert.match(e.S.storageWarning(), /couldn't connect to your course/);

  // The LMS refuses to initialise: its own error code, text and diagnostic are logged.
  const refusing = makeScorm12();
  refusing.LMSInitialize = () => "false";
  refusing.LMSGetValue = () => "";
  refusing.LMSGetLastError = () => "101";
  refusing.LMSGetErrorString = (c) => (c === "101" ? "General exception" : "");
  refusing.LMSGetDiagnostic = () => "the session has already been finished";
  e = makeEngine({ parent: topWindow({ API: refusing }), config: { scormRequired: true } });
  e.S.init();
  const p = e.S.ready();
  e.timers.advance(5000);
  assert.strictEqual((await p).scormMissing, true);
  assert.ok(e.logs.some((l) => /LMSInitialize failed: error 101 \(General exception\) — the session has already been finished/.test(l)), e.logs.join("\n"));

  // The LMS's API appears a moment later: the retry connects and the game switches over.
  const lms = topWindow({});
  e = makeEngine({ parent: lms, config: { scormRequired: true } });
  e.S.init();
  e.S.newProfile(1, "Quick Starter");
  const types = [];
  e.S.onChange((prof, info) => types.push(info.type));
  const late = e.S.ready();
  lms.API = makeScorm12();
  e.timers.advance(300);
  r = plain(await late);
  assert.deepStrictEqual([r.mode, r.scormMissing, r.learnerName, r.warning], ["scorm", false, "Jane Doe", null]);
  assert.ok(types.includes("scorm"));
  assert.strictEqual(e.S.current().name, "Jane Doe");
  assert.strictEqual(e.S.isScorm(), true);

  // ready() without init() starts the retries too.
  e = makeEngine({ config: { scormRequired: true } });
  const waiting = e.S.ready();
  assert.strictEqual(e.S.init().pending, true);
  e.timers.advance(5000);
  assert.strictEqual((await waiting).scormMissing, true);

  // Not a SCORM package: no retries, no warning.
  e = makeEngine();
  r = plain(e.S.init());
  assert.deepStrictEqual([r.scormMissing, r.pending, r.warning], [false, false, null]);
  assert.deepStrictEqual(plain(await e.S.ready()).mode, "local");
});

test("save+scorm: importing is off by default and merges when allowed; blocked storage still saves to the LMS", () => {
  const web = makeEngine();
  web.S.init();
  web.S.newProfile(0, "Web Player");
  web.S.recordSolve("basics-one", { strikes: 0 });
  web.S.recordSolve("basics-two", { strikes: 0 });
  const code = web.S.exportCode();

  const api = makeScorm12();
  const e = makeEngine({ parent: topWindow({ API: api }), storage: "blocked" });
  const r = plain(e.S.init());
  assert.deepStrictEqual([r.mode, r.storageOk, r.warning], ["scorm", false, null], "progress is saved by the course, so no warning");
  const S = e.S;
  S.recordSolve("coronary-two", { strikes: 0 });
  assert.strictEqual(S.canImport(), false);
  assert.match(plain(S.importCode(code, 0)).error, /importing a save code is turned off here/);
  assert.strictEqual(api.data["cmi.core.score.raw"], "17", "the refused import changed nothing");
  e.CCF.config.scorm.allowImport = true;
  assert.strictEqual(S.canImport(), true);
  const merged = plain(S.importCode(code, 2));
  assert.strictEqual(merged.ok, true);
  assert.strictEqual(merged.profile.name, "Jane Doe", "the course keeps its name");
  assert.deepStrictEqual(Object.keys(merged.profile.cases).sort(), ["basics-one", "basics-two", "coronary-two"]);
  assert.strictEqual(api.data["cmi.core.score.raw"], "50");
});

test("save+scorm: a stale second tab can't lower the score or drop progress", () => {
  const storage = makeLocalStorage();
  const apiA = makeScorm12();
  const A = makeEngine({ parent: topWindow({ API: apiA }), storage });
  A.S.init();
  const apiB = makeScorm12(null, apiA.data);                        // a second launch of the same attempt
  const B = makeEngine({ parent: topWindow({ API: apiB }), storage });
  B.S.init();
  for (const id of ["basics-one", "basics-two", "basics-three"]) A.S.recordSolve(id, { strikes: 0 });
  assert.strictEqual(apiA.data["cmi.core.score.raw"], "50");
  B.S.markSeen("intro");                                            // tab B changes something…
  B.hide();                                                         // …and is hidden: commits
  assert.strictEqual(apiA.data["cmi.core.score.raw"], "50", "the score stayed");
  const back = A.S._decodeSuspend(apiA.data["cmi.suspend_data"], null);
  assert.deepStrictEqual(["basics-one", "basics-two", "basics-three"].map((id) => back.cases[id] && back.cases[id].solved), [true, true, true]);
  assert.strictEqual(B.S.caseRecord("basics-three").solved, true, "tab B now knows tab A's progress");
});

// ---------------------------------------------------------------------------
// The real content
// ---------------------------------------------------------------------------

/** The content files in index.html's order (or the default order before index.html exists). */
function realContentFiles() {
  try {
    const { files } = require("./validate_content.js").loadContent();
    return files.filter((f) => f !== "registry.js").map((f) => "js/content/" + f);
  } catch (e) {
    return [];
  }
}

function loadRealContent(e) {
  for (const rel of realContentFiles()) {
    e.sb.__CCF_FILE__ = path.basename(rel);
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), e.sb, { filename: rel }); } catch (err) { /* another writer is mid-edit */ }
  }
}

test("content: real case ids have distinct hashes; all of them solved plus one in progress fits easily", () => {
  const api = makeScorm12({ "cmi.core.student_name": "Fernández-Okonkwo, María José Alejandra" });
  const e = makeEngine({ parent: topWindow({ API: api }), content: false });
  loadRealContent(e);
  const ids = e.P.allCases().map((k) => k.id);
  assert.ok(ids.length >= 1, "at least one real case");
  const hashes = new Map();
  for (const id of ids) {
    const h = e.S._hash6(id);
    assert.ok(!hashes.has(h), "hash collision between " + id + " and " + hashes.get(h));
    hashes.set(h, id);
  }
  e.S.init();
  ids.forEach((id, i) => {
    e.timers.advance(3600000);
    e.S.recordSolve(id, { strikes: i % 4, hints: 0 });
  });
  e.S.saveCaseProgress(ids[0], { step: 3, strikes: 2, hints: 1, answers: [[1, 0], [2], [0, 3, 1]] });
  const text = api.data["cmi.suspend_data"];
  const perCase = 30;
  assert.ok(text.length < 600 + ids.length * perCase, ids.length + " cases: " + text.length + " characters");
  assert.ok(text.length < 3000);
  assert.strictEqual(api.data["cmi.core.score.raw"], "100");
  assert.strictEqual(api.data["cmi.core.lesson_status"], "completed");
  console.log("       (" + ids.length + " real case" + (ids.length === 1 ? "" : "s") + ": suspend_data " + text.length + " characters)");
});

// ---------------------------------------------------------------------------
// tools/build.py, on a small game folder in a temporary directory
// ---------------------------------------------------------------------------

function python() {
  for (const cmd of ["python3", "python"]) {
    const r = spawnSync(cmd, ["-c", "import sys; print(sys.version_info[0])"], { encoding: "utf8" });
    if (r.status === 0 && r.stdout.trim() === "3") return cmd;
  }
  return null;
}

function fakeGame(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccf-build-test-"));
  const all = Object.assign({
    "scorm/imsmanifest.xml": source("scorm/imsmanifest.xml"),
    "index.html": [
      "<!DOCTYPE html>", "<html lang=\"en\"><head><meta charset=\"utf-8\"><title>The Cardiac Case Files</title>",
      "<link rel=\"preconnect\" href=\"https://fonts.example.invalid\">",
      "<link rel=\"preload\" href=\"assets/fonts/body.woff2\" as=\"font\" crossorigin>",
      "<link rel=\"stylesheet\" href=\"css/fonts.css\">",
      "<link rel=\"stylesheet\" href=\"css/style.css\">",
      "<link rel=\"icon\" href=\"assets/icon.svg\">",
      "<!-- <script src=\"js/old.js\"></script> -->",
      "<script>window.CCF_LOAD_ERRORS = [];</script>",
      "</head><body>",
      "<img id=\"logo\" src=\"assets/logo.png\" srcset=\"assets/logo.png 1x, assets/logo@2x.png 2x\" alt=\"\">",
      "<a href=\"https://game-icons.net/\">game-icons.net</a>",
      "<script src=\"js/config.js\"></script>",
      "<script src=\"js/engine/scorm.js\"></script>",
      "<script src=\"js/engine/save.js\"></script>",
      "<script src=\"js/engine/progress.js\"></script>",
      "<script src=\"js/content/registry.js\"></script>",
      "<script src=\"js/content/u-test.js\"></script>",
      "<script src=\"js/ui/app.js\"></script>",
      "</body></html>", "",
    ].join("\n"),
    "css/style.css": "body { color: #222; background: url(img/paper.svg); }\n.stamp { background: url(\"../assets/logo.png\"); }\n",
    "css/fonts.css": "@font-face { font-family: Body; src: url(\"../assets/fonts/body.woff2\") format(\"woff2\"); }\n",
    "css/img/paper.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n",
    "assets/icon.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n",
    "assets/logo.png": "PNG-fake",
    "assets/logo@2x.png": "PNG-fake-2x",
    "assets/fonts/body.woff2": "wOF2-fake-font",
    "js/config.js": source("js/config.js"),
    "js/engine/scorm.js": source("js/engine/scorm.js"),
    "js/engine/save.js": source("js/engine/save.js"),
    "js/engine/progress.js": source("js/engine/progress.js"),
    "js/content/registry.js": source("js/content/registry.js"),
    "js/content/u-test.js": contentScript(FAKE_CASES.slice(0, 2)) + "\n",
    "js/ui/app.js": "var logo = \"assets/logo.png\"; var s = '<\\/script>'; var prose = \"assets/logo.png is the logo\";\n",
  }, files || {});
  for (const [rel, text] of Object.entries(all)) {
    if (text === null) continue;
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

function build(py, dir, out, extra) {
  return spawnSync(py, [path.join(ROOT, "tools", "build.py"), "--root", dir, "--out", out].concat(extra || []), { encoding: "utf8" });
}

function zipListing(py, zipPath) {
  const script = "import json, sys, zipfile\nz = zipfile.ZipFile(sys.argv[1])\n" +
    "print(json.dumps([[i.filename, list(i.date_time), i.external_attr >> 16, z.read(i.filename).decode('utf-8')] for i in z.infolist()]))";
  const r = spawnSync(py, ["-c", script, zipPath], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

/** Run every inline <script> of a built page in a sandbox (as a browser would); returns the window. */
function runPage(html, extra) {
  const sb = Object.assign({ console: { log() {}, info() {}, warn() {}, error() {} }, setTimeout, clearTimeout, addEventListener() {} }, extra || {});
  sb.window = sb;
  sb.document = { visibilityState: "visible", addEventListener() {} };
  vm.createContext(sb);
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  const scrubbed = html.replace(/<!--[\s\S]*?-->/g, "");
  while ((m = re.exec(scrubbed))) {
    const name = (/data-inlined="([^"]+)"/.exec(m[1]) || [])[1] || "inline";
    sb.__CCF_FILE__ = path.basename(name);
    vm.runInContext(m[2], sb, { filename: name });
  }
  return sb;
}

const b64 = (text) => Buffer.from(text).toString("base64");

test("build: one self-contained file and a deterministic SCORM zip", () => {
  const py = python();
  if (!py) { console.log("       (skipped: python3 not found)"); return; }
  const dir = fakeGame();
  try {
    let r = build(py, dir, path.join(dir, "out1"));
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stderr, /dropped <link rel='preconnect' href='https:\/\/fonts\.example\.invalid'>/);
    r = build(py, dir, path.join(dir, "out2"));
    assert.strictEqual(r.status, 0, r.stderr);
    const read = (p) => fs.readFileSync(path.join(dir, p));
    const page = read("out1/cardiac-case-files.html").toString("utf8");
    assert.ok(read("out1/cardiac-case-files.html").equals(read("out2/cardiac-case-files.html")), "deterministic HTML");
    assert.ok(read("out1/cardiac-case-files-scorm.zip").equals(read("out2/cardiac-case-files-scorm.zip")), "deterministic zip");
    assert.ok(page.startsWith("<!DOCTYPE html>\n<!-- Single-file build of The Cardiac Case Files"), "doctype stays first");
    const noComments = page.replace(/<!--[\s\S]*?-->/g, "");
    assert.ok(!/<script[^>]*\ssrc=/.test(noComments), "no script tags with src left");
    assert.ok(!/<link[^>]*rel="stylesheet"/.test(noComments), "no stylesheet links left");
    assert.ok(!/https?:\/\/(?!game-icons\.net|www\.w3\.org|www\.imsproject|www\.adlnet)/.test(noComments.replace(/<a [^>]*>/g, "")), "nothing points at the network");
    assert.ok(page.includes("<!-- <script src=\"js/old.js\"></script> -->"), "comments untouched");
    assert.ok(page.includes("<a href=\"https://game-icons.net/\">game-icons.net</a>"), "links untouched");
    assert.ok(page.includes("<script>window.CCF_LOAD_ERRORS = [];</script>"), "inline scripts untouched");
    for (const f of ["js/config.js", "js/engine/scorm.js", "js/engine/save.js", "js/engine/progress.js", "js/content/registry.js", "js/content/u-test.js", "js/ui/app.js"]) {
      assert.ok(page.includes("<script data-inlined=\"" + f + "\">"), f);
    }
    assert.ok(page.indexOf("js/engine/save.js\"") < page.indexOf("js/content/registry.js\""), "order kept");
    const logo = "data:image/png;base64," + b64("PNG-fake");
    const logo2 = "data:image/png;base64," + b64("PNG-fake-2x");
    assert.ok(page.includes("<img id=\"logo\" src=\"" + logo + "\" srcset=\"" + logo + " 1x, " + logo2 + " 2x\" alt=\"\">"));
    assert.ok(page.includes("var logo = \"" + logo + "\""), "an asset path in a script string");
    assert.ok(page.includes("\"assets/logo.png is the logo\""), "other strings are left alone");
    assert.ok(page.includes("url(\"data:font/woff2;base64," + b64("wOF2-fake-font") + "\")"), "fonts.css url() resolved against css/");
    assert.ok(page.includes("url(\"" + logo + "\")"), "../assets from css/style.css");
    assert.ok(page.includes("url(\"data:image/svg+xml;base64,"));
    assert.ok(page.includes("<link rel=\"icon\" href=\"data:image/svg+xml;base64,"));
    assert.ok(!/rel="pre(load|connect)"/.test(page), "preload/preconnect links are dropped");
    assert.ok(!page.includes("window.CCF_CONFIG = Object.assign("), "nothing baked into the plain build");

    // The built page runs: the engine and content load from the inlined scripts.
    let win = runPage(page);
    assert.deepStrictEqual([win.CCF.config.scormRequired, win.CCF.config.reference, win.CCF.content.cases().length], [false, true, 2]);

    const entries = zipListing(py, path.join(dir, "out1", "cardiac-case-files-scorm.zip"));
    assert.deepStrictEqual(entries.map((x) => x[0]), ["imsmanifest.xml", "index.html"]);
    assert.ok(entries.every((x) => x[1].join() === "1980,1,1,0,0,0" && x[2] === 0o100644));
    const inject = "<script>window.CCF_CONFIG = Object.assign({\"scormRequired\":true}, window.CCF_CONFIG || {});</script>\n";
    assert.ok(entries[1][3].includes(inject + "<script data-inlined=\"js/config.js\">"), "the SCORM build requires an LMS");
    assert.strictEqual(entries[1][3].replace(inject, ""), page, "otherwise the same page");
    win = runPage(entries[1][3]);
    assert.strictEqual(win.CCF.config.scormRequired, true);
    assert.match(entries[0][3], /<title>The Cardiac Case Files<\/title>/);
    assert.match(entries[0][3], /adlcp:scormtype="sco" href="index.html"/);

    // --reference off bakes the closed-book setting into both bundles.
    r = build(py, dir, path.join(dir, "out3"), ["--reference", "off"]);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /closed book/);
    const closed = read("out3/cardiac-case-files.html").toString("utf8");
    assert.ok(closed.includes("<script>window.CCF_CONFIG = Object.assign({\"reference\":false}, window.CCF_CONFIG || {});</script>"));
    assert.strictEqual(runPage(closed).CCF.config.reference, false);
    const zipped = zipListing(py, path.join(dir, "out3", "cardiac-case-files-scorm.zip"))[1][3];
    assert.ok(zipped.includes("Object.assign({\"reference\":false,\"scormRequired\":true}, window.CCF_CONFIG || {})"));
    win = runPage(zipped);
    assert.deepStrictEqual([win.CCF.config.reference, win.CCF.config.scormRequired], [false, true]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("build: refuses network resources and unsafe or broken input, with a clear message", () => {
  const py = python();
  if (!py) { console.log("       (skipped: python3 not found)"); return; }
  const page = (extra) => "<!DOCTYPE html><head>" + extra + "</head><script src=\"js/config.js\"></script>";
  const cases = [
    [{ "index.html": page("<script src=\"https://cdn.example.invalid/lib.js\"></script>") }, /<script src> 'https:\/\/cdn\.example\.invalid\/lib\.js' would be fetched from the network/],
    [{ "index.html": page("<script src=\"//cdn.example.invalid/lib.js\"></script>") }, /would be fetched from the network/],
    [{ "index.html": page("<link rel=\"stylesheet\" href=\"https://fonts.example.invalid/css\">") }, /stylesheet.*would be fetched from the network/],
    [{ "index.html": page("<img src=\"http://example.invalid/x.png\">") }, /src 'http:\/\/example\.invalid\/x\.png' would be fetched/],
    [{ "css/style.css": "@import \"https://fonts.example.invalid/x.css\";\n" }, /css\/style\.css: @import .* would be fetched from the network/],
    [{ "css/style.css": "body { background: url(https://example.invalid/bg.png); }\n" }, /css\/style\.css: url\(\) .* would be fetched/],
    [{ "js/ui/app.js": "var x = 1;\nvar s = '</script>';\n" }, /js\/ui\/app\.js contains "<\/script" on line 2/],
    [{ "js/ui/app.js": "var a = '<!--';\nvar b = '<script>';\n" }, /js\/ui\/app\.js contains "<!--"/],
    [{ "css/style.css": "/* </style> */\n" }, /css\/style\.css contains "<\/style"/],
    [{ "js/content/u-test.js": null }, /'js\/content\/u-test\.js' was not found/],
    [{ "assets/logo@2x.png": null }, /'assets\/logo@2x\.png' was not found/],
    [{ "assets/fonts/body.woff2": null }, /css\/fonts\.css: '\.\.\/assets\/fonts\/body\.woff2' was not found/],
    [{ "scorm/imsmanifest.xml": null }, /imsmanifest\.xml was not found/],
    [{ "scorm/imsmanifest.xml": "<manifest><oops></manifest>" }, /not valid XML/],
    [{ "scorm/imsmanifest.xml": "<manifest><resources><resource href=\"game.html\"/></resources></manifest>" }, /href="index\.html"/],
    [{ "index.html": "<!DOCTYPE html><script type=\"module\" src=\"js/config.js\"></script>" }, /module script/],
    [{ "index.html": "<!DOCTYPE html><script src=\"../outside.js\"></script>" }, /outside the game folder/],
    [{ "index.html": "<!DOCTYPE html><script src=\"js/ui/app.js\"></script>" }, /doesn't load js\/config\.js/],
    [{ "index.html": null }, /index\.html was not found/],
  ];
  for (const [files, message] of cases) {
    const dir = fakeGame(files);
    try {
      const out = path.join(dir, "out");
      const r = build(py, dir, out);
      assert.strictEqual(r.status, 1, "expected a failure for " + message + "\n" + r.stdout + r.stderr);
      assert.match(r.stderr, /^build\.py: error: /);
      assert.match(r.stderr, message);
      assert.ok(!fs.existsSync(path.join(out, "cardiac-case-files.html")), "nothing is written on failure");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("build: the real game folder builds (once index.html exists)", () => {
  const py = python();
  if (!py) { console.log("       (skipped: python3 not found)"); return; }
  if (!fs.existsSync(path.join(ROOT, "index.html"))) { console.log("       (skipped: index.html isn't written yet)"); return; }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "ccf-real-build-"));
  try {
    const r = build(py, ROOT, out);
    const missing = /error: (.*) was not found \(looked for ([^)]+)\)/.exec(r.stderr);
    if (r.status !== 0 && missing) {
      // Other builders are still writing files that index.html already refers to.
      console.log("       (skipped: " + missing[2] + " isn't written yet — " + missing[1] + ")");
      return;
    }
    assert.strictEqual(r.status, 0, r.stderr);
    const html = fs.readFileSync(path.join(out, "cardiac-case-files.html"), "utf8");
    assert.ok(!/<script[^>]*\ssrc=/.test(html.replace(/<!--[\s\S]*?-->/g, "")), "everything is inlined");
    assert.ok(html.includes("data-inlined=\"js/engine/save.js\""));
    const entries = zipListing(py, path.join(out, "cardiac-case-files-scorm.zip"));
    assert.deepStrictEqual(entries.map((x) => x[0]), ["imsmanifest.xml", "index.html"]);
    console.log("       (" + Math.round(html.length / 1024) + " KB single file)");
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// tools/dev_server.js and scorm/imsmanifest.xml
// ---------------------------------------------------------------------------

function get(port, rawPath, method) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: rawPath, method: method || "GET" }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"], cache: res.headers["cache-control"], body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("dev_server: serves the game folder with the right types; 404 and 403 otherwise", async () => {
  const { start, GAME } = require("./dev_server.js");
  assert.strictEqual(GAME, ROOT);
  const dir = fakeGame();
  const { server, port, url } = await start(0, dir);
  try {
    assert.strictEqual(url, "http://127.0.0.1:" + port + "/");
    let r = await get(port, "/");
    assert.deepStrictEqual([r.status, r.type, r.cache], [200, "text/html; charset=utf-8", "no-store"]);
    assert.match(r.body, /<title>The Cardiac Case Files<\/title>/);
    r = await get(port, "/js/engine/save.js?v=2");
    assert.deepStrictEqual([r.status, r.type], [200, "text/javascript; charset=utf-8"]);
    assert.strictEqual(r.body, source("js/engine/save.js"));
    r = await get(port, "/css/style.css");
    assert.strictEqual(r.type, "text/css; charset=utf-8");
    r = await get(port, "/assets/fonts/body.woff2");
    assert.strictEqual(r.type, "font/woff2");
    r = await get(port, "/assets/logo%402x.png");
    assert.deepStrictEqual([r.status, r.body], [200, "PNG-fake-2x"]);
    assert.strictEqual((await get(port, "/nope.js")).status, 404);
    assert.strictEqual((await get(port, "/%2e%2e/%2e%2e/etc/passwd")).status, 403);
    assert.strictEqual((await get(port, "/%E0%A4%A")).status, 400);
    assert.strictEqual((await get(port, "/index.html", "POST")).status, 405);
    r = await get(port, "/index.html", "HEAD");
    assert.deepStrictEqual([r.status, r.body], [200, ""]);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // The default root is the game folder.
  const real = await start();
  try {
    assert.strictEqual((await get(real.port, "/js/engine/progress.js")).status, 200);
    assert.strictEqual((await get(real.port, "/scorm/imsmanifest.xml")).type, "application/xml; charset=utf-8");
  } finally {
    real.server.close();
  }
});

test("manifest: a SCORM 1.2 manifest for The Cardiac Case Files", () => {
  const xml = source("scorm/imsmanifest.xml");
  assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
  assert.match(xml, /<schema>ADL SCORM<\/schema>\s*<schemaversion>1\.2<\/schemaversion>/);
  assert.match(xml, /xmlns="http:\/\/www\.imsproject\.org\/xsd\/imscp_rootv1p1p2"/);
  assert.match(xml, /xmlns:adlcp="http:\/\/www\.adlnet\.org\/xsd\/adlcp_rootv1p2"/);
  assert.strictEqual((xml.match(/<title>The Cardiac Case Files<\/title>/g) || []).length, 2);
  assert.match(xml, /<organizations default="cardiac-case-files-org">/);
  assert.match(xml, /identifierref="cardiac-case-files-sco"/);
  assert.match(xml, /<resource identifier="cardiac-case-files-sco" type="webcontent" adlcp:scormtype="sco" href="index.html">\s*<file href="index.html"\/>/);
  assert.ok(!/\sxsi:schemaLocation\s*=/.test(xml), "no xsi:schemaLocation (the XSDs aren't bundled)");
  assert.ok(!/masteryscore/.test(xml.replace(/<!--[\s\S]*?-->/g, "")), "no mastery score");
  const py = python();
  if (py) {
    const r = spawnSync(py, ["-c", "import sys, xml.etree.ElementTree as ET; ET.parse(sys.argv[1]); print('ok')", path.join(ROOT, "scorm", "imsmanifest.xml")], { encoding: "utf8" });
    assert.strictEqual(r.stdout.trim(), "ok", r.stderr);
  }
});

// ---------------------------------------------------------------------------

(async () => {
  const filter = process.argv[2] || "";
  let passed = 0, failed = 0;
  for (const t of tests) {
    if (filter && !t.name.includes(filter)) continue;
    engines.length = 0;
    try {
      await t.fn();
      const broken = engines.flatMap((e) => e.logs.filter((l) => /internal error in CCF\.Save/.test(l)));
      assert.deepStrictEqual(broken, [], "CCF.Save caught an internal error");
      passed++;
      console.log("  ok   " + t.name);
    } catch (err) {
      failed++;
      console.log("  FAIL " + t.name + "\n       " + String(err && err.stack || err).split("\n").slice(0, 8).join("\n       "));
    }
  }
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})();
