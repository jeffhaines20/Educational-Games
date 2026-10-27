# Syntax & Sorcery — Design & Developer Guide

*An apprentice wizard learns Python, data structures & algorithms, and object-oriented
programming by writing real Python "spells" that run in the browser.*

This document is the contract between everyone who builds or extends the game:
the engine, the user interface and the content (chapters & challenges). If code
and this document disagree, fix one of them.

---

## 1. Goals and hard constraints

1. **Zero install for players.** Open a link (or an uploaded HTML file) and play.
   Real CPython runs in the browser via [Pyodide](https://pyodide.org) loaded from a CDN.
2. **Works everywhere a teacher might put it:** a normal web server (GitHub Pages),
   an LMS iframe (Blackboard, Canvas, Moodle, D2L), a SCORM package, or a file
   opened straight from disk (`file://`). Therefore:
   * **No ES modules** (`<script type="module">` fails on `file://`). Every JS file is a
     classic script that attaches to the global namespace `window.SS`.
   * **No `fetch()`/XHR of local files** (blocked on `file://`). All content and the
     Python harness live in JS files.
   * **No build step is needed to play.** `tools/build.py` only produces convenience
     bundles in `dist/` (single HTML file, SCORM zip).
   * Every access to `localStorage`, `parent`, clipboard and downloads is wrapped in
     `try/catch` — sandboxed iframes throw.
3. **Progress is saved** automatically (localStorage), can be exported/imported as a
   "Save Scroll" (file or copy-paste code), and — when launched as a SCORM package —
   is stored by the LMS itself (and the score is reported to the gradebook).
4. **Real Python, honest feedback.** Players see Python's real error messages *and* a
   friendly explanation. Infinite loops never freeze the page (code runs in a Web
   Worker that is terminated on timeout).
5. **Vanilla web tech only:** HTML, CSS, ES2017 JavaScript. No frameworks, no bundlers.
   Third-party code from CDNs: Pyodide (required) and CodeMirror 5 (optional — a
   plain `<textarea>` editor is the fallback).
6. **Accessible and responsive:** keyboard-only play, visible focus, WCAG AA contrast,
   `prefers-reduced-motion` respected, usable from 360px wide (phones) up, and
   comfortable in an ~800px-wide LMS iframe.

---

## 2. File layout and ownership

```
syntax-and-sorcery/
  index.html                 UI       entry point; loads every script in order (§3)
  README.md                  lead     player + instructor guide (deployment, LMS)
  css/style.css              UI       all styles (one file; sections with comments)
  js/config.js               engine   SS.config (defaults + SS_CONFIG + URL overrides)
  js/engine/harness.js       lead     SS.HARNESS_PY — Python "spellcheck" module (§6)
  js/engine/runner.js        engine   SS.PythonRunner — Pyodide in a Web Worker (§5.2)
  js/engine/scorm.js         engine   SS.Scorm — SCORM 1.2 / 2004 adapter (§5.5)
  js/engine/save.js          engine   SS.Save — profiles, slots, export/import (§5.3)
  js/engine/progress.js      engine   SS.Progress — stars, XP, ranks, unlocks (§5.4)
  js/content/registry.js     lead     SS.py, SS.defineChapter, SS.defineStory (§7)
  js/content/story.js        content  prologue / epilogue dialogue
  js/content/ch1-tower.js    content  chapter 1  … one file per chapter …
  js/content/ch7-hydra.js    content  chapter 7
  js/ui/*.js                 UI       richtext, editor, effects, sound, screens, app
  tools/                     all      validators, dev server, build, browser tests
  scorm/imsmanifest.xml      engine   SCORM 1.2 manifest template
  dist/                      build    generated bundles (committed for teachers)
  docs/DESIGN.md             lead     this file
```

Agents working in parallel must only create/modify the files they own. If you need a
change in someone else's file, write it down in your final report instead.

---

## 3. Script loading order (index.html)

```html
<script>/* tiny inline recorder: notes any <script> that fails to load (e.g. a missing chapter file) */</script>
<script src="js/config.js"></script>
<script src="js/engine/harness.js"></script>
<script src="js/engine/runner.js"></script>
<script src="js/engine/scorm.js"></script>
<script src="js/engine/save.js"></script>
<script src="js/engine/progress.js"></script>
<script src="js/content/registry.js"></script>
<script src="js/content/story.js"></script>
<script src="js/content/ch1-tower.js"></script>
<script src="js/content/ch2-hall.js"></script>
<script src="js/content/ch3-circle.js"></script>
<script src="js/content/ch4-library.js"></script>
<script src="js/content/ch5-workshop.js"></script>
<script src="js/content/ch6-labyrinth.js"></script>
<script src="js/content/ch7-hydra.js"></script>
<script src="js/ui/…"></script>   <!-- UI files; app.js last, it boots the game on DOMContentLoaded -->
```

**The code editor** (CodeMirror 5 from cdnjs, with the Python mode and the
matchbrackets/closebrackets add-ons) is *not* a static script tag: `js/ui/editor.js`
loads it on demand, so a slow or blocked cdnjs never holds up the page. The editor
starts as a plain `<textarea>` (Tab indents, Ctrl/⌘+Enter casts) and upgrades in place
when CodeMirror arrives. `?editor=plain` in the URL, or `SS_CONFIG.plainEditor = true`,
keeps the plain editor (useful for screen-reader users and locked-down networks).

`tools/validate_content.py` fails if a `js/content/*.js` file is not referenced by
`index.html`. Fonts come from Google Fonts with system fallbacks (the game must look
fine if they are blocked).

---

## 4. Game design

### 4.1 Story bible

* **Setting:** *Coilspire Academy*, a wizard school built around a tower shaped like a
  coiled serpent. Magic is cast by speaking **Python**, "the serpent's tongue":
  magic does *exactly* what you say.
* **Archmage Ada** 🧙‍♀️ (she/her) — headmistress and your mentor. Warm, witty, precise.
  Tells the story of each challenge. Likes the word "precisely".
* **Pip** 🦉 — your owl familiar. Eager, kind, a little punny. Delivers hints
  (the UI shows hints as "🦉 Pip whispers…"; write the hints themselves as plain,
  helpful sentences).
* **Glitch** 👾 — a mischievous gremlin who scrambles spells (the original "bug").
  Comic, never scary. Causes trouble in chapters 2–6 and, at the end of chapter 6,
  accidentally wakes the Hydra.
* **The Hydra of Overlapping Subproblems** 🐉 — final boss. Cut off a head and two
  grow back (naive recursion explodes). It is defeated by *remembering* every head
  you've already faced (memoization / dynamic programming).
* **Tone:** whimsical, encouraging, inclusive, never condescending. Stories are short
  (players came to code). Clarity beats flavour in tasks, lessons and hints.
* **Epilogue:** the Hydra is tamed, Glitch apologises and becomes a friend, Ada
  names the player an Archmage.

### 4.2 Chapters (map regions)

| # | id | Title | Icon | Difficulty | Concepts introduced |
|---|----|-------|------|------------|---------------------|
| 1 | `tower` | The Apprentice's Tower | 🗼 | easy | `print`, strings, comments, variables, numbers & arithmetic (`+ - * / // % **`), f-strings, `input()`, `int()`/`float()`/`str()`, `len()`, `.upper()/.lower()` |
| 2 | `hall` | The Hall of Forking Paths | 🚪 | easy → medium | booleans, comparisons, `if/elif/else`, `and/or/not`, `while`, `for` + `range`, `break`, accumulator patterns, nested loops |
| 3 | `circle` | The Summoning Circle | 🔮 | easy → medium | `def`, parameters, `return` vs `print`, default & keyword arguments, scope, calling functions from functions, docstrings, first recursion |
| 4 | `library` | The Library of Infinite Shelves | 📚 | easy → hard | lists, indexing/slicing, list methods, tuples & unpacking, dicts, sets, `in`, comprehensions, `enumerate`/`zip`, `sorted(key=…)`, `lambda` |
| 5 | `workshop` | The Golem Workshop | 🗿 | medium → hard | classes, `__init__`, attributes, methods, `__str__`/`__repr__`, class attributes, inheritance & `super()`, overriding, polymorphism, `@property`, raising exceptions, magic methods (`__eq__`, `__lt__`, `__add__`, `__len__`, `__iter__`, `__contains__`), composition |
| 6 | `labyrinth` | The Labyrinth of Echoes | 🌀 | medium → hard | recursion on nested data, stacks, queues (`collections.deque`), linked lists, binary search, merge sort, hash-map tricks, BFS on grids/graphs, DFS / flood fill, Big-O intuition |
| 7 | `hydra` | The Hydra's Lair | 🐉 | hard | dynamic programming: memoization (`functools.lru_cache`, dict memo), tabulation, 1-D and 2-D DP (stairs, coins, grid paths, LCS, knapsack, edit distance, word break) |

A challenge may only *require* concepts from earlier chapters plus whatever its own
lesson teaches. Each chapter ends with its hardest challenge.

### 4.3 Difficulty

Every challenge is labelled **Easy 🌱**, **Medium 🔥** or **Hard 🐉**:

* **Easy** — one new idea applied directly; ~1–8 lines of code.
* **Medium** — combines two or three ideas, handles edge cases (empty input, ties…);
  ~8–20 lines.
* **Hard** — needs an algorithmic insight or real design (dynamic programming, graph
  search, recursive decomposition, a class hierarchy with magic methods); ~15–40 lines.

### 4.4 Progression rules (implemented in `SS.Progress`)

* Chapter 1 is open. Chapter *n* opens when every challenge in chapter *n − 1* is complete.
* Inside a chapter, challenge *i* opens when challenge *i − 1* is complete.
* **Free practice** (`unlockAll`, a setting, or `?unlock=all` in the URL) opens everything.
* **Stars per completion:** 3★ with no hints, 2★ with one hint, 1★ with two or more
  hints *or* after reading the Answer Scroll. A challenge keeps its best stars.
  Hints already revealed stay revealed (and keep counting) on later visits.
* **Answer Scroll:** after `config.answerScrollAfterFailedCasts` (default 3) casts that did
  not pass, the player may reveal the reference solution (1★ max). Disabled entirely
  with `config.allowAnswerScroll = false` or `?answers=off`.
* **XP** for a challenge = `round(DIFFICULTIES[d].xp × stars / 3)` with xp = 10 / 20 / 30
  for easy / medium / hard. XP is always *derived* from saved stars, never stored.
* **Ranks** by share of the maximum possible XP: Novice 0%, Apprentice 4%, Initiate 12%,
  Adept 25%, Conjurer 45%, Sorcerer 65%, Archmage 85%.

---

## 5. Engine APIs

All modules attach to `window.SS`. Public functions never throw for expected
problems (storage blocked, no SCORM API, user-code errors) — they degrade gracefully.

### 5.1 `SS.config` (js/config.js)

```js
SS.config = {
  title: "Syntax & Sorcery",
  version: "1.0.0",
  pyodideVersion: "0.29.5",
  pyodideBaseURLs: [                      // tried in order until one loads
    "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/",
    "https://unpkg.com/pyodide@0.29.5/"
  ],
  defaultTimeLimitMs: 8000,               // per cast; a challenge may set timeLimitMs
  outputLimitChars: 50000,
  saveSlots: 3,
  storageKey: "syntax-and-sorcery",       // localStorage key prefix
  allowAnswerScroll: true,
  answerScrollAfterFailedCasts: 3,
  unlockAll: false,
  scorm: { enabled: true, completionThreshold: 1.0 }   // share of challenges for "completed"
};
```

Overrides, applied in this order: defaults → `window.SS_CONFIG` (an object defined
*before* config.js loads; used by tests and by teachers who wrap the game) → URL
parameters: `?unlock=all`, `?answers=off`, and `?localPyodide=1` (only honoured when
the page is served from `localhost`/`127.0.0.1`; sets `pyodideBaseURLs` to
`["/pyodide/"]` for the dev server). **Never** accept script URLs from the query string.

### 5.2 `SS.PythonRunner` (js/engine/runner.js)

Runs Python in a dedicated Web Worker created from a Blob URL (works on `file://`).
The worker `importScripts()` Pyodide from the first working base URL, writes
`SS.HARNESS_PY` to `/home/pyodide/spellcheck.py`, imports it, and answers run requests
by calling `spellcheck.run_spell_json(code, trials, inputs_json, output_limit)`.

```js
SS.PythonRunner.init()            // start loading (idempotent) → Promise<void>; rejects if every CDN fails
SS.PythonRunner.isReady()         // → boolean
SS.PythonRunner.getStatus()       // → { state: "idle"|"loading"|"ready"|"busy"|"error", message }
SS.PythonRunner.onStatus(cb)      // cb(status) on every change → returns an unsubscribe function
SS.PythonRunner.run({ code, tests = "", inputs = [], timeLimitMs }) → Promise<RunResult>
SS.PythonRunner.restart()         // terminate + reload the worker → Promise<void>
```

`run()` never rejects because of the player's code. Runs are queued (one at a time).
The time limit starts when the worker begins that run. On timeout the worker is
terminated and restarted automatically, and the result is:

```js
{ status: "timeout", stdout: "", truncated: false, tests: [], passed: 0, total: 0,
  error: { type: "Timeout", message: "…", line: null, phase: "runtime", traceback: "",
           friendly: "Your spell ran for more than 8 seconds and the academy's wards stopped it…" } }
```

If Pyodide hits a fatal error (e.g. a JS stack overflow) the runner restarts the worker
and returns `status: "internal-error"`. Every result gets `durationMs`.

**RunResult** (from the harness, see §6):

```js
{
  status: "passed" | "failed" | "error" | "timeout" | "internal-error" | "ran",
  stdout: string,          // everything the spell printed (input() prompts + answers included)
  truncated: boolean,      // output hit the limit
  error: null | { type, message, line, phase: "syntax"|"runtime"|"trial"|"trials", traceback, friendly },
  tests: [ { name, passed, message, line, crash } ],
  passed: number, total: number, durationMs: number
}
```

`"ran"` means there were no trials (Practice Chamber). `error.friendly`, trial
`message`s and `stdout` are **untrusted text**: render with `textContent` or the
rich-text renderer (which escapes). `friendly`/`message` may contain `` `inline code` ``
in backticks — render that as code.

### 5.3 `SS.Save` (js/engine/save.js)

```js
SS.Save.init()                       // → Promise<{ storage: "local"|"memory", scorm: boolean, learnerName: string|null }>
SS.Save.storageWarning()             // → string|null  (e.g. "This browser is blocking saving…")
SS.Save.isScorm()                    // → boolean (one LMS-backed profile, no slots)
SS.Save.listSlots()                  // → Array<null | { slot, wizardName, completed, total, stars, xp, rankTitle, updatedAt }>
SS.Save.createProfile(slot, wizardName) → Profile      // overwrites the slot; becomes active
SS.Save.loadProfile(slot)            // → Profile|null; becomes active
SS.Save.deleteSlot(slot)
SS.Save.getProfile()                 // → active Profile|null
SS.Save.getLastSlot()                // → number|null (for a "Continue" button)
SS.Save.renameWizard(name)
SS.Save.saveDraft(challengeId, code)            // debounced
SS.Save.recordCast(challengeId, { passed })     // counts casts and failed casts
SS.Save.revealHint(challengeId)                 // → hintsUsed after the increment
SS.Save.revealAnswer(challengeId)
SS.Save.recordCompletion(challengeId, { code }) // → { firstTime, previousStars, stars, xpGained }
SS.Save.markSeen(key) / SS.Save.hasSeen(key)    // "prologue", "chapter:tower", "outro:tower", "epilogue", "tutorial"…
SS.Save.getSettings() / SS.Save.updateSettings(partial)
SS.Save.getPracticeCode() / SS.Save.savePracticeCode(code)
SS.Save.exportCode()                 // → "SNS1." + base64url(JSON) — compact: no drafts/code
SS.Save.exportFile()                 // download JSON (everything); → false if downloads are blocked
SS.Save.importData(textOrCode, slot) // accepts a save code or file contents; → Profile; throws Error(friendly message)
SS.Save.onChange(cb)                 // → unsubscribe
SS.Save.flush()                      // persist immediately (called on pagehide/visibilitychange)
```

**Profile**

```js
{
  version: 1, id, wizardName, createdAt, updatedAt,
  challenges: { [challengeId]: { completed, stars, casts, failedCasts, hintsUsed,
                                 answerRevealed, draft, bestCode, completedAt } },
  seen: { [key]: true },
  settings: { sound: true, reduceMotion: false, editorFontSize: 15, unlockAll: false },
  practiceCode: string, lastChallengeId: string|null
}
```

Storage: one JSON document per slot under `"<storageKey>:slot:<n>"`, plus
`"<storageKey>:lastSlot"`. If localStorage is unavailable, keep everything in memory
and expose a `storageWarning()` telling the player to use the Save Scroll.
In SCORM mode: a single profile; compact progress (stars, hints, flags, name, seen,
settings) goes to `suspend_data` (≤ 4096 chars for SCORM 1.2); drafts and code stay
in localStorage keyed by learner id. On init, LMS data wins, merged with local data by
taking the best of each challenge. After every completion: update score
(`round(100 × completed / total)`), status (`completed` at the configured threshold,
otherwise `incomplete`) and commit.

### 5.4 `SS.Progress` (js/engine/progress.js)

Pure functions over `SS.content` and a profile (no DOM, no storage):

```js
SS.Progress.starsFor({ hintsUsed, answerRevealed })      // → 1..3
SS.Progress.xpFor(challenge, stars)                      // → integer
SS.Progress.totalXp(profile) / SS.Progress.maxXp()
SS.Progress.rankFor(xp)    // → { index, title, icon, minXp, nextTitle, nextXp, fraction } (fraction = progress to next rank)
SS.Progress.RANKS          // [{ title, icon, share }]
SS.Progress.isChapterUnlocked(profile, chapterId)
SS.Progress.isChallengeUnlocked(profile, challengeId)
SS.Progress.chapterStats(profile, chapterId)   // → { completed, total, stars, maxStars, complete }
SS.Progress.overallStats(profile)              // → { completed, total, stars, maxStars, xp, maxXp, percent }
SS.Progress.nextChallenge(profile, challengeId)// → next challenge object (same or next chapter) or null
SS.Progress.firstIncomplete(profile)           // → where "Continue" should take the player
SS.Progress.unlockAll(profile)                 // → boolean (setting OR config)
```

### 5.5 `SS.Scorm` (js/engine/scorm.js)

Finds the SCORM API (`API` for 1.2, `API_1484_11` for 2004) by walking `window.parent`
(and `window.opener`) up to 10 levels, each step in `try/catch` (cross-origin
parents throw). Wraps Initialize/GetValue/SetValue/Commit/Terminate for both versions:

```js
SS.Scorm.connect()            // → boolean (found + initialized)
SS.Scorm.isActive() / SS.Scorm.version   // "1.2" | "2004" | null
SS.Scorm.getLearner()         // → { id, name }  (name "Last, First" → "First Last")
SS.Scorm.loadSuspendData() / SS.Scorm.saveSuspendData(text)
SS.Scorm.reportProgress({ completed, total })   // score raw/min/max + status
SS.Scorm.commit() / SS.Scorm.finish()           // finish on pagehide
```

### 5.6 Build & distribution (tools/build.py — engine)

`python3 tools/build.py` writes:

* `dist/syntax-and-sorcery.html` — single file: `index.html` with every local CSS/JS
  file inlined (CDN links stay as links). Must work when opened from disk.
* `dist/syntax-and-sorcery-scorm.zip` — SCORM 1.2 package: `imsmanifest.xml` +
  `index.html` (the single-file build) at the zip root.

Standard library only. Deterministic output (fixed zip timestamps).

---

## 6. The trial harness (`spellcheck`, js/engine/harness.js)

`run_spell(source, trials, inputs)`:

1. Compiles the spell (`<spell>`). Syntax errors → `status: "error"`, `phase: "syntax"`.
2. Runs it with stdout/stderr captured (capped at 50 000 characters — a runaway
   `print` loop is stopped with a friendly message) and `input()` answered from the
   challenge's `inputs` list (each answer is echoed after its prompt, like a terminal).
   An exception → `status: "error"`, `phase: "runtime"`. Trials do not run.
3. Runs the trial code (`<trials>`) in a separate namespace; it registers trials with
   `@test("…")`. Each trial runs independently, in order. A trial passes if it returns
   without raising.
4. `status` is `"passed"` when every trial passes, else `"failed"`. Broken trial code
   (fails to load, or registers no trials) → `"internal-error"`.

**Step limits.** The spell's main run and each trial may take at most 2,000,000 *steps*
(loop iterations + function calls inside the spell, counted with `sys.monitoring`), so
a runaway loop ends in about a second with a friendly `TooManySteps` error and the
line it was stuck on — instead of hitting the runner's timeout. The heaviest reference
solution uses ~55,000 steps. Trials can set tighter limits with `step_limit()`.

### 6.1 Writing trials — the helper API

Inside trial code these names are available:

| Name | Purpose |
|------|---------|
| `@test("name")` | Register a trial. The name is shown to the player — write it as a check: `"fib(10) returns 55"`. |
| `output`, `output_lines` | What the spell printed in its main run (raw text / normalised lines). |
| `spell`, `source`, `inputs` | The spell's global namespace dict, its source code, the input list. |
| `expect(cond, message)` | Fail with `message` unless `cond` is truthy. |
| `expect_equal(actual, expected, message=None)` | Equality with an automatic "Expected …, but got …" (+ type and missing-`return` hints). |
| `expect_close(actual, expected, tolerance=1e-6, message=None)` | Floats. |
| `expect_output(expected, actual=None, message=None)` | Compare printed text (`str` or list of lines) with the main run's output (or `actual`). Ignores trailing spaces/blank lines; explains the first differing line, with capitalisation/spacing/punctuation hints. |
| `expect_in_output(text, actual=None, message=None)` | Substring check on printed text. |
| `expect_raises(ExcType, func, *args, message=None, **kwargs)` | The call must raise. Returns the exception. |
| `fail(message)` | Fail immediately. |
| `need(name)` | Fetch a top-level name from the spell or fail ("Your spell needs to create `name`…"). |
| `need_function(name, params=None)` | …must be a function (callable with `params` positional args, if given). |
| `need_class(name, parent=None)` | …must be a class (optionally a subclass of `parent`, a name or class). |
| `need_method(obj_or_cls, name)`, `need_attr(obj, name)`, `has_own_method(cls, name)` | OOP checks. |
| `capture(func, *args, **kwargs)` | Call and return `(result, printed_text)`. |
| `run_program(inputs=[])` | Re-run the *whole spell* in a fresh namespace with other inputs; returns its printed text. Crashes become friendly failures. Use this to test several input cases for programs without functions. |
| `step_limit(limit, message=None)` | Context manager. Fails the trial if the spell takes more than `limit` *steps* (loop iterations + function calls inside the spell) within the block — e.g. to tell an O(n) answer from an O(n²) one. `with step_limit(20000) as steps: …; steps.used` |
| `count_calls(name, limit=None, message=None)` | Context manager. Replaces the spell's top-level function `name` with a counting wrapper (recursive calls go through it too). Exceeding `limit` fails the trial with `message` (a default memoization hint otherwise). `with count_calls("fib", limit=300) as calls: …; calls.count` |
| `uses_call(name)` | The spell calls a function/method named `name` somewhere (e.g. forbid `sorted`). |
| `uses_syntax(kind)` | `"for"`, `"while"`, `"if"`, `"def"`, `"class"`, `"lambda"`, `"listcomp"`, `"dictcomp"`, `"setcomp"`, `"genexp"`, `"comprehension"`, `"fstring"`, `"import"`, `"try"`, `"with"`, `"return"`, `"yield"`, `"augassign"`, `"slice"`, `"assert"`, `"raise"`, `"break"`, `"continue"`, `"global"`, `"dict"`, `"list"`, `"set"`, `"tuple"`. |
| `is_recursive(name)` | The function/method `name` calls itself. |
| `code(text)` | Wrap text in backticks for inline-code formatting. (Trial code is written inside a JS template, so a literal backtick character cannot be typed — use `code()`.) |
| `short(value)` | Shortened `repr()` for messages. |

Exceptions raised by the spell *during* a trial become a failed trial with the error
type, line and friendly explanation. Exceptions raised by the trial code itself (e.g.
`len(result)` when the spell returned `None`) become a failed trial flagged `crash` —
write trials defensively (check types with `expect` first) so this never happens for
reasonable wrong answers.

### 6.2 Example

```js
tests: py`
    @test("fib(0) is 0 and fib(1) is 1")
    def _():
        fib = need_function("fib", 1)
        expect_equal(fib(0), 0, "fib(0) should be 0.")
        expect_equal(fib(1), 1, "fib(1) should be 1.")

    @test("fib(30) is 832040 — without waking the Hydra")
    def _():
        with count_calls("fib", limit=400, message="The Hydra grew too many heads! Your fib was called over 400 times. Remember answers you've already found."):
            expect_equal(need_function("fib")(30), 832040)
`,
```

---

## 7. Content format

### 7.1 Chapter files

One file per chapter, wrapped in an IIFE:

```js
(function () {
  "use strict";
  var py = SS.py;
  SS.defineChapter({
    id: "tower",                       // slug; challenge ids start with "<id>-"
    order: 1,
    title: "The Apprentice's Tower",
    subtitle: "First words of power",
    icon: "🗼",
    concepts: ["print()", "strings", …],  // shown on the map/chapter screen
    intro: RichText,                   // shown when the chapter is first opened
    outro: RichText,                   // shown when the chapter is completed
    challenges: [ Challenge, … ]       // in play order, easiest first
  });
})();
```

### 7.2 Challenge objects

```js
{
  id: "tower-first-words",            // kebab-case, unique, prefixed with the chapter id
  title: "The First Words",
  difficulty: "easy",                 // "easy" | "medium" | "hard"
  concepts: ["print()", "strings"],   // 1–4 short tags
  story: RichText,                    // 1–3 short paragraphs (≤ 70 words) in Ada's voice
  task: RichText,                     // exact instructions: names, parameters, return vs print,
                                      //   output format, an example; ≤ 120 words + blocks
  lesson: RichText,                   // the "Spell Scroll": teaches what's needed, with examples
                                      //   that are NOT the solution; 80–250 words + 1–3 code blocks
  starter: py`…`,                     // initial editor content; must NOT pass the trials
  inputs: ["Morgana"],                // optional: answers for input() during the cast
  hints: [RichText, RichText, RichText], // 2–4, progressive: nudge → approach → nearly the answer
  solution: py`…`,                    // reference solution (idiomatic, commented if subtle)
  altSolutions: [py`…`],              // optional: other valid approaches — must pass
  wrongSolutions: [py`…`],            // 1–3 common mistakes — must FAIL (proves the trials)
  tests: py`…`,                       // trial code (§6)
  scene: { icon: "📜", successIcon: "✨", successText: "Glowing letters blossom!", effect: "manifest" },
  timeLimitMs: 8000                   // optional
}
```

`scene.effect` ∈ `manifest` (the printed output appears as glowing letters), `sparkle`,
`fire`, `bubble` (a cauldron), `rise` (levitation), `shake` (rumble / break open),
`portal`, `lightning`, `bloom` (plants grow), `frost`.

### 7.3 Writing Python inside JS — the `py` tag

Use ``py`…` `` for every piece of Python (starter, solution, tests, alt/wrong solutions,
lesson code blocks). It keeps backslashes exactly as typed (`"\n"` stays a Python
escape) and removes the common indentation, so you can indent naturally. Rules:

* Never write `${` inside a `py` block (it would be JS interpolation — the registry throws).
* Never write a backtick inside a `py` block. In trial messages use `code("fib")`.
* Python indentation must be consistent *relative to the least-indented line*.

### 7.4 RichText

A **RichText** value is a string (one paragraph) or an array of blocks:

| Block | Renders as |
|-------|------------|
| `"text"` | a paragraph |
| `{ code: py`…` }` | a read-only, highlighted Python example |
| `{ code: py`…`, output: "…" }` | an example plus the output it prints |
| `{ output: "…" }` | an "expected output" panel |
| `{ diagram: py`…` }` | a monospace text picture or table (stack drawings, mazes, DP tables), shown exactly as written with no Python colouring |
| `{ list: ["…", "…"] }` | bullet list |
| `{ steps: ["…", "…"] }` | numbered list |
| `{ tip: "…" }` | 💡 tip box |
| `{ warning: "…" }` | ⚠️ caution box |

Inline markup inside any text: `` `code` ``, `**bold**`, `*italic*`. Everything else is
escaped — no HTML. Write normal JS strings (double quotes) for text; backticks are fine
there.

### 7.5 Story (js/content/story.js)

```js
SS.defineStory({
  prologue: [ { speaker: "narrator", text: RichText }, { speaker: "ada", text: … }, … ],  // 4–7 panels
  epilogue: [ … ]                                                                          // 3–6 panels
});
```

Speakers: `ada`, `pip`, `glitch`, `hydra`, `narrator` (see `SS.CHARACTERS`).

### 7.6 Quality bar for every challenge

* The task names everything the trials check (function/class/method names, parameter
  order, return vs print, exact output format) and shows at least one example.
* Trials go from the simplest case to edge cases; 3–6 trials; names read like checks;
  failure messages say what was expected and, when useful, what to look at.
* Trials accept any correct approach (verify with `altSolutions`), and catch the common
  mistakes (verify with `wrongSolutions`).
* Don't demand exact `input()` prompts — check the meaningful lines of output.
* Don't test float formatting unless the lesson teaches it; use `expect_close` or `round`.
* Efficiency requirements (DP!) are enforced with `count_calls` limits that comfortably
  admit memoized/bottom-up solutions, plus inputs large enough that a naive solution
  cannot finish in time.
* Reference solutions run in well under a second in CPython (the browser is ~2× slower).
* Hints: first a nudge, then the approach, finally something very close to the code.
* Lessons teach; they don't hand over the solution.

Run `python3 tools/validate_content.py` (all) or `… <chapter-or-challenge-id>` until it
reports 0 errors. Try other answers with `python3 tools/try_spell.py <id> file.py`.

---

## 8. User interface

### 8.1 Visual identity

Night-sky arcane academy: deep indigo/violet backgrounds with a subtle starfield,
gold accents for headings and stars, glowing teal for "magic"/code highlights,
parchment-toned cards for story/lesson text. Display font **Cinzel** for titles,
**Inter** (or system UI) for text, **JetBrains Mono** (or monospace) for code. Emoji
are used as illustrations (chapter icons, characters, scenes) — always with text labels
or `aria-label`s. Animations are tasteful and short, and disabled under
`prefers-reduced-motion` or the in-game setting.

### 8.2 Screens

1. **Title** — logo, tagline, starfield, "Begin" / "Continue as ⟨name⟩"; Python engine
   status chip (loading starts immediately on page load).
2. **Save slots** — 3 slots (name, rank, progress, last played) with Continue / New /
   Delete (confirm) and **Import Save Scroll** (file or pasted code). Skipped in SCORM
   mode (one LMS profile; ask for a wizard name the first time, default = learner's
   first name).
3. **Prologue** — dialogue panels (`story.prologue`), skippable, shown once per profile.
4. **Map** — the academy grounds with the 7 chapter locations joined by a path;
   lock / progress / stars per location; header with wizard name, rank badge and XP
   bar; buttons: Grimoire, Practice Chamber, Save Scroll, Settings, sound toggle.
5. **Chapter** — intro (first visit), list of challenge cards (number, title,
   difficulty badge, concept chips, stars, lock), chapter progress.
6. **Challenge** — the core screen:
   * header: back to map/chapter, chapter › challenge title, difficulty, best stars;
   * left: **scene** (icon + effect stage), **story** (Ada portrait), **Your Task**,
     **Spell Scroll** (lesson, collapsible, open by default on first visit), input
     notice (if `inputs`), **Pip's hints** (reveal one at a time, with the star cost shown);
   * right: **editor** (Python highlighting, line numbers, 4-space indent, Tab/Shift-Tab,
     error-line highlight, font size from settings), buttons **✨ Cast Spell**
     (Ctrl/⌘+Enter), **Reset** (confirm), **Answer Scroll** (when available);
     **Scrying Pool** (printed output; errors show the friendly explanation, the line,
     and Python's real traceback); **Trials** list (✓/✗, name, message);
   * success → scene effect + "Spell Mastered!" dialog: stars, XP gained, rank-up,
     Next / Map / Stay. First completion of a chapter → outro + "new area unlocked".
     Completing the last chapter → epilogue + printable certificate.
   * drafts autosave; reopening shows the draft (else best code, else starter).
7. **Grimoire** — mastered spells by chapter with the player's code (copy button),
   stats, and a printable **Progress Report** (name, date, rank, per-challenge stars) for
   teachers who don't use SCORM.
8. **Practice Chamber** — free editor + Run + optional inputs box + output; no trials.
9. **Settings** — sound, reduce motion, editor font size, free practice, rename wizard,
   about/credits.

### 8.3 Behaviour details

* Engine status always visible; Cast is disabled (with a reason) until Python is ready,
  and while a cast is running ("Casting…").
* Results announce through an `aria-live` region ("2 of 3 trials passed").
* Untrusted strings (wizard names, output, errors, trial messages) are inserted with
  `textContent` or the escaping rich-text renderer — never raw `innerHTML`.
* Modals trap focus, close on Esc, return focus to the opener.
* Works with the CodeMirror CDN blocked (textarea fallback with Tab indentation).
* Layout: two columns ≥ 1000px; stacked below; the editor stays at least 240px tall.

---

## 9. Testing

* `python3 tools/validate_content.py` — structure + every solution/starter/alt/wrong.
* `python3 tools/try_spell.py <challenge-id> <file.py>` — run any attempt.
* `node tools/validate_pyodide.js [id]` — the same solution/starter/wrong checks in the real
  browser Python (Pyodide under Node), with timings; needs `tools/fetch_pyodide.sh` first.
* `bash tools/fetch_pyodide.sh` — cache Pyodide locally for browser tests.
* `node tools/dev_server.js 8000` — serve the game; `?localPyodide=1` uses the cache.
* `node tools/e2e/<test>.js` — Playwright scripts; `tools/e2e/lib.js` provides
  `openGame()` (injects a local Pyodide via `SS_CONFIG`) and `waitForPython()`.
