#!/usr/bin/env node
/*
 * The Cardiac Case Files — tests for the ECG rhythm-strip generator (CCF.ECG, js/ui/ecg.js).
 *
 *   node tools/test_ecg.js            # all tests
 *   node tools/test_ecg.js flutter    # only tests whose name contains "flutter"
 *
 * Dependency-free: js/content/registry.js and js/ui/ecg.js run in a fresh Node `vm`
 * sandbox with no window and no document (the DOM-free API must not need one); render()
 * is exercised with a tiny fake document.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");
const FILES = ["js/content/registry.js", "js/ui/ecg.js"];
const SRC = FILES.map((f) => [f, fs.readFileSync(path.join(ROOT, f), "utf8")]);

function load() {
  const sandbox = { console };
  vm.createContext(sandbox);
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  return sandbox.CCF;
}

const CCF = load();
const E = CCF.ECG;
const RULES = CCF.content.RULES;
const DT = 0.002;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const json = (x) => JSON.stringify(x);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };
const cv = (a) => sd(a) / mean(a);
const rrs = (g) => g.beats.slice(1).map((b, i) => b.t - g.beats[i].t);
const at = (g, t) => g.samples[Math.max(0, Math.min(g.samples.length - 1, Math.round(t / DT)))].mv;
const range = (g, t0, t1) => {
  let lo = Infinity, hi = -Infinity;
  for (let j = Math.max(0, Math.round(t0 / DT)); j <= Math.min(g.samples.length - 1, Math.round(t1 / DT)); j++) {
    lo = Math.min(lo, g.samples[j].mv); hi = Math.max(hi, g.samples[j].mv);
  }
  return { lo, hi };
};
const RATED = E.RHYTHMS.filter((r) => r.rateRange);
const NAME_WORDS = /sinus|tachy|brady|fibrillat|flutter|premature|\bPVC|ectopic|\bblock|wenckebach|mobitz|degree|ventricular|atrial|junction|escape|\bpac(e|ed|ing|emaker)\b|bigemin|couplet|multifocal|unifocal|ischemi|infarct|bundle|\bnormal\b/i;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test("rhythm list matches the registry (ids, rate ranges, names)", () => {
  assert.strictEqual(json(E.RHYTHMS.map((r) => r.id)), json(Object.keys(RULES.rhythms)));
  for (const r of E.RHYTHMS) {
    assert.strictEqual(json(r.rateRange), json(RULES.rhythms[r.id]), r.id + " rateRange");
    assert.ok(typeof r.name === "string" && r.name && typeof r.description === "string" && r.description.length > 30, r.id);
    if (r.rateRange) assert.ok(r.defaultRate >= r.rateRange[0] && r.defaultRate <= r.rateRange[1], r.id + " defaultRate");
    else assert.strictEqual(r.defaultRate, null);
    for (const l of r.lookalikes) assert.ok(E.rhythm(l), r.id + " lookalike " + l);
  }
  const names = E.RHYTHMS.map((r) => r.name);
  for (const n of ["Normal sinus rhythm", "Atrial fibrillation", "Second-degree AV block, type I (Wenckebach)",
    "Third-degree (complete) heart block", "Ventricular fibrillation", "Paced rhythm"]) assert.ok(names.includes(n), n);
  assert.strictEqual(E.rhythm("nope"), null);
  assert.throws(() => E.generate({ rhythm: "nope" }), /unknown rhythm/);
});

test("every rhythm generates a clean 6-second strip", () => {
  for (const r of E.RHYTHMS) {
    const g = E.generate({ rhythm: r.id });
    assert.strictEqual(g.seconds, 6);
    assert.strictEqual(g.lead, "II");
    assert.strictEqual(g.samples.length, 3001, r.id);
    assert.strictEqual(g.samples[0].t, 0);
    assert.strictEqual(g.samples[3000].t, 6);
    for (let i = 0; i < g.samples.length; i++) {
      const s = g.samples[i];
      assert.ok(Number.isFinite(s.mv) && Math.abs(s.mv) < 3, r.id + " sample " + i + " = " + s.mv);
      if (i) assert.ok(s.t > g.samples[i - 1].t);
    }
    for (let i = 1; i < g.beats.length; i++) assert.ok(g.beats[i].t > g.beats[i - 1].t, r.id + " beats sorted");
    for (const b of g.beats) assert.ok(b.t >= 0 && b.t < 6 && typeof b.kind === "string" && b.qrs > 0.05, r.id);
    for (const p of g.pWaves) assert.ok(p >= 0 && p < 6);
    if (r.id === "vfib") assert.strictEqual(g.beats.length, 0);
    else assert.ok(g.beats.length >= 3, r.id);
  }
});

test("deterministic: the same spec and seed draw the identical strip (fresh sandboxes)", () => {
  const other = load().ECG;
  for (const r of E.RHYTHMS) {
    for (const spec of [{ rhythm: r.id, seed: 42 }, { rhythm: r.id }]) {
      const a = json(E.generate(spec)), b = json(other.generate(spec));
      assert.strictEqual(a, b, r.id + " " + json(spec));
      assert.strictEqual(E.describe(spec), other.describe(spec));
      assert.strictEqual(E.markup(spec), other.markup(spec));
    }
  }
});

test("different seeds draw different strips", () => {
  for (const r of E.RHYTHMS) {
    const a = E.generate({ rhythm: r.id, seed: 1 }).samples.map((s) => s.mv);
    const b = E.generate({ rhythm: r.id, seed: 2 }).samples.map((s) => s.mv);
    assert.notStrictEqual(json(a), json(b), r.id);
  }
  assert.notStrictEqual(E.generate({ rhythm: "nsr", rate: 70 }).seed, E.generate({ rhythm: "nsr", rate: 72 }).seed);
});

test("6-second method: round(rate ÷ 10) QRS complexes (±1) for every rhythm with a rate", () => {
  let exact = 0, total = 0;
  for (const r of RATED) {
    const [lo, hi] = r.rateRange;
    const rates = [lo, Math.round((lo + hi) / 2), hi, r.defaultRate];
    for (const rate of rates) {
      for (let seed = 1; seed <= 4; seed++) {
        const g = E.generate({ rhythm: r.id, rate, seed });
        const want = Math.round(g.rate / 10);
        const n = g.beats.length;
        assert.ok(Math.abs(n - want) <= 1, `${r.id} rate ${rate} (→ ${g.rate}) seed ${seed}: ${n} complexes, want ${want}`);
        total++; if (n === want) exact++;
      }
    }
  }
  assert.ok(exact / total >= 0.9, `exact counts only ${exact}/${total}`);
  for (const id of ["nsr", "afib", "av-block-3", "pvc"]) {        // other lengths: rate × seconds ÷ 60
    for (const seconds of [3, 10, 12]) {
      const g = E.generate({ rhythm: id, seconds, seed: 3 });
      assert.ok(Math.abs(g.beats.length - Math.round(g.rate * seconds / 60)) <= 1, id + " " + seconds + " s");
    }
  }
  assert.strictEqual(E.generate({ rhythm: "sinus-brady", rate: 48 }).beats.length, 5);   // case 1.1
});

test("sinus rhythms are regular, with a P wave and a constant PR before every QRS", () => {
  for (const id of ["nsr", "sinus-brady", "sinus-tach", "av-block-1"]) {
    for (let seed = 1; seed <= 5; seed++) {
      const g = E.generate({ rhythm: id, seed });
      assert.ok(cv(rrs(g)) < 0.03, id + " regular");
      assert.strictEqual(g.nonConducted.length, 0);
      const prs = g.beats.map((b) => b.pr);
      for (const b of g.beats) assert.ok(b.kind === "sinus" && b.pr > 0 && b.qrs <= 0.1, id);
      assert.ok(Math.max(...prs) - Math.min(...prs) < 0.005, id + " PR constant");
      if (id === "av-block-1") assert.ok(Math.abs(prs[0] - 0.28) < 0.005);
      else assert.ok(prs[0] >= 0.12 && prs[0] <= 0.20, id + " PR " + prs[0]);
    }
  }
  assert.ok(E.generate({ rhythm: "av-block-1", pr: 0.36 }).beats.every((b) => Math.abs(b.pr - 0.36) < 0.005));
  assert.ok(E.generate({ rhythm: "nsr", pr: 0.14 }).beats.every((b) => Math.abs(b.pr - 0.14) < 0.005));
});

test("atrial fibrillation: no P waves, irregularly irregular RR, wavy baseline", () => {
  for (const rate of [60, 110, 150]) {
    for (let seed = 1; seed <= 8; seed++) {
      const g = E.generate({ rhythm: "afib", rate, seed });
      assert.strictEqual(g.pWaves.length, 0);
      assert.ok(g.beats.every((b) => b.kind === "afib" && b.p === undefined));
      assert.ok(cv(rrs(g)) > 0.1, `afib ${rate}/${seed} CV ${cv(rrs(g)).toFixed(3)}`);
      // the baseline between complexes (after the T wave, before the next QRS) is never flat
      const gaps = [];
      g.beats.forEach((b, i) => { const n = g.beats[i + 1]; if (n && n.t - b.t > 0.55) { const w = range(g, b.t + 0.4, n.t - 0.03); gaps.push(w.hi - w.lo); } });
      if (gaps.length) assert.ok(mean(gaps) > 0.05, "fibrillatory waves " + mean(gaps).toFixed(3));
    }
  }
});

test("atrial flutter: ~300/min sawtooth, QRS after every 2nd/3rd/4th wave", () => {
  for (const conduction of [2, 3, 4]) {
    for (let seed = 1; seed <= 4; seed++) {
      const g = E.generate({ rhythm: "aflutter", conduction, seed });
      assert.strictEqual(g.atrialRate, 300);
      assert.strictEqual(g.rate, 300 / conduction);
      assert.strictEqual(g.pWaves.length, 0);
      const Tf = 60 / g.atrialRate;
      for (const rr of rrs(g)) assert.ok(Math.abs(rr / Tf - conduction) < 0.1, `ratio ${rr / Tf} vs ${conduction}`);
      assert.ok(Math.abs(g.fWaves.length - 30) <= 1, "flutter waves " + g.fWaves.length);
      for (let i = 1; i < g.fWaves.length; i++) assert.ok(Math.abs(g.fWaves[i] - g.fWaves[i - 1] - Tf) < 1e-3);
      assert.ok(cv(rrs(g)) < 0.02, "regular ventricular response");
    }
  }
  assert.strictEqual(E.generate({ rhythm: "aflutter" }).conduction, 4);
  assert.strictEqual(E.generate({ rhythm: "aflutter" }).rate, 75);
  assert.strictEqual(E.generate({ rhythm: "aflutter", rate: 150 }).conduction, 2);
  for (let seed = 1; seed <= 6; seed++) {
    const g = E.generate({ rhythm: "aflutter", conduction: "variable", seed });
    const ratios = rrs(g).map((rr) => rr / 0.2);
    for (const k of ratios) assert.ok([2, 3, 4].some((n) => Math.abs(k - n) < 0.1), "variable ratio " + k);
    assert.ok(new Set(ratios.map(Math.round)).size >= 2, "variable shows different ratios");
  }
});

test("third-degree block: P waves and escape QRS complexes march independently", () => {
  for (const [rate, atrialRate] of [[36, 80], [30, 75], [45, 90], [40, 80]]) {
    for (let seed = 1; seed <= 5; seed++) {
      const g = E.generate({ rhythm: "av-block-3", rate, atrialRate, seed });
      assert.ok(Math.abs(g.pWaves.length - Math.round(g.atrialRate / 10)) <= 1, `P count ${g.pWaves.length} vs ${g.atrialRate}`);
      assert.ok(Math.abs(g.beats.length - Math.round(rate / 10)) <= 1);
      assert.strictEqual(g.nonConducted.length, g.pWaves.length, "no P wave is conducted");
      assert.ok(g.beats.every((b) => b.kind === "escape" && b.p === undefined && b.qrs >= 0.12));
      assert.ok(cv(rrs(g)) < 0.03, "regular escape rhythm");
      assert.ok(Math.abs(g.atrialRate / rate - Math.round(g.atrialRate / rate)) >= 0.19, "no fixed P:QRS ratio");
      // apparent "PR" (last P before each QRS) keeps changing
      const apparent = g.beats.map((b) => { const ps = g.pWaves.filter((p) => p < b.t); return ps.length ? b.t - ps[ps.length - 1] : null; }).filter((x) => x !== null);
      if (apparent.length >= 3) assert.ok(Math.max(...apparent) - Math.min(...apparent) > 0.08, "PR varies " + apparent);
      // some P waves land on a QRS or T wave
      assert.ok(g.pWaves.some((p) => g.beats.some((b) => p + 0.045 >= b.t - 0.03 && p + 0.045 <= b.t + 0.55)), "a P on QRS/T");
    }
  }
  assert.ok(E.generate({ rhythm: "av-block-3", rate: 40, atrialRate: 80 }).atrialRate !== 80, "2:1 avoided");
  assert.ok(E.generate({ rhythm: "av-block-3", qrs: 0.09 }).beats.every((b) => b.qrs < 0.12), "narrow escape");
});

function pWaveTrain(g) {
  return g.pWaves.map((t) => ({ t, beat: g.beats.find((b) => b.p !== undefined && Math.abs(b.p - t) < 1e-6) || null }));
}

test("Wenckebach: the PR lengthens beat by beat until a P wave is not conducted, then resets", () => {
  for (const rate of [45, 60, 75, 90]) {
    for (let seed = 1; seed <= 5; seed++) {
      const g = E.generate({ rhythm: "av-block-2-type1", rate, seed });
      const train = pWaveTrain(g).filter((x) => x.t < g.seconds - 0.6);   // later P waves conduct off the strip
      const drops = train.filter((x) => !x.beat);
      assert.ok(drops.length >= 1, `type1 ${rate}/${seed}: no dropped P`);
      for (const x of train) assert.strictEqual(!x.beat, g.nonConducted.includes(x.t), "dropped = not conducted");
      let prev = null, sawGrowth = false;
      for (const x of train) {
        if (!x.beat) { prev = null; continue; }
        if (prev !== null) { assert.ok(x.beat.pr > prev + 0.02, `PR must lengthen: ${prev} → ${x.beat.pr}`); sawGrowth = true; }
        prev = x.beat.pr;
      }
      assert.ok(sawGrowth, "at least two conducted beats in a row");
      // after a dropped P the PR is back to the shortest value
      const firstPr = Math.min(...g.beats.map((b) => b.pr));
      train.forEach((x, i) => { if (!x.beat && train[i + 1] && train[i + 1].beat) assert.ok(Math.abs(train[i + 1].beat.pr - firstPr) < 0.005); });
      assert.ok(Math.abs(g.beats.length - Math.round(rate / 10)) <= 1);
    }
  }
});

test("Mobitz II: constant PR with P waves that are suddenly not conducted", () => {
  for (const rate of [30, 50, 70]) {
    for (let seed = 1; seed <= 5; seed++) {
      const g = E.generate({ rhythm: "av-block-2-type2", rate, seed });
      const prs = g.beats.map((b) => b.pr);
      assert.ok(Math.max(...prs) - Math.min(...prs) < 0.005, "PR constant");
      assert.ok(g.nonConducted.length >= 1, `type2 ${rate}/${seed}: no dropped P`);
      assert.ok(/^[34]:[23]$/.test(g.conduction), g.conduction);
      assert.ok(Math.abs(g.beats.length - Math.round(rate / 10)) <= 1);
    }
  }
});

function qrsSign(g, b) {      // the sign of the biggest deflection inside the QRS
  let best = 0;
  for (let t = b.t; t <= b.t + b.qrs; t += DT) if (Math.abs(at(g, t)) > Math.abs(best)) best = at(g, t);
  return Math.sign(best);
}

test("PVCs: early, wide, no P before, discordant T, compensatory pause; every pattern", () => {
  for (const pattern of ["isolated", "bigeminy", "couplets", "multifocal"]) {
    for (const rate of [55, 75, 100]) {
      for (let seed = 1; seed <= 4; seed++) {
        const g = E.generate({ rhythm: "pvc", rate, seed, pvc: { pattern } });
        const rr = 60 / rate, pv = g.beats.filter((b) => b.kind === "pvc");
        assert.ok(pv.length >= 1, `${pattern} ${rate}/${seed}: no PVC`);
        for (const b of pv) {
          const i = g.beats.indexOf(b), prev = g.beats[i - 1];
          assert.ok(b.qrs >= 0.12, "wide");
          assert.ok(b.p === undefined && !g.pWaves.some((p) => p > b.t - 0.3 && p < b.t), "no P in front");
          if (prev) assert.ok(b.t - prev.t < 0.85 * rr, "premature");
          let tSum = 0;
          for (let t = b.t + b.qrs + 0.06; t < b.t + b.qrs + 0.24; t += DT) tSum += at(g, t);
          assert.ok(Math.sign(tSum) === -qrsSign(g, b), "T opposite to the QRS");
        }
        if (pattern === "isolated" || pattern === "multifocal") {
          for (const b of pv) {
            const i = g.beats.indexOf(b), prev = g.beats[i - 1], next = g.beats[i + 1];
            if (prev && next) assert.ok(Math.abs(next.t - prev.t - 2 * rr) < 0.06, `compensatory pause ${(next.t - prev.t).toFixed(3)} vs ${2 * rr}`);
          }
        }
        if (pattern === "bigeminy") g.beats.forEach((b, i) => assert.strictEqual(b.kind, i % 2 ? "pvc" : "sinus", "bigeminy alternates"));
        if (pattern === "couplets") assert.ok(g.beats.some((b, i) => b.kind === "pvc" && g.beats[i + 1] && g.beats[i + 1].kind === "pvc"), "a pair");
        if (pattern === "multifocal") assert.ok(new Set(pv.map((b) => b.focus)).size >= 2, "different foci");
        else assert.strictEqual(new Set(pv.map((b) => b.focus)).size, 1, "unifocal");
        assert.ok(Math.abs(g.beats.length - Math.round(rate / 10)) <= 1);
      }
    }
  }
  assert.strictEqual(E.generate({ rhythm: "pvc", pvc: { pattern: "isolated", count: 1 } }).beats.filter((b) => b.kind === "pvc").length, 1);
  assert.strictEqual(E.generate({ rhythm: "pvc", pvc: { pattern: "multifocal", count: 2 } }).beats.filter((b) => b.kind === "pvc").length, 2);
  assert.strictEqual(E.generate({ rhythm: "pvc", pvc: { pattern: "bigeminy", count: 2 } }).beats.filter((b) => b.kind === "pvc").length, 2);
  // multifocal shapes really differ
  const g = E.generate({ rhythm: "pvc", pvc: { pattern: "multifocal", count: 3 }, seed: 9 });
  const pv = g.beats.filter((b) => b.kind === "pvc");
  const sig = (b) => Array.from({ length: 80 }, (_, k) => at(g, b.t + k * DT));
  const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };
  assert.ok(corr(sig(pv[0]), sig(pv[1])) < 0.5, "multifocal PVCs look different");
});

test("morphology: ST elevation/depression, T inversion, Q waves, wide QRS", () => {
  const base = (g, b) => at(g, b.p - 0.01);
  const sinus = (g) => g.beats.filter((b) => b.kind === "sinus" && b.p !== undefined && b.p > 0.02 && b.t + 0.45 < g.seconds);
  let g = E.generate({ rhythm: "nsr", st: "elevation", stMm: 3 });
  for (const b of sinus(g)) assert.ok(Math.abs(at(g, b.t + b.qrs + 0.04) - base(g, b) - 0.33) < 0.1, "ST raised 3 mm");
  g = E.generate({ rhythm: "nsr", st: "depression", stMm: 2, stSlope: "horizontal" });
  for (const b of sinus(g)) {
    const j = b.t + b.qrs, v1 = at(g, j + 0.02) - base(g, b), v2 = at(g, j + 0.08) - base(g, b);
    assert.ok(Math.abs(v1 + 0.2) < 0.06 && Math.abs(v2 - v1) < 0.04, `horizontal ${v1} ${v2}`);
  }
  g = E.generate({ rhythm: "nsr", st: "depression", stMm: 2, stSlope: "downsloping" });
  for (const b of sinus(g)) {
    const j = b.t + b.qrs, v1 = at(g, j + 0.02) - base(g, b), v2 = at(g, j + 0.12) - base(g, b);
    assert.ok(v1 > v2 + 0.05 && v2 < -0.15 && v2 > -0.26, `downsloping ${v1} ${v2}`);
  }
  g = E.generate({ rhythm: "nsr", st: "depression", stMm: 2, stSlope: "upsloping" });
  for (const b of sinus(g)) {
    const j = b.t + b.qrs, v1 = at(g, j + 0.01) - base(g, b), v2 = at(g, j + 0.1) - base(g, b);
    assert.ok(v1 < -0.12 && v2 > v1 + 0.05, `upsloping ${v1} ${v2}`);
  }
  g = E.generate({ rhythm: "nsr", tWave: "inverted" });
  for (const b of sinus(g)) {
    const w = range(g, b.t + b.qrs + 0.05, b.t + 0.4);
    assert.ok(w.lo - base(g, b) < -0.22 && w.hi - base(g, b) < 0.06, "T inverted");
  }
  g = E.generate({ rhythm: "nsr" });
  for (const b of sinus(g)) assert.ok(range(g, b.t + b.qrs + 0.1, b.t + 0.4).hi - base(g, b) > 0.18, "T upright");
  g = E.generate({ rhythm: "nsr", qWave: true });
  for (const b of sinus(g)) {
    const b0 = base(g, b), r = range(g, b.t, b.t + b.qrs);
    let qEnd = null, qMin = 0;
    for (let t = b.t; t < b.t + b.qrs; t += DT) {
      const v = at(g, t) - b0;
      if (v < qMin) qMin = v;
      if (qMin < -0.1 && v > -0.02) { qEnd = t; break; }
    }
    assert.ok(qEnd !== null && qEnd - b.t >= 0.04, "Q at least 0.04 s wide: " + (qEnd && qEnd - b.t));
    assert.ok(-qMin >= 0.25 * (r.hi - b0), `Q depth ${-qMin} vs R ${r.hi - b0}`);
  }
  g = E.generate({ rhythm: "nsr", qrs: 0.14 });
  for (const b of g.beats) {
    assert.ok(b.qrs >= 0.12);
    assert.ok(Math.abs(at(g, b.t + 0.11) - base(g, b)) > 0.15, "still in the QRS at 0.11 s");
  }
  assert.ok(E.generate({ rhythm: "nsr" }).beats.every((b) => b.qrs <= 0.1), "narrow by default");
  for (const lead of ["V1", "V2", "aVR", "III"]) assert.ok(E.generate({ rhythm: "nsr", lead, st: "elevation", stMm: 2 }).beats.length === 8);
  assert.ok(qrsSign(E.generate({ rhythm: "nsr", lead: "V2" }), E.generate({ rhythm: "nsr", lead: "V2" }).beats[1]) < 0, "rS in V2");
});

test("ventricular tachycardia, fibrillation and paced rhythms", () => {
  for (const rate of [140, 170, 220]) {
    const g = E.generate({ rhythm: "vtach", rate });
    assert.strictEqual(g.pWaves.length, 0);
    assert.ok(g.beats.every((b) => b.kind === "vtach" && b.qrs >= 0.12));
    assert.ok(cv(rrs(g)) < 0.03);
  }
  for (let seed = 1; seed <= 5; seed++) {
    const g = E.generate({ rhythm: "vfib", seed, rate: 120 });
    assert.strictEqual(g.rate, null);
    assert.strictEqual(g.beats.length + g.pWaves.length, 0);
    const amps = [];
    for (let t = 0; t + 0.5 <= 6; t += 0.5) { const w = range(g, t, t + 0.5); amps.push(w.hi - w.lo); }
    assert.ok(Math.max(...amps) / Math.min(...amps) > 1.5, "varying amplitude");
    for (let t = 0; t + 0.25 <= 6; t += 0.25) { const w = range(g, t, t + 0.25); assert.ok(w.hi - w.lo > 0.05, "never flat"); }
  }
  for (const rate of [50, 70, 90]) {
    const g = E.generate({ rhythm: "paced", rate });
    assert.ok(cv(rrs(g)) < 0.03);
    for (const b of g.beats) {
      assert.ok(b.kind === "paced" && Math.abs(b.spike - b.t) < 0.0015 && b.qrs >= 0.12, "spike + wide QRS");
      const j = Math.round(b.spike / DT);
      assert.ok(g.samples[j].mv - g.samples[j - 2].mv > 1.0, "sharp spike");
      assert.ok(g.samples[j + 1].mv < g.samples[j].mv - 1.0, "spike is one sample wide");
      if (b.p !== undefined) assert.ok(Math.abs(b.pr - 0.16) < 0.005);
    }
  }
});

test("describe(): features in plain English, never the rhythm's name", () => {
  const specs = E.RHYTHMS.map((r) => ({ rhythm: r.id }));
  for (const pattern of ["isolated", "bigeminy", "couplets", "multifocal"]) specs.push({ rhythm: "pvc", pvc: { pattern } });
  specs.push({ rhythm: "nsr", st: "elevation", stMm: 3, qWave: true, tWave: "inverted" }, { rhythm: "nsr", qrs: 0.14 },
    { rhythm: "aflutter", conduction: "variable" }, { rhythm: "nsr", st: "depression", stSlope: "downsloping" }, { rhythm: "av-block-3", qrs: 0.09 });
  for (let i = 0; i < 150; i++) specs.push(E.randomSpec(i));
  for (const spec of specs) {
    const d = E.describe(spec), meta = E.rhythm(spec.rhythm);
    assert.ok(!d.toLowerCase().includes(meta.name.toLowerCase()), json(spec) + ": " + d);
    const m = d.match(NAME_WORDS);
    assert.ok(!m, `${json(spec)} says "${m && m[0]}": ${d}`);
    assert.ok(new RegExp("^" + (spec.seconds || 6) + "-second strip, lead " + (spec.lead || "II") + "\\.").test(d), d);
    assert.ok(d.length > 80 && d.length < 1200);
  }
  assert.ok(/no distinct p waves/i.test(E.describe({ rhythm: "afib" })));
  assert.ok(/8 QRS complexes in 6 seconds/.test(E.describe({ rhythm: "nsr" })));
  assert.ok(/not followed by any QRS/.test(E.describe({ rhythm: "av-block-2-type1" })));
  assert.ok(/spike/.test(E.describe({ rhythm: "paced" })));
  assert.strictEqual(E.describe({ rhythm: "nsr", describe: "  Custom text.  " }), "Custom text.");
});

// A tiny fake DOM: enough for render() and injectStyles().
function fakeDocument() {
  function Node(tag, ns) { this.tagName = tag; this.namespaceURI = ns || null; this.attributes = {}; this.childNodes = []; this.textContent = ""; }
  Node.prototype.setAttribute = function (k, v) { this.attributes[k] = String(v); if (k === "id") this.id = String(v); };
  Node.prototype.getAttribute = function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; };
  Node.prototype.appendChild = function (c) { this.childNodes.push(c); return c; };
  Node.prototype.insertBefore = function (c, ref) { const i = this.childNodes.indexOf(ref); this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, c); return c; };
  Object.defineProperty(Node.prototype, "firstChild", { get() { return this.childNodes[0] || null; } });
  Object.defineProperty(Node.prototype, "className", { get() { return this.attributes.class || ""; }, set(v) { this.attributes.class = v; } });
  const head = new Node("head");
  const all = () => { const out = []; (function walk(n) { out.push(n); n.childNodes.forEach(walk); })(head); return out; };
  return {
    head,
    createElement: (t) => new Node(t),
    createElementNS: (ns, t) => new Node(t, ns),
    getElementById: (id) => all().find((n) => n.id === id) || null,
    find(root, pred) { const out = []; (function walk(n) { if (pred(n)) out.push(n); n.childNodes.forEach(walk); })(root); return out; }
  };
}

test("render(): <figure class=\"ecg\"> with an accessible, viewBox-scaled <svg> and a caption", () => {
  const doc = fakeDocument();
  const spec = { rhythm: "afib", caption: "Telemetry, 10:42 <b>" };
  const fig = E.render(spec, { document: doc });
  assert.strictEqual(fig.tagName, "figure");
  assert.ok(/\becg\b/.test(fig.className));
  const svgs = doc.find(fig, (n) => n.tagName === "svg");
  assert.strictEqual(svgs.length, 2, "line + rows layouts (CSS picks one)");
  for (const svg of svgs) {
    assert.strictEqual(svg.namespaceURI, "http://www.w3.org/2000/svg");
    assert.strictEqual(svg.getAttribute("role"), "img");
    assert.strictEqual(svg.getAttribute("aria-label"), E.describe(spec));
    assert.ok(/^0 0 \d/.test(svg.getAttribute("viewBox")));
    assert.strictEqual(svg.getAttribute("tabindex"), null);
  }
  assert.strictEqual(svgs[0].getAttribute("viewBox"), "0 0 150 40");
  assert.strictEqual(svgs[1].getAttribute("viewBox"), "0 0 75 82.5");
  const cap = doc.find(fig, (n) => n.tagName === "figcaption");
  assert.strictEqual(cap.length, 1);
  assert.strictEqual(cap[0].textContent, "Telemetry, 10:42 <b>");
  assert.strictEqual(fig.getAttribute("tabindex"), null);
  const lead = doc.find(fig, (n) => n.tagName === "text" && n.textContent === "II");
  assert.ok(lead.length >= 1, "lead label");
  // the default stylesheet goes in once
  E.render({ rhythm: "nsr" }, { document: doc });
  assert.strictEqual(doc.head.childNodes.filter((n) => n.id === "ccf-ecg-style").length, 1);
  // options
  const one = E.render({ rhythm: "nsr" }, { document: doc, layout: "line", compact: true, width: 600 });
  assert.ok(/ecg--compact/.test(one.className));
  assert.strictEqual(doc.find(one, (n) => n.tagName === "svg").length, 1);
  assert.strictEqual(doc.find(one, (n) => n.tagName === "svg")[0].getAttribute("viewBox"), "0 0 150 30");
  assert.strictEqual(one.getAttribute("style"), "max-width:600px");
  const short = E.render({ rhythm: "nsr", seconds: 3 }, { document: doc });
  assert.strictEqual(doc.find(short, (n) => n.tagName === "svg").length, 1, "short strips stay on one line");
  // a bad spec gives a quiet error figure, not an exception
  const warn = console.warn; console.warn = () => {};
  const bad = E.render({ rhythm: "nope" }, { document: doc });
  console.warn = warn;
  assert.ok(/ecg--error/.test(bad.className));
  assert.throws(() => E.render({ rhythm: "nsr" }), /needs a document/);
});

test("markup(): paper, 3-second marks, escaping", () => {
  const html = E.markup({ rhythm: "nsr", lead: "V2 <x>", caption: "a & b" }, { layout: "line" });
  assert.ok(html.startsWith("<figure class=\"ecg\"><div class=\"ecg-strip\"><svg xmlns=\"http://www.w3.org/2000/svg\""));
  assert.ok(html.includes(">V2 &lt;x&gt;</text>") && html.includes("<figcaption class=\"ecg-caption\">a &amp; b</figcaption>"));
  const marks = html.match(/<path d="([^"]+)" stroke="#3b2b2b"/)[1];
  assert.strictEqual(marks.split("M").length - 1, 3, "marks at 0, 3 and 6 s");
  assert.ok(/<path class="ecg-trace" d="M/.test(html));
  const minor = html.match(/<path d="([^"]+)" stroke="#f3c6c0"/)[1].split("M").length - 1;
  const major = html.match(/<path d="([^"]+)" stroke="#e2877e"/)[1].split("M").length - 1;
  assert.strictEqual(minor + major, 151 + 41, "a line every millimetre");
  assert.strictEqual(major, 31 + 9, "a darker line every 5 mm");
  assert.ok(!/<script|\son\w+="/i.test(E.markup({ rhythm: "nsr", caption: "<script>alert(1)</script>", lead: "\" onload=\"x" })));
});

test("specs are not mutated; normalize() fills defaults", () => {
  const spec = { rhythm: "pvc", pvc: { pattern: "couplets" }, caption: "x" };
  const before = json(spec);
  E.generate(spec); E.describe(spec); E.markup(spec);
  assert.strictEqual(json(spec), before);
  const n = E.normalize({ rhythm: "av-block-3" });
  assert.strictEqual(n.rate, 36); assert.strictEqual(n.atrialRate, 80); assert.strictEqual(n.qrs, 0.14);
  assert.strictEqual(E.normalize({ rhythm: "aflutter" }).conduction, 4);
  assert.strictEqual(E.normalize({ rhythm: "pvc" }).pvc.pattern, "isolated");
  assert.strictEqual(E.normalize({ rhythm: "nsr", st: "depression" }).stSlope, "horizontal");
  assert.strictEqual(E.normalize({ rhythm: "nsr", st: "elevation" }).stMm, 2);
  assert.strictEqual(E.normalize({ rhythm: "av-block-1" }).pr, 0.28);
  for (const r of RATED) for (const rate of [1, 400]) assert.ok(E.generate({ rhythm: r.id, rate }).beats.length > 0, r.id + " extreme rate " + rate);
});

test("randomSpec(): valid, varied and deterministic drill strips", () => {
  const seen = new Set();
  for (let seed = 0; seed < 400; seed++) {
    const s = E.randomSpec(seed);
    assert.strictEqual(json(s), json(E.randomSpec(seed)));
    seen.add(s.rhythm);
    assert.ok(Object.prototype.hasOwnProperty.call(RULES.rhythms, s.rhythm));
    assert.ok(Number.isInteger(s.seed) && s.seconds === 6 && s.lead === "II");
    const range = RULES.rhythms[s.rhythm];
    if (s.rate !== undefined) assert.ok(range && s.rate >= range[0] && s.rate <= range[1], json(s));
    if (s.pvc) assert.ok(RULES.pvcPatterns.includes(s.pvc.pattern));
    if (s.conduction !== undefined) assert.ok([2, 3, 4, "variable"].includes(s.conduction));
    if (s.atrialRate !== undefined) assert.ok(s.atrialRate >= 40 && s.atrialRate <= 350);
    if (s.pr !== undefined) assert.ok(s.pr >= 0.10 && s.pr <= 0.44);
  }
  assert.strictEqual(seen.size, E.RHYTHMS.length, "every rhythm appears");
  assert.ok(E.randomSpec(5, { rhythms: ["afib", "aflutter"] }).rhythm.startsWith("a"));
  assert.strictEqual(E.randomSpec("abc").rhythm, E.randomSpec("abc").rhythm);
});

test("performance: generating + rendering 50 strips is fast", () => {
  const t0 = Date.now();
  for (let i = 0; i < 50; i++) {
    const spec = E.randomSpec(1000 + i);
    E.generate(spec);
    E.markup(spec);
  }
  const ms = Date.now() - t0;
  console.log(`      (50 strips in ${ms} ms)`);
  assert.ok(ms < 2000, ms + " ms");
});

// ---------------------------------------------------------------------------

const filter = process.argv[2] || "";
let failed = 0, ran = 0;
for (const t of tests) {
  if (filter && !t.name.toLowerCase().includes(filter.toLowerCase())) continue;
  ran++;
  try { t.fn(); console.log("  ok   " + t.name); }
  catch (e) { failed++; console.log("  FAIL " + t.name + "\n       " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n       ") : e)); }
}
console.log(`\n${ran - failed}/${ran} ECG tests passed`);
process.exit(failed ? 1 : 0);
