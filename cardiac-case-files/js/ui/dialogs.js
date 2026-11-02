/*
 * The Cardiac Case Files — dialogs (CCF.UI.dialogs).
 *
 *   open({ title, icon, body, actions, size, className, dismissable, initialFocus, onClose }) → { el, body, close(value), result }
 *   confirm({ title, message, confirmLabel, danger }) → Promise<boolean>
 *   prompt({ title, label, value, validate, clean }) → Promise<string|null>
 *   toast(message, { icon, kind, timeout })
 *   dialogueView(panels, opts) → { el, focus() }     the mentor's dialogue (intro, finale)
 *   printNode(node, kind) → Promise<boolean>
 *
 * Modals trap focus, close on Esc (when dismissable), make the rest of the page inert and
 * return focus to whatever opened them.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
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
        opts.icon ? h("span", { class: "modal-icon", "aria-hidden": "true" }, u.icon(opts.icon)) : null,
        h("h2", { class: "modal-title", id: titleId }, opts.title)));
    }
    var body = h("div", { class: "modal-body" });
    var footer = h("div", { class: "modal-actions" });
    dialog.appendChild(body);
    dialog.appendChild(footer);
    if (dismissable && opts.closeButton !== false) {
      dialog.appendChild(h("button", {
        type: "button", class: "modal-close", "aria-label": opts.closeLabel || "Close",
        on: { click: function () { close(undefined); } }
      }, h("span", { "aria-hidden": "true" }, "✕")));
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
      else setTimeout(function () { u.remove(overlay); }, 160);
      updateInert();
      var target = opts.returnFocus || opener;
      if (target && target !== document.body && document.documentElement.contains(target) && !target.closest("[inert]")) {
        u.focusEl(target, { preventScroll: true });
      } else if (stack.length) {
        u.focusEl(stack[stack.length - 1].el);
      }
      if (opts.onClose) u.safe(function () { opts.onClose(value); });
      resolveResult(value);
    }

    var content = typeof opts.body === "function" ? opts.body(api) : opts.body;
    u.append(body, content);
    setActions(opts.actions);
    modalRoot().appendChild(overlay);
    stack.push(api);
    updateInert();

    var initial = typeof opts.initialFocus === "string" ? dialog.querySelector(opts.initialFocus) : opts.initialFocus;
    if (!initial) {
      initial = dialog.querySelector("[data-autofocus]") ||
        (opts.focusInput !== false ? body.querySelector("input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]), textarea:not([readonly])") : null) ||
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
    var helpId = u.uid("prompt-help");
    var input = h(opts.multiline ? "textarea" : "input", {
      class: "input" + (opts.multiline ? " code-box" : ""), id: inputId, type: opts.multiline ? null : "text",
      maxlength: opts.multiline ? null : String(opts.maxLength || 30), rows: opts.multiline ? "4" : null,
      autocomplete: "off", spellcheck: "false", placeholder: opts.placeholder || null,
      "aria-describedby": (opts.help ? helpId + " " : "") + errorId
    });
    input.value = opts.value || "";
    var error = h("p", { class: "field-error", id: errorId, role: "alert" });
    var body = h("div", { class: "prompt-body" },
      opts.intro ? h("div", { class: "prompt-intro" }, typeof opts.intro === "string" ? h("p", null, opts.intro) : opts.intro) : null,
      h("label", { class: "field-label", for: inputId }, opts.label || "Name"),
      input,
      opts.help ? h("p", { class: "field-help", id: helpId }, opts.help) : null,
      opts.extra || null,
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
      title: opts.title, icon: opts.icon, size: opts.size || "sm", className: "modal-prompt " + (opts.className || ""), body: body,
      dismissable: opts.dismissable !== false, initialFocus: input, actions: actions
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !opts.multiline) { e.preventDefault(); submit(); }
    });
    input.addEventListener("input", function () { error.textContent = ""; input.removeAttribute("aria-invalid"); });
    if (opts.selectAll) u.safe(function () { input.select(); });
    return m.result.then(function (value) { return value && typeof value === "object" ? value.value : null; });
  }

  function toast(message, opts) {
    opts = opts || {};
    var root = document.getElementById("toast-root");
    if (!root) return;
    var iconKey = opts.icon || (opts.kind === "ok" ? "correct" : opts.kind === "warn" ? "warning" : null);
    var el = h("div", { class: "toast toast-" + (opts.kind || "info") },
      iconKey ? h("span", { class: "toast-icon", "aria-hidden": "true" }, u.icon(iconKey)) : null,
      h("span", { class: "toast-text" }, message));
    root.appendChild(el);
    while (root.childNodes.length > 3) u.remove(root.firstChild);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { u.remove(el); }, 350);
    }, opts.timeout || 4200);
  }

  // ------------------------------------------------------------------------------------
  // Dialogue with the mentor (intro, finale)
  // ------------------------------------------------------------------------------------

  function speakerInfo(key) {
    var known = key === "okafor";
    var c = u.character(key);
    return { key: known ? "okafor" : "narrator", name: known ? (c.name || "Dr. Maya Okafor, PT, DPT") : "", role: known ? (c.role || "") : "" };
  }

  /** A round portrait badge for a character. */
  function portrait(key, className) {
    var who = key === "okafor" ? "okafor" : key === "player" ? "player" : "narrator";
    var name = CCF.Icons ? CCF.Icons.character(who) : null;
    return h("span", { class: "portrait portrait-" + who + (className ? " " + className : ""), "aria-hidden": "true" }, u.icon(name));
  }

  /**
   * The dialogue component. opts: { title, finishLabel, skipLabel, onDone(reason) }.
   * Returns { el, next, focus() }.
   */
  function dialogueView(panels, opts) {
    opts = opts || {};
    var index = 0;
    var finished = false;
    var portraitBox = h("div", { class: "dlg-portrait" });
    var nameEl = h("p", { class: "dlg-name" });
    var roleEl = h("p", { class: "dlg-role" });
    var textEl = h("div", { class: "dlg-text rich" });
    var live = h("div", { class: "sr-only", "aria-live": "polite" });
    var counter = h("p", { class: "dlg-count" });
    var dots = h("div", { class: "dlg-dots", "aria-hidden": "true" });
    panels.forEach(function () { dots.appendChild(h("span", { class: "dlg-dot" })); });
    var back = u.button("Back", { kind: "ghost", class: "dlg-back" });
    var next = u.button("Next", { kind: "primary", class: "dlg-next" });
    var skip = u.button(opts.skipLabel || "Skip", { kind: "link", class: "dlg-skip" });
    var speaker = h("div", { class: "dlg-speaker" }, portraitBox, h("div", { class: "dlg-who" }, nameEl, roleEl));
    var card = h("div", { class: "dlg-card" }, speaker, h("div", { class: "dlg-bubble" }, textEl));
    var el = h("section", { class: "dialogue", "aria-label": opts.title || "Story" },
      h("header", { class: "dlg-top" },
        opts.title ? h("h1", { class: "dlg-title" }, opts.title) : h("span"),
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
      u.clear(portraitBox);
      portraitBox.appendChild(portrait(who.key));
      nameEl.textContent = who.name;
      roleEl.textContent = who.role;
      nameEl.hidden = !who.name;
      roleEl.hidden = !who.role;
      u.clear(textEl);
      textEl.appendChild(UI.rich.render(p.text));
      live.textContent = (who.name ? who.name + ": " : "") + UI.rich.plainText(p.text);
      counter.textContent = panels.length > 1 ? (i + 1) + " of " + panels.length : "";
      Array.prototype.forEach.call(dots.childNodes, function (d, j) {
        d.classList.toggle("on", j === i);
        d.classList.toggle("seen", j < i);
      });
      dots.hidden = panels.length < 2;
      back.disabled = i === 0;
      back.hidden = panels.length < 2;
      next.querySelector(".btn-label").textContent = i === panels.length - 1 ? (opts.finishLabel || "Continue") : "Next";
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

  // ------------------------------------------------------------------------------------
  // Printing (progress report, certificate)
  // ------------------------------------------------------------------------------------

  var printCleanupBound = false;
  /**
   * Print `node` alone. Resolves true when the print dialog opened. A sandboxed frame
   * without allow-modals ignores print() silently: no "beforeprint" event arrives, so this
   * resolves false and the caller offers another way (download).
   */
  function printNode(node, kind) {
    var root = document.getElementById("print-root");
    if (!root) return Promise.resolve(false);
    u.clear(root);
    root.className = "print-" + (kind || "report");
    root.appendChild(node);
    var html = document.documentElement;
    var pageStyle = document.getElementById("print-page-style");
    if (!pageStyle) {
      pageStyle = h("style", { id: "print-page-style" });
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = kind === "certificate" ? "@page { size: landscape; margin: 10mm; }" : "@page { size: auto; margin: 14mm; }";
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
    speakerInfo: speakerInfo,
    portrait: portrait,
    dialogueView: dialogueView,
    printNode: printNode
  };
})(typeof window !== "undefined" ? window : globalThis);
