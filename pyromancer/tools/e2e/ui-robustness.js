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
 *   framed        inside another page (an LMS frame): sound starts off, the Save Scroll leads with the code
 *   sound-off     ?sound=off keeps every sound off
 *   print-blocked print() silently ignored (sandboxed frame) → the player is told and offered the download
 *   leave-casting leaving the challenge mid-cast still records the mastered spell
 *   drafts        a draft typed just before leaving the screen is kept
 *   damaged-slot  an unreadable save slot is shown as damaged and can be deleted
 *   scorm-missing the SCORM package can't reach its LMS → a lasting warning, title screen included
 *   paintings     with paintings listed in SS.ART the map, chapter, scene and story show them
 *                 (a painting that fails to load falls back to its icon); without, icons only
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { openGame, waitForPython } = require("./lib");
const { GAME } = require("../dev_server");

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
/** Click through a story dialog (e.g. the chapter intro) until it closes. */
async function closeStory(page) {
  for (let i = 0; i < 12 && (await page.$(".modal-dialogue")); i++) {
    const next = await page.$(".modal-dialogue .dlg-next");
    if (next) await next.click().catch(() => {});
    await page.waitForTimeout(200);
  }
  await page.waitForFunction(() => !document.querySelector(".modal-overlay"), null, { timeout: 5000 });
}
async function firstChallenge(page, { python = true } = {}) {
  await page.click(".map-continue");
  await page.waitForSelector(".challenge-screen");
  // The gold button tells the chapter's story first (once).
  await page.waitForSelector(".modal-dialogue", { timeout: 3000 }).catch(() => null);
  await closeStory(page);
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
    check(await page.isVisible(".topbar .warn-chip"), "the top bar keeps a “Not saving” warning in view");
    check(await page.isVisible(".map-screen .banner-warn >> text=Open the Save Scroll"), "the map warning points to the Save Scroll");
    await page.click(".map-screen .banner-warn >> text=Open the Save Scroll");
    await page.waitForSelector(".modal-savescroll");
    check(/^PYRO1\./.test(await page.inputValue(".modal-savescroll textarea[readonly]")), "the Save Scroll still exports a code");
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
    check((await page.evaluate(() => SS.UI.app.soundOn())) === false, "sound starts off inside a course");
    await page.click("text=Begin your apprenticeship");
    await page.waitForSelector(".modal-prompt input");
    check((await page.inputValue(".modal-prompt input")) === "Ada", "the wizard name defaults to the learner's first name");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".story-screen");
    await page.click(".dlg-skip");
    await page.waitForSelector(".map-screen");
    await page.click('.tool-btn[data-tool="savescroll"]');
    await page.waitForSelector(".modal-savescroll");
    check(/course saves your progress automatically/i.test(await page.textContent(".modal-savescroll")), "the Save Scroll says the course saves automatically");
    check(!(await page.$(".modal-savescroll textarea:not([readonly])")), "importing a Save Scroll is hidden inside a course");
    check(!!(await page.$(".modal-savescroll textarea[readonly]")), "…but a backup code can still be copied");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".modal-overlay"));
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
    check(/Begin: The First Words|First Words/.test(await focused()), "the map puts focus on its Begin button");
    check(await tabTo(/Begin: The First Words|First Words/), "Tab reaches the Begin button on the map");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".challenge-screen");
    await page.waitForSelector(".modal-dialogue", { timeout: 4000 });
    check(await page.evaluate(() => !!document.activeElement.closest(".modal-dialogue")), "the chapter's story opens with the focus inside it");
    for (let i = 0; i < 12 && (await page.$(".modal-dialogue")); i++) { await page.keyboard.press("Enter"); await page.waitForTimeout(250); }
    check(!(await page.$(".modal-dialogue")), "Enter pages through the chapter's story");
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

SCENARIOS.framed = async function () {
  const game = await openGame({ goto: false });
  const { page } = game;
  try {
    await page.setContent('<!DOCTYPE html><title>Course</title><iframe src="' + game.url + '" style="width:1200px;height:820px;border:0"></iframe>');
    let frame = null;
    for (let i = 0; i < 50 && !frame; i++) { frame = page.frames().find((f) => /127\.0\.0\.1/.test(f.url())); if (!frame) await page.waitForTimeout(100); }
    await frame.waitForSelector(".title-screen");
    check((await frame.evaluate(() => SS.UI.app.soundOn())) === false, "sound starts off when the game is inside another page");
    await frame.click("text=Begin your apprenticeship");
    await frame.waitForSelector(".modal-prompt input");
    await frame.fill(".modal-prompt input", "Iris");
    await frame.press(".modal-prompt input", "Enter");
    await frame.waitForSelector(".story-screen");
    await frame.click(".dlg-skip");
    await frame.waitForSelector(".map-screen");
    check((await frame.evaluate(() => SS.UI.util.settings().sound)) === false, "…and the new wizard's sound setting starts off");
    await frame.click('.tool-btn[data-tool="savescroll"]');
    await frame.waitForSelector(".modal-savescroll");
    const help = await frame.textContent(".modal-savescroll .scroll-section .section-help");
    check(/^Copy this save code/.test(help.trim()), "inside a frame the Save Scroll leads with copying the code");
    check(!!(await frame.$(".modal-savescroll >> text=Try downloading a save file")), "…and offers the download only as a try");
  } finally { await game.close(); }
};

SCENARIOS["sound-off"] = async function () {
  const game = await openGame({ query: "?sound=off" });
  const { page } = game;
  try {
    await newGame(page, "Sage");
    check((await page.evaluate(() => SS.UI.app.soundOn())) === false, "?sound=off keeps sound off");
    check((await page.getAttribute(".topbar .sound-toggle", "aria-pressed")) === "false", "the sound button shows it is off");
  } finally { await game.close(); }
};

SCENARIOS["print-blocked"] = async function () {
  const game = await openGame({ init: () => { window.print = function () { /* a sandboxed frame ignores print() */ }; } });
  const { page } = game;
  try {
    await newGame(page, "Juno");
    await page.click('.tool-btn[data-tool="grimoire"]');
    await page.waitForSelector(".grimoire-screen");
    await page.click("text=Print Progress Report");
    await page.waitForSelector("#toast-root .toast", { timeout: 3000 }).catch(() => null);
    const toast = await page.$("#toast-root .toast");
    check(!!toast && /Printing is blocked/.test(await toast.textContent()), "when print() is ignored the player is told");
    check(/Download report/.test(await page.textContent(".grimoire-screen .field-status")), "…and pointed to “Download report”");
    check(!(await page.evaluate(() => document.documentElement.classList.contains("print-mode"))), "the page is not left in print mode");
  } finally { await game.close(); }
};

SCENARIOS["leave-casting"] = async function () {
  const game = await openGame();
  const { page } = game;
  try {
    await newGame(page, "Lark");
    await firstChallenge(page);
    const id = await page.evaluate(() => SS.content.chapters[0].challenges[0].id);
    await setCode(page, 'print("Hello world")\n');
    await page.evaluate(() => { document.querySelector(".btn-cast").click(); SS.UI.app.go("map"); });
    await page.waitForSelector("#toast-root .toast", { timeout: 30000 });
    check(/mastered/i.test(await page.textContent("#toast-root")), "a spell finished after leaving is announced (“… mastered!”)");
    check(await page.evaluate((cid) => !!SS.UI.util.challengeState(cid).completed, id), "…and recorded as mastered");
    check(!(await page.$(".modal-success")), "…without opening a dialog over the map");
    check(game.errors.length === 0, "no console errors (" + game.errors.join(" | ") + ")");
  } finally { await game.close(); }
};

SCENARIOS.drafts = async function () {
  const game = await openGame();
  const { page } = game;
  try {
    await newGame(page, "Moss");
    await firstChallenge(page);
    await setCode(page, 'print("a draft")\n');
    await page.evaluate(() => SS.UI.app.go("map"));
    await page.waitForSelector(".map-screen");
    await page.reload();
    await page.waitForSelector(".title-screen .btn-continue");
    await page.click(".btn-continue");
    await page.waitForSelector(".map-screen");
    await page.click(".map-continue");
    await page.waitForSelector(".challenge-screen .editor-surface");
    await page.waitForTimeout(300);
    check((await getCode(page)).indexOf('print("a draft")') >= 0, "a draft typed just before leaving is kept after a reload");
  } finally { await game.close(); }
};

SCENARIOS["damaged-slot"] = async function () {
  const game = await openGame({ init: () => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("pyromancer:slot:1", "{ this is not a save"); sessionStorage.setItem("seeded", "1"); } } });
  const { page } = game;
  try {
    await page.waitForSelector(".title-screen");
    check(await page.isVisible("text=Choose your save"), "the title offers the save slots when one is damaged");
    await page.click("text=Choose your save");
    await page.waitForSelector(".slots-screen");
    check(await page.isVisible(".slot-card.damaged >> text=Damaged save"), "the damaged slot is shown as “Damaged save”");
    await shot(page, "damaged-slot");
    await page.click(".slot-card.damaged button:has-text(\"Delete it\")");
    await page.click(".modal-confirm .btn-danger");
    await page.waitForFunction(() => !document.querySelector(".slot-card.damaged"));
    check(await page.evaluate(() => localStorage.getItem("pyromancer:slot:1") === null), "deleting it frees the slot");
  } finally { await game.close(); }
};

SCENARIOS["scorm-missing"] = async function () {
  const game = await openGame({ config: { scormRequired: true } });
  const { page } = game;
  try {
    await page.waitForSelector(".title-screen", { timeout: 15000 });
    const banner = await page.waitForSelector(".title-screen .banner-warn", { timeout: 8000 }).catch(() => null);
    check(!!banner && /couldn't connect to your course/.test(await banner.textContent()), "the title says the course couldn't be reached");
    await newGame(page, "Bram");
    check(await page.isVisible(".topbar .warn-chip"), "the warning stays reachable from the top bar");
    await page.click(".topbar .warn-chip");
    await page.waitForSelector(".modal >> text=couldn't connect to your course");
    check(true, "the top bar warning explains the problem");
    await shot(page, "scorm-missing");
  } finally { await game.close(); }
};

SCENARIOS.paintings = async function () {
  const LOCATIONS = ["tower", "hall", "circle", "library", "workshop", "labyrinth", "hydra"];
  // Icons only: the repository's art manifest is empty.
  let game = await openGame();
  let page = game.page;
  try {
    await newGame(page, "Ivy");
    const plain = await page.evaluate(() => ({
      stations: document.querySelectorAll(".trail-list .station").length,
      paintings: document.querySelectorAll(".trail img").length,
      icons: [...document.querySelectorAll(".medallion-face svg.gi")].filter((s) => getComputedStyle(s).visibility !== "hidden").length
    }));
    check(plain.paintings === 0 && plain.icons === plain.stations, "without paintings every map station shows its icon (" + JSON.stringify(plain) + ")");
  } finally { await game.close(); }

  // Painted: a manifest listing every location (the files are served from the title art);
  // the Hall's file is missing, so it must fall back to its icon.
  game = await openGame({ goto: false });
  page = game.page;
  try {
    const entries = LOCATIONS.map((id) => '"location-' + id + '": { src: "assets/art/location-' + id + '.webp", width: 1024, height: 683 }');
    const manifest = "(function (g) { var SS = (g.SS = g.SS || {}); SS.ART = {" + entries.join(", ") + "}; })(window);";
    const picture = fs.readFileSync(path.join(GAME, "assets", "pyromancer-title-1024.webp"));
    await page.route("**/js/ui/art-manifest.js", (r) => r.fulfill({ contentType: "text/javascript", body: manifest }));
    await page.route("**/assets/art/*.webp", (r) => (/location-hall/.test(r.request().url())
      ? r.fulfill({ status: 404, body: "missing" }) : r.fulfill({ contentType: "image/webp", body: picture })));
    await page.goto(game.url);
    await newGame(page, "Ivy");
    await page.evaluate(async () => {   // lazy images: bring each station into view once
      for (const st of document.querySelectorAll(".trail-list .station")) { st.scrollIntoView(); await new Promise((r) => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
    });
    await page.waitForFunction(() => [...document.querySelectorAll(".medallion-art")].every((i) => i.complete), null, { timeout: 10000 });
    const painted = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll(".medallion-face .medallion-art")];
      const hall = document.querySelector('.station[data-chapter="hall"] .medallion-face');
      return {
        medallions: imgs.length,
        loaded: imgs.filter((i) => i.naturalWidth > 0).length,
        decorative: imgs.every((i) => i.getAttribute("alt") === "" && i.getAttribute("loading") === "lazy" && i.getAttribute("width") && i.getAttribute("height")),
        banners: document.querySelectorAll(".station-banner img").length,
        hallIcon: !!hall && !hall.classList.contains("has-art") && !hall.querySelector("img") && getComputedStyle(hall.querySelector("svg.gi")).visibility !== "hidden"
      };
    });
    check(painted.medallions === 6 && painted.loaded === 6, "the map shows the paintings in the station medallions (" + JSON.stringify(painted) + ")");
    check(painted.decorative, "paintings are decorative images (alt=\"\", lazy, with width and height)");
    check(painted.banners === 6, "painted stations get a painted banner on their card");
    check(painted.hallIcon, "a painting that can't be loaded falls back to the station's icon");
    await shot(page, "paintings-map");
    await page.click(".trail-list .station:nth-child(1) .station-btn");
    await page.waitForSelector(".chapter-screen");
    await page.waitForSelector(".modal-dialogue .dlg-banner img", { timeout: 5000 }).catch(() => null);
    check(!!(await page.$(".modal-dialogue .dlg-banner img")), "the chapter's story opens with the area's painting");
    await page.click(".modal-dialogue .dlg-next");
    await page.waitForFunction(() => !document.querySelector(".modal-overlay"));
    check(!!(await page.$(".chapter-hero.has-art .chapter-hero-art img")), "the chapter header shows the area's painting");
    await page.click(".challenge-card >> nth=0");
    await page.waitForSelector(".challenge-screen");
    check(!!(await page.$(".scene-stage.has-art .scene-backdrop img")), "the challenge scene uses the area's painting as its backdrop");
    check(await page.evaluate(() => !!document.querySelector(".scene-stage .scene-icon svg.gi")), "…with the scene's icon in front of it");
    check(game.errors.filter((e) => !/404|Failed to load resource/i.test(e)).length === 0, "no console errors with paintings (" + game.errors.join(" | ") + ")");
  } finally { await game.close(); }
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
