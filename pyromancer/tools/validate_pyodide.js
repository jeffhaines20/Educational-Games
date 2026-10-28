#!/usr/bin/env node
/*
 * Run every challenge through the REAL browser Python (Pyodide, under Node) —
 * the same engine players use — to catch differences from CPython.
 *
 *   bash tools/fetch_pyodide.sh            # once
 *   node tools/validate_pyodide.js         # all challenges
 *   node tools/validate_pyodide.js hydra   # one chapter or challenge id
 *
 * Checks, per challenge: solution + altSolutions pass; starter + wrongSolutions
 * don't. Also reports the slowest runs (the browser has an 8 s limit per cast).
 * Each run happens in a worker thread that is restarted if a run exceeds the
 * time limit, just like the game's runner.
 */
"use strict";
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");

const PYODIDE_DIR = path.join(__dirname, ".cache", "pyodide");
const TIME_LIMIT_MS = 8000;

if (!isMainThread) {
  // ---------------------------------------------------------------- worker side
  (async () => {
    const { loadPyodide } = require(path.join(PYODIDE_DIR, "pyodide.js"));
    const pyodide = await loadPyodide({ indexURL: PYODIDE_DIR + path.sep });
    pyodide.FS.writeFile("/home/pyodide/spellcheck.py", workerData.harness);
    pyodide.runPython("import sys\nsys.path.insert(0, '/home/pyodide')\nimport spellcheck");
    const rt = workerData.runtime || {};
    let run;
    if (workerData.setupPy) {
      // Exactly what the game's Web Worker does before each cast.
      pyodide.runPython(workerData.setupPy);
      const ssRun = pyodide.globals.get("_ss_run");
      run = (code, tests, inputs) => ssRun(code, tests, inputs, rt.outputLimit || 50000, rt.stepLimit, rt.recursionLimit);
    } else {
      const plain = pyodide.globals.get("spellcheck").run_spell_json;
      run = (code, tests, inputs) => plain(code, tests, inputs, 50000);
    }
    parentPort.postMessage({ type: "ready" });
    parentPort.on("message", (job) => {
      const started = Date.now();
      const json = run(job.code, job.tests, JSON.stringify(job.inputs || []));
      parentPort.postMessage({ type: "result", id: job.id, result: JSON.parse(json), ms: Date.now() - started });
    });
  })().catch((err) => parentPort.postMessage({ type: "fatal", error: String(err && err.stack || err) }));
  return;
}

// ------------------------------------------------------------------ main side
if (!fs.existsSync(path.join(PYODIDE_DIR, "pyodide.js"))) {
  console.error("Local Pyodide missing: run  bash tools/fetch_pyodide.sh");
  process.exit(2);
}
const data = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, "extract_content.js")], { maxBuffer: 64 << 20 }));
const only = process.argv[2];
let challenges = data.chapters.flatMap((c) => c.challenges);
if (only) challenges = challenges.filter((ch) => ch.id === only || ch.chapterId === only);
if (!challenges.length) { console.error("Nothing matches " + JSON.stringify(only)); process.exit(2); }

let worker = null;
let ready = null;
let nextId = 1;
const pending = new Map();

function startWorker() {
  worker = new Worker(__filename, { workerData: { harness: data.harness, setupPy: data.setupPy, runtime: data.runtime } });
  ready = new Promise((resolve, reject) => {
    worker.on("message", (msg) => {
      if (msg.type === "ready") resolve();
      else if (msg.type === "fatal") reject(new Error(msg.error));
      else if (msg.type === "result" && pending.has(msg.id)) {
        const { resolve: done, timer } = pending.get(msg.id);
        clearTimeout(timer);
        pending.delete(msg.id);
        done({ ...msg.result, ms: msg.ms });
      }
    });
    worker.on("error", reject);
  });
  return ready;
}

async function runSpell(code, tests, inputs) {
  await ready;
  const id = nextId++;
  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      pending.delete(id);
      await worker.terminate();
      startWorker();
      resolve({ status: "timeout", tests: [], ms: TIME_LIMIT_MS });
    }, TIME_LIMIT_MS);
    pending.set(id, { resolve, timer });
    worker.postMessage({ id, code, tests, inputs });
  });
}

function brief(r) {
  if (r.status === "passed" || r.status === "failed") return `${r.status} ${r.passed}/${r.total}`;
  const e = r.error || {};
  return r.status + (e.type ? ` (${e.type}: ${String(e.message).slice(0, 100)})` : "");
}

(async () => {
  const t0 = Date.now();
  await startWorker();
  console.log(`Pyodide ready in ${Date.now() - t0} ms — checking ${challenges.length} challenge(s)\n`);
  let errors = 0;
  const timings = [];
  for (const ch of challenges) {
    const problems = [];
    const inputs = ch.inputs || [];
    const sol = await runSpell(ch.solution, ch.tests, inputs);
    timings.push([sol.ms, ch.id]);
    if (sol.status !== "passed") problems.push("solution: " + brief(sol) + " " + (sol.tests || []).filter((t) => !t.passed).map((t) => t.name + ": " + t.message).join("; "));
    for (const t of sol.tests || []) if (t.crash) problems.push(`trial "${t.name}" crashed on the solution`);
    for (const [i, alt] of (ch.altSolutions || []).entries()) {
      const r = await runSpell(alt, ch.tests, inputs);
      if (r.status !== "passed") problems.push(`altSolutions[${i}]: ${brief(r)}`);
    }
    const starter = await runSpell(ch.starter, ch.tests, inputs);
    if (starter.status === "passed" || starter.status === "internal-error") problems.push("starter: " + brief(starter));
    let caught = 0;
    for (const [i, wrong] of (ch.wrongSolutions || []).entries()) {
      const r = await runSpell(wrong, ch.tests, inputs);
      if (r.status === "passed" || r.status === "internal-error") problems.push(`wrongSolutions[${i}]: ${brief(r)}`);
      else caught++;
    }
    errors += problems.length;
    console.log(`${problems.length ? "FAIL" : "ok  "}  ${ch.id.padEnd(34)} solution ${String(sol.ms).padStart(5)} ms   wrong caught ${caught}/${(ch.wrongSolutions || []).length}`);
    for (const p of problems) console.log("        ERROR " + p);
  }
  timings.sort((a, b) => b[0] - a[0]);
  console.log("\nSlowest solutions: " + timings.slice(0, 5).map(([ms, id]) => `${id} ${ms} ms`).join(", "));
  console.log(`${challenges.length} challenge(s), ${errors} error(s), ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await worker.terminate();
  process.exit(errors ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(2); });
