/*
 * The Cardiac Case Files — CCF.Progress: stars, XP, ranks, unlocks and statistics.
 * Contract: docs/DESIGN.md §4.4 and §5.3.
 *
 * Pure, deterministic functions over CCF.content (the registered units and cases) and a
 * profile (CCF.Save.current()). No DOM, no storage, no clock. Every function accepts a
 * missing or partial profile and any amount of content (even none), and never throws for
 * unknown ids. Content loads after this file, so CCF.content is read when a function runs.
 *
 * Rules:
 *   * Strikes = wrong attempts + hints + "show me" uses over the whole case (the UI counts).
 *   * Stars: 0 strikes → 3; strikes ≤ ⌈steps ÷ 2⌉ → 2; otherwise 1 (solving earns at least 1).
 *   * XP = round(base × stars ÷ 3), base easy 10, medium 20, hard 30.
 *   * Ranks by total XP as a share of the maximum XP (RANKS). A rank's minimum XP is
 *     ceil(share × max) — computed with whole percentages, so 55 % of 700 is exactly 385 —
 *     and at least 1 XP for every rank above the first.
 *   * Unlocks: every unit is open. Inside a unit the first case is open and the next one
 *     opens when the one before it is solved (by position in the unit, so a gap in `order`
 *     never locks a case for good). A case that is solved or in progress stays open, and
 *     CCF.config.unlockAll opens everything.
 *   * Records for ids that aren't in the content (made by a newer version, or from a file
 *     that failed to load) are ignored by every statistic.
 *
 * API (§5.3):
 *   starsFor(strikes, stepCount) → 1..3          xpFor(caseDef | caseId, stars) → integer
 *   maxXp()   totalXp(profile)   RANKS → [{ title, share }]
 *   rankFor(xp[, max]) → { index, title, minXp, nextTitle, nextXp, fraction }
 *   isUnlocked(profile, caseId) → boolean
 *   unitStats(profile, unitId) → { solved, total, stars, maxStars, inProgress }
 *   overall(profile) → { solved, total, stars, maxStars, xp, complete }
 *   nextCase(profile) → caseDef | null: the most recently played unsolved case that is in
 *       progress; else the first unlocked unsolved case in unit order; else a solved case
 *       being replayed (most recent first); else null (everything is solved).
 *
 * Extras:
 *   rankFor() also returns share and maxXp; unitStats() also xp, maxXp, complete;
 *   overall() also maxXp, inProgress, percent. starsFor() also accepts a caseDef as stepCount.
 *   DIFFICULTY_XP                      { easy: 10, medium: 20, hard: 30 }
 *   nextAfter(profile, caseId)         the "Next case" button after closing caseId: the next
 *                                      unlocked unsolved case in the same unit (after it, then
 *                                      before it), else nextCase(); never caseId itself
 *   caseState(profile, caseId)         "solved" | "in-progress" | "open" | "locked" | null (unknown)
 *   isSolved(profile, caseId)   inProgress(profile, caseId)   bestStars(profile, caseId)
 *   allCases()   getCase(idOrCaseDef)   unitOf(caseId)
 *   report(profile)                    data for the case log and the printable progress report:
 *       { name, xp, maxXp, rank, overall, units: [{ id, order, title, stats, cases: [{ id,
 *         number, title, difficulty, patient, state, solved, stars, bestStrikes, plays, xp,
 *         firstSolvedAt, lastPlayedAt, inProgress, unlocked }] }] }
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var hasOwn = Object.prototype.hasOwnProperty;

  var DIFFICULTY_XP = Object.freeze({ easy: 10, medium: 20, hard: 30 });

  // `percent` is the exact whole-number share; `share` is the same value as a fraction.
  var RANK_TABLE = [
    { title: "Student Clinician", percent: 0 },
    { title: "Rookie Investigator", percent: 10 },
    { title: "Case Detective", percent: 30 },
    { title: "Senior Detective", percent: 55 },
    { title: "Chief Cardiac Detective", percent: 80 }
  ];

  var RANKS = RANK_TABLE.map(function (r) {
    return Object.freeze({ title: r.title, share: r.percent / 100 });
  });
  Object.freeze(RANKS);

  // ---------------------------------------------------------------------------
  // Content helpers (CCF.content is read at call time)
  // ---------------------------------------------------------------------------

  function content() {
    var c = CCF.content;
    return c && typeof c === "object" ? c : null;
  }

  function call(name, arg) {
    var c = content();
    if (!c || typeof c[name] !== "function") return null;
    try { return arg === undefined ? c[name]() : c[name](arg); } catch (e) { return null; }
  }

  function units() {
    var list = call("units");
    return Array.isArray(list) ? list.filter(function (u) { return u && typeof u.id === "string"; }) : [];
  }

  /** Every case in play order: unit by unit, then by order inside the unit. */
  function allCases() {
    var list = call("cases");
    return Array.isArray(list) ? list.filter(function (k) { return k && typeof k.id === "string"; }) : [];
  }

  function casesIn(unitId) {
    if (typeof unitId !== "string" || !unitId) return [];
    var list = call("cases", unitId);
    return Array.isArray(list) ? list.filter(function (k) { return k && typeof k.id === "string" && k.unit === unitId; }) : [];
  }

  /** A case definition from an id (or the object itself); null if unknown. */
  function getCase(idOrCase) {
    if (idOrCase && typeof idOrCase === "object") return typeof idOrCase.id === "string" ? idOrCase : null;
    if (typeof idOrCase !== "string" || !idOrCase) return null;
    var k = call("getCase", idOrCase);
    if (k && typeof k === "object" && k.id === idOrCase) return k;
    return null;
  }

  function unitOf(caseId) {
    var k = getCase(caseId);
    if (!k) return null;
    var u = call("unit", k.unit);
    if (u && typeof u === "object") return u;
    var list = units();
    for (var i = 0; i < list.length; i++) if (list[i].id === k.unit) return list[i];
    return null;
  }

  // ---------------------------------------------------------------------------
  // Profile helpers
  // ---------------------------------------------------------------------------

  function record(profile, caseId) {
    var all = profile && typeof profile === "object" ? profile.cases : null;
    if (!all || typeof all !== "object" || typeof caseId !== "string" || !hasOwn.call(all, caseId)) return null;
    var rec = all[caseId];
    return rec && typeof rec === "object" ? rec : null;
  }

  function isSolved(profile, caseId) {
    var rec = record(profile, caseId);
    return !!(rec && rec.solved === true);
  }

  function inProgress(profile, caseId) {
    var rec = record(profile, caseId);
    return !!(rec && rec.current && typeof rec.current === "object");
  }

  /** Saved best stars for a case (0 if not solved). */
  function bestStars(profile, caseId) {
    var rec = record(profile, caseId);
    if (!rec || rec.solved !== true) return 0;
    var stars = Math.floor(Number(rec.bestStars));
    if (!isFinite(stars)) return 1;
    return Math.min(3, Math.max(1, stars));
  }

  function playedAt(profile, caseId) {
    var rec = record(profile, caseId);
    var t = rec && typeof rec.lastPlayedAt === "string" ? Date.parse(rec.lastPlayedAt) : NaN;
    return isFinite(t) ? t : -Infinity;
  }

  // ---------------------------------------------------------------------------
  // Stars, XP, ranks
  // ---------------------------------------------------------------------------

  function wholeNumber(value) {
    var n = Math.floor(Number(value));
    return isFinite(n) ? n : 0;
  }

  /** Stars for a solve: 0 strikes → 3; strikes ≤ ⌈steps ÷ 2⌉ → 2; otherwise 1. */
  function starsFor(strikes, stepCount) {
    var s = Math.max(0, wholeNumber(strikes));
    if (stepCount && typeof stepCount === "object" && Array.isArray(stepCount.steps)) stepCount = stepCount.steps.length;
    var steps = Math.max(1, wholeNumber(stepCount));
    if (s === 0) return 3;
    if (s <= Math.ceil(steps / 2)) return 2;
    return 1;
  }

  function baseXp(difficulty) {
    return typeof difficulty === "string" && hasOwn.call(DIFFICULTY_XP, difficulty) ? DIFFICULTY_XP[difficulty] : DIFFICULTY_XP.easy;
  }

  /** XP for a case (definition or id) solved with `stars` stars; 0 for an unknown case. */
  function xpFor(caseDef, stars) {
    var k = getCase(caseDef);
    if (!k) return 0;
    var s = Math.min(3, Math.max(0, wholeNumber(stars)));
    return Math.round((baseXp(k.difficulty) * s) / 3);
  }

  /** The most XP the loaded cases can give (every case at 3 stars). */
  function maxXp() {
    var total = 0;
    allCases().forEach(function (k) { total += xpFor(k, 3); });
    return total;
  }

  /** XP the profile has earned (from its best stars; ids that aren't in the content count 0). */
  function totalXp(profile) {
    var total = 0;
    allCases().forEach(function (k) { total += xpFor(k, bestStars(profile, k.id)); });
    return total;
  }

  /** Minimum XP for each rank for a given maximum. */
  function thresholds(max) {
    return RANK_TABLE.map(function (r, i) {
      if (i === 0) return 0;
      return Math.max(1, Math.ceil((r.percent * max) / 100));
    });
  }

  /**
   * Rank for an amount of XP: { index, title, minXp, nextTitle, nextXp, fraction, share, maxXp }.
   * fraction is the progress from this rank to the next (1 at the top rank).
   * `max` defaults to maxXp() for the loaded content.
   */
  function rankFor(xp, max) {
    var value = Math.max(0, wholeNumber(xp));
    var top = max === undefined || max === null ? maxXp() : Math.max(0, wholeNumber(max));
    var mins = thresholds(top);
    var index = 0;
    for (var i = 0; i < mins.length; i++) if (value >= mins[i]) index = i;
    var hasNext = index < RANK_TABLE.length - 1;
    var nextXp = hasNext ? mins[index + 1] : null;
    var fraction = 1;
    if (hasNext) {
      var span = nextXp - mins[index];
      fraction = span > 0 ? Math.min(1, Math.max(0, (value - mins[index]) / span)) : 0;
    }
    return {
      index: index,
      title: RANK_TABLE[index].title,
      minXp: mins[index],
      nextTitle: hasNext ? RANK_TABLE[index + 1].title : null,
      nextXp: nextXp,
      fraction: fraction,
      share: RANKS[index].share,
      maxXp: top
    };
  }

  // ---------------------------------------------------------------------------
  // Unlocks
  // ---------------------------------------------------------------------------

  function unlockAll() {
    var config = CCF.config || {};
    return config.unlockAll === true;
  }

  function isUnlocked(profile, caseId) {
    var k = getCase(caseId);
    if (!k || typeof caseId !== "string") return false;
    if (unlockAll() || isSolved(profile, k.id) || inProgress(profile, k.id)) return true;
    var list = casesIn(k.unit);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === k.id) return i === 0 || isSolved(profile, list[i - 1].id);
    }
    return false;
  }

  /** "solved" | "in-progress" | "open" | "locked" (null for an unknown id). */
  function caseState(profile, caseId) {
    if (!getCase(caseId) || typeof caseId !== "string") return null;
    if (isSolved(profile, caseId)) return "solved";
    if (inProgress(profile, caseId)) return "in-progress";
    return isUnlocked(profile, caseId) ? "open" : "locked";
  }

  // ---------------------------------------------------------------------------
  // Statistics and navigation
  // ---------------------------------------------------------------------------

  function statsOf(list, profile) {
    var solved = 0, stars = 0, xp = 0, max = 0, busy = 0;
    list.forEach(function (k) {
      var s = bestStars(profile, k.id);
      if (isSolved(profile, k.id)) solved++;
      if (inProgress(profile, k.id)) busy++;
      stars += s;
      xp += xpFor(k, s);
      max += xpFor(k, 3);
    });
    return { solved: solved, total: list.length, stars: stars, maxStars: list.length * 3, inProgress: busy, xp: xp, maxXp: max };
  }

  /** { solved, total, stars, maxStars, inProgress, xp, maxXp, complete } for one unit. */
  function unitStats(profile, unitId) {
    var s = statsOf(casesIn(unitId), profile);
    return {
      solved: s.solved, total: s.total, stars: s.stars, maxStars: s.maxStars, inProgress: s.inProgress,
      xp: s.xp, maxXp: s.maxXp, complete: s.total > 0 && s.solved === s.total
    };
  }

  /** { solved, total, stars, maxStars, xp, complete, maxXp, inProgress, percent } over all cases. */
  function overall(profile) {
    var s = statsOf(allCases(), profile);
    return {
      solved: s.solved, total: s.total, stars: s.stars, maxStars: s.maxStars, xp: s.xp,
      complete: s.total > 0 && s.solved === s.total,
      maxXp: s.maxXp, inProgress: s.inProgress,
      percent: s.total ? Math.round((100 * s.solved) / s.total) : 0
    };
  }

  /** The most recently played case in `list` that is in progress (ties: play order). */
  function mostRecent(profile, list) {
    var best = null, bestAt = -Infinity;
    list.forEach(function (k) {
      if (!inProgress(profile, k.id)) return;
      var at = playedAt(profile, k.id);
      if (best === null || at > bestAt) { best = k; bestAt = at; }
    });
    return best;
  }

  /** Where "Continue" goes (see the header). */
  function nextCase(profile) {
    var list = allCases();
    var busy = mostRecent(profile, list.filter(function (k) { return !isSolved(profile, k.id); }));
    if (busy) return busy;
    for (var i = 0; i < list.length; i++) {
      if (!isSolved(profile, list[i].id) && isUnlocked(profile, list[i].id)) return list[i];
    }
    return mostRecent(profile, list);
  }

  /** The "Next case" after closing caseId (see the header). */
  function nextAfter(profile, caseId) {
    var k = getCase(caseId);
    if (k) {
      var list = casesIn(k.unit);
      var at = -1;
      for (var i = 0; i < list.length; i++) if (list[i].id === k.id) at = i;
      var order = list.slice(at + 1).concat(list.slice(0, Math.max(0, at)));
      for (var j = 0; j < order.length; j++) {
        if (!isSolved(profile, order[j].id) && isUnlocked(profile, order[j].id)) return order[j];
      }
    }
    var next = nextCase(profile);
    return next && (!k || next.id !== k.id) ? next : null;
  }

  function caseNumber(k) {
    var n = call("caseNumber", k);
    if (typeof n === "string" && n) return n;
    var u = unitOf(k.id);
    return u && u.order !== undefined ? u.order + "." + k.order : String(k.order || "");
  }

  function dateOrNull(value) {
    return typeof value === "string" && isFinite(Date.parse(value)) ? value : null;
  }

  /** Data for the case log and the printable progress report (see the header). */
  function report(profile) {
    var all = overall(profile);
    return {
      name: profile && typeof profile.name === "string" ? profile.name : "",
      xp: all.xp,
      maxXp: all.maxXp,
      rank: rankFor(all.xp),
      overall: all,
      units: units().map(function (u) {
        return {
          id: u.id,
          order: u.order,
          title: u.title,
          stats: unitStats(profile, u.id),
          cases: casesIn(u.id).map(function (k) {
            var rec = record(profile, k.id);
            var solved = isSolved(profile, k.id);
            var stars = bestStars(profile, k.id);
            var strikes = solved && rec && isFinite(Number(rec.bestStrikes)) && rec.bestStrikes !== null ? Math.max(0, wholeNumber(rec.bestStrikes)) : null;
            return {
              id: k.id,
              number: caseNumber(k),
              title: k.title,
              difficulty: k.difficulty,
              patient: k.patient && typeof k.patient.name === "string" ? k.patient.name : "",
              state: caseState(profile, k.id),
              solved: solved,
              stars: stars,
              bestStrikes: strikes,
              plays: rec ? Math.max(0, wholeNumber(rec.plays)) : 0,
              xp: xpFor(k, stars),
              firstSolvedAt: solved && rec ? dateOrNull(rec.firstSolvedAt) : null,
              lastPlayedAt: rec ? dateOrNull(rec.lastPlayedAt) : null,
              inProgress: inProgress(profile, k.id),
              unlocked: isUnlocked(profile, k.id)
            };
          })
        };
      })
    };
  }

  CCF.Progress = {
    RANKS: RANKS,
    DIFFICULTY_XP: DIFFICULTY_XP,
    starsFor: starsFor,
    xpFor: xpFor,
    maxXp: maxXp,
    totalXp: totalXp,
    rankFor: rankFor,
    isUnlocked: isUnlocked,
    unitStats: unitStats,
    overall: overall,
    nextCase: nextCase,
    // Extras.
    nextAfter: nextAfter,
    caseState: caseState,
    isSolved: isSolved,
    inProgress: inProgress,
    bestStars: bestStars,
    allCases: allCases,
    getCase: getCase,
    unitOf: unitOf,
    report: report
  };
})(typeof window !== "undefined" ? window : globalThis);
