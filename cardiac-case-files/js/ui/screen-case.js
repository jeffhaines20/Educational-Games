/*
 * The Cardiac Case Files — the CASE screen (CCF.UI.screens.case). DESIGN §4.3 and §7.
 *
 * Two columns at ≥ 1100 px — the case FILE (a manila folder with tabs: Referral · History ·
 * Medications · Vitals · Exam · Tests) and the STEPS panel (a clipboard: one question at a
 * time) — stacked below that, with a "go to the step" button when the step is off screen.
 *
 * In-progress state is saved after every action through CCF.Save.saveCaseProgress(id, {
 *   step,      index of the step on screen
 *   strikes,   wrong attempts + hints + "show me" uses, whole case
 *   hints,     hints revealed, whole case
 *   answers: [ { w: wrong attempts, h: hints shown, x: [wrong keys], d: 1 solved, m: 1 shown } ]  per step
 * }) — everything else (revealed exhibits, vitals history, "New" flags) is derived from it, so a
 * reload resumes at the same step with the same file. The last step's solve calls
 * CCF.Save.recordSolve and the debrief follows: CASE CLOSED stamp, stars, XP, rank-up.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;
  var R = function () { return UI.rich; };
  var X = function () { return UI.exhibits; };

  function app() { return UI.app; }

  var TABS = [
    { id: "referral", label: "Referral", icon: "referral" },
    { id: "history", label: "History", icon: "history" },
    { id: "meds", label: "Medications", short: "Meds", icon: "medications" },
    { id: "vitals", label: "Vitals", icon: "vitals" },
    { id: "exam", label: "Exam", icon: "exam" },
    { id: "tests", label: "Tests", icon: "tests" }
  ];

  var MENTOR_LINES = {
    3: "Textbook work — not a single strike. I'd trust you with this patient any day.",
    2: "Good detective work. Read the take-home points and this one's yours for good.",
    1: "You got there — and the patient was safe. Read the debrief, then try it again for more stars."
  };

  // ------------------------------------------------------------------------------------
  // State helpers
  // ------------------------------------------------------------------------------------

  function intOr(v, d) { v = Number(v); return isFinite(v) && v >= 0 ? Math.floor(v) : d; }

  function cleanState(cur, n) {
    var st = { step: 0, strikes: 0, hints: 0, answers: [] };
    if (!cur || typeof cur !== "object") return st;
    st.step = Math.min(n - 1, intOr(cur.step, 0));
    st.strikes = intOr(cur.strikes, 0);
    st.hints = intOr(cur.hints, 0);
    var list = Array.isArray(cur.answers) ? cur.answers : [];
    for (var i = 0; i < n; i++) {
      var a = list[i] && typeof list[i] === "object" ? list[i] : {};
      st.answers.push({ w: intOr(a.w, 0), h: intOr(a.h, 0), x: Array.isArray(a.x) ? a.x.slice(0, 12) : [], d: a.d ? 1 : 0, m: a.m ? 1 : 0 });
    }
    // Every step before the current one is solved by definition.
    for (var j = 0; j < st.step; j++) st.answers[j].d = 1;
    return st;
  }

  function freshState(n) { return cleanState(null, n); }

  function correctOption(step) {
    return (step.options || []).filter(function (o) { return o && o.correct; })[0] || null;
  }

  /** Exhibit ids opened by solved test steps. */
  function revealedIds(kase, st) {
    var out = {};
    (kase.steps || []).forEach(function (s, j) {
      if (s.type !== "test" || !st.answers[j] || !st.answers[j].d) return;
      var o = correctOption(s);
      ((o && o.reveals) || []).forEach(function (id) { out[id] = j; });
    });
    return out;
  }

  /** Exhibits that are new at the current step: this step's update, and anything just revealed. */
  function newIds(kase, st) {
    var out = {};
    var i = st.step;
    var s = kase.steps[i];
    ((s && s.update && s.update.exhibits) || []).forEach(function (x) { out[x.id] = true; });
    [i - 1, i].forEach(function (j) {
      var t = kase.steps[j];
      if (!t || t.type !== "test" || !st.answers[j] || !st.answers[j].d) return;
      var o = correctOption(t);
      ((o && o.reveals) || []).forEach(function (id) { out[id] = true; });
    });
    return out;
  }

  function readingsFor(kase, st) {
    var list = [{ label: "Initial", vitals: (kase.file && kase.file.vitals) || {} }];
    var newIndex = null;
    (kase.steps || []).forEach(function (s, j) {
      if (j > st.step || !s.update || !s.update.vitals) return;
      list.push({ label: R().plainInline(s.update.title || "Update"), vitals: s.update.vitals });
      if (j === st.step) newIndex = list.length - 1;
    });
    return { readings: list, newIndex: newIndex };
  }

  function allExhibits(kase) {
    var map = {};
    ((kase.file && kase.file.tests) || []).forEach(function (x) { if (x && x.id) map[x.id] = x; });
    (kase.steps || []).forEach(function (s) {
      ((s.update && s.update.exhibits) || []).forEach(function (x) { if (x && x.id) map[x.id] = x; });
    });
    return map;
  }

  function nextCaseAfter(kase) {
    var p = u.profile();
    var later = u.cases(kase.unit).filter(function (k) { return k.order > kase.order; });
    for (var i = 0; i < later.length; i++) {
      var r = u.caseRecord(later[i].id);
      if (!(r && r.solved) && u.isUnlocked(later[i])) return later[i];
    }
    var next = u.safe(function () { return CCF.Progress.nextCase(p); }, null);
    return next && next.id !== kase.id ? next : null;
  }

  // ------------------------------------------------------------------------------------
  // The case FILE (folder with tabs)
  // ------------------------------------------------------------------------------------

  function fileView(kase, getState, opts) {
    var f = kase.file || {};
    var tabIds = {};
    var tabButtons = {};
    var panels = {};
    var selected = "referral";
    var list = h("div", { class: "file-tabs", role: "tablist", "aria-label": "Case file sections" });

    TABS.forEach(function (t) {
      var id = u.uid("tab-" + t.id);
      var pid = id + "-panel";
      tabIds[t.id] = id;
      var btn = h("button", {
        type: "button", role: "tab", id: id, class: "file-tab", "aria-controls": pid, "aria-selected": "false", tabindex: "-1",
        dataset: { tab: t.id }
      },
        h("span", { class: "file-tab-icon", "aria-hidden": "true" }, u.icon(t.icon)),
        h("span", { class: "file-tab-label" }, t.label),
        h("span", { class: "file-tab-extra" }));
      btn.addEventListener("click", function () { select(t.id); });
      btn.addEventListener("keydown", function (e) {
        var idx = TABS.map(function (x) { return x.id; }).indexOf(t.id);
        var to = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") to = (idx + 1) % TABS.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = (idx - 1 + TABS.length) % TABS.length;
        else if (e.key === "Home") to = 0;
        else if (e.key === "End") to = TABS.length - 1;
        if (to === null) return;
        e.preventDefault();
        select(TABS[to].id, true);
      });
      tabButtons[t.id] = btn;
      list.appendChild(btn);
      panels[t.id] = h("div", { class: "file-panel", role: "tabpanel", id: pid, "aria-labelledby": id, tabindex: "0", hidden: true, dataset: { panel: t.id } });
    });

    // Static panels.
    var p = kase.patient || {};
    panels.referral.appendChild(h("div", { class: "file-section" },
      h("h3", { class: "file-h" }, "Referral"),
      h("dl", { class: "patient-facts" },
        h("div", null, h("dt", null, "Patient"), h("dd", null, p.name || "—")),
        h("div", null, h("dt", null, "Age"), h("dd", null, p.age ? String(p.age) : "—")),
        h("div", null, h("dt", null, "Sex"), h("dd", null, p.sex === "F" ? "Female" : p.sex === "M" ? "Male" : "—")),
        h("div", { class: "fact-wide" }, h("dt", null, "Setting"), h("dd", null, R().inline(kase.setting || "—")))),
      R().block(f.referral, "file-rich")));
    panels.history.appendChild(h("div", { class: "file-section" }, h("h3", { class: "file-h" }, "History"), R().block(f.history, "file-rich")));
    panels.meds.appendChild(h("div", { class: "file-section" }, h("h3", { class: "file-h" }, "Medications"),
      X().medsList(f.medications, f.allergies, { onLookup: u.referenceOn() ? opts.onLookup : null })));
    panels.exam.appendChild(h("div", { class: "file-section" }, h("h3", { class: "file-h" }, "Examination"), R().block(f.exam, "file-rich")));

    var exhibitEls = {};

    function renderVitals() {
      var st = getState();
      var r = readingsFor(kase, st);
      u.clear(panels.vitals);
      panels.vitals.appendChild(h("div", { class: "file-section" },
        h("h3", { class: "file-h" }, "Vital signs"),
        X().vitalsPanel(r.readings, { newIndex: r.newIndex })));
      return r.newIndex !== null;
    }

    function renderTests() {
      var st = getState();
      var revealed = revealedIds(kase, st);
      var fresh = newIds(kase, st);
      exhibitEls = {};
      u.clear(panels.tests);
      var sec = h("div", { class: "file-section" }, h("h3", { class: "file-h" }, "Tests and results"));
      var count = 0, sealedCount = 0, hasNew = false;
      var initial = (f.tests || []);
      var listEl = h("div", { class: "exhibit-list" });
      initial.forEach(function (x) {
        if (x.sealed && revealed[x.id] === undefined) {
          listEl.appendChild(X().sealedCard(x));
          sealedCount++;
          return;
        }
        var el = X().render(x, { isNew: !!fresh[x.id] });
        exhibitEls[x.id] = el;
        listEl.appendChild(el);
        count++;
        if (fresh[x.id]) hasNew = true;
      });
      if (initial.length) sec.appendChild(listEl);
      (kase.steps || []).forEach(function (s, j) {
        if (j > st.step || !s.update || !s.update.exhibits || !s.update.exhibits.length) return;
        var group = h("div", { class: "exhibit-group" }, h("p", { class: "exhibit-added" }, u.icon("update"), " Added: ", R().inline(s.update.title || "Update")));
        s.update.exhibits.forEach(function (x) {
          if (x.sealed && revealed[x.id] === undefined) { group.appendChild(X().sealedCard(x)); sealedCount++; return; }
          var el = X().render(x, { isNew: !!fresh[x.id] });
          exhibitEls[x.id] = el;
          group.appendChild(el);
          count++;
          if (fresh[x.id]) hasNew = true;
        });
        sec.appendChild(group);
      });
      if (!count && !sealedCount) sec.appendChild(h("p", { class: "muted file-empty" }, "No test results in the file yet."));
      panels.tests.appendChild(sec);
      return { count: count, sealed: sealedCount, hasNew: hasNew };
    }

    function setExtra(tabId, text, isNew) {
      var extra = tabButtons[tabId].querySelector(".file-tab-extra");
      u.clear(extra);
      if (text) extra.appendChild(h("span", { class: "file-tab-count" }, text));
      if (isNew) extra.appendChild(h("span", { class: "tab-new" }, h("span", { class: "sr-only" }, " (new)"), h("span", { "aria-hidden": "true" }, "New")));
      tabButtons[tabId].classList.toggle("has-new", !!isNew);
    }

    function update() {
      var vitalsNew = renderVitals();
      var t = renderTests();
      setExtra("vitals", "", vitalsNew);
      setExtra("tests", t.count + t.sealed ? String(t.count + t.sealed) : "", t.hasNew);
      return { vitalsNew: vitalsNew, testsNew: t.hasNew };
    }

    function select(id, focus) {
      selected = id;
      TABS.forEach(function (t) {
        var on = t.id === id;
        tabButtons[t.id].setAttribute("aria-selected", on ? "true" : "false");
        tabButtons[t.id].setAttribute("tabindex", on ? "0" : "-1");
        tabButtons[t.id].classList.toggle("is-active", on);
        panels[t.id].hidden = !on;
      });
      if (focus) u.focusEl(tabButtons[id], { preventScroll: true });
    }

    function showExhibit(xid) {
      select("tests");
      var el = exhibitEls[xid];
      if (!el) return;
      el.classList.remove("flash");
      void el.offsetWidth;
      el.classList.add("flash");
      u.scrollIntoView(el, "start");
    }

    var sumId = u.uid("file-title");
    var el = h("section", { class: "case-file", "aria-labelledby": sumId },
      h("div", { class: "folder-tab file-folder-tab", "aria-hidden": "true" }, "Case " + u.caseNumber(kase)),
      h("div", { class: "file-inner" },
        u.clip("file-clip"),
        h("h2", { class: "file-title", id: sumId }, h("span", { class: "sr-only" }, "Case file: "), u.patientLine(kase), h("span", { class: "file-title-sex" }, kase.patient && kase.patient.sex ? " · " + (kase.patient.sex === "F" ? "F" : "M") : "")),
        list,
        h("div", { class: "file-panels" }, TABS.map(function (t) { return panels[t.id]; }))));

    update();
    select("referral");
    return { el: el, update: update, select: select, showExhibit: showExhibit, selected: function () { return selected; }, exhibitEl: function (id) { return exhibitEls[id] || null; } };
  }

  // ------------------------------------------------------------------------------------
  // Review an earlier step (dialog)
  // ------------------------------------------------------------------------------------

  function reviewStep(kase, j) {
    var s = kase.steps[j];
    if (!s) return;
    var w = UI.steps.widget(kase, s, {});
    var body = h("div", { class: "review" },
      s.update ? h("div", { class: "update-banner is-review" },
        h("p", { class: "update-title" }, u.icon("update"), " ", R().inline(s.update.title)),
        R().block(s.update.text, "update-text"),
        s.update.vitals ? X().vitalsChips(s.update.vitals) : null) : null,
      h("div", { class: "review-prompt rich" }, R().render(s.prompt)),
      h("p", { class: "review-answer" }, h("strong", null, "Answer: "), w ? w.correctText() : ""),
      h("div", { class: "explain-box" }, h("p", { class: "explain-kicker" }, "Case notes"), R().block(s.explain)));
    UI.dialogs.open({ title: "Step " + (j + 1) + " of " + kase.steps.length, icon: "notebook", size: "md", body: body, actions: [{ label: "Close", kind: "primary" }] });
  }

  // ------------------------------------------------------------------------------------
  // The screen
  // ------------------------------------------------------------------------------------

  UI.screens["case"] = function (params) {
    params = params || {};
    var kase = u.getCase(params.id);
    if (!kase) {
      return {
        el: h("section", { class: "screen-error paper-card" },
          h("h1", null, "That case file isn't in the cabinet"),
          h("p", null, "It may not have been added to this copy of the game yet."),
          u.button("Back to the case board", { kind: "primary", icon: "board", onClick: function () { app().go("board"); } })),
        title: "Case not found"
      };
    }
    if (!u.isUnlocked(kase)) {
      var prev = u.cases(kase.unit).filter(function (k) { return k.order === kase.order - 1; })[0];
      return {
        el: h("section", { class: "screen-error paper-card" },
          h("h1", null, u.icon("lock"), " Case " + u.caseNumber(kase) + " is locked"),
          h("p", null, "Solve case " + (prev ? u.caseNumber(prev) + ", " + prev.title + "," : "the one before it") + " to open this file."),
          u.button("Back to the case board", { kind: "primary", icon: "board", onClick: function () { app().go("board"); } })),
        title: "Locked case"
      };
    }

    var steps = kase.steps || [];
    var n = steps.length;
    var rec = u.caseRecord(kase.id);
    var root = h("section", { class: "case-screen", dataset: { case: kase.id } });
    var screen = { el: root, title: "Case " + u.caseNumber(kase) + ": " + kase.title };
    var timers = [];
    var observer = null;

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    function header(extraTools) {
      var unit = u.content() ? u.content().unit(kase.unit) : null;
      return h("header", { class: "case-head" },
        h("nav", { class: "crumbs", "aria-label": "Breadcrumb" },
          h("ol", null,
            h("li", null, h("button", { type: "button", class: "crumb-link", on: { click: function () { app().go("board"); } } }, "Case board")),
            h("li", null, h("span", null, unit ? unit.title : "")),
            h("li", { "aria-current": "page" }, h("span", null, "Case " + u.caseNumber(kase))))),
        h("div", { class: "case-head-row" },
          h("div", { class: "case-head-main" },
            h("p", { class: "case-kicker" }, "Case " + u.caseNumber(kase), " · ", R().inline(kase.setting || "")),
            h("h1", { class: "case-h1" }, kase.title),
            h("p", { class: "case-meta" }, h("span", { class: "case-patient-line" }, u.icon("patient"), " ", u.patientLine(kase, true)), " ", u.difficultyBadge(kase.difficulty))),
          h("div", { class: "case-tools" }, extraTools)));
    }

    function casebookButton(id) {
      if (!u.referenceOn() || !UI.casebook) return null;
      return u.button("Casebook", { kind: "ghost", icon: "casebook", class: "open-casebook", onClick: function () { UI.casebook.openDialog({ entryId: id }); } });
    }

    // ----------------------------------------------------------------------------------
    // Closed view / debrief
    // ----------------------------------------------------------------------------------

    function debriefView(result) {
      u.clear(root);
      if (observer) { u.safe(function () { observer.disconnect(); }); observer = null; }
      var r = u.caseRecord(kase.id) || {};
      var fresh = !!result;
      var stars = fresh ? result.stars : (r.bestStars || 0);
      var d = kase.debrief || {};
      var next = nextCaseAfter(kase);
      var o = u.safe(function () { return CCF.Progress.overall(u.profile()); }, null);
      var allDone = !!(o && o.complete);
      var finaleDue = allDone && !app().hasSeen("finale") && app().story("finale");

      var starsEl = u.stars(stars, 3, "lg");
      var stamp = h("div", { class: "stamp stamp-closed stamp-big" + (fresh && !u.reducedMotion() ? " stamp-pending" : ""), "aria-hidden": "true" }, "Case closed");
      var resultBits = h("div", { class: "result-row" },
        h("div", { class: "result-stars" }, h("p", { class: "result-label" }, fresh ? "Stars earned" : "Best result"), starsEl),
        fresh ? h("div", { class: "result-xp" },
          h("p", { class: "result-label" }, "Experience"),
          h("p", { class: "result-xp-value" }, "+" + (result.xpGained || 0) + " XP"),
          h("p", { class: "result-xp-total" }, (result.totalXp !== undefined ? result.totalXp + " XP total" : ""))) :
          h("div", { class: "result-xp" },
            h("p", { class: "result-label" }, "Solved"),
            h("p", { class: "result-xp-total" }, r.firstSolvedAt ? u.formatDate(r.firstSolvedAt) : "—"),
            h("p", { class: "result-xp-total" }, r.plays ? "Played " + u.plural(r.plays, "time") : "")),
        fresh ? h("div", { class: "result-strikes" },
          h("p", { class: "result-label" }, "Strikes"),
          h("p", { class: "result-xp-value" }, String(state.strikes)),
          h("p", { class: "result-xp-total" }, state.hints ? u.plural(state.hints, "hint") + " used" : "No hints used")) : null);

      var notes = [];
      if (fresh && result.firstSolve === false) {
        notes.push(h("p", { class: "result-note" }, result.improved ? "New best for this case!" : "Your best result for this case stays on record."));
      }
      var rankUp = fresh && result.rankUp ? h("div", { class: "rankup", role: "status" },
        h("span", { class: "rankup-icon", "aria-hidden": "true" }, u.icon("rank")),
        h("div", null, h("p", { class: "rankup-kicker" }, "Promoted!"), h("p", { class: "rankup-title" }, result.rankUp.to || ""),
          result.rankUp.from ? h("p", { class: "rankup-from" }, "from " + result.rankUp.from) : null)) : null;

      var casebookLinks = (kase.casebook || []).map(function (id) { return u.entry(id); }).filter(Boolean);
      var mentor = h("div", { class: "mentor-line" },
        UI.dialogs.portrait("okafor", "portrait-sm"),
        h("p", null, h("strong", null, (u.character("okafor").short || "Dr. Okafor") + ": "), "“" + (MENTOR_LINES[stars] || MENTOR_LINES[1]) + "”"));

      var actions = h("div", { class: "debrief-actions" },
        next ? u.button("Next case: " + u.caseNumber(next) + " " + next.title, {
          kind: "primary", icon: "next", class: "debrief-next",
          onClick: function () { UI.sound.play("open"); app().go("case", { id: next.id }); }
        }) : null,
        u.button("Back to the board", { kind: next ? "secondary" : "primary", icon: "board", class: "debrief-board", onClick: function () { app().go("board"); } }),
        u.button(fresh ? "Replay" : "Replay this case", { kind: "ghost", icon: "replay", class: "debrief-replay", onClick: function () { app().go("case", { id: kase.id, replay: true }); } }));

      var finaleBanner = finaleDue ? h("div", { class: "finale-banner" },
        h("span", { class: "finale-icon", "aria-hidden": "true" }, u.icon("trophy")),
        h("div", null, h("p", { class: "finale-title" }, "That was the last open case file!"),
          h("p", null, "Dr. Okafor would like a word.")),
        u.button("See Dr. Okafor", { kind: "primary", icon: "mentor", class: "finale-go", onClick: function () { app().go("finale"); } })) : null;

      var view = h("div", { class: "debrief" },
        h("div", { class: "closed-folder" },
          h("div", { class: "folder-tab", "aria-hidden": "true" }, "Case " + u.caseNumber(kase)),
          h("div", { class: "closed-folder-inner" },
            u.clip(),
            h("p", { class: "case-kicker" }, "Case " + u.caseNumber(kase) + " · " + u.patientLine(kase)),
            h("h1", { class: "case-h1" }, kase.title),
            h("p", { class: "sr-only", role: "status" }, "Case closed. " + stars + " of 3 stars."),
            stamp,
            resultBits,
            notes,
            rankUp)),
        finaleBanner,
        h("article", { class: "debrief-body paper-card", "aria-labelledby": "debrief-dx" },
          h("p", { class: "debrief-kicker" }, "What it was"),
          h("h2", { class: "debrief-dx", id: "debrief-dx" }, R().inline(d.diagnosis || "")),
          R().block(d.summary, "debrief-summary"),
          mentor,
          d.takeaways && d.takeaways.length ? h("section", { class: "debrief-section" },
            h("h3", null, "Take-home points"),
            h("ul", { class: "takeaways" }, d.takeaways.map(function (t) {
              return h("li", null, h("span", { class: "takeaway-mark", "aria-hidden": "true" }, u.icon("correct")), h("span", null, R().inline(t)));
            }))) : null,
          casebookLinks.length && u.referenceOn() && UI.casebook ? h("section", { class: "debrief-section" },
            h("h3", null, "In the Casebook"),
            h("ul", { class: "casebook-links" }, casebookLinks.map(function (e) {
              return h("li", null, u.button(R().plainInline(e.title), { kind: "chip", icon: "casebook", onClick: function () { UI.casebook.openDialog({ entryId: e.id }); } }));
            }))) : null,
          d.sources && d.sources.length ? h("section", { class: "debrief-section debrief-sources" },
            h("h3", null, "Lecture sources"),
            h("ul", { class: "sources" }, d.sources.map(function (s) { return h("li", null, R().inline(s)); }))) : null),
        actions);
      root.appendChild(view);

      if (fresh) {
        // Stamp, then stars one by one.
        var starEls = starsEl.querySelectorAll(".star");
        if (!u.reducedMotion()) {
          Array.prototype.forEach.call(starEls, function (el) { el.classList.add("star-pending"); });
          later(function () { stamp.classList.remove("stamp-pending"); stamp.classList.add("stamp-anim"); }, 250);
          later(function () { UI.sound.play("stamp"); }, 470);
          Array.prototype.forEach.call(starEls, function (el, i) {
            later(function () {
              el.classList.remove("star-pending");
              el.classList.add("star-pop");
              if (i < stars) UI.sound.play("star", i);
            }, 900 + i * 260);
          });
          if (rankUp) later(function () { rankUp.classList.add("show"); UI.sound.play("rankup"); }, 1800);
        } else {
          UI.sound.play("stamp");
          if (rankUp) { rankUp.classList.add("show"); UI.sound.play("rankup"); }
        }
        u.announce("Case closed. " + stars + " of 3 stars. " + (result.xpGained ? "Plus " + result.xpGained + " XP. " : "") + (result.rankUp ? "Promoted to " + result.rankUp.to + "!" : ""));
      } else if (rankUp) {
        rankUp.classList.add("show");
      }
      screen.title = "Case closed: " + kase.title;
      document.title = screen.title + " · " + u.GAME_NAME;
      var focusTarget = (fresh ? view.querySelector(".case-h1") : view.querySelector(".case-h1"));
      u.focusEl(focusTarget, { preventScroll: true });
      u.safe(function () { global.scrollTo(0, 0); });
      app().refreshTopbar();
    }

    // ----------------------------------------------------------------------------------
    // Play view
    // ----------------------------------------------------------------------------------

    var replay = !!params.replay;
    if (replay && rec && rec.current) u.safe(function () { CCF.Save.clearCaseProgress(kase.id); });
    if (!replay && rec && rec.solved && !rec.current) {
      // A solved case opens closed: the debrief, with Replay.
      debriefView(null);
      screen.focus = root.querySelector(".case-h1");
      return screen;
    }

    var resumed = !replay && rec && rec.current;
    var state = resumed ? cleanState(rec.current, n) : freshState(n);
    var finished = false;
    var solveResult = null;

    function save() {
      if (finished) return;
      var payload = {
        step: state.step,
        strikes: state.strikes,
        hints: state.hints,
        answers: state.answers.map(function (a) {
          var o = {};
          if (a.w) o.w = a.w;
          if (a.h) o.h = a.h;
          if (a.x && a.x.length) o.x = a.x.slice(0, 12);
          if (a.d) o.d = 1;
          if (a.m) o.m = 1;
          return o;
        })
      };
      u.safe(function () { CCF.Save.saveCaseProgress(kase.id, payload); });
    }

    function starsNow() {
      return u.safe(function () { return CCF.Progress.starsFor(state.strikes, n); }, state.strikes ? (state.strikes <= Math.ceil(n / 2) ? 2 : 1) : 3);
    }

    var file = fileView(kase, function () { return state; }, {
      onLookup: function (entry) { UI.casebook.openDialog({ entryId: entry.id }); }
    });

    var panel = h("section", { class: "steps-panel", "aria-labelledby": "step-heading" });
    var jump = h("button", { type: "button", class: "jump-to-step", hidden: true },
      h("span", { class: "btn-label" }, "Go to the question"), h("span", { "aria-hidden": "true" }, " ↓"));
    jump.addEventListener("click", function () {
      u.scrollIntoView(panel, "start");
      var head = panel.querySelector("#step-heading");
      if (head) u.focusEl(head, { preventScroll: true });
    });

    root.appendChild(header([casebookButton(null),
      u.button("Board", { kind: "ghost", icon: "board", class: "case-to-board", onClick: function () { app().go("board"); } })]));
    root.appendChild(h("div", { class: "case-layout" }, file.el, panel));
    root.appendChild(jump);

    var widget = null;
    var els = {};

    function strikeMeter() {
      var stars = starsNow();
      return h("div", { class: "strike-meter" },
        h("span", { class: "strike-count" }, h("span", { class: "strike-label" }, "Strikes"), " ", h("strong", null, String(state.strikes))),
        h("span", { class: "strike-stars" }, h("span", { class: "sr-only" }, "On track for "), u.stars(stars, 3, "sm")));
    }

    function stepDots() {
      return h("ol", { class: "step-dots", "aria-label": "Steps" }, steps.map(function (s, j) {
        var done = j < state.step || (j === state.step && state.answers[j].d);
        var cls = "step-dot" + (j === state.step ? " is-current" : "") + (done ? " is-done" : "");
        var labelText = "Step " + (j + 1) + (done ? ", solved" : j === state.step ? ", current" : ", not yet");
        if (done && j !== state.step) {
          return h("li", null, h("button", { type: "button", class: cls, title: "Review step " + (j + 1), "aria-label": labelText + ". Review it.", on: { click: function () { reviewStep(kase, j); } } }, String(j + 1)));
        }
        return h("li", null, h("span", { class: cls, "aria-label": labelText, role: "img" }, String(j + 1)));
      }));
    }

    function updateMeter() {
      if (els.meter) {
        var fresh = strikeMeter();
        els.meter.parentNode.replaceChild(fresh, els.meter);
        els.meter = fresh;
      }
    }

    function feedback(kind, title, detail) {
      u.clear(els.feedback);
      els.feedback.className = "feedback feedback-" + kind;
      if (!title && !detail) return;
      els.feedback.appendChild(h("div", { class: "feedback-inner" },
        h("span", { class: "feedback-icon", "aria-hidden": "true" }, u.icon(kind === "right" ? "correct" : kind === "wrong" ? "wrong" : kind === "shown" ? "hint" : "info")),
        h("div", { class: "feedback-body" }, title ? h("p", { class: "feedback-title" }, title) : null, detail || null)));
    }

    function renderHints() {
      if (!els.hints) return;
      var s = steps[state.step];
      var a = state.answers[state.step];
      var list = (s.hints || []).slice(0, a.h);
      u.clear(els.hintList);
      list.forEach(function (t, i) {
        els.hintList.appendChild(h("li", { class: "hint" },
          UI.dialogs.portrait("okafor", "portrait-xs"),
          h("div", { class: "hint-body" },
            h("p", { class: "hint-who" }, (u.character("okafor").short || "Dr. Okafor") + (s.hints.length > 1 ? " · hint " + (i + 1) + " of " + s.hints.length : "")),
            h("p", { class: "hint-text" }, R().inline(t)))));
      });
      var left = (s.hints || []).length - a.h;
      els.hintBtn.hidden = a.d || left <= 0;
      var label = els.hintBtn.querySelector(".btn-label");
      if (label) label.textContent = a.h ? "Ask for another hint" : "Ask Dr. Okafor";
      els.hintCost.textContent = "Costs a strike" + ((s.hints || []).length > 1 ? " · " + left + " of " + s.hints.length + " left" : "");
    }

    function showMeAvailable() {
      var a = state.answers[state.step];
      return !a.d && a.w >= u.revealAfter();
    }

    function renderShowMe() {
      if (els.showMe) els.showMe.hidden = !showMeAvailable();
    }

    function newExhibitsInline() {
      var fresh = newIds(kase, state);
      var map = allExhibits(kase);
      var ids = Object.keys(fresh).filter(function (id) { return map[id]; });
      if (!ids.length) return null;
      return ids.map(function (id) { return X().render(map[id], { isNew: true, compact: true }); });
    }

    function revealedFor(stepIndex) {
      var s = steps[stepIndex];
      if (!s || s.type !== "test") return [];
      var o = correctOption(s);
      var map = allExhibits(kase);
      return ((o && o.reveals) || []).map(function (id) { return map[id]; }).filter(Boolean);
    }

    function explanation(how) {
      var s = steps[state.step];
      var last = state.step === n - 1;
      var opened = revealedFor(state.step);
      var nextBtn = u.button(last ? "Close the case" : "Next step", {
        kind: "primary", size: "lg", icon: last ? "stamp" : "next", class: "next-step",
        onClick: function () { goNext(); }
      });
      var box = h("section", { class: "explain-box", "aria-labelledby": "explain-h" },
        h("h3", { class: "explain-kicker", id: "explain-h", tabindex: "-1" }, how === "shown" ? "Here's the answer — case notes" : "Case notes"),
        opened.length ? h("div", { class: "results-in" },
          h("p", { class: "results-in-title" }, u.icon("tests"), " Results are in: ", opened.map(function (x, i) {
            return [i ? ", " : "", h("button", { type: "button", class: "link-btn only-wide", on: { click: function () { file.showExhibit(x.id); } } }, R().plainInline(x.title)),
              h("span", { class: "only-narrow" }, R().plainInline(x.title))];
          })),
          h("div", { class: "only-narrow results-inline" }, opened.map(function (x) { return X().render(x, { isNew: true, compact: true }); }))) : null,
        R().block(s.explain, "explain-text"),
        h("div", { class: "explain-actions" }, nextBtn));
      return box;
    }

    function solve(how, res) {
      var a = state.answers[state.step];
      a.d = 1;
      if (how === "shown") a.m = 1;
      widget.solve(how);
      els.check.hidden = true;
      if (els.hints) els.hintBtn.hidden = true;
      if (els.showMe) els.showMe.hidden = true;
      var detail = (res && res.detail) || widget.solvedDetail();
      if (how === "shown") {
        feedback("shown", "Here's the answer.", h("div", null, h("p", null, h("strong", null, widget.correctText())), detail));
        UI.sound.play("reveal");
      } else {
        feedback("right", state.answers[state.step].w ? "That's it!" : "Correct!", detail);
        UI.sound.play("correct");
      }
      var box = explanation(how);
      els.explain.appendChild(box);
      els.dotsWrap.replaceChild(stepDots(), els.dotsWrap.firstChild);
      // A test step opens sealed results: show them in the file.
      var opened = revealedFor(state.step);
      var changes = file.update();
      if (opened.length) {
        if (global.matchMedia && global.matchMedia("(min-width: 1100px)").matches) file.showExhibit(opened[0].id);
        else file.select("tests");
      } else if (changes.testsNew && file.selected() !== "tests") {
        // nothing to do: the Tests tab is flagged New
      }
      if (state.step === n - 1) finish();
      else save();
      u.announce((how === "shown" ? "Here's the answer: " + widget.correctText() + ". " : "Correct! ") + R().plainText(steps[state.step].explain).slice(0, 400));
      var kicker = box.querySelector(".explain-kicker");
      later(function () {
        u.focusEl(kicker, { preventScroll: true });
        u.scrollIntoView(els.feedback, "start");
      }, 30);
    }

    function check() {
      var res = widget.evaluate();
      var a = state.answers[state.step];
      if (res.status === "empty" || res.status === "invalid") {
        feedback("info", res.message, null);
        UI.sound.play("click");
        return;
      }
      if (res.status === "correct") { solve("answered", res); return; }
      a.w += 1;
      state.strikes += 1;
      var keys = Array.isArray(res.key) ? res.key : res.key !== undefined && res.key !== null ? [res.key] : [];
      keys.forEach(function (k) { if (a.x.indexOf(k) < 0 && a.x.length < 12) a.x.push(k); });
      widget.markWrong(res);
      feedback("wrong", "Not quite — that's a strike.", res.detail || null);
      UI.sound.play("wrong");
      updateMeter();
      renderShowMe();
      save();
      u.announce("Not quite. " + (res.detail ? res.detail.textContent : ""));
      if (showMeAvailable() && a.w === u.revealAfter()) {
        els.showMeNote.textContent = "Stuck? You can now see the answer (costs a strike).";
      }
    }

    function useHint() {
      var s = steps[state.step];
      var a = state.answers[state.step];
      if (a.d || a.h >= (s.hints || []).length) return;
      a.h += 1;
      state.hints += 1;
      state.strikes += 1;
      renderHints();
      updateMeter();
      save();
      UI.sound.play("hint");
      var newest = els.hintList.lastChild;
      if (newest) u.announce("Dr. Okafor: " + newest.querySelector(".hint-text").textContent);
      if (els.hintBtn.hidden) u.focusEl(newest, { preventScroll: true });
    }

    function showMe() {
      var a = state.answers[state.step];
      if (a.d) return;
      state.strikes += 1;
      updateMeter();
      solve("shown", null);
    }

    function goNext() {
      if (state.step >= n - 1) {
        debriefView(solveResult || { stars: starsNow(), xpGained: 0, firstSolve: true });
        return;
      }
      state.step += 1;
      save();
      renderStep(true);
    }

    function finish() {
      if (finished) return;
      finished = true;
      solveResult = u.safe(function () { return CCF.Save.recordSolve(kase.id, { strikes: state.strikes, hints: state.hints, stepCount: n }); }, null);
      if (!solveResult) solveResult = { stars: starsNow(), xpGained: 0, firstSolve: true, totalXp: undefined, rankUp: null };
      u.safe(function () { CCF.Save.clearCaseProgress(kase.id); });
      app().refreshTopbar();
    }

    function renderStep(moved) {
      var s = steps[state.step];
      var a = state.answers[state.step];
      u.clear(panel);
      els = {};
      widget = UI.steps.widget(kase, s, { onSubmit: function () { check(); } });
      if (!widget) {
        panel.appendChild(h("p", null, "This step can't be shown."));
        return;
      }
      els.meter = strikeMeter();
      els.dotsWrap = h("div", { class: "step-dots-wrap" }, stepDots());
      var top = h("header", { class: "step-top" },
        h("div", { class: "step-top-row" },
          h("h2", { class: "step-count", id: "step-heading", tabindex: "-1" }, "Step " + (state.step + 1), h("span", { class: "of" }, " of " + n)),
          els.meter),
        els.dotsWrap);

      var update = s.update ? h("div", { class: "update-banner", role: "group", "aria-label": "Update" },
        h("p", { class: "update-title" }, h("span", { class: "update-icon", "aria-hidden": "true" }, u.icon("update")), R().inline(s.update.title)),
        R().block(s.update.text, "update-text"),
        s.update.vitals ? h("div", { class: "update-vitals" }, h("p", { class: "update-sub" }, "New vital signs"), X().vitalsChips(s.update.vitals)) : null,
        s.update.exhibits && s.update.exhibits.length ? h("p", { class: "update-sub only-wide" }, "Added to the file: ", s.update.exhibits.map(function (x, i) {
          return [i ? ", " : "", h("button", { type: "button", class: "link-btn", on: { click: function () { file.showExhibit(x.id); } } }, R().plainInline(x.title))];
        })) : null) : null;

      var inline = newExhibitsInline();
      // On wide screens the file sits beside the step; on narrow ones, new exhibits appear here too.
      var inlineBox = inline ? h("div", { class: "step-exhibits only-narrow" }, h("p", { class: "update-sub" }, "New in the file"), inline) : null;

      els.check = u.button(widget.checkLabel, { kind: "primary", size: "lg", class: "check-answer", onClick: check });
      els.feedback = h("div", { class: "feedback", "aria-live": "polite", "aria-atomic": "false" });
      els.explain = h("div", { class: "explain-wrap" });

      var helpRow = h("div", { class: "help-row" });
      if (u.hintsOn() && (s.hints || []).length) {
        els.hints = true;
        els.hintList = h("ol", { class: "hint-list", "aria-label": "Hints from Dr. Okafor" });
        els.hintCost = h("span", { class: "hint-cost" });
        els.hintBtn = h("button", { type: "button", class: "btn btn-mentor ask-okafor" },
          UI.dialogs.portrait("okafor", "portrait-xs"),
          h("span", { class: "btn-texts" }, h("span", { class: "btn-label" }, "Ask Dr. Okafor"), els.hintCost));
        els.hintBtn.addEventListener("click", useHint);
        helpRow.appendChild(els.hintBtn);
      }
      els.showMe = u.button("Show me the answer", { kind: "ghost", icon: "describe", class: "show-me", onClick: showMe });
      els.showMeNote = h("span", { class: "sr-only", "aria-live": "polite" });
      helpRow.appendChild(els.showMe);
      helpRow.appendChild(els.showMeNote);

      panel.appendChild(h("span", { class: "clipboard-clip", "aria-hidden": "true" }));
      panel.appendChild(h("div", { class: "steps-sheet" },
        top,
        update,
        inlineBox,
        h("div", { class: "step-prompt rich" }, R().render(s.prompt)),
        h("p", { class: "step-type" }, h("span", { class: "step-type-tag" }, UI.steps.TYPE_LABELS[s.type] || ""), " ", widget.instructions),
        widget.el,
        h("div", { class: "step-actions" }, els.check),
        els.feedback,
        els.hints ? els.hintList : null,
        helpRow,
        els.explain));

      // Restore this step's saved state.
      widget.restoreWrong(a.x);
      if (els.hints) renderHints();
      renderShowMe();
      var changes = file.update();
      if (a.d) {
        widget.solve(a.m ? "shown" : "answered");
        els.check.hidden = true;
        if (els.hints) els.hintBtn.hidden = true;
        els.showMe.hidden = true;
        feedback(a.m ? "shown" : "right", a.m ? "Here's the answer." : "Solved.", a.m ? h("p", null, h("strong", null, widget.correctText())) : widget.solvedDetail());
        els.explain.appendChild(explanation(a.m ? "shown" : "answered"));
        if (state.step === n - 1) finish();
      } else if (a.w) {
        feedback("wrong", "Your earlier tries are marked. Keep going.", null);
      }

      if (moved) {
        if (changes.testsNew) {
          var fresh = Object.keys(newIds(kase, state));
          if (global.matchMedia && global.matchMedia("(min-width: 1100px)").matches && fresh.length) file.showExhibit(fresh[0]);
          else file.select("tests");
        } else if (changes.vitalsNew) {
          file.select("vitals");
        }
        UI.sound.play(s.update ? "heartbeat" : "page");
        u.scrollIntoView(panel, "start");
        panel.scrollTop = 0;
        u.focusEl(panel.querySelector("#step-heading"), { preventScroll: true });
        u.announce("Step " + (state.step + 1) + " of " + n + ". " + (s.update ? R().plainInline(s.update.title) + ". " : ""));
      }
    }

    renderStep(false);
    if (resumed) {
      later(function () { UI.dialogs.toast("Welcome back — picking up at step " + (state.step + 1) + " of " + n + ".", { icon: "folder" }); }, 200);
      var startChanges = newIds(kase, state);
      if (Object.keys(startChanges).length) file.select("tests");
    } else {
      save();
    }

    // "Go to the question" button when the step panel is off screen on narrow layouts.
    if (global.IntersectionObserver) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var narrow = !(global.matchMedia && global.matchMedia("(min-width: 1100px)").matches);
          jump.hidden = !narrow || e.isIntersecting;
        });
      }, { threshold: 0.02 });
      observer.observe(panel);
    }

    screen.focus = root.querySelector(".case-h1");
    screen.destroy = function () {
      timers.forEach(clearTimeout);
      if (observer) u.safe(function () { observer.disconnect(); });
    };
    screen.debug = { state: function () { return JSON.parse(JSON.stringify(state)); } };
    return screen;
  };

  UI.caseScreen = { cleanState: cleanState, revealedIds: revealedIds, newIds: newIds, readingsFor: readingsFor, nextCaseAfter: nextCaseAfter, reviewStep: reviewStep };
})(typeof window !== "undefined" ? window : globalThis);
