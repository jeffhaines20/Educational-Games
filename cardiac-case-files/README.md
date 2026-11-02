# 🩺 The Cardiac Case Files

*Read the chart. Follow the clues. Keep the patient safe.*

**The Cardiac Case Files** is a browser game for students in a physical therapist
assistant (PTA) course on cardiovascular pathology. Students play the newest PTA at the
fictional Riverside Heart & Vascular Center. Every patient arrives as a **case file**:
referral, history, medications, vital signs, examination findings and test results,
including real-looking ECG rhythm strips. Students work each case step by step — what
best explains the findings, which test would confirm it, what the numbers mean, what the
medications change about treatment, and when to stop, get the supervising PT, or call 911.
Every answer is explained and tied back to the lecture slides.

* **No installation, no accounts, no internet needed** once the page has loaded — the whole
  game is plain HTML, CSS and JavaScript.
* **34 cases** in six units, labelled **Easy**, **Medium** and **Hard**.
* **Progress saves automatically**, and a save code moves it to another computer.
* **Easy to use in a course** — post a link in Blackboard (or any LMS). Optional extras:
  embed it in a page, hand out a single HTML file, or upload a **SCORM package** that
  stores progress in the LMS and sends a score to the gradebook.

> For education only — not medical advice. All patients are fictional.

---

## What students learn

The cases are built from the course's two lecture decks (*Cardiovascular system
Pathology* and *Patho cardio conditions 2*); each case cites the slides it draws on.

| Unit | Cases | Topics |
|---|---|---|
| 1 · Heart Basics | 5 | blood flow and valves, conduction, cardiac output, ejection fraction, ECG basics, heart sounds, edema grading |
| 2 · Coronary Cases | 6 | stable and unstable angina, coronary artery disease, myocardial infarction (including atypical presentations), cardiac rehab, nitrates, beta blockers, antiplatelets |
| 3 · Rhythm Cases | 5 | palpitations and PVCs, atrial fibrillation, heart block and pacemakers, ventricular fibrillation and the AED, digoxin toxicity |
| 4 · Pump Failure | 5 | left- and right-sided heart failure, acute pulmonary edema, cardiomyopathy, cor pulmonale |
| 5 · Pressure Cases | 5 | blood pressure categories, orthostatic hypotension, aortic atherosclerosis, aneurysm, hypertensive crisis |
| 6 · Vessel Cases | 8 | claudication and the ankle-brachial index, Raynaud's, Buerger's disease, diabetic angiopathy, venous insufficiency, DVT (Wells score), pulmonary embolism |

**Difficulty.** *Easy* cases are classic presentations. *Medium* cases combine the chart's
vitals, medications and tests, and include calculations (cardiac output, ejection fraction,
ABI). *Hard* cases change during the session, mix look-alike conditions (pulmonary embolism
or heart attack?) and include emergencies. Every unit is open from the start; inside a unit
the cases unlock one after another.

**The Casebook** — a searchable reference of every condition, drug class and tool (blood
pressure categories, ABI table, edema scale, Wells score, heart sounds, ECG basics, tests,
procedures, red flags) — is available at any time, including during a case.

**Rapid Rounds** — endless practice drills: name the rhythm on an ECG strip, stage a blood
pressure, calculate an ABI, grade edema.

### How a case works

1. Read the case file: referral, history, medications, vitals, exam and tests.
2. Answer one question at a time. A wrong answer gets an explanation of why it's wrong, and
   the student tries again. *Ask Dr. Okafor* gives a hint.
3. Some steps add new information — the patient's vitals change mid-session, or a test result
   arrives.
4. When the case is closed: stars (★★★ with no wrong answers or hints), XP, a debrief with the
   key take-home points, and links to the Casebook.

---

## Saving progress

Progress saves in the browser automatically after every step, in one of three save slots.
A student can leave in the middle of a case and pick up at the same step. To move to another
computer (or browser), use **Settings → Save code**: copy the code, then paste it on the title
screen of the other computer with *I have a save code*.

On shared computers, each student should use their own slot. Clearing browser data erases
saved progress (save codes don't expire).

---

## For instructors

### Recommended: post a link (simplest)

Once the repository is published with GitHub Pages (see the repository README), the game is at:

`https://jeffhaines20.github.io/Educational-Games/cardiac-case-files/`

In Blackboard: **Build Content → Web Link** (or *Create → Link* in Ultra), paste the address,
and choose to open it in a new window. Progress is kept in each student's browser.

### Optional: SCORM package (progress stored in the LMS + a gradebook score)

Upload [`dist/cardiac-case-files-scorm.zip`](dist/cardiac-case-files-scorm.zip) as a SCORM
package (in Blackboard: **Build Content → Content Package (SCORM)**). The LMS then stores each
student's progress, and the game reports a score: the percentage of the 34 cases solved.
The activity counts as complete when every case is solved. Turn on grading in the package
settings if you want the score in the gradebook.

### Optional: embed it, or hand out one file

* Embed the game's address in an `<iframe>` on any page (allow at least 900 × 700 pixels).
* [`dist/cardiac-case-files.html`](dist/cardiac-case-files.html) is the whole game in one
  file: upload it, or share it, and students open it in any browser — it works offline.

### Customising

Add these to the game's address (link and embed only):

| Parameter | Effect |
|---|---|
| `?unlock=all` | Every case is open from the start (free practice or targeted review). |
| `?reference=off` | Closed book: hides the Casebook. |
| `?hints=off` | No hints from Dr. Okafor. |
| `?sound=off` | Start with sound effects off. |
| `?motion=reduce` | Turn off animations (the game also follows the device's *reduce motion* setting). |

Combine them with `&`: `…/cardiac-case-files/?unlock=all&reference=off`. For an uploaded
SCORM package or single file, rebuild with `python3 tools/build.py --reference off`.

### Where the game goes beyond the slides

The cases follow the lectures. In a few places the slides are out of date or imprecise, and
the game follows current practice (and says so in the case explanations) — for example,
troponin as today's main marker of heart-muscle injury, digoxin's role in atrial fibrillation
(rate control), early walking for patients with DVT once anticoagulated, and current BLS steps.
The full list is in [`docs/SOURCE-NOTES.md`](docs/SOURCE-NOTES.md) §0, followed by a few
points the game keeps as the lecture teaches them but that an instructor may want to discuss
(for example warfarin vs the newer anticoagulants for atrial fibrillation).

### Privacy and accessibility

No accounts, no analytics, no tracking, and no network requests: fonts and icons are part of
the game. Progress stays in the student's browser (or in the LMS with SCORM). The game is
keyboard-playable, works with screen readers (every ECG strip has a text description),
respects *reduce motion* settings, and is designed for readable contrast on phones,
tablets and desktops.

---

## For developers

Everything is plain HTML, CSS and JavaScript — no build step is needed to play.

```
index.html            the game
css/, assets/         styles, self-hosted fonts
js/config.js          settings (and URL parameters)
js/engine/            saving (slots, save codes, SCORM), progress rules (stars, XP, unlocks)
js/content/           the cases, one file per unit; reference.js (Casebook); story.js
js/ui/                screens, the ECG strip renderer (ecg.js), diagrams, dialogs
tools/                content validator, build script, dev server, tests
docs/DESIGN.md        architecture, content format and authoring guide
docs/SOURCE-NOTES.md  digest of the two lectures, with slide numbers
docs/CASE-PLAN.md     every case: objectives, difficulty, sources
dist/                 ready-made single-file and SCORM builds
```

* **Add or edit a case:** follow [docs/DESIGN.md](docs/DESIGN.md) §6, then run
  `node tools/validate_content.js` (schema and quality checks; exits non-zero on errors).
* **Run locally:** `node tools/dev_server.js 8000`, then open `http://localhost:8000/`.
* **Rebuild the bundles:** `python3 tools/build.py`.
* **Tests:** `node tools/test_engine.js`, `node tools/test_ecg.js`, and the Playwright
  browser suites in `tools/e2e/`.

### Credits

Case content written for this game from the course lectures. Icons by the game-icons.net
contributors (Lorc, Delapouite and others), licensed under
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Fonts are listed with their
licences in `assets/fonts/`.
