#!/usr/bin/env node
/*
 * Browser test of the player-facing game (Playwright + headless Chromium).
 *
 *   node tools/e2e/ui-flow.js                     # full flow + responsive pass
 *   node tools/e2e/ui-flow.js --shots /tmp/shots  # …and save screenshots there
 *   node tools/e2e/ui-flow.js --quick             # full flow at 1280×860 only
 *
 * Full flow (1280×860): title (painting not covered) → new game → prologue → map →
 * chapter (intro) → challenge → wrong cast (explanation shown, line highlighted,
 * aria-live) → hint → correct cast → "Spell Mastered!" → reload → progress persisted →
 * ten challenge visits leave no nodes or listeners behind → keyboard: Esc then Tab
 * leaves the editor → Practice Chamber → Grimoire (+ printable report on white paper,
 * margins included) → Settings (sound, motion, font size, rename, focus trap) →
 * Save Scroll: download file, export code, delete the slot, import the code back.
 * Responsive pass (1440×900, 1366×650, 1280×800, 1024×768, 800×700, 390×844): title
 * art, the gold button telling the chapter's story before its first spell, the verdict
 * in view right after a cast, a successful cast, and nothing overflowing horizontally.
 *
 * Needs the local Pyodide copy: bash tools/fetch_pyodide.sh
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { openGame, waitForPython } = require("./lib");

const args = process.argv.slice(2);
const SHOTS = args.indexOf("--shots") >= 0 ? path.resolve(args[args.indexOf("--shots") + 1]) : null;
const QUICK = args.indexOf("--quick") >= 0;
const SIZES = [[1920, 969], [1440, 900], [1366, 650], [1280, 800], [1024, 768], [800, 700], [390, 844]];

let failures = 0;
let checks = 0;

function log(msg) { process.stdout.write(msg + "\n"); }

function check(condition, message) {
  checks++;
  if (!condition) {
    failures++;
    log("    ✗ " + message);
  }
  return !!condition;
}

async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, name + ".png") });
}

async function step(page, name, fn) {
  log("  • " + name);
  try {
    await fn();
  } catch (err) {
    failures++;
    log("    ✗ " + name + " threw: " + String((err && err.message) || err).split("\n")[0]);
    if (SHOTS) await shot(page, "FAILED-" + name.replace(/[^a-z0-9]+/gi, "-")).catch(() => {});
    throw err;
  }
}

/** Replace the editor's code (CodeMirror or the plain textarea). */
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

async function cast(page, status) {
  await page.evaluate(() => document.querySelector(".btn-cast").click());
  await page.waitForSelector('.results[data-status="' + status + '"]', { timeout: 30000 });
}

async function waitForModalGone(page) {
  await page.waitForFunction(() => !document.querySelector(".modal-overlay"), null, { timeout: 5000 });
}

async function newGame(page, name) {
  await page.waitForSelector(".title-screen");
  await page.click("text=Begin your apprenticeship");
  await page.waitForSelector(".modal-prompt input");
  await page.fill(".modal-prompt input", name);
  await page.keyboard.press("Enter");
  await page.waitForSelector(".story-screen");
}

/**
 * Pictures must be icons, not emoji: no pictorial emoji (Extended_Pictographic) in visible
 * text — the typographic marks ★ ☆ ✓ ✗ ✕ → ← ▶ are allowed, and code is ignored — and some
 * visible svg.gi icons.
 */
async function pictures(page) {
  return page.evaluate(() => {
    const ALLOWED = new Set(["★", "☆", "✓", "✗", "✕", "→", "←", "▶"]);
    const roots = [document.querySelector(".topbar:not([hidden])"), document.getElementById("main"),
      document.getElementById("modal-root"), document.getElementById("toast-root")].filter(Boolean);
    const shown = (el) => el && (el.checkVisibility ? el.checkVisibility({ visibilityProperty: true }) : el.getClientRects().length > 0);
    const emoji = new Set();
    let icons = 0;
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const el = n.parentElement;
        if (!el || el.closest(".CodeMirror, pre, code, textarea, .sr-only") || !shown(el)) continue;
        for (const m of n.textContent.matchAll(/\p{Extended_Pictographic}/gu)) if (!ALLOWED.has(m[0])) emoji.add(m[0]);
      }
      root.querySelectorAll("svg.gi").forEach((svg) => { if (shown(svg)) icons++; });
    }
    return { emoji: [...emoji], icons };
  });
}

async function checkPictures(page, where) {
  const r = await pictures(page);
  check(r.emoji.length === 0, where + " shows no emoji (" + r.emoji.join(" ") + ")");
  check(r.icons > 0, where + " draws its pictures as icons (" + r.icons + ")");
}

/** Click through a story dialog (chapter intro) until it closes. */
async function closeStory(page) {
  for (let i = 0; i < 12 && (await page.$(".modal-dialogue")); i++) {
    const next = await page.$(".modal-dialogue .dlg-next");
    if (next) await next.click().catch(() => {});
    await page.waitForTimeout(200);
  }
  await waitForModalGone(page);
}

/** A rank-up moment may follow "Spell Mastered!": acknowledge it. */
async function passRankUp(page) {
  const m = await page.waitForSelector(".modal-rankup", { timeout: 1200 }).catch(() => null);
  if (m) await page.click(".modal-rankup >> text=Onward!");
}

/**
 * Where the title painting's important parts are on screen, and whether the panel covers
 * them. Regions are fractions of the 1536×1024 painting: painted title + tagline, the
 * witch's face and the top of her hat. In portrait the painting is replaced by a crop
 * without painted text.
 */
async function titleArt(page) {
  return page.evaluate(() => {
    const img = document.querySelector(".title-img");
    const panel = document.querySelector(".title-panel").getBoundingClientRect();
    const out = { vw: innerWidth, vh: innerHeight, portrait: !img || getComputedStyle(img).display === "none" };
    if (out.portrait) {
      const banner = document.querySelector(".title-banner");
      const h1 = document.querySelector(".title-h1").getBoundingClientRect();
      out.bannerArt = /url\(/.test(getComputedStyle(banner).backgroundImage) && banner.getBoundingClientRect().height > 100;
      out.h1Visible = h1.width > 100 && h1.top >= 0 && h1.bottom <= innerHeight;
      return out;
    }
    const r = img.getBoundingClientRect();
    let x = r.left, y = r.top, w = r.width, hgt = r.height;
    if (getComputedStyle(img).objectFit === "cover") {
      const scale = Math.max(r.width / 1536, r.height / 1024);
      const pos = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
      w = 1536 * scale; hgt = 1024 * scale;
      x = r.left + (r.width - w) * pos[0];
      y = r.top + (r.height - hgt) * pos[1];
    }
    const box = (x0, y0, x1, y1) => ({ left: x + w * x0, top: y + hgt * y0, right: x + w * x1, bottom: y + hgt * y1 });
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const title = box(0.545, 0.25, 0.985, 0.585), face = box(0.33, 0.17, 0.46, 0.42);
    out.loaded = img.complete && img.naturalWidth > 0;
    out.titleInView = title.left >= -1 && title.top >= -1 && title.right <= innerWidth + 1 && title.bottom <= innerHeight + 1;
    out.coversTitle = hit(panel, title);
    out.coversFace = hit(panel, face);
    out.hatInView = y + hgt * 0.04 >= -1;   // the hat's crown is 4.4% down the painting
    return out;
  });
}

async function checkTitleArt(page, tag) {
  const art = await titleArt(page);
  if (art.portrait) {
    check(art.bannerArt, "the portrait title shows the painting as a banner at " + tag);
    check(art.h1Visible, "the portrait title shows the game's name in text at " + tag);
  } else {
    check(art.loaded, "the title painting loads at " + tag);
    check(art.titleInView, "the painted title is not cropped at " + tag);
    check(art.hatInView, "the witch's hat is not cut off at the top at " + tag);
    check(!art.coversTitle && !art.coversFace, "the buttons don't cover the painted title or the witch's face at " + tag + " " + JSON.stringify(art));
  }
  const begin = await page.$eval(".title-actions .btn", (b) => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
  check(begin, "the first title button is in view without scrolling at " + tag);
}

async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const offenders = [];
    document.querySelectorAll("#app *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || r.right <= de.clientWidth + 1) return;
      if (el.closest(".CodeMirror, pre, .trail-svg, .fx-layer, .plain-editor")) return;
      offenders.push((el.getAttribute("class") || el.tagName) + " (right " + Math.round(r.right) + "px)");
    });
    return { scroll: de.scrollWidth - de.clientWidth, offenders: offenders.slice(0, 5) };
  });
}

// ---------------------------------------------------------------------------
// Full flow
// ---------------------------------------------------------------------------

async function fullFlow() {
  log("Full flow at 1280×860");
  const game = await openGame({ viewport: { width: 1280, height: 860 }, config: { saveSlots: 3 } });
  const { page } = game;
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  // A print() that behaves like a browser's (fires "beforeprint") without opening a dialog.
  const fakePrint = () => { window.print = () => { window.__printCalls = (window.__printCalls || 0) + 1; window.dispatchEvent(new Event("beforeprint")); }; };
  await page.addInitScript(fakePrint);
  await page.evaluate(fakePrint);
  const prologueLength = await page.evaluate(() => (SS.content.story.prologue || []).length);
  const chapterCount = await page.evaluate(() => SS.content.chapters.length);

  try {
    await step(page, "title screen", async () => {
      await page.waitForSelector(".title-screen .title-h1");
      await page.waitForFunction(() => { const i = document.querySelector(".title-img"); return i && i.complete; });
      check(await page.isVisible(".title-screen .engine-chip"), "title shows the Python engine status");
      check((await page.title()) === "Pyromancer", "document title names the game (" + (await page.title()) + ")");
      check((await page.textContent(".title-h1")).trim() === "Pyromancer", "the title's heading is Pyromancer");
      check(/Master Python\. Unleash the Magic\./.test(await page.textContent(".title-screen")), "the tagline is in the page");
      check(await page.isVisible("text=I have a Save Scroll (save code or file)"), "a new player can bring a Save Scroll");
      await checkTitleArt(page, "1280x860");
      await checkPictures(page, "the title screen");
      await shot(page, "flow-01-title");
    });

    await step(page, "new game and prologue", async () => {
      await newGame(page, "Morgana");
      const panels = await page.$$eval(".dlg-dot", (d) => d.length);
      check(panels === prologueLength, "prologue shows every story panel (" + panels + " of " + prologueLength + ")");
      await shot(page, "flow-02-prologue");
      for (let i = 0; i < prologueLength; i++) await page.click(".story-screen .dlg-next");
      await page.waitForSelector(".map-screen");
    });

    await step(page, "map", async () => {
      const stations = await page.$$(".trail-list .station");
      check(stations.length === chapterCount + 1, "map shows every chapter plus the sanctum");
      check(await page.$eval(".station >> nth=0", (el) => el.classList.contains("is-current")), "chapter 1 is marked as the current area");
      const lockedSecond = await page.$eval(".trail-list .station:nth-child(2) .station-btn", (b) => b.getAttribute("aria-disabled"));
      check(lockedSecond === "true", "chapter 2 starts locked");
      check(await page.$eval(".trail-glow", (p) => (p.getAttribute("d") || "").length > 0), "the trail path is drawn");
      check(await page.isVisible(".topbar .wizard-chip"), "top bar shows the wizard");
      await checkPictures(page, "the map");
      check((await page.$$(".medallion-face svg.gi")).length === chapterCount + 1, "every map station shows its icon (no paintings in this build)");
      await shot(page, "flow-03-map");
      await page.click(".trail-list .station:nth-child(1) .station-btn");
      await page.waitForSelector(".chapter-screen");
    });

    await step(page, "chapter intro and challenge list", async () => {
      await page.waitForSelector(".modal-dialogue .dlg-next", { timeout: 5000 });
      await checkPictures(page, "the chapter's story dialog");
      await shot(page, "flow-04-chapter-intro");
      await page.click(".modal-dialogue .dlg-next");
      await waitForModalGone(page);
      await checkPictures(page, "the chapter screen");
      const cards = await page.$$(".challenge-card");
      const total = await page.evaluate(() => SS.content.chapters[0].challenges.length);
      check(cards.length === total, "chapter lists all its challenges");
      check(await page.$eval(".challenge-card >> nth=1", (c) => c.classList.contains("status-locked")), "challenge 2 is locked until challenge 1 is done");
      await page.click(".challenge-card >> nth=0");
      await page.waitForSelector(".challenge-screen");
      await waitForPython(page, 90000);
      await page.waitForFunction(() => document.querySelector(".btn-cast").getAttribute("aria-disabled") === "false");
    });

    await step(page, "first-time coach note", async () => {
      check(await page.isVisible(".coach"), "the very first challenge shows the how-to-cast note");
      check(await page.isVisible(".lesson[open]"), "the Spell Scroll is open on a first visit");
      await checkPictures(page, "the challenge screen");
      await shot(page, "flow-05-challenge");
      await page.click(".coach-ok");
      check(!(await page.$(".coach")), "the coach note can be dismissed");
    });

    await step(page, "wrong cast: explanation, traceback and highlighted line", async () => {
      // Type for real (the editor may be CodeMirror or the textarea fallback).
      await page.click(".editor-surface");
      await page.keyboard.press("Control+A");
      await page.keyboard.type('prnt("Hello world")');
      check((await getCode(page)).trim() === 'prnt("Hello world")', "typing into the editor works");
      await page.keyboard.press("Control+Enter");
      await page.waitForSelector('.results[data-status="error"]', { timeout: 30000 });
      const verdict = await page.textContent(".results .verdict");
      check(/NameError/.test(verdict), "the verdict names the error type");
      check(/Did you mean/.test(await page.textContent(".results .error-friendly")), "the friendly explanation is shown");
      check(/NameError: name 'prnt' is not defined/.test(await page.textContent(".results .traceback-text")), "Python's real traceback is shown");
      const marked = await page.evaluate(() => document.querySelectorAll(".cm-ss-line-error, .plain-mark.error").length);
      check(marked === 1, "the error line is highlighted in the editor");
      await page.waitForFunction(() => /error/i.test(document.getElementById("sr-live").textContent));
      check(true, "the result is announced through aria-live");
      await checkPictures(page, "an error result");
      await shot(page, "flow-06-error");
      // The line link jumps to the editor.
      await page.click(".results .line-link");
      check(await page.evaluate(() => !!document.activeElement.closest(".editor-surface")), "the line link focuses the editor");
    });

    await step(page, "failed trial", async () => {
      await setCode(page, 'print("hello world")\n');
      await cast(page, "failed");
      check(/capital/i.test(await page.textContent(".results .first-fail")), "the first failed trial's message is shown");
      check((await page.$$(".results .trial.pass")).length >= 1, "passing trials are listed with ✓");
      await shot(page, "flow-07-failed");
    });

    await step(page, "hint", async () => {
      const before = await page.$$eval(".max-stars .star.on", (s) => s.length);
      await page.click(".hint-btn");
      await page.waitForSelector(".hint");
      const after = await page.$$eval(".max-stars .star.on", (s) => s.length);
      check(before === 3 && after === 2, "the first hint lowers the available stars from 3 to 2");
      check(/Pip whispers/.test(await page.textContent(".hint")), "the hint is shown as Pip's whisper");
    });

    await step(page, "correct cast and Spell Mastered dialog", async () => {
      await setCode(page, 'print("Hello world")\n');
      await page.evaluate(() => document.querySelector(".btn-cast").click());
      await page.waitForSelector(".modal-success", { timeout: 30000 });
      await page.waitForTimeout(1500);
      const stars = await page.$$eval(".modal-success .success-star.on", (s) => s.length);
      check(stars === 2, "success dialog shows 2 stars after one hint (got " + stars + ")");
      check(/\+7 XP/.test(await page.textContent(".modal-success")), "success dialog shows the XP gained");
      check(await page.isVisible(".modal-success >> text=Next spell"), "success dialog offers the next spell");
      await checkPictures(page, "the Spell Mastered dialog");
      await shot(page, "flow-08-success");
      await page.click(".modal-success >> text=Stay here");
      await waitForModalGone(page);
      check(/Best/.test(await page.textContent(".best-stars")), "the challenge header shows the best stars");
      check((await page.textContent(".topbar .wizard-xp")).indexOf("7 XP") === 0, "the top bar shows the new XP");
    });

    await step(page, "reload: progress persists", async () => {
      await page.waitForTimeout(300);
      await page.reload();
      await page.waitForSelector(".title-screen");
      check(/Morgana/.test(await page.textContent(".btn-continue")), "title offers Continue as Morgana");
      await page.click(".btn-continue");
      await page.waitForSelector(".map-screen");
      check(/1 \/ 7 spells/.test(await page.textContent(".trail-list .station:nth-child(1)")), "map shows chapter 1 progress after reload");
      await page.click(".trail-list .station:nth-child(1) .station-btn");
      await page.waitForSelector(".chapter-screen");
      check(await page.$eval(".challenge-card >> nth=0", (c) => c.classList.contains("status-done")), "challenge 1 is still mastered");
      check(!(await page.$eval(".challenge-card >> nth=1", (c) => c.classList.contains("status-locked"))), "challenge 2 is now unlocked");
      await page.click(".challenge-card >> nth=0");
      await page.waitForSelector(".challenge-screen");
      check((await getCode(page)).indexOf('print("Hello world")') >= 0, "the editor reopens with the saved spell");
    });

    await step(page, "memory: ten challenge visits leave nothing behind", async () => {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Performance.enable");
      const ids = await page.evaluate(() => SS.content.chapters[0].challenges.slice(0, 2).map((c) => c.id));
      // waitForFunction, not waitForSelector: element handles would keep old screens alive themselves.
      const visit = async (n) => {
        for (let i = 0; i < n; i++) {
          await page.evaluate((id) => SS.UI.app.go("challenge", { id }), ids[i % 2]);
          await page.waitForFunction(() => !!document.querySelector(".challenge-screen .editor-surface .CodeMirror, .challenge-screen .editor-surface .plain-input"));
          await page.waitForTimeout(120);
          await page.evaluate(() => SS.UI.app.go("map"));
          await page.waitForFunction(() => !!document.querySelector(".map-screen"));
        }
      };
      const measure = async () => {
        await page.waitForTimeout(1500);
        await cdp.send("HeapProfiler.collectGarbage");
        await page.waitForTimeout(150);
        await cdp.send("HeapProfiler.collectGarbage");
        const { metrics } = await cdp.send("Performance.getMetrics");
        const m = {};
        metrics.forEach((x) => { m[x.name] = x.value; });
        return { nodes: m.Nodes, listeners: m.JSEventListeners };
      };
      await visit(2);
      const before = await measure();
      await visit(10);
      const after = await measure();
      const grew = { nodes: after.nodes - before.nodes, listeners: after.listeners - before.listeners };
      check(grew.nodes < 150 && grew.listeners < 20, "DOM nodes and event listeners stay flat over 10 challenge visits (" + JSON.stringify({ before, after }) + ")");
      await cdp.detach();
      await page.evaluate((id) => SS.UI.app.go("challenge", { id }), ids[0]);
      await page.waitForSelector(".challenge-screen");
    });

    await step(page, "keyboard: Esc then Tab leaves the editor", async () => {
      await page.click(".editor-surface");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => !!document.activeElement.closest(".editor-surface"));
      check(!inside, "Esc then Tab moves focus out of the editor");
      await page.click(".editor-surface");
      const before = await getCode(page);
      await page.keyboard.press("End");
      await page.keyboard.press("Tab");
      check((await getCode(page)).length > before.length, "Tab inside the editor indents instead of leaving");
    });

    await step(page, "Practice Chamber", async () => {
      await page.click('.tool-btn[data-tool="practice"]');
      await page.waitForSelector(".practice-screen");
      await setCode(page, 'name = input("Name? ")\nprint(f"Welcome, {name}!")\n');
      await page.fill(".inputs-box", "Ada");
      await page.click(".practice-screen .btn-cast");
      await page.waitForSelector('.practice-screen .results[data-status="ran"]', { timeout: 30000 });
      check(/Welcome, Ada!/.test(await page.textContent(".practice-screen .pool-output")), "practice runs code with input()");
      await checkPictures(page, "the Practice Chamber");
      await shot(page, "flow-09-practice");
    });

    await step(page, "Grimoire and Progress Report", async () => {
      await page.click('.tool-btn[data-tool="grimoire"]');
      await page.waitForSelector(".grimoire-screen");
      check(/1 \/ /.test(await page.textContent(".stat-tiles")), "the Grimoire shows the number of spells mastered");
      await checkPictures(page, "the Grimoire");
      await page.click(".spell-row.done .spell-code summary");
      check(/Hello world/.test(await page.textContent(".spell-row.done .code-block")), "the Grimoire shows the player's spell");
      await page.click("text=Print Progress Report");
      check((await page.evaluate(() => window.__printCalls || 0)) === 1, "Print Progress Report opens the print dialog");
      check(/Progress Report/.test(await page.textContent("#print-root")), "the printable report is prepared");
      check(/Morgana/.test(await page.textContent("#print-root")), "the report names the wizard");
      check(/Pyromancer/.test(await page.textContent("#print-root")), "the report names the game");
      await page.waitForTimeout(450);
      check(!(await page.$("#toast-root .toast")), "no “printing is blocked” message when printing works");
      await page.emulateMedia({ media: "print" });
      const printed = await page.evaluate(() => {
        const cs = (el) => getComputedStyle(el);
        return {
          html: cs(document.documentElement).backgroundColor, scheme: cs(document.documentElement).colorScheme,
          body: cs(document.body).backgroundColor, app: cs(document.getElementById("app")).display,
          report: cs(document.getElementById("print-root")).display
        };
      });
      check(printed.html === "rgb(255, 255, 255)" && /light/.test(printed.scheme) && printed.body === "rgb(255, 255, 255)",
        "the report prints on white paper, margins included (" + JSON.stringify(printed) + ")");
      check(printed.app === "none" && printed.report === "block", "only the report is printed");
      await page.emulateMedia({ media: "screen" });
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      check(!(await page.evaluate(() => document.documentElement.classList.contains("print-mode"))), "the game returns to normal after printing");
      await shot(page, "flow-10-grimoire");
    });

    await step(page, "Settings", async () => {
      await page.click('.tool-btn[data-tool="settings"]');
      await page.waitForSelector(".modal-settings");
      await checkPictures(page, "the Settings dialog");
      await page.click(".modal-settings .about summary");
      check(/game-icons\.net/.test(await page.textContent(".modal-settings .credits")), "the credits name the icon set (CC BY 3.0)");
      await shot(page, "flow-11-settings");
      await page.click(".modal-settings .setting-row:has-text('Sound effects') .switch-input");
      check((await page.getAttribute(".topbar .sound-toggle", "aria-pressed")) === "false", "turning sound off updates the top bar toggle");
      await page.click(".modal-settings .setting-row:has-text('Reduce motion') .switch-input");
      check(await page.evaluate(() => document.documentElement.classList.contains("reduce-motion")), "reduce motion applies immediately");
      await page.click(".modal-settings .setting-row:has-text('Reduce motion') .switch-input");
      await page.click('.modal-settings [aria-label="Bigger text"]');
      check((await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--editor-font-size").trim())) === "16px", "editor font size can be changed");
      await page.fill(".modal-settings .rename-field input", "Morgana the Wise");
      await page.click(".modal-settings .rename-field button");
      check((await page.textContent(".topbar .wizard-name")) === "Morgana the Wise", "renaming updates the top bar");
      for (let i = 0; i < 25; i++) {
        await page.keyboard.press("Tab");
        if (!(await page.evaluate(() => !!document.activeElement.closest(".modal")))) { check(false, "focus escaped the Settings dialog"); break; }
      }
      await page.keyboard.press("Escape");
      await waitForModalGone(page);
      check(await page.evaluate(() => document.activeElement && document.activeElement.dataset.tool === "settings"), "closing Settings returns focus to its button");
      await page.waitForTimeout(50);
      check((await page.textContent(".grimoire-name")) === "Morgana the Wise", "the Grimoire shows the new name after Settings closes");
      await page.click(".topbar .sound-toggle");
      check((await page.getAttribute(".topbar .sound-toggle", "aria-pressed")) === "true", "the top bar toggle turns sound back on");
    });

    await step(page, "Save Scroll: download, export code, delete, import", async () => {
      await page.click('.tool-btn[data-tool="savescroll"]');
      await page.waitForSelector(".modal-savescroll");
      const code = await page.inputValue(".modal-savescroll textarea[readonly]");
      check(/^PYRO1\./.test(code), "the Save Scroll shows an export code (" + code.slice(0, 8) + "…)");
      await checkPictures(page, "the Save Scroll dialog");
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 10000 }),
        page.click(".modal-savescroll >> text=Download save file")
      ]);
      const file = path.join(os.tmpdir(), "ss-ui-flow-save-" + process.pid + ".json");
      await download.saveAs(file);
      const saved = JSON.parse(fs.readFileSync(file, "utf8"));
      fs.unlinkSync(file);
      check(saved.profile && saved.profile.wizardName === "Morgana the Wise", "the downloaded save file holds the profile");
      await shot(page, "flow-12-savescroll");
      await page.keyboard.press("Escape");
      await waitForModalGone(page);
      // Delete the slot, then bring the wizard back from the code.
      await page.evaluate(() => SS.UI.app.go("slots"));
      await page.waitForSelector(".slots-screen");
      await page.click(".slot-card.filled >> text=Delete");
      await page.click(".modal-confirm >> text=Delete forever");
      await page.waitForFunction(() => !document.querySelector(".slot-card.filled"));
      check(true, "the save slot can be deleted (with confirmation)");
      await page.click("text=Import a Save Scroll");
      await page.waitForSelector(".modal-savescroll");
      await page.fill(".modal-savescroll textarea:not([readonly])", code);
      await page.click(".modal-savescroll >> text=Import save code");
      await page.waitForSelector(".map-screen", { timeout: 10000 });
      check(/1 \/ 7 spells/.test(await page.textContent(".trail-list .station:nth-child(1)")), "importing the code restores the progress");
      check((await page.textContent(".topbar .wizard-name")) === "Morgana the Wise", "importing restores the wizard's name");
    });

    const unexpected = game.errors.filter((e) => !/favicon/i.test(e));
    check(unexpected.length === 0, "no console errors (" + unexpected.join(" | ") + ")");
  } finally {
    await game.close();
  }
}

// ---------------------------------------------------------------------------
// Responsive pass
// ---------------------------------------------------------------------------

async function responsive(width, height) {
  log("Responsive pass at " + width + "×" + height);
  const game = await openGame({ viewport: { width, height } });
  const { page } = game;
  const tag = width + "x" + height;
  const noOverflow = async (where) => {
    const o = await horizontalOverflow(page);
    check(o.scroll <= 0 && !o.offenders.length, where + " fits without horizontal scrolling at " + tag + (o.offenders.length ? ": " + o.offenders.join(", ") : ""));
  };
  try {
    await step(page, "title, prologue and map", async () => {
      await page.waitForSelector(".title-screen");
      await page.waitForFunction(() => { const i = document.querySelector(".title-img"); return !i || getComputedStyle(i).display === "none" || i.complete; });
      await checkTitleArt(page, tag);
      await noOverflow("title");
      await shot(page, tag + "-01-title");
      await newGame(page, "Tess");
      await noOverflow("prologue");
      await page.click(".dlg-skip");
      await page.waitForSelector(".map-screen");
      await noOverflow("map");
      await shot(page, tag + "-02-map");
    });
    await step(page, "challenge", async () => {
      check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("map-continue")), "the map puts focus on its Begin button at " + tag);
      await page.click(".map-continue");
      await page.waitForSelector(".challenge-screen");
      await page.waitForSelector(".modal-dialogue", { timeout: 5000 }).catch(() => null);
      const intro = await page.$(".modal-dialogue .dlg-title");
      check(!!intro && /Chapter/i.test(await intro.textContent()), "the gold button tells the chapter's story before its first spell at " + tag);
      await shot(page, tag + "-03-intro");
      await closeStory(page);
      await waitForPython(page, 90000);
      await page.waitForFunction(() => document.querySelector(".btn-cast").getAttribute("aria-disabled") === "false");
      const editorHeight = await page.$eval(".editor-surface", (e) => e.getBoundingClientRect().height);
      check(editorHeight >= 240, "the editor is at least 240px tall at " + tag + " (" + Math.round(editorHeight) + "px)");
      await noOverflow("challenge");
      await shot(page, tag + "-04-challenge");
      await setCode(page, 'message = "Hello world"\nprnt(message)\n');
      await cast(page, "error");
      const inView = () => {
        const head = document.querySelector(".results .verdict .verdict-headline");
        if (!head) return false;
        const r = head.getBoundingClientRect();
        const bar = document.querySelector(".topbar");
        const barBottom = bar && getComputedStyle(bar).position === "sticky" ? bar.getBoundingClientRect().bottom : 0;
        const at = document.elementFromPoint(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2);
        return r.top >= barBottom - 1 && r.bottom <= innerHeight && !!at && !!at.closest(".verdict");
      };
      const seen = await page.waitForFunction(inView, null, { timeout: 3000 }).then(() => true).catch(() => false);
      check(seen, "the verdict is in view right after the cast at " + tag);
      await noOverflow("error result");
      await shot(page, tag + "-05-error");
      await setCode(page, 'print("Hello world")\n');
      await page.evaluate(() => document.querySelector(".btn-cast").click());
      await page.waitForSelector(".modal-success", { timeout: 30000 });
      await page.waitForTimeout(1300);
      await shot(page, tag + "-06-success");
      await page.click(".modal-success >> text=Map");
      await passRankUp(page);
      await page.waitForSelector(".map-screen");
    });
    await step(page, "Grimoire and Practice Chamber", async () => {
      await page.evaluate(() => SS.UI.app.go("grimoire"));
      await noOverflow("grimoire");
      await shot(page, tag + "-07-grimoire");
      await page.evaluate(() => SS.UI.app.go("practice"));
      await noOverflow("practice");
      await shot(page, tag + "-08-practice");
    });
    check(game.errors.length === 0, "no console errors at " + tag + " (" + game.errors.join(" | ") + ")");
  } finally {
    await game.close();
  }
}

(async () => {
  const started = Date.now();
  try {
    await fullFlow();
  } catch (err) {
    log("  (full flow stopped early)");
  }
  if (!QUICK) {
    for (const [w, h] of SIZES) {
      try { await responsive(w, h); } catch (err) { log("  (responsive pass stopped early)"); }
    }
  }
  log((failures ? "FAILED: " + failures + " problem(s)" : "OK") + " — " + checks + " checks in " + Math.round((Date.now() - started) / 1000) + " s" +
    (SHOTS ? " — screenshots in " + SHOTS : ""));
  process.exit(failures ? 1 : 0);
})();
