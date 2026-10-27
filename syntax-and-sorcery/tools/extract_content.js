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

const sandbox = { console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const file of files) {
  try {
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  } catch (err) {
    console.error(`Failed to load ${path.relative(root, file)}:\n${err.stack || err}`);
    process.exit(2);
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
      chapters: SS.content.chapters,
      story: SS.content.story,
      sceneEffects: SS.SCENE_EFFECTS,
      difficulties: SS.DIFFICULTIES,
      characters: SS.CHARACTERS,
      contentFiles: chapterFiles.map((name) => "js/content/" + name),
      indexScripts,
    },
    null,
    1
  )
);
