#!/usr/bin/env node
/*
 * Browser tests for the situations instructors and students actually run into. DESIGN.md §9.
 *
 *   node tools/e2e/ui-robustness.js [--shots DIR] [--only name,name]
 *
 *   storage        localStorage throws (privacy mode, sandboxed frame) → a warning, the game still plays
 *   file           index.html opened from disk (file://) → plays, no console errors
 *   dist           the single-file build (tools/build.py --out <tmp>) opened from disk → plays
 *   scorm          a mock SCORM 1.2 LMS → no slots, the learner's name, score + suspend data, resume
 *   unlock         ?unlock=all opens every case
 *   reference-off  ?reference=off hides the Casebook everywhere (nav, case, medications, debrief)
 *   hints-off      ?hints=off hides "Ask Dr. Okafor"
 *   flags          ?motion=reduce and ?sound=off
 *   corrupt-save   an unreadable save slot is shown as damaged and can be deleted; bad case progress is clamped
 *   missing-file   a content file that fails to load: a quiet notice, the rest works
 *   print-blocked  print() silently ignored (sandboxed frame) → the player is offered a download
 *   keyboard       a case answered with the keyboard only
 *   reduced-motion prefers-reduced-motion: the CASE CLOSED stamp shows at once
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const L = require("./lib");

const args = process.argv.slice(2);
const SHOTS = args.indexOf("--shots") >= 0 ? path.resolve(args[args.indexOf("--shots") + 1]) : null;
const ONLY = args.indexOf("--only") >= 0 ? args[args.indexOf("--only") + 1].split(",") : null;

function log(msg) { process.stdout.write(msg + "\n"); }
const { check, state } = L.makeChecker(log);
const shot = (page, name) => L.shot(page, SHOTS, "robust-" + name);
async function text(page, sel) { return (await page.textContent(sel)) || ""; }
async function count(page, sel) { return page.$$eval(sel, (els) => els.length); }

const C = L.content();
const EXAMPLE = C.getCase("coronary-snow-shoveler") || C.cases()[0];

/** Open the example case and solve its first step (wrong once, then right). */
async function firstStep(page) {
  await L.openCase(page, EXAMPLE.id);
  await L.answerWrong(page, EXAMPLE.steps[0]);
  await L.answerRight(page, EXAMPLE.steps[0]);
  check((await count(page, ".explain-box")) === 1, "the first step can be solved");
}

const S = {};

S.storage = async function () {
  const game = await L.openGame({ blockStorage: true });
  const { page } = game;
  try {
    check((await count(page, ".title-screen .banner-warn")) === 1, "the title warns that progress can't be saved");
    await L.newGame(page, "Sam");
    check(!(await page.$eval(".warn-chip", (b) => b.hidden)), "a 'Not saving' chip stays in the top bar");
    await firstStep(page);
    await page.click(".warn-chip");
    await page.waitForSelector(".modal");
    check(/save code/i.test(await text(page, ".modal")), "the warning points to the save code");
    await shot(page, "storage");
    check(game.errors.length === 0, "no console errors with storage blocked (" + game.errors.join(" | ") + ")");
  } finally { await game.close(); }
};

S.file = async function () {
  const game = await L.openGame({ file: true });
  const { page } = game;
  try {
    check(/^file:/.test(page.url()), "the page really is a file:// URL");
    await L.newGame(page, "Fern");
    await firstStep(page);
    await shot(page, "file");
    check(game.errors.length === 0, "no console errors from file:// (" + game.errors.join(" | ") + ")");
  } finally { await game.close(); }
};

S.dist = async function () {
  const missing = L.missingContentFiles();
  if (missing.length) {
    log("    (skipped: tools/build.py needs every file index.html loads; missing " + missing.join(", ") + ")");
    return;
  }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "ccf-dist-"));
  try {
    execFileSync("python3", [path.join(L.GAME, "tools", "build.py"), "--out", out], { stdio: "pipe" });
  } catch (err) {
    check(false, "tools/build.py builds the single file (" + String(err.stderr || err.message).split("\n").slice(-3).join(" ") + ")");
    return;
  }
  const file = path.join(out, "cardiac-case-files.html");
  check(fs.existsSync(file), "the build writes cardiac-case-files.html");
  if (!fs.existsSync(file)) return;
  const game = await L.openGame({ goto: false });
  const { page } = game;
  try {
    await page.goto("file://" + file);
    await page.waitForSelector(".title-screen", { timeout: 15000 });
    const fonts = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check("16px \"Special Elite\""); });
    check(fonts, "the single file carries its fonts");
    await L.newGame(page, "Dana");
    await firstStep(page);
    const foreign = game.requests.filter((u) => !/^(file:|data:|blob:)/.test(u));
    check(foreign.length === 0, "the single file makes no network requests (" + foreign.slice(0, 3).join(", ") + ")");
    await shot(page, "dist");
    check(game.errors.length === 0, "no console errors in the single file (" + game.errors.join(" | ") + ")");
  } finally {
    await game.close();
    fs.rmSync(out, { recursive: true, force: true });
  }
};

/** A SCORM 1.2 API whose data survives reloads (kept in the page's localStorage). */
function mockLms(seed) {
  const KEY = "__mock_lms__";
  let data;
  try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { data = null; }
  if (!data) data = seed;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } };
  window.__lms = data;
  window.API = {
    LMSInitialize: () => "true",
    LMSFinish: () => { save(); return "true"; },
    LMSGetValue: (k) => (k in data ? String(data[k]) : ""),
    LMSSetValue: (k, v) => { data[k] = String(v); save(); return "true"; },
    LMSCommit: () => { save(); data.__commits = (data.__commits || 0) + 1; return "true"; },
    LMSGetLastError: () => "0",
    LMSGetErrorString: () => "No error",
    LMSGetDiagnostic: () => ""
  };
}

S.scorm = async function () {
  const seed = { "cmi.core.student_name": "Rivera, Jordan", "cmi.core.student_id": "jr42", "cmi.core.lesson_status": "not attempted", "cmi.core.entry": "ab-initio", "cmi.suspend_data": "", "cmi.core.score.raw": "" };
  const game = await L.openGame({ goto: false });
  const { page } = game;
  try {
    await page.addInitScript(mockLms, seed);
    await page.goto(game.url);
    await page.waitForSelector(".title-screen");
    check(await page.evaluate(() => CCF.Save.isScorm()), "the game finds the LMS");
    check(!(await page.$(".title-slots")), "no save slots in an LMS");
    check(!(await page.$(".title-begin")), "no name prompt: the course profile already exists");
    const cont = await text(page, ".title-continue");
    check(/Jordan/.test(cont), "the title offers to continue as the learner (" + cont.trim() + ")");
    await shot(page, "scorm-title");
    await page.click(".title-continue");
    await page.waitForSelector(".story-screen, .board-screen");
    if (await page.$(".story-screen")) await page.click(".dlg-skip");
    await page.waitForSelector(".board-screen");
    await L.openCase(page, EXAMPLE.id);
    await L.playCase(page, EXAMPLE);
    await page.evaluate(() => CCF.Save.flush && CCF.Save.flush());
    const lms = await page.evaluate(() => window.__lms);
    check(Number(lms["cmi.core.score.raw"]) > 0, "the score is reported to the LMS (" + lms["cmi.core.score.raw"] + ")");
    check(String(lms["cmi.suspend_data"] || "").length > 10, "progress is stored in suspend_data");
    check(String(lms["cmi.suspend_data"] || "").length <= 4096, "suspend_data fits SCORM 1.2");
    await page.reload();
    await page.waitForSelector(".title-screen");
    await page.click(".title-continue");
    await page.waitForSelector(".board-screen");
    check((await count(page, '.case-card.is-solved .case-open[data-case="' + EXAMPLE.id + '"]')) === 1, "the solved case comes back from the LMS after a reload");
    await page.click('.nav-btn[data-nav="settings"]');
    await page.waitForSelector(".modal-settings");
    check((await count(page, ".modal-settings .open-savecode")) === 1, "a personal save code is still offered");
    check(!/Save slots/.test(await text(page, ".modal-settings")), "Settings offers no save slots in an LMS");
    check(game.errors.length === 0, "no console errors with an LMS (" + game.errors.join(" | ") + ")");
  } finally { await game.close(); }
};

S.unlock = async function () {
  const game = await L.openGame({ query: "?unlock=all" });
  const { page } = game;
  try {
    await L.newGame(page, "Uma");
    check((await count(page, ".case-card.is-locked")) === 0, "?unlock=all opens every case");
    const last = C.cases().filter((k) => k.order > 1).pop();
    if (last) {
      await L.openCase(page, last.id);
      check(/Step 1/.test(await text(page, "#step-heading")), "a later case opens straight away");
    }
    check(game.errors.length === 0, "no console errors (" + game.errors.join(" | ") + ")");
  } finally { await game.close(); }
};

S["reference-off"] = async function () {
  const game = await L.openGame({ query: "?reference=off" });
  const { page } = game;
  try {
    await L.newGame(page, "Rae");
    check(await page.$eval('.nav-btn[data-nav="casebook"]', (b) => b.hidden), "no Casebook in the menu");
    await L.openCase(page, EXAMPLE.id);
    check((await count(page, ".open-casebook")) === 0, "no Casebook button in a case");
    await page.click('.file-tab[data-tab="meds"]');
    check((await count(page, ".med-lookup")) === 0, "no Casebook look-ups for medications");
    await L.playCase(page, EXAMPLE);
    check((await count(page, ".casebook-links")) === 0, "no Casebook links in the debrief");
    await page.evaluate(() => CCF.UI.app.go("casebook"));
    check((await count(page, ".board-screen")) === 1, "the Casebook screen can't be opened");
    await page.evaluate(() => CCF.UI.app.go("drill", { id: "pressure" }));
    check(!/Casebook/.test(await text(page, ".drill-foot")), "drills don't link to the Casebook");
    check(game.errors.length === 0, "no console errors (" + game.errors.join(" | ") + ")");
  } finally { await game.close(); }
};

S["hints-off"] = async function () {
  const game = await L.openGame({ query: "?hints=off" });
  const { page } = game;
  try {
    await L.newGame(page, "Hal");
    await L.openCase(page, EXAMPLE.id);
    check((await count(page, ".ask-okafor")) === 0, "?hints=off hides Ask Dr. Okafor");
    await L.answerWrong(page, EXAMPLE.steps[0]);
    await L.answerWrong(page, EXAMPLE.steps[0]);
    check(!(await page.$eval(".show-me", (b) => b.hidden)), "Show me the answer still appears");
    await shot(page, "hints-off");
    check(game.errors.length === 0, "no console errors (" + game.errors.join(" | ") + ")");
  } finally { await game.close(); }
};

S.flags = async function () {
  const game = await L.openGame({ query: "?motion=reduce&sound=off" });
  const { page } = game;
  try {
    check(await page.evaluate(() => document.documentElement.classList.contains("reduce-motion")), "?motion=reduce turns animations off");
    await L.newGame(page, "Flo");
    check((await page.getAttribute(".sound-toggle", "aria-pressed")) === "false", "?sound=off turns sound off");
    check(await page.evaluate(() => !CCF.UI.sound.isEnabled()), "and the sound engine is silent");
    await page.click(".sound-toggle");
    check((await page.getAttribute(".sound-toggle", "aria-pressed")) === "true", "the player can still turn sound back on");
  } finally { await game.close(); }
};

S["corrupt-save"] = async function () {
  const game = await L.openGame({
    init: () => { try { localStorage.setItem("cardiac-case-files:slot:0", "{{{ not a save"); } catch (e) { /* ignore */ } }
  });
  const { page } = game;
  try {
    await page.waitForSelector(".title-screen");
    check((await count(page, ".title-slots")) === 1, "the title offers the save slots");
    await page.click(".title-slots");
    await page.waitForSelector(".slots-screen");
    check((await count(page, ".slot-card.is-damaged")) === 1, "the unreadable slot is shown as damaged");
    await shot(page, "corrupt-slot");
    await page.click(".slot-card.is-damaged .slot-delete");
    await page.click(".modal-confirm .btn-danger");
    await L.waitForModalGone(page);
    check((await count(page, ".slot-card.is-damaged")) === 0, "the damaged slot can be deleted");
    await page.click(".slots-back");
    await L.newGame(page, "Cora");
    // Nonsense in-progress data is clamped, never a crash.
    await page.evaluate((id) => CCF.Save.saveCaseProgress(id, { step: 99, strikes: -4, hints: "x", answers: "nonsense" }), EXAMPLE.id);
    await L.openCase(page, EXAMPLE.id);
    const heading = await text(page, "#step-heading");
    check(new RegExp("Step " + EXAMPLE.steps.length).test(heading), "an out-of-range step resumes at the last step (" + heading.trim() + ")");
    check((await text(page, ".strike-count strong")).trim() === "0", "negative strikes are ignored");
    check(game.errors.length === 0, "no console errors (" + game.errors.join(" | ") + ")");
  } finally { await game.close(); }
};

S["missing-file"] = async function () {
  const victim = "u2-coronary.js";
  const game = await L.openGame({
    goto: false,
    routes: [{ url: "**/js/content/" + victim, handler: (route) => route.fulfill({ status: 404, body: "not found" }) }]
  });
  const { page } = game;
  try {
    await page.goto(game.url);
    await page.waitForSelector(".title-screen");
    await L.newGame(page, "Mia");
    check((await count(page, ".board-notice")) === 1, "the board says quietly that some case files are missing");
    check((await text(page, ".board-notice")).indexOf(victim) >= 0 || /missing/.test(await text(page, ".board-notice")), "the notice names the problem");
    check((await count(page, '.case-open[data-case="coronary-snow-shoveler"]')) === 0, "the missing file's cases are absent");
    const other = C.cases().find((k) => k._file !== victim && k.order === 1);
    if (other) {
      await L.openCase(page, other.id);
      check(/Step 1/.test(await text(page, "#step-heading")), "cases from other files still open");
    }
    await shot(page, "missing-file");
    const real = game.errors.filter((e) => !/Failed to load resource/.test(e));
    check(real.length === 0, "no other console errors (" + real.join(" | ") + ")");
  } finally { await game.close(); }
};

S["print-blocked"] = async function () {
  const game = await L.openGame();
  const { page } = game;
  try {
    await L.newGame(page, "Pia");
    await page.evaluate(() => { window.print = function () { /* a sandboxed frame ignores print() */ }; });
    await page.click('.nav-btn[data-nav="log"]');
    await page.click(".print-report");
    await page.waitForSelector(".modal", { timeout: 3000 });
    check(/blocked/i.test(await text(page, ".modal")), "the player is told printing is blocked");
    check(/Download/.test(await text(page, ".modal-actions")), "and offered a download instead");
    check(!(await page.evaluate(() => document.documentElement.classList.contains("print-mode"))), "the page leaves print mode");
  } finally { await game.close(); }
};

S.keyboard = async function () {
  const game = await L.openGame();
  const { page } = game;
  try {
    await L.newGame(page, "Kim");
    await page.focus('.case-open[data-case="' + EXAMPLE.id + '"]');
    await page.keyboard.press("Enter");
    await page.waitForSelector(".case-screen #step-heading");
    // Move through the file's tabs with the arrow keys.
    await page.focus('.file-tab[data-tab="referral"]');
    await page.keyboard.press("ArrowRight");
    check(await page.evaluate(() => document.activeElement.getAttribute("data-tab") === "history" && document.activeElement.getAttribute("aria-selected") === "true"), "arrow keys move between the file's tabs");
    // Answer the first step: reach the right option with Tab/arrows, then Check.
    const s = EXAMPLE.steps[0];
    const right = s.options.findIndex((o) => o.correct);
    await page.focus(".answer-choices .choice-input");
    for (let i = 0; i < 6; i++) {
      const on = await page.evaluate(() => document.activeElement.closest(".choice").getAttribute("data-index"));
      if (Number(on) === right) break;
      await page.keyboard.press("ArrowDown");
    }
    await page.keyboard.press("Space");
    check(await page.evaluate((r) => document.querySelector('.choice[data-index="' + r + '"] input').checked, right), "the right option can be chosen from the keyboard");
    let reached = false;
    for (let i = 0; i < 8 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("check-answer"));
    }
    check(reached, "Tab reaches the Check button");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".feedback-right");
    let next = false;
    for (let i = 0; i < 25 && !next; i++) {
      await page.keyboard.press("Tab");
      next = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("next-step"));
    }
    check(next, "Tab reaches Next step after the explanation");
    await page.keyboard.press("Enter");
    check(/Step 2/.test(await text(page, "#step-heading")), "Enter moves to the next step");
    check(await page.evaluate(() => document.activeElement && document.activeElement.id === "step-heading"), "focus lands on the new step");
    // Esc closes a dialog and gives focus back.
    await page.focus(".open-casebook");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".modal-casebook");
    await page.keyboard.press("Escape");
    await L.waitForModalGone(page);
    check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("open-casebook")), "closing the Casebook returns focus to its button");
    check(game.errors.length === 0, "no console errors (" + game.errors.join(" | ") + ")");
  } finally { await game.close(); }
};

S["reduced-motion"] = async function () {
  const game = await L.openGame({ reducedMotion: true });
  const { page } = game;
  try {
    await L.newGame(page, "Rex");
    await L.openCase(page, EXAMPLE.id);
    await L.playCase(page, EXAMPLE);
    const stamp = await page.$eval(".stamp-big", (el) => ({ cls: el.className, op: getComputedStyle(el).opacity }));
    check(!/stamp-pending/.test(stamp.cls) && Number(stamp.op) > 0.5, "the CASE CLOSED stamp is shown at once");
    check((await count(page, ".star-pending")) === 0, "the stars are shown at once");
    await shot(page, "reduced-motion");
  } finally { await game.close(); }
};

async function main() {
  log("The Cardiac Case Files — robustness" + (ONLY ? " (" + ONLY.join(", ") + ")" : ""));
  for (const name of Object.keys(S)) {
    if (ONLY && ONLY.indexOf(name) < 0) continue;
    log("  • " + name);
    try {
      await S[name]();
    } catch (err) {
      state.failures++;
      log("    ✗ " + name + " threw: " + String((err && err.message) || err).split("\n")[0]);
    }
  }
  log("");
  log(state.failures ? "FAILED: " + state.failures + " of " + state.checks + " checks" : "OK: " + state.checks + " checks passed");
  process.exit(state.failures ? 1 : 0);
}

main();
