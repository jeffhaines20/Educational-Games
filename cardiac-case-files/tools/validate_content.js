#!/usr/bin/env node
/*
 * The Cardiac Case Files — content validator.
 *
 *   node tools/validate_content.js              # check everything; exit 1 on any error
 *   node tools/validate_content.js u3-rhythm    # only report problems whose location mentions "u3-rhythm"
 *   node tools/validate_content.js --quiet      # errors only (no warnings)
 *   node tools/validate_content.js --dump coronary-snow-shoveler   # print one case as JSON
 *
 * It loads js/content/*.js in index.html's order inside a sandbox (exactly as the browser
 * would), then runs the registry's checks (js/content/registry.js) plus a few that need
 * the whole picture: every content file is referenced by index.html, the cases match
 * docs/CASE-PLAN.md (ids, units, order, difficulty), hints don't give the answer away, and
 * the correct option isn't always the longest one.
 *
 * Other tools can reuse the loader:  const { loadContent } = require("./validate_content.js");
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "js", "content");

function contentScriptsFromIndex() {
  const index = path.join(ROOT, "index.html");
  if (!fs.existsSync(index)) return null;
  const html = fs.readFileSync(index, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const out = [];
  const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1].split("?")[0];
    if (/^js\/content\/[^/]+\.js$/.test(src)) out.push(src.slice("js/content/".length));
  }
  return out;
}

function defaultOrder() {
  const all = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".js")).sort();
  const first = ["registry.js", "story.js", "reference.js"].filter((f) => all.includes(f));
  return first.concat(all.filter((f) => !first.includes(f)));
}

/** Run the content files in a sandbox. Returns { CCF, content, files, loadErrors, indexOrder }. */
function loadContent() {
  const indexOrder = contentScriptsFromIndex();
  const files = indexOrder && indexOrder.length ? indexOrder : defaultOrder();
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const loadErrors = [];
  for (const f of files) {
    const full = path.join(CONTENT_DIR, f);
    if (!fs.existsSync(full)) { loadErrors.push({ where: f, message: "is referenced by index.html but doesn't exist" }); continue; }
    sandbox.__CCF_FILE__ = f;
    try {
      vm.runInContext(fs.readFileSync(full, "utf8"), sandbox, { filename: f });
    } catch (err) {
      loadErrors.push({ where: f, message: "failed to run: " + (err && err.stack ? err.stack.split("\n").slice(0, 3).join(" | ") : err) });
    }
  }
  const CCF = sandbox.CCF;
  if (!CCF || !CCF.content) throw new Error("js/content/registry.js did not define CCF.content");
  CCF.content.finalize();
  return { CCF, content: CCF.content, files, loadErrors, indexOrder };
}

function readPlan() {
  const planPath = path.join(ROOT, "docs", "CASE-PLAN.md");
  if (!fs.existsSync(planPath)) return [];
  const re = /^###\s+(\d+)\.(\d+)\s+`([a-z0-9-]+)`\s+·\s+(easy|medium|hard)\b/gm;
  const out = [];
  const text = fs.readFileSync(planPath, "utf8");
  let m;
  while ((m = re.exec(text))) out.push({ unitOrder: +m[1], order: +m[2], id: m[3], difficulty: m[4] });
  return out;
}

function textOf(rich) {
  if (rich == null) return "";
  if (typeof rich === "string") return rich;
  if (Array.isArray(rich)) return rich.map(textOf).join(" ");
  if (typeof rich === "object") return Object.keys(rich).map((k) => textOf(rich[k])).join(" ");
  return String(rich);
}

function extraChecks(content, errors, warnings, files, indexOrder) {
  // 1. Every content file is referenced by index.html (once index.html exists).
  if (indexOrder) {
    const onDisk = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".js"));
    onDisk.forEach((f) => {
      if (!indexOrder.includes(f)) errors.push({ where: f, message: "is not loaded by index.html (add a <script> tag)" });
    });
  } else {
    warnings.push({ where: "index.html", message: "not found yet — loaded js/content/*.js in default order" });
  }

  // 2. Cases match the plan.
  const plan = readPlan();
  const units = content.units();
  plan.forEach((p) => {
    const k = content.getCase(p.id);
    const unit = units.find((u) => u.order === p.unitOrder);
    if (!k) { warnings.push({ where: "plan " + p.unitOrder + "." + p.order, message: "case " + p.id + " is not written yet" }); return; }
    if (unit && k.unit !== unit.id) errors.push({ where: "case " + p.id + " [" + k._file + "]", message: "is in unit " + k.unit + "; the plan puts it in " + unit.id });
    if (k.order !== p.order) errors.push({ where: "case " + p.id + " [" + k._file + "]", message: "has order " + k.order + "; the plan says " + p.order });
    if (k.difficulty !== p.difficulty) errors.push({ where: "case " + p.id + " [" + k._file + "]", message: "is " + k.difficulty + "; the plan says " + p.difficulty });
  });
  content.cases().forEach((k) => {
    if (plan.length && !plan.some((p) => p.id === k.id)) warnings.push({ where: "case " + k.id + " [" + k._file + "]", message: "is not in docs/CASE-PLAN.md" });
  });

  // 3. Per-case quality heuristics.
  content.cases().forEach((k) => {
    const where = "case " + k.id + " [" + k._file + "]";
    let singles = 0, longest = 0;
    (k.steps || []).forEach((s) => {
      const sw = where + " → " + s.id;
      if (s.type === "single" || s.type === "test") {
        const opts = s.options || [];
        const right = opts.find((o) => o.correct);
        if (right) {
          singles++;
          const others = opts.filter((o) => o !== right).map((o) => (o.text || "").length);
          if (others.length && right.text.length > Math.max.apply(null, others)) longest++;
          const answer = right.text.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
          const answerRe = new RegExp("\\b" + answer.replace(/\s+/g, "\\s+") + "\\b");
          (s.hints || []).forEach((h, i) => {
            if (answer.length > 12 && answerRe.test(h.toLowerCase().replace(/[^a-z0-9 ]/g, ""))) {
              warnings.push({ where: sw + " → hints[" + i + "]", message: "contains the correct answer word for word" });
            }
          });
        }
      }
      if (s.type === "numeric" && s.tolerance === 0 && Math.round(s.answer) !== s.answer) {
        warnings.push({ where: sw, message: "a tolerance of 0 on a non-integer answer is very strict" });
      }
      const promptText = textOf(s.prompt);
      if (promptText.length > 900) warnings.push({ where: sw, message: "the prompt is long (" + promptText.length + " characters); move details into the file or an update" });
    });
    if (singles >= 3 && longest / singles >= 0.75) {
      warnings.push({ where, message: "the correct option is the longest one in " + longest + " of " + singles + " single-choice steps — vary the lengths" });
    }
    const meds = (k.file && k.file.medications) || [];
    if (k.difficulty !== "easy" && meds.some((m) => m["class"])) {
      warnings.push({ where, message: "medium/hard cases list medication names only (the player looks the class up in the Casebook)" });
    }
  });

  // 4. Titles unique.
  const titles = {};
  content.cases().forEach((k) => {
    if (titles[k.title]) warnings.push({ where: "case " + k.id, message: "has the same title as " + titles[k.title] });
    titles[k.title] = k.id;
  });
}

function main(argv) {
  const args = argv.slice(2);
  const quiet = args.includes("--quiet");
  const dumpAt = args.indexOf("--dump");
  if (dumpAt >= 0) {
    const { content } = loadContent();
    const k = content.getCase(args[dumpAt + 1]);
    if (!k) { console.error("No case " + args[dumpAt + 1]); return 1; }
    console.log(JSON.stringify(k, null, 2));
    return 0;
  }
  const filter = args.find((a) => !a.startsWith("--"));
  const { content, files, loadErrors, indexOrder } = loadContent();
  const errors = loadErrors.concat(content.errors);
  const warnings = content.warnings.slice();
  extraChecks(content, errors, warnings, files, indexOrder);

  const keep = (m) => !filter || m.where.includes(filter);
  const shownErrors = errors.filter(keep);
  const shownWarnings = quiet ? [] : warnings.filter(keep);

  console.log("The Cardiac Case Files — content check" + (filter ? " (filter: " + filter + ")" : ""));
  console.log("Files: " + files.join(", "));
  console.log("");
  const units = content.units();
  units.forEach((u) => {
    const list = content.cases(u.id);
    const by = { easy: 0, medium: 0, hard: 0 };
    list.forEach((k) => { by[k.difficulty]++; });
    console.log("  " + u.order + ". " + u.title.padEnd(16) + String(list.length).padStart(2) + " cases  (easy " + by.easy + ", medium " + by.medium + ", hard " + by.hard + ")");
  });
  const total = content.cases().length;
  const kinds = {};
  content.entries().forEach((e) => { kinds[e.kind] = (kinds[e.kind] || 0) + 1; });
  console.log("  Total: " + total + " cases; Casebook: " + content.entries().length + " entries " + JSON.stringify(kinds) + "; story: " + (content.story ? "yes" : "no"));
  console.log("");

  if (shownErrors.length) {
    console.log("ERRORS (" + shownErrors.length + ")");
    shownErrors.forEach((e) => console.log("  ✗ " + e.where + ": " + e.message));
    console.log("");
  }
  if (shownWarnings.length) {
    console.log("Warnings (" + shownWarnings.length + ")");
    shownWarnings.forEach((w) => console.log("  ! " + w.where + ": " + w.message));
    console.log("");
  }
  console.log(shownErrors.length ? "FAILED — " + shownErrors.length + " error(s)." : "OK — no errors" + (shownWarnings.length ? " (" + shownWarnings.length + " warning(s))." : "."));
  return shownErrors.length ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv));
module.exports = { loadContent, readPlan };
