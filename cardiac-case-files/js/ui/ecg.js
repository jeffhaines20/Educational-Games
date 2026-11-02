/*
 * The Cardiac Case Files — ECG rhythm strips (CCF.ECG). See docs/DESIGN.md §8.
 *
 * DOM-free (also run in Node):
 *   CCF.ECG.RHYTHMS                  [{ id, name, short, rateRange, defaultRate, description, lookalikes }]
 *   CCF.ECG.rhythm(id)               one entry of RHYTHMS (or null)
 *   CCF.ECG.normalize(spec)          the spec with every default filled in (throws on an unknown rhythm)
 *   CCF.ECG.generate(spec)           { seconds, samples: [{ t, mv }], beats: [{ t, kind, … }], pWaves: [t…], … }
 *   CCF.ECG.describe(spec)           plain-English text alternative: the features, never the diagnosis
 *   CCF.ECG.markup(spec, opts)       the <figure> as an HTML string (for tests, builds and printing)
 *   CCF.ECG.randomSpec(seed, opts)   a random, realistic spec for the "Name that rhythm" drill
 * Browser:
 *   CCF.ECG.render(spec, opts)       → <figure class="ecg"> with the <svg> strip (+ <figcaption>)
 *   CCF.ECG.injectStyles(doc)        adds the small default stylesheet (render() calls it once)
 *
 * Paper: 25 mm/s and 10 mm/mV. The SVG's user unit is 1 mm, so a small square is 1 × 1
 * (0.04 s × 0.1 mV) and a large square 5 × 5 (0.20 s × 0.5 mV); a mark every 3 seconds
 * runs along the top edge. Times in generate() are seconds from the left edge of the strip:
 * beats[i].t is the onset of the QRS complex, pWaves[i] the onset of a P wave.
 *
 * Everything is deterministic: a seeded PRNG drives all variation, so the same spec (and
 * seed) always draws the same strip. Without a seed, the seed is derived from the spec.
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});

  var MM_PER_S = 25;      // paper speed
  var MM_PER_MV = 10;     // gain
  var DT = 0.002;         // sample spacing (500 Hz)
  var VERSION = "1.0.0";

  // ------------------------------------------------------------------------------------
  // Small utilities
  // ------------------------------------------------------------------------------------

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function num(v, dflt) { return isNum(v) ? v : dflt; }
  function round(x, d) { var m = Math.pow(10, d || 0); return Math.round(x * m) / m; }
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : 0; }
  function sd(a) {
    if (a.length < 2) return 0;
    var m = mean(a), s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
    return Math.sqrt(s / (a.length - 1));
  }

  /** mulberry32: a tiny, fast, well-mixed 32-bit PRNG. Returns floats in [0, 1). */
  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /** FNV-1a hash of a string → unsigned 32-bit integer. */
  function hashString(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  /** Independent random streams per purpose, so tuning one part never reshuffles another. */
  function stream(seed, salt) { return mulberry32(hashString(seed + "|" + salt)); }
  function uni(rng, a, b) { return a + (b - a) * rng(); }

  // ------------------------------------------------------------------------------------
  // Rhythms
  // ------------------------------------------------------------------------------------

  // rateRange matches CCF.content.RULES.rhythms (js/content/registry.js); tools/test_ecg.js checks it.
  var RHYTHMS = [
    { id: "nsr", name: "Normal sinus rhythm", short: "Normal sinus", rateRange: [60, 100], defaultRate: 75,
      description: "Regular, 60–100 per minute. An upright P wave before every QRS, a constant PR interval of 0.12–0.20 s and narrow QRS complexes.",
      lookalikes: ["sinus-brady", "sinus-tach", "av-block-1"] },
    { id: "sinus-brady", name: "Sinus bradycardia", short: "Sinus brady", rateRange: [30, 59], defaultRate: 50,
      description: "Everything as in normal sinus rhythm — a P wave before every QRS, constant PR, narrow QRS, regular — but slower than 60 per minute.",
      lookalikes: ["nsr", "av-block-1", "av-block-3"] },
    { id: "sinus-tach", name: "Sinus tachycardia", short: "Sinus tach", rateRange: [101, 180], defaultRate: 120,
      description: "Everything as in normal sinus rhythm but faster than 100 per minute. At fast rates each P wave sits close to (or on) the T wave before it.",
      lookalikes: ["nsr", "aflutter", "afib"] },
    { id: "afib", name: "Atrial fibrillation", short: "AFib", rateRange: [50, 180], defaultRate: 110,
      description: "No recognisable P waves, a wavy, irregular (fibrillatory) baseline, and irregularly irregular RR intervals with no pattern.",
      lookalikes: ["aflutter", "pvc", "sinus-tach"] },
    { id: "aflutter", name: "Atrial flutter", short: "Atrial flutter", rateRange: [60, 160], defaultRate: 75,
      description: "Regular sawtooth flutter waves, about 300 per minute, in place of P waves; the ventricles answer every 2nd, 3rd or 4th wave.",
      lookalikes: ["afib", "sinus-tach", "av-block-2-type2"] },
    { id: "pvc", name: "Premature ventricular contractions (PVCs)", short: "PVCs", rateRange: [50, 120], defaultRate: 75,
      description: "An underlying sinus rhythm interrupted by early, wide (0.12 s or more), bizarre QRS complexes with no P wave before them, a T wave pointing the opposite way and a compensatory pause after.",
      lookalikes: ["afib", "vtach", "av-block-2-type2"] },
    { id: "av-block-1", name: "First-degree AV block", short: "1st-degree block", rateRange: [45, 100], defaultRate: 70,
      description: "Sinus rhythm with a long PR interval (more than 0.20 s) that stays the same; every P wave is followed by a QRS.",
      lookalikes: ["nsr", "av-block-2-type1", "sinus-brady"] },
    { id: "av-block-2-type1", name: "Second-degree AV block, type I (Wenckebach)", short: "2nd-degree type I", rateRange: [40, 90], defaultRate: 60,
      description: "The PR interval gets longer with each beat until one P wave is not followed by a QRS (a dropped beat); then the cycle repeats.",
      lookalikes: ["av-block-2-type2", "av-block-1", "av-block-3"] },
    { id: "av-block-2-type2", name: "Second-degree AV block, type II (Mobitz II)", short: "2nd-degree type II", rateRange: [30, 80], defaultRate: 50,
      description: "The PR interval stays the same, but now and then a P wave is not followed by a QRS (a dropped beat) without warning.",
      lookalikes: ["av-block-2-type1", "av-block-3", "av-block-1"] },
    { id: "av-block-3", name: "Third-degree (complete) heart block", short: "3rd-degree block", rateRange: [20, 50], defaultRate: 36,
      description: "P waves march through at their own regular rate, completely independent of a slow, regular escape rhythm (often with wide QRS complexes); no P wave is conducted.",
      lookalikes: ["av-block-2-type2", "sinus-brady", "av-block-2-type1"] },
    { id: "vtach", name: "Ventricular tachycardia", short: "V-tach", rateRange: [120, 250], defaultRate: 170,
      description: "Fast (usually 150–250 per minute), regular, wide and bizarre QRS complexes with no visible P waves.",
      lookalikes: ["vfib", "sinus-tach", "paced"] },
    { id: "vfib", name: "Ventricular fibrillation", short: "V-fib", rateRange: null, defaultRate: null,
      description: "Chaotic, irregular waves of changing height and shape; no recognisable P waves, QRS complexes or T waves. No effective heartbeat.",
      lookalikes: ["vtach", "afib", "pvc"] },
    { id: "paced", name: "Paced rhythm", short: "Paced", rateRange: [50, 90], defaultRate: 70,
      description: "A sharp, narrow pacing spike right before each wide QRS complex, at a regular, set rate.",
      lookalikes: ["vtach", "pvc", "av-block-3"] }
  ];
  var META = {};
  RHYTHMS.forEach(function (r) { META[r.id] = r; });

  // Hard limits the generator accepts (content may go outside the "sensible" rateRange on purpose).
  var RATE_LIMITS = {
    "nsr": [20, 220], "sinus-brady": [20, 220], "sinus-tach": [20, 220], "afib": [30, 220],
    "aflutter": [40, 175], "pvc": [35, 150], "av-block-1": [30, 150], "av-block-2-type1": [25, 110],
    "av-block-2-type2": [20, 110], "av-block-3": [15, 70], "vtach": [100, 280], "paced": [30, 150]
  };

  // ------------------------------------------------------------------------------------
  // Spec normalisation
  // ------------------------------------------------------------------------------------

  /** Default PR interval for a sinus rate: a little shorter when faster. */
  function defaultPr(rate) { return round(clamp(0.18 - (rate - 60) * 0.0004, 0.13, 0.19), 3); }

  function leadFamily(lead) {
    var l = String(lead || "II").replace(/\s+/g, "").toUpperCase();
    if (l === "AVR") return "avr";
    if (l === "V1" || l === "MCL1") return "v1";
    if (l === "V2") return "v2";
    if (l === "V3") return "v3";
    return "std";   // II and the other leads with an upright P, a qR complex and an upright T
  }

  function normalize(spec) {
    spec = spec || {};
    var meta = META[spec.rhythm];
    if (!meta) throw new Error("CCF.ECG: unknown rhythm \"" + spec.rhythm + "\"");
    var id = meta.id;
    var s = {
      rhythm: id,
      seconds: round(clamp(num(spec.seconds, 6), 2, 20), 3),
      lead: typeof spec.lead === "string" && spec.lead.trim() ? spec.lead.trim().slice(0, 12) : "II",
      rate: null,
      st: spec.st === "elevation" || spec.st === "depression" ? spec.st : null,
      stMm: 0,
      stSlope: null,
      tWave: spec.tWave === "inverted" ? "inverted" : null,
      qWave: spec.qWave === true,
      qrs: null,
      pr: null,
      pvc: null,
      conduction: null,
      atrialRate: null
    };
    if (meta.rateRange) {
      var lim = RATE_LIMITS[id];
      s.rate = round(clamp(num(spec.rate, meta.defaultRate), lim[0], lim[1]), 2);
    }
    if (s.st) {
      s.stMm = round(clamp(num(spec.stMm, 2), 0.5, 5), 2);
      if (s.st === "depression") s.stSlope = ["downsloping", "horizontal", "upsloping"].indexOf(spec.stSlope) >= 0 ? spec.stSlope : "horizontal";
    }
    // QRS width: narrow for supraventricular beats unless the spec widens it; the escape
    // rhythm of complete heart block is wide (ventricular) unless a narrow width is given.
    var dfltQrs = id === "av-block-3" ? 0.14 : 0.08;
    s.qrs = round(clamp(num(spec.qrs, dfltQrs), 0.06, 0.24), 3);
    if (id === "av-block-1") s.pr = round(clamp(num(spec.pr, 0.28), 0.21, 0.44), 3);
    else if (id === "av-block-2-type1") s.pr = round(clamp(num(spec.pr, 0.18), 0.12, 0.30), 3);
    else if (id === "av-block-2-type2") s.pr = round(clamp(num(spec.pr, 0.18), 0.12, 0.30), 3);
    else if (id === "paced") s.pr = round(clamp(num(spec.pr, 0.16), 0.10, 0.30), 3);   // P → spike (AV delay)
    else if (s.rate) s.pr = round(clamp(num(spec.pr, defaultPr(s.rate)), 0.10, 0.44), 3);
    if (id === "pvc") {
      var p = spec.pvc && typeof spec.pvc === "object" ? spec.pvc : {};
      var pattern = ["isolated", "bigeminy", "couplets", "multifocal"].indexOf(p.pattern) >= 0 ? p.pattern : "isolated";
      var count = isNum(p.count) && p.count >= 1 ? Math.floor(p.count) : null;
      s.pvc = { pattern: pattern, count: count };
    }
    if (id === "aflutter") {
      s.conduction = [2, 3, 4, "variable"].indexOf(spec.conduction) >= 0 ? spec.conduction : null;
      var atr = isNum(spec.atrialRate) ? clamp(spec.atrialRate, 200, 350) : null;
      var given = isNum(spec.rate);
      if (s.conduction === "variable") {
        s.atrialRate = atr || 300;
        s.rate = given ? round(clamp(s.rate, s.atrialRate / 4.2, s.atrialRate / 2), 2) : round(s.atrialRate / 3, 2);
      } else {
        if (!s.conduction) {   // pick the ratio that best matches the requested ventricular rate
          var want = given ? s.rate : 75;
          s.conduction = [2, 3, 4].reduce(function (best, k) {
            return Math.abs((atr || 300) / k - want) < Math.abs((atr || 300) / best - want) ? k : best;
          }, 4);
        }
        s.atrialRate = atr || (given ? clamp(s.rate * s.conduction, 240, 340) : 300);
        s.rate = round(s.atrialRate / s.conduction, 2);
      }
      s.atrialRate = round(s.atrialRate, 2);
    }
    if (id === "av-block-3") s.atrialRate = round(clamp(num(spec.atrialRate, 80), 40, 150), 2);
    if (spec.seed !== undefined && isNum(spec.seed)) s.seed = Math.floor(spec.seed);
    else s.seed = hashString(JSON.stringify(s)) % 2147483647;
    return s;
  }

  // ------------------------------------------------------------------------------------
  // Waveform building blocks (times in seconds, amplitudes in mV)
  // ------------------------------------------------------------------------------------

  /** Per-strip "patient": amplitudes and small differences that make each strip individual. */
  function personality(s, rng) {
    var fam = leadFamily(s.lead);
    return {
      family: fam === "avr" ? "std" : fam,
      sign: fam === "avr" ? -1 : 1,          // aVR sees everything upside down
      r: uni(rng, 1.15, 1.45),
      sDepth: uni(rng, 0.16, 0.26),
      q: uni(rng, 0.06, 0.11),
      p: uni(rng, 0.13, 0.19),
      pDur: uni(rng, 0.085, 0.100),
      t: uni(rng, 0.26, 0.36),
      resp: uni(rng, 0, 2 * Math.PI),
      respPeriod: uni(rng, 3.6, 5.0),
      pvcShape: rng() < 0.6 ? "A" : "B",
      flutterAmp: uni(rng, 0.9, 1.15)
    };
  }

  function scaleKnots(body, width, endValue) {
    return body.map(function (p, i) { return [p[0] * width, i === body.length - 1 ? endValue : p[1]]; });
  }

  /**
   * A supraventricular beat (sinus, conducted flutter/fibrillation, junctional): QRS knots
   * (piecewise linear, relative to the QRS onset) plus its ST segment and T wave.
   * rr = the RR interval before this beat (it sets the QT); amp = beat-to-beat variation.
   */
  function svMorph(s, P, rr, amp) {
    var fam = P.family, w = s.qrs, wide = w >= 0.12;
    var right = fam === "v1" || fam === "v2" || fam === "v3";
    var A = s.st ? s.stMm * 0.1 : 0;
    var elev = s.st === "elevation", dep = s.st === "depression";
    var mode = elev ? "elevation" : dep ? s.stSlope : "none";
    var J = elev ? A : dep ? (s.stSlope === "downsloping" ? -0.45 * A : -A) : 0;
    if (wide && !s.st) J = right ? 0.08 : -0.05;
    var R = P.r * amp, k;
    var qd = 0.046;                                   // pathological Q: ≥ 0.04 s wide
    if (wide) {
      var body = right
        ? [[0, 0], [0.1, 0.12], [0.45, -1.3 * amp], [0.68, -1.1 * amp], [1, 0]]
        : [[0, 0], [0.2, 0.42 * amp], [0.38, 0.84 * amp], [0.53, 0.66 * amp], [0.73, 1.04 * amp], [0.9, 0.3], [1, 0]];
      if (s.qWave) {
        k = [[0, 0], [qd / 2, right ? -0.5 : -0.34 * amp], [qd, 0]].concat(
          scaleKnots(body, w - qd, J).slice(1).map(function (p) { return [p[0] + qd, p[1]]; }));
      } else k = scaleKnots(body, w, J);
    } else {
      var sc = w / 0.08;
      if (right) {
        var r0 = fam === "v1" ? 0.22 : fam === "v2" ? 0.42 : 0.75;
        var s0 = fam === "v1" ? 1.0 : fam === "v2" ? 1.3 : 0.95;
        k = s.qWave
          ? [[0, 0], [0.03 * sc, -0.8 * amp], [0.055 * sc, -1.05 * amp], [Math.max(0.09, w), J]]       // QS complex
          : [[0, 0], [0.024 * sc, r0 * amp], [0.052 * sc, -s0 * amp], [0.08 * sc, J]];
      } else if (s.qWave) {
        var r2 = 0.8 * R;                                                        // a smaller R after a deep Q
        k = [[0, 0], [qd / 2, -0.44 * r2], [qd, 0], [qd + 0.021 * sc, r2]];
        if (elev) k.push([qd + 0.05 * sc, J]);
        else k.push([qd + 0.039 * sc, -0.12 - (dep ? 0.4 * A : 0)], [qd + 0.054 * sc, J]);
      } else if (elev) {
        k = [[0, 0], [0.016 * sc, -P.q], [0.039 * sc, R], [0.072 * sc, J]];     // no S wave: the R slides into the raised ST
      } else {
        k = [[0, 0], [0.016 * sc, -P.q], [0.039 * sc, R], [0.060 * sc, -P.sDepth - (dep ? 0.4 * A : 0)], [0.08 * sc, J]];
      }
    }
    var qrsDur = k[k.length - 1][0];
    var f = clamp(Math.sqrt(rr / 0.8), 0.75, 1.15);
    var qt = clamp(0.40 * Math.sqrt(rr), 0.25, 0.48) + Math.max(0, qrsDur - 0.09);
    var discordant = wide && !right && s.tWave !== "inverted";
    var inverted = s.tWave === "inverted" || discordant;
    var tAmp;
    if (s.tWave === "inverted") tAmp = -0.36 * amp;
    else if (discordant) tAmp = -0.26 * amp;
    else if (right) tAmp = (wide ? 0.34 : fam === "v1" ? 0.12 : 0.38) * amp;
    else tAmp = P.t * amp * (rr < 0.45 ? 0.85 : 1);
    if (elev && tAmp > 0) tAmp += 0.6 * A;
    if (dep && s.stSlope === "downsloping" && tAmp > 0) tAmp = 0.03;
    if (dep && s.stSlope === "horizontal" && tAmp > 0) tAmp *= 0.8;
    var dR = (inverted ? 0.085 : 0.075) * f, dL = (inverted ? 0.09 : 0.11) * f;
    var tEnd = qt, tPeak = tEnd - dR, tStart = tPeak - dL;
    var minStart = qrsDur + (elev || dep ? 0.06 : 0.02) * f;
    if (tStart < minStart) { tStart = minStart; tPeak = tStart + dL; tEnd = tPeak + dR; }
    return { knots: k, qrsDur: qrsDur, j: J, st: { mode: mode, A: A }, t: { start: tStart, peak: tPeak, end: tEnd, amp: tAmp } };
  }

  // Ventricular complexes: wide, slurred, with a large T wave pointing the opposite way.
  var VSHAPES = {
    A: { knots: [[0, 0], [0.025, 0.22], [0.055, 0.92], [0.08, 1.4], [0.105, 1.28], [0.13, 0.62], [0.15, 0.1], [0.16, 0]], t: -0.52 },
    B: { knots: [[0, 0], [0.02, 0.14], [0.045, -0.3], [0.085, -1.22], [0.11, -1.34], [0.14, -0.5], [0.16, 0]], t: 0.5 },
    C: { knots: [[0, 0], [0.03, -0.42], [0.06, -0.58], [0.095, 0.72], [0.12, 0.98], [0.15, 0.32], [0.17, 0]], t: -0.42 },
    VT: { knots: [[0, 0], [0.035, 0.38], [0.07, 1.2], [0.095, 1.42], [0.12, 1.2], [0.145, 0.45], [0.165, 0]], t: -0.55 },
    PACED: { knots: [[0.008, 0], [0.03, -0.18], [0.065, -0.75], [0.1, -1.12], [0.13, -1.0], [0.155, -0.45], [0.175, 0]], t: 0.42 }
  };

  function ventricularMorph(shape, rr, amp, opts) {
    opts = opts || {};
    var stretch = opts.stretch || 1;
    var k = shape.knots.map(function (p) { return [p[0] * stretch, p[1] * amp]; });
    var qrsDur = k[k.length - 1][0];
    var len = clamp(0.30 * Math.sqrt(rr / 0.8), 0.22, 0.36) * (opts.tLen || 1);
    if (opts.maxEnd) len = Math.min(len, opts.maxEnd - qrsDur);
    var tStart = qrsDur + 0.005, tEnd = qrsDur + len;
    return {
      knots: k, qrsDur: qrsDur, j: 0, st: { mode: "none", A: 0 },
      t: { start: tStart, peak: tStart + 0.55 * (tEnd - tStart), end: tEnd, amp: shape.t * amp * (opts.tScale || 1) }
    };
  }

  /** ST segment + T wave of a morph at x seconds after the QRS onset (x ≥ qrsDur). */
  function sttValue(m, x) {
    var st = m.st, T = m.t, tJ = m.qrsDur, v = 0, u;
    if (st.mode === "elevation") {                       // convex ("coved") elevation that merges with the T wave
      if (x < T.peak) { u = (x - tJ) / (T.peak - tJ); v = st.A * (1 + 0.18 * Math.sin(Math.PI * u)); }
      else v = st.A * 0.5 * (1 + Math.cos(Math.PI * Math.min(1, (x - T.peak) / (T.end - T.peak))));
    } else if (st.mode === "horizontal") {               // flat, below the baseline, then up into the T wave
      var xf = tJ + Math.max(0.06, 0.55 * (T.peak - tJ)), xe = T.peak + 0.3 * (T.end - T.peak);
      if (x < xf) v = -st.A;
      else if (x < xe) v = -st.A * 0.5 * (1 + Math.cos(Math.PI * (x - xf) / (xe - xf)));
    } else if (st.mode === "downsloping") {              // slopes down from the J point, then a slow, inverted return
      var xl = tJ + 0.7 * (T.peak - tJ);
      if (x < xl) v = -st.A * (0.45 + 0.55 * (x - tJ) / (xl - tJ));
      else v = -st.A * 0.5 * (1 + Math.cos(Math.PI * Math.min(1, (x - xl) / (T.end - xl))));
    } else if (st.mode === "upsloping") {                // depressed J point, rising steadily into the T wave
      u = (x - tJ) / (T.peak - tJ);
      if (u < 1) v = -st.A * Math.pow(1 - u, 1.4);
    } else if (m.j) {
      u = (x - tJ) / Math.max(0.02, T.start - tJ);
      if (u < 1) v = m.j * (1 - u);
    }
    if (x > T.start && x < T.end) {                      // asymmetric raised-cosine T wave
      v += x < T.peak
        ? T.amp * 0.5 * (1 - Math.cos(Math.PI * (x - T.start) / (T.peak - T.start)))
        : T.amp * 0.5 * (1 + Math.cos(Math.PI * (x - T.peak) / (T.end - T.peak)));
    }
    return v;
  }

  // --- writing into the sample buffer -------------------------------------------------

  function idxFrom(t) { return Math.ceil(t / DT - 1e-9); }

  function addKnots(buf, t0, knots, scale) {
    var n = buf.length;
    for (var i = 0; i + 1 < knots.length; i++) {
      var ta = t0 + knots[i][0], tb = t0 + knots[i + 1][0];
      if (tb <= ta) continue;
      var va = knots[i][1] * scale, vb = knots[i + 1][1] * scale;
      var j0 = Math.max(0, idxFrom(ta)), j1 = Math.min(n - 1, idxFrom(tb) - 1);
      for (var j = j0; j <= j1; j++) buf[j] += va + (vb - va) * (j * DT - ta) / (tb - ta);
    }
  }

  function addMorph(buf, t0, m, scale) {
    addKnots(buf, t0, m.knots, scale);
    var n = buf.length;
    var j0 = Math.max(0, idxFrom(t0 + m.qrsDur)), j1 = Math.min(n - 1, idxFrom(t0 + m.t.end) - 1);
    for (var j = j0; j <= j1; j++) buf[j] += scale * sttValue(m, j * DT - t0);
  }

  /** A P wave: a smooth, slightly asymmetric dome (biphasic in V1). */
  function addP(buf, t0, dur, amp, fam) {
    var n = buf.length, a = 0.45 * dur;
    var j0 = Math.max(0, idxFrom(t0)), j1 = Math.min(n - 1, idxFrom(t0 + dur) - 1);
    for (var j = j0; j <= j1; j++) {
      var x = j * DT - t0, v;
      if (fam === "v1") v = 0.75 * amp * Math.sin(2 * Math.PI * x / dur) * (x < dur / 2 ? 1 : 0.8);
      else v = x < a ? amp * 0.5 * (1 - Math.cos(Math.PI * x / a)) : amp * 0.5 * (1 + Math.cos(Math.PI * (x - a) / (dur - a)));
      buf[j] += v;
    }
  }

  /** One flutter wave (lead II): slow downslope, a sharp dip, a quick return. u in [0, 1). */
  function flutterShape(u) {
    var v;
    if (u < 0.6) v = 0.10 - 0.16 * (u / 0.6);
    else if (u < 0.76) v = -0.06 - 0.19 * ((u - 0.6) / 0.16);
    else v = -0.25 + 0.35 * ((u - 0.76) / 0.24);
    return v + 0.031;                                     // centred on the baseline
  }

  /** Fibrillatory baseline: a few drifting, amplitude-modulated 4.5–8 Hz waves. */
  function makeFib(rng) {
    var comps = [];
    for (var i = 0; i < 4; i++) {
      comps.push({ a: uni(rng, 0.018, 0.04), f: uni(rng, 4.6, 7.8), ph: uni(rng, 0, 6.283),
        m: uni(rng, 0.25, 0.8), mph: uni(rng, 0, 6.283), b: uni(rng, 0.8, 2.6), g: uni(rng, 0.3, 1.1), gph: uni(rng, 0, 6.283) });
    }
    return function (t) {
      var v = 0;
      for (var i = 0; i < comps.length; i++) {
        var c = comps[i];
        v += c.a * (0.6 + 0.4 * Math.sin(6.283185 * c.m * t + c.mph)) *
          Math.sin(6.283185 * c.f * t + c.b * Math.sin(6.283185 * c.g * t + c.gph) + c.ph);
      }
      return v;
    };
  }

  /** Ventricular fibrillation: chaotic half-waves of random width, height and skew. */
  function addVf(buf, S, rng) {
    var t = -0.3, sign = rng() < 0.5 ? 1 : -1, n = buf.length;
    var envPeriod = uni(rng, 1.6, 3.2), envPh = uni(rng, 0, 6.283);
    while (t < S + 0.3) {
      var dur = uni(rng, 0.055, 0.16);
      var env = 0.22 + 0.6 * (0.5 + 0.5 * Math.sin(6.283185 * t / envPeriod + envPh));
      var amp = sign * env * uni(rng, 0.55, 1.2);
      var skew = uni(rng, 0.25, 0.75);
      var j0 = Math.max(0, idxFrom(t)), j1 = Math.min(n - 1, idxFrom(t + dur) - 1);
      for (var j = j0; j <= j1; j++) {
        var u = (j * DT - t) / dur;
        var w = u < skew ? 0.5 * u / skew : 0.5 + 0.5 * (u - skew) / (1 - skew);
        buf[j] += amp * Math.sin(Math.PI * w);
      }
      if (rng() < 0.86) sign = -sign;
      t += dur;
    }
    var dph = uni(rng, 0, 6.283), dper = uni(rng, 1.2, 2.4);
    for (var k = 0; k < n; k++) buf[k] += 0.12 * Math.sin(6.283185 * k * DT / dper + dph);
  }

  /** Light smoothing ([1 2 1] / 4, twice): rounds the corners of the piecewise-linear complexes. */
  function smooth(buf) {
    for (var pass = 0; pass < 2; pass++) {
      var prev = buf[0];
      for (var j = 1; j < buf.length - 1; j++) {
        var cur = buf[j];
        buf[j] = 0.25 * prev + 0.5 * cur + 0.25 * buf[j + 1];
        prev = cur;
      }
    }
  }

  // ------------------------------------------------------------------------------------
  // Rhythm planning. Each planner lays out a long timeline of P waves and QRS onsets;
  // chooseWindow() then picks the stretch that becomes the strip, so that the strip shows
  // round(rate × seconds ÷ 60) complexes (the 6-second method works), no complex is cut
  // in half at an edge, and the rhythm's key feature (a dropped beat, …) is in view.
  //   ps:    [{ t, conducted }]                 P-wave onsets
  //   beats: [{ t, kind, p, rr, … }]            QRS onsets; p = onset of the conducted P (or null)
  // ------------------------------------------------------------------------------------

  function planRegular(s, R, kind, pr) {
    var rr = 60 / s.rate, span = s.seconds + 8 + 6 * rr;
    var t = 0.3 + R.plan() * rr, ph = R.plan() * 6.283, prev = rr, beats = [], ps = [];
    while (t < span) {
      if (pr === null) beats.push({ t: t, kind: kind, p: null, rr: prev });
      else {
        ps.push({ t: t, conducted: true });
        beats.push({ t: t + pr, kind: kind, p: t, rr: prev });
      }
      var jitter = kind === "sinus" ? 0.012 * Math.sin(6.283185 * t / 4.7 + ph) + 0.004 * (2 * R.plan() - 1) : 0.005 * (2 * R.plan() - 1);
      prev = rr * (1 + jitter);
      t += prev;
    }
    return { span: span, beats: beats, ps: ps, rr: rr, target: Math.round(s.rate * s.seconds / 60) };
  }

  function planAfib(s, R) {
    var mrr = 60 / s.rate, span = s.seconds + 10 + 8 * mrr;
    var t = 0.3 + R.plan() * mrr, prevM = 1, prevRR = mrr, beats = [];
    while (t < span) {
      beats.push({ t: t, kind: "afib", p: null, rr: prevRR });
      var m = 1;
      for (var k = 0; k < 8; k++) { m = 1 + 0.34 * (2 * R.plan() - 1); if (Math.abs(m - prevM) >= 0.1) break; }
      prevM = m;
      prevRR = Math.max(0.27, mrr * m);
      t += prevRR;
    }
    return {
      span: span, beats: beats, ps: [], rr: mrr, target: Math.round(s.rate * s.seconds / 60),
      check: function (mat, S, level) {           // the strip itself must look irregularly irregular
        if (level >= 2) return true;
        var v = visible(mat.beats, S), rrs = [];
        for (var i = 1; i < v.length; i++) rrs.push(v[i].t - v[i - 1].t);
        if (rrs.length < 3) return true;
        return sd(rrs) / mean(rrs) >= 0.12;
      }
    };
  }

  function planFlutter(s, R) {
    var Tf = 60 / s.atrialRate, span = s.seconds + 12 + 20 * Tf;
    var phase = R.plan() * Tf, fw = [], beats = [];
    for (var f = phase; f < span; f += Tf) fw.push(f);
    var FR = 0.26;                                    // F-wave start → QRS onset
    var rbar = s.atrialRate / s.rate;
    var w2 = clamp((3.6 - rbar) / 2, 0, 0.6), w3 = 0.4;
    var i = Math.floor(R.plan() * 4), last = null, prevK = 0, run = 0;
    while (i < fw.length) {
      var t = fw[i] + FR;
      beats.push({ t: t, kind: "flutter", p: null, rr: last === null ? Tf * (s.conduction === "variable" ? 3 : s.conduction) : t - last, f: fw[i] });
      last = t;
      var k = s.conduction;
      if (k === "variable") {
        for (var tries = 0; tries < 4; tries++) {
          var u = R.plan();
          k = u < w2 ? 2 : u < w2 + w3 ? 3 : 4;
          if (!(k === prevK && run >= 1)) break;
        }
        run = k === prevK ? run + 1 : 0;
        prevK = k;
      }
      i += k;
    }
    return {
      span: span, beats: beats, ps: [], fw: fw, Tf: Tf, phase: phase, rr: 60 / s.rate,
      target: Math.round(s.rate * s.seconds / 60),
      check: s.conduction !== "variable" ? null : function (mat, S, level) {
        if (level >= 2) return true;                  // a variable strip should show at least two different ratios
        var v = visible(mat.beats, S), seen = {};
        for (var j = 1; j < v.length; j++) seen[Math.round((v[j].f - v[j - 1].f) / Tf)] = true;
        return Object.keys(seen).length >= 2;
      }
    };
  }

  /** Second-degree block. type 1 = Wenckebach (PR lengthens), 2 = Mobitz II (PR constant). */
  function planBlock2(s, R, type) {
    var pick = function (ns, prefer) {
      var ok = ns.filter(function (n) { var a = s.rate * n / (n - 1); return a >= 55 && a <= 115; });
      if (!ok.length) return ns.reduce(function (b, n) { return Math.abs(s.rate * n / (n - 1) - 80) < Math.abs(s.rate * b / (b - 1) - 80) ? n : b; }, ns[0]);
      if (ok.indexOf(prefer) >= 0 && R.plan() < 0.6) return prefer;
      return ok[Math.floor(R.plan() * ok.length)];
    };
    var n = type === 1 ? pick([3, 4, 5], 4) : pick([3, 4], 3);
    var atrial = s.rate * n / (n - 1), pp = 60 / atrial;
    var incs = [0, 0.10, 0.16, 0.20, 0.23, 0.25];
    var span = s.seconds + 10 + 3 * n * pp;
    var t = 0.3 + R.plan() * pp, i = Math.floor(R.plan() * n), lastQ = null, ps = [], beats = [];
    while (t < span) {
      var jj = i % n;
      if (jj < n - 1) {
        var q = t + s.pr + (type === 1 ? incs[jj] : 0);
        beats.push({ t: q, kind: "sinus", p: t, rr: lastQ === null ? pp : q - lastQ });
        ps.push({ t: t, conducted: true });
        lastQ = q;
      } else ps.push({ t: t, conducted: false });
      t += pp * (1 + 0.004 * (2 * R.plan() - 1));
      i++;
    }
    return {
      span: span, beats: beats, ps: ps, rr: 60 / s.rate, ratio: n, atrialRate: atrial,
      target: Math.round(s.rate * s.seconds / 60),
      check: function (mat, S, level) {               // a dropped P must be in view, after beats that show the PR
        if (level >= 2) return true;
        var lo = level === 0 ? 0.25 : 0.1, hi = S - (level === 0 ? 0.6 : 0.35), need = level === 0 ? 2 : 1;
        for (var k = 0; k < mat.ps.length; k++) {
          var p = mat.ps[k];
          if (p.conducted || p.t < lo || p.t > hi) continue;
          var before = 0;
          for (var b = 0; b < mat.beats.length; b++) if (mat.beats[b].t >= 0 && mat.beats[b].t < p.t) before++;
          if (before >= need) return true;
        }
        return false;
      }
    };
  }

  function planBlock3(s, R) {
    var base = planRegular(s, R, "escape", null);
    var atrial = s.atrialRate, ratio = atrial / s.rate, fr = ratio - Math.floor(ratio);
    if (fr < 0.2 || fr > 0.8) {                       // avoid a fixed-looking P:QRS relation (e.g. exactly 2:1)
      var k = Math.round(ratio), lo = s.rate * (k - 0.25), hi = s.rate * (k + 0.25);
      atrial = lo < s.rate * 1.1 || Math.abs(hi - atrial) < Math.abs(lo - atrial) ? hi : lo;
    }
    base.atrialRate = round(atrial, 2);
    base.post = function (mat, S, rng) {              // P waves at their own rate, independent of the QRS
      var pp = 60 / atrial, need = Math.round(atrial * S / 60), dur = 0.095;
      var busy = mat.beats.map(function (b) { return [b.t - 0.03, b.t + s.qrs + (s.qrs >= 0.12 ? 0.42 : 0.36)]; });
      var start = rng() * pp, best = null;
      for (var level = 0; level < 3 && !best; level++) {
        for (var i = 0; i < 240 && !best; i++) {
          var ph = (start + i * pp / 240) % pp, list = [], count = 0, over = 0, clean = 0, edge = false;
          for (var t = ph - pp * Math.ceil(1.5 / pp); t < S + 0.1; t += pp) {
            list.push(t);
            if (t >= 0 && t < S) count++;
            if ((t >= -0.06 && t < 0.02) || (t > S - 0.1 && t < S)) edge = true;
            if (t < 0 || t > S - dur) continue;
            var c = t + dur / 2, hit = false, touch = false;
            for (var b = 0; b < busy.length; b++) {
              if (c >= busy[b][0] && c <= busy[b][1]) hit = true;
              if (t + dur >= busy[b][0] && t <= busy[b][1]) touch = true;
            }
            if (hit) over++;
            if (!touch) clean++;
          }
          if (level === 0 && count === need && over >= 1 && clean >= 2 && !edge) best = list;
          else if (level === 1 && count === need && over >= 1) best = list;
          else if (level === 2 && Math.abs(count - need) <= 1) best = list;
        }
      }
      mat.ps = (best || []).map(function (t) { return { t: t, conducted: false }; });
    };
    return base;
  }

  // --- PVCs: chosen per window, so the strip always shows the requested pattern ------------

  function pvcSlots(pattern, count, N, rng) {
    var L = pattern === "couplets" ? 2 : 1, ev = [], q;
    if (pattern === "bigeminy") {
      var c = count || 99;
      for (q = 1; q < N && ev.length < c; q += 2) ev.push(q);
      return ev.map(function (x) { return { q: x, len: 1 }; });
    }
    var want = count || (pattern === "multifocal" ? 3 : pattern === "couplets" ? 1 : Math.max(1, Math.round(N / 4)));
    var gap = pattern === "isolated" ? 2 : pattern === "multifocal" ? 2 : 3;
    var c2 = want;
    while (c2 > 0 && 2 + (c2 - 1) * gap > N - c2 * L) {     // make it fit: first narrower gaps, then fewer events
      if (gap > 1) gap--; else c2--;
    }
    if (c2 <= 0) return [];
    var spare = N - c2 * L - (2 + (c2 - 1) * gap), gaps = [];
    for (var i = 0; i <= c2; i++) gaps.push(i === 0 || i === c2 ? 1 : gap);
    while (spare-- > 0) gaps[Math.floor(rng() * gaps.length)]++;
    q = gaps[0];
    for (i = 0; i < c2; i++) { ev.push({ q: q, len: L }); q += L + gaps[i + 1]; }
    return ev;
  }

  function planPvc(s, R, P) {
    var plan = planRegular(s, R, "sinus", s.pr);
    var rr = plan.rr, pattern = s.pvc.pattern;
    var foci = R.plan() < 0.5 ? ["A", "B", "C"] : ["B", "A", "C"];
    plan.materialize = function (pl, w, S) {
      var mat = materialize(pl, w, S, 2.5);
      var idx = [];
      mat.beats.forEach(function (b, i) { if (b.t >= 0 && b.t < S) idx.push(i); });
      var rng = stream(s.seed, "pvc|" + Math.round(w * 100));
      var events = pvcSlots(pattern, s.pvc.count, idx.length, rng);
      var minC = 0.40 * Math.sqrt(rr) + 0.06, extra = 0, n = 0;
      var unconduct = function (b) { mat.ps.forEach(function (p) { if (p.t === b.p) p.conducted = false; }); };
      events.forEach(function (e) {
        var bi = idx[e.q], prev = mat.beats[bi - 1], b = mat.beats[bi];
        if (!prev || !b) return;
        var focus = pattern === "multifocal" ? foci[n % foci.length] : P.pvcShape;
        var c = Math.min(Math.max(minC, uni(rng, 0.56, 0.66) * rr), rr - s.pr - 0.03);
        unconduct(b);
        b.t = prev.t + c; b.kind = "pvc"; b.p = null; b.focus = focus; b.rr = c;
        n++;
        if (e.len === 2) {
          var b2 = mat.beats[bi + 1];
          if (!b2) return;
          var c2 = clamp(b2.p - 0.2 - b.t, 0.38, Math.max(0.38, 0.8 * rr));
          var t2 = b.t + c2, f2 = pattern === "multifocal" ? foci[n % foci.length] : focus;
          if (b2.p - t2 < 0.45) {                     // its P hides in the second PVC: that beat is replaced
            unconduct(b2);
            b2.t = t2; b2.kind = "pvc"; b2.p = null; b2.focus = f2; b2.rr = c2;
          } else {                                    // slow rates: the next P still conducts — an extra beat
            mat.beats.splice(bi + 1, 0, { t: t2, kind: "pvc", p: null, focus: f2, rr: c2 });
            extra++;
          }
          n++;
        }
      });
      for (var i = 1; i < mat.beats.length; i++) if (mat.beats[i].kind !== "pvc") mat.beats[i].rr = mat.beats[i].t - mat.beats[i - 1].t;
      mat.extra = extra;
      mat.pvcEvents = events.length;
      return mat;
    };
    plan.check = function (mat, S, level) {
      if (level >= 2) return true;
      var pv = visible(mat.beats, S).filter(function (b) { return b.kind === "pvc"; });
      return pv.length > 0;
    };
    return plan;
  }

  function makePlan(s, R, P) {
    switch (s.rhythm) {
      case "nsr": case "sinus-brady": case "sinus-tach": case "av-block-1":
        return planRegular(s, R, "sinus", s.pr);
      case "paced": {
        var p = planRegular(s, R, "paced", s.pr);
        p.beats.forEach(function (b) { b.spike = true; });
        return p;
      }
      case "afib": return planAfib(s, R);
      case "aflutter": return planFlutter(s, R);
      case "pvc": return planPvc(s, R, P);
      case "av-block-2-type1": return planBlock2(s, R, 1);
      case "av-block-2-type2": return planBlock2(s, R, 2);
      case "av-block-3": return planBlock3(s, R);
      case "vtach": return planRegular(s, R, "vtach", null);
      default: return null;                           // vfib: no beats at all
    }
  }

  function visible(beats, S) { return beats.filter(function (b) { return b.t >= 0 && b.t < S; }); }

  /** The events of the window [w, w + S], in strip time. */
  function materialize(plan, w, S, after) {
    var beats = [], ps = [], tail = S + (after || 0.3);
    for (var i = 0; i < plan.beats.length; i++) {
      var b = plan.beats[i], t = b.t - w;
      if (t < -1.6 || t > tail) continue;
      var c = {};
      for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) c[k] = b[k];
      c.t = t;
      if (b.p !== null && b.p !== undefined) c.p = b.p - w;
      if (b.f !== undefined) c.f = b.f - w;
      beats.push(c);
    }
    for (i = 0; i < plan.ps.length; i++) {
      var p = plan.ps[i], tp = p.t - w;
      if (tp > -0.4 && tp < tail) ps.push({ t: tp, conducted: p.conducted });
    }
    return { w: w, beats: beats, ps: ps, extra: 0 };
  }

  function windowOk(plan, mat, S, level) {
    var count = 0;
    for (var i = 0; i < mat.beats.length; i++) {
      var t = mat.beats[i].t;
      if (t >= 0 && t < S) count++;
      if (level === 0 && ((t >= -0.12 && t < 0.05) || (t > S - 0.22 && t <= S + 0.02))) return false;
      if (level === 1 && ((t >= -0.05 && t < 0) || (t > S - 0.12 && t < S))) return false;
    }
    if (plan.target !== undefined && plan.target !== null) {
      var want = plan.target + (mat.extra || 0);
      if (level < 2 ? count !== want : Math.abs(count - plan.target) > 1 && Math.abs(count - want) > 1) return false;
    }
    return !plan.check || plan.check(mat, S, level);
  }

  function chooseWindow(plan, S, rng) {
    var make = plan.materialize || materialize;
    var lo = 1.6, hi = Math.max(lo + 0.01, plan.span - S - 0.6);
    var steps = Math.max(1, Math.floor((hi - lo) / 0.01)), off = Math.floor(rng() * steps);
    for (var level = 0; level < 3; level++) {
      for (var i = 0; i < steps; i++) {
        var mat = make(plan, lo + ((off + i) % steps) * 0.01, S);
        if (windowOk(plan, mat, S, level)) return mat;
      }
    }
    return make(plan, lo + off * 0.01, S);
  }
