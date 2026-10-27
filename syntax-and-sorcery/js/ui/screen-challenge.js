/*
 * Pyromancer — the challenge screen (SS.UI.screens.challenge), the heart of the
 * game: read the task → write a spell → cast → understand the result → fix.
 *
 * Layout (style.css "Challenge"):
 *   ≥ 1000px  two columns. Left (the brief): scene, story, task, Spell Scroll and
 *             Pip's hints. Right (the work column): editor, Cast, results; it stays in
 *             view while the left column scrolls. "Expand editor" hides the brief.
 *   < 1000px  one column. The brief becomes tabs (Task | Spell Scroll | Hints) so the
 *             editor is never far down the page.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;

  var NARROW = "(max-width: 999px)";
  var prefs = { expanded: false };   // remembered while the page is open

  function app() { return UI.app; }
  function P(fn, fallback) { return u.safe(fn, fallback); }

  function narrow() {
    return !!P(function () { return global.matchMedia(NARROW).matches; }, false);
  }

  function smooth() { return u.reducedMotion() ? "auto" : "smooth"; }

  function starText(n) {
    n = Math.max(0, Math.min(3, n || 0));
    return "★★★".slice(0, n) + "☆☆☆".slice(0, 3 - n);
  }

  function snapshot(prof, chapterId) {
    var xp = P(function () { return SS.Progress.totalXp(prof); }, 0) || 0;
    return {
      xp: xp,
      rank: P(function () { return SS.Progress.rankFor(xp); }, null),
      chapter: P(function () { return SS.Progress.chapterStats(prof, chapterId); }, null),
      overall: P(function () { return SS.Progress.overallStats(prof); }, null)
    };
  }

  /** Record a finished cast (and a completion when it passed). Works even after the screen is gone. */
  function recordResult(ch, result, code) {
    var passed = !!result && result.status === "passed";
    // A hiccup in the academy's machinery isn't an attempt at the spell, so it isn't counted.
    if (!result || result.status !== "internal-error") u.safe(function () { SS.Save.recordCast(ch.id, { passed: passed }); });
    if (!passed) return null;
    var before = snapshot(u.profile(), ch.chapterId);
    var completion = u.safe(function () { return SS.Save.recordCompletion(ch.id, { code: code }); }, null);
    var e = u.challengeState(ch.id);
    if (!completion) completion = { firstTime: false, previousStars: e.stars || 0, stars: e.stars || 1, xpGained: 0 };
    var prof = u.profile();
    var after = snapshot(prof, ch.chapterId);
    return {
      completion: completion,
      rankUp: before.rank && after.rank && after.rank.index > before.rank.index ? after.rank : null,
      xp: after.xp,
      chapterDone: !!(after.chapter && after.chapter.complete && !(before.chapter && before.chapter.complete)),
      gameDone: !!(after.overall && after.overall.total && after.overall.completed >= after.overall.total &&
        !(before.overall && before.overall.completed >= before.overall.total)),
      next: P(function () { return SS.Progress.nextChallenge(prof, ch.id); }, null)
    };
  }

  /** The rank-up moment: its own dialog, then `then()`. */
  function showRankUp(rank, xp, returnFocus, then) {
    var icon = h("div", { class: "rankup-icon" }, h("span", { "aria-hidden": "true" }, rank.icon || "✦"));
    var next = rank.nextTitle && typeof rank.nextXp === "number"
      ? "Next rank: " + rank.nextTitle + " at " + rank.nextXp + " XP (" + Math.max(0, rank.nextXp - xp) + " to go)."
      : "This is the highest rank in the academy!";
    var m = UI.dialogs.open({
      title: "New rank: " + rank.title + "!", className: "modal-rankup", size: "sm", sound: false,
      returnFocus: returnFocus,
      body: [icon, h("p", { class: "rankup-xp" }, xp + " XP"), h("p", { class: "rankup-next" }, next)],
      actions: [{ label: "Onward!", kind: "primary" }]
    });
    UI.sound.play("rankup");
    UI.effects.burst(icon, 28);
    UI.effects.celebrate();
    m.result.then(function () { if (then) then(); });
  }

  UI.screens.challenge = function (params) {
    var ch = u.challengeById(params.id);
    var p = u.profile();
    if (!ch) {
      setTimeout(function () { app().go("map"); }, 0);
      return { el: h("section", null, h("h1", { class: "sr-only" }, "Challenge not found")) };
    }
    var chapter = u.chapterById(ch.chapterId) || { id: ch.chapterId, title: "", challenges: [ch] };
    if (!P(function () { return SS.Progress.isChallengeUnlocked(p, ch.id); }, true)) {
      setTimeout(function () {
        UI.dialogs.toast("That spell is still locked. Master the ones before it first.", { icon: "🔒" });
        app().go("chapter", { id: chapter.id });
      }, 0);
      return { el: h("section", null, h("h1", { class: "sr-only" }, "Locked")) };
    }

    var conf = u.config();
    var scene = ch.scene || {};
    var hints = Array.isArray(ch.hints) ? ch.hints.filter(function (x) { return x !== null && x !== undefined && x !== ""; }) : [];
    var inputs = Array.isArray(ch.inputs) ? ch.inputs.map(function (v) { return v === null || v === undefined ? "" : String(v); }) : [];
    var siblings = chapter.challenges || [ch];
    var index = siblings.indexOf(ch);
    var prevCh = index > 0 ? siblings[index - 1] : null;
    var nextCh = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
    var destroyed = false;
    var casting = false;
    var castCode = "";
    var failStreak = 0;
    var nudged = false;
    var timers = [];
    var editor = null;
    var mq = null, onMq = null;
    var tabbed = false;
    var currentTab = "task";
    var ada = (SS.CHARACTERS && SS.CHARACTERS.ada) || { name: "Archmage Ada", icon: "🧙‍♀️" };
    var MOD = UI.Editor.modKey;

    function later(fn, ms) {
      var id = setTimeout(function () {
        var i = timers.indexOf(id);
        if (i >= 0) timers.splice(i, 1);
        fn();
      }, ms);
      timers.push(id);
      return id;
    }

    function entry() { return u.challengeState(ch.id); }

    // ------------------------------------------------------------------------
    // Header bar
    // ------------------------------------------------------------------------
    var bestEl = h("span", { class: "best-stars" });
    function renderBest() {
      var e = entry();
      u.clear(bestEl);
      if (e.completed) u.append(bestEl, [h("span", { class: "best-label" }, "Best"), u.stars(e.stars)]);
      else u.append(bestEl, h("span", { class: "best-label not-yet" }, "Not yet mastered"));
    }
    renderBest();

    function navButton(target, dir) {
      if (!target) return null;
      var btn = u.button(dir === "prev" ? "Previous" : "Next", {
        kind: "ghost", size: "sm", icon: dir === "prev" ? "◂" : null,
        ariaLabel: (dir === "prev" ? "Previous spell: " : "Next spell: ") + target.title,
        onClick: function () {
          if (dir === "next" && !P(function () { return SS.Progress.isChallengeUnlocked(u.profile(), target.id); }, false)) {
            UI.dialogs.toast("Master this spell to unlock the next one.", { icon: "🔒" });
            return;
          }
          app().go("challenge", { id: target.id });
        }
      });
      if (dir === "next") btn.appendChild(h("span", { class: "btn-icon-after", "aria-hidden": "true" }, "▸"));
      return btn;
    }
    var nextBtn = navButton(nextCh, "next");
    function renderNextLock() {
      if (!nextBtn) return;
      var open = P(function () { return SS.Progress.isChallengeUnlocked(u.profile(), nextCh.id); }, false);
      nextBtn.classList.toggle("is-locked", !open);
      nextBtn.setAttribute("aria-disabled", open ? "false" : "true");
    }
    renderNextLock();

    var bar = h("div", { class: "challenge-bar" },
      h("nav", { class: "crumbs", "aria-label": "Breadcrumb" },
        h("button", { type: "button", class: "crumb", on: { click: function () { app().go("map"); } } }, u.emoji("🗺️"), h("span", { class: "crumb-text" }, " Map")),
        h("span", { class: "crumb-sep", "aria-hidden": "true" }, "›"),
        h("button", { type: "button", class: "crumb", on: { click: function () { app().go("chapter", { id: chapter.id }); } } },
          u.emoji(chapter.icon || "✦"), h("span", { class: "crumb-text" }, " " + chapter.title)),
        h("span", { class: "crumb-sep", "aria-hidden": "true" }, "›"),
        h("span", { class: "crumb-current", "aria-current": "page" }, "Spell " + (index + 1) + " of " + siblings.length)),
      h("div", { class: "challenge-heading" },
        h("h1", { class: "challenge-title" }, ch.title),
        h("div", { class: "challenge-tags" }, u.difficultyBadge(ch.difficulty), u.chips(ch.concepts), bestEl)),
      h("div", { class: "challenge-nav" }, navButton(prevCh, "prev"), nextBtn));

    // ------------------------------------------------------------------------
    // The brief: scene, story, then Task / Spell Scroll / Hints (tabs when narrow)
    // ------------------------------------------------------------------------
    var stage = UI.effects.createStage(scene);
    var story = ch.story ? h("div", { class: "story-block" },
      h("div", { class: "story-portrait", "aria-hidden": "true" }, ada.icon || "🧙‍♀️"),
      h("div", { class: "story-bubble" },
        h("p", { class: "story-speaker" }, ada.name || "Archmage Ada"),
        UI.rich.block(ch.story, "story-text"))) : null;

    var workRef = {};
    var taskId = u.uid("task");
    var task = h("section", { class: "task-card", "aria-labelledby": taskId },
      h("h2", { class: "card-title", id: taskId }, u.emoji("🎯"), " Your Task"),
      UI.rich.block(ch.task, "task-text"),
      u.button("Jump to your spell", {
        kind: "link", icon: "✒️", class: "jump-to-editor",
        onClick: function () {
          u.safe(function () { workRef.editorPanel.scrollIntoView({ behavior: smooth(), block: "start" }); });
          if (editor) editor.focus();
        }
      }));

    var inputsNote = inputs.length ? h("section", { class: "inputs-note", "aria-label": "Input for this spell" },
      h("p", { class: "inputs-title" }, u.emoji("📥"), " This spell receives input"),
      h("p", { class: "inputs-help" }, "Each time your spell calls ", h("code", { class: "inline-code" }, "input()"), ", it gets the next answer:"),
      h("ol", { class: "input-list" }, inputs.map(function (v) {
        return h("li", null, h("code", { class: "inline-code input-chip" }, v === "" ? "(empty)" : v));
      }))) : null;

    var lessonHeadingId = u.uid("lesson");
    var lesson = ch.lesson ? h("details", { class: "lesson", open: !entry().completed },
      h("summary", { class: "lesson-summary" },
        h("h2", { class: "lesson-summary-title", id: lessonHeadingId }, u.emoji("📖"), " Spell Scroll"),
        h("span", { class: "lesson-summary-sub" }, "the lesson for this spell")),
      UI.rich.block(ch.lesson, "lesson-body")) : null;

    // Pip's hints
    var hintsTitleId = u.uid("hints");
    var hintList = h("ol", { class: "hint-list" });
    var hintCost = h("p", { class: "hint-cost" });
    var hintBtn = u.button("Ask Pip for a hint", { kind: "ghost", icon: "🦉", class: "hint-btn" });
    var maxStars = h("p", { class: "max-stars" });
    var hintsPanel = hints.length ? h("section", { class: "hints-panel", "aria-labelledby": hintsTitleId },
      h("div", { class: "hints-head" },
        h("h2", { class: "card-title", id: hintsTitleId, tabindex: "-1" }, u.emoji("🦉"), " Pip's hints"),
        maxStars),
      hintList,
      h("div", { class: "hint-actions" }, hintBtn, hintCost)) : null;

    function starsFor(hintsUsed, answerRevealed) {
      return P(function () { return SS.Progress.starsFor({ hintsUsed: hintsUsed, answerRevealed: answerRevealed }); },
        answerRevealed || hintsUsed >= 2 ? 1 : hintsUsed === 1 ? 2 : 3);
    }

    var hintTabCount = h("span", { class: "tab-count" });
    function renderHints(focusIndex) {
      var e = entry();
      var used = Math.min(e.hintsUsed || 0, hints.length);
      hintTabCount.textContent = hints.length ? used + "/" + hints.length : "";
      if (!hintsPanel) return;
      u.clear(hintList);
      hints.slice(0, used).forEach(function (hint, i) {
        hintList.appendChild(h("li", { class: "hint", tabindex: "-1" },
          h("p", { class: "hint-label" }, "🦉 Pip whispers… ", h("span", { class: "hint-num" }, "(hint " + (i + 1) + " of " + hints.length + ")")),
          UI.rich.block(hint, "hint-text")));
      });
      var nowStars = starsFor(e.hintsUsed || 0, !!e.answerRevealed);
      u.clear(maxStars);
      u.append(maxStars, [h("span", { class: "max-stars-label" }, e.completed ? "You can still earn" : "Stars available"), u.stars(nowStars)]);
      if (used >= hints.length) {
        hintBtn.hidden = true;
        hintCost.textContent = "You've heard all of Pip's hints." +
          (answerAvailable() && !e.answerRevealed ? " Still stuck? The Answer Scroll is next to Cast Spell." : "");
      } else {
        hintBtn.hidden = false;
        var label = hintBtn.querySelector(".btn-label");
        label.textContent = used === 0 ? "Ask Pip for a hint" : "Ask for hint " + (used + 1) + " of " + hints.length;
        var nextStars = starsFor(used + 1, !!e.answerRevealed);
        u.clear(hintCost);
        if (nextStars < nowStars) u.append(hintCost, ["This hint lowers the stars for this spell to ", u.stars(nextStars), "."]);
        else hintCost.textContent = "No extra star cost.";
        if (e.completed) u.append(hintCost, " Your best (" + (e.stars || 0) + " of 3) is kept.");
      }
      if (typeof focusIndex === "number") {
        var item = hintList.childNodes[focusIndex];
        if (item) u.focusEl(item);
      }
    }

    hintBtn.addEventListener("click", function () {
      var used = u.safe(function () { return SS.Save.revealHint(ch.id); }, null);
      if (typeof used !== "number") used = (entry().hintsUsed || 0);
      UI.sound.play("hint");
      renderHints(Math.min(used, hints.length) - 1);
      u.announce("Pip whispers: " + UI.rich.plainText(hints[Math.min(used, hints.length) - 1]));
    });

    // Tabs (only active below 1000px; above that every section is simply shown)
    var tabDefs = [{ id: "task", icon: "🎯", label: "Task", content: [task, inputsNote] }];
    if (lesson) tabDefs.push({ id: "lesson", icon: "📖", label: "Spell Scroll", content: [lesson] });
    if (hintsPanel) tabDefs.push({ id: "hints", icon: "🦉", label: "Hints", content: [hintsPanel], extra: hintTabCount });
    var tabs = {};
    var tablist = h("div", { class: "brief-tabs", role: "tablist", "aria-label": "About this spell" });
    tabDefs.forEach(function (t) {
      var tabId = u.uid("tab-" + t.id), panelId = u.uid("panel-" + t.id);
      var btn = h("button", {
        type: "button", class: "brief-tab", role: "tab", id: tabId, "aria-controls": panelId,
        "aria-selected": "false", tabindex: "-1", on: { click: function () { selectTab(t.id, true); } }
      }, u.emoji(t.icon), h("span", { class: "brief-tab-label" }, t.label), t.extra || null);
      var panel = h("div", { class: "brief-panel", id: panelId, dataset: { tab: t.id } }, t.content);
      tabs[t.id] = { btn: btn, panel: panel };
      tablist.appendChild(btn);
    });
    tablist.addEventListener("keydown", function (e) {
      var ids = tabDefs.map(function (t) { return t.id; });
      var i = ids.indexOf(currentTab), next = null;
      if (e.key === "ArrowRight") next = ids[(i + 1) % ids.length];
      else if (e.key === "ArrowLeft") next = ids[(i - 1 + ids.length) % ids.length];
      else if (e.key === "Home") next = ids[0];
      else if (e.key === "End") next = ids[ids.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });

    function selectTab(id, focusTab) {
      if (!tabs[id]) id = "task";
      currentTab = id;
      Object.keys(tabs).forEach(function (k) {
        var on = k === id;
        tabs[k].btn.setAttribute("aria-selected", on ? "true" : "false");
        tabs[k].btn.tabIndex = on ? 0 : -1;
        tabs[k].panel.classList.toggle("is-active", on);
      });
      if (id === "lesson" && lesson) lesson.open = true;
      if (focusTab) u.focusEl(tabs[id].btn);
    }

    function setTabbed(on) {
      tabbed = !!on;
      brief.classList.toggle("is-tabbed", tabbed);
      layout.classList.toggle("is-narrow", tabbed);
      Object.keys(tabs).forEach(function (k) {
        var t = tabs[k];
        if (tabbed) {
          t.panel.setAttribute("role", "tabpanel");
          t.panel.setAttribute("aria-labelledby", t.btn.id);
        } else {
          t.panel.removeAttribute("role");
          t.panel.removeAttribute("aria-labelledby");
        }
      });
      selectTab(currentTab, false);
      if (editor) editor.refresh();
    }

    /** Show a section of the brief: the right tab when narrow, a scroll when wide. */
    function reveal(id, focusTarget) {
      if (tabbed) {
        selectTab(id, false);
        u.safe(function () { tablist.scrollIntoView({ behavior: smooth(), block: "start" }); });
      } else if (tabs[id]) {
        if (layout.classList.contains("is-expanded")) setExpanded(false);
        u.safe(function () { tabs[id].panel.scrollIntoView({ behavior: smooth(), block: "center" }); });
      }
      if (focusTarget) u.focusEl(focusTarget);
    }

    var brief = h("div", { class: "ch-brief" }, stage.el, story, tablist,
      tabDefs.map(function (t) { return tabs[t.id].panel; }));

    // ------------------------------------------------------------------------
    // Work column: engine banner, editor, cast bar, results
    // ------------------------------------------------------------------------
    var coach = null;
    if (!app().hasSeen("tutorial")) {
      var coachId = u.uid("coach");
      coach = h("aside", { class: "coach", "aria-labelledby": coachId },
        h("p", { class: "coach-title", id: coachId }, u.emoji("✨"), " How to cast a spell"),
        h("ol", { class: "coach-steps" },
          h("li", null, "Read ", h("strong", null, "Your Task"), ". The ", h("strong", null, "Spell Scroll"), " lesson teaches what you need."),
          h("li", null, "Write Python in the editor above."),
          h("li", null, "Press ", h("strong", null, "✨ Cast Spell"), " (or ", h("kbd", null, MOD + "+Enter"), "). Right here, the ", h("strong", null, "Scrying Pool"), " shows what your spell printed and the ", h("strong", null, "Trials"), " (automatic checks) show whether it worked."),
          h("li", null, "Something went wrong? Read the explanation, fix the highlighted line and cast again. Pip the owl has hints too.")),
        u.button("Got it!", {
          kind: "primary", size: "sm", class: "coach-ok",
          onClick: function () {
            app().markSeen("tutorial");
            u.remove(coach);
            coach = null;
            if (results.getAttribute("data-status") === "pending") UI.results.idle(results);
            if (editor) editor.focus();
          }
        }));
    }

    var engineBanner = h("div", { class: "banner banner-error engine-banner", role: "alert", hidden: true });
    function renderEngineBanner(st) {
      u.clear(engineBanner);
      if (st.state !== "error") { engineBanner.hidden = true; return; }
      engineBanner.hidden = false;
      u.append(engineBanner, [
        h("span", { class: "banner-icon", "aria-hidden": "true" }, "⚠️"),
        h("div", { class: "banner-text" },
          h("p", { class: "banner-title" }, "Python couldn't be loaded"),
          h("p", null, st.message || "The Python engine isn't available."),
          h("p", { class: "banner-sub" }, "You can still read the story, the task and the Spell Scroll."),
          st.detail ? h("details", { class: "banner-details" },
            h("summary", null, "Technical details (for IT staff)"),
            h("pre", { class: "traceback-text" }, String(st.detail))) : null),
        h("div", { class: "banner-actions" },
          u.button("Try again", { kind: "primary", size: "sm", icon: "↻", onClick: function () { app().retryEngine(); } }),
          u.button("Help", { kind: "ghost", size: "sm", onClick: function () { UI.panels.engineHelp(); } }))
      ]);
    }

    var editorHost = h("div", { class: "editor-host" });
    var edTitleId = u.uid("editor-title");
    function fontButton(delta, label, text) {
      return h("button", {
        type: "button", class: "icon-btn font-btn", "aria-label": label, title: label,
        on: {
          click: function () {
            var size = Math.max(12, Math.min(24, (Number(u.settings().editorFontSize) || 15) + delta));
            app().updateSettings({ editorFontSize: size });
            u.announce("Editor text size " + size + " pixels.");
          }
        }
      }, text);
    }
    var expandLabel = h("span", { class: "btn-label" });
    var expandIcon = h("span", { class: "expand-icon", "aria-hidden": "true" });
    var expandBtn = h("button", { type: "button", class: "btn btn-ghost btn-xs expand-btn", "aria-pressed": "false", on: { click: function () { setExpanded(!layout.classList.contains("is-expanded")); } } },
      expandIcon, expandLabel);
    function setExpanded(on) {
      prefs.expanded = !!on;
      layout.classList.toggle("is-expanded", !!on);
      expandBtn.setAttribute("aria-pressed", on ? "true" : "false");
      expandIcon.textContent = on ? "⇤" : "⇔";
      expandLabel.textContent = on ? "Show the task" : "Wider editor";
      expandBtn.title = on ? "Bring back the task, lesson and hints" : "Hide the task column to give your spell more room";
      if (editor) { editor.refresh(); later(function () { if (editor) editor.refresh(); }, 50); }
    }
    var editorPanel = h("section", { class: "editor-panel", "aria-labelledby": edTitleId },
      h("div", { class: "panel-head" },
        h("h2", { class: "card-title", id: edTitleId }, u.emoji("✒️"), " Your spell"),
        h("div", { class: "panel-tools" },
          expandBtn,
          fontButton(-1, "Smaller editor text", "A−"),
          fontButton(1, "Bigger editor text", "A+"))),
      editorHost);
    workRef.editorPanel = editorPanel;

    var castLabel = h("span", { class: "btn-label" }, "Cast Spell");
    var castReasonId = u.uid("cast-reason");
    var castBtn = h("button", { type: "button", class: "btn btn-cast btn-lg", "aria-describedby": castReasonId },
      h("span", { class: "cast-icon", "aria-hidden": "true" }, "✨"), castLabel, h("kbd", { class: "btn-kbd" }, MOD + "+Enter"));
    var castReason = h("p", { class: "cast-reason", id: castReasonId, hidden: true });
    var answerBtn = u.button("Answer Scroll", { kind: "ghost", size: "sm", icon: "📜", class: "answer-btn" });
    var hintQuick = hintsPanel ? u.button("Hint", { kind: "ghost", size: "sm", icon: "🦉", ariaLabel: "Go to Pip's hints" }) : null;
    var resetBtn = u.button("Reset", { kind: "ghost", size: "sm", icon: "↺", ariaLabel: "Reset your spell to the starting code" });
    var castBar = h("div", { class: "cast-bar" },
      castBtn,
      h("div", { class: "cast-tools" }, hintQuick, answerBtn, resetBtn),
      castReason);

    var results = h("div", { class: "results", tabindex: "-1", "aria-label": "Results of your cast" });
    if (coach) results.setAttribute("data-status", "pending");
    else UI.results.idle(results);
    var backToTask = u.button("Back to the task", {
      kind: "link", icon: "↑", class: "back-to-task",
      onClick: function () { reveal("task", tabs.task.btn); }
    });
    var resultsPanel = h("section", { class: "results-panel", "aria-label": "Results" }, coach, results, backToTask);

    var work = h("div", { class: "ch-work" },
      h("div", { class: "work-inner" }, engineBanner, editorPanel, castBar, resultsPanel));

    var layout = h("div", { class: "challenge-layout" }, brief, work);
    var el = h("section", { class: "challenge-screen" }, bar, layout);

    // ------------------------------------------------------------------------
    // Editor (drafts go straight to SS.Save, which debounces and flushes on pagehide)
    // ------------------------------------------------------------------------
    var startCode = (function () {
      var e = entry();
      if (typeof e.draft === "string" && e.draft.trim() !== "") return e.draft;
      if (typeof e.bestCode === "string" && e.bestCode.trim() !== "") return e.bestCode;
      return ch.starter || "";
    })();
    editor = UI.Editor.create(editorHost, {
      value: startCode,
      label: "Spell editor for " + ch.title + " (Python)",
      fontSize: Number(u.settings().editorFontSize) || 15,
      onChange: function (code) { u.safe(function () { SS.Save.saveDraft(ch.id, code); }); },
      onCast: function () { cast(); }
    });

    function lineOf(n) {
      return String(castCode || "").split("\n")[n - 1];
    }

    function goToLine(line) {
      if (!editor) return;
      if (narrow()) u.safe(function () { editorPanel.scrollIntoView({ behavior: smooth(), block: "start" }); });
      editor.goToLine(line);
    }

    function markLines(result) {
      editor.clearMarks();
      if (!result) return;
      if (result.status === "error" && result.error && result.error.line) {
        editor.markLine(result.error.line, "error");
      } else if (result.status === "failed") {
        var f = UI.results.firstFailure(result);
        if (f && f.line) editor.markLine(f.line, "warning");
      }
    }

    // ------------------------------------------------------------------------
    // Casting
    // ------------------------------------------------------------------------
    function updateCast() {
      var st = app().state.engine;
      var ready = st.state === "ready";
      var reason = "";
      if (!casting) {
        if (st.state === "loading" || st.state === "idle") reason = "⏳ Python is still waking up (the first visit can take a minute). Read the lesson while you wait!";
        else if (st.state === "busy") reason = "⏳ Python is finishing another spell…";
        else if (st.state === "error") reason = "⚠️ Spells can't be cast until Python loads. See the message above.";
      }
      var disabled = casting || !ready;
      castBtn.setAttribute("aria-disabled", disabled ? "true" : "false");
      castBtn.classList.toggle("is-disabled", disabled && !casting);
      castBtn.classList.toggle("is-casting", casting);
      castLabel.textContent = casting ? "Casting…" : "Cast Spell";
      castReason.textContent = reason;
      castReason.hidden = !reason;
    }

    function cast() {
      if (casting || destroyed) return;
      if (UI.dialogs.isOpen()) return;
      if (app().state.engine.state !== "ready") {
        UI.sound.play("fail");
        castReason.classList.remove("flash");
        void castReason.offsetWidth;
        castReason.classList.add("flash");
        u.announce(castReason.textContent || "Python isn't ready yet.");
        return;
      }
      castCode = editor.getValue();
      u.safe(function () { SS.Save.saveDraft(ch.id, castCode); });
      casting = true;
      updateCast();
      editor.clearMarks();
      timers.forEach(clearTimeout);
      timers = [];
      stage.reset();
      stage.casting(true);
      UI.results.casting(results);
      UI.sound.play("cast");
      u.announce("Casting your spell…");
      var started = Date.now();
      var code = castCode;
      var request;
      try {
        request = Promise.resolve(SS.PythonRunner.run({ code: code, tests: ch.tests || "", inputs: inputs, timeLimitMs: ch.timeLimitMs }));
      } catch (err) {
        request = Promise.reject(err);
      }
      request.catch(function (err) {
        return {
          status: "internal-error", stdout: "", truncated: false, tests: [], passed: 0, total: 0,
          error: { type: "InternalError", message: String((err && err.message) || err), line: null, phase: "runtime", traceback: "", friendly: "The spell couldn't be sent to Python. Try casting again." }
        };
      }).then(function (result) {
        if (destroyed) { finishedAfterLeaving(result, code); return null; }
        var wait = Math.max(0, 380 - (Date.now() - started));
        return u.delay(wait).then(function () { return result; });
      }).then(function (result) {
        if (!result) return;
        if (destroyed) { finishedAfterLeaving(result, code); return; }
        finishCast(result);
      });
    }

    /** The player left while the spell was being cast: keep the result, skip the screen. */
    function finishedAfterLeaving(result, code) {
      var info = recordResult(ch, result, code);
      app().refreshTopbar();
      if (!info) return;
      UI.sound.play("success");
      UI.dialogs.toast("✨ " + ch.title + " mastered! " + starText(info.completion.stars) +
        (info.completion.xpGained > 0 ? " +" + info.completion.xpGained + " XP" : ""), { kind: "ok" });
      var cur = app().current();
      var name = app().state.screen;
      if (cur && cur.refresh && (name === "chapter" || name === "map") && !UI.dialogs.isOpen()) cur.refresh();
    }

    function finishCast(result) {
      casting = false;
      stage.casting(false);
      var info = recordResult(ch, result, castCode);
      UI.results.render(results, result, { inputs: inputs, onGoToLine: goToLine, getLine: lineOf });
      markLines(result);
      updateCast();
      u.announce(UI.results.announcement(result));
      var verdict = results.querySelector(".verdict");
      if (verdict) u.safe(function () { verdict.scrollIntoView({ behavior: smooth(), block: "nearest" }); });
      if (info) {
        failStreak = 0;
        onSuccess(result, info);
        return;
      }
      failStreak += 1;
      UI.sound.play(result && (result.status === "error" || result.status === "timeout") ? "error" : "fail");
      stage.fizzle();
      refreshAnswer();
      renderHints();
      var e = entry();
      if (!nudged && failStreak >= 2 && (e.hintsUsed || 0) < hints.length) {
        nudged = true;
        later(function () {
          if (!casting && !UI.dialogs.isOpen()) UI.dialogs.toast("Pip hoots softly: a hint is ready whenever you want one.", { icon: "🦉" });
        }, 1200);
      }
    }

    function onSuccess(result, info) {
      renderBest();
      renderHints();
      renderNextLock();
      refreshAnswer();
      app().refreshTopbar();
      UI.sound.play("success");
      if (!narrow()) u.safe(function () { global.scrollTo({ top: 0, behavior: smooth() }); });
      else u.safe(function () { stage.el.scrollIntoView({ behavior: smooth(), block: "nearest" }); });
      stage.play({ text: result.stdout });
      var c = info.completion || {};
      var repeat = !c.firstTime && !(c.xpGained > 0) && !info.chapterDone && !info.gameDone && !info.rankUp;
      if (repeat) {
        // Mastered again with no new stars: a quiet toast instead of the big dialog.
        UI.dialogs.toast("✨ Mastered again! This cast " + starText(c.stars) + " · Best " + starText(Math.max(c.stars || 0, c.previousStars || 0)), { kind: "ok" });
        return;
      }
      later(function () { showSuccess(info); }, u.reducedMotion() ? 150 : 1150);
    }

    function showSuccess(info) {
      var c = info.completion || {};
      var earned = Math.max(0, Math.min(3, c.stars || 0));
      var icon = h("div", { class: "success-icon" }, h("span", { class: "success-emoji", "aria-hidden": "true" }, scene.successIcon || "✨"));
      var starEls = [0, 1, 2].map(function () { return h("span", { class: "success-star", "aria-hidden": "true" }, "★"); });
      var lines = h("div", { class: "success-lines" });
      if (scene.successText) lines.appendChild(h("p", { class: "success-text" }, scene.successText));
      if (c.firstTime) lines.appendChild(h("p", { class: "success-xp" }, "+" + (c.xpGained || 0) + " XP"));
      else if (c.xpGained > 0) lines.appendChild(h("p", { class: "success-xp" }, "New best! +" + c.xpGained + " XP"));
      if (!c.firstTime) {
        lines.appendChild(h("p", { class: "success-note" }, "This cast " + starText(earned) + " · Best " + starText(Math.max(earned, c.previousStars || 0))));
      }
      lines.appendChild(h("p", { class: "success-legend" }, "★★★ no hints · ★★ one hint · ★ more help"));
      var nextChapter = UI.chapterStory.nextChapter(chapter);
      if (info.chapterDone) {
        lines.appendChild(h("div", { class: "success-banner chapter" },
          h("span", { class: "success-banner-icon", "aria-hidden": "true" }, "🏆"),
          h("div", null, h("p", { class: "success-banner-title" }, "Chapter mastered!"),
            h("p", { class: "success-banner-sub" }, info.gameDone ? "You've mastered every spell in the academy!" : nextChapter ? "A new area has opened: " + nextChapter.title : "Every area is mastered!"))));
      }
      if (info.rankUp) {
        lines.appendChild(h("p", { class: "success-rank-tease" }, u.emoji("🎉"), " You've earned a new rank…"));
      }
      // Any choice first shows the rank-up moment (if there is one), then does its job.
      function then(fn) {
        return function () {
          if (info.rankUp) showRankUp(info.rankUp, info.xp, castBtn, fn);
          else fn();
        };
      }
      var actions = [];
      if (info.chapterDone || info.gameDone) {
        actions.push({ label: "Continue ▸", kind: "primary", onClick: then(function () { app().go("map"); }) });
      } else if (info.next) {
        actions.push({
          label: "Next spell ▸", kind: "primary",
          onClick: then(function () {
            var next = info.next;
            if (next.chapterId !== ch.chapterId && !app().hasSeen("chapter:" + next.chapterId)) app().go("chapter", { id: next.chapterId });
            else app().go("challenge", { id: next.id });
          })
        });
        actions.push({ label: "Map", kind: "ghost", icon: "🗺️", onClick: then(function () { app().go("map"); }) });
      } else {
        actions.push({ label: "Back to the map", kind: "primary", icon: "🗺️", onClick: then(function () { app().go("map"); }) });
      }
      actions.push({ label: "Stay here", kind: "ghost", value: "stay", onClick: then(function () {}) });
      UI.dialogs.open({
        title: "Spell Mastered!",
        className: "modal-success",
        size: "sm",
        body: [icon, h("div", { class: "success-stars", role: "img", "aria-label": earned + " of 3 stars" }, starEls), lines],
        actions: actions,
        sound: false,
        onClose: function (value) { if (value === undefined && info.rankUp) showRankUp(info.rankUp, info.xp, castBtn, null); }
      });
      var reduced = u.reducedMotion();
      starEls.forEach(function (s, i) {
        if (i >= earned) return;
        setTimeout(function () { s.classList.add("on"); UI.sound.play("star", i); }, reduced ? 0 : 320 + i * 280);
      });
      UI.effects.burst(icon, 22);
      if (info.chapterDone) UI.effects.celebrate();
    }

    // ------------------------------------------------------------------------
    // Answer Scroll and Reset
    // ------------------------------------------------------------------------
    function answerAvailable() {
      if (conf.allowAnswerScroll === false || !ch.solution) return false;
      var e = entry();
      if (e.answerRevealed) return true;
      var threshold = typeof conf.answerScrollAfterFailedCasts === "number" ? conf.answerScrollAfterFailedCasts : 3;
      return (e.failedCasts || 0) >= threshold;
    }

    function refreshAnswer() {
      answerBtn.hidden = !answerAvailable();
      var label = answerBtn.querySelector(".btn-label");
      if (label) label.textContent = entry().answerRevealed ? "View Answer Scroll" : "Answer Scroll";
    }

    function showAnswer() {
      UI.dialogs.open({
        title: "The Answer Scroll", icon: "📜", size: "lg", className: "modal-answer",
        body: h("div", { class: "answer-body" },
          h("p", null, "Here is one way to cast this spell. There are often others!"),
          UI.rich.codeBlock(ch.solution, undefined, { title: "Reference spell" }),
          h("p", { class: "answer-tip" }, u.emoji("💡"), " Understanding beats copying: read it line by line, then change something small and predict what will happen before you cast.")),
        actions: [
          {
            label: "Put it in my editor", kind: "ghost", icon: "✒️",
            onClick: function () {
              editor.replaceAll(ch.solution);
              u.safe(function () { SS.Save.saveDraft(ch.id, editor.getValue()); });
              UI.dialogs.toast("The reference spell is in your editor (" + MOD + "+Z undoes it).", { icon: "📜" });
            }
          },
          { label: "Close", kind: "primary" }
        ]
      });
    }

    answerBtn.addEventListener("click", function () {
      var e = entry();
      if (e.answerRevealed) { showAnswer(); return; }
      UI.dialogs.confirm({
        title: "Unroll the Answer Scroll?", icon: "📜", confirmLabel: "Show me the answer",
        message: h("div", null,
          h("p", null, "The Answer Scroll shows a complete, working spell."),
          h("p", null, "After reading it, this spell can earn at most ", u.stars(1), " (1 star)", e.completed ? ". Stars you've already earned are kept." : "."),
          h("p", null, "Understanding the answer is still real learning!"))
      }).then(function (ok) {
        if (!ok || destroyed) return;
        u.safe(function () { SS.Save.revealAnswer(ch.id); });
        refreshAnswer();
        renderHints();
        showAnswer();
      });
    });

    resetBtn.addEventListener("click", function () {
      UI.dialogs.confirm({
        title: "Start this spell over?", icon: "↺", danger: true, confirmLabel: "Reset my spell",
        message: "Your code will be replaced by the starting scroll. (Changed your mind afterwards? Press " + MOD + "+Z in the editor.)"
      }).then(function (ok) {
        if (!ok || destroyed) return;
        editor.replaceAll(ch.starter || "");
        editor.clearMarks();
        u.safe(function () { SS.Save.saveDraft(ch.id, editor.getValue()); });
        stage.reset();
        UI.results.idle(results);
        UI.sound.play("reset");
        editor.focus();
      });
    });

    if (hintQuick) hintQuick.addEventListener("click", function () {
      reveal("hints", hintBtn.hidden ? hintsPanel.querySelector("h2") : hintBtn);
    });
    castBtn.addEventListener("click", cast);

    // Ctrl/⌘+Enter casts from anywhere on this screen.
    function onKey(e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.defaultPrevented && !UI.dialogs.isOpen()) {
        e.preventDefault();
        cast();
      }
    }
    document.addEventListener("keydown", onKey);

    var unsubEngine = app().onEngine(function (st) {
      if (destroyed) return;
      updateCast();
      renderEngineBanner(st);
    });

    renderHints();
    refreshAnswer();
    setExpanded(prefs.expanded);
    mq = P(function () { return global.matchMedia(NARROW); }, null);
    setTabbed(mq ? mq.matches : false);
    if (mq) {
      onMq = function (ev) { if (!destroyed) setTabbed(ev.matches); };
      if (mq.addEventListener) mq.addEventListener("change", onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }

    return {
      el: el,
      title: ch.title,
      onShow: function () {
        editor.refresh();
        later(function () { if (editor) editor.refresh(); }, 60);
        // Arriving straight from the map (the gold Begin/Continue button): tell the chapter's story first.
        if (chapter.intro && !app().hasSeen("chapter:" + chapter.id)) {
          later(function () { if (!UI.dialogs.isOpen()) UI.chapterStory.intro(chapter); }, 200);
        }
      },
      onSettings: function (s) {
        if (editor) editor.setFontSize(Number(s.editorFontSize) || 15);
      },
      refresh: function () { renderNextLock(); renderHints(); },
      destroy: function () {
        destroyed = true;
        timers.forEach(clearTimeout);
        timers = [];
        document.removeEventListener("keydown", onKey);
        if (mq && onMq) {
          if (mq.removeEventListener) mq.removeEventListener("change", onMq);
          else if (mq.removeListener) mq.removeListener(onMq);
        }
        unsubEngine();
        if (editor) editor.destroy();
        editor = null;
      }
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
