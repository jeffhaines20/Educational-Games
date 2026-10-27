#!/usr/bin/env node
/*
 * End-to-end test of the distribution bundles made by tools/build.py, in headless
 * Chromium. It builds the real game into a temporary folder, then:
 *
 *   1. opens dist/syntax-and-sorcery.html from file:// in an unrelated folder and casts
 *      a real challenge's reference solution;
 *   2. runs the SCORM package inside a fake LMS page (SCORM 1.2 API on the parent
 *      window): LMS connection, learner name, suspend_data, score/status, finish on
 *      pagehide, and resuming the saved progress on the next launch;
 *   3. embeds the package in a cross-origin iframe with no LMS (SCORM detection must
 *      not throw, saving falls back to the browser).
 *
 * Only engine APIs are driven (SS.PythonRunner, SS.Save, SS.Scorm), so the test does
 * not depend on the details of the user interface.
 *
 *   node tools/e2e/engine-bundle.js
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const assert = require("assert");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { GAME, PYODIDE } = require("../dev_server");

let passes = 0;
let failures = 0;
async function check(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    passes++;
    console.log("  ok   " + name + "  (" + (Date.now() - t0) + " ms)");
  } catch (err) {
    failures++;
    console.log("  FAIL " + name + "\n       " + String((err && err.stack) || err).split("\n").slice(0, 8).join("\n       "));
  }
}

const FAKE_LMS = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Fake LMS</title></head><body>
<script>
  window.lmsData = { "cmi.core.student_id": "student-7", "cmi.core.student_name": "Doe, Jane",
                     "cmi.core.lesson_status": "not attempted", "cmi.suspend_data": "" };
  window.lmsCalls = [];
  var live = false;
  window.API = {
    LMSInitialize: function () { lmsCalls.push("LMSInitialize"); live = true; return "true"; },
    LMSFinish: function () { lmsCalls.push("LMSFinish"); live = false; return "true"; },
    LMSGetValue: function (k) { return live ? (lmsData[k] || "") : ""; },
    LMSSetValue: function (k, v) {
      if (!live) return "false";
      if (k === "cmi.suspend_data" && String(v).length > 4096) return "false";
      lmsCalls.push("set " + k); lmsData[k] = String(v); return "true";
    },
    LMSCommit: function () { lmsCalls.push("LMSCommit"); return live ? "true" : "false"; },
    LMSGetLastError: function () { return "0"; },
    LMSGetErrorString: function () { return ""; },
    LMSGetDiagnostic: function () { return ""; }
  };
</script>
<iframe id="course" src="/course/index.html" width="1000" height="700"></iframe>
</body></html>`;

function serve(courseDir, port0) {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json", ".zip": "application/zip" };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    let file = null;
    if (url === "/lms.html") { res.writeHead(200, { "Content-Type": types[".html"] }); return res.end(FAKE_LMS); }
    if (url === "/lms-cross.html") {
      const port = server.address().port;
      res.writeHead(200, { "Content-Type": types[".html"] });
      return res.end('<!DOCTYPE html><title>Other site</title><iframe src="http://127.0.0.1:' + port + '/course/index.html" width="1000" height="700"></iframe>');
    }
    if (url.startsWith("/pyodide/")) file = path.join(PYODIDE, url.slice("/pyodide/".length));
    else if (url.startsWith("/course/")) file = path.join(courseDir, url.slice("/course/".length));
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Access-Control-Allow-Origin": "*" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port0 || 0, "127.0.0.1", () => resolve(server)));
}

async function courseFrame(page) {
  const handle = await page.waitForSelector("iframe");
  const frame = await handle.contentFrame();
  await frame.waitForFunction(() => window.SS && SS.Save && SS.PythonRunner && SS.content, null, { timeout: 30000 });
  return frame;
}

(async () => {
  if (!fs.existsSync(path.join(PYODIDE, "pyodide.js"))) {
    console.error("Local Pyodide missing: run  bash tools/fetch_pyodide.sh");
    process.exit(2);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ss-bundle-test-"));
  const out = path.join(tmp, "dist");
  const built = spawnSync("python3", [path.join(GAME, "tools", "build.py"), "--out", out], { encoding: "utf8" });
  if (built.status !== 0) {
    console.error("build.py failed:\n" + built.stdout + built.stderr);
    process.exit(1);
  }
  console.log(built.stdout.trim());

  // The SCORM package, unpacked as an LMS would.
  const courseDir = path.join(tmp, "course");
  const unzip = spawnSync("python3", ["-c", "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])", path.join(out, "syntax-and-sorcery-scorm.zip"), courseDir], { encoding: "utf8" });
  assert.strictEqual(unzip.status, 0, unzip.stderr);
  const server = await serve(courseDir);
  const port = server.address().port;
  const pyodideBase = "http://127.0.0.1:" + port + "/pyodide/";
  const browser = await chromium.launch();

  try {
    await check("single-file build from file:// (another folder): content loads and a real spell passes its trials", async () => {
      const elsewhere = path.join(tmp, "somewhere-else");
      fs.mkdirSync(elsewhere);
      fs.copyFileSync(path.join(out, "syntax-and-sorcery.html"), path.join(elsewhere, "game.html"));
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.addInitScript((cfg) => { window.SS_CONFIG = cfg; }, { pyodideBaseURLs: [pyodideBase] });
      await page.goto("file://" + path.join(elsewhere, "game.html"));
      await page.waitForFunction(() => window.SS && SS.PythonRunner, null, { timeout: 30000 });
      const r = await page.evaluate(async () => {
        await SS.PythonRunner.init();
        const ch = SS.Progress.allChallenges()[0];
        const result = await SS.PythonRunner.run({ code: ch.solution, tests: ch.tests, inputs: ch.inputs || [] });
        const starter = await SS.PythonRunner.run({ code: ch.starter, tests: ch.tests, inputs: ch.inputs || [] });
        return { count: SS.Progress.allChallenges().length, status: result.status, starter: starter.status, loadErrors: window.SS_LOAD_ERRORS || [] };
      });
      assert.ok(r.count > 0);
      assert.strictEqual(r.status, "passed");
      assert.notStrictEqual(r.starter, "passed");
      assert.deepStrictEqual(r.loadErrors, []);
      assert.deepStrictEqual(errors, []);
      await context.close();
    });

    await check("SCORM package in a fake LMS: connects, saves to suspend_data, reports score, finishes, resumes", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.addInitScript((cfg) => { window.SS_CONFIG = cfg; }, { pyodideBaseURLs: [pyodideBase] });
      await page.goto("http://127.0.0.1:" + port + "/lms.html");
      let frame = await courseFrame(page);
      const first = await frame.evaluate(async () => {
        const info = await SS.Save.init();
        if (!SS.Save.getProfile()) SS.Save.createProfile(0, "Jane");
        const ids = SS.Progress.allChallenges().map((c) => c.id);
        SS.Save.recordCast(ids[0], { passed: false });
        SS.Save.revealHint(ids[0]);
        SS.Save.recordCast(ids[0], { passed: true });
        const result = SS.Save.recordCompletion(ids[0], { code: "print('Hello world')" });
        SS.Save.saveDraft(ids[1], "# half-finished draft");
        SS.Save.markSeen("prologue");
        return { info, version: SS.Scorm.version, total: ids.length, stars: result.stars, first: ids[0], second: ids[1] };
      });
      assert.strictEqual(first.info.scorm, true);
      assert.strictEqual(first.info.learnerName, "Jane Doe");
      assert.strictEqual(first.version, "1.2");
      assert.strictEqual(first.stars, 2);
      let lms = await page.evaluate(() => ({ data: window.lmsData, calls: window.lmsCalls }));
      assert.strictEqual(lms.calls.filter((c) => c === "LMSInitialize").length, 1);
      assert.ok(lms.data["cmi.suspend_data"].startsWith("S1|"));
      assert.ok(lms.data["cmi.suspend_data"].length <= 4096);
      assert.strictEqual(lms.data["cmi.core.lesson_status"], "incomplete");
      assert.strictEqual(lms.data["cmi.core.score.raw"], String(Math.round(100 / first.total)));
      assert.strictEqual(lms.data["cmi.core.exit"], "suspend");
      assert.ok(lms.calls.includes("LMSCommit"));

      // Leave the course (pagehide → flush + LMSFinish), then launch it again.
      await page.evaluate(() => { document.getElementById("course").src = "about:blank"; });
      await page.waitForFunction(() => window.lmsCalls.includes("LMSFinish"));
      lms = await page.evaluate(() => ({ data: window.lmsData, calls: window.lmsCalls }));
      assert.strictEqual(lms.calls.filter((c) => c === "LMSFinish").length, 1);
      assert.match(lms.data["cmi.core.session_time"], /^\d{2,4}:\d{2}:\d{2}\.\d{2}$/);
      await page.evaluate(() => { document.getElementById("course").src = "/course/index.html"; });
      await page.waitForFunction(() => window.lmsCalls.filter((c) => c === "LMSInitialize").length === 2, null, { timeout: 30000 });
      frame = await courseFrame(page);
      const second = await frame.evaluate(async (ids) => {
        await SS.Save.init();
        const p = SS.Save.getProfile();
        return {
          name: p && p.wizardName,
          rec: p && p.challenges[ids.first],
          draft: p && p.challenges[ids.second] && p.challenges[ids.second].draft,
          seen: SS.Save.hasSeen("prologue"),
          slots: SS.Save.listSlots().length,
        };
      }, first);
      assert.strictEqual(second.name, "Jane");
      assert.strictEqual(second.rec.completed, true);
      assert.strictEqual(second.rec.stars, 2);
      assert.strictEqual(second.rec.hintsUsed, 1);
      assert.strictEqual(second.rec.bestCode, "print('Hello world')");
      assert.strictEqual(second.draft, "# half-finished draft");
      assert.strictEqual(second.seen, true);
      assert.strictEqual(second.slots, 1);
      assert.deepStrictEqual(errors, []);
      await context.close();
    });

    await check("package in a cross-origin iframe with no LMS: no SCORM, no errors, Python works", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.addInitScript((cfg) => { window.SS_CONFIG = cfg; }, { pyodideBaseURLs: [pyodideBase] });
      await page.goto("http://localhost:" + port + "/lms-cross.html");
      const frame = await courseFrame(page);
      const r = await frame.evaluate(async () => {
        const info = await SS.Save.init();
        await SS.PythonRunner.init();
        const run = await SS.PythonRunner.run({ code: "print('from an iframe')" });
        return { info, scorm: SS.Scorm.isActive(), out: run.stdout };
      });
      assert.strictEqual(r.info.scorm, false);
      assert.strictEqual(r.scorm, false);
      assert.strictEqual(r.out, "from an iframe\n");
      assert.deepStrictEqual(errors, []);
      await context.close();
    });
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log("\n" + passes + " passed, " + failures + " failed");
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
