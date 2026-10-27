/*
 * Syntax & Sorcery — the app shell (SS.UI.app). Loaded last; boots the game on
 * DOMContentLoaded.
 *
 *   go(screen, params)    show a screen from SS.UI.screens (title, slots, story, map,
 *                          chapter, challenge, grimoire, practice, certificate)
 *   onEngine(cb)          Python engine status (immediately + on change) → unsubscribe
 *   retryEngine()         try loading Python again
 *   applySettings()       sound, reduced motion, editor font size from the profile
 *   newGame(slot), loadSlot(slot), enterGame(), slotList(), storageWarning()
 *
 * Engine modules (SS.Save, SS.Progress, SS.PythonRunner) are used only through
 * their documented APIs, and every call is guarded: a missing or failing engine
 * file degrades the game instead of breaking it.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;

  var ENGINE_LABELS = {
    idle: "Python asleep",
    loading: "Python awakening…",
    ready: "Python ready",
    busy: "Casting…",
    error: "Python unavailable"
  };

  var state = {
    slot: null,
    screen: null,
    params: null,
    engine: { state: "idle", message: "" },
    bootInfo: null
  };
  var engineListeners = [];
  var current = null;
  var els = {};

  // --------------------------------------------------------------------------
  // Engine status
  // --------------------------------------------------------------------------

  function setEngine(status) {
    if (!status || typeof status !== "object") return;
    state.engine = { state: status.state || "idle", message: status.message || "", detail: status.detail || null };
    engineListeners.slice().forEach(function (cb) { u.safe(function () { cb(state.engine); }); });
  }

  function onEngine(cb) {
    engineListeners.push(cb);
    u.safe(function () { cb(state.engine); });
    return function () {
      var i = engineListeners.indexOf(cb);
      if (i >= 0) engineListeners.splice(i, 1);
    };
  }

  function engineReady() {
    return state.engine.state === "ready";
  }

  function startEngine() {
    var R = SS.PythonRunner;
    if (!R) {
      setEngine({ state: "error", message: "The Python engine (js/engine/runner.js) didn't load, so spells can't be cast. Please tell your instructor." });
      return;
    }
    u.safe(function () { R.onStatus(setEngine); });
    u.safe(function () { setEngine(R.getStatus()); });
    try {
      var p = R.init();
      if (p && p.catch) p.catch(function (err) { engineFailed(err); });
    } catch (err) {
      engineFailed(err);
    }
  }

  function engineFailed(err) {
    // The runner normally reports failures through its status; this is a backstop.
    var R = SS.PythonRunner;
    var st = R ? u.safe(function () { return R.getStatus(); }, null) : null;
    if (st && st.state === "error") { setEngine(st); return; }
    if (st && st.state !== "loading") setEngine({ state: "error", message: String((err && err.message) || err || "Python failed to load.") });
  }

  function retryEngine() {
    var R = SS.PythonRunner;
    if (!R) return;
    try {
      var p = state.engine.state === "error" ? R.init() : R.restart();
      if (p && p.catch) p.catch(function (err) { engineFailed(err); });
    } catch (err) {
      engineFailed(err);
    }
  }

  function engineLabel(st) {
    return ENGINE_LABELS[st.state] || "Python";
  }

  /** A status chip that keeps itself up to date. Returns { el, destroy }. */
  function engineChip(variant) {
    var dot = h("span", { class: "engine-dot", "aria-hidden": "true" });
    var label = h("span", { class: "engine-label" });
    var detail = variant === "large" ? h("span", { class: "engine-detail" }) : null;
    var chip = h("button", {
      type: "button",
      class: "engine-chip" + (variant ? " engine-chip-" + variant : ""),
      on: { click: function () { if (UI.panels) UI.panels.engineHelp(); } }
    }, dot, h("span", { class: "engine-texts" }, label, detail));
    var unsub = onEngine(function (st) {
      chip.setAttribute("data-state", st.state);
      label.textContent = engineLabel(st);
      if (detail) detail.textContent = st.state === "ready" ? "Spells can be cast." : (st.message || "");
      chip.title = st.message || "";
      chip.setAttribute("aria-label", "Python engine: " + engineLabel(st) + ". " + (st.message || "") + " Select for details.");
    });
    return { el: chip, destroy: unsub };
  }

  // --------------------------------------------------------------------------
  // Profile, slots and settings
  // --------------------------------------------------------------------------

  function isScorm() {
    return !!u.safe(function () { return SS.Save && SS.Save.isScorm && SS.Save.isScorm(); }, false);
  }

  function storageWarning() {
    return u.safe(function () { return SS.Save && SS.Save.storageWarning ? SS.Save.storageWarning() : null; }, null);
  }

  /** [{ index, slot, data|null }] — data is the summary from SS.Save.listSlots(). */
  function slotList() {
    var count = (SS.config && SS.config.saveSlots) || 3;
    var raw = u.safe(function () { return SS.Save.listSlots(); }, []) || [];
    var base = 0;
    for (var i = 0; i < raw.length; i++) {
      if (raw[i] && typeof raw[i].slot === "number") { base = raw[i].slot - i; break; }
    }
    var out = [];
    for (var j = 0; j < Math.max(count, raw.length); j++) {
      var data = raw[j] || null;
      out.push({ index: j, slot: data && typeof data.slot === "number" ? data.slot : j + base, data: data });
    }
    return out;
  }

  function activeSlot() {
    if (state.slot !== null && state.slot !== undefined) return state.slot;
    return u.safe(function () { return SS.Save.getLastSlot(); }, null);
  }

  function applySettings() {
    var s = u.settings();
    UI.sound.setEnabled(s.sound !== false);
    var root = document.documentElement;
    root.classList.toggle("reduce-motion", !!s.reduceMotion);
    root.style.setProperty("--editor-font-size", (Number(s.editorFontSize) || 15) + "px");
    if (els.sound) {
      els.sound.setAttribute("aria-pressed", s.sound !== false ? "true" : "false");
      els.sound.textContent = s.sound !== false ? "🔊" : "🔇";
      els.sound.title = s.sound !== false ? "Sound is on" : "Sound is off";
    }
    if (current && current.onSettings) u.safe(function () { current.onSettings(s); });
  }

  function updateSettings(partial) {
    var p = u.profile();
    if (p) u.safe(function () { SS.Save.updateSettings(partial); });
    else if (partial && "sound" in partial) UI.sound.setEnabled(partial.sound);
    applySettings();
  }

  function hasSeen(key) {
    return !!u.safe(function () { return SS.Save.hasSeen(key); }, false);
  }

  function markSeen(key) {
    u.safe(function () { SS.Save.markSeen(key); });
  }

  function hasStory(kind) {
    var story = SS.content && SS.content.story;
    return !!(story && Array.isArray(story[kind]) && story[kind].length);
  }

  function enterGame() {
    var p = u.profile();
    if (!p) { go("title"); return; }
    applySettings();
    if (!hasSeen("prologue") && hasStory("prologue")) go("story", { kind: "prologue" });
    else go("map");
  }

  function loadSlot(slot) {
    var p = u.safe(function () { return SS.Save.loadProfile(slot); }, null);
    if (!p) {
      UI.dialogs.toast("That save couldn't be opened.", { icon: "⚠️", kind: "warn" });
      go("slots");
      return;
    }
    state.slot = slot;
    enterGame();
  }

  function learnerFirstName() {
    var info = state.bootInfo || {};
    return info.defaultWizardName || u.firstName(info.learnerName || "");
  }

  /** Ask for a wizard name, create the profile in `slot`, then start the story. */
  function newGame(slot) {
    var scorm = isScorm();
    return UI.dialogs.prompt({
      title: "A new apprentice arrives",
      icon: "🧙",
      intro: "Archmage Ada peers over her spectacles. “Welcome to Coilspire Academy! And you are…?”",
      label: "Your wizard name",
      value: scorm ? learnerFirstName() : "",
      placeholder: "e.g. Morgana",
      maxLength: 24,
      help: "This is how the academy will address you. You can change it later in Settings.",
      confirmLabel: "Begin my apprenticeship",
      confirmIcon: "✨",
      selectAll: true,
      clean: u.cleanName,
      validate: function (v) { return v ? null : "Every wizard needs a name — type one to begin."; }
    }).then(function (name) {
      if (!name) return false;
      var existing = scorm ? u.profile() : null;
      var profile = null;
      if (existing) {
        u.safe(function () { SS.Save.renameWizard(name); });
        profile = u.profile();
      } else {
        var target = slot === null || slot === undefined ? 0 : slot;
        profile = u.safe(function () { return SS.Save.createProfile(target, name); }, null);
        state.slot = target;
      }
      if (!profile) {
        UI.dialogs.toast("The academy couldn't create your save. Try again.", { icon: "⚠️", kind: "warn" });
        return false;
      }
      UI.sound.play("unlock");
      enterGame();
      return true;
    });
  }

  // --------------------------------------------------------------------------
  // Load problems (chapter files that failed, missing engine files)
  // --------------------------------------------------------------------------

  function relPath(src) {
    var text = String(src || "");
    var i = text.indexOf("js/");
    return i >= 0 ? text.slice(i).split("?")[0] : text;
  }

  function loadErrors() {
    var seen = {};
    return (global.SS_LOAD_ERRORS || []).map(function (e) {
      return { file: relPath(e.src), kind: e.kind, message: e.message || "" };
    }).filter(function (e) {
      if (!/^js\/(content|engine)\/|^js\/config\.js$/.test(e.file) || seen[e.file]) return false;
      seen[e.file] = true;
      return true;
    });
  }

  function contentLoadErrors() {
    return loadErrors().filter(function (e) { return e.file.indexOf("js/content/") === 0; });
  }

  // --------------------------------------------------------------------------
  // Shell and top bar
  // --------------------------------------------------------------------------

  var TOOLS = [
    { id: "grimoire", icon: "📖", label: "Grimoire", action: function () { go("grimoire"); } },
    { id: "practice", icon: "🧪", label: "Practice", action: function () { go("practice"); } },
    { id: "savescroll", icon: "📜", label: "Save Scroll", action: function () { UI.panels.saveScroll(); } },
    { id: "settings", icon: "⚙️", label: "Settings", action: function () { UI.panels.settings(); } }
  ];

  function closeMenu() {
    if (!els.menu) return;
    els.menu.classList.remove("open");
    els.menuBtn.setAttribute("aria-expanded", "false");
  }

  function buildShell() {
    var app = document.getElementById("app");
    u.clear(app);
    var skip = h("a", { class: "skip-link", href: "#main" }, "Skip to the game");
    skip.addEventListener("click", function (e) {
      e.preventDefault();
      var target = els.main.querySelector("h1") || els.main;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      u.focusEl(target);
    });

    var brand = h("button", { type: "button", class: "brand", "aria-label": "Syntax & Sorcery: go to the academy map", on: { click: function () { closeMenu(); go(u.profile() ? "map" : "title"); } } },
      h("span", { class: "brand-mark", "aria-hidden": "true" }, "🐍"),
      h("span", { class: "brand-name", "aria-hidden": "true" }, "Syntax ", h("span", { class: "amp" }, "&"), " Sorcery"));

    var chip = engineChip("compact");

    els.rankIcon = h("span", { class: "wizard-rank-icon", "aria-hidden": "true" });
    els.wizardName = h("span", { class: "wizard-name" });
    els.rankTitle = h("span", { class: "wizard-rank" });
    els.xpFill = h("span", { class: "bar-fill" });
    els.xpText = h("span", { class: "wizard-xp" });
    els.wizard = h("button", { type: "button", class: "wizard-chip", on: { click: function () { closeMenu(); go("grimoire"); } } },
      els.rankIcon,
      h("span", { class: "wizard-texts" },
        h("span", { class: "wizard-line" }, els.wizardName, els.rankTitle),
        h("span", { class: "wizard-xpline" }, h("span", { class: "bar bar-xp", "aria-hidden": "true" }, els.xpFill), els.xpText)));

    els.tools = {};
    var toolButtons = TOOLS.map(function (tool) {
      var btn = h("button", { type: "button", class: "tool-btn", dataset: { tool: tool.id }, on: { click: function () { closeMenu(); tool.action(); } } },
        h("span", { class: "tool-icon", "aria-hidden": "true" }, tool.icon),
        h("span", { class: "tool-label" }, tool.label));
      els.tools[tool.id] = btn;
      return btn;
    });
    els.menu = h("nav", { class: "topbar-tools", id: "topbar-menu", "aria-label": "Game menu" }, toolButtons);
    els.menuBtn = h("button", {
      type: "button", class: "icon-btn menu-toggle", "aria-expanded": "false", "aria-controls": "topbar-menu", "aria-label": "Menu",
      on: {
        click: function (e) {
          e.stopPropagation();
          var open = !els.menu.classList.contains("open");
          els.menu.classList.toggle("open", open);
          els.menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
          if (open) { var first = els.menu.querySelector("button"); if (first) u.focusEl(first); }
        }
      }
    }, "☰");
    els.sound = h("button", {
      type: "button", class: "icon-btn sound-toggle", "aria-label": "Sound", "aria-pressed": "true",
      on: { click: function () { var s = u.settings(); updateSettings({ sound: !(s.sound !== false) }); UI.sound.play("click"); } }
    }, "🔊");

    els.topbar = h("header", { class: "topbar", hidden: true },
      brand,
      h("div", { class: "topbar-spacer" }),
      chip.el,
      els.wizard,
      els.menu,
      els.sound,
      els.menuBtn);

    document.addEventListener("click", function (e) {
      if (els.menu && els.menu.classList.contains("open") && !els.menu.contains(e.target) && e.target !== els.menuBtn) closeMenu();
    });
    els.menu.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && els.menu.classList.contains("open")) { e.preventDefault(); closeMenu(); u.focusEl(els.menuBtn); }
    });

    els.main = h("main", { id: "main", class: "screen", tabindex: "-1" });
    app.appendChild(skip);
    app.appendChild(els.topbar);
    app.appendChild(els.main);
  }

  function refreshTopbar() {
    var p = u.profile();
    if (!els.wizard) return;
    if (!p) { els.wizard.hidden = true; return; }
    els.wizard.hidden = false;
    var xp = u.safe(function () { return SS.Progress.totalXp(p); }, 0) || 0;
    var rank = u.safe(function () { return SS.Progress.rankFor(xp); }, null) || { title: "Novice", icon: "🌱", fraction: 0 };
    els.rankIcon.textContent = rank.icon || "✦";
    els.wizardName.textContent = p.wizardName || "Apprentice";
    els.rankTitle.textContent = rank.title || "";
    els.xpFill.style.width = Math.round(Math.max(0, Math.min(1, rank.fraction || 0)) * 100) + "%";
    els.xpText.textContent = xp + " XP";
    var toNext = rank.nextTitle && typeof rank.nextXp === "number" ? " " + Math.max(0, rank.nextXp - xp) + " XP to " + rank.nextTitle + "." : "";
    els.wizard.setAttribute("aria-label", (p.wizardName || "Apprentice") + ", " + (rank.title || "") + ", " + xp + " XP." + toNext + " Open your Grimoire.");
    els.wizard.title = toNext ? toNext.trim() : "The highest rank!";
    Object.keys(els.tools).forEach(function (id) {
      if (state.screen === id) els.tools[id].setAttribute("aria-current", "page");
      else els.tools[id].removeAttribute("aria-current");
    });
  }

  // --------------------------------------------------------------------------
  // Router
  // --------------------------------------------------------------------------

  var NEEDS_PROFILE = { story: 1, map: 1, chapter: 1, challenge: 1, grimoire: 1, practice: 1, certificate: 1 };

  function go(name, params) {
    params = params || {};
    if (!UI.screens[name]) name = "title";
    if (NEEDS_PROFILE[name] && !u.profile()) { name = "title"; params = {}; }
    UI.dialogs.closeAll();
    closeMenu();
    if (current && current.destroy) u.safe(function () { current.destroy(); });
    current = null;
    u.safe(function () { if (SS.Save && SS.Save.flush) SS.Save.flush(); });
    u.clear(els.main);
    els.main.className = "screen view-" + name;
    state.screen = name;
    state.params = params;
    var screen = u.safe(function () { return UI.screens[name](params); }, null);
    if (!screen || !screen.el) screen = errorScreen(name);
    current = screen;
    els.main.appendChild(screen.el);
    els.topbar.hidden = !!screen.hideTopbar;
    document.body.classList.toggle("has-topbar", !screen.hideTopbar);
    document.title = (screen.title ? screen.title + " · " : "") + ((SS.config && SS.config.title) || "Syntax & Sorcery");
    refreshTopbar();
    u.safe(function () { global.scrollTo(0, 0); });
    var target = screen.focus || screen.el.querySelector("h1");
    if (target) {
      if (!target.hasAttribute("tabindex") && !/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) target.setAttribute("tabindex", "-1");
      try { target.focus({ preventScroll: true }); } catch (err) { u.focusEl(target); }
    }
    if (screen.onShow) u.safe(function () { screen.onShow(); });
    return screen;
  }

  function errorScreen(name) {
    return {
      el: h("section", { class: "screen-error panel" },
        h("h1", null, "🌀 This part of the academy is foggy"),
        h("p", null, "Something went wrong while opening the “" + name + "” screen."),
        u.button("Back to the map", { kind: "primary", onClick: function () { go(u.profile() ? "map" : "title"); } })),
      title: "Oops"
    };
  }

  function fatal(missing) {
    els.topbar.hidden = true;
    u.clear(els.main);
    els.main.className = "screen view-fatal";
    var errors = loadErrors();
    els.main.appendChild(h("section", { class: "fatal panel" },
      h("h1", null, u.emoji("🌀"), " The academy gates won't open"),
      h("p", null, "An essential part of the game didn't load: ", h("strong", null, missing.join(", ")), "."),
      errors.length ? h("ul", { class: "fatal-list" }, errors.map(function (e) {
        return h("li", null, h("code", { class: "inline-code" }, e.file), e.kind === "missing" ? " is missing" : " has an error" + (e.message ? ": " + e.message : ""));
      })) : null,
      h("p", null, "If you are a student, please tell your teacher. If you are the teacher, check that every file of the game was uploaded, or use the single-file version (", h("code", { class: "inline-code" }, "dist/syntax-and-sorcery.html"), ")."),
      u.button("Try again", { kind: "primary", icon: "↻", onClick: function () { try { global.location.reload(); } catch (err) { /* ignore */ } } })));
    var heading = els.main.querySelector("h1");
    heading.setAttribute("tabindex", "-1");
    u.focusEl(heading);
  }

  // --------------------------------------------------------------------------
  // Boot
  // --------------------------------------------------------------------------

  function boot() {
    buildShell();
    var fonts = document.getElementById("ss-fonts");
    if (fonts && fonts.media !== "all") fonts.media = "all";
    UI.effects.initSky(document.getElementById("sky"));
    applySettings();
    u.safe(function () { UI.Editor.loadCodeMirror(); });
    startEngine();

    var missing = [];
    if (!SS.Save) missing.push("js/engine/save.js");
    if (!SS.Progress) missing.push("js/engine/progress.js");
    if (!SS.content) missing.push("js/content/registry.js");
    if (missing.length) { fatal(missing); return; }

    global.addEventListener("pagehide", function () { u.safe(function () { SS.Save.flush(); }); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") u.safe(function () { SS.Save.flush(); });
    });

    var initResult;
    try { initResult = SS.Save.init(); } catch (err) { initResult = Promise.reject(err); }
    Promise.resolve(initResult).then(function (info) {
      state.bootInfo = info || {};
    }, function (err) {
      if (global.console) console.warn("[Syntax & Sorcery] SS.Save.init failed", err);
      state.bootInfo = { storage: "memory", scorm: false, learnerName: null };
    }).then(function () {
      u.safe(function () { SS.Save.onChange(function () { refreshTopbar(); }); });
      var p = u.profile();
      if (p) state.slot = u.safe(function () { return SS.Save.getLastSlot(); }, null);
      applySettings();
      go("title");
    });
  }

  UI.app = {
    state: state,
    go: go,
    onEngine: onEngine,
    engineReady: engineReady,
    engineChip: engineChip,
    engineLabel: engineLabel,
    retryEngine: retryEngine,
    applySettings: applySettings,
    updateSettings: updateSettings,
    refreshTopbar: refreshTopbar,
    isScorm: isScorm,
    storageWarning: storageWarning,
    slotList: slotList,
    activeSlot: activeSlot,
    newGame: newGame,
    loadSlot: loadSlot,
    enterGame: enterGame,
    hasSeen: hasSeen,
    markSeen: markSeen,
    hasStory: hasStory,
    loadErrors: loadErrors,
    contentLoadErrors: contentLoadErrors,
    current: function () { return current; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
