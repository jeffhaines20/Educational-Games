/*
 * Syntax & Sorcery — a chapter's screen (SS.UI.screens.chapter) and its story
 * beats (SS.UI.chapterStory.intro / .outro).
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;

  function app() { return UI.app; }
  function P(fn, fallback) { return u.safe(fn, fallback); }

  function nextChapter(chapter) {
    var list = u.chapters();
    var i = list.indexOf(chapter);
    return i >= 0 ? list[i + 1] || null : null;
  }

  // --------------------------------------------------------------------------
  // Story beats
  // --------------------------------------------------------------------------

  /** The chapter's intro, told by Ada. Marks "chapter:<id>" as seen. */
  function intro(chapter) {
    app().markSeen("chapter:" + chapter.id);
    var panels = UI.dialogs.toPanels(chapter.intro, "ada");
    if (!panels.length) return Promise.resolve("empty");
    return UI.dialogs.story(panels, {
      title: "Chapter " + u.roman(u.chapterNumber(chapter)) + ": " + chapter.title,
      finishLabel: "Let's begin"
    });
  }

  /** The chapter's outro plus a "new area unlocked" panel. Resolves the next chapter (or null). */
  function outro(chapter) {
    app().markSeen("outro:" + chapter.id);
    var next = nextChapter(chapter);
    var panels = UI.dialogs.toPanels(chapter.outro, "ada");
    if (next) {
      panels.push({
        speaker: "narrator",
        icon: next.icon || "✦",
        name: "New area unlocked!",
        role: "Chapter " + u.roman(u.chapterNumber(next)),
        text: ["**" + next.title + "**" + (next.subtitle ? " — *" + next.subtitle + "*" : ""), "Its gates now stand open on the academy map."]
      });
    }
    if (!panels.length) return Promise.resolve(next);
    UI.sound.play("unlock");
    UI.effects.celebrate();
    return UI.dialogs.story(panels, {
      title: "Chapter complete: " + chapter.title,
      finishLabel: next ? "Onward!" : "Continue"
    }).then(function () { return next; });
  }

  UI.chapterStory = { intro: intro, outro: outro, nextChapter: nextChapter };

  // --------------------------------------------------------------------------
  // Chapter screen
  // --------------------------------------------------------------------------

  function chipSpans(items) {
    if (!items || !items.length) return null;
    return h("span", { class: "chips" }, items.map(function (c) { return u.chip(c, "span"); }));
  }

  UI.screens.chapter = function (params) {
    var chapter = u.chapterById(params.id);
    if (!chapter) {
      setTimeout(function () { app().go("map"); }, 0);
      return { el: h("section", null, h("h1", { class: "sr-only" }, "Chapter not found")) };
    }
    var p = u.profile();
    var number = u.chapterNumber(chapter);
    var stats = P(function () { return SS.Progress.chapterStats(p, chapter.id); }, null) ||
      { completed: 0, total: (chapter.challenges || []).length, stars: 0, maxStars: 0, complete: false };
    var unlocked = !!P(function () { return SS.Progress.isChapterUnlocked(p, chapter.id); }, number === 1);
    var prev = u.chapters()[number - 2] || null;
    var destroyed = false;

    var storyBtn = u.button(stats.complete && chapter.outro ? "Read the chapter's story" : "Read Ada's welcome", {
      kind: "ghost", size: "sm", icon: "📜",
      onClick: function () {
        intro(chapter).then(function () {
          if (stats.complete && chapter.outro && !destroyed) {
            UI.dialogs.story(UI.dialogs.toPanels(chapter.outro, "ada"), { title: "Chapter complete: " + chapter.title, finishLabel: "Close" });
          }
        });
      }
    });

    var hero = h("header", { class: "chapter-hero panel" },
      h("div", { class: "chapter-medallion", "aria-hidden": "true" }, chapter.icon || "✦"),
      h("div", { class: "chapter-hero-text" },
        h("p", { class: "eyebrow" }, "Chapter " + u.roman(number)),
        h("h1", { class: "screen-title chapter-title" }, chapter.title),
        chapter.subtitle ? h("p", { class: "chapter-subtitle" }, chapter.subtitle) : null,
        u.chips(chapter.concepts, "chapter-concepts"),
        h("div", { class: "chapter-progress" },
          u.progressBar(stats.total ? stats.completed / stats.total : 0, "Chapter progress"),
          h("p", { class: "chapter-progress-text" },
            h("span", null, stats.completed + " of " + stats.total + " spells mastered"),
            h("span", null, h("span", { class: "star on", "aria-hidden": "true" }, "★"), " " + stats.stars + " / " + stats.maxStars, h("span", { class: "sr-only" }, " stars")))),
        (chapter.intro || chapter.outro) ? h("div", { class: "chapter-hero-actions" }, storyBtn) : null));

    var body;
    if (!unlocked) {
      body = h("div", { class: "panel locked-panel" },
        h("p", { class: "locked-icon", "aria-hidden": "true" }, "🔒"),
        h("h2", null, "This area is still sealed"),
        h("p", null, prev ? "Master every spell in " : "Finish the earlier chapters first.", prev ? h("strong", null, prev.title) : null, prev ? " to break the seal." : null),
        prev ? u.button("Go to " + prev.title, { kind: "primary", icon: prev.icon, onClick: function () { app().go("chapter", { id: prev.id }); } }) : null);
    } else {
      var list = h("ol", { class: "challenge-list" });
      (chapter.challenges || []).forEach(function (c, i) {
        var st = u.challengeState(c.id);
        var open = !!P(function () { return SS.Progress.isChallengeUnlocked(p, c.id); }, i === 0);
        var status = st.completed ? "done" : !open ? "locked" : (st.casts || st.draft || st.hintsUsed) ? "progress" : "open";
        var diff = u.difficultyInfo(c.difficulty);
        var side;
        if (status === "done") side = h("span", { class: "cc-status" }, u.stars(st.stars), h("span", { class: "cc-status-text" }, "Mastered"));
        else if (status === "locked") side = h("span", { class: "cc-status" }, h("span", { class: "cc-lock", "aria-hidden": "true" }, "🔒"), h("span", { class: "cc-status-text" }, "Locked"));
        else if (status === "progress") side = h("span", { class: "cc-status" }, h("span", { class: "cc-dot", "aria-hidden": "true" }), h("span", { class: "cc-status-text" }, "In progress"));
        else side = h("span", { class: "cc-status" }, h("span", { class: "cc-new" }, "New"));
        var label = (i + 1) + ". " + c.title + ". " + diff.label + "." +
          (status === "done" ? " Mastered with " + (st.stars || 0) + " of 3 stars." : status === "locked" ? " Locked: master the previous spell first." : status === "progress" ? " In progress." : " Not started.");
        list.appendChild(h("li", { class: "challenge-item" },
          h("button", {
            type: "button",
            class: "challenge-card status-" + status,
            "aria-label": label,
            "aria-disabled": status === "locked" ? "true" : null,
            on: {
              click: function () {
                if (status === "locked") {
                  UI.dialogs.toast("Master the spell before this one to unlock it.", { icon: "🔒" });
                  return;
                }
                app().go("challenge", { id: c.id });
              }
            }
          },
            h("span", { class: "cc-num", "aria-hidden": "true" }, String(i + 1)),
            h("span", { class: "cc-main" },
              h("span", { class: "cc-title" }, c.title),
              h("span", { class: "cc-badges" }, u.difficultyBadge(c.difficulty), chipSpans(c.concepts))),
            side)));
      });
      body = h("section", { class: "challenge-section", "aria-label": "Challenges" },
        h("h2", { class: "section-title" }, "Spells to master"),
        list);
    }

    var el = h("section", { class: "chapter-screen" },
      h("nav", { class: "crumbs", "aria-label": "Breadcrumb" },
        h("button", { type: "button", class: "crumb", on: { click: function () { app().go("map"); } } }, u.emoji("🗺️"), " Academy map"),
        h("span", { class: "crumb-sep", "aria-hidden": "true" }, "›"),
        h("span", { class: "crumb-current", "aria-current": "page" }, chapter.title)),
      hero,
      stats.complete ? h("p", { class: "chapter-complete-ribbon" }, u.emoji("🏆"), " Chapter mastered! Replay any spell to practise.") : null,
      body);

    return {
      el: el,
      title: chapter.title,
      onShow: function () {
        if (unlocked && !app().hasSeen("chapter:" + chapter.id) && chapter.intro) {
          setTimeout(function () { if (!destroyed && !UI.dialogs.isOpen()) intro(chapter); }, 250);
        }
      },
      refresh: function () { app().go("chapter", { id: chapter.id }); },
      destroy: function () { destroyed = true; }
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
