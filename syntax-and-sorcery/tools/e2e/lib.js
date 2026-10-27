/*
 * Shared helpers for browser tests (Playwright + headless Chromium).
 *
 *   const { openGame } = require("./lib");
 *   const { page, close } = await openGame();              // http://127.0.0.1:<port>/
 *   const { page, close } = await openGame({ file: true }); // file:///.../index.html
 *
 * Pyodide is served from tools/.cache/pyodide (run tools/fetch_pyodide.sh once),
 * injected through window.SS_CONFIG so no CDN access is needed.
 */
"use strict";
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const { start, GAME, PYODIDE } = require("../dev_server");

async function openGame(options = {}) {
  if (!fs.existsSync(path.join(PYODIDE, "pyodide.js"))) {
    throw new Error("Local Pyodide missing: run  bash tools/fetch_pyodide.sh");
  }
  const { server, port } = await start(0);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: options.viewport || { width: 1280, height: 860 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err && err.stack || err)));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  const config = Object.assign({ pyodideBaseURLs: ["http://127.0.0.1:" + port + "/pyodide/"] }, options.config || {});
  await page.addInitScript((cfg) => { window.SS_CONFIG = Object.assign({}, cfg, window.SS_CONFIG || {}); }, config);
  if (options.init) await page.addInitScript(options.init);
  const url = options.file
    ? "file://" + path.join(GAME, options.path || "index.html") + (options.query || "")
    : "http://127.0.0.1:" + port + "/" + (options.path || "") + (options.query || "");
  if (options.goto !== false) await page.goto(url);
  async function close() {
    await browser.close();
    server.close();
  }
  return { browser, context, page, port, url, errors, close };
}

/** Wait until the Python engine reports ready (SS.PythonRunner.isReady()). */
async function waitForPython(page, timeout = 60000) {
  await page.waitForFunction(() => window.SS && SS.PythonRunner && SS.PythonRunner.isReady && SS.PythonRunner.isReady(), null, { timeout });
}

module.exports = { openGame, waitForPython };
