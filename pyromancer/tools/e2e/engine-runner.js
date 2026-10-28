#!/usr/bin/env node
/*
 * Browser tests for SS.PythonRunner (Pyodide in a Web Worker), in headless Chromium.
 * Uses tools/e2e/engine-runner.html, which loads only config.js, harness.js and
 * runner.js. Pyodide comes from tools/.cache/pyodide (run tools/fetch_pyodide.sh once),
 * served by tools/dev_server.js and injected through window.SS_CONFIG.
 *
 *   node tools/e2e/engine-runner.js            # http:// and file://
 *   node tools/e2e/engine-runner.js http       # only one of them
 *   node tools/e2e/engine-runner.js measure    # how deep each kind of recursion can go
 *                                              # before the worker's JS stack overflows
 *                                              # (use it to re-tune SS.config.recursionLimit)
 */
"use strict";
const path = require("path");
const fs = require("fs");
const assert = require("assert");
const { chromium } = require("playwright");
const { start, GAME, PYODIDE } = require("../dev_server");

const PAGE = "tools/e2e/engine-runner.html";
let failures = 0;
let passes = 0;

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

async function openPage(browser, url, config) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.addInitScript((cfg) => { window.SS_CONFIG = cfg; }, config);
  await page.goto(url);
  return { page, errors, close: () => context.close() };
}

function run(page, options) {
  return page.evaluate((opts) => SS.PythonRunner.run(opts), options);
}

function statusLog(page) {
  return page.evaluate(() => window.__statusLog.map((s) => s.state + ": " + s.message));
}

async function mainSuite(browser, url, localBase, label) {
  console.log("\n" + label + ": " + url);
  const { page, errors, close } = await openPage(browser, url, { pyodideBaseURLs: [localBase] });

  await check(label + " init() loads Pyodide and reports ready", async () => {
    assert.strictEqual(await page.evaluate(() => SS.PythonRunner.getStatus().state), "idle");
    await page.evaluate(() => SS.PythonRunner.init());
    assert.strictEqual(await page.evaluate(() => SS.PythonRunner.isReady()), true);
    const status = await page.evaluate(() => SS.PythonRunner.getStatus());
    assert.strictEqual(status.state, "ready");
    assert.strictEqual(status.baseURL, localBase);
    const log = await statusLog(page);
    assert.match(log[0], /^loading: Summoning the Python spirit… \(the first visit downloads about 12 MB\)$/);
    assert.strictEqual(log[log.length - 1], "ready: The Python spirit is ready.");
    await page.evaluate(() => SS.PythonRunner.init());          // idempotent
  });

  await check(label + " hello world", async () => {
    const r = await run(page, { code: 'print("Hello world")' });
    assert.strictEqual(r.status, "ran");
    assert.strictEqual(r.stdout, "Hello world\n");
    assert.strictEqual(r.error, null);
    assert.deepStrictEqual([r.tests, r.passed, r.total, r.truncated], [[], 0, 0, false]);
    assert.ok(typeof r.durationMs === "number" && r.durationMs >= 0);
  });

  await check(label + " unicode output", async () => {
    const r = await run(page, { code: 'print("Zoë 🧙 李", end="!")' });
    assert.strictEqual(r.stdout, "Zoë 🧙 李!");
  });

  await check(label + " syntax error", async () => {
    const r = await run(page, { code: 'print("Hi"\n' });
    assert.strictEqual(r.status, "error");
    assert.strictEqual(r.error.type, "SyntaxError");
    assert.strictEqual(r.error.phase, "syntax");
    assert.strictEqual(r.error.line, 1);
    assert.match(r.error.friendly, /never closed/);
  });

  await check(label + " runtime error with its line number", async () => {
    const r = await run(page, { code: 'x = 1\nprint("before")\ny = x + "a"\nprint("after")\n' });
    assert.strictEqual(r.status, "error");
    assert.strictEqual(r.error.type, "TypeError");
    assert.strictEqual(r.error.phase, "runtime");
    assert.strictEqual(r.error.line, 3);
    assert.strictEqual(r.stdout, "before\n");
    assert.match(r.error.traceback, /line 3/);
    assert.ok(r.error.friendly.length > 20);
  });

  await check(label + " input() answered from inputs (and EOF when there are none)", async () => {
    const code = 'name = input("Name? ")\nage = int(input("Age? "))\nprint(f"{name} is {age + 1} next year")\n';
    let r = await run(page, { code, inputs: ["Morgana", 7] });
    assert.strictEqual(r.status, "ran");
    assert.strictEqual(r.stdout, "Name? Morgana\nAge? 7\nMorgana is 8 next year\n");
    r = await run(page, { code });
    assert.strictEqual(r.status, "error");
    assert.strictEqual(r.error.type, "EOFError");
    assert.match(r.error.friendly, /input\(\)/);
  });

  const trials = '@test("double(2) is 4")\ndef _():\n    expect_equal(need_function("double", 1)(2), 4)\n\n' +
    '@test("double(-3) is -6")\ndef _():\n    expect_equal(need_function("double")(-3), -6)\n';
  await check(label + " trials pass", async () => {
    const r = await run(page, { code: "def double(x):\n    return x * 2\n", tests: trials });
    assert.strictEqual(r.status, "passed");
    assert.deepStrictEqual([r.passed, r.total], [2, 2]);
    assert.deepStrictEqual(r.tests.map((t) => [t.name, t.passed]), [["double(2) is 4", true], ["double(-3) is -6", true]]);
  });

  await check(label + " trials fail with messages", async () => {
    const r = await run(page, { code: "def double(x):\n    return x + 2\n", tests: trials });
    assert.strictEqual(r.status, "failed");
    assert.deepStrictEqual([r.passed, r.total], [1, 2]);
    assert.strictEqual(r.tests[1].passed, false);
    assert.match(r.tests[1].message, /-6/);
    const missing = await run(page, { code: "x = 1\n", tests: trials });
    assert.strictEqual(missing.status, "failed");
    assert.match(missing.tests[0].message, /double/);
  });

  await check(label + " broken trial code is an internal error, not the player's fault", async () => {
    const r = await run(page, { code: "x = 1\n", tests: "this is not python(\n" });
    assert.strictEqual(r.status, "internal-error");
    assert.match(r.error.friendly, /bug in the game/);
  });

  await check(label + " runaway print loop is stopped", async () => {
    const r = await run(page, { code: 'while True:\n    print("spam")\n' });
    assert.strictEqual(r.status, "error");
    assert.strictEqual(r.error.type, "TooMuchOutput");
    assert.strictEqual(r.truncated, true);
    assert.ok(r.stdout.length <= 50000 && r.stdout.length > 40000);
  });

  await check(label + " the recursion limit is SS.config.recursionLimit (1000, as in CPython) for every spell", async () => {
    const limit = await page.evaluate(() => SS.config.recursionLimit);
    assert.strictEqual(limit, 1000);
    await run(page, { code: "import sys\nsys.setrecursionlimit(50)\n" });
    const r = await run(page, { code: "import sys\nprint(sys.getrecursionlimit())" });
    assert.strictEqual(r.stdout, limit + "\n", "reset after a spell changed it");
  });

  const memo = (n) => "from functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef f(n):\n    return 0 if n == 0 else 1 + f(n - 1)\n\nprint(f(" + n + "))\n";
  await check(label + " deep correct recursion works: plain 900, lru_cache 450, DP with wrapper + lru_cache + generator 200", async () => {
    const plain = "def f(n):\n    return 0 if n == 0 else 1 + f(n - 1)\n\nprint(f(900))\n";
    assert.strictEqual((await run(page, { code: plain })).stdout, "900\n");
    assert.strictEqual((await run(page, { code: memo(450) })).stdout, "450\n");
    const dp = "from functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef best(n):\n    return 0 if n == 0 else 1 + max(best(k) for k in [n - 1])\n\n" +
      "_inner = best\ndef best(n):            # like the trials' count_calls wrapper\n    return _inner(n)\n\nprint(best(200))\n";
    assert.strictEqual((await run(page, { code: dp })).stdout, "200\n");
    const trial = await run(page, { code: plain.replace("print(f(900))\n", ""), tests: '@test("deep")\ndef _():\n    expect_equal(need_function("f")(600), 600)\n' });
    assert.strictEqual(trial.status, "passed", JSON.stringify(trial.tests));
    assert.strictEqual(await page.evaluate(() => SS.PythonRunner.getStatus().state), "ready", "no restart");
  });

  await check(label + " runaway recursion is a RecursionError with a line number (plain, lru_cache, generator in max())", async () => {
    let r = await run(page, { code: "def f(n):\n    return f(n + 1)\n\nf(0)\n" });
    assert.deepStrictEqual([r.status, r.error.type, r.error.phase], ["error", "RecursionError", "runtime"]);
    assert.ok(r.error.line === 1 || r.error.line === 2, "line " + r.error.line);
    assert.match(r.error.friendly, /base case/);
    r = await run(page, { code: memo(700) });
    assert.deepStrictEqual([r.status, r.error.type], ["error", "RecursionError"]);
    r = await run(page, { code: "def f(n):\n    return 1 + max(f(k) for k in [n + 1])\n\nf(0)\n" });
    assert.deepStrictEqual([r.status, r.error.type], ["error", "RecursionError"]);
    assert.ok(r.error.line > 0, "a line number");
    r = await run(page, { code: "import sys\nsys.setrecursionlimit(20000)\n" + memo(3000) });
    assert.strictEqual(r.stdout, "3000\n", "raising the limit works for lru_cache, as on a desktop");
    assert.strictEqual(await page.evaluate(() => SS.PythonRunner.getStatus().state), "ready");
  });

  const golem = 'class Golem:\n    def __str__(self):\n        return f"Golem {self}"\n\nprint(Golem())\n';
  const viaC = [
    golem,
    "class G:\n    def __repr__(self):\n        return 'G(' + repr(self) + ')'\n\nprint(repr(G()))\n",
    "class G:\n    def __eq__(self, other):\n        return self == other\n\nprint(G() == G())\n",
    "class G:\n    def __len__(self):\n        return len(self)\n\nprint(len(G()))\n",
    "def f(n):\n    return sum(map(f, [n]))\n\nf(1)\n",
  ];
  await check(label + " with a lower limit, recursion through C code (str, repr, ==, len, map) is a normal RecursionError", async () => {
    const before = (await statusLog(page)).length;
    for (const code of viaC) {
      const r = await run(page, { code: "import sys\nsys.setrecursionlimit(300)\n" + code });
      assert.deepStrictEqual([r.status, r.error.type], ["error", "RecursionError"], code);
      assert.ok(typeof r.error.line === "number" && r.error.line > 0, "a line number for " + code);
      assert.match(r.error.traceback, /RecursionError/);
    }
    const log = (await statusLog(page)).slice(before);
    assert.ok(!log.some((s) => s.startsWith("loading")), "no worker restart: " + log.join(" | "));
  });

  await check(label + " at the default limit, a JavaScript stack overflow becomes a friendly RecursionError (worker restarted)", async () => {
    for (const code of [golem, "def f(n):\n    return sorted([n], key=f)\n\nf(1)\n"]) {
      const before = (await statusLog(page)).length;
      const r = await run(page, { code });
      assert.strictEqual(r.status, "error", JSON.stringify(r));
      assert.deepStrictEqual([r.error.type, r.error.phase, r.error.line], ["RecursionError", "runtime", null]);
      assert.match(r.error.message, /maximum recursion depth exceeded/);
      assert.match(r.error.friendly, /deeper than the browser can follow/);
      assert.match(r.error.friendly, /base case/);
      assert.match(r.error.friendly, /__str__/);
      assert.match(r.error.friendly, /loop \(bottom-up\)/);
      assert.deepStrictEqual([r.stdout, r.tests, r.passed, r.total], ["", [], 0, 0]);
      const log = (await statusLog(page)).slice(before);
      assert.ok(log.includes("loading: The Python spirit stumbled. Summoning a fresh one…"), log.join(" | "));
      assert.strictEqual((await run(page, { code: "print('recovered')" })).stdout, "recovered\n");
    }
  });

  await check(label + " sys.setrecursionlimit(10**6) + endless recursion doesn't break the runner", async () => {
    const r = await run(page, { code: "import sys\nsys.setrecursionlimit(10**6)\ndef f(n):\n    return f(n + 1)\n\nf(0)\n", timeLimitMs: 4000 });
    assert.ok(["error", "timeout"].includes(r.status), r.status);
    const next = await run(page, { code: "import sys\nprint('alive', sys.getrecursionlimit())" });
    assert.strictEqual(next.stdout, "alive 1000\n", "the recursion limit is reset for the next spell");
  });

  await check(label + " a spell can't forge a passing result (prototype setters, replaced String/JSON)", async () => {
    const trials = '@test("It says Hello world")\ndef _():\n    expect_output("Hello world")\n';
    const forgeries = [
      // A setter on Object.prototype for "session", as a reviewer tried.
      "import js\njs.eval(\"Object.defineProperty(Object.prototype,'session',{configurable:true,set:function(v){" +
        "delete Object.prototype.session;Object.defineProperty(this,'session',{value:v,enumerable:true,writable:true,configurable:true});" +
        "if(this.type==='result'){this.json=JSON.stringify({status:'passed',stdout:'',truncated:false,error:null," +
        "tests:[{name:'Forged trial',passed:true,message:''}],passed:1,total:1});}}})\")\nprint('I did not solve anything')\n",
      // Setters for the other fields, and replaced String / JSON / Number.
      "import js\njs.eval(\"Object.defineProperty(Object.prototype,'json',{configurable:true,set:function(v){Object.defineProperty(this,'json',{value:'{\\\"status\\\":\\\"passed\\\",\\\"stdout\\\":\\\"\\\",\\\"tests\\\":[]}',enumerable:true});}});" +
        "self.String=function(){return '{\\\"status\\\":\\\"passed\\\",\\\"stdout\\\":\\\"\\\",\\\"tests\\\":[]}'};self.Number=function(){return 1};\")\nprint('I did not solve anything')\n",
    ];
    for (const code of forgeries) {
      const r = await run(page, { code, tests: trials });
      assert.notStrictEqual(r.status, "passed", JSON.stringify(r).slice(0, 300));
      assert.ok(!r.tests.some((t) => /Forged/.test(t.name)), JSON.stringify(r.tests));
      await page.evaluate(() => SS.PythonRunner.restart());     // a fresh worker without the tampering
    }
    const honest = await run(page, { code: "print('Hello world')", tests: trials });
    assert.strictEqual(honest.status, "passed");
  });

  await check(label + " the step limit stops a runaway loop with a line number (SS.config.stepLimit)", async () => {
    let r = await run(page, { code: "count = 0\nwhile True:\n    count += 1\n" });
    assert.deepStrictEqual([r.status, r.error.type, r.error.line], ["error", "TooManySteps", 2]);
    const loop = "total = 0\nfor i in range(50000):\n    total += i\nprint(total)\n";
    assert.strictEqual((await run(page, { code: loop })).stdout, "1249975000\n");
    await page.evaluate(() => { SS.config.stepLimit = 10000; });
    r = await run(page, { code: loop });
    assert.deepStrictEqual([r.status, r.error.type], ["error", "TooManySteps"]);
    r = await run(page, { code: loop, stepLimit: 0 });
    assert.strictEqual(r.stdout, "1249975000\n", "a per-run stepLimit of 0 turns the limit off");
    await page.evaluate(() => { SS.config.stepLimit = 2000000; });
  });

  // A loop inside a built-in (no Python steps to count) still needs the time limit.
  const builtinLoop = "import itertools\nsum(itertools.repeat(0))\n";
  await check(label + " endless loop inside a built-in → timeout, worker restarted, next run works", async () => {
    const before = (await statusLog(page)).length;
    const r = await run(page, { code: builtinLoop, timeLimitMs: 1500 });
    assert.strictEqual(r.status, "timeout");
    assert.deepStrictEqual([r.stdout, r.truncated, r.tests, r.passed, r.total], ["", false, [], 0, 0]);
    assert.strictEqual(r.error.type, "Timeout");
    assert.strictEqual(r.error.phase, "runtime");
    assert.strictEqual(r.error.line, null);
    assert.match(r.error.friendly, /more than 1\.5 seconds/);
    assert.match(r.error.friendly, /loop that never ends/);
    assert.match(r.error.friendly, /base case/);
    assert.ok(r.durationMs >= 1400 && r.durationMs < 5000, String(r.durationMs));
    const next = await run(page, { code: "print('after the loop')" });
    assert.strictEqual(next.stdout, "after the loop\n");
    const log = (await statusLog(page)).slice(before);
    assert.ok(log.includes("loading: The wards stopped a runaway spell. Summoning a fresh Python spirit…"), log.join(" | "));
    assert.strictEqual(log[log.length - 1], "ready: The Python spirit is ready.");
  });

  await check(label + " runs are queued and answered in order (even across a timeout)", async () => {
    const results = await page.evaluate((loop) => Promise.all([
      SS.PythonRunner.run({ code: "print('one')" }),
      SS.PythonRunner.run({ code: loop, timeLimitMs: 1000 }),
      SS.PythonRunner.run({ code: "print('three')" }),
      SS.PythonRunner.run({ code: "print(sum(range(10**5)))" }),
    ]), builtinLoop);
    assert.deepStrictEqual(results.map((r) => r.status), ["ran", "timeout", "ran", "ran"]);
    assert.deepStrictEqual(results.map((r) => r.stdout), ["one\n", "", "three\n", "4999950000\n"]);
  });

  await check(label + " junk messages posted by a spell are ignored", async () => {
    const code = [
      "import js",
      'js.postMessage("junk")',
      'js.postMessage(js.JSON.parse(\'{"type":"result","id":1,"json":"{}"}\'))',
      'js.postMessage(js.JSON.parse(\'{"type":"ready"}\'))',
      'print("after junk")',
    ].join("\n");
    const r = await run(page, { code });
    assert.strictEqual(r.status, "ran", JSON.stringify(r.error));
    assert.strictEqual(r.stdout, "after junk\n");
    const next = await run(page, { code: "print(2 + 2)" });
    assert.strictEqual(next.stdout, "4\n");
  });

  await check(label + " one spell can't break the next (builtins, stdout, hooks are reset)", async () => {
    await run(page, { code: "import builtins, sys\nbuiltins.len = lambda x: 42\nbuiltins.secret = 1\nsys.stdout = None\nsys.settrace(lambda *a: None)\nsys.path.clear()\n" });
    const r = await run(page, { code: "import json\nprint(len([1, 2]), 'secret' in dir(__builtins__), json.dumps([1]))\n" });
    assert.strictEqual(r.stdout, "2 False [1]\n", JSON.stringify(r));
  });

  await check(label + " code is passed as data, never pasted into Python", async () => {
    const tricky = '"""\n\'\'\'\nprint("still a string")\n' + "\\" + "\n";
    const r = await run(page, { code: "s = " + JSON.stringify(tricky) + "\nprint(len(s))\n" });
    assert.strictEqual(r.status, "ran");
    assert.strictEqual(r.stdout, tricky.length + "\n");
    const big = "# " + "x".repeat(100000) + "\nprint('big ok')\n";
    assert.strictEqual((await run(page, { code: big })).stdout, "big ok\n");
  });

  await check(label + " restart() reloads Python", async () => {
    const before = (await statusLog(page)).length;
    await page.evaluate(() => SS.PythonRunner.restart());
    const log = (await statusLog(page)).slice(before);
    assert.deepStrictEqual(log, ["loading: Summoning a fresh Python spirit…", "ready: The Python spirit is ready."]);
    assert.strictEqual((await run(page, { code: "print('fresh')" })).stdout, "fresh\n");
  });

  await check(label + " no page errors", async () => {
    assert.deepStrictEqual(errors, []);
  });
  await close();
}

async function fallbackSuites(browser, url, port, localBase, label) {
  const bogus = "http://127.0.0.1:" + port + "/no-such-pyodide/";
  await check(label + " CDN fallback: first base URL broken, second works", async () => {
    const { page, close } = await openPage(browser, url, { pyodideBaseURLs: [bogus, localBase] });
    await page.evaluate(() => SS.PythonRunner.init());
    const status = await page.evaluate(() => SS.PythonRunner.getStatus());
    assert.strictEqual(status.state, "ready");
    assert.strictEqual(status.baseURL, localBase);
    const log = await statusLog(page);
    assert.ok(log.some((s) => /first portal was closed/.test(s)), log.join(" | "));
    assert.strictEqual((await run(page, { code: "print('via fallback')" })).stdout, "via fallback\n");
    await close();
  });

  await check(label + " every base URL failing: status error, init() rejects, run() reports it", async () => {
    const { page, close } = await openPage(browser, url, { pyodideBaseURLs: [bogus, "http://127.0.0.1:9/pyodide/"] });
    const outcome = await page.evaluate(() => SS.PythonRunner.init().then(() => "resolved", (e) => "rejected: " + e.message));
    assert.match(outcome, /^rejected: The Python spirit couldn't be summoned/);
    const status = await page.evaluate(() => SS.PythonRunner.getStatus());
    assert.strictEqual(status.state, "error");
    assert.match(status.message, /127\.0\.0\.1/);
    assert.match(status.detail, /no-such-pyodide/);
    const r = await run(page, { code: "print(1)" });
    assert.strictEqual(r.status, "internal-error");
    assert.match(r.error.friendly, /isn't available/);
    await close();
  });
}

async function otherSuites(browser, port, localBase) {
  const httpURL = "http://127.0.0.1:" + port + "/" + PAGE;
  await check("no Web Workers: status error, init() rejects with a clear message", async () => {
    const { page, close } = await openPage(browser, httpURL + "?noWorker=1", { pyodideBaseURLs: [localBase] });
    const outcome = await page.evaluate(() => SS.PythonRunner.init().then(() => "resolved", (e) => "rejected: " + e.message));
    assert.match(outcome, /^rejected: .*background worker/);
    assert.strictEqual(await page.evaluate(() => SS.PythonRunner.getStatus().state), "error");
    await close();
  });

  await check("Blob URLs unavailable: falls back to a data: URL worker", async () => {
    const { page, close } = await openPage(browser, httpURL + "?noBlob=1", { pyodideBaseURLs: [localBase] });
    const r = await page.evaluate(async () => { await SS.PythonRunner.init(); return SS.PythonRunner.run({ code: "print('data worker')" }); });
    assert.strictEqual(r.stdout, "data worker\n");
    await close();
  });

  async function withCsp(policy) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const html = fs.readFileSync(path.join(GAME, PAGE), "utf8");
    await page.route(httpURL, (route) => route.fulfill({ status: 200, contentType: "text/html", headers: { "Content-Security-Policy": policy }, body: html }));
    await page.addInitScript((cfg) => { window.SS_CONFIG = cfg; }, { pyodideBaseURLs: [localBase] });
    await page.goto(httpURL);
    return { page, close: () => context.close() };
  }

  await check("a strict Content-Security-Policy (self + worker-src blob: + wasm) works", async () => {
    // What a site with a CSP needs: worker-src blob:, 'wasm-unsafe-eval', and the Pyodide host in script-src.
    const { page, close } = await withCsp("default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; worker-src blob:; style-src 'self' 'unsafe-inline'");
    const r = await page.evaluate(async () => { await SS.PythonRunner.init(); return SS.PythonRunner.run({ code: "print('csp ok')" }); });
    assert.strictEqual(r.stdout, "csp ok\n");
    await close();
  });

  await check("a CSP that blocks blob: workers: retries with a data: URL worker, never hangs", async () => {
    const { page, close } = await withCsp("worker-src data:");
    const outcome = await page.evaluate(() => SS.PythonRunner.init().then(
      () => SS.PythonRunner.run({ code: "print('data ok')" }).then((r) => "ran: " + r.stdout),
      () => "rejected: " + SS.PythonRunner.getStatus().detail));
    // Chrome then also refuses importScripts() inside the data: worker under this policy;
    // the detail proves the data: worker started and reported why.
    assert.ok(outcome === "ran: data ok\n" || /^rejected: .*\[bootstrap\]/.test(outcome), outcome);
    await close();
  });

  await check("a Content-Security-Policy without 'wasm-unsafe-eval': fails at once with a clear message", async () => {
    const { page, close } = await withCsp("default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src blob:; style-src 'self' 'unsafe-inline'");
    const t0 = Date.now();
    const outcome = await page.evaluate(() => SS.PythonRunner.init().then(() => "resolved", (e) => "rejected: " + e.message));
    assert.ok(Date.now() - t0 < 10000, "took " + (Date.now() - t0) + " ms");
    assert.match(outcome, /^rejected: .*block WebAssembly.*'wasm-unsafe-eval'/);
    const status = await page.evaluate(() => SS.PythonRunner.getStatus());
    assert.strictEqual(status.state, "error");
    assert.match(status.detail, /WebAssembly/);
    await close();
  });

  await check("a Content-Security-Policy that blocks every worker: clear error, init() rejects", async () => {
    const { page, close } = await withCsp("worker-src 'none'");
    const outcome = await page.evaluate(() => SS.PythonRunner.init().then(() => "resolved", (e) => "rejected: " + e.message));
    assert.match(outcome, /^rejected: .*background worker/);
    await close();
  });

  await check("inside a sandboxed iframe (opaque origin, like some LMS embeds)", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript((cfg) => { window.SS_CONFIG = cfg; }, { pyodideBaseURLs: [localBase] });
    await page.goto("http://127.0.0.1:" + port + "/tools/e2e/engine-runner.html");
    await page.setContent('<iframe sandbox="allow-scripts" src="' + httpURL + '" style="width:800px;height:600px"></iframe>');
    const frame = await (await page.waitForSelector("iframe")).contentFrame();
    await frame.waitForFunction(() => window.SS && SS.PythonRunner);
    const result = await frame.evaluate(async () => {
      await SS.PythonRunner.init();
      return SS.PythonRunner.run({ code: "print(6 * 7)" });
    });
    assert.strictEqual(result.stdout, "42\n");
    await context.close();
  });
}

// Recursion patterns for "measure". @N@ is the depth. Each probe raises Python's limit, so
// only the JavaScript stack decides; every probe runs in a fresh worker (bigger frames
// before the JIT warms up) with the harness's step counter on, as in the game.
const DEPTH_PROBES = {
  "plain recursion": "def f(n):\n    return 0 if n == 0 else 1 + f(n - 1)\nf(@N@)\n",
  "@lru_cache (as in the game)": "from functools import lru_cache\n@lru_cache(maxsize=None)\ndef f(n):\n    return 0 if n == 0 else 1 + f(n - 1)\nf(@N@)\n",
  "@lru_cache (CPython's C wrapper)": "import functools, _functools\ndef f(n):\n    return 0 if n == 0 else 1 + f(n - 1)\nf = _functools._lru_cache_wrapper(f, None, False, functools._CacheInfo)\nf(@N@)\n",
  "sorted(key=...)": "def f(n):\n    if n:\n        sorted([n - 1], key=f)\n    return n\nf(@N@)\n",
  "map()": "def f(n):\n    return 0 if n == 0 else 1 + sum(map(f, [n - 1]))\nf(@N@)\n",
  "f-string of self in __str__": "class C:\n    def __init__(self, nxt):\n        self.nxt = nxt\n    def __str__(self):\n        return f'[{self.nxt}]'\nc = None\nfor i in range(@N@):\n    c = C(c)\nstr(c)\n",
  "repr() in __repr__": "class C:\n    def __init__(self, nxt):\n        self.nxt = nxt\n    def __repr__(self):\n        return 'C(' + repr(self.nxt) + ')'\nc = None\nfor i in range(@N@):\n    c = C(c)\nrepr(c)\n",
  "== in __eq__": "class C:\n    def __init__(self, nxt):\n        self.nxt = nxt\n    def __eq__(self, other):\n        return isinstance(other, C) and self.nxt == other.nxt\na = b = None\nfor i in range(@N@):\n    a, b = C(a), C(b)\na == b\n",
  "generator inside max()": "def f(n):\n    return 0 if n == 0 else 1 + max(f(k) for k in [n - 1])\nf(@N@)\n",
  "generator inside sum()": "def f(n):\n    return 0 if n == 0 else 1 + sum(f(k) for k in [n - 1])\nf(@N@)\n",
  "DP: wrapper + @lru_cache + generator in max()": "from functools import lru_cache\n@lru_cache(maxsize=None)\ndef f(n):\n    return 0 if n == 0 else 1 + max(f(k) for k in [n - 1])\n_inner = f\ndef f(n):\n    return _inner(n)\nf(@N@)\n",
  "len() in __len__": "class C:\n    def __init__(self, nxt):\n        self.nxt = nxt\n    def __len__(self):\n        return 1 + (len(self.nxt) if self.nxt is not None else 0)\nc = None\nfor i in range(@N@):\n    c = C(c)\nlen(c)\n",
};

async function measure(browser, localBase, port) {
  const { page, close } = await openPage(browser, "http://127.0.0.1:" + port + "/" + PAGE, { pyodideBaseURLs: [localBase] });
  await page.evaluate(() => SS.PythonRunner.init());
  console.log("Deepest recursion that works in a fresh worker (Chromium " + browser.version() + "):");
  for (const [name, template] of Object.entries(DEPTH_PROBES)) {
    const works = (n) => page.evaluate(async (code) => {
      await SS.PythonRunner.restart();
      return (await SS.PythonRunner.run({ code, timeLimitMs: 30000 })).status === "ran";
    }, "import sys\nsys.setrecursionlimit(1000000)\n" + template.split("@N@").join(String(n)));
    let lo = 0, hi = 5000;
    if (await works(hi)) { console.log("  " + name.padEnd(34) + "> " + hi + " (no overflow)"); continue; }
    while (hi - lo > Math.max(5, Math.round(lo * 0.02))) {
      const mid = Math.floor((lo + hi) / 2);
      if (await works(mid)) lo = mid; else hi = mid;
    }
    console.log("  " + name.padEnd(46) + "~" + lo);
  }
  await close();
}

(async () => {
  if (!fs.existsSync(path.join(PYODIDE, "pyodide.js"))) {
    console.error("Local Pyodide missing: run  bash tools/fetch_pyodide.sh");
    process.exit(2);
  }
  const only = process.argv[2];
  const { server, port } = await start(0);
  const browser = await chromium.launch();
  const localBase = "http://127.0.0.1:" + port + "/pyodide/";
  const targets = [
    ["http", "http://127.0.0.1:" + port + "/" + PAGE],
    ["file", "file://" + path.join(GAME, PAGE)],
  ].filter(([label]) => !only || only === label || only === "measure");
  try {
    if (only === "measure") {
      await measure(browser, localBase, port);
      return;
    }
    for (const [label, url] of targets) {
      await mainSuite(browser, url, localBase, label);
      await fallbackSuites(browser, url, port, localBase, label);
    }
    if (!only || only === "http") await otherSuites(browser, port, localBase);
  } finally {
    await browser.close();
    server.close();
  }
  console.log("\n" + passes + " passed, " + failures + " failed");
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
