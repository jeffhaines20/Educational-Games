/*
 * The Cardiac Case Files — the app shell (CCF.UI.app). Loaded last; boots the game on
 * DOMContentLoaded.
 *
 *   go(screen, params)   show a screen from CCF.UI.screens (title, slots, intro, board, case,
 *                        casebook, rounds, drill, log, certificate, finale)
 *   applySettings()      sound, reduced motion and text size from the profile + URL flags
 *   newGame(slot), loadSlot(slot), enterGame(), slotList(), storageWarning(), isScorm()
 *
 * The engine (CCF.Save, CCF.Progress, CCF.config) is used only through its documented API
 * (docs/DESIGN.md §5) and every call is guarded: a missing or failing file degrades the game
 * instead of breaking it. URL flags handled here: ?sound=off and ?motion=reduce.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;

  var state = { slot: null, screen: null, params: null, bootInfo: null };
  var current = null;
  var els = {};

  var Q = u.query();
  var URL_SOUND_OFF = /^(off|0|false|no)$/i.test(Q.sound || "");
  var URL_REDUCE_MOTION = /^(reduce|reduced|off|0|false|no)$/i.test(Q.motion || "");

  // ------------------------------------------------------------------------------------
  // Profile, slots and settings
  // ------------------------------------------------------------------------------------

  function isScorm() {
    return !!u.safe(function () { return CCF.Save && CCF.Save.isScorm && CCF.Save.isScorm(); }, false);
  }

  function storageWarning() {
    var w = u.safe(function () { return CCF.Save && CCF.Save.storageWarning ? CCF.Save.storageWarning() : null; }, null);
    if (!w && state.bootInfo && state.bootInfo.warning) w = state.bootInfo.warning;
    return w || null;
  }

  /** [{ index, slot, data | null, damaged }] from CCF.Save.listSlots() (both summary shapes accepted). */
  function slotList() {
    var count = u.config().saveSlots || 3;
    var raw = u.safe(function () { return CCF.Save.listSlots(); }, []) || [];
    var out = [];
    for (var j = 0; j < Math.max(count, raw.length); j++) {
      var item = raw[j] || null;
      var slot = item && typeof item.slot === "number" ? item.slot : j;
      var damaged = !!(item && item.damaged);
      var data = null;
      if (item && !damaged && !item.empty) data = item.summary || (item.name ? item : null);
      out.push({ index: j, slot: slot, data: data, damaged: damaged });
    }
    return out;
  }

  function activeSlot() {
    var s = u.safe(function () { return CCF.Save.currentSlot(); }, null);
    if (s !== null && s !== undefined) return s;
    return state.slot;
  }

  function soundOn() {
    if (URL_SOUND_OFF) return false;
    var p = u.profile();
    if (!p) return !(u.isFramed() || isScorm());
    return u.settings().sound !== false;
  }

  var TEXT_SIZES = { sm: "15px", md: "16px", lg: "18px", xl: "20px" };

  function applySettings() {
    var s = u.settings();
    UI.sound.setEnabled(soundOn());
    var root = document.documentElement;
    root.classList.toggle("reduce-motion", URL_REDUCE_MOTION || !!s.reduceMotion);
    var size = TEXT_SIZES[s.textSize] ? s.textSize : "md";
    root.setAttribute("data-text-size", size);
    root.style.fontSize = TEXT_SIZES[size];
    if (els.sound) {
      var on = soundOn();
      els.sound.setAttribute("aria-pressed", on ? "true" : "false");
      els.sound.setAttribute("aria-label", on ? "Sound on" : "Sound off");
      els.sound.title = on ? "Sound is on" : "Sound is off";
      u.clear(els.sound);
      els.sound.appendChild(u.icon(on ? "soundOn" : "soundOff"));
    }
    renderWarning();
    if (current && current.onSettings) u.safe(function () { current.onSettings(s); });
  }

  function updateSetting(key, value) {
    if (key === "sound") URL_SOUND_OFF = false;
    if (key === "reduceMotion") URL_REDUCE_MOTION = false;
    if (u.profile()) u.safe(function () { CCF.Save.setSetting(key, value); });
    else if (key === "sound") UI.sound.setEnabled(!!value);
    applySettings();
  }

  function toggleSound() {
    var on = !soundOn();
    updateSetting("sound", on);
    if (on) UI.sound.play("click");
    return on;
  }

  function hasSeen(key) {
    return !!u.safe(function () { return CCF.Save.hasSeen(key); }, false);
  }

  function markSeen(key) {
    u.safe(function () { CCF.Save.markSeen(key); });
  }

  function story(kind) {
    var c = u.content();
    var s = c && c.story;
    return s && Array.isArray(s[kind]) && s[kind].length ? s[kind] : null;
  }

  function enterGame() {
    var p = u.profile();
    if (!p) { go("title"); return; }
    applySettings();
    if (!hasSeen("intro") && story("intro")) go("intro");
    else go("board");
  }

  function loadSlot(slot) {
    var p = u.safe(function () { return CCF.Save.load(slot); }, null);
    if (!p) {
      UI.dialogs.toast("That save couldn't be opened.", { kind: "warn" });
      go(isScorm() ? "title" : "slots");
      return;
    }
    state.slot = slot;
    enterGame();
  }

  function learnerFirstName() {
    var info = state.bootInfo || {};
    return u.firstName(info.learnerName || info.learner || "");
  }

  function firstEmptySlot() {
    var free = slotList().filter(function (s) { return !s.data && !s.damaged; })[0];
    return free ? free.slot : null;
  }

  /** Ask for a name, create the profile in `slot`, then start. */
  function newGame(slot) {
    var scorm = isScorm();
    if (!scorm && (slot === null || slot === undefined)) slot = firstEmptySlot();
    if (!scorm && (slot === null || slot === undefined)) { go("slots", { full: true }); return Promise.resolve(false); }
    return UI.dialogs.prompt({
      title: "Your new name badge",
      icon: "detective",
      intro: h("p", null, "Dr. Okafor holds up a blank name badge. ", h("em", null, "“Welcome to Riverside! What should we put on this?”")),
      label: "Your name",
      value: scorm ? learnerFirstName() : "",
      placeholder: "e.g. Jordan",
      maxLength: 24,
      help: "It goes on your save, your case log and your certificate. You can change it later in Settings.",
      confirmLabel: "Open the first case files",
      confirmIcon: "newGame",
      selectAll: true,
      clean: u.cleanName,
      validate: function (v) { return v ? null : "Type a name for your badge."; }
    }).then(function (name) {
      if (!name) return false;
      var profile = u.safe(function () { return CCF.Save.newProfile(scorm ? (slot || 0) : slot, name); }, null);
      if (!profile) {
        UI.dialogs.toast("The game couldn't create your save. Please try again.", { kind: "warn" });
        return false;
      }
      state.slot = slot;
      if (!soundOn()) u.safe(function () { CCF.Save.setSetting("sound", false); });
      UI.sound.play("unlock");
      enterGame();
      return true;
    });
  }

  // ------------------------------------------------------------------------------------
  // Load problems (content files that failed, missing engine files)
  // ------------------------------------------------------------------------------------

  function relPath(src) {
    var text = String(src || "");
    var i = text.indexOf("js/");
    return i >= 0 ? text.slice(i).split("?")[0] : text;
  }

  function loadErrors() {
    var seen = {};
    return (global.CCF_LOAD_ERRORS || []).map(function (e) {
      return { file: relPath(e.src), kind: e.kind, message: e.message || "" };
    }).filter(function (e) {
      if (!/^js\//.test(e.file) || seen[e.file]) return false;
      seen[e.file] = true;
      return true;
    });
  }

  /** Content problems worth a quiet notice: files that didn't load, and cases skipped for errors. */
  function contentProblems() {
    var files = loadErrors().filter(function (e) { return e.file.indexOf("js/content/") === 0; });
    var c = u.content();
    var skipped = [];
    if (c && Array.isArray(c.errors)) {
      c.errors.forEach(function (e) {
        var m = /^(case|entry) ([^ ]+)/.exec(e.where || "");
        var key = m ? m[1] + " " + m[2] : (e.where || "content");
        if (skipped.indexOf(key) < 0) skipped.push(key);
      });
    }
    return { files: files, skipped: skipped };
  }

  // ------------------------------------------------------------------------------------
  // Shell and top bar
  // ------------------------------------------------------------------------------------

  var NAV = [
    { id: "board", icon: "board", label: "Case board" },
    { id: "casebook", icon: "casebook", label: "Casebook", needs: "reference" },
    { id: "rounds", icon: "rounds", label: "Rapid Rounds" },
    { id: "log", icon: "log", label: "Case log" }
  ];

  function renderWarning() {
    if (!els.warn) return;
    var text = storageWarning();
    els.warn.hidden = !text;
    if (text) els.warn.setAttribute("aria-label", "Saving problem: " + text + " Select for details.");
  }

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
      u.focusEl(target);
    });

    var brand = h("button", {
      type: "button", class: "brand", "aria-label": u.GAME_NAME + ": go to the case board",
      on: { click: function () { closeMenu(); go(u.profile() ? "board" : "title"); } }
    },
      h("span", { class: "brand-mark", "aria-hidden": "true" }, u.icon("brand")),
      h("span", { class: "brand-name", "aria-hidden": "true" }, h("span", { class: "brand-the" }, "The "), "Cardiac Case Files"));

    els.playerName = h("span", { class: "player-name" });
    els.playerRank = h("span", { class: "player-rank" });
    els.xpFill = h("span", { class: "bar-fill" });
    els.xpText = h("span", { class: "player-xp" });
    els.player = h("button", {
      type: "button", class: "player-chip", on: { click: function () { closeMenu(); go("log"); } }
    },
      h("span", { class: "player-badge", "aria-hidden": "true" }, u.icon("rank")),
      h("span", { class: "player-texts" },
        h("span", { class: "player-line" }, els.playerName, els.playerRank),
        h("span", { class: "player-xpline" }, h("span", { class: "bar bar-xp", "aria-hidden": "true" }, els.xpFill), els.xpText)));

    els.nav = {};
    var navButtons = NAV.map(function (item) {
      var btn = h("button", {
        type: "button", class: "nav-btn", dataset: { nav: item.id },
        on: { click: function () { closeMenu(); go(item.id); } }
      }, h("span", { class: "nav-icon", "aria-hidden": "true" }, u.icon(item.icon)), h("span", { class: "nav-label" }, item.label));
      els.nav[item.id] = { btn: btn, item: item };
      return btn;
    });
    var settingsBtn = h("button", {
      type: "button", class: "nav-btn", dataset: { nav: "settings" },
      on: { click: function () { closeMenu(); UI.panels.settings(); } }
    }, h("span", { class: "nav-icon", "aria-hidden": "true" }, u.icon("settings")), h("span", { class: "nav-label" }, "Settings"));
    navButtons.push(settingsBtn);

    els.menu = h("nav", { class: "topbar-nav", id: "topbar-menu", "aria-label": "Game menu" }, navButtons);
    els.menuBtn = h("button", {
      type: "button", class: "icon-btn menu-toggle", "aria-expanded": "false", "aria-controls": "topbar-menu", "aria-label": "Menu",
      on: {
        click: function (e) {
          e.stopPropagation();
          var open = !els.menu.classList.contains("open");
          els.menu.classList.toggle("open", open);
          els.menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
          if (open) { var first = els.menu.querySelector("button:not([hidden])"); if (first) u.focusEl(first); }
        }
      }
    }, u.icon("menu"));
    els.sound = h("button", {
      type: "button", class: "icon-btn sound-toggle", "aria-label": "Sound", "aria-pressed": "true",
      on: { click: function () { toggleSound(); } }
    }, u.icon("soundOn"));
    els.warn = h("button", {
      type: "button", class: "warn-chip", hidden: true, title: "Your progress may not be saved",
      on: {
        click: function () {
          closeMenu();
          UI.dialogs.open({
            title: "About saving", icon: "warning", size: "sm",
            body: h("div", null, h("p", null, storageWarning() || "Saving works normally."),
              isScorm() ? null : h("p", null, "A save code keeps your progress safe: open Settings → Save code.")),
            actions: [
              isScorm() || !u.profile() ? null : { label: "Get my save code", kind: "primary", icon: "exportSave", onClick: function () { setTimeout(function () { UI.panels.saveCode(); }, 0); } },
              { label: "Close", kind: "ghost" }
            ]
          });
        }
      }
    }, h("span", { class: "warn-chip-icon", "aria-hidden": "true" }, u.icon("warning")), h("span", { class: "warn-chip-text" }, "Not saving"));

    els.topbar = h("header", { class: "topbar", hidden: true },
      h("div", { class: "topbar-inner" },
        brand,
        h("div", { class: "topbar-spacer" }),
        els.warn,
        els.player,
        els.menu,
        els.sound,
        els.menuBtn));

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
    if (!els.player) return;
    renderWarning();
    var p = u.profile();
    Object.keys(els.nav || {}).forEach(function (id) {
      var n = els.nav[id];
      n.btn.hidden = n.item.needs === "reference" && !u.referenceOn();
      var here = state.screen === id || (id === "rounds" && state.screen === "drill");
      if (here) n.btn.setAttribute("aria-current", "page");
      else n.btn.removeAttribute("aria-current");
    });
    if (!p) { els.player.hidden = true; return; }
    els.player.hidden = false;
    var xp = u.safe(function () { return CCF.Progress.totalXp(p); }, 0) || 0;
    var rank = u.safe(function () { return CCF.Progress.rankFor(xp); }, null) || { title: "Student Clinician", fraction: 0 };
    els.playerName.textContent = p.name || "New PTA";
    els.playerRank.textContent = rank.title || "";
    els.xpFill.style.width = Math.round(Math.max(0, Math.min(1, rank.fraction || 0)) * 100) + "%";
    els.xpText.textContent = xp + " XP";
    var toNext = rank.nextTitle && typeof rank.nextXp === "number" ? " " + Math.max(0, rank.nextXp - xp) + " XP to " + rank.nextTitle + "." : " The highest rank!";
    els.player.setAttribute("aria-label", (p.name || "New PTA") + ", " + (rank.title || "") + ", " + xp + " XP." + toNext + " Open your case log.");
    els.player.title = toNext.trim();
  }

  // ------------------------------------------------------------------------------------
  // Router
  // ------------------------------------------------------------------------------------

  var NEEDS_PROFILE = { intro: 1, board: 1, "case": 1, casebook: 1, rounds: 1, drill: 1, log: 1, certificate: 1, finale: 1 };

  function go(name, params) {
    params = params || {};
    if (!UI.screens[name]) name = u.profile() ? "board" : "title";
    if (NEEDS_PROFILE[name] && !u.profile()) { name = "title"; params = {}; }
    if (name === "casebook" && !u.referenceOn()) name = "board";
    if (name === "slots" && isScorm()) name = "title";
    UI.dialogs.closeAll();
    closeMenu();
    if (current && current.destroy) u.safe(function () { current.destroy(); });
    current = null;
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
    document.title = (screen.title ? screen.title + " · " : "") + u.GAME_NAME;
    refreshTopbar();
    u.safe(function () { global.scrollTo(0, 0); });
    var target = screen.focus || screen.el.querySelector("h1");
    if (target) u.focusEl(target, { preventScroll: true });
    if (screen.onShow) u.safe(function () { screen.onShow(); });
    return screen;
  }

  function errorScreen(name) {
    return {
      el: h("section", { class: "screen-error paper-card" },
        h("h1", null, "This file is stuck in the drawer"),
        h("p", null, "Something went wrong while opening the “" + name + "” screen."),
        u.button("Back to the case board", { kind: "primary", onClick: function () { go(u.profile() ? "board" : "title"); } })),
      title: "Oops"
    };
  }

  function fatal(missing) {
    els.topbar.hidden = true;
    u.clear(els.main);
    els.main.className = "screen view-fatal";
    var errors = loadErrors();
    els.main.appendChild(h("section", { class: "fatal paper-card" },
      h("h1", null, "The case files won't open"),
      h("p", null, "An essential part of the game didn't load: ", h("strong", null, missing.join(", ")), "."),
      errors.length ? h("ul", { class: "fatal-list" }, errors.map(function (e) {
        return h("li", null, h("code", null, e.file), e.kind === "missing" ? " is missing" : " has an error" + (e.message ? ": " + e.message : ""));
      })) : null,
      h("p", null, "If you are a student, please tell your instructor. If you are the instructor, check that every file of the game was uploaded, or use the single-file version from the dist folder."),
      u.button("Try again", { kind: "primary", onClick: function () { try { global.location.reload(); } catch (err) { /* ignore */ } } })));
    var heading = els.main.querySelector("h1");
    u.focusEl(heading);
  }

  // ------------------------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------------------------

  var syncTimer = null;
  function onSaveChange(profile, info) {
    refreshTopbar();
    var type = info && info.type;
    if (type === "scorm") {
      // An LMS connection arrived late: the game now runs on the course's profile.
      setTimeout(function () { applySettings(); go("title"); }, 0);
      return;
    }
    if (type !== "sync" && type !== "slots") return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      applySettings();
      if (type === "slots" && state.screen !== "slots" && state.screen !== "title") return;
      if (current && current.refresh && !UI.dialogs.isOpen()) u.safe(function () { current.refresh(); });
    }, 0);
  }

  function flushSave() {
    u.safe(function () { if (CCF.Save && CCF.Save.flush) CCF.Save.flush(); });
  }

  function boot() {
    global.CCF_LOAD_DONE = true;
    buildShell();
    applySettings();

    var missing = [];
    if (!CCF.Save) missing.push("js/engine/save.js");
    if (!CCF.Progress) missing.push("js/engine/progress.js");
    if (!CCF.content) missing.push("js/content/registry.js");
    if (!CCF.Icons || !CCF.ICON_DATA) u.safe(function () { console.warn("[Cardiac Case Files] icons missing"); });
    if (missing.length) { fatal(missing); return; }
    u.safe(function () { CCF.content.finalize(); });

    var initResult;
    try { initResult = CCF.Save.init(); } catch (err) { initResult = Promise.reject(err); }
    Promise.resolve(initResult).then(function (info) {
      state.bootInfo = info || {};
    }, function (err) {
      if (global.console) console.warn("[Cardiac Case Files] CCF.Save.init failed", err);
      state.bootInfo = { mode: "local", storageOk: false, warning: "Saving isn't available right now, so progress lasts only until this page closes." };
    }).then(function () {
      u.safe(function () { CCF.Save.onChange(onSaveChange); });
      global.addEventListener("pagehide", flushSave);
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flushSave(); });
      if (u.profile()) state.slot = activeSlot();
      applySettings();
      go("title");
    });
  }

  UI.app = {
    state: state,
    go: go,
    applySettings: applySettings,
    updateSetting: updateSetting,
    refreshTopbar: refreshTopbar,
    soundOn: soundOn,
    toggleSound: toggleSound,
    renderWarning: renderWarning,
    isScorm: isScorm,
    storageWarning: storageWarning,
    slotList: slotList,
    activeSlot: activeSlot,
    firstEmptySlot: firstEmptySlot,
    newGame: newGame,
    loadSlot: loadSlot,
    enterGame: enterGame,
    hasSeen: hasSeen,
    markSeen: markSeen,
    story: story,
    loadErrors: loadErrors,
    contentProblems: contentProblems,
    current: function () { return current; },
    TEXT_SIZES: TEXT_SIZES
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
