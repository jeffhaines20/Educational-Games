# 🧙 Syntax & Sorcery

*An apprentice's guide to the Pythonic arts.*

**Syntax & Sorcery** is a story-driven browser game in which students become wizards by
writing **real Python**. Every spell is Python code: to make "Hello world" magically
appear on the page, you cast `print("Hello world")`. Spells are checked by *trials*
(automated tests), mistakes are explained in plain language, and the journey runs from
first `print()` all the way to **dynamic programming**.

* **No installation, no accounts.** Python runs inside the browser (via [Pyodide](https://pyodide.org)).
* **Built for classrooms and LMSs** — share a link, embed it, upload one HTML file, or
  upload a **SCORM package** that saves progress in the LMS and reports a score.
* **Progress saves automatically**, and students can carry it between computers with a
  *Save Scroll*.

---

## What students learn

| Chapter | Location | Topics | Difficulty |
|---|---|---|---|
| 1 | 🗼 The Apprentice's Tower | `print`, strings, variables, arithmetic, f-strings, `input()` | 🌱 Easy |
| 2 | 🚪 The Hall of Forking Paths | booleans, `if/elif/else`, `while`, `for`/`range`, `break` | 🌱 Easy → 🔥 Medium |
| 3 | 🔮 The Summoning Circle | functions, parameters, `return`, default arguments, first recursion | 🌱 Easy → 🔥 Medium |
| 4 | 📚 The Library of Infinite Shelves | lists, tuples, dictionaries, sets, comprehensions, sorting with `key` | 🌱 Easy → 🐉 Hard |
| 5 | 🗿 The Golem Workshop | classes, objects, methods, inheritance, polymorphism, magic methods | 🔥 Medium → 🐉 Hard |
| 6 | 🌀 The Labyrinth of Echoes | recursion, stacks, queues, linked lists, binary search, merge sort, BFS | 🔥 Medium → 🐉 Hard |
| 7 | 🐉 The Hydra's Lair | dynamic programming: memoization, tabulation, coins, grids, LCS, knapsack, edit distance | 🐉 Hard |

Every challenge is labelled **Easy**, **Medium** or **Hard**. Each one includes a short
story, a precise task, a *Spell Scroll* lesson that teaches the concept, three
progressive hints from Pip the owl, and trials that check the spell.

---

## Playing

**Online:** open the game's link (see *Hosting* below), e.g.
`https://jeffhaines20.github.io/Educational-Games/syntax-and-sorcery/`

**From a file:** download [`dist/syntax-and-sorcery.html`](dist/syntax-and-sorcery.html) and double-click it.

**Requirements:** a current version of Chrome, Edge, Firefox or Safari, and internet access
to `cdn.jsdelivr.net` (the Python engine, about 12 MB the first time, then cached by the
browser). The code editor and fonts come from `cdnjs.cloudflare.com` and Google Fonts; if
those are blocked the game still works with a plain editor and system fonts.

### How a challenge works

1. Read the story and **Your Task**. Open the **Spell Scroll** to learn what you need.
2. Write your spell in the editor and press **✨ Cast Spell** (or **Ctrl/⌘ + Enter**).
3. The **Scrying Pool** shows what your spell printed. If something went wrong you see a
   friendly explanation *and* Python's real error message, and the line is highlighted.
4. The **Trials** list shows which checks passed. Pass them all to master the spell.

**Stars:** ★★★ without hints, ★★ with one hint, ★ with more hints. After three unsuccessful
casts you may read the *Answer Scroll* (worth ★). **XP** and **wizard ranks** (Novice →
Archmage) grow as you master spells. Finish every spell in a chapter to unlock the next.
The **Practice Chamber** is a free sandbox, and the **Grimoire** keeps every spell you've
mastered.

---

## Saving progress

* Progress is saved **automatically in the browser** you play in.
* To move to another computer (or as a backup), open **Save Scroll**: download a save file
  or copy a short save code, then use **Import Save Scroll** on the other computer.
* Shared computers: there are three save slots, one per wizard.
* When the game runs as a **SCORM package** inside your LMS, progress is stored by the LMS
  and follows the student to any computer.
* Private/incognito windows and some locked-down lab machines forget saved data when closed —
  the game warns when saving isn't possible; use the Save Scroll there.

---

## For instructors: putting the game in your LMS

Pick whichever fits your course. All four work with Blackboard (Ultra and Original),
Canvas, Moodle and D2L Brightspace.

### Option 1 — Link (simplest, works everywhere)

Host the game (see *Hosting*) and add a **web link** to your course, set to open in a new
tab. In Blackboard Ultra: **+ → Create → Link**.

### Option 2 — Embed it in a page

In any content area that accepts HTML (Blackboard Original *Item* via the HTML source
button, an HTML block in a Blackboard Ultra *Document*, a Canvas *Page*, a Moodle *Page*),
paste:

```html
<iframe src="https://jeffhaines20.github.io/Educational-Games/syntax-and-sorcery/"
        title="Syntax & Sorcery" width="100%" height="900"
        style="border:0" allow="clipboard-write; fullscreen"></iframe>
```

Some LMSs sandbox embedded frames so tightly that the browser blocks saving. The game will
say so; in that case prefer Option 1 or 3.

### Option 3 — SCORM package (progress saved in the LMS + a gradebook score)

Upload [`dist/syntax-and-sorcery-scorm.zip`](dist/syntax-and-sorcery-scorm.zip) as a SCORM
package:

* **Blackboard Ultra:** Course Content → **+ → Upload** → choose the zip (Ultra recognises
  SCORM packages) → turn on grading if you want the score in the gradebook.
* **Blackboard Original:** Content Area → **Build Content → Content Package (SCORM)**.
* **Canvas:** requires your institution's SCORM tool (ask your Canvas admin), or use Option 1/2.
* **Moodle:** Add an activity → **SCORM package**.
* **D2L Brightspace:** Content → **Upload/Create → Add SCORM/xAPI**.

The package reports **score = percentage of challenges completed** and status
*incomplete*/*completed*, and stores progress in the LMS (`cmi.suspend_data`). Students still
need internet access to the Python engine CDN.

### Option 4 — One HTML file

Upload [`dist/syntax-and-sorcery.html`](dist/syntax-and-sorcery.html) as a file. Depending on
LMS settings, students will either play it in the browser or download it and open it.
Progress is saved in that browser.

### Hosting your own copy (free, GitHub Pages)

In this repository on GitHub: **Settings → Pages → Deploy from a branch → main / (root) →
Save**. The game appears at
`https://jeffhaines20.github.io/Educational-Games/syntax-and-sorcery/`. Any static web host
works — just upload this folder.

### Tracking student progress

* **SCORM** (Option 3) puts a score in the gradebook automatically.
* Otherwise, students can open the **Grimoire → Progress Report** and print it or save it as
  a PDF to submit (an honour-system record of completed challenges and stars).

### Customising

Add these to the game's address:

| Parameter | Effect |
|---|---|
| `?unlock=all` | Free practice: every chapter and challenge is open. |
| `?answers=off` | Hide the Answer Scroll (no reference solutions). |
| `?editor=plain` | Use a plain text box instead of the highlighting code editor (simpler for screen readers; avoids loading the editor from cdnjs). |

They can be combined: `…/syntax-and-sorcery/?unlock=all&answers=off`. Defaults live in
[`js/config.js`](js/config.js).

### Troubleshooting

* **"Python couldn't be summoned" / the engine never loads:** the browser must reach
  `cdn.jsdelivr.net` (with `unpkg.com` as a fallback). Some school networks block CDNs —
  ask IT to allow them. Advanced: host the Pyodide files yourself and point
  `pyodideBaseURLs` in `js/config.js` at them.
* **Sites with a Content-Security-Policy** (some LMS or school portals) must allow:
  scripts and connections to the Pyodide CDN, `'wasm-unsafe-eval'` (WebAssembly), and
  `worker-src blob:` (Python runs in a Web Worker created from a blob).
* **"Saving is blocked" warning:** private windows and tightly sandboxed iframes can't
  keep data. Use the Save Scroll, or open the game in its own tab.
* **A spell "ran too long":** spells stop after about 2 million loop steps (or 8 seconds), so
  a loop that never ends can't freeze the page. Check the highlighted line.

### Privacy and accessibility

The game has no accounts, analytics or tracking; nothing a student types leaves their
browser (except what an LMS stores through SCORM). It downloads the Python engine, editor
and fonts from public CDNs. It is fully keyboard-playable (in the code editor, **Tab** indents;
press **Esc** then **Tab** to move on), respects *reduce motion* settings, and is designed
for readable contrast.

---

## For developers

Everything is plain HTML, CSS and JavaScript — no build step is needed to play.

```
index.html            the game
css/style.css         styles
js/config.js          settings (CDN URLs, time limits, answer scroll…)
js/engine/            Python runner (Pyodide in a Web Worker), trial harness, saving, SCORM, progress rules
js/content/           the story and one file per chapter of challenges
js/ui/                screens, editor, rich text, effects, sounds
tools/                validators, dev server, build script, browser tests
docs/DESIGN.md        architecture, content format and authoring guide
dist/                 ready-made single-file and SCORM builds
```

* **Add or edit a challenge:** follow [docs/DESIGN.md](docs/DESIGN.md) §7, then run
  `python3 tools/validate_content.py` (checks every solution passes, every starter and
  known-wrong answer fails). Try any attempt with
  `python3 tools/try_spell.py <challenge-id> attempt.py`. `node tools/validate_pyodide.js`
  repeats the checks in the browser's own Python engine.
* **Run locally:** `bash tools/fetch_pyodide.sh` (once), `node tools/dev_server.js 8000`, then
  open `http://localhost:8000/?localPyodide=1`.
* **Rebuild the bundles:** `python3 tools/build.py` (writes `dist/`).

Requires Node.js 18+ and Python 3.10+ for the tools; Playwright for the browser tests.

### Credits

Python in the browser by [Pyodide](https://pyodide.org) (MPL-2.0). Code editor by
[CodeMirror 5](https://codemirror.net/5/) (MIT). Fonts from Google Fonts (OFL).
