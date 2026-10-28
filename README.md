# Educational Games

Web-based games that help students learn complex topics. Every game runs in an
ordinary web browser with **no installation** — open a link, or drop it into your
LMS (Blackboard, Canvas, Moodle, D2L…).

## Games

| Game | Teaches | Play | Guide |
|------|---------|------|-------|
| 🔥 **[Pyromancer](pyromancer/)** | Python, data structures & algorithms, object-oriented programming (up to dynamic programming) | [`pyromancer/index.html`](pyromancer/index.html) | [README](pyromancer/README.md) |

## Hosting all games for free (GitHub Pages)

1. GitHub Pages is free for **public** repositories (a private repository needs a paid
   plan): **Settings → General → Danger Zone → Change visibility → Public**.
   Then open **Settings → Pages**.
2. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder
   **/ (root)**, then **Save** (the games must be on the `main` branch).
3. After a minute the games are live at
   `https://jeffhaines20.github.io/Educational-Games/` (a menu of all games), e.g.
   `https://jeffhaines20.github.io/Educational-Games/pyromancer/`.

Each game's README explains how to put it in an LMS (as a link, an embedded page,
a single HTML file, or a SCORM package that reports scores to the gradebook).

## Repository layout

```
index.html               menu page linking to every game (for GitHub Pages)
<game-folder>/           one self-contained folder per game
  index.html             the game — works from a web server, an LMS, or straight from disk
  README.md              how to play, teach with and deploy the game
  docs/                  design notes for people extending the game
  dist/                  ready-made bundles (single HTML file, SCORM package)
```

## Principles for every game in this repo

* **Zero setup for students** — plain HTML/CSS/JavaScript, no accounts, no installs.
* **LMS-friendly** — works inside iframes and as a SCORM package; never depends on
  a server of our own.
* **Progress is saved** in the browser, with an export/import option for moving
  between computers.
* **Accessible** — keyboard playable, readable contrast, reduced-motion support.
* **Private** — no tracking and no student data leaves the browser (other than
  what an LMS stores through SCORM).
