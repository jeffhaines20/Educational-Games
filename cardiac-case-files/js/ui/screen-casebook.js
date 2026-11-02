/*
 * The Cardiac Case Files — the Casebook (CCF.UI.screens.casebook and CCF.UI.casebook).
 *
 * The reference library: Conditions · Concepts · Drugs · Tools, searchable, with RichText
 * entries (DESIGN §6.5). It is a screen of its own and also opens as a dialog during a case
 * (CCF.UI.casebook.openDialog({ entryId })) so the case keeps its state. Hidden when
 * CCF.config.reference is false (?reference=off).
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;
  var R = function () { return UI.rich; };

  function app() { return UI.app; }

  var KINDS = [
    { id: "condition", label: "Conditions", one: "Condition" },
    { id: "concept", label: "Concepts", one: "Concept" },
    { id: "drug", label: "Drugs", one: "Drug class" },
    { id: "tool", label: "Tools", one: "Tool" }
  ];

  function entries(kind) {
    var c = u.content();
    return c ? (u.safe(function () { return c.entries(kind); }, []) || []) : [];
  }

  var searchCache = {};
  function searchText(e) {
    if (searchCache[e.id]) return searchCache[e.id];
    var parts = [e.title, (e.aka || []).join(" "), R().plainText(e.summary)];
    (e.sections || []).forEach(function (s) { parts.push(s.heading, R().plainText(s.body)); });
    var text = parts.join(" ").toLowerCase();
    searchCache[e.id] = text;
    return text;
  }

  function titleText(e) { return R().plainText(e.title).toLowerCase(); }

  function search(query) {
    var q = String(query || "").toLowerCase().trim();
    if (!q) return [];
    var terms = q.split(/\s+/).filter(Boolean);
    var scored = [];
    entries().forEach(function (e) {
      var text = searchText(e);
      if (!terms.every(function (t) { return text.indexOf(t) >= 0; })) return;
      var score = 0;
      var title = titleText(e);
      if (title.indexOf(q) === 0) score += 6;
      else if (title.indexOf(q) >= 0) score += 4;
      if ((e.aka || []).some(function (a) { return String(a).toLowerCase().indexOf(q) >= 0; })) score += 3;
      scored.push({ e: e, score: score });
    });
    scored.sort(function (a, b) { return (b.score - a.score) || titleText(a.e).localeCompare(titleText(b.e)); });
    return scored.map(function (s) { return s.e; });
  }

  function casesUsing(id) {
    return u.cases().filter(function (k) { return (k.casebook || []).indexOf(id) >= 0; });
  }

  /** The reading pane for one entry. opts: { inDialog } */
  function entryView(e, opts) {
    opts = opts || {};
    var kind = KINDS.filter(function (k) { return k.id === e.kind; })[0];
    var unit = e.unit && u.content() ? u.content().unit(e.unit) : null;
    var related = casesUsing(e.id);
    var titleId = u.uid("entry");
    return h("article", { class: "cb-entry", "aria-labelledby": titleId, dataset: { entry: e.id } },
      h("p", { class: "cb-kind" }, kind ? kind.one : "Entry", unit ? " · " + unit.title : ""),
      h("h2", { class: "cb-title", id: titleId, tabindex: "-1" }, R().inline(e.title)),
      e.aka && e.aka.length ? h("p", { class: "cb-aka" }, h("span", { class: "cb-aka-label" }, "Also: "), e.aka.map(function (a) { return R().plainInline(a); }).join(" · ")) : null,
      R().block(e.summary, "cb-summary"),
      (e.sections || []).map(function (s) {
        return h("section", { class: "cb-section" }, h("h3", null, R().inline(s.heading)), R().block(s.body));
      }),
      e.sources && e.sources.length ? h("p", { class: "cb-sources" }, h("strong", null, "Lecture sources: "), e.sources.map(function (s) { return R().plainInline(s); }).join(" · ")) : null,
      related.length ? h("div", { class: "cb-related" },
        h("p", { class: "cb-related-title" }, "Cases about this"),
        h("ul", null, related.map(function (k) {
          var label = u.caseNumber(k) + " " + k.title;
          if (opts.inDialog || !u.isUnlocked(k)) return h("li", null, h("span", { class: "chip chip-static" }, label, !u.isUnlocked(k) ? " (locked)" : ""));
          return h("li", null, u.button(label, { kind: "chip", icon: "folder", onClick: function () { app().go("case", { id: k.id }); } }));
        }))) : null);
  }

  /**
   * The Casebook browser. opts: { entryId, inDialog, onClose }.
   * Returns { el, show(id), focus() }.
   */
  function view(opts) {
    opts = opts || {};
    var kind = "condition";
    var query = "";
    var selected = null;
    var first = opts.entryId ? u.entry(opts.entryId) : null;
    if (first) { kind = first.kind; selected = first.id; }
    else {
      var nonEmpty = KINDS.filter(function (k) { return entries(k.id).length; })[0];
      if (nonEmpty) kind = nonEmpty.id;
    }

    var tabButtons = {};
    var tablist = h("div", { class: "cb-tabs", role: "tablist", "aria-label": "Casebook sections" });
    KINDS.forEach(function (k) {
      var btn = h("button", { type: "button", role: "tab", class: "cb-tab", "aria-selected": "false", tabindex: "-1", dataset: { kind: k.id } },
        h("span", null, k.label), h("span", { class: "cb-count" }, String(entries(k.id).length)));
      btn.addEventListener("click", function () { setKind(k.id); });
      btn.addEventListener("keydown", function (e) {
        var idx = KINDS.map(function (x) { return x.id; }).indexOf(k.id);
        var to = null;
        if (e.key === "ArrowRight") to = (idx + 1) % KINDS.length;
        else if (e.key === "ArrowLeft") to = (idx - 1 + KINDS.length) % KINDS.length;
        if (to === null) return;
        e.preventDefault();
        setKind(KINDS[to].id);
        u.focusEl(tabButtons[KINDS[to].id]);
      });
      tabButtons[k.id] = btn;
      tablist.appendChild(btn);
    });

    var searchId = u.uid("cb-search");
    var input = h("input", { type: "search", id: searchId, class: "input cb-search", placeholder: "Search: a drug, a sign, a test…", autocomplete: "off", spellcheck: "false" });
    var status = h("p", { class: "cb-status", role: "status", "aria-live": "polite" });
    var listEl = h("ul", { class: "cb-list" });
    var listWrap = h("nav", { class: "cb-list-wrap", "aria-label": "Casebook entries" }, status, listEl);
    var pane = h("div", { class: "cb-pane", tabindex: "-1" });
    var backBtn = u.button("All entries", { kind: "ghost", size: "sm", icon: "back", class: "cb-back", onClick: function () { root.classList.remove("show-entry"); var b = listEl.querySelector('[aria-current="true"]') || listEl.querySelector("button"); if (b) u.focusEl(b); } });
    var root = h("div", { class: "casebook" + (opts.inDialog ? " in-dialog" : "") },
      h("div", { class: "cb-controls" },
        tablist,
        h("div", { class: "cb-search-wrap" },
          h("label", { class: "sr-only", for: searchId }, "Search the Casebook"),
          h("span", { class: "cb-search-icon", "aria-hidden": "true" }, u.icon("search")),
          input)),
      h("div", { class: "cb-body" }, listWrap, h("div", { class: "cb-pane-wrap" }, backBtn, pane)));

    var timer = null;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { query = input.value; renderList(); }, 120);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && input.value) { e.preventDefault(); e.stopPropagation(); input.value = ""; query = ""; renderList(); }
    });

    function setKind(k) {
      kind = k;
      if (query) { query = ""; input.value = ""; }
      renderList();
      var list = entries(kind);
      if (list.length && (!selected || !list.some(function (e) { return e.id === selected; }))) show(list[0].id, { quiet: true, keepList: true });
    }

    function renderList() {
      var searching = !!String(query).trim();
      var list = searching ? search(query) : entries(kind);
      KINDS.forEach(function (k) {
        var on = !searching && k.id === kind;
        tabButtons[k.id].setAttribute("aria-selected", on ? "true" : "false");
        tabButtons[k.id].setAttribute("tabindex", on || (searching && k.id === kind) ? "0" : "-1");
        tabButtons[k.id].classList.toggle("is-active", on);
      });
      u.clear(listEl);
      if (searching) status.textContent = list.length ? u.plural(list.length, "entry", "entries") + " match “" + query.trim() + "”." : "Nothing matches “" + query.trim() + "”. Try another word.";
      else status.textContent = list.length ? "" : "No " + (KINDS.filter(function (k) { return k.id === kind; })[0] || {}).label.toLowerCase() + " in the Casebook yet.";
      list.forEach(function (e) {
        var kindInfo = KINDS.filter(function (k) { return k.id === e.kind; })[0];
        var btn = h("button", { type: "button", class: "cb-item", "aria-current": e.id === selected ? "true" : null, dataset: { entry: e.id } },
          h("span", { class: "cb-item-title" }, R().inline(e.title)),
          searching && kindInfo ? h("span", { class: "cb-item-kind" }, kindInfo.one) : null);
        btn.addEventListener("click", function () { show(e.id); });
        listEl.appendChild(h("li", null, btn));
      });
    }

    function show(id, o) {
      o = o || {};
      var e = u.entry(id);
      if (!e) return;
      selected = id;
      u.clear(pane);
      pane.appendChild(entryView(e, { inDialog: opts.inDialog }));
      pane.scrollTop = 0;
      Array.prototype.forEach.call(listEl.querySelectorAll(".cb-item"), function (b) {
        if (b.getAttribute("data-entry") === id) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      });
      if (!o.keepList) root.classList.add("show-entry");
      if (!o.quiet) {
        UI.sound.play("page");
        var title = pane.querySelector(".cb-title");
        if (title) u.focusEl(title, { preventScroll: true });
        if (!opts.inDialog) u.safe(function () { if (root.getBoundingClientRect().top < 0) u.scrollIntoView(root, "start"); });
      }
    }

    renderList();
    if (selected) show(selected, { quiet: true });
    else {
      var l = entries(kind);
      if (l.length) show(l[0].id, { quiet: true, keepList: true });
    }
    return { el: root, show: show, input: input, focus: function () { u.focusEl(selected && opts.entryId ? pane.querySelector(".cb-title") : input, { preventScroll: true }); } };
  }

  /** The Casebook as a dialog (used during a case; the case keeps its state underneath). */
  function openDialog(opts) {
    opts = opts || {};
    if (!u.referenceOn()) return null;
    var v = view({ entryId: opts.entryId, inDialog: true });
    var m = UI.dialogs.open({
      title: "Casebook", icon: "casebook", size: "xl", className: "modal-casebook", body: v.el,
      initialFocus: opts.entryId ? v.el.querySelector(".cb-title") : v.input, focusInput: false
    });
    return m;
  }

  UI.screens.casebook = function (params) {
    params = params || {};
    var v = view({ entryId: params.entryId });
    var el = h("section", { class: "casebook-screen" },
      h("header", { class: "page-head" },
        h("p", { class: "page-kicker" }, "Reference library"),
        h("h1", { class: "page-title" }, "Casebook"),
        h("p", { class: "page-sub" }, "Your lecture notes on every condition, concept, drug class and tool — also available inside every case.")),
      v.el);
    return { el: el, title: "Casebook", focus: el.querySelector("h1") };
  };

  UI.casebook = { view: view, openDialog: openDialog, entryView: entryView, search: search, KINDS: KINDS };
})(typeof window !== "undefined" ? window : globalThis);
