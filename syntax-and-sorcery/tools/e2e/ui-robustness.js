#!/usr/bin/env node
/*
 * Browser tests for the situations teachers and students actually run into.
 *
 *   node tools/e2e/ui-robustness.js [--shots DIR] [--only name,name]
 *
 *   file          the game opened from file:// still loads Python and casts
 *   plain-editor  CodeMirror's CDN is blocked → textarea editor (Tab, auto-indent, Esc+Tab, marks)
 *   no-python     every Python CDN is unreachable → clear explanation + Try again; lessons still readable
 *   no-storage    localStorage throws (sandboxed iframe) → warning that points to the Save Scroll
 *   scorm         a SCORM 1.2 LMS API is present → no slots, learner's first name, score reported
 *   fog           a chapter file is missing → the rest of the map works and says so
 *   calm          prefers-reduced-motion → no particles, success still celebrated
 *   unlock        ?unlock=all opens every chapter
 *   keyboard      the first spell from the title screen with the keyboard only
 *   answers       Answer Scroll after 3 failed casts (1★ max); hidden with ?answers=off
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { openGame, waitForPython } = require("./lib");

const args = process.argv.slice(2);
const SHOTS = args.indexOf("--shots") >= 0 ? path.resolve(args[args.indexOf("--shots") + 1]) : null;
const ONLY = args.indexOf("--only") >= 0 ? args[args.indexOf("--only") + 1].split(",") : null;

let failures = 0, checks = 0;
function log(msg) { process.stdout.write(msg + "\n"); }
function check(condition, message) {
  checks++;
  if (!condition) { failures++; log("    ✗ " + message); }
  return !!condition;
}
async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOTS, "robust-" + name + ".png") });
}

async function setCode(page, code) {
  await page.evaluate((c) => {
    const cm = document.querySelector(".editor-surface .CodeMirror");
    if (cm && cm.CodeMirror) { cm.CodeMirror.setValue(c); return; }
    const ta = document.querySelector(".editor-surface .plain-input");
    ta.value = c;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }, code);
}
async function getCode(page) {
  return page.evaluate(() => {
    const cm = document.querySelector(".editor-surface .CodeMirror");
    if (cm && cm.CodeMirror) return cm.CodeMirror.getValue();
    const ta = document.querySelector(".editor-surface .plain-input");
    return ta ? ta.value : null;
  });
}
async function castFor(page, status) {
  await page.evaluate(() => document.querySelector(".btn-cast").click());
  await page.waitForSelector('.results[data-status="' + status + '"]', { timeout: 30000 });
}
async function newGame(page, name) {
  await page.waitForSelector(".title-screen");
  await page.click("text=Begin your apprenticeship");
  await page.waitForSelector(".modal-prompt input");
  if (name !== null) await page.fill(".modal-prompt input", name);
  await page.keyboard.press("Enter");
  await page.waitForSelector(".story-screen, .map-screen");
  if (await page.$(".story-screen")) await page.click(".dlg-skip");
  await page.waitForSelector(".map-screen");
}
async function firstChallenge(page, { python = true } = {}) {
  await page.click(".map-continue");
  await page.waitForSelector(".challenge-screen");
  if (await page.$(".coach-ok")) await page.click(".coach-ok");
  if (python) {
    await waitForPython(page, 90000);
    await page.waitForFunction(() => document.querySelector(".btn-cast").getAttribute("aria-disabled") === "false");
  }
}

const SCENARIOS = {};

SCENARIOS.file = async function () {
  const game = await openGame({ file: true });
  const { page } = game;
  try {
    await newGame(page, "Fern");
    await firstChallenge(page);
    await setCode(page, 'print("Hello world")\n');
    await page.evaluate(() => document.querySelector(".btn-cast").click());
    await page.waitForSelector(".modal-success", { timeout: 30000 });
    check(true, "file:// casts a spell");
    check(/^file:/.test(page.url()), "the page really is a file:// URL");
    check(game.errors.length === 0, "no console errors from file:// (" + game.errors.join(" | ") + ")");
    await shot(page, "file");
  } finally { await game.close(); }
};

SCENARIOS["plain-editor"] = async function () {
  const game = await openGame({ goto: false });
  const { page } = game;
  try {
    await page.route("**/cdnjs.cloudflare.com/**", (route) => route.abort());
    await page.goto(game.url);
    await newGame(page, "Pat");
    await firstChallenge(page);
    check(!!(await page.$(".editor-surface .plain-input")), "the textarea editor is used when CodeMirror is blocked");
    await page.click(".editor-surface .plain-input");
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.keyboard.type("for i in range(2):");
    await page.keyboard.press("Enter");
    check((await getCode(page)) === "for i in range(2):\n    ", "Enter after a colon indents the next line by 4 spaces");
    await page.keyboard.type("print(i)");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    check((await getCode(page)) === "for i in range(2):\n    print(i)\n    ", "Tab and Shift+Tab indent and dedent with spaces");
    await setCode(page, 'x = 1\nprnt(x)\n');
    await page.focus(".editor-surface .plain-input");
    await page.keyboard.press("Control+Enter");
    await page.waitForSelector('.results[data-status="error"]', { timeout: 30000 });
    check((await page.$$(".plain-mark.error")).length === 1, "the error line is highlighted in the textarea editor");
    await page.focus(".editor-surface .plain-input");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    check(!(await page.evaluate(() => !!document.activeElement.closest(".editor-surface"))), "Esc then Tab leaves the textarea editor");
    check(game.errors.filter((e) => !/cdnjs|ERR_FAILED|net::/i.test(e)).length === 0, "no unexpected console errors");
    await shot(page, "plain-editor");
  } finally { await game.close(); }
};

SCENARIOS["no-python"] = async function () {
  const game = await openGame({ config: { pyodideBaseURLs: ["http://127.0.0.1:9/pyodide/"], pyodideLoadTimeoutMs: 8000 } });
  const { page } = game;
  try {
    await page.waitForSelector(".title-screen");
    await page.waitForSelector('.title-screen .engine-chip[data-state="error"]', { timeout: 60000 });
    check(true, "the engine chip reports that Python is unavailable");
    await shot(page, "no-python-title");
    await newGame(page, "Quill");
    await firstChallenge(page, { python: false });
    check(await page.isVisible(".engine-banner"), "the challenge explains that Python couldn't load");
    check(/Try again/.test(await page.textContent(".engine-banner")), "…and offers Try again");
    check((await page.getAttribute(".btn-cast", "aria-disabled")) === "true", "Cast is disabled while Python is unavailable");
    check(await page.isVisible(".task-card") && await page.isVisible(".lesson"), "the task and the lesson are still readable");
    await page.click(".btn-cast", { force: true });   // aria-disabled: still focusable and clickable on purpose
    check(await page.isVisible(".cast-reason"), "pressing Cast explains why it can't cast");
    await page.click(".engine-banner >> text=Help");
    await page.waitForSelector(".engine-help");
    check(/cdn\.jsdelivr\.net/.test(await page.textContent(".engine-help")), "the help names the site to allow");
    await shot(page, "no-python-help");
    await page.keyboard.press("Escape");
    await page.click(".engine-banner >> text=Try again");
    await page.waitForSelector('.engine-chip[data-state="loading"], .engine-chip[data-state="error"]');
    check(true, "Try again restarts loading");
  } finally { await game.close(); }
};

SCENARIOS["no-storage"] = async function () {
  const game = await openGame({
    init: () => {
      Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new DOMException("The operation is insecure.", "SecurityError"); } });
    }
  });
  const { page } = game;
  try {
    await page.waitForSelector(".title-screen");
    check(await page.isVisible(".title-screen .banner-warn"), "the title warns that saving is blocked");
    await newGame(page, "Rowan");
    check(await page.isVisible(".map-screen .banner-warn >> text=Open the Save Scroll"), "the map warning points to the Save Scroll");
    await page.click(".map-screen .banner-warn >> text=Open the Save Scroll");
    await page.waitForSelector(".modal-savescroll");
    check(/^SNS1\./.test(await page.inputValue(".modal-savescroll textarea[readonly]")), "the Save Scroll still exports a code");
    await shot(page, "no-storage");
  } finally { await game.close(); }
};

SCENARIOS.scorm = async function () {
  const game = await openGame({
    init: () => {
      const store = JSON.parse(sessionStorage.getItem("fakeLMS") || "{}");
      const calls = [];
      window.__lms = { store, calls };
      const persist = () => sessionStorage.setItem("fakeLMS", JSON.stringify(store));
      window.API = {
        LMSInitialize: () => "true",
        LMSFinish: () => { persist(); return "true"; },
        LMSGetValue: (k) => {
          if (k === "cmi.core.student_name") return "Lovelace, Ada";
          if (k === "cmi.core.student_id") return "ada-1815";
          if (k === "cmi.core.lesson_status") return store[k] || "not attempted";
          return store[k] || "";
        },
        LMSSetValue: (k, v) => { calls.push([k, String(v)]); store[k] = String(v); persist(); return "true"; },
        LMSCommit: () => { persist(); return "true"; },
        LMSGetLastError: () => "0",
        LMSGetErrorString: () => "",
        LMSGetDiagnostic: () => ""
      };
    }
  });
  const { page } = game;
  try {
    await page.waitForSelector(".title-screen");
    check(!(await page.$("text=Choose another save")) && !(await page.$("text=I have a Save Scroll")), "SCORM mode has no save slots");
    await page.click("text=Begin your apprenticeship");
    await page.waitForSelector(".modal-prompt input");
    check((await page.inputValue(".modal-prompt input")) === "Ada", "the wizard name defaults to the learner's first name");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".story-screen");
    await page.click(".dlg-skip");
    await page.waitForSelector(".map-screen");
    await firstChallenge(page);
    await setCode(page, 'print("Hello world")\n');
    await page.evaluate(() => document.querySelector(".btn-cast").click());
    await page.waitForSelector(".modal-success", { timeout: 30000 });
    const lms = await page.evaluate(() => window.__lms.store);
    check(Number(lms["cmi.core.score.raw"]) > 0, "the score is reported to the LMS (" + lms["cmi.core.score.raw"] + ")");
    check(lms["cmi.core.lesson_status"] === "incomplete", "the status is incomplete until every spell is done");
    check((lms["cmi.suspend_data"] || "").length > 0, "progress is stored in suspend_data");
    await page.reload();
    await page.waitForSelector(".title-screen");
    check(/Ada/.test(await page.textContent(".btn-continue")), "after a relaunch the title continues as Ada");
    await shot(page, "scorm");
  } finally { await game.close(); }
};

SCENARIOS.fog = async function () {
  const game = await openGame({ goto: false });
  const { page } = game;
  try {
    await page.route("**/js/content/ch3-circle.js", (route) => route.fulfill({ status: 404, body: "not found" }));
    await page.goto(game.url);
    await newGame(page, "Sol");
    check(/ch3-circle\.js/.test(await page.textContent(".notices")), "the map says which chapter file didn't load");
    const stations = await page.$$(".trail-list .station");
    check(stations.length === 7, "the other six chapters (plus the sanctum) are still on the map (" + stations.length + ")");
    await shot(page, "fog");
  } finally { await game.close(); }
};

SCENARIOS.calm = async function () {
  const game = await openGame({ goto: false });
  const { page } = game;
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(game.url);
    await newGame(page, "Wren");
    await firstChallenge(page);
    await setCode(page, 'print("Hello world")\n');
    await page.evaluate(() => {
      window.__particles = 0;
      new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains("fx-p")) window.__particles++; })))
        .observe(document.body, { childList: true, subtree: true });
      document.querySelector(".btn-cast").click();
    });
    await page.waitForSelector(".modal-success", { timeout: 30000 });
    check((await page.evaluate(() => window.__particles)) === 0, "no particles are created with reduced motion");
    check((await page.$$eval(".modal-success .success-star.on", (s) => s.length)) === 3, "the stars are shown at once");
  } finally { await game.close(); }
};

SCENARIOS.unlock = async function () {
  const game = await openGame({ query: "?unlock=all" });
  const { page } = game;
  try {
    await newGame(page, "Vale");
    check(await page.isVisible(".free-practice-note"), "the map says free practice is on");
    const locked = await page.$$('.trail-list .station-btn[aria-disabled="true"]');
    check(locked.length === 1, "only the sanctum stays locked with ?unlock=all (" + locked.length + " locked)");
  } finally { await game.close(); }
};

SCENARIOS.keyboard = async function () {
  const game = await openGame();
  const { page } = game;
  const focused = () => page.evaluate(() => {
    const a = document.activeElement;
    return a ? (a.getAttribute("aria-label") || a.textContent || a.className || a.tagName).trim().slice(0, 60) : "";
  });
  async function tabTo(pattern, max) {
    for (let i = 0; i < (max || 40); i++) {
      if (pattern.test(await focused())) return true;
      // The editor keeps Tab for indenting: Esc first, then Tab leaves it (as its help line says).
      if (await page.evaluate(() => !!document.activeElement.closest(".editor-surface"))) await page.keyboard.press("Escape");
      await page.keyboard.press("Tab");
    }
    return pattern.test(await focused());
  }
  try {
    await page.waitForSelector(".title-screen");
    check(await tabTo(/Begin your apprenticeship/), "Tab reaches Begin on the title screen");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".modal-prompt input");
    await page.keyboard.type("Kay");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".story-screen");
    const panels = await page.$$eval(".dlg-dot", (d) => d.length);
    for (let i = 0; i < panels; i++) await page.keyboard.press("Enter");   // focus stays on Next
    await page.waitForSelector(".map-screen");
    check(true, "Enter pages through the whole prologue");
    check(await tabTo(/Begin: The First Words|First Words/), "Tab reaches the Begin button on the map");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".challenge-screen");
    await waitForPython(page, 90000);
    await page.waitForFunction(() => document.querySelector(".btn-cast").getAttribute("aria-disabled") === "false");
    check(await tabTo(/Got it/, 60), "Tab reaches the coach note's Got it button");
    await page.keyboard.press("Enter");
    check(await page.evaluate(() => !!document.activeElement.closest(".editor-surface")), "Got it puts the cursor in the editor");
    await page.keyboard.press("Control+End");
    await page.keyboard.type('print("Hello world")');
    await page.keyboard.press("Control+Enter");
    await page.waitForSelector(".modal-success", { timeout: 30000 });
    check(await page.evaluate(() => !!document.activeElement.closest(".modal-success")), "focus moves into the Spell Mastered dialog");
    await page.keyboard.press("Enter");   // primary action: Next spell
    await page.waitForFunction(() => document.querySelector(".challenge-title") && !/First Words/.test(document.querySelector(".challenge-title").textContent));
    check(true, "Enter on the dialog goes on to the next spell");
  } finally { await game.close(); }
};

SCENARIOS.answers = async function () {
  for (const off of [false, true]) {
    const game = await openGame({ query: off ? "?answers=off" : "" });
    const { page } = game;
    try {
      await newGame(page, "Ash");
      await firstChallenge(page);
      for (let i = 0; i < 3; i++) {
        await setCode(page, 'print("nope ' + i + '")\n');
        await castFor(page, "failed");
      }
      const visible = await page.isVisible(".answer-btn");
      if (off) {
        check(!visible, "?answers=off hides the Answer Scroll");
        continue;
      }
      check(visible, "the Answer Scroll appears after 3 failed casts");
      await page.click(".answer-btn");
      await page.click(".modal-confirm >> text=Show me the answer");
      await page.waitForSelector(".modal-answer .code-block");
      check(/print/.test(await page.textContent(".modal-answer .code-block")), "the Answer Scroll shows the reference spell");
      await shot(page, "answer-scroll");
      await page.click(".modal-answer >> text=Put it in my editor");
      await page.waitForFunction(() => !document.querySelector(".modal-overlay"));
      check((await getCode(page)).indexOf("print") >= 0, "“Put it in my editor” copies the reference spell into the editor");
      await page.evaluate(() => document.querySelector(".btn-cast").click());
      await page.waitForSelector(".modal-success", { timeout: 30000 });
      await page.waitForTimeout(1300);
      check((await page.$$eval(".modal-success .success-star.on", (s) => s.length)) === 1, "after the Answer Scroll the spell earns 1 star");
    } finally { await game.close(); }
  }
};

(async () => {
  const started = Date.now();
  for (const name of Object.keys(SCENARIOS)) {
    if (ONLY && ONLY.indexOf(name) < 0) continue;
    log("• " + name);
    try {
      await SCENARIOS[name]();
    } catch (err) {
      failures++;
      log("    ✗ " + name + " threw: " + String((err && err.message) || err).split("\n")[0]);
    }
  }
  log((failures ? "FAILED: " + failures + " problem(s)" : "OK") + " — " + checks + " checks in " + Math.round((Date.now() - started) / 1000) + " s");
  process.exit(failures ? 1 : 0);
})();
