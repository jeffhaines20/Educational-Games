#!/usr/bin/env node
/*
 * Prints the game's content (chapters, challenges, story) and the Python
 * harness source as JSON, by evaluating the same JavaScript files the browser
 * loads. Used by validate_content.py and try_spell.py.
 *
 *   node tools/extract_content.js > content.json
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "js", "content");

const chapterFiles = fs
  .readdirSync(contentDir)
  .filter((name) => name.endsWith(".js") && name !== "registry.js")
  .sort();
const files = [
  path.join(root, "js", "engine", "harness.js"),
  path.join(contentDir, "registry.js"),
  ...chapterFiles.map((name) => path.join(contentDir, name)),
];
// Optional: the game's config and the runner's Python set-up, so validators can run
// spells exactly as the browser does (recursion limit, step limit, lru_cache…).
const engineFiles = [path.join(root, "js", "config.js"), path.join(root, "js", "engine", "runner.js")];

const sandbox = { console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// The harness and registry must load. A broken chapter file is reported (loadErrors)
// but does not stop the others, so several authors can work at the same time.
const loadErrors = [];
for (const file of files) {
  const rel = path.relative(root, file);
  try {
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  } catch (err) {
    if (!rel.startsWith(path.join("js", "content")) || rel.endsWith("registry.js")) {
      console.error(`Failed to load ${rel}:\n${err.stack || err}`);
      process.exit(2);
    }
    loadErrors.push({ file: rel, error: String((err && err.stack) || err).split("\n").slice(0, 4).join("\n") });
  }
}

for (const file of engineFiles) {
  try {
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  } catch (err) {
    console.error(`Warning: could not load ${path.relative(root, file)} (${err.message}); using harness defaults.`);
  }
}

// Which content files does index.html actually load? (Missing script tags are a common mistake.)
let indexScripts = null;
const indexPath = path.join(root, "index.html");
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, "utf8");
  indexScripts = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
}

const SS = sandbox.SS;
process.stdout.write(
  JSON.stringify(
    {
      harness: SS.HARNESS_PY,
      setupPy: (SS.PythonRunner && SS.PythonRunner.SETUP_PY) || null,
      runtime: {
        recursionLimit: (SS.config && SS.config.recursionLimit) || null,
        stepLimit: SS.config && typeof SS.config.stepLimit === "number" ? SS.config.stepLimit : null,
        outputLimit: (SS.config && SS.config.outputLimitChars) || 50000,
      },
      chapters: SS.content.chapters,
      story: SS.content.story,
      sceneEffects: SS.SCENE_EFFECTS,
      difficulties: SS.DIFFICULTIES,
      characters: SS.CHARACTERS,
      contentFiles: chapterFiles.map((name) => "js/content/" + name),
      indexScripts,
      loadErrors,
    },
    null,
    1
  )
);
