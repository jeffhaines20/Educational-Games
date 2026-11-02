/*
 * Shared helpers for the browser tests (Playwright + headless Chromium).
 *
 *   const L = require("./lib");
 *   const game = await L.openGame();                              // http://127.0.0.1:<port>/
 *   const game = await L.openGame({ file: true });                // file:///…/index.html
 *   const game = await L.openGame({ query: "?unlock=all", viewport: { width: 390, height: 844 } });
 *   await L.newGame(game.page, "Jordan");                         // title → name → intro → board
 *   await L.solveStep(game.page, step, { wrong: true, hint: true }); // answers derived from the content
 *   await game.close();
 *
 * Correct answers come from the content itself (tools/validate_content.js → loadContent()), so
 * the tests follow whatever cases exist. game.errors collects console errors and page errors.
 */
"use strict";
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const GAME = path.resolve(__dirname, "..", "..");
let serverModule = null;
try { serverModule = require("../dev_server.js"); } catch (e) { serverModule = null; }

/** A minimal static server, used only if tools/dev_server.js is missing. */
function fallbackStart() {
  const http = require("http");
  const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".json": "application/json" };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(String(req.url || "/").split(/[?#]/)[0]);
      let file = path.normalize(path.join(GAME, url));
      if (!file.startsWith(GAME)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end("not found"); }
        res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

async function startServer() {
  if (serverModule && serverModule.start) return serverModule.start(0);
  return fallbackStart();
}

let contentCache = null;
/** The registered content, loaded in index.html's order (exactly as the browser does). */
function content() {
  if (contentCache) return contentCache;
  const { loadContent } = require("../validate_content.js");
  contentCache = loadContent().content;
  return contentCache;
}

/**
 * Open the game. options: { file, query, viewport, config (window.CCF_CONFIG), init (init script),
 * goto: false, blockStorage, reducedMotion, path, routes: [{ url, handler }] }
 */
async function openGame(options = {}) {
  const { server, port } = await startServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 900 },
    reducedMotion: options.reducedMotion ? "reduce" : "no-preference",
    acceptDownloads: true
  });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (err) => errors.push("pageerror: " + String((err && err.stack) || err)));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push("console: " + msg.text()); });
  page.on("request", (req) => requests.push(req.url()));
  if (options.config) await page.addInitScript((cfg) => { window.CCF_CONFIG = Object.assign({}, cfg, window.CCF_CONFIG || {}); }, options.config);
  if (options.blockStorage) {
    await page.addInitScript(() => {
      const thrower = { get() { throw new DOMException("The operation is insecure.", "SecurityError"); } };
      try { Object.defineProperty(window, "localStorage", thrower); } catch (e) { /* ignore */ }
      try { Object.defineProperty(window, "sessionStorage", thrower); } catch (e) { /* ignore */ }
    });
  }
  if (options.init) await page.addInitScript(options.init);
  for (const r of options.routes || []) await page.route(r.url, r.handler);
  const url = options.file
    ? "file://" + path.join(GAME, options.path || "index.html") + (options.query || "")
    : "http://127.0.0.1:" + port + "/" + (options.path || "") + (options.query || "");
  if (options.goto !== false) {
    await page.goto(url);
    await page.waitForSelector(".title-screen, .board-screen, .view-fatal", { timeout: 15000 });
  }
  async function close() {
    await browser.close().catch(() => {});
    server.close();
  }
  return { browser, context, page, port, url, errors, requests, close };
}

// ------------------------------------------------------------------------------------------
// Flows
// ------------------------------------------------------------------------------------------

async function waitForModalGone(page) {
  await page.waitForFunction(() => !document.querySelector(".modal-overlay"), null, { timeout: 5000 });
}

/** Title → "Begin" → name → (intro, skipped or clicked through) → board. */
async function newGame(page, name, opts = {}) {
  await page.waitForSelector(".title-screen");
  const begin = await page.$(".title-begin");
  if (!begin) throw new Error("no Begin button on the title screen");
  await begin.click();
  await page.waitForSelector(".modal-prompt input");
  if (name !== null) await page.fill(".modal-prompt input", name);
  await page.keyboard.press("Enter");
  await page.waitForSelector(".story-screen, .board-screen");
  if (await page.$(".story-screen")) {
    if (opts.readIntro) {
      for (let i = 0; i < 20 && (await page.$(".story-screen")); i++) {
        await page.click(".dlg-next");
        await page.waitForTimeout(60);
      }
    } else {
      await page.click(".dlg-skip");
    }
  }
  await page.waitForSelector(".board-screen");
}

async function openCase(page, id) {
  await page.evaluate((cid) => CCF.UI.app.go("case", { id: cid }), id);
  await page.waitForSelector('.case-screen[data-case="' + id + '"]');
}

/** The index of the step on screen (from the step heading "Step 2 of 4"). */
async function currentStepIndex(page) {
  const text = await page.textContent("#step-heading");
  const m = /Step\s+(\d+)/.exec(text || "");
  return m ? Number(m[1]) - 1 : -1;
}

/** Click the labels for these ORIGINAL option indices (single / test / multi). */
async function pickOptions(page, indices) {
  for (const i of indices) await page.click('.answer-choices .choice[data-index="' + i + '"]');
}

async function check(page) {
  await page.click(".check-answer");
}

/** Give a deliberately wrong answer for this step (one strike). */
async function answerWrong(page, step) {
  if (step.type === "single" || step.type === "test") {
    const wrong = step.options.findIndex((o) => !o.correct);
    await pickOptions(page, [wrong]);
  } else if (step.type === "multi") {
    const wrong = step.options.findIndex((o) => !o.correct);
    await pickOptions(page, [wrong]);
  } else if (step.type === "numeric") {
    await page.fill(".numeric-input", String(step.answer + Math.max(1000, Math.abs(step.answer) * 10)));
  } else if (step.type === "classify") {
    const allRight = step.items.every((it) => it.category === 0);
    const cat = allRight ? 1 : 0;
    for (let i = 0; i < step.items.length; i++) {
      await page.click('.sort-item[data-index="' + i + '"] .sort-option:nth-of-type(' + (cat + 1) + ")");
    }
  } else if (step.type === "order") {
    // The initial order is never the right one.
  }
  await check(page);
  await page.waitForSelector(".feedback-wrong");
}

/** Put the order widget into the correct order with its up buttons. */
async function sortOrder(page, n) {
  for (let target = 0; target < n; target++) {
    for (let guard = 0; guard < n; guard++) {
      const pos = await page.evaluate((t) => {
        const items = Array.from(document.querySelectorAll(".order-list .order-item"));
        return items.findIndex((li) => li.getAttribute("data-index") === String(t));
      }, target);
      if (pos <= target) break;
      await page.click(".order-list .order-item:nth-child(" + (pos + 1) + ") .order-up");
    }
  }
}

/** Give the correct answer for this step. */
async function answerRight(page, step) {
  if (step.type === "single" || step.type === "test") {
    await pickOptions(page, [step.options.findIndex((o) => o.correct)]);
  } else if (step.type === "multi") {
    const right = [];
    step.options.forEach((o, i) => { if (o.correct) right.push(i); });
    // Untick anything still ticked that shouldn't be.
    await page.evaluate(() => document.querySelectorAll(".answer-choices .choice-input:checked").forEach((el) => { if (!el.disabled) el.click(); }));
    await pickOptions(page, right);
  } else if (step.type === "numeric") {
    await page.fill(".numeric-input", String(step.answer));
  } else if (step.type === "classify") {
    for (let i = 0; i < step.items.length; i++) {
      await page.click('.sort-item[data-index="' + i + '"] .sort-option:nth-of-type(' + (step.items[i].category + 1) + ")");
    }
  } else if (step.type === "order") {
    await sortOrder(page, step.items.length);
  }
  await check(page);
  await page.waitForSelector(".explain-box");
}

/**
 * Solve the step on screen. opts: { wrong: n wrong attempts first, hint: true, showMe: true }.
 * Returns the strikes this step cost.
 */
async function solveStep(page, step, opts = {}) {
  let strikes = 0;
  if (opts.hint && (await page.$(".ask-okafor:not([hidden])"))) {
    await page.click(".ask-okafor");
    await page.waitForSelector(".hint-list .hint");
    strikes++;
  }
  for (let i = 0; i < (opts.wrong || 0); i++) {
    await answerWrong(page, step);
    strikes++;
  }
  if (opts.showMe) {
    await page.waitForSelector(".show-me:not([hidden])");
    await page.click(".show-me");
    await page.waitForSelector(".explain-box");
    strikes++;
  } else {
    await answerRight(page, step);
  }
  return strikes;
}

async function nextStep(page) {
  await page.click(".next-step");
}

/** Play a whole case from its current step; plan[i] = solveStep options for step i. */
async function playCase(page, kase, plan = []) {
  let strikes = 0;
  for (let guard = 0; guard < 12; guard++) {
    if (await page.$(".debrief")) break;
    const i = await currentStepIndex(page);
    if (i < 0) throw new Error("no step on screen");
    const solved = await page.$(".explain-box");
    if (!solved) strikes += await solveStep(page, kase.steps[i], plan[i] || {});
    await nextStep(page);
    await page.waitForFunction((prev) => {
      if (document.querySelector(".debrief")) return true;
      const h = document.querySelector("#step-heading");
      const m = h && /Step\s+(\d+)/.exec(h.textContent || "");
      return m && Number(m[1]) - 1 !== prev;
    }, i, { timeout: 5000 });
  }
  return strikes;
}

/** True when nothing on the page is wider than the viewport. */
async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    if (document.documentElement.scrollWidth > vw + 1) {
      document.querySelectorAll("body *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width && r.right > vw + 1 && !el.closest(".table-wrap, .ecg-scroll, .sr-only, [hidden]")) {
          offenders.push((el.className && el.className.baseVal === undefined ? el.className : el.tagName) + " (" + Math.round(r.right) + ")");
        }
      });
    }
    return { scrollWidth: document.documentElement.scrollWidth, vw, offenders: offenders.slice(0, 8) };
  });
}

function makeChecker(log) {
  const state = { failures: 0, checks: 0 };
  function checkFn(condition, message) {
    state.checks++;
    if (!condition) {
      state.failures++;
      log("    ✗ " + message);
    }
    return !!condition;
  }
  return { check: checkFn, state };
}

async function shot(page, dir, name, opts = {}) {
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(opts.wait === undefined ? 250 : opts.wait);
  await page.screenshot({ path: path.join(dir, name + ".png"), fullPage: !!opts.fullPage });
}

module.exports = {
  GAME, openGame, content, newGame, openCase, currentStepIndex, pickOptions, check,
  answerWrong, answerRight, solveStep, nextStep, playCase, sortOrder, horizontalOverflow,
  waitForModalGone, makeChecker, shot
};
