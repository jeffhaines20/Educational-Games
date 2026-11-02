/*
 * The Cardiac Case Files — built-in drawings (CCF.UI.diagrams). Format: docs/DESIGN.md §6.4.
 *
 *   CCF.UI.diagrams.render({ name: "auscultation", labels: "numbers" | "names" }) → <figure>
 *   CCF.UI.diagrams.describe(name, labels) → the text alternative
 *
 * "auscultation": the front of a chest — clavicles, sternum, ribs and the intercostal
 * spaces (ICS) — with the five listening areas, numbered (default) or named:
 *   1 aortic       2nd ICS, right sternal border
 *   2 pulmonic     2nd ICS, left sternal border
 *   3 Erb's point  3rd ICS, left sternal border
 *   4 tricuspid    4th ICS, left sternal border
 *   5 mitral       5th ICS, left midclavicular line (the apex)
 * Right and left are the PATIENT's: the patient faces you, so their left is on your right.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});
  var u = UI.util;
  var s = u.svg;
  var h = u.h;

  var W = 420, MID = 210;
  // Rib levels where the costal cartilage meets the sternum (y), rib 1 … 7.
  var RIBS = [86, 122, 158, 192, 226, 258, 288];
  var STERNUM_HALF = 15;     // half-width of the sternal body: the sternal borders
  var DROP = 34;             // how far a rib falls between the sternum and the side of the chest
  var MCL = 276;             // the patient's left midclavicular line (x)

  /** A point on a rib-shaped curve starting at the sternal border (side: +1 patient's left, -1 right). */
  function curvePoint(y0, t, side) {
    var x0 = MID + side * STERNUM_HALF, xc = MID + side * 90, x1 = MID + side * 150;
    var yc = y0 - 6, y1 = y0 + DROP;
    var a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    return { x: a * x0 + b * xc + c * x1, y: a * y0 + b * yc + c * y1 };
  }

  /** y on the curve at a given x (solved numerically; the curve is monotonic in x). */
  function curveYAt(y0, x, side) {
    var lo = 0, hi = 1;
    for (var i = 0; i < 30; i++) {
      var mid = (lo + hi) / 2;
      var p = curvePoint(y0, mid, side);
      if ((p.x - x) * side < 0) lo = mid; else hi = mid;
    }
    return curvePoint(y0, (lo + hi) / 2, side).y;
  }

  function curvePath(y0, side) {
    var x0 = MID + side * STERNUM_HALF, xc = MID + side * 90, x1 = MID + side * 150;
    return "M" + x0 + " " + y0 + " Q" + xc + " " + (y0 - 6) + " " + x1 + " " + (y0 + DROP);
  }

  function icsY(n) { return (RIBS[n - 1] + RIBS[n]) / 2; }   // the n-th intercostal space at the sternum

  var BORDER_X = 13;   // a listening point sits just beside the sternal border
  var AREAS = [
    { n: 1, name: "Aortic", where: "2nd intercostal space, right sternal border", ics: 2, side: -1, x: MID - STERNUM_HALF - BORDER_X, labelSide: -1 },
    { n: 2, name: "Pulmonic", where: "2nd intercostal space, left sternal border", ics: 2, side: 1, x: MID + STERNUM_HALF + BORDER_X, labelSide: 1 },
    { n: 3, name: "Erb's point", where: "3rd intercostal space, left sternal border", ics: 3, side: 1, x: MID + STERNUM_HALF + BORDER_X, labelSide: 1 },
    { n: 4, name: "Tricuspid", where: "4th intercostal space, left sternal border", ics: 4, side: 1, x: MID + STERNUM_HALF + BORDER_X, labelSide: 1 },
    { n: 5, name: "Mitral (apex)", where: "5th intercostal space, left midclavicular line", ics: 5, side: 1, x: MCL, labelSide: 1 }
  ];

  var ORDINAL = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th" };

  function describe(name, labels) {
    if (name !== "auscultation") return "A diagram.";
    var named = labels === "names";
    return "Front of the chest, facing you (the patient's left is on your right), showing the clavicles, the sternum, the ribs and the intercostal spaces. " +
      (named ? "Five listening areas are labelled: " : "Five listening points are numbered 1 to 5: ") +
      AREAS.map(function (a) { return (named ? a.name.replace(" (apex)", "") + " area" : "point " + a.n) + " at the " + a.where + (a.n === 5 ? " (near the apex of the heart)" : ""); }).join("; ") + ".";
  }

  function auscultation(opts) {
    opts = opts || {};
    var named = opts.labels === "names";
    var root = s("svg", {
      viewBox: "0 0 " + W + " 380", class: "diagram-svg diagram-auscultation", role: "img",
      "aria-label": describe("auscultation", opts.labels), focusable: "false"
    });

    // Torso outline (shoulders, sides) and neck.
    var side = "M182 18 L182 50 C150 58 112 62 84 72 C62 80 48 96 44 124 L50 250 C53 300 58 330 64 372";
    var sideR = "M238 18 L238 50 C270 58 308 62 336 72 C358 80 372 96 376 124 L370 250 C367 300 362 330 356 372";
    root.appendChild(s("path", { d: side, class: "dg-body" }));
    root.appendChild(s("path", { d: sideR, class: "dg-body" }));

    // The heart, faintly, behind the sternum: base up and to the right, apex down to the patient's left.
    root.appendChild(s("path", {
      class: "dg-heart",
      d: "M196 150 C226 132 276 146 292 192 C302 222 294 246 " + (MCL + 2) + " " + (curveYAt(icsY(5), MCL, 1) + 10) +
        " C252 262 214 252 190 238 C168 224 166 174 196 150 Z"
    }));

    // Ribs 1–7 on both sides (rib 1 mostly hidden behind the clavicle).
    var ribs = s("g", { class: "dg-ribs" });
    RIBS.forEach(function (y) {
      ribs.appendChild(s("path", { d: curvePath(y, 1) }));
      ribs.appendChild(s("path", { d: curvePath(y, -1) }));
    });
    root.appendChild(ribs);

    // Intercostal spaces 2–5: dashed guides on both sides, labelled on the patient's right.
    var guides = s("g", { class: "dg-ics" });
    [2, 3, 4, 5].forEach(function (n) {
      var y = icsY(n);
      guides.appendChild(s("path", { d: curvePath(y, 1) }));
      guides.appendChild(s("path", { d: curvePath(y, -1) }));
      var end = curvePoint(y, 0.97, -1);
      guides.appendChild(s("text", { x: end.x + 2, y: end.y - 5, class: "dg-label dg-ics-label" }, ORDINAL[n] + " ICS"));
    });
    root.appendChild(guides);

    // Sternum: manubrium, body, xiphoid.
    var st = s("g", { class: "dg-sternum" });
    st.appendChild(s("path", { d: "M188 70 Q210 78 232 70 L227 " + (RIBS[1] - 2) + " L193 " + (RIBS[1] - 2) + " Z" }));
    st.appendChild(s("path", { d: "M" + (MID - STERNUM_HALF) + " " + RIBS[1] + " L" + (MID + STERNUM_HALF) + " " + RIBS[1] + " L" + (MID + 12) + " 300 L" + (MID - 12) + " 300 Z" }));
    st.appendChild(s("path", { d: "M" + (MID - 8) + " 302 L" + (MID + 8) + " 302 L" + MID + " 322 Z" }));
    root.appendChild(st);

    // Clavicles.
    root.appendChild(s("path", { d: "M198 72 C176 64 156 80 132 70 C114 63 100 66 90 74", class: "dg-clavicle" }));
    root.appendChild(s("path", { d: "M222 72 C244 64 264 80 288 70 C306 63 320 66 330 74", class: "dg-clavicle" }));

    // Midclavicular line (patient's left).
    root.appendChild(s("line", { x1: MCL, y1: 64, x2: MCL, y2: 330, class: "dg-mcl" }));
    root.appendChild(s("text", { x: MCL + 6, y: 326, class: "dg-label dg-small" }, "Midclavicular"));
    root.appendChild(s("text", { x: MCL + 6, y: 338, class: "dg-label dg-small" }, "line"));
    root.appendChild(s("text", { x: MID, y: 340, class: "dg-label dg-small", "text-anchor": "middle" }, "Sternum"));
    root.appendChild(s("text", { x: 112, y: 58, class: "dg-label dg-small", "text-anchor": "middle" }, "Clavicle"));

    // Orientation.
    root.appendChild(s("text", { x: 14, y: 22, class: "dg-label dg-side" }, "Patient's right"));
    root.appendChild(s("text", { x: W - 14, y: 22, class: "dg-label dg-side", "text-anchor": "end" }, "Patient's left"));

    // The five areas.
    var pts = s("g", { class: "dg-points" });
    AREAS.forEach(function (a) {
      var y = a.n === 5 ? curveYAt(icsY(5), MCL, 1) : curveYAt(icsY(a.ics), a.x, a.side);
      var g = s("g", { class: "dg-point", "data-area": String(a.n) });
      g.appendChild(s("circle", { cx: a.x, cy: y, r: 11.5 }));
      g.appendChild(s("text", { x: a.x, y: y + 4.6, "text-anchor": "middle", class: "dg-num" }, String(a.n)));
      if (named) {
        var lx = a.x + a.labelSide * 17;
        g.appendChild(s("text", { x: lx, y: y + 4.5, class: "dg-label dg-name", "text-anchor": a.labelSide < 0 ? "end" : "start" }, a.name));
      }
      pts.appendChild(g);
    });
    root.appendChild(pts);
    return root;
  }

  /** A diagram exhibit's figure (the drawing plus a "Describe this diagram" toggle). */
  function render(spec) {
    spec = spec || {};
    if (spec.name !== "auscultation") {
      return h("figure", { class: "diagram diagram-missing" }, h("p", null, "This drawing isn't available."));
    }
    return h("figure", { class: "diagram" }, auscultation({ labels: spec.labels }));
  }

  UI.diagrams = {
    render: render,
    describe: describe,
    auscultation: auscultation,
    AREAS: AREAS
  };
})(typeof window !== "undefined" ? window : globalThis);
