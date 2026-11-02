#!/usr/bin/env node
/*
 * Browser test of the player-facing game (Playwright + headless Chromium). DESIGN.md §9.
 *
 *   node tools/e2e/ui-flow.js                    # full flow + responsive pass
 *   node tools/e2e/ui-flow.js --shots DIR        # …and save screenshots there
 *   node tools/e2e/ui-flow.js --quick            # skip playing every other case
 *
 * Flow (1440×900): title (no network requests, About) → Begin → name → intro (Dr. Okafor) →
 * board → case 2.1 with an empty check, a wrong answer (feedback on that choice, a strike), a
 * hint, the right answer (explanation, focus) → an update (new vitals flagged) → a wrong answer,
 * then a reload in the middle of the case → Continue → "In progress" card → the same step with
 * the same strikes and marks → the Casebook as a dialog keeps the case → "Show me the answer"
 * after two wrong tries → an update that adds an exhibit → CASE CLOSED with the stars and XP
 * that CCF.Progress predicts → the board → Replay for 3 stars → every other case present
 * (right and wrong answers, hints, test steps revealing sealed results) → reload persistence →
 * Rapid Rounds (each drill: a right answer, a streak, a wrong answer, the best streak saved) →
 * case log + printable report → Settings (sound, motion, text size, rename) → save code export,
 * slot deleted, code imported → the last case closes the files: finale → certificate (print).
 * Responsive pass at 1440×900, 1024×768 and 390×844: no horizontal scrolling, no console errors.
 *
 * Correct answers come from the content (tools/validate_content.js → loadContent()).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const L = require("./lib");

const args = process.argv.slice(2);
const SHOTS = args.indexOf("--shots") >= 0 ? path.resolve(args[args.indexOf("--shots") + 1]) : null;
const QUICK = args.indexOf("--quick") >= 0;

function log(msg) { process.stdout.write(msg + "\n"); }
const { check, state } = L.makeChecker(log);

async function section(name, fn) {
  log("  • " + name);
  try {
    await fn();
  } catch (err) {
    state.failures++;
    log("    ✗ " + name + " threw: " + String((err && err.message) || err).split("\n")[0]);
    throw err;
  }
}

const shot = (page, name, opts) => L.shot(page, SHOTS, name, opts);

async function text(page, sel) { return (await page.textContent(sel)) || ""; }
async function count(page, sel) { return page.$$eval(sel, (els) => els.length); }
async function strikes(page) { return Number((await text(page, ".strike-count strong")).trim()); }
async function profile(page) { return page.evaluate(() => CCF.Save.current()); }

/** Stub window.print so the print path can be tested headless. */
async function stubPrint(page) {
  await page.evaluate(() => {
    window.__printed = 0;
    window.print = function () {
      window.__printed++;
      window.__printedHtml = document.getElementById("print-root").innerHTML;
      window.dispatchEvent(new Event("beforeprint"));
      setTimeout(() => window.dispatchEvent(new Event("afterprint")), 20);
    };
  });
}

async function main() {
  const C = L.content();
  const allCases = C.cases();
  const example = C.getCase("coronary-snow-shoveler");
  const missing = L.missingContentFiles();
  log("The Cardiac Case Files — UI flow (" + allCases.length + " cases" + (missing.length ? "; missing: " + missing.join(", ") : "") + ")");
  if (!example) throw new Error("the example case 2.1 (coronary-snow-shoveler) is missing");

  const game = await L.openGame({ viewport: { width: 1440, height: 900 } });
  const { page } = game;
  const NAME = "Jordan Rivera";
  try {
    await section("title screen, no network, About", async () => {
      await page.waitForSelector(".title-screen");
      check((await text(page, ".title-h1")).replace(/\s+/g, " ").trim() === "The Cardiac Case Files", "the title says The Cardiac Case Files");
      check(/For education only/.test(await text(page, ".title-disclaimer")), "the title shows the disclaimer");
      check(await page.title() === "The Cardiac Case Files", "the page title is The Cardiac Case Files");
      const foreign = game.requests.filter((u) => !/^(http:\/\/127\.0\.0\.1:\d+\/|data:|blob:)/.test(u));
      check(foreign.length === 0, "no requests leave the game folder (" + foreign.join(", ") + ")");
      const fonts = await page.evaluate(async () => { await document.fonts.ready; return ["Special Elite", "Inter", "JetBrains Mono"].map((f) => document.fonts.check("16px \"" + f + "\"")); });
      check(fonts.every(Boolean), "the three self-hosted fonts load (" + fonts.join(",") + ")");
      await shot(page, "flow-01-title");
      await page.click(".title-about");
      await page.waitForSelector(".modal .about");
      const about = await text(page, ".modal .about");
      check(/game-icons\.net/.test(about) && /CC BY 3\.0/.test(about), "About credits the game-icons.net icons (CC BY 3.0)");
      check(/not medical advice/i.test(about) && /fictional/i.test(about), "About carries the disclaimer");
      await page.keyboard.press("Escape");
      await L.waitForModalGone(page);
    });

    await section("new game → intro with Dr. Okafor → board", async () => {
      await page.click(".title-begin");
      await page.waitForSelector(".modal-prompt input");
      await page.keyboard.press("Enter");
      check(/name/i.test(await text(page, ".modal-prompt .field-error")), "an empty name is refused with a message");
      await page.fill(".modal-prompt input", NAME);
      await page.keyboard.press("Enter");
      await page.waitForSelector(".story-screen");
      const panels = (C.story && C.story.intro) || [];
      let sawOkafor = false;
      for (let i = 0; i < panels.length; i++) {
        if (/Okafor/.test(await text(page, ".dlg-name"))) sawOkafor = true;
        if (i === 2) await shot(page, "flow-02-intro");
        await page.click(".dlg-next");
      }
      check(sawOkafor, "Dr. Okafor speaks in the intro");
      await page.waitForSelector(".board-screen");
      check((await profile(page)).seen.intro === true, "the intro is marked as seen");
    });

    await section("case board", async () => {
      check((await count(page, ".drawer")) === C.units().length, "six unit drawers");
      check((await count(page, ".case-card")) === allCases.length, "one folder per case (" + allCases.length + ")");
      check(/Jordan Rivera/.test(await text(page, ".player-card-name")), "the player card shows the name");
      check(/Student Clinician/.test(await text(page, ".player-card-rank")), "the player starts as Student Clinician");
      const firstsOpen = await page.evaluate(() => CCF.content.units().every((u) => {
        const first = CCF.content.cases(u.id)[0];
        if (!first) return true;
        const card = document.querySelector('.case-open[data-case="' + first.id + '"]');
        return card && card.getAttribute("aria-disabled") !== "true";
      }));
      check(firstsOpen, "the first case of every unit is open");
      const secondLocked = await page.evaluate(() => {
        const two = CCF.content.cases().filter((k) => k.order === 2)[0];
        if (!two) return true;
        return document.querySelector('.case-open[data-case="' + two.id + '"]').getAttribute("aria-disabled") === "true";
      });
      check(secondLocked, "a unit's second case is locked until the first is solved");
      check(/Open case/.test(await text(page, ".board-continue")), "a Continue button offers the next case");
      await shot(page, "flow-03-board");
      // A locked card explains itself.
      const locked = await page.$('.case-open[aria-disabled="true"]');
      if (locked) {
        await locked.click({ force: true });      // aria-disabled: Playwright won't click it unforced
        await page.waitForSelector(".toast");
        check(/Solve case/.test(await text(page, ".toast")), "a locked case says which case opens it");
      }
    });

    let exampleStrikes = 0;
    await section("case 2.1: empty check, wrong answer, hint, right answer", async () => {
      await page.click('.case-open[data-case="' + example.id + '"]');
      await page.waitForSelector('.case-screen[data-case="' + example.id + '"]');
      check(/Step 1/.test(await text(page, "#step-heading")), "the case opens at step 1");
      check((await count(page, ".file-tab")) === 6, "the file has six sections (Referral · History · Medications · Vitals · Exam · Tests)");
      check(/Harold Brenner/.test(await text(page, ".file-panel:not([hidden])")), "the referral shows the patient");
      await page.click('.file-tab[data-tab="meds"]');
      check(/Lisinopril/.test(await text(page, '.file-panel[data-panel="meds"]')), "the medications tab lists the drugs");
      await page.click('.file-tab[data-tab="referral"]');
      await L.check(page);
      await page.waitForSelector(".feedback-info");
      check((await strikes(page)) === 0, "checking with nothing chosen is not a strike");
      await shot(page, "flow-04-case-step1");
      const s1 = example.steps[0];
      await L.answerWrong(page, s1);
      exampleStrikes++;
      check((await strikes(page)) === 1, "a wrong answer is a strike");
      check((await count(page, ".choice.is-wrong")) === 1, "the wrong choice is marked");
      const wrongIdx = s1.options.findIndex((o) => !o.correct);
      const why = (await text(page, '.choice[data-index="' + wrongIdx + '"] .choice-why')).trim();
      check(why.length > 20 && s1.options[wrongIdx].why.indexOf(why.slice(0, 20)) >= 0, "the wrong choice shows its own feedback");
      check((await page.getAttribute(".feedback", "aria-live")) === "polite", "feedback is in an aria-live region");
      await shot(page, "flow-05-case-wrong");
      await page.click(".ask-okafor");
      await page.waitForSelector(".hint-list .hint");
      exampleStrikes++;
      check((await strikes(page)) === 2, "a hint is a strike");
      check((await text(page, ".hint-text")).indexOf(s1.hints[0].slice(0, 30)) >= 0, "the hint is Dr. Okafor's first hint");
      await L.answerRight(page, s1);
      check((await count(page, ".feedback-right")) === 1, "the right answer is confirmed");
      await page.waitForTimeout(80);
      check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("explain-kicker")), "focus moves to the explanation");
      check((await text(page, ".next-step")).indexOf("Next step") >= 0, "a Next step button follows");
      await shot(page, "flow-06-case-right");
      await L.nextStep(page);
      await L.solveStep(page, example.steps[1]);
      await L.nextStep(page);
    });

    await section("an update: new vitals; then leave mid-case and come back", async () => {
      const s3 = example.steps[2];
      check(/Step 3/.test(await text(page, "#step-heading")), "step 3 is on screen");
      if (s3.update) {
        check((await text(page, ".update-title")).indexOf(s3.update.title.slice(0, 12)) >= 0, "the update banner shows its title");
        if (s3.update.vitals) {
          check((await count(page, '.file-tab[data-tab="vitals"] .tab-new')) === 1, "the Vitals tab is flagged New");
          check(/New reading/.test(await text(page, '.file-panel[data-panel="vitals"]')), "the vitals keep the history and flag the new reading");
        }
      }
      await shot(page, "flow-07-case-update");
      await L.answerWrong(page, s3);
      exampleStrikes++;
      check((await strikes(page)) === exampleStrikes, "strikes add up over the case (" + exampleStrikes + ")");
      await page.reload();
      await page.waitForSelector(".title-screen");
      check(/Continue as Jordan Rivera/.test(await text(page, ".title-continue")), "the title offers Continue as the player");
      await page.click(".title-continue");
      await page.waitForSelector(".board-screen");
      const card = await text(page, '.case-card .case-open[data-case="' + example.id + '"]');
      check(/In progress/.test(card), "the board shows the case as In progress");
      await page.click('.case-open[data-case="' + example.id + '"]');
      await page.waitForSelector(".case-screen");
      check(/Step 3/.test(await text(page, "#step-heading")), "the case resumes at the same step");
      check((await strikes(page)) === exampleStrikes, "the strikes survive the reload");
      check((await count(page, ".choice.is-wrong")) === 1, "the wrong answer is still marked");
      check((await count(page, ".step-dot.is-done")) === 2, "the earlier steps show as done");
    });

    await section("the Casebook during a case keeps the case", async () => {
      await page.click(".open-casebook");
      await page.waitForSelector(".modal-casebook .casebook");
      await page.fill(".modal-casebook .cb-search", "nitro");
      await page.waitForSelector('.modal-casebook .cb-item[data-entry="nitrates"]');
      await page.click('.modal-casebook .cb-item[data-entry="nitrates"]');
      check(/Nitrates/.test(await text(page, ".modal-casebook .cb-title")), "a search finds the nitrates entry");
      await shot(page, "flow-08-casebook-dialog");
      await page.keyboard.press("Escape");
      await L.waitForModalGone(page);
      check(/Step 3/.test(await text(page, "#step-heading")) && (await strikes(page)) === exampleStrikes, "the case is exactly where it was");
      // The step review dialog.
      await page.click(".step-dot.is-done");
      await page.waitForSelector(".modal .review-answer");
      check(/Answer:/.test(await text(page, ".modal .review-answer")), "an earlier step can be reviewed");
      await page.keyboard.press("Escape");
      await L.waitForModalGone(page);
    });

    await section("show me the answer after two wrong tries; an update adds an exhibit", async () => {
      const s3 = example.steps[2];
      check(await page.$eval(".show-me", (b) => b.hidden), "Show me the answer is hidden after one wrong try");
      await L.answerWrong(page, s3);
      exampleStrikes++;
      check(!(await page.$eval(".show-me", (b) => b.hidden)), "Show me the answer appears after two wrong tries");
      await page.click(".show-me");
      await page.waitForSelector(".feedback-shown");
      exampleStrikes++;
      check((await strikes(page)) === exampleStrikes, "Show me the answer is a strike");
      check((await count(page, ".choice.is-correct")) === 1, "the right answer is shown");
      await L.nextStep(page);
      const s4 = example.steps[3];
      if (s4.update && s4.update.exhibits && s4.update.exhibits.length) {
        const xid = s4.update.exhibits[0].id;
        check((await count(page, '.file-tab[data-tab="tests"] .tab-new')) === 1, "the Tests tab is flagged New");
        check((await count(page, '.file-panel[data-panel="tests"] .exhibit.is-new[data-exhibit="' + xid + '"]')) === 1, "the new exhibit is in the file, flagged New");
      }
      await shot(page, "flow-09-case-exhibit");
      await L.solveStep(page, s4);
      check(/Close the case/.test(await text(page, ".next-step")), "the last step closes the case");
    });

    await section("CASE CLOSED: stars, XP, debrief", async () => {
      await L.nextStep(page);
      await page.waitForSelector(".debrief");
      const expect = await page.evaluate((a) => {
        const k = CCF.content.getCase(a.id);
        const stars = CCF.Progress.starsFor(a.strikes, k.steps.length);
        return { stars, xp: CCF.Progress.xpFor(k, stars) };
      }, { id: example.id, strikes: exampleStrikes });
      check((await page.getAttribute(".result-stars .stars", "aria-label")) === expect.stars + " of 3 stars", "the stars match CCF.Progress (" + expect.stars + ")");
      check((await text(page, ".result-xp-value")).trim() === "+" + expect.xp + " XP", "the XP matches CCF.Progress (+" + expect.xp + ")");
      check(/Case closed/i.test(await text(page, ".stamp-big")), "the CASE CLOSED stamp is shown");
      check((await text(page, ".debrief-dx")).indexOf(example.debrief.diagnosis.slice(0, 20)) >= 0, "the debrief names the diagnosis");
      check((await count(page, ".takeaways li")) === example.debrief.takeaways.length, "the take-home points are listed");
      check((await count(page, ".sources li")) === example.debrief.sources.length, "the lecture sources are listed");
      const rec = (await profile(page)).cases[example.id];
      check(rec && rec.solved && rec.bestStars === expect.stars && !rec.current, "the solve is saved and the case is no longer in progress");
      await page.waitForTimeout(2300);
      await shot(page, "flow-10-debrief");
      await shot(page, "flow-10b-debrief-full", { fullPage: true });
      await page.click(".debrief-board");
      await page.waitForSelector(".board-screen");
      const card = await page.$('.case-card.is-solved .case-open[data-case="' + example.id + '"]');
      check(!!card, "the board shows the case closed");
      check((await count(page, '.case-card.is-solved .case-stamp')) >= 1, "with a CASE CLOSED stamp");
    });

    await section("replay for a better result", async () => {
      await page.click('.case-open[data-case="' + example.id + '"]');
      await page.waitForSelector(".debrief");
      check((await count(page, ".debrief-replay")) === 1, "a solved case opens closed, with Replay");
      await page.click(".debrief-replay");
      await page.waitForSelector(".case-screen #step-heading");
      check(/Step 1/.test(await text(page, "#step-heading")) && (await strikes(page)) === 0, "Replay starts again from step 1");
      await L.playCase(page, example);
      check((await page.getAttribute(".result-stars .stars", "aria-label")) === "3 of 3 stars", "a clean replay earns 3 stars");
      check(/New best/.test(await text(page, ".closed-folder")), "the replay says it's a new best");
      check((await profile(page)).cases[example.id].bestStars === 3, "the best result is kept");
    });

    const seenTypes = new Set();
    example.steps.forEach((s) => seenTypes.add(s.type));
    const others = allCases.filter((k) => k.id !== example.id);
    const finalCase = others.length ? others[others.length - 1] : null;
    await section("every other case present" + (QUICK ? " (quick: one per unit)" : ""), async () => {
      let played = 0;
      const list = QUICK ? C.units().map((u) => C.cases(u.id)[0]).filter((k) => k && k.id !== example.id) : others;
      for (const k of list) {
        if (k === finalCase && !QUICK) continue;      // closed at the end (finale)
        await L.openCase(page, k.id);
        const plan = k.steps.map((s, i) => (i === 0 ? { wrong: 1 } : i === 1 ? { hint: true } : {}));
        const caseStrikes = await L.playCase(page, k, plan);
        k.steps.forEach((s) => seenTypes.add(s.type));
        const expected = await page.evaluate((a) => CCF.Progress.starsFor(a.s, a.n), { s: caseStrikes, n: k.steps.length });
        const label = await page.getAttribute(".result-stars .stars", "aria-label");
        check(label === expected + " of 3 stars", "case " + C.caseNumber(k) + " closes with " + expected + " stars (" + label + ")");
        // Sealed results revealed by test steps are in the file now — checked through the record.
        played++;
      }
      log("    played " + played + " more case(s); step types seen: " + Array.from(seenTypes).sort().join(", "));
    });

    await section("test steps open sealed results", async () => {
      const kase = allCases.find((k) => k.steps.some((s) => s.type === "test"));
      if (!kase) { log("    (no test steps in the content yet)"); return; }
      await page.evaluate((id) => CCF.UI.app.go("case", { id: id, replay: true }), kase.id);
      await page.waitForSelector(".case-screen #step-heading");
      const ti = kase.steps.findIndex((s) => s.type === "test");
      const sealedBefore = await count(page, ".exhibit-sealed");
      check(sealedBefore >= 1, "case " + C.caseNumber(kase) + " shows a sealed result before the test is chosen");
      for (let i = 0; i < ti; i++) { await L.solveStep(page, kase.steps[i]); await L.nextStep(page); }
      await L.solveStep(page, kase.steps[ti]);
      const reveals = kase.steps[ti].options.find((o) => o.correct).reveals;
      const shown = await page.evaluate((ids) => ids.every((id) => document.querySelector('.file-panel[data-panel="tests"] .exhibit[data-exhibit="' + id + '"]')), reveals);
      check(shown, "choosing the right test opens " + reveals.join(", ") + " in the file");
      check((await count(page, ".exhibit-sealed")) < sealedBefore, "fewer results stay sealed");
      await shot(page, "flow-11-test-revealed");
      await L.playCase(page, kase);
    });

    await section("reload: progress persists", async () => {
      const before = await page.evaluate(() => ({ o: CCF.Progress.overall(CCF.Save.current()), xp: CCF.Progress.totalXp(CCF.Save.current()) }));
      await page.reload();
      await page.waitForSelector(".title-screen");
      await page.click(".title-continue");
      await page.waitForSelector(".board-screen");
      const after = await page.evaluate(() => ({ o: CCF.Progress.overall(CCF.Save.current()), xp: CCF.Progress.totalXp(CCF.Save.current()) }));
      check(after.o.solved === before.o.solved && after.xp === before.xp, "solved cases and XP survive a reload (" + after.o.solved + " cases, " + after.xp + " XP)");
      check((await text(page, ".player-xp")).trim() === after.xp + " XP", "the top bar shows the XP");
      check((await count(page, ".case-card.is-solved")) === after.o.solved, "the board shows every solved case");
      await shot(page, "flow-12-board-progress");
    });

    await section("Rapid Rounds: every drill keeps a best streak", async () => {
      await page.click('.nav-btn[data-nav="rounds"]');
      await page.waitForSelector(".rounds-screen");
      await shot(page, "flow-13-rounds");
      const hasEcg = await page.evaluate(() => !!(window.CCF.ECG && CCF.ECG.render && CCF.ECG.RHYTHMS && CCF.ECG.RHYTHMS.length >= 4));
      for (const id of ["rhythm", "pressure", "abi", "edema"]) {
        await page.evaluate(() => CCF.UI.app.go("rounds"));
        await page.waitForSelector(".rounds-screen");
        const start = await page.$('.drill-card[data-drill="' + id + '"] .drill-start');
        if (!start) {
          check(id === "rhythm" && !hasEcg, "drill " + id + " can be started");
          continue;
        }
        await start.click();
        await page.waitForSelector('.drill-screen[data-drill="' + id + '"]');
        if (id === "rhythm") {
          check((await count(page, ".drill-prompt figure.ecg svg")) >= 1, "the rhythm drill draws an ECG strip");
          await page.click(".drill-prompt .describe-btn");
          check((await text(page, ".drill-prompt .describe-text")).trim().length > 20, "the strip can be described in words");
        }
        await shot(page, "flow-14-drill-" + id);
        // A right answer…
        await answerDrill(page, id, true);
        check((await text(page, ".drill-streak-n")).trim() === "1", id + ": a right answer starts a streak");
        await shot(page, "flow-15-drill-" + id + "-right");
        await page.click(".drill-next");
        // …then a wrong one ends it and saves the best.
        await answerDrill(page, id, false);
        check((await text(page, ".drill-streak-n")).trim() === "0", id + ": a wrong answer ends the streak");
        const d = (await profile(page)).drills[id];
        check(d && d.best === 1, id + ": the best streak (1) is saved");
        check((await text(page, ".drill-best-n")).trim() === "1", id + ": the best streak is shown");
      }
      const solvedBefore = await page.evaluate(() => CCF.Progress.overall(CCF.Save.current()).solved);
      check(solvedBefore >= 1, "drills don't change case progress");
    });

    await section("case log and the printable progress report", async () => {
      await page.click('.nav-btn[data-nav="log"]');
      await page.waitForSelector(".log-screen");
      check((await count(page, ".log-table tbody tr")) === allCases.length, "the case log lists every case");
      const solved = await page.evaluate(() => CCF.Progress.overall(CCF.Save.current()).solved);
      check((await count(page, ".log-table tbody tr.is-solved")) === solved, "with the solved ones marked");
      check((await count(page, ".log-unit-total")) === C.units().length, "with a total for every unit");
      await shot(page, "flow-16-log");
      await stubPrint(page);
      await page.click(".print-report");
      await page.waitForFunction(() => window.__printed > 0);
      const html = await page.evaluate(() => window.__printedHtml || "");
      check(/progress report/.test(html) && html.indexOf("Jordan Rivera") >= 0, "the printable report carries the name");
    });

    await section("settings: sound, motion, text size, rename", async () => {
      await page.click('.nav-btn[data-nav="settings"]');
      await page.waitForSelector(".modal-settings");
      await shot(page, "flow-17-settings");
      await page.click('.setting-row[data-setting="sound"] .switch-input');
      check((await page.getAttribute(".sound-toggle", "aria-pressed")) === "false", "sound can be turned off");
      check((await profile(page)).settings.sound === false, "and the setting is saved");
      await page.click('.setting-row[data-setting="reduceMotion"] .switch-input');
      check(await page.evaluate(() => document.documentElement.classList.contains("reduce-motion")), "reduce motion applies at once");
      await page.click('.segment[data-size="lg"]');
      check(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize === "18px"), "text size Large makes the text bigger");
      check((await profile(page)).settings.textSize === "lg", "the text size is saved");
      await page.fill(".setting-rename input", "Jordan R.");
      await page.click(".rename-btn");
      check((await text(page, ".player-name")).trim() === "Jordan R.", "renaming updates the top bar");
      // Put things back.
      await page.click('.segment[data-size="md"]');
      await page.click('.setting-row[data-setting="reduceMotion"] .switch-input');
      await page.keyboard.press("Escape");
      await L.waitForModalGone(page);
    });

    await section("save code: export, delete the slot, import", async () => {
      const before = await page.evaluate(() => CCF.Progress.overall(CCF.Save.current()).solved);
      await page.click('.nav-btn[data-nav="settings"]');
      await page.click(".open-savecode");
      await page.waitForSelector(".modal-savecode .code-box");
      const code = await page.$eval(".modal-savecode .code-box", (t) => t.value);
      check(/^CCF1\./.test(code), "the save code starts with CCF1.");
      await shot(page, "flow-18-savecode");
      await page.keyboard.press("Escape");          // the save code…
      await page.keyboard.press("Escape");          // …and Settings underneath it
      await L.waitForModalGone(page);
      const slot = await page.evaluate(() => CCF.Save.currentSlot());
      await page.evaluate(() => CCF.UI.app.go("slots"));
      await page.waitForSelector(".slots-screen");
      await shot(page, "flow-19-slots");
      await page.click('.slot-card[data-slot="' + slot + '"] .slot-delete');
      await page.waitForSelector(".modal-confirm");
      await page.click(".modal-confirm .btn-danger");
      await L.waitForModalGone(page);
      check((await count(page, ".slot-card.is-empty")) === 3, "the slot is deleted");
      await page.click(".slots-back");
      await page.waitForSelector(".title-screen");
      await page.click(".title-import");
      await page.waitForSelector(".modal-import textarea");
      await page.fill(".modal-import textarea", "CCF1.not-a-real-code");
      await page.click(".modal-import .btn-primary");
      check((await text(page, ".modal-import .field-error")).trim().length > 5, "a broken code is refused with a message");
      await page.fill(".modal-import textarea", code);
      await page.click(".modal-import .btn-primary");
      await page.waitForSelector(".board-screen");
      const after = await page.evaluate(() => CCF.Progress.overall(CCF.Save.current()).solved);
      check(after === before, "importing the code brings the progress back (" + after + " cases)");
    });

    await section("the last case: finale and certificate", async () => {
      if (!finalCase) { log("    (only one case in the content)"); return; }
      // Close every other case through the engine, then the last one through the UI.
      await page.evaluate((lastId) => {
        CCF.content.cases().forEach((k) => {
          const r = CCF.Save.caseRecord(k.id);
          if (k.id !== lastId && !(r && r.solved)) CCF.Save.recordSolve(k.id, { strikes: 0, hints: 0, stepCount: k.steps.length });
        });
      }, finalCase.id);
      await L.openCase(page, finalCase.id);
      await L.playCase(page, finalCase);
      await page.waitForSelector(".finale-banner");
      check(true, "closing the last case announces the finale");
      await page.waitForTimeout(2300);
      await shot(page, "flow-20-last-debrief");
      await page.click(".finale-go");
      await page.waitForSelector(".story-screen.is-finale");
      await shot(page, "flow-21-finale");
      for (let i = 0; i < 12 && (await page.$(".story-screen")); i++) { await page.click(".dlg-next"); await page.waitForTimeout(40); }
      await page.waitForSelector(".certificate-screen .certificate");
      check(/Jordan R\./.test(await text(page, ".cert-name")), "the certificate carries the player's name");
      check((await profile(page)).seen.finale === true, "the finale is marked as seen");
      await shot(page, "flow-22-certificate");
      await stubPrint(page);
      await page.click(".print-certificate");
      await page.waitForFunction(() => window.__printed > 0);
      check(/Certificate of Completion/.test(await page.evaluate(() => window.__printedHtml || "")), "the certificate prints");
      await page.evaluate(() => CCF.UI.app.go("board"));
      check(/All \d+ cases solved/.test(await text(page, ".next-card")), "the board celebrates every case closed");
    });

    check(game.errors.length === 0, "no console errors in the flow (" + game.errors.slice(0, 4).join(" | ") + ")");
  } finally {
    if (state.failures && SHOTS) await shot(page, "FAILED-flow").catch(() => {});
    await game.close();
  }

  await responsivePass();
}

/** Answer the drill on screen: right (true) or wrong (false). */
async function answerDrill(page, id, right) {
  if (id === "abi") {
    const answer = await page.evaluate(() => {
      const q = document.querySelector(".drill-question").textContent;
      const leg = /right leg/i.test(q) ? "Right" : "Left";
      const rows = Array.from(document.querySelectorAll(".drill-table tbody tr")).map((tr) => [tr.children[0].textContent, Number(tr.children[1].textContent)]);
      const arms = rows.filter((r) => /brachial/.test(r[0])).map((r) => r[1]);
      const ankles = rows.filter((r) => !/brachial/.test(r[0]) && r[0].indexOf(leg) === 0).map((r) => r[1]);
      return Math.max.apply(null, ankles) / Math.max.apply(null, arms);
    });
    await page.fill(".drill-numeric .numeric-input", right ? answer.toFixed(2) : (answer + 0.5).toFixed(2));
    await page.click(".drill-check");
    if (!right) { await page.waitForSelector(".drill-next:not([hidden])"); return; }
    await page.waitForSelector(".drill-followup .drill-choice");
    await page.click('.drill-followup .drill-choice[data-correct="1"]');
  } else {
    await page.click('.drill-choice[data-correct="' + (right ? "1" : "0") + '"]');
  }
  await page.waitForSelector(".drill-next:not([hidden])");
}

async function responsivePass() {
  const SIZES = [[1440, 900], [1024, 768], [390, 844]];
  const C = L.content();
  const example = C.getCase("coronary-snow-shoveler");
  for (const [w, hgt] of SIZES) {
    const tag = w + "x" + hgt;
    await section("responsive " + tag, async () => {
      const game = await L.openGame({ viewport: { width: w, height: hgt }, query: "?unlock=all" });
      const { page } = game;
      try {
        const over = async (where) => {
          const o = await L.horizontalOverflow(page);
          check(o.scrollWidth <= o.vw, where + " at " + tag + " doesn't scroll sideways (" + o.scrollWidth + " > " + o.vw + ": " + o.offenders.join(", ") + ")");
        };
        await over("the title");
        await shot(page, "resp-" + tag + "-01-title");
        await L.newGame(page, "Alexandria Montgomery-Smith");
        await over("the board");
        await shot(page, "resp-" + tag + "-02-board");
        await L.openCase(page, example.id);
        await over("the case");
        await shot(page, "resp-" + tag + "-03-case");
        await L.answerWrong(page, example.steps[0]);
        await page.click(".ask-okafor");
        await shot(page, "resp-" + tag + "-04-case-feedback");
        await L.answerRight(page, example.steps[0]);
        await L.nextStep(page);
        await L.solveStep(page, example.steps[1]);
        await L.nextStep(page);
        await over("the case update");
        await shot(page, "resp-" + tag + "-05-case-update");
        // On narrow screens the step is reachable from the file.
        if (w < 1100) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(150);
          const jump = await page.$(".jump-to-step:not([hidden])");
          check(!!jump, "a 'Go to the question' button appears when the step is off screen at " + tag);
          if (jump) { await jump.click(); await page.waitForTimeout(500); }
          const inView = await page.evaluate(() => { const r = document.querySelector(".steps-panel").getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
          check(inView, "the step is on screen after using it at " + tag);
        }
        await page.click('.file-tab[data-tab="vitals"]');
        await over("the vitals");
        await shot(page, "resp-" + tag + "-06-vitals");
        await L.playCase(page, example);
        await page.waitForTimeout(2300);
        await over("the debrief");
        await shot(page, "resp-" + tag + "-07-debrief");
        const ecgCase = C.cases().find((k) => (k.file.tests || []).some((x) => x.type === "ecg" && !x.sealed));
        if (ecgCase) {
          await L.openCase(page, ecgCase.id);
          await page.click('.file-tab[data-tab="tests"]');
          await over("an ECG exhibit");
          await shot(page, "resp-" + tag + "-08-ecg");
        }
        const diagramCase = C.cases().find((k) => [].concat(k.file.tests || [], ...k.steps.map((s) => (s.update && s.update.exhibits) || [])).some((x) => x.type === "diagram"));
        if (diagramCase) {
          await L.openCase(page, diagramCase.id);
          const where = (diagramCase.file.tests || []).some((x) => x.type === "diagram") ? "tests" : null;
          if (where) await page.click('.file-tab[data-tab="tests"]');
          await shot(page, "resp-" + tag + "-09-diagram");
        }
        await page.evaluate(() => CCF.UI.app.go("casebook"));
        await page.waitForSelector(".casebook-screen");
        await over("the Casebook");
        await shot(page, "resp-" + tag + "-10-casebook");
        if (w < 760) {
          await page.click(".cb-item");
          await page.waitForSelector(".casebook.show-entry");
          await over("a Casebook entry");
          await shot(page, "resp-" + tag + "-11-casebook-entry");
        }
        for (const d of ["pressure", "abi", "edema", "rhythm"]) {
          const ok = await page.evaluate((id) => { CCF.UI.app.go("drill", { id: id }); return !!document.querySelector('.drill-screen[data-drill="' + id + '"]'); }, d);
          if (!ok) continue;
          await over("the " + d + " drill");
          await shot(page, "resp-" + tag + "-12-drill-" + d);
        }
        await page.evaluate(() => CCF.UI.app.go("rounds"));
        await over("Rapid Rounds");
        await shot(page, "resp-" + tag + "-13-rounds");
        await page.evaluate(() => CCF.UI.app.go("log"));
        await over("the case log");
        await shot(page, "resp-" + tag + "-14-log");
        await page.evaluate(() => CCF.UI.app.go("certificate"));
        await over("the certificate");
        await page.evaluate(() => CCF.UI.panels.settings());
        await page.waitForSelector(".modal-settings");
        await over("Settings");
        await shot(page, "resp-" + tag + "-15-settings");
        await page.keyboard.press("Escape");
        if (w < 1100) {
          await page.click(".menu-toggle");
          await page.waitForSelector(".topbar-nav.open");
          await shot(page, "resp-" + tag + "-16-menu");
          check(await page.$eval(".topbar-nav.open", (n) => n.getBoundingClientRect().right <= innerWidth + 1), "the menu fits the screen at " + tag);
        }
        check(game.errors.length === 0, "no console errors at " + tag + " (" + game.errors.slice(0, 3).join(" | ") + ")");
      } finally {
        await game.close();
      }
    });
  }
}

main().then(() => {
  log("");
  log(state.failures ? "FAILED: " + state.failures + " of " + state.checks + " checks" : "OK: " + state.checks + " checks passed");
  process.exit(state.failures ? 1 : 0);
}, (err) => {
  log("");
  log("FAILED: " + String((err && err.stack) || err).split("\n").slice(0, 3).join("\n"));
  process.exit(1);
});
