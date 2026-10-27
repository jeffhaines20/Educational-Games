/*
 * Syntax & Sorcery — content registry.
 *
 * Loaded before every chapter file. Chapter files call SS.defineChapter({...})
 * and write Python with the SS.py`...` tag, which keeps backslashes exactly as
 * typed and strips the common indentation. See docs/DESIGN.md for the format.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});

  /** Strip a leading blank line, trailing whitespace and the common indentation. */
  function dedent(text) {
    var lines = String(text).replace(/\r\n?/g, "\n").split("\n");
    while (lines.length && lines[0].trim() === "") lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    var indent = null;
    lines.forEach(function (line) {
      if (line.trim() === "") return;
      var width = line.match(/^[ \t]*/)[0].length;
      if (indent === null || width < indent) indent = width;
    });
    return lines
      .map(function (line) { return line.trim() === "" ? "" : line.slice(indent || 0); })
      .join("\n");
  }

  /**
   * Tag for Python source: py`print("Hi\n")`. Backslashes are kept as typed.
   * Returns dedented code ending in a single newline (or "" if empty).
   */
  function py(strings) {
    if (arguments.length > 1) {
      throw new Error("SS.py`...` blocks must not contain ${...} interpolation");
    }
    var code = dedent(String.raw.apply(String, arguments));
    return code ? code + "\n" : "";
  }

  var DIFFICULTIES = {
    easy: { label: "Easy", xp: 10, icon: "🌱" },
    medium: { label: "Medium", xp: 20, icon: "🔥" },
    hard: { label: "Hard", xp: 30, icon: "🐉" }
  };

  var SCENE_EFFECTS = [
    "manifest",  // the spell's printed output appears as glowing letters
    "sparkle",   // a shower of sparkles
    "fire",      // flames flare up
    "bubble",    // a cauldron bubbles and changes colour
    "rise",      // the object levitates
    "shake",     // a rumble / something breaks open
    "portal",    // a swirling portal opens
    "lightning", // a crackle of lightning
    "bloom",     // plants grow and flowers open
    "frost"      // ice crystals form
  ];

  var CHARACTERS = {
    ada: { name: "Archmage Ada", icon: "🧙‍♀️", role: "Headmistress of Coilspire Academy and your mentor" },
    pip: { name: "Pip", icon: "🦉", role: "Your owl familiar, who offers hints" },
    glitch: { name: "Glitch", icon: "👾", role: "A mischievous gremlin who scrambles spells" },
    hydra: { name: "The Hydra", icon: "🐉", role: "The Hydra of Overlapping Subproblems" },
    narrator: { name: "", icon: "📜", role: "Narration" }
  };

  var content = (SS.content = SS.content || {
    chapters: [],
    challengesById: {},
    story: { prologue: [], epilogue: [] }
  });

  function fail(where, message) {
    throw new Error("[Syntax & Sorcery content] " + where + ": " + message);
  }

  /** Register a chapter and its challenges. Throws on obvious structural mistakes. */
  function defineChapter(chapter) {
    if (!chapter || typeof chapter.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(chapter.id)) {
      fail("defineChapter", "chapter.id must be a lowercase slug");
    }
    if (content.chapters.some(function (c) { return c.id === chapter.id; })) {
      fail(chapter.id, "duplicate chapter id");
    }
    if (!Array.isArray(chapter.challenges) || chapter.challenges.length === 0) {
      fail(chapter.id, "chapter.challenges must be a non-empty array");
    }
    chapter.challenges.forEach(function (challenge, index) {
      if (!challenge || typeof challenge.id !== "string") fail(chapter.id, "challenge #" + (index + 1) + " has no id");
      if (content.challengesById[challenge.id]) fail(challenge.id, "duplicate challenge id");
      if (!DIFFICULTIES[challenge.difficulty]) fail(challenge.id, "difficulty must be easy, medium or hard");
      challenge.chapterId = chapter.id;
      challenge.index = index;
      content.challengesById[challenge.id] = challenge;
    });
    content.chapters.push(chapter);
    content.chapters.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    return chapter;
  }

  /** Set (or extend) the prologue/epilogue dialogue. */
  function defineStory(story) {
    if (story.prologue) content.story.prologue = story.prologue;
    if (story.epilogue) content.story.epilogue = story.epilogue;
    Object.keys(story).forEach(function (key) {
      if (key !== "prologue" && key !== "epilogue") content.story[key] = story[key];
    });
    return content.story;
  }

  SS.dedent = dedent;
  SS.py = py;
  SS.DIFFICULTIES = DIFFICULTIES;
  SS.SCENE_EFFECTS = SCENE_EFFECTS;
  SS.CHARACTERS = CHARACTERS;
  SS.defineChapter = defineChapter;
  SS.defineStory = defineStory;
})(typeof window !== "undefined" ? window : globalThis);
