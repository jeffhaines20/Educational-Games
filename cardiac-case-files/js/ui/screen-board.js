/*
 * The Cardiac Case Files — the case board (CCF.UI.screens.board): the player card, a
 * Continue button for the next case (CCF.Progress.nextCase) and the six unit "drawers" with
 * their case folders (number, title, patient, teaser, difficulty, stars, CASE CLOSED stamp,
 * padlock, "In progress").
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;

  function app() { return UI.app; }

  function overall(p) {
    return u.safe(function () { return CCF.Progress.overall(p); }, null) || { solved: 0, total: u.cases().length, stars: 0, maxStars: u.cases().length * 3, xp: 0, complete: false };
  }

  function rankOf(xp) {
    return u.safe(function () { return CCF.Progress.rankFor(xp); }, null) || { index: 0, title: "Student Clinician", fraction: 0, nextTitle: null, nextXp: null, minXp: 0 };
  }

  function previousCase(kase) {
    return u.cases(kase.unit).filter(function (k) { return k.order === kase.order - 1; })[0] || null;
  }

  /** "Step 3 of 4" for a case in progress, else "". */
  function progressText(kase, rec) {
    if (!rec || !rec.current) return "";
    var n = (kase.steps || []).length;
    var step = Math.min(n, (Number(rec.current.step) || 0) + 1);
    return "Step " + step + " of " + n;
  }

  /** One case folder on the board. */
  function caseCard(kase, p, opts) {
    opts = opts || {};
    var rec = (p && p.cases && p.cases[kase.id]) || null;
    var solved = !!(rec && rec.solved);
    var inProgress = !!(rec && rec.current);
    var unlocked = u.isUnlocked(kase);
    var number = u.caseNumber(kase);
    var prev = previousCase(kase);
    var status = solved ? "Case closed, best " + u.plural(rec.bestStars || 0, "star")
      : !unlocked ? "Locked: solve case " + (prev ? u.caseNumber(prev) : "the one before") + " first"
        : inProgress ? "In progress, " + progressText(kase, rec).toLowerCase() : "Open";
    var label = "Case " + number + ": " + kase.title + ". " + u.patientLine(kase) + ". " + (u.DIFFICULTY[kase.difficulty] || {}).label + ". " + status + ".";

    var btn = h("button", {
      type: "button",
      class: "case-open",
      "aria-label": label,
      "aria-disabled": unlocked ? null : "true",
      dataset: { case: kase.id }
    },
      h("span", { class: "case-tab", "aria-hidden": "true" }, number),
      h("span", { class: "case-body", "aria-hidden": "true" },
        h("span", { class: "case-title" }, kase.title),
        h("span", { class: "case-patient" }, u.icon("patient"), " ", u.patientLine(kase)),
        h("span", { class: "case-teaser" }, UI.rich.plainInline(kase.teaser || "")),
        h("span", { class: "case-meta" },
          u.difficultyBadge(kase.difficulty),
          solved ? u.stars(rec.bestStars || 0, 3, "sm") : null,
          inProgress && unlocked ? h("span", { class: "badge badge-progress" }, u.icon("progress", { className: "badge-icon" }), "In progress · " + progressText(kase, rec)) : null,
          !unlocked ? h("span", { class: "badge badge-locked" }, u.icon("lock", { className: "badge-icon" }), "Locked") : null)),
      solved ? h("span", { class: "stamp stamp-closed case-stamp", "aria-hidden": "true" }, "Case closed") : null,
      !unlocked ? h("span", { class: "case-lock", "aria-hidden": "true" }, u.icon("lock")) : null);

    btn.addEventListener("click", function () {
      if (!unlocked) {
        UI.sound.play("wrong");
        UI.dialogs.toast("Solve case " + (prev ? u.caseNumber(prev) + " (" + prev.title + ")" : "the case before") + " to open this file.", { icon: "lock" });
        return;
      }
      UI.sound.play("open");
      app().go("case", { id: kase.id });
    });

    return h("li", {
      class: "case-card" + (solved ? " is-solved" : "") + (!unlocked ? " is-locked" : "") + (inProgress ? " is-progress" : "") + (opts.highlight ? " is-next" : ""),
      dataset: { difficulty: kase.difficulty }
    }, btn);
  }

  function playerCard(p) {
    var o = overall(p);
    var rank = rankOf(o.xp);
    var toNext = rank.nextTitle && typeof rank.nextXp === "number"
      ? (Math.max(0, rank.nextXp - o.xp) + " XP to " + rank.nextTitle)
      : "Highest rank reached";
    return h("section", { class: "player-card", "aria-labelledby": "player-card-name" },
      u.clip("player-clip"),
      h("div", { class: "player-card-badge", "aria-hidden": "true" }, u.icon("detective")),
      h("div", { class: "player-card-main" },
        h("p", { class: "player-card-kicker" }, "Physical therapist assistant"),
        h("h2", { class: "player-card-name", id: "player-card-name" }, p.name || "New PTA"),
        h("p", { class: "player-card-rank" }, u.icon("rank"), " ", rank.title),
        h("div", { class: "player-card-xp" },
          u.progressBar(rank.fraction || 0, "Progress to the next rank: " + toNext, "bar-xp"),
          h("p", { class: "xp-caption" }, h("strong", null, o.xp + " XP"), " · " + toNext))),
      h("dl", { class: "player-stats" },
        h("div", null, h("dt", null, "Cases closed"), h("dd", null, o.solved + " ", h("span", { class: "of" }, "of " + o.total))),
        h("div", null, h("dt", null, "Stars"), h("dd", null, h("span", { class: "star on", "aria-hidden": "true" }, "★ "), o.stars + " ", h("span", { class: "of" }, "of " + o.maxStars)))));
  }

  function nextCard(p) {
    var next = u.safe(function () { return CCF.Progress.nextCase(p); }, null);
    var o = overall(p);
    if (!next) {
      if (o.total && o.complete) {
        return h("section", { class: "next-card is-complete" },
          h("p", { class: "next-kicker" }, "Every file closed"),
          h("h2", { class: "next-title" }, "All " + o.total + " cases solved"),
          h("p", { class: "next-sub" }, "Replay any case to improve your stars, or print your certificate."),
          h("div", { class: "button-row" },
            u.button("Your certificate", { kind: "primary", icon: "certificate", onClick: function () { app().go("certificate"); } }),
            u.button("Rapid Rounds", { kind: "ghost", icon: "rounds", onClick: function () { app().go("rounds"); } })));
      }
      return h("section", { class: "next-card" },
        h("p", { class: "next-kicker" }, "Case board"),
        h("h2", { class: "next-title" }, o.total ? "Pick any open case" : "No case files yet"),
        h("p", { class: "next-sub" }, o.total ? "Every unit's first case is open." : "The case files haven't been added to this copy of the game."));
    }
    var rec = u.caseRecord(next.id);
    var resume = !!(rec && rec.current);
    var btn = u.button(resume ? "Resume case " + u.caseNumber(next) : "Open case " + u.caseNumber(next), {
      kind: "primary", size: "lg", icon: "folder", class: "board-continue",
      onClick: function () { UI.sound.play("open"); app().go("case", { id: next.id }); }
    });
    return h("section", { class: "next-card" },
      h("p", { class: "next-kicker" }, resume ? "Continue where you left off" : "Next case file"),
      h("h2", { class: "next-title" }, h("span", { class: "next-number" }, u.caseNumber(next)), " ", next.title),
      h("p", { class: "next-sub" }, u.patientLine(next), " · ", (u.DIFFICULTY[next.difficulty] || {}).label || "", resume ? " · " + progressText(next, rec) : ""),
      btn);
  }

  function noticeFor(problems) {
    if (!problems.files.length && !problems.skipped.length) return null;
    var parts = [];
    if (problems.files.length) parts.push(u.plural(problems.files.length, "case file") + " didn't load");
    if (problems.skipped.length) parts.push(u.plural(problems.skipped.length, "item") + " skipped because of errors");
    return h("details", { class: "quiet-notice board-notice" },
      h("summary", null, u.icon("warning"), " Some case files are missing (" + parts.join("; ") + "). Everything else works normally."),
      h("ul", null,
        problems.files.map(function (f) { return h("li", null, h("code", null, f.file), f.kind === "missing" ? " couldn't be loaded" : " has an error"); }),
        problems.skipped.map(function (k) { return h("li", null, k, " (see tools/validate_content.js)"); })),
      h("p", null, "Instructors: check that every file was uploaded, or use the single-file version of the game."));
  }

  UI.screens.board = function () {
    var root = h("section", { class: "board-screen" });

    function render() {
      u.clear(root);
      var p = u.profile();
      if (!p) return;
      var next = u.safe(function () { return CCF.Progress.nextCase(p); }, null);
      root.appendChild(h("h1", { class: "sr-only" }, "Case board"));
      root.appendChild(h("div", { class: "board-head" }, playerCard(p), nextCard(p)));
      var notice = noticeFor(app().contentProblems());
      if (notice) root.appendChild(notice);

      var units = u.units();
      var jump = h("nav", { class: "unit-jump", "aria-label": "Units" }, h("ol", null, units.map(function (unit) {
        var st = u.safe(function () { return CCF.Progress.unitStats(p, unit.id); }, null) || { solved: 0, total: u.cases(unit.id).length };
        return h("li", null, h("a", {
          href: "#drawer-" + unit.id, class: "unit-chip",
          on: {
            click: function (e) {
              e.preventDefault();
              var target = document.getElementById("drawer-" + unit.id);
              if (target) { u.scrollIntoView(target); u.focusEl(target.querySelector("h2"), { preventScroll: true }); }
            }
          }
        }, h("span", { class: "unit-chip-n" }, String(unit.order)), h("span", { class: "unit-chip-t" }, unit.title), h("span", { class: "unit-chip-p" }, st.solved + "/" + st.total)));
      })));
      root.appendChild(jump);

      units.forEach(function (unit) {
        var list = u.cases(unit.id);
        var st = u.safe(function () { return CCF.Progress.unitStats(p, unit.id); }, null) || { solved: 0, total: list.length, stars: 0, maxStars: list.length * 3 };
        var headingId = "drawer-title-" + unit.id;
        var drawer = h("section", { class: "drawer", id: "drawer-" + unit.id, "aria-labelledby": headingId, dataset: { unit: unit.id } },
          h("header", { class: "drawer-front" },
            h("span", { class: "drawer-icon", "aria-hidden": "true" }, u.icon(CCF.Icons ? CCF.Icons.unit(unit.id, unit.icon) : unit.icon)),
            h("div", { class: "drawer-label" },
              h("p", { class: "drawer-kicker" }, "Drawer " + unit.order),
              h("h2", { class: "drawer-title", id: headingId }, unit.title),
              h("p", { class: "drawer-sub" }, unit.subtitle || "")),
            h("p", { class: "drawer-progress" },
              h("span", null, st.solved + " of " + st.total + " closed"),
              h("span", null, h("span", { class: "star on", "aria-hidden": "true" }, "★ "), st.stars + " of " + st.maxStars)),
            h("span", { class: "drawer-handle", "aria-hidden": "true" })),
          unit.intro ? UI.rich.block(unit.intro, "drawer-intro") : null,
          list.length
            ? h("ul", { class: "case-grid" }, list.map(function (k) { return caseCard(k, p, { highlight: next && next.id === k.id }); }))
            : h("p", { class: "drawer-empty" }, "No case files in this drawer yet."));
        root.appendChild(drawer);
      });

      root.appendChild(h("p", { class: "board-disclaimer" }, u.DISCLAIMER));
    }

    render();
    return { el: root, title: "Case board", refresh: render };
  };

  UI.board = { caseCard: caseCard, progressText: progressText, overall: overall, rankOf: rankOf };
})(typeof window !== "undefined" ? window : globalThis);
