/*
 * Syntax & Sorcery — the academy map (SS.UI.screens.map).
 *
 * Chapters are stations on a winding trail. The layout is plain CSS (it works for
 * any number of chapters and at any width); the glowing path is an SVG drawn
 * through the medallions' measured centres and redrawn whenever the trail resizes.
 * When the map opens it plays any chapter outro the player hasn't seen yet and,
 * once everything is mastered, the epilogue.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;
  var RING = 2 * Math.PI * 46;

  function app() { return UI.app; }

  function P(fn, fallback) { return u.safe(fn, fallback); }

  /** Where "Continue" should go: the last unfinished challenge, else the first incomplete one. */
  function continueTarget(p) {
    var last = p && p.lastChallengeId ? u.challengeById(p.lastChallengeId) : null;
    if (last && !u.challengeState(last.id).completed && P(function () { return SS.Progress.isChallengeUnlocked(p, last.id); }, false)) return last;
    return P(function () { return SS.Progress.firstIncomplete(p); }, null);
  }

  function ringSvg(fraction, done) {
    var s = u.svg;
    return s("svg", { class: "medallion-ring", viewBox: "0 0 100 100", "aria-hidden": "true", focusable: "false" },
      s("circle", { class: "ring-track", cx: "50", cy: "50", r: "46" }),
      s("circle", {
        class: "ring-fill" + (done ? " done" : ""), cx: "50", cy: "50", r: "46",
        "stroke-dasharray": (Math.max(0, Math.min(1, fraction)) * RING).toFixed(1) + " " + RING.toFixed(1)
      }));
  }

  /** Smooth path through points with vertical tangents (an S-curve between rows). */
  function pathThrough(points) {
    if (!points.length) return "";
    var d = "M" + points[0].x.toFixed(1) + " " + points[0].y.toFixed(1);
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i], my = (a.y + b.y) / 2;
      d += " C" + a.x.toFixed(1) + " " + my.toFixed(1) + " " + b.x.toFixed(1) + " " + my.toFixed(1) + " " + b.x.toFixed(1) + " " + b.y.toFixed(1);
    }
    return d;
  }

  UI.screens.map = function () {
    var p = u.profile();
    var destroyed = false;
    var chapters = u.chapters();
    var stations = [];
    var resizeObs = null;
    var onResize = null;

    var overall = P(function () { return SS.Progress.overallStats(p); }, null) || { completed: 0, total: 0, stars: 0, maxStars: 0, xp: 0, maxXp: 0, percent: 0 };
    var rank = P(function () { return SS.Progress.rankFor(overall.xp); }, null) || { title: "Novice", icon: "🌱", fraction: 0 };
    var unlockAll = !!P(function () { return SS.Progress.unlockAll(p); }, false);
    var allDone = overall.total > 0 && overall.completed >= overall.total;
    var target = continueTarget(p);

    // ---- header ---------------------------------------------------------------
    var toNext = rank.nextTitle && typeof rank.nextXp === "number"
      ? Math.max(0, rank.nextXp - overall.xp) + " XP to " + rank.nextTitle
      : "You have reached the highest rank!";
    var wizardCard = h("section", { class: "wizard-card panel", "aria-label": "Your wizard" },
      h("div", { class: "wizard-portrait", "aria-hidden": "true" }, h("span", null, rank.icon || "🌱")),
      h("div", { class: "wizard-info" },
        h("p", { class: "wizard-card-name" }, p.wizardName || "Apprentice"),
        h("p", { class: "wizard-card-rank" }, (rank.title || "") + " · " + overall.xp + " XP"),
        u.progressBar(rank.fraction || 0, "Progress to the next rank", "bar-xp bar-lg"),
        h("p", { class: "wizard-card-next" }, toNext)),
      h("dl", { class: "wizard-stats" },
        h("div", null, h("dt", null, "Spells"), h("dd", null, overall.completed + " / " + overall.total)),
        h("div", null, h("dt", null, "Stars"), h("dd", null, h("span", { class: "star on", "aria-hidden": "true" }, "★ "), overall.stars + " / " + overall.maxStars))));

    var cta;
    if (target) {
      var tChapter = u.chapterById(target.chapterId);
      cta = h("button", {
        type: "button", class: "btn btn-primary btn-lg btn-continue map-continue",
        on: { click: function () { app().go("challenge", { id: target.id }); } }
      },
        h("span", { class: "btn-label" }, h("span", { class: "cta-arrow", "aria-hidden": "true" }, "▶\uFE0E"), overall.completed ? "Continue: " : "Begin: ", h("strong", null, target.title)),
        tChapter ? h("span", { class: "btn-sub" }, (tChapter.icon || "") + " " + tChapter.title) : null);
    } else if (allDone) {
      cta = h("button", { type: "button", class: "btn btn-primary btn-lg btn-continue map-continue", on: { click: function () { app().go("certificate"); } } },
        h("span", { class: "btn-label" }, u.emoji("🎓"), " View your certificate"),
        h("span", { class: "btn-sub" }, "Every spell mastered!"));
    }

    // ---- notices ----------------------------------------------------------------
    var notices = h("div", { class: "notices" });
    var storage = UI.panels.storageBanner(function () { UI.panels.saveScroll(); });
    if (storage) notices.appendChild(storage);
    var broken = app().contentLoadErrors();
    if (broken.length) {
      notices.appendChild(h("div", { class: "banner banner-info", role: "status" },
        h("span", { class: "banner-icon", "aria-hidden": "true" }, "🌫️"),
        h("div", { class: "banner-text" },
          h("p", null, "Part of the academy is hidden in fog: ", broken.map(function (e, i) {
            return [i ? ", " : "", h("code", { class: "inline-code" }, e.file)];
          }), " didn't load. Everything else works normally — please tell your instructor."))));
    }
    if (unlockAll) {
      notices.appendChild(h("p", { class: "free-practice-note" }, u.emoji("🗝️"), " Free practice is on: every chapter is open."));
    }

    // ---- trail -----------------------------------------------------------------
    var svgBase = u.svg("path", { class: "trail-base" });
    var svgGlow = u.svg("path", { class: "trail-glow" });
    var trailSvg = u.svg("svg", { class: "trail-svg", "aria-hidden": "true", focusable: "false" }, svgBase, svgGlow);
    var list = h("ol", { class: "trail-list" });
    var reachIndex = 0;

    chapters.forEach(function (chapter, i) {
      var stats = P(function () { return SS.Progress.chapterStats(p, chapter.id); }, null) ||
        { completed: 0, total: (chapter.challenges || []).length, stars: 0, maxStars: 0, complete: false };
      var unlocked = !!P(function () { return SS.Progress.isChapterUnlocked(p, chapter.id); }, i === 0);
      var status = stats.complete ? "complete" : !unlocked ? "locked" : stats.completed > 0 ? "progress" : "new";
      if (unlocked) reachIndex = i;
      var isCurrent = target && target.chapterId === chapter.id;
      var prev = chapters[i - 1];
      var stateText = {
        complete: "Mastered",
        progress: "In progress",
        new: "Open",
        locked: "Locked"
      }[status];
      var detail = status === "locked"
        ? (prev ? "Master every spell in " + prev.title + " to open this area." : "Locked.")
        : stats.completed + " of " + stats.total + " spells mastered";
      var label = "Chapter " + (i + 1) + ": " + chapter.title + ". " + stateText + ". " + detail +
        (status !== "locked" ? " " + stats.stars + " of " + stats.maxStars + " stars." : "") +
        (isCurrent ? " You are here." : "");
      var medallion = h("span", { class: "medallion" },
        isCurrent ? h("span", { class: "here-pin", "aria-hidden": "true" }, "You are here") : null,
        ringSvg(stats.total ? stats.completed / stats.total : 0, stats.complete),
        h("span", { class: "medallion-icon", "aria-hidden": "true" }, chapter.icon || "✦"),
        status === "locked" ? h("span", { class: "medallion-lock", "aria-hidden": "true" }, "🔒") : null,
        status === "complete" ? h("span", { class: "medallion-check", "aria-hidden": "true" }, "✓") : null);
      var btn = h("button", {
        type: "button",
        class: "station-btn",
        "aria-label": label,
        "aria-disabled": status === "locked" ? "true" : null,
        on: {
          click: function () {
            if (status === "locked") {
              UI.sound.play("fail");
              UI.dialogs.toast(prev ? "Master every spell in " + prev.title + " first." : "This area is still locked.", { icon: "🔒" });
              return;
            }
            UI.sound.play("click");
            app().go("chapter", { id: chapter.id });
          }
        }
      },
        medallion,
        h("span", { class: "station-card" },
          h("span", { class: "station-eyebrow" }, "Chapter " + u.roman(i + 1),
            h("span", { class: "station-state state-" + status }, stateText)),
          h("span", { class: "station-title" }, chapter.title),
          chapter.subtitle ? h("span", { class: "station-sub" }, chapter.subtitle) : null,
          status === "locked"
            ? h("span", { class: "station-lockline" }, detail)
            : h("span", { class: "station-meta" },
              h("span", { class: "station-count" }, stats.completed + " / " + stats.total + " spells"),
              h("span", { class: "station-stars" }, h("span", { class: "star on", "aria-hidden": "true" }, "★"), " " + stats.stars + " / " + stats.maxStars)),
          status !== "locked" ? u.progressBar(stats.total ? stats.completed / stats.total : 0, chapter.title + " progress") : null));
      var li = h("li", { class: "station station-" + status + (isCurrent ? " is-current" : ""), dataset: { chapter: chapter.id } }, btn);
      stations.push({ li: li, medallion: medallion, chapter: chapter, status: status });
      list.appendChild(li);
    });

    // The final station: the certificate.
    var sanctumMedallion = h("span", { class: "medallion medallion-sanctum" },
      ringSvg(overall.total ? overall.completed / overall.total : 0, allDone),
      h("span", { class: "medallion-icon", "aria-hidden": "true" }, "🎓"),
      allDone ? null : h("span", { class: "medallion-lock", "aria-hidden": "true" }, "🔒"));
    var sanctum = h("li", { class: "station station-sanctum station-" + (allDone ? "complete" : "locked") },
      h("button", {
        type: "button", class: "station-btn",
        "aria-label": allDone ? "The Archmage's Sanctum: your certificate awaits." : "The Archmage's Sanctum. Locked: master every spell to earn your certificate.",
        "aria-disabled": allDone ? null : "true",
        on: {
          click: function () {
            if (!allDone) { UI.dialogs.toast("Master every spell in the academy to earn your certificate.", { icon: "🎓" }); return; }
            app().go("certificate");
          }
        }
      },
        sanctumMedallion,
        h("span", { class: "station-card" },
          h("span", { class: "station-eyebrow" }, "The summit"),
          h("span", { class: "station-title" }, "The Archmage's Sanctum"),
          h("span", { class: "station-sub" }, allDone ? "Your certificate awaits!" : "Master every spell to earn your certificate"))));
    stations.push({ li: sanctum, medallion: sanctumMedallion, chapter: null, status: allDone ? "complete" : "locked" });
    list.appendChild(sanctum);
    if (allDone) reachIndex = stations.length - 1;

    var trail = h("div", { class: "trail" }, trailSvg, list);
    if (!chapters.length) {
      trail = h("div", { class: "panel empty-state" },
        h("p", null, u.emoji("🌫️"), " No chapters could be loaded. Please tell your instructor."));
    }

    function drawTrail() {
      if (destroyed || !trail.isConnected || !chapters.length) return;
      var box = trail.getBoundingClientRect();
      if (!box.width) return;
      var points = stations.map(function (st) {
        var r = st.medallion.getBoundingClientRect();
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
      });
      trailSvg.setAttribute("viewBox", "0 0 " + box.width.toFixed(0) + " " + box.height.toFixed(0));
      trailSvg.setAttribute("width", box.width.toFixed(0));
      trailSvg.setAttribute("height", box.height.toFixed(0));
      svgBase.setAttribute("d", pathThrough(points));
      svgGlow.setAttribute("d", pathThrough(points.slice(0, reachIndex + 1)));
    }

    var el = h("section", { class: "map-screen" },
      h("div", { class: "map-top" },
        wizardCard,
        cta ? h("div", { class: "map-actions" }, cta,
          h("p", { class: "map-actions-help" }, "Your Grimoire, the Practice Chamber, the Save Scroll and Settings are in the bar at the top.")) : null),
      notices,
      h("header", { class: "map-heading" },
        h("h1", { class: "screen-title" }, "The Grounds of Coilspire Academy"),
        h("p", { class: "screen-lead" }, "Follow the path from the Apprentice's Tower to the Hydra's Lair. Master every spell in an area to open the next.")),
      trail);

    function highlightStation(chapterId) {
      stations.forEach(function (st) {
        if (st.chapter && st.chapter.id === chapterId) {
          st.li.classList.add("just-unlocked");
          u.safe(function () { st.li.scrollIntoView({ behavior: u.reducedMotion() ? "auto" : "smooth", block: "center" }); });
          setTimeout(function () { st.li.classList.remove("just-unlocked"); }, 4200);
        }
      });
    }

    function pendingOutro() {
      for (var i = 0; i < chapters.length; i++) {
        var ch = chapters[i];
        var stats = P(function () { return SS.Progress.chapterStats(p, ch.id); }, null);
        if (stats && stats.complete && !app().hasSeen("outro:" + ch.id)) return ch;
      }
      return null;
    }

    function playPending() {
      if (destroyed || UI.dialogs.isOpen()) return;
      var chapter = pendingOutro();
      if (chapter) {
        UI.chapterStory.outro(chapter).then(function (next) {
          if (destroyed) return;
          if (next) highlightStation(next.id);
          setTimeout(playPending, 400);
        });
        return;
      }
      if (allDone && !app().hasSeen("epilogue")) app().go("story", { kind: "epilogue" });
    }

    return {
      el: el,
      title: "Academy map",
      focus: cta || null,
      onShow: function () {
        drawTrail();
        if (global.ResizeObserver) {
          resizeObs = new ResizeObserver(function () { drawTrail(); });
          resizeObs.observe(trail);
        }
        onResize = u.debounce(drawTrail, 60);
        global.addEventListener("resize", onResize);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawTrail);
        setTimeout(drawTrail, 300);
        setTimeout(playPending, 450);
      },
      refresh: function () { app().go("map"); },
      destroy: function () {
        destroyed = true;
        if (resizeObs) resizeObs.disconnect();
        if (onResize) global.removeEventListener("resize", onResize);
      }
    };
  };

  UI.mapHelpers = { continueTarget: continueTarget };
})(typeof window !== "undefined" ? window : globalThis);
