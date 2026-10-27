/*
 * Pyromancer — title, save slots and story screens.
 *
 *   SS.UI.screens.title()                 the painting, Begin / Continue, engine status
 *   SS.UI.screens.slots()                 the save slots (shown as Slot 1–3) + Import Save Scroll
 *   SS.UI.screens.story({ kind })         prologue or epilogue, full screen
 *
 * Title art (assets/): on landscape screens the full painting, which carries the
 * painted title and tagline, is the hero and the buttons sit on a dark panel under
 * the painted tagline (never over the title or the witch's face). On portrait
 * screens the left crop (no painted text) is a banner above an HTML title. The h1
 * is always in the page for screen readers.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;

  var ART_ALT = "A young witch at a moonlit desk in Coilspire Academy: a golden snake coils beside her, and a glowing Python spell book lies open in front of her.";

  function app() { return UI.app; }

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
      var on = app().soundOn();
      btn.textContent = on ? "🔊" : "🔇";
      btn.setAttribute("aria-label", "Sound");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.title = on ? "Sound is on" : "Sound is off";
    }
    btn.addEventListener("click", function () { app().toggleSound(); sync(); });
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
    var anySaved = slots.some(function (s) { return !!s.data || s.damaged; });

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
      actions.appendChild(u.button("I have a Save Scroll (save code or file)", {
        kind: "ghost", icon: "📜", class: "btn-savescroll",
        onClick: function () { UI.panels.saveScroll({ chooseSlot: true }); }
      }));
    }

    var warn = UI.panels.storageBanner(scorm ? null : function () { UI.panels.saveScroll({ chooseSlot: true }); });
    var conf = u.config();
    var heading = h("h1", { class: "title-h1" }, u.GAME_NAME);
    var el = h("section", { class: "title-screen" },
      warn ? h("div", { class: "title-warning" }, warn) : null,
      h("div", { class: "title-canvas" },
        h("img", {
          class: "title-img",
          src: "assets/pyromancer-title.webp",
          srcset: "assets/pyromancer-title-1024.webp 1024w, assets/pyromancer-title.webp 1536w",
          sizes: "100vw",
          width: "1536", height: "1024",
          alt: ART_ALT,
          loading: "lazy",
          decoding: "async"
        }),
        h("div", { class: "title-banner", role: "img", "aria-label": ART_ALT }),
        h("div", { class: "title-panel" },
          h("div", { class: "title-words" },
            heading,
            h("p", { class: "title-tagline" }, u.TAGLINE),
            h("p", { class: "title-pitch" }, "Learn Python by casting real spells, from your first ", h("code", { class: "inline-code" }, "print()"), " to taming the Hydra.")),
          actions,
          chip.el,
          h("footer", { class: "title-footer" },
            h("span", { class: "title-version" }, u.GAME_NAME + (conf.version ? " " + conf.version : "")),
            h("button", { type: "button", class: "link-btn", on: { click: aboutDialog } }, "About"),
            soundToggle()))));

    return {
      el: el,
      hideTopbar: true,
      title: "",
      focus: heading,
      destroy: function () { chip.destroy(); }
    };
  };

  function aboutDialog() {
    var scorm = app().isScorm();
    UI.dialogs.open({
      title: "About " + u.GAME_NAME, icon: "🔥", size: "md", body: h("div", { class: "about-standalone" },
        h("p", null, h("strong", null, u.GAME_NAME), " teaches Python, data structures & algorithms and object-oriented programming. You are an apprentice at Coilspire Academy; every spell is real Python code, checked by trials."),
        h("ul", { class: "about-list" },
          scorm
            ? h("li", null, "Your course saves your progress automatically.")
            : h("li", null, "Progress saves automatically in this browser (three save slots, one per wizard)."),
          scorm ? null : h("li", null, "A ", h("strong", null, "Save Scroll"), " moves your progress to another computer."),
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
        var card = entry.data ? filledCard(entry) : entry.damaged ? damagedCard(entry) : emptyCard(entry);
        grid.appendChild(h("li", { class: "slot-item" }, card));
      });
    }

    function afterDelete(entry) {
      if (app().state.slot === entry.slot) app().state.slot = null;
      UI.sound.play("reset");
      render();
      var heading = el.querySelector("h1");
      if (heading) u.focusEl(heading);
      u.announce("Save deleted.");
    }

    function filledCard(entry) {
      var d = entry.data;
      var fraction = d.total ? d.completed / d.total : 0;
      var headingId = u.uid("slot");
      return h("article", { class: "slot-card filled panel", "aria-labelledby": headingId },
        h("p", { class: "slot-num" }, "Slot " + (entry.index + 1)),
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
                message: h("p", null, "All of ", h("strong", null, d.wizardName || "this wizard"), "'s progress in slot " + (entry.index + 1) + " will vanish. If you might want it later, export a Save Scroll first.")
              }).then(function (ok) {
                if (!ok) return;
                u.safe(function () { SS.Save.deleteSlot(entry.slot); });
                afterDelete(entry);
              });
            }
          })));
    }

    function damagedCard(entry) {
      return h("article", { class: "slot-card damaged panel" },
        h("p", { class: "slot-num" }, "Slot " + (entry.index + 1)),
        h("div", { class: "slot-portrait damaged", "aria-hidden": "true" }, "⚠️"),
        h("h2", { class: "slot-name" }, "Damaged save"),
        h("p", { class: "slot-rank" }, "This save can't be read. Delete it to free the slot?"),
        h("div", { class: "slot-actions" },
          u.button("Delete it", {
            kind: "danger-ghost", icon: "🗑️", ariaLabel: "Delete the damaged save in slot " + (entry.index + 1),
            onClick: function () {
              UI.dialogs.confirm({
                title: "Delete the damaged save?", icon: "🗑️", danger: true, confirmLabel: "Delete it",
                message: "Slot " + (entry.index + 1) + " holds a save that can't be read. Deleting it makes room for a new apprentice (or an imported Save Scroll)."
              }).then(function (ok) {
                if (!ok) return;
                u.safe(function () { SS.Save.deleteSlot(entry.slot); });
                afterDelete(entry);
              });
            }
          })));
    }

    function emptyCard(entry) {
      return h("article", { class: "slot-card empty panel" },
        h("p", { class: "slot-num" }, "Slot " + (entry.index + 1)),
        h("div", { class: "slot-portrait empty", "aria-hidden": "true" }, "✧"),
        h("h2", { class: "slot-name" }, "An empty slot"),
        h("p", { class: "slot-rank" }, "Room for a new apprentice"),
        h("div", { class: "slot-actions" },
          u.button("New apprentice", { kind: "primary", icon: "✨", ariaLabel: "Start a new apprentice in slot " + (entry.index + 1), onClick: function () { app().newGame(entry.slot); } })));
    }

    render();
    var warn = UI.panels.storageBanner(function () { UI.panels.saveScroll({ chooseSlot: true, onImported: function () { app().enterGame(); } }); });
    el = h("section", { class: "slots-screen" },
      h("div", { class: "screen-head" },
        u.button("Back", { kind: "ghost", size: "sm", icon: "◂", onClick: function () { app().go("title"); } })),
      h("h1", { class: "screen-title" }, "Choose your save slot"),
      h("p", { class: "screen-lead" }, "Each slot holds one wizard's journey. Sharing a computer? Everyone can have their own."),
      warn,
      grid,
      h("div", { class: "slots-footer" },
        u.button("Import a Save Scroll (save code or file)", {
          kind: "ghost", icon: "📥",
          onClick: function () { UI.panels.saveScroll({ chooseSlot: true, onImported: function () { app().enterGame(); } }); }
        })));
    return { el: el, hideTopbar: true, title: "Save slots" };
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
        app().go("certificate");
        UI.effects.celebrate();
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
