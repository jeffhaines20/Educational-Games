/*
 * The Cardiac Case Files — the case log, the printable progress report, the certificate and
 * the finale (CCF.UI.screens.log / certificate / finale).
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
  UI.screens = UI.screens || {};
  var u = UI.util;
  var h = u.h;

  function app() { return UI.app; }

  function overall(p) {
    return u.safe(function () { return CCF.Progress.overall(p); }, null) || { solved: 0, total: u.cases().length, stars: 0, maxStars: u.cases().length * 3, xp: 0, complete: false };
  }
  function rankOf(xp) {
    return u.safe(function () { return CCF.Progress.rankFor(xp); }, null) || { title: "Student Clinician", fraction: 0 };
  }
  function unitStats(p, unit) {
    var list = u.cases(unit.id);
    return u.safe(function () { return CCF.Progress.unitStats(p, unit.id); }, null) || { solved: 0, total: list.length, stars: 0, maxStars: list.length * 3, inProgress: 0 };
  }

  function statusText(rec, kase) {
    if (rec && rec.solved) return "Closed";
    if (rec && rec.current) return "In progress";
    return u.isUnlocked(kase) ? "Open" : "Locked";
  }

  // ------------------------------------------------------------------------------------
  // Printable progress report
  // ------------------------------------------------------------------------------------

  function reportNode(p) {
    var o = overall(p);
    var rank = rankOf(o.xp);
    var now = new Date();
    return h("article", { class: "report" },
      h("header", { class: "report-head" },
        h("p", { class: "report-kicker" }, u.GAME_NAME + " · progress report"),
        h("h1", null, p.name || "Player"),
        h("p", null, "Printed " + u.formatDate(now, true) + " · " + rank.title + " · " + o.xp + " XP"),
        h("p", null, h("strong", null, o.solved + " of " + o.total), " cases solved · ", h("strong", null, o.stars + " of " + o.maxStars), " stars")),
      h("table", { class: "report-table" },
        h("thead", null, h("tr", null, ["Unit", "Solved", "Stars"].map(function (t) { return h("th", { scope: "col" }, t); }))),
        h("tbody", null, u.units().map(function (unit) {
          var st = unitStats(p, unit);
          return h("tr", null, h("td", null, unit.order + ". " + unit.title), h("td", null, st.solved + " / " + st.total), h("td", null, st.stars + " / " + st.maxStars));
        }))),
      h("table", { class: "report-table" },
        h("thead", null, h("tr", null, ["Case", "Title", "Level", "Status", "Best stars", "First solved", "Plays"].map(function (t) { return h("th", { scope: "col" }, t); }))),
        h("tbody", null, u.cases().map(function (k) {
          var rec = (p.cases && p.cases[k.id]) || null;
          return h("tr", null,
            h("td", null, u.caseNumber(k)), h("td", null, k.title), h("td", null, (u.DIFFICULTY[k.difficulty] || {}).label || ""),
            h("td", null, statusText(rec, k)),
            h("td", null, rec && rec.solved ? "★".repeat(rec.bestStars || 0) + "☆".repeat(3 - (rec.bestStars || 0)) : "—"),
            h("td", null, rec && rec.firstSolvedAt ? u.formatDate(rec.firstSolvedAt) : "—"),
            h("td", null, rec && rec.plays ? String(rec.plays) : "—"));
        }))),
      h("p", { class: "report-foot" }, u.DISCLAIMER));
  }

  function reportText(p) {
    var o = overall(p);
    var rank = rankOf(o.xp);
    var lines = [u.GAME_NAME + " — progress report", "Name: " + (p.name || "Player"), "Printed: " + u.formatDate(new Date(), true),
      "Rank: " + rank.title + " (" + o.xp + " XP)", "Cases solved: " + o.solved + " of " + o.total, "Stars: " + o.stars + " of " + o.maxStars, ""];
    u.cases().forEach(function (k) {
      var rec = (p.cases && p.cases[k.id]) || null;
      lines.push(u.caseNumber(k) + "  " + k.title + "  [" + ((u.DIFFICULTY[k.difficulty] || {}).label || "") + "]  " + statusText(rec, k) +
        (rec && rec.solved ? "  " + (rec.bestStars || 0) + "/3 stars" : "") + (rec && rec.firstSolvedAt ? "  solved " + u.formatDate(rec.firstSolvedAt) : ""));
    });
    lines.push("", u.DISCLAIMER);
    return lines.join("\n");
  }

  function printReport() {
    var p = u.profile();
    if (!p) return;
    UI.dialogs.printNode(reportNode(p), "report").then(function (opened) {
      if (opened) return;
      UI.dialogs.open({
        title: "Printing is blocked here", icon: "print", size: "sm",
        body: h("p", null, "This page can't open the print dialog (course pages sometimes block it). Download the report as a text file instead?"),
        actions: [{ label: "Cancel", kind: "ghost" }, {
          label: "Download report", kind: "primary", icon: "print",
          onClick: function () { u.downloadText("cardiac-case-files-report.txt", reportText(p)); }
        }]
      });
    });
  }

  // ------------------------------------------------------------------------------------
  // Case log
  // ------------------------------------------------------------------------------------

  UI.screens.log = function () {
    var root = h("section", { class: "log-screen" });
    function render() {
      u.clear(root);
      var p = u.profile();
      if (!p) return;
      var o = overall(p);
      var rank = rankOf(o.xp);
      root.appendChild(h("header", { class: "page-head" },
        h("p", { class: "page-kicker" }, p.name || "Player"),
        h("h1", { class: "page-title" }, "Case log"),
        h("p", { class: "page-sub" }, "Every case file, your best result and when you closed it.")));
      root.appendChild(h("div", { class: "log-summary paper-card" },
        h("dl", { class: "log-stats" },
          h("div", null, h("dt", null, "Rank"), h("dd", null, rank.title)),
          h("div", null, h("dt", null, "Experience"), h("dd", null, o.xp + " XP")),
          h("div", null, h("dt", null, "Cases closed"), h("dd", null, o.solved + " of " + o.total)),
          h("div", null, h("dt", null, "Stars"), h("dd", null, o.stars + " of " + o.maxStars))),
        h("div", { class: "button-row" },
          u.button("Print progress report", { kind: "primary", icon: "print", class: "print-report", onClick: printReport }),
          u.button(o.complete ? "Your certificate" : "Certificate", { kind: o.complete ? "secondary" : "ghost", icon: "certificate", class: "open-certificate", onClick: function () { app().go("certificate"); } }))));

      u.units().forEach(function (unit) {
        var list = u.cases(unit.id);
        var st = unitStats(p, unit);
        var sec = h("section", { class: "log-unit", "aria-labelledby": "log-" + unit.id },
          h("h2", { class: "log-unit-title", id: "log-" + unit.id },
            h("span", { class: "log-unit-icon", "aria-hidden": "true" }, u.icon(CCF.Icons ? CCF.Icons.unit(unit.id, unit.icon) : unit.icon)),
            h("span", null, unit.order + " · " + unit.title),
            h("span", { class: "log-unit-total" }, st.solved + "/" + st.total + " closed · ★ " + st.stars + "/" + st.maxStars)));
        if (!list.length) {
          sec.appendChild(h("p", { class: "muted" }, "No case files in this drawer yet."));
        } else {
          var head = ["Case", "Title", "Level", "Status", "Stars", "First solved", "Last played", "Plays"];
          sec.appendChild(h("div", { class: "table-wrap log-wrap" }, h("table", { class: "log-table" },
            h("caption", { class: "sr-only" }, unit.title),
            h("thead", null, h("tr", null, head.map(function (t) { return h("th", { scope: "col" }, t); }))),
            h("tbody", null, list.map(function (k) {
              var rec = (p.cases && p.cases[k.id]) || null;
              var unlocked = u.isUnlocked(k);
              var title = unlocked ? h("button", { type: "button", class: "link-btn", on: { click: function () { app().go("case", { id: k.id }); } } }, k.title) : k.title;
              return h("tr", { class: rec && rec.solved ? "is-solved" : "" },
                h("td", { "data-label": "Case" }, u.caseNumber(k)),
                h("th", { scope: "row", "data-label": "Title" }, title),
                h("td", { "data-label": "Level" }, (u.DIFFICULTY[k.difficulty] || {}).label || ""),
                h("td", { "data-label": "Status" }, statusText(rec, k)),
                h("td", { "data-label": "Stars" }, rec && rec.solved ? u.stars(rec.bestStars || 0, 3, "sm") : "—"),
                h("td", { "data-label": "First solved" }, rec && rec.firstSolvedAt ? u.formatDate(rec.firstSolvedAt) : "—"),
                h("td", { "data-label": "Last played" }, rec && rec.lastPlayedAt ? u.formatDate(rec.lastPlayedAt) : "—"),
                h("td", { "data-label": "Plays" }, rec && rec.plays ? String(rec.plays) : "—"));
            })))));
        }
        root.appendChild(sec);
      });

      var p2 = u.profile();
      var drills = (p2 && p2.drills) || {};
      var names = { rhythm: "Name that rhythm", pressure: "Stage the pressure", abi: "Calculate the ABI", edema: "Grade the edema" };
      root.appendChild(h("section", { class: "log-unit" },
        h("h2", { class: "log-unit-title" }, h("span", { class: "log-unit-icon", "aria-hidden": "true" }, u.icon("rounds")), h("span", null, "Rapid Rounds")),
        h("ul", { class: "log-drills" }, Object.keys(names).map(function (id) {
          var d = drills[id] || {};
          return h("li", null, h("span", null, names[id]), h("strong", null, "Best streak " + (d.best || 0)));
        }))));
    }
    render();
    return { el: root, title: "Case log", refresh: render };
  };

  // ------------------------------------------------------------------------------------
  // Certificate
  // ------------------------------------------------------------------------------------

  function certificateNode(p) {
    var o = overall(p);
    var rank = rankOf(o.xp);
    var okafor = u.character("okafor");
    return h("article", { class: "certificate", "aria-label": "Certificate" },
      h("div", { class: "cert-border" },
        h("p", { class: "cert-kicker" }, u.CENTER),
        h("h2", { class: "cert-title" }, "Certificate of Completion"),
        h("p", { class: "cert-line" }, "This certifies that"),
        h("p", { class: "cert-name" }, p.name || "Player"),
        h("p", { class: "cert-line" }, "has worked and closed all " + o.total + " case files of"),
        h("p", { class: "cert-game" }, u.GAME_NAME),
        h("p", { class: "cert-line" }, "— a case-based study of cardiovascular pathology for physical therapist assistants —"),
        h("div", { class: "cert-facts" },
          h("p", null, h("span", null, "Rank"), h("strong", null, rank.title)),
          h("p", null, h("span", null, "Stars"), h("strong", null, o.stars + " of " + o.maxStars)),
          h("p", null, h("span", null, "Date"), h("strong", null, u.formatDate(new Date())))),
        h("div", { class: "cert-sign" },
          h("p", { class: "cert-signature" }, "Maya Okafor"),
          h("p", { class: "cert-signer" }, (okafor.name || "Dr. Maya Okafor, PT, DPT") + " · Clinical instructor")),
        h("div", { class: "stamp stamp-closed cert-stamp", "aria-hidden": "true" }, "All cases closed"),
        h("p", { class: "cert-foot" }, u.DISCLAIMER)));
  }

  UI.screens.certificate = function () {
    var p = u.profile();
    var o = overall(p);
    var el;
    if (!o.complete) {
      el = h("section", { class: "certificate-screen narrow-page" },
        h("header", { class: "page-head" },
          h("p", { class: "page-kicker" }, "Certificate"),
          h("h1", { class: "page-title" }, "Close every case file first"),
          h("p", { class: "page-sub" }, "Your certificate is ready once all " + o.total + " cases are solved. You've closed " + o.solved + ".")),
        h("div", { class: "paper-card cert-progress" },
          u.progressBar(o.total ? o.solved / o.total : 0, o.solved + " of " + o.total + " cases closed"),
          h("p", null, o.solved + " of " + o.total + " cases closed"),
          u.button("Back to the case board", { kind: "primary", icon: "board", onClick: function () { app().go("board"); } })));
      return { el: el, title: "Certificate" };
    }
    var cert = certificateNode(p);
    el = h("section", { class: "certificate-screen" },
      h("header", { class: "page-head" },
        h("p", { class: "page-kicker" }, "Every file closed"),
        h("h1", { class: "page-title" }, "Your certificate"),
        h("p", { class: "page-sub" }, "Print it, or save it as a PDF from the print dialog.")),
      h("div", { class: "cert-wrap" }, cert),
      h("div", { class: "button-row" },
        u.button("Print certificate", {
          kind: "primary", icon: "print", class: "print-certificate", onClick: function () {
            UI.dialogs.printNode(certificateNode(p), "certificate").then(function (opened) {
              if (!opened) UI.dialogs.toast("Printing is blocked on this page. Open the game in its own browser tab to print.", { kind: "warn", timeout: 6000 });
            });
          }
        }),
        app().story("finale") ? u.button("Replay the finale", { kind: "ghost", icon: "mentor", onClick: function () { app().go("finale"); } }) : null,
        u.button("Back to the case board", { kind: "ghost", icon: "board", onClick: function () { app().go("board"); } })));
    return { el: el, title: "Certificate" };
  };

  // ------------------------------------------------------------------------------------
  // Finale (story.finale)
  // ------------------------------------------------------------------------------------

  UI.screens.finale = function () {
    var panels = app().story("finale") || [];
    function done() {
      app().markSeen("finale");
      app().go("certificate");
    }
    if (!panels.length) { setTimeout(done, 0); return { el: h("section"), title: "" }; }
    UI.sound.play("rankup");
    var view = UI.dialogs.dialogueView(panels, { title: "Every case closed", finishLabel: "See my certificate", skipLabel: "Skip to the certificate", onDone: done });
    var el = h("section", { class: "story-screen is-finale" }, h("div", { class: "story-desk" }, view.el));
    return { el: el, title: "Every case closed", hideTopbar: true, focus: view.next };
  };

  UI.log = { reportNode: reportNode, reportText: reportText, printReport: printReport, certificateNode: certificateNode };
})(typeof window !== "undefined" ? window : globalThis);
