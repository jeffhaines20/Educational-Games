/*
 * The Cardiac Case Files — shared panels (CCF.UI.panels).
 *
 *   settings()    sound, reduce motion, text size, rename, save code, switch player, about
 *   saveCode()    export the save code (copy / download) and import one
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
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
    return h("div", { class: "setting-row" + (o.disabled ? " is-disabled" : ""), dataset: { setting: o.key || "" } },
      h("div", { class: "setting-text" },
        h("label", { class: "setting-label", for: id }, o.icon ? u.icon(o.icon) : null, o.label),
        o.help ? h("p", { class: "setting-help", id: helpId }, o.help) : null),
      h("span", { class: "switch" }, input, h("span", { class: "switch-track", "aria-hidden": "true" }, h("span", { class: "switch-thumb" }))));
  }

  var SIZES = [{ id: "sm", label: "Small" }, { id: "md", label: "Medium" }, { id: "lg", label: "Large" }, { id: "xl", label: "Extra large" }];

  function settings() {
    var s = u.settings();
    var p = u.profile();
    var osReduced = u.safe(function () { return global.matchMedia("(prefers-reduced-motion: reduce)").matches; }, false);
    var body = h("div", { class: "settings" });
    var needsRefresh = false;

    body.appendChild(h("h3", { class: "settings-heading" }, "Sound and motion"));
    body.appendChild(toggleRow({
      key: "sound", icon: "soundOn", label: "Sound effects", checked: app().soundOn(),
      help: "A heartbeat blip, a stamp thud and soft chimes, made by your browser.",
      onChange: function (v) { app().updateSetting("sound", v); if (v) UI.sound.play("correct"); }
    }));
    body.appendChild(toggleRow({
      key: "reduceMotion", icon: "motion", label: "Reduce motion", checked: !!s.reduceMotion || document.documentElement.classList.contains("reduce-motion"),
      help: osReduced ? "Your device already asks for less motion, so animations are off either way." : "Turns off the stamp, star and page animations.",
      onChange: function (v) { app().updateSetting("reduceMotion", v); }
    }));

    body.appendChild(h("h3", { class: "settings-heading" }, "Reading"));
    var group = u.uid("size");
    var sizeRow = h("fieldset", { class: "setting-row setting-size", dataset: { setting: "textSize" } },
      h("legend", { class: "setting-label" }, u.icon("textSize"), "Text size"),
      h("div", { class: "segmented" }, SIZES.map(function (z) {
        var id = u.uid("sizeopt");
        var input = h("input", { type: "radio", name: group, id: id, value: z.id, checked: (s.textSize || "md") === z.id });
        input.addEventListener("change", function () { if (input.checked) { app().updateSetting("textSize", z.id); needsRefresh = true; } });
        return h("label", { class: "segment", for: id, dataset: { size: z.id } }, input, h("span", null, z.label));
      })));
    body.appendChild(sizeRow);

    if (p) {
      body.appendChild(h("h3", { class: "settings-heading" }, "Your name badge"));
      var nameId = u.uid("rename");
      var input = h("input", { class: "input", id: nameId, type: "text", maxlength: "40", autocomplete: "off", spellcheck: "false" });
      input.value = p.name || "";
      var note = h("p", { class: "field-status", role: "status" });
      var rename = function () {
        var name = u.cleanName(input.value);
        if (!name) { note.textContent = "Type a name first."; note.className = "field-error"; return; }
        var saved = u.safe(function () { return CCF.Save.rename(name); }, null);
        if (typeof saved === "string" && saved) name = saved;
        input.value = name;
        note.className = "field-status ok";
        note.textContent = "Done — your badge now says " + name + ".";
        app().refreshTopbar();
        needsRefresh = true;
      };
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); rename(); } });
      body.appendChild(h("div", { class: "setting-row setting-rename" },
        h("div", { class: "setting-text" },
          h("label", { class: "setting-label", for: nameId }, u.icon("detective"), "Name"),
          h("div", { class: "rename-field" }, input, u.button("Rename", { kind: "secondary", size: "sm", class: "rename-btn", onClick: rename })),
          note)));

      body.appendChild(h("h3", { class: "settings-heading" }, "Your progress"));
      body.appendChild(h("div", { class: "setting-row" },
        h("div", { class: "setting-text" },
          h("p", { class: "setting-label" }, u.icon("exportSave"), "Save code"),
          h("p", { class: "setting-help" }, app().isScorm() ? "Your course saves your progress. A save code is a personal backup." : "Progress saves itself in this browser. A save code carries it to another computer.")),
        u.button("Save code…", { kind: "secondary", size: "sm", class: "open-savecode", onClick: function () { saveCode(); } })));
      if (!app().isScorm()) {
        body.appendChild(h("div", { class: "setting-row" },
          h("div", { class: "setting-text" },
            h("p", { class: "setting-label" }, u.icon("files"), "Save slots"),
            h("p", { class: "setting-help" }, "Switch player, start new case files or delete a save.")),
          u.button("Save slots", { kind: "secondary", size: "sm", onClick: function () { m.close(); app().go("slots"); } })));
      }
    }

    body.appendChild(h("details", { class: "about-details" },
      h("summary", null, u.icon("info"), " About, credits and disclaimer"),
      UI.title ? UI.title.aboutBody() : h("p", null, u.DISCLAIMER)));

    var m = UI.dialogs.open({
      title: "Settings", icon: "settings", size: "md", className: "modal-settings", body: body, focusInput: false,
      actions: [{ label: "Done", kind: "primary" }],
      onClose: function () {
        if (!needsRefresh) return;
        setTimeout(function () {
          var cur = app().current();
          if (cur && cur.refresh && !UI.dialogs.isOpen()) cur.refresh();
        }, 0);
      }
    });
    return m;
  }

  /** Export (copy / download) and import a save code. */
  function saveCode() {
    var p = u.profile();
    var scorm = app().isScorm();
    var body = h("div", { class: "savecode" });
    var m;
    if (p) {
      var code = u.safe(function () { return CCF.Save.exportCode(); }, "") || "";
      var codeId = u.uid("savecode");
      var status = h("p", { class: "field-status", role: "status" });
      var box = h("textarea", { class: "input code-box", id: codeId, readonly: true, rows: "4", spellcheck: "false" });
      box.value = code;
      box.addEventListener("focus", function () { u.safe(function () { box.select(); }); });
      body.appendChild(h("section", { class: "savecode-section" },
        h("h3", null, u.icon("exportSave"), " Take your progress with you"),
        h("p", { class: "section-help" }, "Copy this code and keep it somewhere safe (an email to yourself works). On another computer choose “I have a save code” on the title screen."),
        h("label", { class: "field-label", for: codeId }, "Save code for ", h("strong", null, p.name || "you")),
        box,
        h("div", { class: "button-row" },
          u.button("Copy save code", {
            kind: "primary", icon: "exportSave", class: "copy-code", onClick: function () {
              u.copyText(code).then(function (ok) {
                status.className = "field-status" + (ok ? " ok" : "");
                status.textContent = ok ? "Copied! Paste it somewhere safe." : "Copying was blocked, so the code is selected: press Ctrl+C (or ⌘+C) to copy it.";
                if (!ok) u.safe(function () { box.focus(); box.select(); });
              });
            }
          }),
          u.button("Download as a file", {
            kind: "ghost", icon: "importSave", onClick: function () {
              var ok = u.downloadText("cardiac-case-files-" + String(p.name || "save").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".txt", code);
              status.className = "field-status" + (ok ? " ok" : "");
              status.textContent = ok ? "Your save file should be downloading." : "Downloads are blocked here. Copy the code instead.";
            }
          })),
        status));
    }
    var canImport = UI.title ? UI.title.canImport() : !scorm;
    if (canImport) {
      body.appendChild(h("section", { class: "savecode-section" },
        h("h3", null, u.icon("importSave"), " Bring progress here"),
        h("p", { class: "section-help" }, scorm ? "Adds a save code's progress to your course save." : "Importing replaces the progress in this save slot."),
        u.button("Import a save code…", {
          kind: "secondary", icon: "importSave", class: "import-code", onClick: function () {
            m.close();
            UI.title.importDialog({
              slot: scorm ? 0 : app().activeSlot(),
              onImported: function () { app().enterGame(); }
            });
          }
        })));
    }
    m = UI.dialogs.open({ title: "Save code", icon: "exportSave", size: "md", className: "modal-savecode", body: body, focusInput: false, actions: [{ label: "Close", kind: "ghost" }] });
    return m;
  }

  UI.panels = { settings: settings, saveCode: saveCode };
})(typeof window !== "undefined" ? window : globalThis);
