/*
 * Syntax & Sorcery — title, save slots and story screens.
 *
 *   SS.UI.screens.title()                 logo, Begin / Continue, engine status
 *   SS.UI.screens.slots()                 three save scrolls + Import Save Scroll
 *   SS.UI.screens.story({ kind })         prologue or epilogue, full screen
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;
  var XLINK = "http://www.w3.org/1999/xlink";

  function app() { return UI.app; }

  function magicCircle() {
    var s = u.svg;
    var pathId = u.uid("rune-path");
    var runes = "def ✦ class ✦ lambda ✦ yield ✦ return ✦ while ✦ for ✦ in ✦ import ✦ try ✦ with ✦ if ✦ else ✦ ";
    var textPath = s("textPath", { startOffset: "0" }, runes + runes);
    textPath.setAttribute("href", "#" + pathId);
    textPath.setAttributeNS(XLINK, "xlink:href", "#" + pathId);
    function poly(angles, r) {
      return angles.map(function (a) {
        var rad = a * Math.PI / 180;
        return (200 + r * Math.cos(rad)).toFixed(1) + "," + (200 + r * Math.sin(rad)).toFixed(1);
      }).join(" ");
    }
    return s("svg", { class: "magic-circle", viewBox: "0 0 400 400", "aria-hidden": "true", focusable: "false" },
      s("defs", null, s("path", { id: pathId, d: "M200,200 m-149,0 a149,149 0 1,1 298,0 a149,149 0 1,1 -298,0" })),
      s("g", { class: "mc-outer" },
        s("circle", { cx: "200", cy: "200", r: "186", class: "mc-ring" }),
        s("circle", { cx: "200", cy: "200", r: "172", class: "mc-ring mc-thin" }),
        s("text", { class: "mc-runes" }, textPath),
        s("circle", { cx: "200", cy: "200", r: "134", class: "mc-ring mc-thin" })),
      s("g", { class: "mc-inner" },
        s("polygon", { class: "mc-star", points: poly([-90, 30, 150], 126) }),
        s("polygon", { class: "mc-star", points: poly([90, 210, 330], 126) }),
        s("circle", { cx: "200", cy: "200", r: "64", class: "mc-ring" }),
        s("circle", { cx: "200", cy: "200", r: "56", class: "mc-ring mc-thin" })));
  }

  function rankIconFor(title) {
    var ranks = (SS.Progress && SS.Progress.RANKS) || [];
    for (var i = 0; i < ranks.length; i++) if (ranks[i].title === title) return ranks[i].icon;
    return "✦";
  }

  function summaryLine(data) {
    if (!data) return "";
    var parts = [];
    if (data.rankTitle) parts.push((data.rankIcon || rankIconFor(data.rankTitle)) + " " + data.rankTitle);
    if (typeof data.completed === "number" && typeof data.total === "number") parts.push(data.completed + " of " + data.total + " spells");
    return parts.join(" · ");
  }

  function soundToggle() {
    var btn = h("button", { type: "button", class: "icon-btn title-sound" });
    function sync() {
      var on = u.settings().sound !== false && UI.sound.isEnabled();
      btn.textContent = on ? "🔊" : "🔇";
      btn.setAttribute("aria-label", "Sound");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.title = on ? "Sound is on" : "Sound is off";
    }
    btn.addEventListener("click", function () {
      var on = UI.sound.isEnabled();
      app().updateSettings({ sound: !on });
      if (!on) UI.sound.play("click");
      sync();
    });
    sync();
    return btn;
  }

  // --------------------------------------------------------------------------
  // Title
  // --------------------------------------------------------------------------

  UI.screens.title = function () {
    var scorm = app().isScorm();
    var p = u.profile();
    var chip = app().engineChip("large");
    var actions = h("div", { class: "title-actions" });
    var slots = scorm ? [] : app().slotList();
    var lastSlot = scorm ? null : u.safe(function () { return SS.Save.getLastSlot(); }, null);
    var last = slots.filter(function (s) { return s.data && s.slot === lastSlot; })[0] || null;
    var anySaved = slots.some(function (s) { return !!s.data; });

    function continueButton(name, sub, onClick) {
      return h("button", { type: "button", class: "btn btn-primary btn-lg btn-continue", on: { click: onClick } },
        h("span", { class: "btn-label" }, "Continue as ", h("strong", { class: "continue-name" }, name)),
        sub ? h("span", { class: "btn-sub" }, sub) : null);
    }

    if (scorm) {
      if (p && p.wizardName) {
        var xp = u.safe(function () { return SS.Progress.totalXp(p); }, 0);
        var rank = u.safe(function () { return SS.Progress.rankFor(xp); }, null);
        var stats = u.safe(function () { return SS.Progress.overallStats(p); }, null);
        var sub = (rank ? rank.icon + " " + rank.title : "") + (stats ? " · " + stats.completed + " of " + stats.total + " spells" : "");
        actions.appendChild(continueButton(p.wizardName, sub, function () { app().enterGame(); }));
      } else {
        actions.appendChild(u.button("Begin your apprenticeship", { kind: "primary", size: "lg", icon: "✨", onClick: function () { app().newGame(0); } }));
      }
    } else if (last) {
      actions.appendChild(continueButton(last.data.wizardName || "Apprentice", summaryLine(last.data), function () { app().loadSlot(last.slot); }));
      actions.appendChild(u.button("Choose another save", { kind: "ghost", icon: "📚", onClick: function () { app().go("slots"); } }));
    } else if (anySaved) {
      actions.appendChild(u.button("Choose your save", { kind: "primary", size: "lg", icon: "📚", onClick: function () { app().go("slots"); } }));
    } else {
      var first = slots[0] ? slots[0].slot : 0;
      actions.appendChild(u.button("Begin your apprenticeship", { kind: "primary", size: "lg", icon: "✨", onClick: function () { app().newGame(first); } }));
      actions.appendChild(u.button("I have a Save Scroll", {
        kind: "ghost", icon: "📜",
        onClick: function () { UI.panels.saveScroll({ chooseSlot: true }); }
      }));
    }

    var warn = UI.panels.storageBanner(scorm ? null : function () { UI.panels.saveScroll({ chooseSlot: true }); });
    var conf = u.config();
    var el = h("section", { class: "title-screen" },
      h("div", { class: "title-hero" },
        h("div", { class: "title-emblem-wrap" },
          magicCircle(),
          h("div", { class: "title-emblem", "aria-hidden": "true" }, "🐍")),
        h("p", { class: "title-eyebrow" }, "Coilspire Academy presents"),
        h("h1", { class: "title-logo" }, "Syntax ", h("span", { class: "amp" }, "&"), " Sorcery"),
        h("p", { class: "tagline" }, "Learn Python by casting real spells: from your first ", h("code", { class: "inline-code" }, "print()"), " to taming the Hydra with dynamic programming."),
        actions,
        chip.el,
        warn),
      h("footer", { class: "title-footer" },
        h("span", { class: "title-version" }, (conf.title || "Syntax & Sorcery") + " " + (conf.version || "")),
        h("button", { type: "button", class: "link-btn", on: { click: aboutDialog } }, "About"),
        soundToggle()));

    return {
      el: el,
      hideTopbar: true,
      title: "",
      destroy: function () { chip.destroy(); }
    };
  };

  function aboutDialog() {
    UI.dialogs.open({
      title: "About the game", icon: "📜", size: "md", body: h("div", { class: "about-standalone" },
        h("p", null, "Syntax & Sorcery teaches Python, data structures & algorithms and object-oriented programming. You are an apprentice at Coilspire Academy; every spell is real Python code, checked by trials."),
        h("ul", { class: "about-list" },
          h("li", null, "Progress saves automatically in this browser (three save slots)."),
          h("li", null, "A ", h("strong", null, "Save Scroll"), " moves your progress to another computer."),
          h("li", null, "Stuck? Pip the owl has hints, and every challenge has a lesson.")),
        UI.panels.about()),
      actions: [{ label: "Close", kind: "primary" }]
    });
  }

  // --------------------------------------------------------------------------
  // Save slots
  // --------------------------------------------------------------------------

  UI.screens.slots = function () {
    var grid = h("ol", { class: "slot-grid" });
    var el;

    function render() {
      u.clear(grid);
      app().slotList().forEach(function (entry) {
        grid.appendChild(h("li", { class: "slot-item" }, entry.data ? filledCard(entry) : emptyCard(entry)));
      });
    }

    function filledCard(entry) {
      var d = entry.data;
      var fraction = d.total ? d.completed / d.total : 0;
      var headingId = u.uid("slot");
      return h("article", { class: "slot-card filled panel", "aria-labelledby": headingId },
        h("p", { class: "slot-num" }, "Scroll " + u.roman(entry.index + 1)),
        h("div", { class: "slot-portrait", "aria-hidden": "true" }, d.rankIcon || rankIconFor(d.rankTitle)),
        h("h2", { class: "slot-name", id: headingId }, d.wizardName || "Apprentice"),
        h("p", { class: "slot-rank" }, d.rankTitle || ""),
        u.progressBar(fraction, "Spells mastered"),
        h("p", { class: "slot-meta" },
          h("span", null, (d.completed || 0) + " / " + (d.total || 0) + " spells"),
          h("span", null, h("span", { class: "star on", "aria-hidden": "true" }, "★"), " ", (d.stars || 0), h("span", { class: "sr-only" }, " stars")),
          h("span", null, (d.xp || 0) + " XP")),
        d.updatedAt ? h("p", { class: "slot-time" }, "Last played " + u.relativeTime(d.updatedAt)) : null,
        h("div", { class: "slot-actions" },
          u.button("Continue ▸", { kind: "primary", ariaLabel: "Continue as " + (d.wizardName || "Apprentice"), onClick: function () { app().loadSlot(entry.slot); } }),
          u.button("Delete", {
            kind: "danger-ghost", size: "sm", icon: "🗑️", ariaLabel: "Delete " + (d.wizardName || "this save"),
            onClick: function () {
              UI.dialogs.confirm({
                title: "Delete this save?", icon: "🗑️", danger: true, confirmLabel: "Delete forever",
                message: h("p", null, "All of ", h("strong", null, d.wizardName || "this wizard"), "'s progress in Scroll " + u.roman(entry.index + 1) + " will vanish. If you might want it later, export a Save Scroll first.")
              }).then(function (ok) {
                if (!ok) return;
                u.safe(function () { SS.Save.deleteSlot(entry.slot); });
                if (app().state.slot === entry.slot) app().state.slot = null;
                UI.sound.play("reset");
                render();
                var heading = el.querySelector("h1");
                if (heading) u.focusEl(heading);
                u.announce("Save deleted.");
              });
            }
          })));
    }

    function emptyCard(entry) {
      return h("article", { class: "slot-card empty panel" },
        h("p", { class: "slot-num" }, "Scroll " + u.roman(entry.index + 1)),
        h("div", { class: "slot-portrait empty", "aria-hidden": "true" }, "✧"),
        h("h2", { class: "slot-name" }, "An empty scroll"),
        h("p", { class: "slot-rank" }, "Room for a new apprentice"),
        h("div", { class: "slot-actions" },
          u.button("New apprentice", { kind: "primary", icon: "✨", ariaLabel: "Start a new apprentice in scroll " + (entry.index + 1), onClick: function () { app().newGame(entry.slot); } })));
    }

    render();
    var warn = UI.panels.storageBanner(function () { UI.panels.saveScroll({ chooseSlot: true, onImported: function () { app().enterGame(); } }); });
    el = h("section", { class: "slots-screen" },
      h("div", { class: "screen-head" },
        u.button("Back", { kind: "ghost", size: "sm", icon: "◂", onClick: function () { app().go("title"); } })),
      h("h1", { class: "screen-title" }, "Choose your save scroll"),
      h("p", { class: "screen-lead" }, "Each scroll holds one wizard's journey. Sharing a computer? Everyone can have their own."),
      warn,
      grid,
      h("div", { class: "slots-footer" },
        u.button("Import a Save Scroll", {
          kind: "ghost", icon: "📥",
          onClick: function () { UI.panels.saveScroll({ chooseSlot: true, onImported: function () { app().enterGame(); } }); }
        })));
    return { el: el, hideTopbar: true, title: "Save scrolls" };
  };

  // --------------------------------------------------------------------------
  // Prologue / epilogue
  // --------------------------------------------------------------------------

  UI.screens.story = function (params) {
    var kind = params.kind === "epilogue" ? "epilogue" : "prologue";
    var story = (SS.content && SS.content.story) || {};
    var panels = UI.dialogs.toPanels(story[kind] || [], "narrator");
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      app().markSeen(kind);
      if (kind === "prologue") {
        app().go("map");
      } else {
        UI.effects.celebrate();
        app().go("certificate");
      }
    }

    if (!panels.length) {
      setTimeout(finish, 0);
      return { el: h("section", { class: "story-screen" }, h("h1", { class: "sr-only" }, "Story")), hideTopbar: true };
    }
    var view = UI.dialogs.dialogueView(panels, {
      title: kind === "prologue" ? "Prologue" : "Epilogue",
      finishLabel: kind === "prologue" ? "Enter the academy" : "Receive your certificate",
      skipLabel: "Skip the story",
      onDone: finish
    });
    var el = h("section", { class: "story-screen story-" + kind },
      h("h1", { class: "sr-only" }, kind === "prologue" ? "Prologue" : "Epilogue"),
      view.el);
    return { el: el, hideTopbar: true, title: kind === "prologue" ? "Prologue" : "Epilogue", focus: view.next };
  };
})(typeof window !== "undefined" ? window : globalThis);
