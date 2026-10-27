/*
 * Syntax & Sorcery — the challenge screen (SS.UI.screens.challenge), the heart
 * of the game: read the task → write a spell → cast → understand the result → fix.
 *
 * Layout (style.css "Challenge"): a brief column (scene, story, task, input,
 * Spell Scroll), the work column (editor, Cast, results) and Pip's hints. From
 * 1000px wide the work column sits on the right and stays in view while the
 * left column scrolls; below that everything stacks.
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

  function stacked() {
    return !!P(function () { return global.matchMedia("(max-width: 999px)").matches; }, false);
  }

  function scrollIntoViewIfNeeded(el, block) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    var vh = global.innerHeight || document.documentElement.clientHeight;
    if (r.top < 60 || r.bottom > vh) {
      u.safe(function () { el.scrollIntoView({ behavior: u.reducedMotion() ? "auto" : "smooth", block: block || "start" }); });
    }
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
    var editor = null;
    var ada = (SS.CHARACTERS && SS.CHARACTERS.ada) || { name: "Archmage Ada", icon: "🧙‍♀️" };
    var MOD = UI.Editor.modKey;

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

    var nextBtn = null;
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
    nextBtn = navButton(nextCh, "next");
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
    // Brief: scene, story, task, input, lesson
    // ------------------------------------------------------------------------
    var stage = UI.effects.createStage(scene);
    var story = ch.story ? h("div", { class: "story-block" },
      h("div", { class: "story-portrait", "aria-hidden": "true" }, ada.icon || "🧙‍♀️"),
      h("div", { class: "story-bubble" },
        h("p", { class: "story-speaker" }, ada.name || "Archmage Ada"),
        UI.rich.block(ch.story, "story-text"))) : null;

    var taskId = u.uid("task");
    var workRef = {};
    var task = h("section", { class: "task-card", "aria-labelledby": taskId },
      h("h2", { class: "card-title", id: taskId }, u.emoji("🎯"), " Your Task"),
      UI.rich.block(ch.task, "task-text"),
      u.button("Jump to your spell", {
        kind: "link", icon: "✒️", class: "jump-to-editor",
        onClick: function () {
          u.safe(function () { workRef.editorPanel.scrollIntoView({ behavior: u.reducedMotion() ? "auto" : "smooth", block: "start" }); });
          if (editor) editor.focus();
        }
      }));

    var inputsNote = inputs.length ? h("section", { class: "inputs-note", "aria-label": "Input for this spell" },
      h("p", { class: "inputs-title" }, u.emoji("📥"), " This spell receives input"),
      h("p", { class: "inputs-help" }, "Each time your spell calls ", h("code", { class: "inline-code" }, "input()"), ", it gets the next answer:"),
      h("ol", { class: "input-list" }, inputs.map(function (v) {
        return h("li", null, h("code", { class: "inline-code input-chip" }, v === "" ? "(empty)" : v));
      }))) : null;

    var lesson = ch.lesson ? h("details", { class: "lesson", open: !entry().completed },
      h("summary", { class: "lesson-summary" },
        h("span", { class: "lesson-summary-title" }, u.emoji("📖"), " Spell Scroll"),
        h("span", { class: "lesson-summary-sub" }, "the lesson for this spell")),
      UI.rich.block(ch.lesson, "lesson-body")) : null;

    var brief = h("div", { class: "ch-brief" }, stage.el, story, task, inputsNote, lesson);

    // ------------------------------------------------------------------------
    // Pip's hints
    // ------------------------------------------------------------------------
    var hintsTitleId = u.uid("hints");
    var hintList = h("ol", { class: "hint-list" });
    var hintCost = h("p", { class: "hint-cost" });
    var hintBtn = u.button("Ask Pip for a hint", { kind: "ghost", icon: "🦉", class: "hint-btn" });
    var maxStars = h("p", { class: "max-stars" });
    var hintsPanel = h("section", { class: "hints-panel", "aria-labelledby": hintsTitleId },
      h("div", { class: "hints-head" },
        h("h2", { class: "card-title", id: hintsTitleId, tabindex: "-1" }, u.emoji("🦉"), " Pip's hints"),
        maxStars),
      hintList,
      h("div", { class: "hint-actions" }, hintBtn, hintCost));

    function starsFor(hintsUsed, answerRevealed) {
      return P(function () { return SS.Progress.starsFor({ hintsUsed: hintsUsed, answerRevealed: answerRevealed }); },
        answerRevealed || hintsUsed >= 2 ? 1 : hintsUsed === 1 ? 2 : 3);
    }

    function renderHints(focusIndex) {
      var e = entry();
      var used = Math.min(e.hintsUsed || 0, hints.length);
      u.clear(hintList);
      hints.slice(0, used).forEach(function (hint, i) {
        hintList.appendChild(h("li", { class: "hint", tabindex: "-1" },
          h("p", { class: "hint-label" }, "🦉 Pip whispers… ", h("span", { class: "hint-num" }, "(hint " + (i + 1) + " of " + hints.length + ")")),
          UI.rich.block(hint, "hint-text")));
      });
      var nowStars = starsFor(e.hintsUsed || 0, !!e.answerRevealed);
      u.clear(maxStars);
      u.append(maxStars, [h("span", { class: "max-stars-label" }, e.completed ? "You can still earn" : "Stars available"), u.stars(nowStars)]);
      if (!hints.length) {
        hintBtn.hidden = true;
        hintCost.textContent = "Pip has no hints for this one. Try the Spell Scroll!";
      } else if (used >= hints.length) {
        hintBtn.hidden = true;
        hintCost.textContent = "You've heard all of Pip's hints." + (answerAvailable() || !e.answerRevealed ? "" : "");
      } else {
        hintBtn.hidden = false;
        var label = hintBtn.querySelector(".btn-label");
        label.textContent = used === 0 ? "Ask Pip for a hint" : "Ask for hint " + (used + 1) + " of " + hints.length;
        var nextStars = starsFor(used + 1, !!e.answerRevealed);
        u.clear(hintCost);
        if (nextStars < nowStars) {
          u.append(hintCost, ["This hint lowers the stars for this spell to ", u.stars(nextStars), "."]);
        } else {
          hintCost.textContent = "No extra star cost.";
        }
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
      var hint = hints[Math.min(used, hints.length) - 1];
      u.announce("Pip whispers: " + UI.rich.plainText(hint));
    });

    var help = h("div", { class: "ch-help" }, hintsPanel);

    // ------------------------------------------------------------------------
    // Work: coach note, engine banner, editor, cast bar, results
    // ------------------------------------------------------------------------
    var coach = null;
    if (!app().hasSeen("tutorial")) {
      var coachId = u.uid("coach");
      coach = h("aside", { class: "coach", "aria-labelledby": coachId },
        h("p", { class: "coach-title", id: coachId }, u.emoji("✨"), " How to cast a spell"),
        h("ol", { class: "coach-steps" },
          h("li", null, "Read ", h("strong", null, "Your Task"), ". The ", h("strong", null, "Spell Scroll"), " teaches what you need."),
          h("li", null, "Write Python in the editor below."),
          h("li", null, "Press ", h("strong", null, "✨ Cast Spell"), " (or ", h("kbd", null, MOD + "+Enter"), "). The ", h("strong", null, "Scrying Pool"), " shows what your spell printed; the ", h("strong", null, "Trials"), " show whether it worked."),
          h("li", null, "Something went wrong? Read the explanation, fix the highlighted line and cast again. Pip the owl has hints too.")),
        u.button("Got it!", {
          kind: "primary", size: "sm", class: "coach-ok",
          onClick: function () {
            app().markSeen("tutorial");
            u.remove(coach);
            coach = null;
            if (editor) { editor.refresh(); editor.focus(); }
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
          h("p", { class: "banner-sub" }, "You can still read the story, the task and the Spell Scroll.")),
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
    var editorPanel = h("section", { class: "editor-panel", "aria-labelledby": edTitleId },
      h("div", { class: "panel-head" },
        h("h2", { class: "card-title", id: edTitleId }, u.emoji("✒️"), " Your spell"),
        h("div", { class: "panel-tools" },
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
    var hintQuick = u.button("Hint", { kind: "ghost", size: "sm", icon: "🦉", ariaLabel: "Go to Pip's hints" });
    var resetBtn = u.button("Reset", { kind: "ghost", size: "sm", icon: "↺", ariaLabel: "Reset your spell to the starting code" });
    var castBar = h("div", { class: "cast-bar" },
      castBtn,
      h("div", { class: "cast-tools" }, hintQuick, answerBtn, resetBtn),
      castReason);

    var results = h("div", { class: "results", tabindex: "-1", "aria-label": "Results of your cast" });
    UI.results.idle(results);
    var resultsPanel = h("section", { class: "results-panel", "aria-label": "Results" }, results);

    var work = h("div", { class: "ch-work" },
      h("div", { class: "work-inner" }, coach, engineBanner, editorPanel, castBar, resultsPanel));

    var layout = h("div", { class: "challenge-layout" }, brief, work, help);
    var el = h("section", { class: "challenge-screen" }, bar, layout);

    // ------------------------------------------------------------------------
    // Editor
    // ------------------------------------------------------------------------
    var startCode = (function () {
      var e = entry();
      if (typeof e.draft === "string" && e.draft.trim() !== "") return e.draft;
      if (typeof e.bestCode === "string" && e.bestCode.trim() !== "") return e.bestCode;
      return ch.starter || "";
    })();
    var saveDraft = u.debounce(function () {
      if (editor) u.safe(function () { SS.Save.saveDraft(ch.id, editor.getValue()); });
    }, 400);
    editor = UI.Editor.create(editorHost, {
      value: startCode,
      label: "Spell editor for " + ch.title + " (Python)",
      fontSize: Number(u.settings().editorFontSize) || 15,
      onChange: function () { saveDraft(); },
      onCast: function () { cast(); }
    });

    function lineOf(n) {
      var lines = String(castCode || "").split("\n");
      return lines[n - 1];
    }

    function goToLine(line) {
      if (!editor) return;
      if (stacked()) u.safe(function () { editorPanel.scrollIntoView({ behavior: u.reducedMotion() ? "auto" : "smooth", block: "start" }); });
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
      saveDraft.cancel();
      u.safe(function () { SS.Save.saveDraft(ch.id, castCode); });
      casting = true;
      updateCast();
      editor.clearMarks();
      stage.reset();
      stage.casting(true);
      UI.results.casting(results);
      UI.sound.play("cast");
      u.announce("Casting your spell…");
      var started = Date.now();
      var request;
      try {
        request = Promise.resolve(SS.PythonRunner.run({ code: castCode, tests: ch.tests || "", inputs: inputs, timeLimitMs: ch.timeLimitMs }));
      } catch (err) {
        request = Promise.reject(err);
      }
      request.catch(function (err) {
        return {
          status: "internal-error", stdout: "", truncated: false, tests: [], passed: 0, total: 0,
          error: { type: "InternalError", message: String((err && err.message) || err), line: null, phase: "runtime", traceback: "", friendly: "The spell couldn't be sent to Python. Try casting again." }
        };
      }).then(function (result) {
        var wait = Math.max(0, 380 - (Date.now() - started));
        return u.delay(wait).then(function () { return result; });
      }).then(function (result) {
        if (destroyed) return;
        finishCast(result);
      });
    }

    function finishCast(result) {
      casting = false;
      stage.casting(false);
      var passed = !!result && result.status === "passed";
      u.safe(function () { SS.Save.recordCast(ch.id, { passed: passed }); });
      UI.results.render(results, result, { inputs: inputs, onGoToLine: goToLine, getLine: lineOf });
      results.scrollTop = 0;
      markLines(result);
      updateCast();
      u.announce(UI.results.announcement(result));
      if (passed) {
        failStreak = 0;
        onSuccess(result);
        return;
      }
      failStreak += 1;
      UI.sound.play(result && (result.status === "error" || result.status === "timeout") ? "error" : "fail");
      stage.fizzle();
      refreshAnswer();
      renderHints();
      if (stacked()) scrollIntoViewIfNeeded(resultsPanel, "start");
      var e = entry();
      if (!nudged && failStreak >= 2 && (e.hintsUsed || 0) < hints.length) {
        nudged = true;
        setTimeout(function () {
          if (!destroyed) UI.dialogs.toast("Pip hoots softly: a hint is ready whenever you want one.", { icon: "🦉" });
        }, 900);
      }
    }

    function snapshot(prof) {
      var xp = P(function () { return SS.Progress.totalXp(prof); }, 0) || 0;
      return {
        xp: xp,
        rank: P(function () { return SS.Progress.rankFor(xp); }, null),
        chapter: P(function () { return SS.Progress.chapterStats(prof, chapter.id); }, null),
        overall: P(function () { return SS.Progress.overallStats(prof); }, null)
      };
    }

    function onSuccess(result) {
      var before = snapshot(u.profile());
      var completion = u.safe(function () { return SS.Save.recordCompletion(ch.id, { code: castCode }); }, null);
      var e = entry();
      if (!completion) completion = { firstTime: false, previousStars: e.stars || 0, stars: e.stars || starsFor(e.hintsUsed || 0, !!e.answerRevealed), xpGained: 0 };
      var prof = u.profile();
      var after = snapshot(prof);
      var info = {
        completion: completion,
        rankUp: before.rank && after.rank && after.rank.index > before.rank.index ? after.rank : null,
        chapterDone: !!(after.chapter && after.chapter.complete && !(before.chapter && before.chapter.complete)),
        gameDone: !!(after.overall && after.overall.total && after.overall.completed >= after.overall.total &&
          !(before.overall && before.overall.completed >= before.overall.total)),
        next: P(function () { return SS.Progress.nextChallenge(prof, ch.id); }, null)
      };
      renderBest();
      renderHints();
      renderNextLock();
      refreshAnswer();
      app().refreshTopbar();
      UI.sound.play("success");
      if (!stacked()) u.safe(function () { global.scrollTo({ top: 0, behavior: u.reducedMotion() ? "auto" : "smooth" }); });
      else scrollIntoViewIfNeeded(stage.el, "start");
      stage.play({ text: result.stdout });
      u.delay(u.reducedMotion() ? 150 : 1150).then(function () {
        if (!destroyed) showSuccess(info);
      });
    }

    function showSuccess(info) {
      var c = info.completion || {};
      var earned = Math.max(0, Math.min(3, c.stars || 0));
      var best = Math.max(earned, c.previousStars || 0);
      var icon = h("div", { class: "success-icon" }, h("span", { class: "success-emoji", "aria-hidden": "true" }, scene.successIcon || "✨"));
      var starEls = [0, 1, 2].map(function () { return h("span", { class: "success-star", "aria-hidden": "true" }, "★"); });
      var lines = h("div", { class: "success-lines" });
      if (scene.successText) lines.appendChild(h("p", { class: "success-text" }, scene.successText));
      if (c.firstTime) lines.appendChild(h("p", { class: "success-xp" }, "+" + (c.xpGained || 0) + " XP"));
      else if (c.xpGained > 0) lines.appendChild(h("p", { class: "success-xp" }, "New best! +" + c.xpGained + " XP"));
      else lines.appendChild(h("p", { class: "success-note" }, "Mastered again! Your best stays at " + best + " of 3 stars."));
      lines.appendChild(h("p", { class: "success-legend" }, "★★★ no hints · ★★ one hint · ★ more help"));
      if (info.rankUp) {
        lines.appendChild(h("div", { class: "success-banner rankup" },
          h("span", { class: "success-banner-icon", "aria-hidden": "true" }, info.rankUp.icon || "✦"),
          h("div", null, h("p", { class: "success-banner-title" }, "New rank: " + info.rankUp.title), h("p", { class: "success-banner-sub" }, "Your wizardry grows stronger!"))));
      }
      var nextChapter = UI.chapterStory.nextChapter(chapter);
      if (info.chapterDone) {
        lines.appendChild(h("div", { class: "success-banner chapter" },
          h("span", { class: "success-banner-icon", "aria-hidden": "true" }, "🏆"),
          h("div", null, h("p", { class: "success-banner-title" }, "Chapter mastered!"),
            h("p", { class: "success-banner-sub" }, info.gameDone ? "You've mastered every spell in the academy!" : nextChapter ? "A new area has opened: " + nextChapter.title : "Every area is mastered!"))));
      }
      var actions = [];
      if (info.chapterDone || info.gameDone) {
        actions.push({ label: "Continue", kind: "primary", icon: "▶", onClick: function () { app().go("map"); } });
      } else if (info.next) {
        actions.push({
          label: "Next spell", kind: "primary", icon: "▶",
          onClick: function () {
            var next = info.next;
            if (next.chapterId !== ch.chapterId && !app().hasSeen("chapter:" + next.chapterId)) app().go("chapter", { id: next.chapterId });
            else app().go("challenge", { id: next.id });
          }
        });
        actions.push({ label: "Map", kind: "ghost", icon: "🗺️", onClick: function () { app().go("map"); } });
      } else {
        actions.push({ label: "Back to the map", kind: "primary", icon: "🗺️", onClick: function () { app().go("map"); } });
      }
      actions.push({ label: "Stay here", kind: "ghost", value: "stay" });
      UI.dialogs.open({
        title: "Spell Mastered!",
        className: "modal-success",
        size: "sm",
        body: [icon, h("div", { class: "success-stars", role: "img", "aria-label": earned + " of 3 stars" }, starEls), lines],
        actions: actions,
        sound: false
      });
      var reduced = u.reducedMotion();
      starEls.forEach(function (s, i) {
        if (i >= earned) return;
        setTimeout(function () { s.classList.add("on"); UI.sound.play("star", i); }, reduced ? 0 : 320 + i * 280);
      });
      UI.effects.burst(icon, 22);
      if (info.rankUp) setTimeout(function () { UI.sound.play("rankup"); }, reduced ? 0 : 1300);
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

    hintQuick.addEventListener("click", function () {
      u.safe(function () { hintsPanel.scrollIntoView({ behavior: u.reducedMotion() ? "auto" : "smooth", block: "center" }); });
      u.focusEl(hintBtn.hidden ? hintsPanel.querySelector("h2") : hintBtn);
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

    return {
      el: el,
      title: ch.title,
      onShow: function () {
        editor.refresh();
        setTimeout(function () { if (editor) editor.refresh(); }, 60);
      },
      onSettings: function (s) {
        if (editor) editor.setFontSize(Number(s.editorFontSize) || 15);
      },
      refresh: function () { renderNextLock(); renderHints(); },
      destroy: function () {
        destroyed = true;
        document.removeEventListener("keydown", onKey);
        unsubEngine();
        saveDraft.flush();
        if (editor) editor.destroy();
        editor = null;
      }
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
