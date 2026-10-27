/*
 * Syntax & Sorcery — shared panels (SS.UI.panels).
 *
 *   settings()                       sound, motion, editor size, free practice, rename, engine, about
 *   saveScroll({ chooseSlot, onImported })   export a save code / file, import one
 *   engineHelp()                     what the Python engine is doing, with Retry
 *   storageBanner(onOpen)            the "saving is blocked" warning, or null
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  var u = UI.util;
  var h = u.h;

  function app() { return UI.app; }

  function toggleRow(o) {
    var id = u.uid("toggle");
    var helpId = id + "-help";
    var input = h("input", {
      type: "checkbox", id: id, class: "switch-input", role: "switch",
      "aria-describedby": o.help ? helpId : null, checked: !!o.checked, disabled: !!o.disabled
    });
    input.addEventListener("change", function () { o.onChange(input.checked); });
    return h("div", { class: "setting-row" + (o.disabled ? " is-disabled" : "") },
      h("div", { class: "setting-text" },
        h("label", { class: "setting-label", for: id }, o.icon ? u.emoji(o.icon) : null, o.icon ? " " : null, o.label),
        o.help ? h("p", { class: "setting-help", id: helpId }, o.help) : null),
      h("span", { class: "switch" }, input, h("span", { class: "switch-track", "aria-hidden": "true" }, h("span", { class: "switch-thumb" }))));
  }

  function settings() {
    var s = u.settings();
    var p = u.profile();
    var conf = u.config();
    var osReduced = u.safe(function () { return global.matchMedia("(prefers-reduced-motion: reduce)").matches; }, false);
    var body = h("div", { class: "settings" });
    var needsRefresh = false;   // the screen behind is redrawn once Settings closes

    body.appendChild(h("h3", { class: "settings-heading" }, "Sound & motion"));
    body.appendChild(toggleRow({
      icon: "🔊", label: "Sound effects", checked: s.sound !== false,
      help: "Chimes, whooshes and owl hoots, made live by your browser.",
      onChange: function (v) { app().updateSettings({ sound: v }); if (v) UI.sound.play("success"); }
    }));
    body.appendChild(toggleRow({
      icon: "🌙", label: "Reduce motion", checked: !!s.reduceMotion,
      help: osReduced ? "Your device already asks for less motion, so big animations are off either way." : "Turns off sparkles, shaking and other animations.",
      onChange: function (v) { app().updateSettings({ reduceMotion: v }); }
    }));

    body.appendChild(h("h3", { class: "settings-heading" }, "Spell editor"));
    var size = Number(s.editorFontSize) || 15;
    var sizeOut = h("output", { class: "font-size-value", "aria-live": "polite" }, size + " px");
    var preview = h("pre", { class: "font-preview code-block", "aria-hidden": "true", style: { fontSize: size + "px" } },
      UI.rich.highlight('def greet(name):\n    print(f"Hello, {name}!")  # magic'));
    function setSize(next) {
      size = Math.max(12, Math.min(24, next));
      sizeOut.textContent = size + " px";
      preview.style.fontSize = size + "px";
      app().updateSettings({ editorFontSize: size });
    }
    body.appendChild(h("div", { class: "setting-row" },
      h("div", { class: "setting-text" },
        h("p", { class: "setting-label", id: "font-size-label" }, u.emoji("🔠"), " Editor text size"),
        h("p", { class: "setting-help" }, "Makes the code in the spell editor bigger or smaller.")),
      h("div", { class: "stepper", role: "group", "aria-labelledby": "font-size-label" },
        u.button("", { kind: "ghost", size: "sm", icon: "−", ariaLabel: "Smaller text", onClick: function () { setSize(size - 1); } }),
        sizeOut,
        u.button("", { kind: "ghost", size: "sm", icon: "+", ariaLabel: "Bigger text", onClick: function () { setSize(size + 1); } }))));
    body.appendChild(preview);

    body.appendChild(h("h3", { class: "settings-heading" }, "Learning"));
    var forced = conf.unlockAll === true;
    body.appendChild(toggleRow({
      icon: "🗝️", label: "Free practice: open every chapter", checked: forced || !!s.unlockAll, disabled: forced,
      help: forced ? "Your instructor has opened every chapter for this class." : "Visit any chapter or challenge in any order. Stars and XP still count.",
      onChange: function (v) {
        app().updateSettings({ unlockAll: v });
        needsRefresh = true;
      }
    }));

    if (p) {
      body.appendChild(h("h3", { class: "settings-heading" }, "Your wizard"));
      var nameId = u.uid("rename");
      var input = h("input", { class: "input", id: nameId, type: "text", maxlength: "24", autocomplete: "off", spellcheck: "false" });
      input.value = p.wizardName || "";
      var note = h("p", { class: "field-status", role: "status" });
      function rename() {
        var name = u.cleanName(input.value);
        if (!name) { note.textContent = "Type a name first."; note.className = "field-error"; return; }
        u.safe(function () { SS.Save.renameWizard(name); });
        input.value = name;
        note.className = "field-status ok";
        note.textContent = "Done! The academy will call you " + name + ".";
        app().refreshTopbar();
        needsRefresh = true;
      }
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); rename(); } });
      body.appendChild(h("div", { class: "setting-row setting-rename" },
        h("div", { class: "setting-text" },
          h("label", { class: "setting-label", for: nameId }, u.emoji("🧙"), " Wizard name"),
          h("div", { class: "rename-field" }, input, u.button("Rename", { kind: "ghost", size: "sm", onClick: rename })),
          note)));
    }

    body.appendChild(h("h3", { class: "settings-heading" }, "Python engine"));
    var engineText = h("p", { class: "setting-help" });
    var engineName = h("p", { class: "setting-label" });
    var engineBtn = u.button("Restart Python", { kind: "ghost", size: "sm", icon: "↻", onClick: function () { app().retryEngine(); } });
    var unsub = app().onEngine(function (st) {
      engineName.textContent = "🐍 " + app().engineLabel(st);
      engineText.textContent = st.message || "";
      var label = engineBtn.querySelector(".btn-label");
      if (label) label.textContent = st.state === "error" ? "Try again" : "Restart Python";
      engineBtn.disabled = st.state === "loading";
    });
    body.appendChild(h("div", { class: "setting-row" }, h("div", { class: "setting-text" }, engineName, engineText), engineBtn));

    body.appendChild(about());

    UI.dialogs.open({
      title: "Settings", icon: "⚙️", size: "md", className: "modal-settings", body: body, focusInput: false,
      actions: [{ label: "Done", kind: "primary" }],
      onClose: function () {
        unsub();
        if (!needsRefresh) return;
        // Let the dialog finish closing (and return focus) before redrawing the screen.
        setTimeout(function () {
          var cur = app().current();
          if (cur && cur.refresh && !UI.dialogs.isOpen()) cur.refresh();
        }, 0);
      }
    });
  }

  /** One sentence about where progress lives, for the current mode. */
  function savingSentence() {
    return app().isScorm()
      ? "Your course saves your progress automatically."
      : "Progress saves itself in this browser; a Save Scroll carries it to another computer.";
  }

  function about() {
    var conf = u.config();
    var py = conf.pyodideVersion ? " " + conf.pyodideVersion : "";
    return h("details", { class: "about" },
      h("summary", null, u.emoji("📜"), " About " + u.GAME_NAME),
      h("div", { class: "about-body" },
        h("p", null, h("strong", null, u.GAME_NAME + (conf.version ? " " + conf.version : "")), " — " + u.TAGLINE + " Learn Python, data structures & algorithms and object-oriented programming by casting real Python spells."),
        h("p", null, "Your spells run in real Python (CPython via Pyodide" + py + ") inside your browser. Nothing you type is sent anywhere. " + savingSentence()),
        h("ul", { class: "credits" },
          h("li", null, "Python in the browser: Pyodide (MPL-2.0)"),
          h("li", null, "Code editor: CodeMirror 5 (MIT)"),
          h("li", null, "Fonts: Cinzel, Inter and JetBrains Mono (SIL Open Font License)"),
          h("li", null, "Sounds and sparkles are generated by the game itself.")),
        h("p", null, "Keyboard: ", h("kbd", null, UI.Editor.modKey + "+Enter"), " casts a spell. Inside the editor, ", h("kbd", null, "Tab"), " indents; press ", h("kbd", null, "Esc"), " then ", h("kbd", null, "Tab"), " to move on.")));
  }

  // --------------------------------------------------------------------------
  // Save Scroll
  // --------------------------------------------------------------------------

  function storageBanner(onOpen) {
    var warning = app().storageWarning();
    if (!warning) return null;
    return h("div", { class: "banner banner-warn", role: "status" },
      h("span", { class: "banner-icon", "aria-hidden": "true" }, "⚠️"),
      h("div", { class: "banner-text" }, h("p", null, warning)),
      onOpen ? u.button("Open the Save Scroll", { kind: "ghost", size: "sm", icon: "📜", onClick: onOpen }) : null);
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      try {
        if (file.size > 5 * 1024 * 1024) { reject(new Error("That file is too big to be a Save Scroll.")); return; }
        var reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result || "")); };
        reader.onerror = function () { reject(new Error("The file couldn't be read.")); };
        reader.readAsText(file);
      } catch (err) {
        reject(new Error("The file couldn't be read."));
      }
    });
  }

  /**
   * The Save Scroll. opts.chooseSlot: show a slot picker for the import (title /
   * slot screen); otherwise the import replaces the active profile's slot.
   */
  function saveScroll(opts) {
    opts = opts || {};
    var p = opts.chooseSlot ? null : u.profile();
    var scorm = app().isScorm();
    var framed = u.isFramed();
    var scormConf = (u.config().scorm || {});
    var allowImport = !scorm || scormConf.allowImport === true;
    var body = h("div", { class: "savescroll" });
    var m;

    body.appendChild(h("p", { class: "lead" }, scorm
      ? "Your course saves your progress automatically. You can still copy a save code as a personal backup."
      : p
        ? "Your progress saves itself in this browser. A Save Scroll lets you carry it to another computer, or keep a backup."
        : "Bring a wizard from another computer: choose a save file, or paste a save code."));
    var banner = storageBanner(null);
    if (banner) body.appendChild(banner);

    if (p) {
      var exportStatus = h("p", { class: "field-status", role: "status" });
      var code = u.safe(function () { return SS.Save.exportCode(); }, "") || "";
      var codeId = u.uid("savecode");
      var codeBox = h("textarea", { class: "input code-box", id: codeId, readonly: true, rows: "3", spellcheck: "false" });
      codeBox.value = code;
      codeBox.addEventListener("focus", function () { u.safe(function () { codeBox.select(); }); });
      body.appendChild(h("section", { class: "scroll-section" },
        h("h3", null, u.emoji("📤"), " Take your progress with you"),
        h("p", { class: "section-help" }, framed
          ? "Copy this save code and keep it somewhere safe (an email to yourself works). It holds your stars, hints and settings. Course pages sometimes block downloads, so the code is the surest way."
          : "Copy this save code (it holds your stars, hints and settings) or download a save file (which also keeps the spells you wrote)."),
        h("label", { class: "field-label", for: codeId }, "Save code for ", h("strong", null, p.wizardName || "your wizard")),
        codeBox,
        h("div", { class: "button-row" },
          u.button("Copy save code", {
            kind: "primary", icon: "📋", onClick: function () {
              u.copyText(code).then(function (ok) {
                exportStatus.className = "field-status" + (ok ? " ok" : "");
                exportStatus.textContent = ok ? "Copied! Paste it somewhere safe (an email to yourself works)." :
                  "Your browser blocked copying, so the code is now selected: press " + UI.Editor.modKey + "+C to copy it.";
                if (!ok) u.safe(function () { codeBox.focus(); codeBox.select(); });
              });
            }
          }),
          u.button(framed ? "Try downloading a save file" : "Download save file", {
            kind: "ghost", icon: "⬇️", onClick: function () {
              var ok = u.safe(function () { return SS.Save.exportFile(); }, false);
              exportStatus.className = "field-status" + (ok !== false ? " ok" : "");
              exportStatus.textContent = ok !== false
                ? "Your save file should be downloading. If nothing arrives (some course pages block downloads), copy the save code above instead."
                : "Downloads are blocked here. Copy the save code above instead.";
            }
          })),
        exportStatus));
    }

    // Import
    var slots = opts.chooseSlot && !scorm ? app().slotList() : null;
    var picked = null;
    var slotPicker = null;
    if (slots) {
      var firstEmpty = slots.filter(function (s) { return !s.data && !s.damaged; })[0];
      picked = (firstEmpty || slots[0]).slot;
      var groupName = u.uid("slotpick");
      slotPicker = h("fieldset", { class: "slot-picker" },
        h("legend", null, "Import into"),
        slots.map(function (s) {
          var id = u.uid("slotopt");
          var input = h("input", { type: "radio", name: groupName, id: id, value: String(s.slot), checked: s.slot === picked });
          input.addEventListener("change", function () { if (input.checked) picked = s.slot; });
          return h("label", { class: "slot-option", for: id }, input,
            h("span", null, "Slot " + (s.index + 1) + ": ", s.data ? h("strong", null, s.data.wizardName || "Apprentice") : h("em", null, s.damaged ? "damaged save" : "empty")));
        }));
    }
    var fileId = u.uid("savefile");
    var fileInput = h("input", { type: "file", id: fileId, class: "file-input", accept: ".json,.txt,.sns,application/json,text/plain" });
    var pasteId = u.uid("paste");
    var paste = h("textarea", { class: "input code-box", id: pasteId, rows: "3", spellcheck: "false", placeholder: "Paste a save code here (it starts with SNS1.)" });
    var importError = h("p", { class: "field-error", role: "alert" });
    var importBtn = u.button("Import save code", { kind: "primary", icon: "📥" });

    function targetSlot() {
      if (slots) return picked;
      return app().activeSlot();
    }

    function doImport(text) {
      importError.textContent = "";
      text = String(text || "").trim();
      if (!text) { importError.textContent = "Paste a save code or choose a save file first."; return; }
      var slot = targetSlot();
      var slotData = slots ? slots.filter(function (s) { return s.slot === slot; })[0] : null;
      var occupied = slots ? !!(slotData && (slotData.data || slotData.damaged)) : !!p;
      var who = slots ? (slotData && slotData.data ? slotData.data.wizardName : "the damaged save") : (p && p.wizardName);
      var ask = occupied && !scorm
        ? UI.dialogs.confirm({
          title: "Replace this save?", icon: "📜", danger: true, confirmLabel: "Replace it",
          message: h("p", null, "Importing replaces the progress of ", h("strong", null, who || "this wizard"), " in this save slot. This can't be undone.")
        })
        : Promise.resolve(true);
      if (scorm) {
        ask = UI.dialogs.confirm({
          title: "Add this Save Scroll to your course save?", icon: "📜", confirmLabel: "Import it",
          message: "Its progress is combined with the progress your course already has, keeping the best result for every spell."
        });
      }
      ask.then(function (ok) {
        if (!ok) return;
        var profile;
        try {
          profile = SS.Save.importData(text, slot);
        } catch (err) {
          importError.textContent = (err && err.message) || "That Save Scroll couldn't be read.";
          return;
        }
        if (!profile) { importError.textContent = "That Save Scroll couldn't be read."; return; }
        app().state.slot = slot;
        if (m) m.close("imported");
        UI.sound.play("unlock");
        UI.dialogs.toast("Save Scroll imported. Welcome back, " + (profile.wizardName || "apprentice") + "!", { icon: "📜", kind: "ok" });
        if (opts.onImported) opts.onImported(profile);
        else app().enterGame();
      });
    }

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      readFile(file).then(doImport, function (err) { importError.textContent = err.message; });
      fileInput.value = "";
    });
    importBtn.addEventListener("click", function () { doImport(paste.value); });

    if (allowImport) {
      body.appendChild(h("section", { class: "scroll-section" },
        h("h3", null, u.emoji("📥"), " Import a Save Scroll"),
        h("p", { class: "section-help" }, scorm
          ? "Importing adds the Save Scroll's progress to this course's save, keeping the best result for every spell."
          : p ? "Importing replaces the progress in this save slot." : "Choose where the wizard should go, then pick a file or paste a code."),
        slotPicker,
        h("div", { class: "button-row" },
          fileInput,
          h("label", { class: "btn btn-ghost file-label", for: fileId }, u.emoji("📂"), h("span", { class: "btn-label" }, "Choose a save file…"))),
        h("label", { class: "field-label", for: pasteId }, "…or paste a save code"),
        paste,
        h("div", { class: "button-row" }, importBtn),
        importError));
    } else {
      body.appendChild(h("p", { class: "scroll-note" }, u.emoji("🎓"), " Your course saves your progress automatically, so there is nothing to import here."));
    }

    m = UI.dialogs.open({
      title: "Save Scroll", icon: "📜", size: "md", className: "modal-savescroll", body: body, focusInput: false,
      actions: [{ label: "Close", kind: "ghost" }]
    });
    return m;
  }

  // --------------------------------------------------------------------------
  // Engine help
  // --------------------------------------------------------------------------

  function engineHelp() {
    var body = h("div", { class: "engine-help" });
    var stateEl = h("p", { class: "engine-help-state" });
    var msg = h("p", { class: "engine-help-msg" });
    var tips = h("div", { class: "engine-help-tips" });
    var tech = h("details", { class: "engine-help-tech", hidden: true }, h("summary", null, "Technical details"), h("pre", { class: "traceback-text" }));
    body.appendChild(stateEl);
    body.appendChild(msg);
    body.appendChild(tips);
    body.appendChild(tech);
    var retry = { label: "Try again", kind: "primary", icon: "↻", id: u.uid("retry"), onClick: function () { app().retryEngine(); return false; } };
    var m = UI.dialogs.open({
      title: "The Python engine", icon: "🐍", size: "md", body: body,
      actions: [retry, { label: "Close", kind: "ghost" }]
    });
    var retryBtn = m.footer.querySelector("#" + retry.id);
    var unsub = app().onEngine(function (st) {
      stateEl.textContent = app().engineLabel(st);
      stateEl.setAttribute("data-state", st.state);
      msg.textContent = st.message || "";
      u.clear(tips);
      if (st.state === "error") {
        tips.appendChild(h("p", null, "You can still explore the map and read every story and lesson. To cast spells:"));
        tips.appendChild(h("ul", null,
          h("li", null, "Check that this computer is online, then press ", h("strong", null, "Try again"), "."),
          h("li", null, "On a school network, ask your teacher or IT team to allow ", h("code", { class: "inline-code" }, "cdn.jsdelivr.net"), " (or ", h("code", { class: "inline-code" }, "unpkg.com"), ")."),
          h("li", null, "If the game is inside a course page, opening it in its own browser tab sometimes helps.")));
      } else if (st.state === "loading" || st.state === "idle") {
        tips.appendChild(h("p", null, "The first visit downloads Python (about 12 MB); after that your browser remembers it and it starts much faster. You can read the story and lessons while you wait."));
      } else {
        tips.appendChild(h("p", null, "Python is awake and ready. Every spell you cast runs as real Python in your browser."));
      }
      tech.hidden = !st.detail;
      tech.querySelector("pre").textContent = st.detail || "";
      if (retryBtn) {
        retryBtn.hidden = st.state === "ready" || st.state === "busy";
        retryBtn.disabled = st.state === "loading";
        var label = retryBtn.querySelector(".btn-label");
        if (label) label.textContent = st.state === "loading" ? "Loading…" : "Try again";
      }
    });
    m.result.then(unsub);
    return m;
  }

  UI.panels = {
    settings: settings,
    saveScroll: saveScroll,
    engineHelp: engineHelp,
    storageBanner: storageBanner,
    savingSentence: savingSentence,
    about: about
  };
})(typeof window !== "undefined" ? window : globalThis);
