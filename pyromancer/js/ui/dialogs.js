/*
 * Pyromancer — dialogs (SS.UI.dialogs).
 *
 *   open({ title, icon, body, actions, size, className, dismissable, initialFocus, onClose }) → { el, body, close(value), result }
 *   confirm({ title, message, confirmLabel, danger }) → Promise<boolean>
 *   prompt({ title, label, value, validate, clean }) → Promise<string|null>
 *   toast(message, { icon, kind, timeout })
 *   dialogueView(panels, opts) / story(panels, opts) → Promise<"done"|"skipped">
 *   toPanels(richOrPanels, speaker)
 *   printNode(node, kind)
 *
 * Modals trap focus, close on Esc (when dismissable), make the rest of the page
 * inert and return focus to whatever opened them.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  var u = UI.util;
  var h = u.h;

  var stack = [];

  function modalRoot() {
    return document.getElementById("modal-root") || document.body;
  }

  function setInert(el, on) {
    if (!el) return;
    try { el.inert = !!on; } catch (err) { /* old browser: the focus trap still applies */ }
    if (on) el.setAttribute("aria-hidden", "true");
    else el.removeAttribute("aria-hidden");
  }

  function updateInert() {
    var top = stack[stack.length - 1];
    setInert(document.getElementById("app"), stack.length > 0);
    stack.forEach(function (m) { setInert(m.overlay, m !== top); });
    document.documentElement.classList.toggle("modal-open", stack.length > 0);
  }

  function resolveNode(value, api) {
    if (typeof value === "function") return value(api);
    return value;
  }

  function open(opts) {
    opts = opts || {};
    var opener = document.activeElement;
    var titleId = u.uid("modal-title");
    var dismissable = opts.dismissable !== false;
    var closed = false;
    var resolveResult;

    var dialog = h("div", {
      class: ["modal", "modal-" + (opts.size || "md"), opts.className],
      role: opts.role || "dialog",
      "aria-modal": "true",
      "aria-labelledby": opts.title ? titleId : null,
      "aria-label": opts.title ? null : (opts.label || "Dialog"),
      tabindex: "-1"
    });
    if (opts.title) {
      dialog.appendChild(h("header", { class: "modal-header" },
        opts.icon ? h("span", { class: "modal-icon", "aria-hidden": "true" }, opts.icon) : null,
        h("h2", { class: "modal-title", id: titleId }, opts.title)));
    }
    var body = h("div", { class: "modal-body" });
    var footer = h("div", { class: "modal-actions" });
    dialog.appendChild(body);
    dialog.appendChild(footer);
    if (dismissable && opts.closeButton !== false) {
      dialog.appendChild(h("button", {
        type: "button", class: "modal-close", "aria-label": "Close",
        on: { click: function () { close(undefined); } }
      }, "✕"));
    }
    var overlay = h("div", { class: "modal-overlay" + (opts.overlayClass ? " " + opts.overlayClass : "") }, dialog);

    var api = {
      el: dialog,
      overlay: overlay,
      body: body,
      footer: footer,
      close: close,
      setActions: setActions,
      isOpen: function () { return !closed; },
      result: new Promise(function (resolve) { resolveResult = resolve; })
    };

    function setActions(actions) {
      u.clear(footer);
      (actions || []).forEach(function (action) {
        if (!action) return;
        var btn = u.button(action.label, { kind: action.kind || "ghost", icon: action.icon, class: action.class, ariaLabel: action.ariaLabel, id: action.id });
        if (action.autofocus) btn.setAttribute("data-autofocus", "1");
        btn.addEventListener("click", function () {
          var outcome = action.onClick ? action.onClick(api, btn) : undefined;
          if (outcome === false) return;
          if (outcome && typeof outcome.then === "function") {
            btn.disabled = true;
            outcome.then(function (value) {
              btn.disabled = false;
              if (value !== false) close(action.value);
            }, function () { btn.disabled = false; });
            return;
          }
          close(action.value);
        });
        footer.appendChild(btn);
      });
      footer.hidden = !footer.childNodes.length;
    }

    function trapTab(e) {
      var items = u.focusables(dialog);
      if (!items.length) { e.preventDefault(); u.focusEl(dialog); return; }
      var first = items[0], last = items[items.length - 1], active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === dialog || !dialog.contains(active)) { e.preventDefault(); u.focusEl(last); }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        u.focusEl(first);
      }
    }

    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dismissable && !e.defaultPrevented) {
        e.preventDefault();
        e.stopPropagation();
        close(undefined);
      } else if (e.key === "Tab") {
        trapTab(e);
      }
    });
    var downOnBackdrop = false;
    overlay.addEventListener("mousedown", function (e) { downOnBackdrop = e.target === overlay; });
    overlay.addEventListener("click", function (e) {
      if (dismissable && opts.backdropClose !== false && downOnBackdrop && e.target === overlay) close(undefined);
    });

    function close(value) {
      if (closed) return;
      closed = true;
      var index = stack.indexOf(api);
      if (index >= 0) stack.splice(index, 1);
      overlay.classList.add("is-closing");
      if (u.reducedMotion()) u.remove(overlay);
      else setTimeout(function () { u.remove(overlay); }, 170);
      updateInert();
      var target = opts.returnFocus || opener;
      if (target && target !== document.body && document.documentElement.contains(target) && !target.closest("[inert]")) {
        u.focusEl(target);
      } else if (stack.length) {
        u.focusEl(stack[stack.length - 1].el);
      }
      if (opts.onClose) u.safe(function () { opts.onClose(value); });
      resolveResult(value);
    }

    u.append(body, resolveNode(opts.body, api));
    setActions(opts.actions);
    modalRoot().appendChild(overlay);
    stack.push(api);
    updateInert();

    var initial = typeof opts.initialFocus === "string" ? dialog.querySelector(opts.initialFocus) : opts.initialFocus;
    if (!initial) {
      // Small dialogs (confirm, prompt, success) focus their main action; long ones focus
      // the dialog itself so they open at the top and screen readers announce the title.
      initial = dialog.querySelector("[data-autofocus]") ||
        (opts.focusInput !== false ? body.querySelector("input:not([type=hidden]):not([type=file]), textarea:not([readonly])") : null) ||
        ((opts.size || "md") === "sm" ? footer.querySelector(".btn-primary") : null) || dialog;
    }
    try { initial.focus({ preventScroll: true }); } catch (err) { u.focusEl(initial); }
    dialog.scrollTop = 0;
    if (opts.sound !== false) UI.sound.play("open");
    return api;
  }

  function closeAll() {
    stack.slice().reverse().forEach(function (m) { m.close(undefined); });
  }

  function isOpen() {
    return stack.length > 0;
  }

  function confirmDialog(opts) {
    opts = opts || {};
    var message = typeof opts.message === "string" ? h("p", null, UI.rich.inline(opts.message)) : opts.message;
    var m = open({
      title: opts.title || "Are you sure?",
      icon: opts.icon,
      size: "sm",
      className: "modal-confirm",
      body: h("div", { class: "confirm-message" }, message),
      actions: [
        { label: opts.cancelLabel || "Cancel", kind: "ghost", value: false, autofocus: !!opts.danger },
        { label: opts.confirmLabel || "OK", kind: opts.danger ? "danger" : "primary", value: true, icon: opts.confirmIcon, autofocus: !opts.danger }
      ]
    });
    return m.result.then(function (value) { return value === true; });
  }

  function promptDialog(opts) {
    opts = opts || {};
    var inputId = u.uid("prompt");
    var errorId = u.uid("prompt-error");
    var input = h("input", {
      class: "input", id: inputId, type: "text", maxlength: String(opts.maxLength || 30),
      autocomplete: "off", spellcheck: "false", placeholder: opts.placeholder || null,
      "aria-describedby": errorId
    });
    input.value = opts.value || "";
    var error = h("p", { class: "field-error", id: errorId, role: "alert" });
    var body = h("div", { class: "prompt-body" },
      opts.intro ? h("p", { class: "prompt-intro" }, opts.intro) : null,
      h("label", { class: "field-label", for: inputId }, opts.label || "Name"),
      input,
      opts.help ? h("p", { class: "field-help" }, opts.help) : null,
      error);
    var m;
    function submit() {
      var value = opts.clean ? opts.clean(input.value) : input.value.trim();
      var problem = opts.validate ? opts.validate(value) : (value ? null : "Please type something.");
      if (problem) {
        error.textContent = problem;
        input.setAttribute("aria-invalid", "true");
        u.focusEl(input);
        return false;
      }
      m.close({ value: value });
      return false;
    }
    var actions = [];
    if (opts.dismissable !== false) actions.push({ label: opts.cancelLabel || "Cancel", kind: "ghost", value: null });
    actions.push({ label: opts.confirmLabel || "OK", kind: "primary", icon: opts.confirmIcon, onClick: submit });
    m = open({
      title: opts.title, icon: opts.icon, size: "sm", className: "modal-prompt", body: body,
      dismissable: opts.dismissable !== false, initialFocus: input, actions: actions
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
    input.addEventListener("input", function () { error.textContent = ""; input.removeAttribute("aria-invalid"); });
    if (opts.selectAll) u.safe(function () { input.select(); });
    return m.result.then(function (value) { return value && typeof value === "object" ? value.value : null; });
  }

  function toast(message, opts) {
    opts = opts || {};
    var root = document.getElementById("toast-root");
    if (!root) return;
    var el = h("div", { class: "toast toast-" + (opts.kind || "info") },
      opts.icon ? h("span", { class: "toast-icon", "aria-hidden": "true" }, opts.icon) : null,
      h("span", { class: "toast-text" }, message));
    root.appendChild(el);
    while (root.childNodes.length > 3) u.remove(root.firstChild);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { u.remove(el); }, 350);
    }, opts.timeout || 4200);
  }

  // --------------------------------------------------------------------------
  // Story dialogue (prologue, chapter intros/outros, epilogue)
  // --------------------------------------------------------------------------

  function speakerInfo(key) {
    var chars = SS.CHARACTERS || {};
    var known = chars[key];
    var c = known || chars.narrator || { name: "", icon: "📜", role: "" };
    return { key: known ? key : "narrator", name: c.name || "", icon: c.icon || "📜", role: c.role || "" };
  }

  function isPanel(p) {
    return !!p && typeof p === "object" && !Array.isArray(p) && ("speaker" in p || "text" in p) && !("code" in p);
  }

  /** Story panels ([{speaker, text}]) or a RichText value (one panel for `speaker`). */
  function toPanels(value, speaker) {
    if (value === null || value === undefined || value === "") return [];
    if (Array.isArray(value) && value.length && value.every(isPanel)) {
      return value.filter(function (p) { return p.text !== undefined && p.text !== null && p.text !== ""; });
    }
    if (Array.isArray(value) && !value.length) return [];
    return [{ speaker: speaker || "ada", text: value }];
  }

  /**
   * The dialogue component. opts: { title, finishLabel, skipLabel, onDone(reason) }.
   * Returns { el, focus() }.
   */
  function dialogueView(panels, opts) {
    opts = opts || {};
    var index = 0;
    var finished = false;
    var portrait = h("div", { class: "dlg-portrait", "aria-hidden": "true" });
    var nameEl = h("p", { class: "dlg-name" });
    var roleEl = h("p", { class: "dlg-role" });
    var textEl = h("div", { class: "dlg-text rich" });
    var live = h("div", { class: "sr-only", "aria-live": "polite" });
    var counter = h("p", { class: "dlg-count" });
    var dots = h("div", { class: "dlg-dots", "aria-hidden": "true" });
    panels.forEach(function () { dots.appendChild(h("span", { class: "dlg-dot" })); });
    var back = u.button("Back", { kind: "ghost", icon: "◂", class: "dlg-back" });
    var next = u.button("Next", { kind: "primary", class: "dlg-next" });
    var skip = u.button(opts.skipLabel || "Skip", { kind: "link", class: "dlg-skip" });
    var speaker = h("div", { class: "dlg-speaker" }, portrait, h("div", { class: "dlg-who" }, nameEl, roleEl));
    var card = h("div", { class: "dlg-card" }, speaker, h("div", { class: "dlg-bubble" }, textEl));
    var el = h("section", { class: "dialogue", "aria-label": opts.title || "Story" },
      h("header", { class: "dlg-top" },
        opts.title ? h("h2", { class: "dlg-title" }, opts.title) : h("span"),
        panels.length > 1 || opts.alwaysSkip ? skip : null),
      card,
      live,
      h("footer", { class: "dlg-nav" }, back, h("div", { class: "dlg-progress" }, dots, counter), next));

    function finish(reason) {
      if (finished) return;
      finished = true;
      if (opts.onDone) opts.onDone(reason);
    }

    function show(i, silent) {
      index = i;
      var p = panels[i];
      var who = speakerInfo(p.speaker);
      el.setAttribute("data-speaker", who.key);
      portrait.textContent = p.icon || who.icon;
      nameEl.textContent = p.name !== undefined ? p.name : who.name;
      roleEl.textContent = p.name !== undefined ? (p.role || "") : (who.key === "narrator" ? "" : who.role);
      nameEl.hidden = !nameEl.textContent;
      roleEl.hidden = !roleEl.textContent;
      u.clear(textEl);
      textEl.appendChild(UI.rich.render(p.text));
      live.textContent = (nameEl.textContent ? nameEl.textContent + ": " : "") + UI.rich.plainText(p.text);
      counter.textContent = panels.length > 1 ? (i + 1) + " of " + panels.length : "";
      Array.prototype.forEach.call(dots.childNodes, function (d, j) {
        d.classList.toggle("on", j === i);
        d.classList.toggle("seen", j < i);
      });
      dots.hidden = panels.length < 2;
      back.disabled = i === 0;
      back.hidden = panels.length < 2;
      var label = next.querySelector(".btn-label");
      label.textContent = i === panels.length - 1 ? (opts.finishLabel || "Continue") : "Next";
      card.classList.remove("dlg-enter");
      void card.offsetWidth;
      card.classList.add("dlg-enter");
      if (!silent) UI.sound.play("page");
    }

    next.addEventListener("click", function () {
      if (index < panels.length - 1) show(index + 1);
      else finish("done");
    });
    back.addEventListener("click", function () {
      if (index > 0) show(index - 1);
      if (index === 0) u.focusEl(next);
    });
    skip.addEventListener("click", function () { finish("skipped"); });
    el.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
      else if (e.key === "ArrowLeft" && index > 0) { e.preventDefault(); back.click(); }
    });
    if (panels.length) show(0, true);
    return { el: el, next: next, focus: function () { u.focusEl(next); } };
  }

  /** Play panels in a modal. Resolves "done", "skipped" or "empty". */
  function story(panels, opts) {
    opts = opts || {};
    panels = (panels || []).filter(Boolean);
    if (!panels.length) return Promise.resolve("empty");
    var outcome = "skipped";
    var m;
    var view = dialogueView(panels, Object.assign({}, opts, {
      onDone: function (reason) { outcome = reason; if (m) m.close(reason); }
    }));
    m = open({
      label: opts.title || "Story",
      className: "modal-dialogue",
      size: "lg",
      body: view.el,
      initialFocus: view.next,
      closeButton: false,
      backdropClose: false,
      sound: false
    });
    return m.result.then(function (value) { return value || outcome; });
  }

  // --------------------------------------------------------------------------
  // Printing (Progress Report, certificate)
  // --------------------------------------------------------------------------

  var printCleanupBound = false;
  /**
   * Print `node` alone (Progress Report, certificate). Resolves true when the print
   * dialog opened. A sandboxed frame without allow-modals ignores print() silently:
   * no "beforeprint" event arrives, so this resolves false and the caller offers
   * another way (download, open in its own tab).
   */
  function printNode(node, kind) {
    var root = document.getElementById("print-root");
    if (!root) return Promise.resolve(false);
    u.clear(root);
    root.className = "print-" + (kind || "report");
    root.appendChild(node);
    var html = document.documentElement;
    function exitPrintMode() { html.classList.remove("print-mode", "print-landscape"); }
    html.classList.add("print-mode");
    html.classList.toggle("print-landscape", kind === "certificate");
    if (!printCleanupBound) {
      printCleanupBound = true;
      global.addEventListener("afterprint", exitPrintMode);
    }
    var fired = false;
    function onBefore() { fired = true; }
    global.addEventListener("beforeprint", onBefore);
    try {
      global.print();
    } catch (err) {
      /* blocked: handled below */
    }
    return new Promise(function (resolve) {
      // Chrome and Firefox fire "beforeprint" during print(); give slower browsers a moment.
      setTimeout(function () {
        global.removeEventListener("beforeprint", onBefore);
        if (!fired) exitPrintMode();
        resolve(fired);
      }, fired ? 0 : 400);
    });
  }

  UI.dialogs = {
    open: open,
    closeAll: closeAll,
    isOpen: isOpen,
    confirm: confirmDialog,
    prompt: promptDialog,
    toast: toast,
    toPanels: toPanels,
    speakerInfo: speakerInfo,
    dialogueView: dialogueView,
    story: story,
    printNode: printNode
  };
})(typeof window !== "undefined" ? window : globalThis);
