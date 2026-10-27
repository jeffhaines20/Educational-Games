#!/usr/bin/env node
/*
 * Engine tests: SS.config, SS.Progress, SS.Save, SS.Scorm (and the parts of
 * SS.PythonRunner that work without a browser). Dependency-free: every scenario
 * loads the real engine files into a fresh Node `vm` sandbox with a fake window,
 * fake localStorage, fake timers, fake SCORM LMS APIs and a small fake content set,
 * so the tests don't depend on the real chapters.
 *
 *   node tools/test_engine.js            # all tests
 *   node tools/test_engine.js save       # only tests whose name contains "save"
 *
 * Browser tests for the runner live in tools/e2e/engine-runner.js.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
const SOURCES = {};
function source(rel) {
  if (!SOURCES[rel]) SOURCES[rel] = fs.readFileSync(path.join(ROOT, rel), "utf8");
  return SOURCES[rel];
}

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function makeTimers() {
  let now = 0;
  let nextId = 1;
  const queue = new Map();
  return {
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
    get pending() { return queue.size; },
  };
}

function makeLocalStorage() {
  const data = new Map();
  const ls = {
    failWrites: false,
    writes: 0,
    getItem(k) { k = String(k); return data.has(k) ? data.get(k) : null; },
    failWritesLongerThan: 0,      // like a nearly full storage: only big writes fail
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

// Fake content: 3 chapters, 6 challenges.
const FAKE_CONTENT = `
  SS.defineChapter({ id: "alpha", order: 1, title: "Alpha", challenges: [
    { id: "alpha-one", difficulty: "easy", hints: ["a", "b", "c"] },
    { id: "alpha-two", difficulty: "medium", hints: ["a", "b"] }
  ]});
  SS.defineChapter({ id: "beta", order: 2, title: "Beta", challenges: [
    { id: "beta-one", difficulty: "hard", hints: ["a", "b", "c", "d"] }
  ]});
  SS.defineChapter({ id: "gamma", order: 3, title: "Gamma", challenges: [
    { id: "gamma-one", difficulty: "easy", hints: ["a"] },
    { id: "gamma-two", difficulty: "easy", hints: ["a", "b"] },
    { id: "gamma-three", difficulty: "medium", hints: ["a", "b"] }
  ]});
`;

/**
 * A fresh engine in a vm sandbox.
 * options: { storage: fakeLocalStorage | "blocked" | null, parent, opener, config, location,
 *            content: js string | false, files: [...], document }
 */
function makeEngine(options) {
  options = options || {};
  const timers = makeTimers();
  const listeners = {};
  const docListeners = {};
  const logs = [];
  const quietConsole = { log() {}, info() {}, warn: (...a) => logs.push(a.join(" ")), error: (...a) => logs.push(a.join(" ")) };
  const sb = {
    console: quietConsole,
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
  if (options.location) sb.location = options.location;
  if (options.config) sb.SS_CONFIG = options.config;
  if (options.storage === "blocked") {
    Object.defineProperty(sb, "localStorage", { get() { throw new Error("SecurityError: The operation is insecure."); } });
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
  const files = options.files || ["js/config.js", "js/engine/scorm.js", "js/engine/save.js", "js/engine/progress.js", "js/content/registry.js"];
  for (const rel of files) vm.runInContext(source(rel), sb, { filename: rel });
  if (options.content !== false) vm.runInContext(options.content || FAKE_CONTENT, sb, { filename: "fake-content.js" });
  return {
    sb, SS: sb.SS, timers, logs,
    fire(type, event) { (listeners[type] || []).forEach((fn) => fn(event || {})); },
    hide() { sb.document.visibilityState = "hidden"; (docListeners.visibilitychange || []).forEach((fn) => fn({})); },
    run(code) { return vm.runInContext(code, sb); },
  };
}

/** Objects from the sandbox have another realm's prototypes: compare plain copies. */
function plain(value) { return JSON.parse(JSON.stringify(value)); }

// ---------------------------------------------------------------------------
// Tiny test runner
// ---------------------------------------------------------------------------

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ---------------------------------------------------------------------------
// SS.config
// ---------------------------------------------------------------------------

test("config: defaults match the design document", () => {
  const { SS } = makeEngine({ files: ["js/config.js"], content: false });
  const c = SS.config;
  assert.strictEqual(c.title, "Pyromancer");
  assert.strictEqual(c.pyodideVersion, "0.29.5");
  assert.deepStrictEqual(plain(c.pyodideBaseURLs), ["https://cdn.jsdelivr.net/pyodide/v0.29.5/full/", "https://unpkg.com/pyodide@0.29.5/"]);
  assert.strictEqual(c.defaultTimeLimitMs, 8000);
  assert.strictEqual(c.outputLimitChars, 50000);
  assert.strictEqual(c.stepLimit, 2000000);
  assert.strictEqual(c.recursionLimit, 1000);
  assert.strictEqual(c.saveSlots, 3);
  assert.strictEqual(c.storageKey, "pyromancer");
  assert.strictEqual(c.allowAnswerScroll, true);
  assert.strictEqual(c.answerScrollAfterFailedCasts, 3);
  assert.strictEqual(c.unlockAll, false);
  assert.deepStrictEqual(plain(c.scorm), { enabled: true, completionThreshold: 1, allowImport: false });
  assert.strictEqual(c.scormRequired, false);
});

test("config: SS_CONFIG overrides are validated", () => {
  const { SS } = makeEngine({
    files: ["js/config.js"], content: false,
    config: { pyodideBaseURLs: "http://example.test/py", saveSlots: 99, defaultTimeLimitMs: "abc", scorm: { enabled: false, completionThreshold: 0.8 }, allowAnswerScroll: "no", extra: 7 },
  });
  assert.deepStrictEqual(plain(SS.config.pyodideBaseURLs), ["http://example.test/py/"]);
  assert.strictEqual(SS.config.saveSlots, 10);
  assert.strictEqual(SS.config.defaultTimeLimitMs, 8000);
  assert.strictEqual(SS.config.allowAnswerScroll, true);
  assert.deepStrictEqual(plain(SS.config.scorm), { enabled: false, completionThreshold: 0.8, allowImport: false });
  assert.strictEqual(SS.config.extra, 7);
});

test("config: URL parameters (unlock, answers, localPyodide only on localhost, never URLs)", () => {
  let { SS } = makeEngine({ files: ["js/config.js"], content: false, location: { search: "?unlock=all&answers=OFF&localPyodide=1", hostname: "localhost" } });
  assert.strictEqual(SS.config.unlockAll, true);
  assert.strictEqual(SS.config.allowAnswerScroll, false);
  assert.deepStrictEqual(plain(SS.config.pyodideBaseURLs), ["/pyodide/"]);
  ({ SS } = makeEngine({ files: ["js/config.js"], content: false, location: { search: "?localPyodide=1&pyodideBaseURLs=https://evil.test/", hostname: "school.example.org" } }));
  assert.deepStrictEqual(plain(SS.config.pyodideBaseURLs), ["https://cdn.jsdelivr.net/pyodide/v0.29.5/full/", "https://unpkg.com/pyodide@0.29.5/"]);
  ({ SS } = makeEngine({ files: ["js/config.js"], content: false, location: { search: "?%E0%A4%A=1&unlock=some", hostname: "127.0.0.1" } }));
  assert.strictEqual(SS.config.unlockAll, false);
});

// ---------------------------------------------------------------------------
// SS.Progress
// ---------------------------------------------------------------------------

function profileWith(records, settings) {
  return { challenges: records || {}, settings: Object.assign({ unlockAll: false }, settings || {}), seen: {} };
}
const done = (stars) => ({ completed: true, stars });

test("progress: stars and XP", () => {
  const { SS } = makeEngine();
  const P = SS.Progress;
  assert.strictEqual(P.starsFor({ hintsUsed: 0 }), 3);
  assert.strictEqual(P.starsFor({ hintsUsed: 1 }), 2);
  assert.strictEqual(P.starsFor({ hintsUsed: 2 }), 1);
  assert.strictEqual(P.starsFor({ hintsUsed: 9 }), 1);
  assert.strictEqual(P.starsFor({ hintsUsed: 0, answerRevealed: true }), 1);
  assert.strictEqual(P.starsFor({}), 3);
  const easy = SS.content.challengesById["alpha-one"], medium = SS.content.challengesById["alpha-two"], hard = SS.content.challengesById["beta-one"];
  assert.deepStrictEqual([3, 2, 1, 0].map((s) => P.xpFor(easy, s)), [10, 7, 3, 0]);
  assert.deepStrictEqual([3, 2, 1].map((s) => P.xpFor(medium, s)), [20, 13, 7]);
  assert.deepStrictEqual([3, 2, 1].map((s) => P.xpFor(hard, s)), [30, 20, 10]);
  assert.strictEqual(P.xpFor("beta-one", 3), 30);
  assert.strictEqual(P.xpFor("no-such-challenge", 3), 0);
  assert.strictEqual(P.maxXp(), 10 + 20 + 30 + 10 + 10 + 20);
  const prof = profileWith({ "alpha-one": done(3), "alpha-two": done(2), "ghost-id": done(3), "beta-one": { completed: false, stars: 3 } });
  assert.strictEqual(P.totalXp(prof), 10 + 13);
  assert.strictEqual(P.totalXp(null), 0);
});

test("progress: ranks, thresholds and fraction", () => {
  const { SS } = makeEngine();
  const P = SS.Progress;
  assert.deepStrictEqual(plain(P.RANKS).map((r) => r.title), ["Novice", "Apprentice", "Initiate", "Adept", "Conjurer", "Sorcerer", "Archmage"]);
  assert.deepStrictEqual(plain(P.RANKS).map((r) => r.share), [0, 0.04, 0.12, 0.25, 0.45, 0.65, 0.85]);
  assert.ok(P.RANKS.every((r) => typeof r.icon === "string" && r.icon.length > 0));
  const at = (xp, max) => P.rankFor(xp, max).title;
  assert.deepStrictEqual([0, 3, 4, 11, 12, 24, 25, 44, 45, 64, 65, 84, 85, 100].map((x) => at(x, 100)),
    ["Novice", "Novice", "Apprentice", "Apprentice", "Initiate", "Initiate", "Adept", "Adept", "Conjurer", "Conjurer", "Sorcerer", "Sorcerer", "Archmage", "Archmage"]);
  // 250 max: 10, 30, 62.5→63, 112.5→113, 162.5→163, 212.5→213
  assert.deepStrictEqual([62, 63, 112, 113].map((x) => at(x, 250)), ["Initiate", "Adept", "Adept", "Conjurer"]);
  const r = P.rankFor(8, 100);
  assert.deepStrictEqual(plain(r), { index: 1, title: "Apprentice", icon: r.icon, minXp: 4, nextTitle: "Initiate", nextXp: 12, fraction: 0.5 });
  const top = P.rankFor(100, 100);
  assert.strictEqual(top.nextTitle, null);
  assert.strictEqual(top.nextXp, null);
  assert.strictEqual(top.fraction, 1);
  // Default max = the content's max XP (100 here).
  assert.strictEqual(P.rankFor(85).title, "Archmage");
  assert.strictEqual(P.rankFor(-5).title, "Novice");
});

test("progress: handles no content and missing profiles", () => {
  const { SS } = makeEngine({ content: false });
  const P = SS.Progress;
  assert.strictEqual(P.maxXp(), 0);
  assert.deepStrictEqual(plain(P.rankFor(0)), { index: 0, title: "Novice", icon: P.RANKS[0].icon, minXp: 0, nextTitle: "Apprentice", nextXp: 1, fraction: 0 });
  assert.deepStrictEqual(plain(P.overallStats(null)), { completed: 0, total: 0, stars: 0, maxStars: 0, xp: 0, maxXp: 0, percent: 0 });
  assert.deepStrictEqual(plain(P.chapterStats(null, "alpha")), { completed: 0, total: 0, stars: 0, maxStars: 0, complete: false });
  assert.strictEqual(P.isChapterUnlocked(null, "alpha"), false);
  assert.strictEqual(P.isChallengeUnlocked(undefined, "alpha-one"), false);
  assert.strictEqual(P.firstIncomplete(null), null);
  assert.strictEqual(P.nextChallenge(null, "alpha-one"), null);
});

test("progress: unlock rules", () => {
  const { SS } = makeEngine();
  const P = SS.Progress;
  const fresh = profileWith({});
  assert.strictEqual(P.isChapterUnlocked(fresh, "alpha"), true);
  assert.strictEqual(P.isChapterUnlocked(fresh, "beta"), false);
  assert.strictEqual(P.isChapterUnlocked(fresh, "nope"), false);
  assert.strictEqual(P.isChallengeUnlocked(fresh, "alpha-one"), true);
  assert.strictEqual(P.isChallengeUnlocked(fresh, "alpha-two"), false);
  assert.strictEqual(P.isChallengeUnlocked(fresh, "beta-one"), false);
  assert.strictEqual(P.isChallengeUnlocked(fresh, "nope"), false);

  const one = profileWith({ "alpha-one": done(3) });
  assert.strictEqual(P.isChallengeUnlocked(one, "alpha-two"), true);
  assert.strictEqual(P.isChapterUnlocked(one, "beta"), false);

  const alphaDone = profileWith({ "alpha-one": done(3), "alpha-two": done(1) });
  assert.strictEqual(P.isChapterUnlocked(alphaDone, "beta"), true);
  assert.strictEqual(P.isChallengeUnlocked(alphaDone, "beta-one"), true);
  assert.strictEqual(P.isChapterUnlocked(alphaDone, "gamma"), false);

  const free = profileWith({}, { unlockAll: true });
  assert.strictEqual(P.unlockAll(free), true);
  assert.strictEqual(P.isChallengeUnlocked(free, "gamma-three"), true);
  SS.config.unlockAll = true;
  assert.strictEqual(P.unlockAll(fresh), true);
  assert.strictEqual(P.isChapterUnlocked(fresh, "gamma"), true);
  SS.config.unlockAll = false;

  // Completed in free practice, then free practice turned off: own work stays open.
  const earlier = profileWith({ "gamma-two": done(2) });
  assert.strictEqual(P.isChallengeUnlocked(earlier, "gamma-two"), true);
  assert.strictEqual(P.isChapterUnlocked(earlier, "gamma"), true);
  assert.strictEqual(P.isChallengeUnlocked(earlier, "gamma-one"), true);
  assert.strictEqual(P.isChallengeUnlocked(earlier, "gamma-three"), true);
});

test("progress: stats, next challenge and continue target", () => {
  const { SS } = makeEngine();
  const P = SS.Progress;
  const prof = profileWith({ "alpha-one": done(3), "alpha-two": done(2), "beta-one": done(1) });
  assert.deepStrictEqual(plain(P.chapterStats(prof, "alpha")), { completed: 2, total: 2, stars: 5, maxStars: 6, complete: true });
  assert.deepStrictEqual(plain(P.chapterStats(prof, "gamma")), { completed: 0, total: 3, stars: 0, maxStars: 9, complete: false });
  assert.deepStrictEqual(plain(P.overallStats(prof)), { completed: 3, total: 6, stars: 6, maxStars: 18, xp: 10 + 13 + 10, maxXp: 100, percent: 50 });
  assert.strictEqual(P.nextChallenge(prof, "alpha-one").id, "alpha-two");
  assert.strictEqual(P.nextChallenge(prof, "alpha-two").id, "beta-one");
  assert.strictEqual(P.nextChallenge(prof, "beta-one").id, "gamma-one");
  assert.strictEqual(P.nextChallenge(profileWith({ "alpha-one": done(3) }), "alpha-two"), null, "next chapter still locked");
  assert.strictEqual(P.nextChallenge(prof, "gamma-three"), null);
  assert.strictEqual(P.nextChallenge(prof, "nope"), null);
  assert.strictEqual(P.firstIncomplete(profileWith({})).id, "alpha-one");
  assert.strictEqual(P.firstIncomplete(prof).id, "gamma-one");
  const all = profileWith(Object.fromEntries(P.allChallenges().map((c) => [c.id, done(3)])));
  assert.strictEqual(P.firstIncomplete(all), null);
  assert.strictEqual(P.overallStats(all).percent, 100);
  assert.strictEqual(P.rankFor(P.totalXp(all)).title, "Archmage");
  assert.strictEqual(JSON.stringify(P.overallStats(prof)), JSON.stringify(P.overallStats(prof)), "deterministic");
});

// ---------------------------------------------------------------------------
// SS.Save — local mode
// ---------------------------------------------------------------------------

async function initSave(engine) {
  const result = await engine.SS.Save.init();
  return plain(result);
}

test("save: create, list, persist and reload a profile", async () => {
  const storage = makeLocalStorage();
  let e = makeEngine({ storage });
  assert.deepStrictEqual(await initSave(e), { storage: "local", scorm: false, learnerName: null, defaultWizardName: null, scormMissing: false });
  const S = e.SS.Save;
  assert.strictEqual(S.storageWarning(), null);
  assert.strictEqual(S.isScorm(), false);
  assert.deepStrictEqual(plain(S.listSlots()), [null, null, null]);
  assert.strictEqual(S.getLastSlot(), null);
  const p = S.createProfile(1, "  Merlin\u0007 the\n Wise ");
  assert.strictEqual(p.wizardName, "Merlin the Wise");
  assert.strictEqual(S.getProfile(), p);
  assert.ok(storage.getItem("pyromancer:slot:1"));
  assert.strictEqual(storage.getItem("pyromancer:lastSlot"), "1");
  assert.strictEqual(S.getLastSlot(), 1);
  const slots = plain(S.listSlots());
  assert.strictEqual(slots[0], null);
  assert.deepStrictEqual(Object.keys(slots[1]).sort(), ["completed", "rankIcon", "rankTitle", "slot", "stars", "total", "updatedAt", "wizardName", "xp"]);
  assert.strictEqual(slots[1].wizardName, "Merlin the Wise");
  assert.strictEqual(slots[1].total, 6);
  assert.strictEqual(slots[1].rankTitle, "Novice");
  assert.ok(Array.isArray(Object.keys(p.challenges)) && p.version === 1 && typeof p.id === "string");
  assert.deepStrictEqual(plain(p.settings), { sound: true, reduceMotion: false, editorFontSize: 15, unlockAll: false });
  S.recordCast("alpha-one", { passed: false });
  S.recordCompletion("alpha-one", { code: "print('hi')\n" });

  // "Reload the page": a new engine with the same storage.
  e = makeEngine({ storage });
  await initSave(e);
  assert.strictEqual(e.SS.Save.getProfile(), null, "nothing is active until a slot is loaded");
  assert.strictEqual(e.SS.Save.getLastSlot(), 1);
  const again = e.SS.Save.loadProfile(1);
  assert.strictEqual(again.wizardName, "Merlin the Wise");
  assert.strictEqual(again.challenges["alpha-one"].completed, true);
  assert.strictEqual(again.challenges["alpha-one"].bestCode, "print('hi')\n");
  assert.strictEqual(e.SS.Save.loadProfile(0), null);
  assert.strictEqual(e.SS.Save.getProfile().id, again.id, "a failed load keeps the active profile");
  assert.throws(() => e.SS.Save.createProfile(3, "x"), /slot from 1 to 3/);
  assert.throws(() => e.SS.Save.loadProfile(-1), /slot/);
  assert.strictEqual(e.SS.Save.createProfile(0, "\u0000\u202E  ").wizardName, "Apprentice");
});

test("save: casts, hints, answers and completions (stars, best kept, XP)", async () => {
  const e = makeEngine();
  await initSave(e);
  const S = e.SS.Save;
  S.createProfile(0, "Ada");
  const changes = [];
  const off = S.onChange((profile, info) => changes.push(info.type + ":" + (info.challengeId || "")));

  assert.deepStrictEqual(plain(S.recordCast("alpha-one", { passed: false })), Object.assign(plain(S.getRecord("alpha-one")), {}));
  S.recordCast("alpha-one", { passed: false });
  S.recordCast("alpha-one", { passed: true });
  let rec = S.getRecord("alpha-one");
  assert.strictEqual(rec.casts, 3);
  assert.strictEqual(rec.failedCasts, 2);
  assert.strictEqual(S.getProfile().lastChallengeId, "alpha-one");

  assert.strictEqual(S.revealHint("alpha-one"), 1);
  let res = plain(S.recordCompletion("alpha-one", { code: "two stars" }));
  assert.strictEqual(res.firstTime, true);
  assert.strictEqual(res.previousStars, 0);
  assert.strictEqual(res.stars, 2);
  assert.strictEqual(res.bestStars, 2);
  assert.strictEqual(res.xpGained, 7);
  assert.strictEqual(res.totalXp, 7);
  assert.strictEqual(res.rankUp, true);          // 7 of 100 XP: Novice → Apprentice
  assert.strictEqual(res.rank.title, "Apprentice");

  // More hints later don't lower saved stars; a worse completion keeps the best.
  assert.strictEqual(S.revealHint("alpha-one"), 2);
  assert.strictEqual(S.revealHint("alpha-one"), 3);
  assert.strictEqual(S.revealHint("alpha-one"), 3, "can't reveal more hints than the challenge has");
  assert.strictEqual(S.getRecord("alpha-one").stars, 2);
  res = plain(S.recordCompletion("alpha-one", { code: "one star" }));
  assert.deepStrictEqual([res.firstTime, res.previousStars, res.stars, res.bestStars, res.xpGained, res.rankUp], [false, 2, 1, 2, 0, false]);
  assert.strictEqual(S.getRecord("alpha-one").bestCode, "two stars", "bestCode comes from the best completion");

  // Answer Scroll → 1 star.
  S.revealAnswer("beta-one");
  res = plain(S.recordCompletion("beta-one", { code: "x" }));
  assert.deepStrictEqual([res.stars, res.xpGained], [1, 10]);

  // A perfect completion of a new challenge.
  res = plain(S.recordCompletion("alpha-two", { code: "y" }));
  assert.deepStrictEqual([res.firstTime, res.stars, res.xpGained], [true, 3, 20]);
  const completedAt = S.getRecord("alpha-two").completedAt;
  assert.ok(!isNaN(Date.parse(completedAt)));
  S.recordCompletion("alpha-two", { code: "z" });
  assert.strictEqual(S.getRecord("alpha-two").completedAt, completedAt, "first completion time is kept");
  assert.strictEqual(S.getRecord("alpha-two").bestCode, "z", "an equally good completion updates bestCode");
  assert.strictEqual(e.SS.Progress.totalXp(S.getProfile()), 7 + 10 + 20);

  assert.ok(changes.includes("cast:alpha-one") && changes.includes("hint:alpha-one") && changes.includes("completion:beta-one") && changes.includes("answer:beta-one"));
  off();
  S.markSeen("prologue");
  assert.ok(!changes.includes("seen:"), "unsubscribed");
  // Bad ids are ignored, never thrown.
  assert.strictEqual(S.recordCast("__proto__", { passed: true }), null);
  assert.strictEqual(S.revealHint(""), 0);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(S.getProfile().challenges, "__proto__"), false);
});

test("save: seen flags, settings and practice code", async () => {
  const storage = makeLocalStorage();
  const e = makeEngine({ storage });
  await initSave(e);
  const S = e.SS.Save;
  S.createProfile(0, "Ada");
  assert.strictEqual(S.hasSeen("prologue"), false);
  S.markSeen("prologue");
  S.markSeen("chapter:alpha");
  assert.strictEqual(S.hasSeen("prologue"), true);
  assert.strictEqual(S.hasSeen("chapter:alpha"), true);
  assert.strictEqual(S.hasSeen("constructor"), false);
  assert.strictEqual(S.hasSeen("toString"), false);
  assert.strictEqual(S.markSeen("__proto__"), false);
  assert.deepStrictEqual(plain(S.updateSettings({ sound: false, editorFontSize: 99, reduceMotion: "yes", bogus: 1 })),
    { sound: false, reduceMotion: false, editorFontSize: 32, unlockAll: false });
  assert.deepStrictEqual(plain(S.updateSettings({ editorFontSize: 3, unlockAll: true })).editorFontSize, 10);
  assert.strictEqual(e.SS.Progress.unlockAll(S.getProfile()), true);
  assert.strictEqual(S.getPracticeCode(), "");
  S.savePracticeCode("print(42)");
  assert.strictEqual(S.getPracticeCode(), "print(42)");
  S.flush();
  assert.strictEqual(JSON.parse(storage.getItem("pyromancer:slot:0")).practiceCode, "print(42)");
});

test("save: drafts are debounced, and flushed on pagehide / visibilitychange", async () => {
  const storage = makeLocalStorage();
  const e = makeEngine({ storage });
  await initSave(e);
  const S = e.SS.Save;
  S.createProfile(0, "Ada");
  const stored = () => JSON.parse(storage.getItem("pyromancer:slot:0"));
  const changes = [];
  S.onChange((p, info) => changes.push(info.type));
  S.saveDraft("alpha-one", "print(1)");
  S.saveDraft("alpha-one", "print(12)");
  assert.strictEqual(S.getRecord("alpha-one").draft, "print(12)", "visible at once in memory");
  assert.strictEqual(stored().challenges["alpha-one"], undefined, "not written yet");
  e.timers.advance(2000);
  assert.strictEqual(stored().challenges["alpha-one"].draft, "print(12)");
  assert.deepStrictEqual(changes, [], "draft autosaves don't trigger onChange");

  S.saveDraft("alpha-one", "print(123)");
  e.fire("pagehide", { persisted: false });
  assert.strictEqual(stored().challenges["alpha-one"].draft, "print(123)");
  S.saveDraft("alpha-two", "draft two");
  e.hide();
  assert.strictEqual(stored().challenges["alpha-two"].draft, "draft two");
  const writes = storage.writes;
  S.saveDraft("alpha-two", "draft two");          // unchanged: nothing to do
  e.timers.advance(2000);
  assert.strictEqual(storage.writes, writes);
  assert.strictEqual(S.saveDraft("alpha-one", "x".repeat(300000)), false, "absurdly long drafts are refused");
  assert.strictEqual(S.getRecord("alpha-one").draft, "print(123)");
  assert.strictEqual(S.saveDraft("not a valid id!", "x"), false);
});

test("save: delete a slot", async () => {
  const storage = makeLocalStorage();
  const e = makeEngine({ storage });
  await initSave(e);
  const S = e.SS.Save;
  S.createProfile(0, "One");
  S.createProfile(2, "Three");
  assert.deepStrictEqual(plain(S.listSlots()).map((s) => s && s.wizardName), ["One", null, "Three"]);
  assert.strictEqual(S.getLastSlot(), 2);
  S.deleteSlot(2);
  assert.strictEqual(S.getProfile(), null);
  assert.strictEqual(S.getLastSlot(), null);
  assert.deepStrictEqual(plain(S.listSlots()).map((s) => s && s.wizardName), ["One", null, null]);
  assert.strictEqual(storage.getItem("pyromancer:slot:2"), null);
});

test("save: blocked storage falls back to memory with a warning", async () => {
  for (const storage of ["blocked", null]) {
    const e = makeEngine({ storage });
    const result = await initSave(e);
    assert.strictEqual(result.storage, "memory");
    const S = e.SS.Save;
    assert.match(S.storageWarning(), /Save Scroll/);
    const p = S.createProfile(0, "Ghost");
    S.recordCompletion("alpha-one", { code: "x" });
    S.saveDraft("alpha-two", "y");
    e.fire("pagehide", { persisted: false });
    assert.strictEqual(S.getProfile(), p);
    assert.strictEqual(plain(S.listSlots())[0].wizardName, "Ghost");
    assert.strictEqual(S.getLastSlot(), 0);
    assert.ok(S.exportCode().startsWith("PYRO1."));
  }
});

test("save: quota errors keep data in memory, warn, and recover", async () => {
  const storage = makeLocalStorage();
  const e = makeEngine({ storage });
  await initSave(e);
  const S = e.SS.Save;
  S.createProfile(0, "Full");
  storage.failWrites = true;
  S.recordCompletion("alpha-one", { code: "x" });
  assert.match(S.storageWarning(), /full/);
  assert.strictEqual(S.getRecord("alpha-one").completed, true);
  assert.strictEqual(plain(S.listSlots())[0].completed, 1, "still listed from memory");
  storage.failWrites = false;
  S.recordCast("alpha-two", { passed: false });
  assert.strictEqual(S.storageWarning(), null, "warning cleared once saving works again");
  assert.strictEqual(JSON.parse(storage.getItem("pyromancer:slot:0")).challenges["alpha-one"].completed, true);
});

test("save: corrupt and partly corrupt slots", async () => {
  const storage = makeLocalStorage();
  storage.setItem("pyromancer:slot:0", "{not json");
  storage.setItem("pyromancer:slot:1", JSON.stringify({
    wizardName: 42, createdAt: "yesterday-ish", challenges: { "alpha-one": { completed: true, stars: 7, casts: -4, hintsUsed: "2" }, "bad id!": {}, "beta-one": "nope" },
    seen: { prologue: 1, "": true }, settings: { editorFontSize: "18", sound: "loud" }, practiceCode: 5, lastChallengeId: "alpha-one", hack: "<script>",
  }));
  storage.setItem("pyromancer:slot:2", "[1,2,3]");
  storage.setItem("pyromancer:lastSlot", "0");
  const e = makeEngine({ storage });
  await initSave(e);
  const S = e.SS.Save;
  const slots = plain(S.listSlots());
  assert.deepStrictEqual(slots[0], { slot: 0, damaged: true }, "a damaged save is reported, not shown as empty");
  assert.deepStrictEqual(slots[2], { slot: 2, damaged: true });
  assert.strictEqual(slots[1].wizardName, "42");
  assert.strictEqual(S.getLastSlot(), null, "lastSlot points at a damaged slot");
  assert.strictEqual(S.loadProfile(0), null);
  const p = S.loadProfile(1);
  assert.deepStrictEqual(plain(p.challenges["alpha-one"]), { completed: true, stars: 3, casts: 0, failedCasts: 0, hintsUsed: 2, answerRevealed: false, draft: null, bestCode: null, completedAt: null });
  assert.deepStrictEqual(Object.keys(p.challenges), ["alpha-one"]);
  assert.deepStrictEqual(plain(p.seen), { prologue: true });
  assert.deepStrictEqual(plain(p.settings), { sound: true, reduceMotion: false, editorFontSize: 18, unlockAll: false });
  assert.strictEqual(p.practiceCode, "");
  assert.strictEqual(p.hack, undefined);
  assert.ok(!isNaN(Date.parse(p.createdAt)));
  storage.setItem("pyromancer:lastSlot", "7");
  assert.strictEqual(S.getLastSlot(), null);
});

test("save: name cleaning (control characters, 24 characters, emoji)", () => {
  const { SS } = makeEngine();
  const clean = SS.Save._cleanName;
  assert.strictEqual(clean("  Zoë\u0000\u202E  the\n\tGreat  "), "Zoë the Great");
  assert.strictEqual(clean("abcdefghijklmnopqrstuvwxyz0123"), "abcdefghijklmnopqrstuvwx");
  assert.strictEqual(Array.from(clean("🧙".repeat(30))).length, 24, "counts characters, not UTF-16 units");
  assert.strictEqual(clean("\ud800lone"), "lone");
  assert.strictEqual(clean(null), "");
  assert.strictEqual(clean("Ada\u200D♀"), "Ada\u200D♀", "ZWJ is kept for emoji sequences");
  assert.strictEqual(SS.Save._fileName("Zoë / the: Great"), "pyromancer-Zoë-the-Great.json");
  assert.strictEqual(SS.Save._fileName("///"), "pyromancer-wizard.json");
});

test("save: exportCode round-trips through importData (compact, no code)", async () => {
  const e = makeEngine();
  await initSave(e);
  const S = e.SS.Save;
  const p = S.createProfile(0, "Zoë 🧙 李");
  S.recordCast("alpha-one", { passed: false });
  S.revealHint("alpha-one");
  S.recordCompletion("alpha-one", { code: "secret solution" });
  S.saveDraft("alpha-two", "draft code");
  S.recordCast("alpha-two", { passed: false });
  S.revealAnswer("alpha-two");
  S.markSeen("prologue");
  S.markSeen("chapter:alpha");
  S.updateSettings({ sound: false, editorFontSize: 20, unlockAll: true });
  const code = S.exportCode();
  assert.match(code, /^PYRO1\.[A-Za-z0-9_-]+$/);
  const json = Buffer.from(code.slice(5), "base64url").toString("utf8");
  assert.ok(!/secret solution|draft code/.test(json), "the code holds no drafts or solutions");
  assert.ok(code.length < 1000);

  const imported = S.importData("  " + code.slice(0, 40) + "\n " + code.slice(40) + ".  ", 2);
  assert.strictEqual(S.getProfile(), imported);
  const strip = (prof) => {
    const out = plain(prof);
    for (const rec of Object.values(out.challenges)) { rec.draft = null; rec.bestCode = null; }
    out.practiceCode = "";
    delete out.updatedAt;
    return out;
  };
  const copy = strip(imported);
  assert.deepStrictEqual(copy.challenges, strip(p).challenges);
  assert.strictEqual(copy.wizardName, p.wizardName);
  assert.strictEqual(copy.id, p.id);
  assert.strictEqual(copy.createdAt, p.createdAt);
  assert.deepStrictEqual(copy.seen, plain(p.seen));
  assert.deepStrictEqual(copy.settings, plain(p.settings));
  assert.strictEqual(copy.lastChallengeId, "alpha-two");
  assert.strictEqual(plain(S.listSlots())[2].wizardName, p.wizardName);
  // Exporting the imported profile gives the same code (apart from updatedAt).
  const reexport = JSON.parse(Buffer.from(S.exportCode().slice(5), "base64url").toString("utf8"));
  const first = JSON.parse(json);
  delete reexport.u; delete first.u;
  assert.deepStrictEqual(reexport, first);
});

test("save: exportFile downloads everything and importData reads the file", async () => {
  const clicks = [];
  const blobs = [];
  const doc = {
    visibilityState: "visible",
    addEventListener() {},
    body: { appendChild(el) { el.parentNode = this; }, removeChild() {} },
    createElement() { return { style: {}, click() { clicks.push(this.download); } }; },
  };
  const e = makeEngine({ document: doc });
  e.sb.Blob = function (parts, opts) { blobs.push({ text: parts.join(""), type: opts.type }); };
  e.sb.URL = { createObjectURL: () => "blob:fake", revokeObjectURL() {} };
  await initSave(e);
  const S = e.SS.Save;
  S.createProfile(0, "Merlin the Great");
  S.saveDraft("alpha-one", "my draft");
  S.recordCompletion("alpha-two", { code: "best code" });
  S.savePracticeCode("practice!");
  assert.strictEqual(S.exportFile(), true);
  assert.deepStrictEqual(clicks, ["pyromancer-Merlin-the-Great.json"]);
  assert.strictEqual(blobs[0].type, "application/json");
  const file = JSON.parse(blobs[0].text);
  assert.strictEqual(file.format, "pyromancer-save");
  assert.strictEqual(file.profile.challenges["alpha-one"].draft, "my draft");
  const restored = S.importData(blobs[0].text, 1);
  assert.strictEqual(restored.challenges["alpha-one"].draft, "my draft");
  assert.strictEqual(restored.challenges["alpha-two"].bestCode, "best code");
  assert.strictEqual(restored.practiceCode, "practice!");
  // A bare profile JSON is accepted too.
  assert.strictEqual(S.importData(JSON.stringify(file.profile), 2).wizardName, "Merlin the Great");
  // Downloads blocked → false, never a throw.
  e.sb.Blob = function () { throw new Error("blocked"); };
  assert.strictEqual(S.exportFile(), false);
});

test("save: importData rejects junk with friendly messages", async () => {
  const e = makeEngine();
  await initSave(e);
  const S = e.SS.Save;
  S.createProfile(0, "Ada");
  S.recordCompletion("alpha-one", {});
  const good = S.exportCode();
  const cases = [
    ["", /Paste a save code/],
    [null, /Paste a save code/],
    ["hello there", /doesn't look like a Save Scroll/],
    ["SNS1.!!!!", /damaged or incomplete/],
    [good.slice(0, good.length - 12), /damaged or incomplete/],
    ["SNS1." + Buffer.from('{"v":1}x').toString("base64url"), /damaged/],
    ["SNS2.abcd", /newer version/],
    ["SNS1." + Buffer.from(JSON.stringify({ v: 5 })).toString("base64url"), /newer version/],
    ["{not json", /damaged/],
    ['{"foo": 1}', /doesn't look like a Save Scroll/],
    ['{"format": "syntax-and-sorcery-save", "version": 9, "profile": {}}', /newer version/],
    ["[1, 2]", /doesn't look like a Save Scroll/],
  ];
  for (const [input, message] of cases) {
    assert.throws(() => S.importData(input, 1), (err) => err instanceof e.run("Error") && message.test(err.message), "input: " + String(input).slice(0, 30));
  }
  assert.throws(() => S.importData(good, 5), /slot/);
  assert.strictEqual(S.getProfile().wizardName, "Ada", "failed imports change nothing");
  assert.deepStrictEqual(plain(S.listSlots()).map((s) => s && s.wizardName), ["Ada", null, null]);
});

test("save: imported data is sanitised (types, names, unknown fields, __proto__)", async () => {
  const e = makeEngine();
  await initSave(e);
  const S = e.SS.Save;
  const evil = '{"format":"syntax-and-sorcery-save","version":1,"profile":{"wizardName":"\\u0007Mallory\\u202e the Destroyer of Worlds and More",' +
    '"__proto__":{"polluted":true},"isAdmin":true,"challenges":{"__proto__":{"completed":true},"constructor":{"completed":true,"stars":3},' +
    '"alpha-one":{"completed":"yes","stars":3,"hintsUsed":1e9,"draft":{"x":1},"extra":1},"beta-one":{"completed":true,"stars":2.7,"casts":"12","completedAt":"9999-01-01"}},' +
    '"seen":{"prologue":true,"__proto__":true,"x":false},"settings":{"sound":false,"editorFontSize":1e9,"theme":"evil"},"practiceCode":"ok","lastChallengeId":"<img>"}}';
  const p = S.importData(evil, 0);
  assert.strictEqual(p.wizardName, "Mallory the Destroyer of");
  assert.strictEqual(p.isAdmin, undefined);
  assert.strictEqual(({}).polluted, undefined);
  assert.strictEqual(e.run("({}).polluted"), undefined, "no prototype pollution in the sandbox");
  assert.deepStrictEqual(Object.keys(p.challenges).sort(), ["alpha-one", "beta-one", "constructor"]);
  assert.deepStrictEqual(plain(p.challenges["alpha-one"]), { completed: false, stars: 0, casts: 0, failedCasts: 0, hintsUsed: 20, answerRevealed: false, draft: null, bestCode: null, completedAt: null });
  assert.strictEqual(p.challenges["beta-one"].stars, 2);
  assert.strictEqual(p.challenges["beta-one"].casts, 12);
  assert.strictEqual(p.challenges["beta-one"].completedAt, null, "dates outside 2000-2200 are dropped");
  assert.deepStrictEqual(plain(p.seen), { prologue: true });
  assert.deepStrictEqual(plain(p.settings), { sound: false, reduceMotion: false, editorFontSize: 32, unlockAll: false });
  assert.strictEqual(p.lastChallengeId, null);
  assert.strictEqual(e.SS.Progress.isComplete(p, "constructor"), true, "odd ids are plain data");
  assert.strictEqual(e.SS.Progress.totalXp(p), 20, "unknown ids give no XP");
});

// ---------------------------------------------------------------------------
// SS.Scorm
// ---------------------------------------------------------------------------

test("scorm: no LMS → not active, every call is a harmless no-op", () => {
  const { SS } = makeEngine();
  const Sc = SS.Scorm;
  assert.strictEqual(Sc.connect(), false);
  assert.strictEqual(Sc.isActive(), false);
  assert.strictEqual(Sc.version, null);
  assert.deepStrictEqual(plain(Sc.getLearner()), { id: "", name: "" });
  assert.strictEqual(Sc.loadSuspendData(), "");
  assert.strictEqual(Sc.saveSuspendData("x"), false);
  assert.strictEqual(Sc.reportProgress({ completed: 1, total: 2 }), false);
  assert.strictEqual(Sc.commit(), false);
  assert.strictEqual(Sc.finish(), false);
});

test("scorm: finds a 1.2 API through a cross-origin frame and talks to it", () => {
  const api = makeScorm12();
  const lms = topWindow({ API: api });
  const middle = crossOriginWindow(lms);
  const { SS } = makeEngine({ parent: middle });
  const Sc = SS.Scorm;
  assert.strictEqual(Sc.connect(), true);
  assert.strictEqual(Sc.connect(), true, "idempotent");
  assert.strictEqual(api.count("init"), 1);
  assert.strictEqual(Sc.version, "1.2");
  assert.strictEqual(api.data["cmi.core.lesson_status"], "incomplete");
  assert.strictEqual(api.data["cmi.core.exit"], "suspend");
  assert.deepStrictEqual(plain(Sc.getLearner()), { id: "learner-42", name: "Jane Doe" });
  assert.strictEqual(Sc.saveSuspendData("S1|abc"), true);
  assert.strictEqual(Sc.loadSuspendData(), "S1|abc");
  assert.strictEqual(Sc.saveSuspendData("x".repeat(4097)), false);
  assert.strictEqual(Sc.suspendDataLimit(), 4096);
  assert.strictEqual(Sc.reportProgress({ completed: 1, total: 3 }), true);
  assert.strictEqual(api.data["cmi.core.score.raw"], "33");
  assert.strictEqual(api.data["cmi.core.score.min"], "0");
  assert.strictEqual(api.data["cmi.core.score.max"], "100");
  assert.strictEqual(api.data["cmi.core.lesson_status"], "incomplete");
  Sc.reportProgress({ completed: 3, total: 3 });
  assert.strictEqual(api.data["cmi.core.score.raw"], "100");
  assert.strictEqual(api.data["cmi.core.lesson_status"], "completed");
  Sc.reportProgress({ completed: 2, total: 3 });
  assert.strictEqual(api.data["cmi.core.lesson_status"], "completed", "never downgraded");
  assert.strictEqual(Sc.commit(), true);
  assert.strictEqual(Sc.finish(), true);
  assert.strictEqual(Sc.finish(), false);
  assert.strictEqual(api.count("finish"), 1, "finish only once");
  assert.match(api.data["cmi.core.session_time"], /^\d{2,4}:\d{2}:\d{2}\.\d{2}$/);
  assert.strictEqual(Sc.isActive(), false);
  assert.strictEqual(Sc.connect(), false, "no reconnect after finish");
});

test("scorm: 2004 API, completion threshold, opener windows, 'already initialised'", () => {
  const api = makeScorm2004();
  let { SS } = makeEngine({ parent: topWindow({ API_1484_11: api }), config: { scorm: { completionThreshold: 0.5 } } });
  let Sc = SS.Scorm;
  assert.strictEqual(Sc.connect(), true);
  assert.strictEqual(Sc.version, "2004");
  assert.strictEqual(api.data["cmi.completion_status"], "incomplete");
  assert.deepStrictEqual(plain(Sc.getLearner()), { id: "learner-2004", name: "Ada Lovelace" });
  assert.strictEqual(Sc.suspendDataLimit(), 64000);
  Sc.reportProgress({ completed: 1, total: 4 });
  assert.strictEqual(api.data["cmi.completion_status"], "incomplete");
  assert.strictEqual(api.data["cmi.score.scaled"], "0.25");
  assert.strictEqual(api.data["cmi.progress_measure"], "0.25");
  Sc.reportProgress({ completed: 2, total: 4 });
  assert.strictEqual(api.data["cmi.completion_status"], "completed");
  assert.strictEqual(api.data["cmi.score.raw"], "50");
  Sc.finish();
  assert.match(api.data["cmi.session_time"], /^PT\d+H\d+M\d+\.\d{2}S$/);
  assert.strictEqual(api.data["cmi.exit"], "suspend");

  // A popup launched by the LMS: the API lives in the opener's frame chain.
  const api2 = makeScorm12();
  const lmsTop = topWindow({ API: api2 });
  const openerFrame = { parent: lmsTop };
  ({ SS } = makeEngine({ opener: openerFrame }));
  assert.strictEqual(SS.Scorm.connect(), true);
  assert.strictEqual(SS.Scorm.version, "1.2");

  // The game was reloaded inside the same LMS session: Initialize fails with 103 / 101.
  const again = makeScorm2004();
  again._setInitialized(true);
  ({ SS } = makeEngine({ parent: topWindow({ API_1484_11: again }) }));
  assert.strictEqual(SS.Scorm.connect(), true);
  const again12 = makeScorm12();
  again12._setInitialized(true);
  ({ SS } = makeEngine({ parent: topWindow({ API: again12 }) }));
  assert.strictEqual(SS.Scorm.connect(), true);

  // Status "completed" from an earlier session is never downgraded.
  const old = makeScorm12({ "cmi.core.lesson_status": "passed" });
  ({ SS } = makeEngine({ parent: topWindow({ API: old }) }));
  SS.Scorm.connect();
  SS.Scorm.reportProgress({ completed: 0, total: 5 });
  assert.strictEqual(old.data["cmi.core.lesson_status"], "passed");

  // Disabled by config.
  ({ SS } = makeEngine({ parent: topWindow({ API: makeScorm12() }), config: { scorm: false } }));
  assert.strictEqual(SS.Scorm.connect(), false);
});

test("scorm: a broken LMS API never makes the game throw", () => {
  const boom = () => { throw new Error("LMS exploded"); };
  const api = { LMSInitialize: boom, LMSGetValue: boom, LMSSetValue: boom, LMSCommit: boom, LMSFinish: boom, LMSGetLastError: boom };
  let { SS } = makeEngine({ parent: topWindow({ API: api }) });
  assert.strictEqual(SS.Scorm.connect(), false);
  const flaky = makeScorm12();
  flaky.LMSSetValue = boom;
  flaky.LMSCommit = boom;
  flaky.LMSFinish = boom;
  ({ SS } = makeEngine({ parent: topWindow({ API: flaky }) }));
  assert.strictEqual(SS.Scorm.connect(), true);
  assert.strictEqual(SS.Scorm.saveSuspendData("x"), false);
  assert.strictEqual(SS.Scorm.reportProgress({ completed: 1, total: 1 }), false);
  assert.strictEqual(SS.Scorm.commit(), true, "nothing was stored, so there is nothing to commit");
  assert.strictEqual(SS.Scorm.finish(), false);
  // Values are accepted but committing fails.
  const noCommit = makeScorm12();
  noCommit.LMSCommit = boom;
  ({ SS } = makeEngine({ parent: topWindow({ API: noCommit }) }));
  assert.strictEqual(SS.Scorm.connect(), true);
  assert.strictEqual(SS.Scorm.saveSuspendData("S1|x"), true);
  assert.strictEqual(SS.Scorm.commit(), false);
  assert.strictEqual(SS.Scorm._friendlyName("Smith, John"), "John Smith");
  assert.strictEqual(SS.Scorm._friendlyName("  Grace  Hopper "), "Grace Hopper");
});

// ---------------------------------------------------------------------------
// SS.Save — SCORM mode
// ---------------------------------------------------------------------------

test("save+scorm: one LMS profile; progress, score and status go to the LMS", async () => {
  const api = makeScorm12();
  const storage = makeLocalStorage();
  const e = makeEngine({ parent: topWindow({ API: api }), storage });
  assert.deepStrictEqual(await initSave(e), { storage: "local", scorm: true, learnerName: "Jane Doe", defaultWizardName: "Jane", scormMissing: false });
  const S = e.SS.Save;
  assert.strictEqual(S.isScorm(), true);
  assert.strictEqual(S.getProfile(), null, "first launch: the UI asks for a wizard name");
  assert.deepStrictEqual(plain(S.listSlots()), [null]);
  assert.strictEqual(S.getLastSlot(), null);
  const p = S.createProfile(0, "Jane the Bold");
  assert.strictEqual(S.getLastSlot(), 0);
  assert.strictEqual(S.loadProfile(2), p, "slots are ignored in SCORM mode");
  assert.strictEqual(S.deleteSlot(0), false, "the LMS profile can't be deleted");
  assert.ok(api.data["cmi.suspend_data"].startsWith("S1|"));
  const commits = api.count("commit");
  S.saveDraft("alpha-one", "draft in progress");
  S.revealHint("alpha-one");
  const res = S.recordCompletion("alpha-one", { code: "print('done')" });
  assert.strictEqual(res.stars, 2);
  assert.ok(api.count("commit") > commits, "committed after a completion");
  assert.strictEqual(api.data["cmi.core.score.raw"], String(Math.round(100 / 6)));
  assert.strictEqual(api.data["cmi.core.lesson_status"], "incomplete");
  assert.ok(!api.data["cmi.suspend_data"].includes("draft"), "no code in suspend_data");
  const local = JSON.parse(storage.getItem("pyromancer:scorm:learner-42"));
  assert.strictEqual(local.challenges["alpha-one"].draft, "draft in progress");
  assert.strictEqual(local.challenges["alpha-one"].bestCode, "print('done')");
  assert.strictEqual(storage.getItem("pyromancer:slot:0"), null, "no slots in SCORM mode");
  for (const id of ["alpha-two", "beta-one", "gamma-one", "gamma-two", "gamma-three"]) S.recordCompletion(id, { code: "x" });
  assert.strictEqual(api.data["cmi.core.score.raw"], "100");
  assert.strictEqual(api.data["cmi.core.lesson_status"], "completed");
  e.fire("pagehide", { persisted: true });
  assert.strictEqual(api.count("finish"), 0, "a page going into the back/forward cache is not finished");
  e.fire("pagehide", { persisted: false });
  e.fire("pagehide", { persisted: false });
  assert.strictEqual(api.count("finish"), 1);
});

test("save+scorm: resume on the same computer, on a new computer, and merging", async () => {
  const api = makeScorm12();
  const storage = makeLocalStorage();
  let e = makeEngine({ parent: topWindow({ API: api }), storage });
  await initSave(e);
  let S = e.SS.Save;
  S.createProfile(0, "Jane");
  S.revealHint("alpha-one");
  S.recordCompletion("alpha-one", { code: "first" });
  S.saveDraft("alpha-two", "half done");
  S.recordCast("alpha-two", { passed: false });
  S.markSeen("prologue");
  S.markSeen("custom:flag-only-the-ui-knows");
  S.updateSettings({ editorFontSize: 19, sound: false });
  e.fire("pagehide", { persisted: false });
  const suspend = api.data["cmi.suspend_data"];

  // Same computer, next session.
  const api2 = makeScorm12({ "cmi.suspend_data": suspend, "cmi.core.lesson_status": "incomplete" });
  e = makeEngine({ parent: topWindow({ API: api2 }), storage });
  await initSave(e);
  S = e.SS.Save;
  let p = S.getProfile();
  assert.strictEqual(p.wizardName, "Jane");
  assert.strictEqual(p.challenges["alpha-one"].stars, 2);
  assert.strictEqual(p.challenges["alpha-one"].bestCode, "first");
  assert.strictEqual(p.challenges["alpha-two"].draft, "half done");
  assert.strictEqual(p.challenges["alpha-two"].failedCasts, 1);
  assert.strictEqual(S.hasSeen("prologue"), true);
  assert.strictEqual(S.hasSeen("custom:flag-only-the-ui-knows"), true);
  assert.strictEqual(S.getSettings().editorFontSize, 19);

  // A new computer: progress comes back from the LMS alone (no drafts).
  const api3 = makeScorm12({ "cmi.suspend_data": suspend });
  e = makeEngine({ parent: topWindow({ API: api3 }), storage: makeLocalStorage() });
  await initSave(e);
  S = e.SS.Save;
  p = S.getProfile();
  assert.strictEqual(p.wizardName, "Jane");
  assert.strictEqual(p.challenges["alpha-one"].completed, true);
  assert.strictEqual(p.challenges["alpha-one"].stars, 2);
  assert.strictEqual(p.challenges["alpha-one"].hintsUsed, 1);
  assert.strictEqual(p.challenges["alpha-two"].draft, null);
  assert.strictEqual(p.challenges["alpha-two"].casts, 1);
  assert.strictEqual(S.hasSeen("custom:flag-only-the-ui-knows"), true, "seen flags survive as hashes");
  assert.strictEqual(S.hasSeen("custom:other"), false);
  assert.strictEqual(S.getSettings().sound, false);

  // Merging: the LMS knows something the local copy doesn't, and vice versa.
  const localProfile = JSON.parse(storage.getItem("pyromancer:scorm:learner-42"));
  localProfile.challenges["beta-one"] = { completed: true, stars: 3, casts: 4, failedCasts: 1, hintsUsed: 0, answerRevealed: false, draft: "local only", bestCode: "local best", completedAt: "2026-01-02T03:04:05.000Z" };
  localProfile.wizardName = "Old Local Name";
  storage.setItem("pyromancer:scorm:learner-42", JSON.stringify(localProfile));
  e = makeEngine({ parent: topWindow({ API: makeScorm12() }), storage, content: FAKE_CONTENT });
  await initSave(e);
  e.SS.Save.recordCompletion("gamma-one", { code: "lms" });         // only in this "other device" LMS data…
  e.SS.Save.renameWizard("LMS Name");
  const lmsSuspend = e.SS.Scorm.loadSuspendData();
  // …now open the course again on the computer holding the local copy.
  const api4 = makeScorm12({ "cmi.suspend_data": lmsSuspend });
  storage.setItem("pyromancer:scorm:learner-42", JSON.stringify(localProfile));
  e = makeEngine({ parent: topWindow({ API: api4 }), storage });
  await initSave(e);
  p = e.SS.Save.getProfile();
  assert.strictEqual(p.wizardName, "LMS Name", "the LMS wins for the name");
  assert.strictEqual(p.challenges["gamma-one"].completed, true, "from the LMS");
  assert.strictEqual(p.challenges["beta-one"].stars, 3, "from the local copy");
  assert.strictEqual(p.challenges["beta-one"].bestCode, "local best");
  assert.strictEqual(p.challenges["alpha-one"].stars, 2);
  assert.strictEqual(api4.data["cmi.core.score.raw"], String(Math.round(300 / 6)), "the merged score is reported at once");
  assert.ok(e.SS.Scorm.loadSuspendData().length > 0);
});

test("save+scorm: suspend_data stays under 4096 with 60 long-id challenges all complete", async () => {
  const ids = [];
  let content = "";
  for (let c = 0; c < 7; c++) {
    const chapterId = "chapter" + c + "-with-a-really-quite-long-and-descriptive-name";
    const list = [];
    for (let i = 0; i < (c < 4 ? 9 : 8); i++) {
      const id = chapterId + "-challenge-number-" + i + "-about-something-wonderful-and-hard";
      ids.push(id);
      list.push({ id, difficulty: ["easy", "medium", "hard"][i % 3], hints: ["a", "b", "c", "d"] });
    }
    content += "SS.defineChapter(" + JSON.stringify({ id: chapterId, order: c + 1, challenges: list }) + ");\n";
  }
  assert.strictEqual(ids.length, 60);
  assert.ok(ids.every((id) => id.length > 90));
  const api = makeScorm12();
  const storage = makeLocalStorage();
  let e = makeEngine({ parent: topWindow({ API: api }), storage, content });
  await initSave(e);
  let S = e.SS.Save;
  S.createProfile(0, "李".repeat(30));
  for (let i = 0; i < ids.length; i++) {
    for (let k = 0; k < 40; k++) S.recordCast(ids[i], { passed: k === 39 });
    for (let h = 0; h < (i % 4); h++) S.revealHint(ids[i]);
    if (i % 7 === 0) S.revealAnswer(ids[i]);
    S.recordCompletion(ids[i], { code: "print('a long solution')\n".repeat(50) });
  }
  for (let k = 0; k < 150; k++) S.markSeen("seen-key-number-" + k + "-for-the-ui");
  const text = api.data["cmi.suspend_data"];
  assert.ok(text.length <= 4096, "suspend_data is " + text.length + " characters");
  assert.ok(text.length <= 4000);
  assert.strictEqual(api.data["cmi.core.lesson_status"], "completed");
  assert.strictEqual(api.data["cmi.core.score.raw"], "100");

  // Everything that matters survives a trip through the LMS alone.
  const before = plain(S.getProfile());
  e = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": text }) }), storage: makeLocalStorage(), content });
  await initSave(e);
  const after = plain(e.SS.Save.getProfile());
  for (const id of ids) {
    for (const field of ["completed", "stars", "hintsUsed", "answerRevealed", "casts", "failedCasts", "completedAt"]) {
      const want = field === "completedAt" ? new Date(Math.floor(Date.parse(before.challenges[id][field]) / 1000) * 1000).toISOString() : before.challenges[id][field];
      assert.deepStrictEqual(after.challenges[id][field], want, id + " " + field);
    }
  }
  assert.strictEqual(after.wizardName, before.wizardName);
  assert.ok(e.SS.Save.hasSeen("seen-key-number-149-for-the-ui"));
});

test("save+scorm: hundreds of challenges degrade gracefully but keep every completion", async () => {
  const list = [];
  for (let i = 0; i < 400; i++) list.push({ id: "huge-" + i, difficulty: "easy", hints: ["a", "b"] });
  const content = "SS.defineChapter(" + JSON.stringify({ id: "huge", order: 1, challenges: list }) + ");";
  const api = makeScorm12();
  const e = makeEngine({ parent: topWindow({ API: api }), content });
  await initSave(e);
  const S = e.SS.Save;
  S.createProfile(0, "Big");
  for (let i = 0; i < 400; i++) { S.recordCast(list[i].id, { passed: true }); S.recordCompletion(list[i].id, {}); }
  const text = api.data["cmi.suspend_data"];
  assert.ok(text.length <= 4000, "length " + text.length);
  const back = e.SS.Save._decodeSuspend(text, null);
  assert.strictEqual(Object.keys(back.challenges).length, 400);
  assert.ok(Object.values(back.challenges).every((r) => r.completed && r.stars === 3));
});

test("save+scorm: unknown suspend_data entries are kept, junk is ignored", async () => {
  const S0 = makeEngine().SS.Save;
  const known = S0._hash6("alpha-one");
  const unknown = S0._hash6("from-a-newer-version");
  const suspend = ["S1", "1f", "Kay", S0._hash6("prologue") + "zzzzzz", known + "d0.3.1," + unknown + "d0.1,BAD!,", ""].join("|");
  const api = makeScorm12({ "cmi.suspend_data": suspend });
  const e = makeEngine({ parent: topWindow({ API: api }) });
  await initSave(e);
  const p = e.SS.Save.getProfile();
  assert.strictEqual(p.wizardName, "Kay");
  assert.strictEqual(p.challenges["alpha-one"].completed, true);
  assert.strictEqual(p.challenges["alpha-one"].stars, 3);
  assert.strictEqual(p.challenges["alpha-one"].casts, 3);
  e.SS.Save.recordCast("alpha-two", { passed: false });
  const saved = api.data["cmi.suspend_data"];
  assert.ok(saved.includes(unknown + "d0.1"), "entries from a newer version are written back");
  assert.ok(saved.includes("zzzzzz"), "unknown seen hashes are written back");
  assert.ok(!saved.includes("BAD!"));
  // Garbage in the LMS doesn't break anything.
  const junk = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": "{\"some\":\"other format\"}" }) }) });
  await initSave(junk);
  assert.strictEqual(junk.SS.Save.getProfile(), null);
  assert.strictEqual(junk.SS.Save.createProfile(0, "Fresh").wizardName, "Fresh");
});

test("save+scorm: progress is adopted even if the LMS loads before the chapters register", async () => {
  const S0 = makeEngine().SS.Save;
  const suspend = ["S1", "1f", "Late", "", S0._hash6("alpha-one") + "d1.4.2," + S0._hash6("beta-one") + "50", ""].join("|");
  const api = makeScorm12({ "cmi.suspend_data": suspend });
  const e = makeEngine({ parent: topWindow({ API: api }), content: false });
  await initSave(e);                                   // no chapters yet
  assert.deepStrictEqual(Object.keys(e.SS.Save.getProfile().challenges), []);
  e.run(FAKE_CONTENT);                                 // chapters register afterwards
  const p = e.SS.Save.getProfile();
  assert.strictEqual(p.challenges["alpha-one"].stars, 3);
  assert.strictEqual(p.challenges["alpha-one"].hintsUsed, 1);
  assert.strictEqual(p.challenges["alpha-one"].casts, 4);
  assert.strictEqual(p.challenges["beta-one"].stars, 1);
  e.SS.Save.recordCast("alpha-two", { passed: false });
  const saved = api.data["cmi.suspend_data"];
  assert.strictEqual(saved.split("|")[4].split(",").length, 3, "no duplicated entries: " + saved);
});

test("save+scorm: import merges into the LMS profile; blocked storage still saves to the LMS", async () => {
  const plainEngine = makeEngine();
  await initSave(plainEngine);
  plainEngine.SS.Save.createProfile(0, "Web Player");
  plainEngine.SS.Save.recordCompletion("alpha-one", {});
  plainEngine.SS.Save.recordCompletion("alpha-two", {});
  const code = plainEngine.SS.Save.exportCode();

  const api = makeScorm12();
  const e = makeEngine({ parent: topWindow({ API: api }), storage: "blocked" });
  const init = await initSave(e);
  assert.strictEqual(init.storage, "memory");
  assert.strictEqual(init.scorm, true);
  assert.match(e.SS.Save.storageWarning(), /still saved by your course/);
  const S = e.SS.Save;
  S.createProfile(0, "LMS Jane");
  S.recordCompletion("beta-one", {});
  assert.strictEqual(S.canImport(), false, "importing is off in an LMS by default");
  assert.throws(() => S.importData(code, 0), /importing is turned off here/);
  assert.strictEqual(api.data["cmi.core.score.raw"], "17", "the failed import changed nothing");
  e.SS.config.scorm.allowImport = true;
  assert.strictEqual(S.canImport(), true);
  const merged = S.importData(code, 0);
  assert.strictEqual(merged.wizardName, "LMS Jane");
  assert.deepStrictEqual(Object.keys(merged.challenges).filter((id) => merged.challenges[id].completed).sort(), ["alpha-one", "alpha-two", "beta-one"]);
  assert.strictEqual(api.data["cmi.core.score.raw"], "50");
});

// ---------------------------------------------------------------------------
// Two tabs, full storage, LMS connection problems, resets, commits
// ---------------------------------------------------------------------------

const slot0 = (storage) => JSON.parse(storage.getItem("pyromancer:slot:0"));

test("save: two tabs on one slot merge instead of erasing each other (and stay in step)", async () => {
  const storage = makeLocalStorage();
  const A = makeEngine({ storage });
  await initSave(A);
  A.SS.Save.createProfile(0, "Tester");
  const B = makeEngine({ storage });
  await initSave(B);
  B.SS.Save.loadProfile(0);                                         // the game opened twice
  A.SS.Save.recordCompletion("alpha-one", { code: "print('hi')" }); // tab A masters a spell
  B.SS.Save.loadProfile(0);                                         // tab B: title → Continue
  assert.strictEqual(B.SS.Save.getRecord("alpha-one").completed, true, "Continue re-reads the slot");
  B.SS.Save.recordCast("alpha-two", { passed: false });
  assert.strictEqual(slot0(storage).challenges["alpha-one"].completed, true, "tab B's write kept tab A's completion");
  assert.strictEqual(slot0(storage).challenges["alpha-two"].casts, 1);

  // A stale tab's next write merges what is stored first.
  A.SS.Save.revealHint("beta-one");
  assert.strictEqual(slot0(storage).challenges["alpha-two"].casts, 1);
  assert.strictEqual(slot0(storage).challenges["beta-one"].hintsUsed, 1);

  // A storage event brings the other tab's changes in at once.
  const seen = [];
  B.SS.Save.onChange((p, info) => seen.push(info.type));
  B.fire("storage", { key: "pyromancer:slot:0", newValue: storage.getItem("pyromancer:slot:0") });
  assert.deepStrictEqual(seen, ["sync"]);
  assert.strictEqual(B.SS.Save.getRecord("beta-one").hintsUsed, 1);
  B.fire("storage", { key: "pyromancer:slot:1", newValue: "{}" });
  assert.deepStrictEqual(seen, ["sync"], "other keys are ignored");

  // Names, settings and drafts follow the tab that changed them.
  B.SS.Save.renameWizard("Renamed in B");
  B.SS.Save.saveDraft("gamma-one", "draft from B");
  B.SS.Save.flush();
  A.SS.Save.updateSettings({ sound: false });
  const merged = slot0(storage);
  assert.deepStrictEqual([merged.wizardName, merged.settings.sound, merged.challenges["gamma-one"].draft],
    ["Renamed in B", false, "draft from B"]);
  assert.strictEqual(A.SS.Save.getProfile().wizardName, "Renamed in B");
  assert.strictEqual(slot0(storage).challenges["alpha-one"].bestCode, "print('hi')");

  // Another tab starts a new game in the slot: this tab follows it.
  B.SS.Save.createProfile(0, "New Wizard");
  A.fire("storage", { key: "pyromancer:slot:0", newValue: storage.getItem("pyromancer:slot:0") });
  assert.strictEqual(A.SS.Save.getProfile().wizardName, "New Wizard");
  assert.strictEqual(A.SS.Save.getRecord("alpha-one").completed, false);
  const identity = A.SS.Save.getProfile();
  B.SS.Save.recordCast("gamma-two", { passed: true });
  A.fire("storage", { key: "pyromancer:slot:0", newValue: storage.getItem("pyromancer:slot:0") });
  assert.strictEqual(A.SS.Save.getProfile(), identity, "the live profile object is updated in place");
});

test("save+scorm: a stale second tab can't lower the score or drop progress", async () => {
  const storage = makeLocalStorage();
  const apiA = makeScorm12();
  const A = makeEngine({ parent: topWindow({ API: apiA }), storage });
  await initSave(A);
  A.SS.Save.createProfile(0, "Jane");
  const apiB = makeScorm12(null, apiA.data);                        // a second launch of the same attempt
  const B = makeEngine({ parent: topWindow({ API: apiB }), storage });
  await initSave(B);
  for (const id of ["alpha-one", "alpha-two", "beta-one"]) A.SS.Save.recordCompletion(id, { code: "x" });
  assert.strictEqual(apiA.data["cmi.core.score.raw"], "50");
  B.SS.Save.flush();                                                // tab B changes screen…
  B.hide();                                                         // …and is hidden: commits
  assert.strictEqual(apiA.data["cmi.core.score.raw"], "50", "the score stayed");
  const back = A.SS.Save._decodeSuspend(apiA.data["cmi.suspend_data"], null);
  assert.deepStrictEqual(["alpha-one", "alpha-two", "beta-one"].map((id) => back.challenges[id] && back.challenges[id].completed), [true, true, true]);
  assert.strictEqual(B.SS.Save.getRecord("beta-one").completed, true, "tab B now knows tab A's progress");
});

test("save: a failed write keeps the 'storage full' warning until it is really saved", async () => {
  const storage = makeLocalStorage();
  const e = makeEngine({ storage });
  await initSave(e);
  const S = e.SS.Save;
  S.createProfile(0, "Tester");
  S.createProfile(1, "Other");
  S.loadProfile(0);
  storage.failWritesLongerThan = 8;                // nearly full: tiny writes (lastSlot) still fit
  S.recordCompletion("alpha-one", { code: "print('hi')" });
  assert.match(S.storageWarning(), /storage is full/);
  S.loadProfile(1);                                // writes the tiny lastSlot key successfully
  S.loadProfile(0);
  assert.match(S.storageWarning(), /storage is full/, "a tiny successful write doesn't clear the warning");
  assert.strictEqual(slot0(storage).challenges["alpha-one"], undefined, "the completion is not stored yet");
  assert.strictEqual(S.getRecord("alpha-one").completed, true, "…but it is kept in memory");
  storage.failWritesLongerThan = 0;                // space freed
  S.loadProfile(1);                                // any write retries the failed ones
  assert.strictEqual(S.storageWarning(), null);
  assert.strictEqual(slot0(storage).challenges["alpha-one"].completed, true);
  // Storage already full when the game starts.
  const full = makeLocalStorage();
  full.failWrites = true;
  const e2 = makeEngine({ storage: full });
  assert.strictEqual((await initSave(e2)).storage, "memory");
  assert.match(e2.SS.Save.storageWarning(), /storage is full/);
});

test("save+scorm: a SCORM package without an LMS retries, then warns (and logs why)", async () => {
  // No LMS at all.
  let e = makeEngine({ config: { scormRequired: true } });
  let result = null;
  e.SS.Save.init().then((r) => { result = r; });
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(result, null, "still trying");
  e.timers.advance(5000);
  await new Promise((r) => setImmediate(r));
  assert.deepStrictEqual([result.scorm, result.scormMissing], [false, true]);
  assert.match(e.SS.Save.storageWarning(), /couldn't connect to your course, so your progress and score aren't being recorded/);
  assert.ok(e.logs.some((l) => /no SCORM API/.test(l)), e.logs.join("\n"));
  assert.strictEqual(e.SS.Save.createProfile(0, "Local").wizardName, "Local", "the game still works");

  // The LMS refuses to initialise: its own error code, text and diagnostic are logged.
  const refusing = makeScorm12();
  refusing.LMSInitialize = () => "false";
  refusing.LMSGetValue = () => "";
  refusing.LMSGetLastError = () => "101";
  refusing.LMSGetErrorString = (c) => (c === "101" ? "General exception" : "");
  refusing.LMSGetDiagnostic = () => "the session has already been finished";
  e = makeEngine({ parent: topWindow({ API: refusing }), config: { scormRequired: true } });
  const p = e.SS.Save.init();
  e.timers.advance(5000);
  result = await p;
  assert.strictEqual(result.scormMissing, true);
  assert.ok(e.logs.some((l) => /LMSInitialize failed: error 101 \(General exception\) — the session has already been finished/.test(l)), e.logs.join("\n"));

  // The LMS's API appears a moment later: the retry connects.
  const lms = topWindow({});
  e = makeEngine({ parent: lms, config: { scormRequired: true } });
  const late = e.SS.Save.init();
  lms.API = makeScorm12();
  e.timers.advance(300);
  result = await late;
  assert.deepStrictEqual([result.scorm, result.scormMissing, result.learnerName], [true, false, "Jane Doe"]);
  assert.strictEqual(e.SS.Save.storageWarning(), null);

  // Not a SCORM package: no retries, no warning.
  e = makeEngine();
  result = await e.SS.Save.init();
  assert.deepStrictEqual([result.scorm, result.scormMissing], [false, false]);
  assert.strictEqual(e.SS.Save.storageWarning(), null);
});

test("save+scorm: a fresh attempt (or an instructor reset) keeps only name, settings and code", async () => {
  const storage = makeLocalStorage();
  let api = makeScorm12();
  let e = makeEngine({ parent: topWindow({ API: api }), storage });
  await initSave(e);
  e.SS.Save.createProfile(0, "Jane");
  e.SS.Save.revealHint("alpha-one");
  e.SS.Save.recordCompletion("alpha-one", { code: "my solution" });
  e.SS.Save.saveDraft("alpha-two", "my draft");
  e.SS.Save.updateSettings({ editorFontSize: 20 });
  e.SS.Save.markSeen("prologue");
  e.fire("pagehide", { persisted: false });

  // A normal relaunch resumes everything.
  let again = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.suspend_data": api.data["cmi.suspend_data"], "cmi.core.lesson_status": "incomplete" }) }), storage });
  await initSave(again);
  assert.strictEqual(again.SS.Save.getRecord("alpha-one").completed, true);

  // The LMS lost its suspend_data but the attempt goes on: the local copy is kept in full.
  again = makeEngine({ parent: topWindow({ API: makeScorm12({ "cmi.core.lesson_status": "incomplete" }) }), storage });
  await initSave(again);
  assert.strictEqual(again.SS.Save.getRecord("alpha-one").completed, true);

  // The instructor resets the attempt: the LMS forgets everything.
  api = makeScorm12();
  e = makeEngine({ parent: topWindow({ API: api }), storage });
  await initSave(e);
  const p = e.SS.Save.getProfile();
  assert.deepStrictEqual([p.wizardName, p.settings.editorFontSize], ["Jane", 20]);
  assert.deepStrictEqual(plain(p.challenges["alpha-one"]), Object.assign(plain(e.SS.Save.getRecord("nothing-here")), { bestCode: "my solution" }));
  assert.strictEqual(p.challenges["alpha-two"].draft, "my draft");
  assert.strictEqual(e.SS.Save.hasSeen("prologue"), false);
  assert.strictEqual(api.data["cmi.core.score.raw"], undefined, "no score is sent for the new attempt");
  assert.strictEqual(e.SS.Progress.overallStats(p).completed, 0);
  assert.strictEqual(JSON.parse(storage.getItem("pyromancer:scorm:learner-42")).challenges["alpha-one"].completed, false,
    "the old progress can't come back on a later launch");

  // SCORM 2004: entry "ab-initio" means a new attempt.
  const api04 = makeScorm2004({ "cmi.entry": "ab-initio", "cmi.learner_id": "learner-42" });
  e = makeEngine({ parent: topWindow({ API_1484_11: api04 }), storage });
  await initSave(e);
  assert.strictEqual(e.SS.Scorm.isFreshAttempt(), true);
  assert.strictEqual(e.SS.Save.getRecord("alpha-one").completed, false);
});

test("save+scorm: commits only when something changed, at most once a minute (but at once when it matters)", async () => {
  const api = makeScorm12();
  const e = makeEngine({ parent: topWindow({ API: api }) });
  await initSave(e);
  const S = e.SS.Save;
  S.createProfile(0, "Jane");
  assert.strictEqual(api.data["cmi.core.score.raw"], undefined, "no score before there is progress");
  const commits = () => api.count("commit");
  const sets = () => api.calls.filter((c) => c.startsWith("set ")).length;
  let c0 = commits();
  for (let i = 0; i < 10; i++) { S.recordCast("alpha-one", { passed: false }); S.flush(); }
  assert.ok(commits() - c0 <= 1, "10 casts and screen changes: " + (commits() - c0) + " commits");
  e.timers.advance(60000);
  assert.ok(commits() - c0 >= 1 && commits() - c0 <= 2, "the minute's changes were committed");
  c0 = commits();
  let s0 = sets();
  S.flush();
  S.flush();
  e.timers.advance(120000);
  assert.deepStrictEqual([commits(), sets()], [c0, s0], "nothing changed: nothing sent, nothing committed");
  S.recordCompletion("alpha-one", {});
  assert.strictEqual(commits(), c0 + 1, "a completion commits at once");
  assert.strictEqual(api.data["cmi.core.score.raw"], "17");
  S.revealHint("alpha-two");
  e.hide();
  assert.strictEqual(commits(), c0 + 2, "hiding the page commits at once");
  s0 = sets();
  e.hide();
  assert.deepStrictEqual([commits(), sets()], [c0 + 2, s0]);
  e.fire("pagehide", { persisted: false });
  assert.strictEqual(api.count("finish"), 1);
  assert.match(api.data["cmi.core.session_time"], /^\d{2}:\d{2}:\d{2}\.\d{2}$/);
  assert.strictEqual(api.data["cmi.core.exit"], "suspend");
});

test("scorm: 2004 success_status is 'passed' at the completion threshold, not before", () => {
  const api = makeScorm2004();
  const { SS } = makeEngine({ parent: topWindow({ API_1484_11: api }) });
  SS.Scorm.connect();
  SS.Scorm.reportProgress({ completed: 0, total: 4 });
  assert.strictEqual(api.data["cmi.score.raw"], undefined, "nothing to report yet");
  SS.Scorm.reportProgress({ completed: 3, total: 4 });
  assert.deepStrictEqual([api.data["cmi.completion_status"], api.data["cmi.success_status"], api.data["cmi.score.raw"]], ["incomplete", undefined, "75"]);
  SS.Scorm.reportProgress({ completed: 4, total: 4 });
  assert.deepStrictEqual([api.data["cmi.completion_status"], api.data["cmi.success_status"], api.data["cmi.score.scaled"]], ["completed", "passed", "1"]);
});

// ---------------------------------------------------------------------------
// SS.PythonRunner without a browser
// ---------------------------------------------------------------------------

test("runner: without Web Workers, init() rejects with a clear message and run() never rejects", async () => {
  const e = makeEngine({ files: ["js/config.js", "js/engine/harness.js", "js/engine/runner.js"], content: false });
  const R = e.SS.PythonRunner;
  assert.strictEqual(R.getStatus().state, "idle");
  assert.strictEqual(R.isReady(), false);
  const seen = [];
  const off = R.onStatus((s) => seen.push(s.state));
  let rejected = null;
  await R.init().then(() => { throw new Error("should reject"); }, (err) => { rejected = err; });
  assert.match(rejected.message, /background worker/);
  assert.strictEqual(R.getStatus().state, "error");
  assert.deepStrictEqual(seen, ["error"]);
  off();
  const result = await R.run({ code: "print(1)" });
  assert.strictEqual(result.status, "internal-error");
  assert.match(result.error.friendly, /background worker/);
  assert.strictEqual(typeof result.durationMs, "number");
  await R.restart().then(() => { throw new Error("should reject"); }, () => {});
});

test("runner: results from the worker are validated and normalised", () => {
  const e = makeEngine({ files: ["js/config.js", "js/engine/harness.js", "js/engine/runner.js"], content: false });
  const norm = e.SS.PythonRunner._normaliseResult;
  assert.strictEqual(norm(null), null);
  assert.strictEqual(norm({ status: "hacked", stdout: "", tests: [] }), null);
  assert.strictEqual(norm({ status: "passed", stdout: 5, tests: [] }), null);
  assert.strictEqual(norm({ status: "passed", stdout: "", tests: "x" }), null);
  const r = plain(norm({
    status: "passed", stdout: "hi", truncated: "yes", extra: 1,
    tests: [{ name: "a", passed: true }, { name: 7, passed: "true", message: null, line: "3", crash: 1 }, "junk"],
    error: { type: "X", message: 5, line: -2, phase: "weird", traceback: null, friendly: "f" },
  }, 50000, 12.6));
  assert.deepStrictEqual(r, {
    status: "failed", stdout: "hi", truncated: false,
    error: { type: "X", message: "5", line: null, phase: "runtime", traceback: "", friendly: "f" },
    tests: [
      { name: "a", passed: true, message: "", line: null, crash: false },
      { name: "7", passed: false, message: "", line: null, crash: false },
      { name: "Trial", passed: false, message: "", line: null, crash: false },
    ],
    passed: 1, total: 3, durationMs: 13,
  });
  const crash = (reason) => plain(e.SS.PythonRunner._crashResult(reason, 12));
  let c = crash("RangeError: Maximum call stack size exceeded");
  assert.deepStrictEqual([c.status, c.error.type, c.error.phase, c.error.line, c.stdout, c.durationMs], ["error", "RecursionError", "runtime", null, "", 12]);
  assert.match(c.error.friendly, /deeper than the browser can follow/);
  assert.match(c.error.friendly, /loop \(bottom-up\)/);
  assert.strictEqual(crash("InternalError: too much recursion").error.type, "RecursionError", "Firefox's wording");
  c = crash("Aborted(OOM)");
  assert.deepStrictEqual([c.status, c.error.type], ["error", "MemoryError"]);
  c = crash("RuntimeError: memory access out of bounds");
  assert.deepStrictEqual([c.status, c.error.type], ["internal-error", "InternalError"]);
  assert.match(c.error.friendly, /summoned again/);
  assert.match(e.SS.PythonRunner.SETUP_PY, /def _ss_run\(code, tests, inputs_json, output_limit, step_limit=None, recursion_limit=None\)/);
  const t = plain(e.SS.PythonRunner._timeoutResult(8000, 8004));
  assert.strictEqual(t.status, "timeout");
  assert.match(t.error.friendly, /more than 8 seconds/);
  assert.match(t.error.friendly, /base case/);
  assert.strictEqual(t.error.phase, "runtime");
  assert.strictEqual(plain(e.SS.PythonRunner._timeoutResult(1500, 0)).error.friendly.includes("1.5 seconds"), true);
});

// ---------------------------------------------------------------------------
// tools/build.py, on a small fake game folder in a temporary directory
// ---------------------------------------------------------------------------

const os = require("os");
const { spawnSync } = require("child_process");

function python() {
  for (const cmd of ["python3", "python"]) {
    const r = spawnSync(cmd, ["-c", "import sys; print(sys.version_info[0])"], { encoding: "utf8" });
    if (r.status === 0 && r.stdout.trim() === "3") return cmd;
  }
  return null;
}

function fakeGame(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ss-build-test-"));
  const all = Object.assign({
    "scorm/imsmanifest.xml": source("scorm/imsmanifest.xml"),
    "index.html": [
      "<!DOCTYPE html>", "<html><head><meta charset=\"utf-8\"><title>T</title>",
      "<link rel=\"stylesheet\" href=\"https://cdn.example.invalid/x.css\">",
      "<link rel=\"stylesheet\" href=\"css/style.css\">",
      "<!-- <script src=\"js/old.js\"></script> -->",
      "<script>window.order = ['inline'];</script>",
      "<script src=\"https://cdn.example.invalid/lib.js\"></script>",
      "</head><body>",
      "<script src=\"js/a.js\"></script>",
      "<script src=\"js/b.js\"></script>",
      "</body></html>", "",
    ].join("\n"),
    "css/style.css": "body { color: red; background: url(img/dot.svg); }\n",
    "css/img/dot.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n",
    "js/a.js": "window.order.push('a');\n",
    "js/b.js": "window.order.push('b'); var s = '<\\/script>';\n",
  }, files || {});
  for (const [rel, text] of Object.entries(all)) {
    if (text === null) continue;
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

function build(py, dir, out) {
  return spawnSync(py, [path.join(ROOT, "tools", "build.py"), "--root", dir, "--out", out], { encoding: "utf8" });
}

function zipListing(py, zipPath) {
  const script = "import json, sys, zipfile\nz = zipfile.ZipFile(sys.argv[1])\n" +
    "print(json.dumps([[i.filename, list(i.date_time), i.external_attr >> 16, z.read(i.filename).decode('utf-8')] for i in z.infolist()]))";
  const r = spawnSync(py, ["-c", script, zipPath], { encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test("build: inlines local CSS/JS, keeps CDN tags and comments, deterministic SCORM zip", () => {
  const py = python();
  if (!py) { console.log("       (skipped: python3 not found)"); return; }
  const dir = fakeGame();
  try {
    let r = build(py, dir, path.join(dir, "out1"));
    assert.strictEqual(r.status, 0, r.stderr);
    r = build(py, dir, path.join(dir, "out2"));
    assert.strictEqual(r.status, 0, r.stderr);
    const read = (p) => fs.readFileSync(path.join(dir, p));
    const page = read("out1/syntax-and-sorcery.html").toString("utf8");
    assert.ok(read("out1/syntax-and-sorcery.html").equals(read("out2/syntax-and-sorcery.html")), "deterministic HTML");
    assert.ok(read("out1/syntax-and-sorcery-scorm.zip").equals(read("out2/syntax-and-sorcery-scorm.zip")), "deterministic zip");
    assert.ok(page.startsWith("<!DOCTYPE html>\n<!-- Single-file build"), "doctype stays first");
    assert.ok(!/<script[^>]*src="js\//.test(page.replace(/<!--[\s\S]*?-->/g, "")), "no local script tags left");
    assert.ok(page.includes("<!-- <script src=\"js/old.js\"></script> -->"), "comments untouched");
    assert.ok(page.includes("<script src=\"https://cdn.example.invalid/lib.js\"></script>"));
    assert.ok(page.includes("<link rel=\"stylesheet\" href=\"https://cdn.example.invalid/x.css\">"));
    assert.ok(page.includes("<script data-inlined=\"js/a.js\">\nwindow.order.push('a');\n</script>"));
    assert.ok(page.includes("<style data-inlined=\"css/style.css\">"));
    assert.ok(page.includes("url(\"data:image/svg+xml;base64,"));
    assert.ok(page.indexOf("js/a.js") < page.indexOf("js/b.js"), "order kept");
    const entries = zipListing(py, path.join(dir, "out1", "syntax-and-sorcery-scorm.zip"));
    assert.deepStrictEqual(entries.map((e) => e[0]), ["imsmanifest.xml", "index.html"]);
    assert.ok(entries.every((e) => e[1].join() === "1980,1,1,0,0,0" && e[2] === 0o100644));
    assert.strictEqual(entries[1][3], page);
    assert.match(entries[0][3], /<title>Syntax &amp; Sorcery<\/title>/);
    assert.match(entries[0][3], /adlcp:scormtype="sco" href="index.html"/);
    assert.match(entries[0][3], /<schemaversion>1\.2<\/schemaversion>/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("build: refuses unsafe or broken input with a clear message", () => {
  const py = python();
  if (!py) { console.log("       (skipped: python3 not found)"); return; }
  const cases = [
    [{ "js/b.js": "var x = 1;\nvar s = '</script>';\n" }, /js\/b\.js contains "<\/script" on line 2/],
    [{ "js/b.js": "var a = '<!--';\nvar b = '<script>';\n" }, /js\/b\.js contains "<!--"/],
    [{ "css/style.css": "/* </style> */\n" }, /css\/style\.css contains "<\/style"/],
    [{ "js/a.js": null }, /'js\/a\.js' was not found/],
    [{ "scorm/imsmanifest.xml": null }, /imsmanifest\.xml was not found/],
    [{ "scorm/imsmanifest.xml": "<manifest><oops></manifest>" }, /not valid XML/],
    [{ "index.html": "<!DOCTYPE html><script type=\"module\" src=\"js/a.js\"></script>" }, /module script/],
    [{ "index.html": "<!DOCTYPE html><script src=\"../outside.js\"></script>" }, /outside the game folder/],
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
      assert.ok(!fs.existsSync(path.join(out, "syntax-and-sorcery.html")), "nothing is written on failure");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

// ---------------------------------------------------------------------------
// Real content sanity check (skipped if the chapters don't load right now)
// ---------------------------------------------------------------------------

test("content: real challenge ids have distinct SCORM hashes", () => {
  const dir = path.join(ROOT, "js", "content");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "registry.js").sort();
  const e = makeEngine({ content: false });
  for (const f of files) {
    try { vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), e.sb, { filename: f }); } catch (err) { /* another author is mid-edit */ }
  }
  const ids = e.SS.Progress.allChallenges().map((c) => c.id);
  const hashes = new Map();
  for (const id of ids) {
    const h = e.SS.Save._hash6(id);
    assert.ok(!hashes.has(h), "hash collision between " + id + " and " + hashes.get(h));
    hashes.set(h, id);
  }
});

// ---------------------------------------------------------------------------

(async () => {
  const filter = process.argv[2] || "";
  let passed = 0, failed = 0;
  for (const t of tests) {
    if (filter && !t.name.includes(filter)) continue;
    try {
      await t.fn();
      passed++;
      console.log("  ok   " + t.name);
    } catch (err) {
      failed++;
      console.log("  FAIL " + t.name + "\n       " + String(err && err.stack || err).split("\n").slice(0, 6).join("\n       "));
    }
  }
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})();
