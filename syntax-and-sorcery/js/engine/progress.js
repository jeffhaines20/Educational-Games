/*
 * Pyromancer — SS.Progress: stars, XP, ranks and unlocks.
 *
 * Pure, deterministic functions over SS.content (the registered chapters) and a
 * profile (see SS.Save). No DOM, no storage, no clock. Every function accepts a
 * missing/partial profile and any amount of content (even none), and never throws
 * for unknown ids.
 *
 * Rules (docs/DESIGN.md §4.4):
 *   * Chapter 1 is open; chapter n opens when every challenge in chapter n-1 is complete.
 *   * Inside a chapter, challenge i opens when challenge i-1 is complete.
 *   * Free practice (profile setting or SS.config.unlockAll) opens everything.
 *   * Anything the player has already completed stays open.
 *   * Stars: 3 with no hints, 2 with one hint, 1 with two or more hints or after the
 *     Answer Scroll. XP = round(DIFFICULTIES[d].xp × stars / 3).
 *   * Ranks by share of the maximum XP (see RANKS).
 *
 * This file loads before the content registry, so SS.content and SS.DIFFICULTIES are
 * looked up when a function is called, not when the file loads.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});

  var FALLBACK_XP = { easy: 10, medium: 20, hard: 30 };

  // percent is the exact integer share; `share` is the same value as a fraction.
  var RANK_TABLE = [
    { title: "Novice", icon: "🕯️", percent: 0 },
    { title: "Apprentice", icon: "📜", percent: 4 },
    { title: "Initiate", icon: "🔮", percent: 12 },
    { title: "Adept", icon: "⚗️", percent: 25 },
    { title: "Conjurer", icon: "✨", percent: 45 },
    { title: "Sorcerer", icon: "⚡", percent: 65 },
    { title: "Archmage", icon: "🧙", percent: 85 }
  ];

  var RANKS = RANK_TABLE.map(function (r) {
    return Object.freeze({ title: r.title, icon: r.icon, share: r.percent / 100 });
  });
  Object.freeze(RANKS);

  var hasOwn = Object.prototype.hasOwnProperty;

  // ---------------------------------------------------------------------------
  // Content helpers
  // ---------------------------------------------------------------------------

  function chapters() {
    var content = SS.content;
    return content && Array.isArray(content.chapters) ? content.chapters : [];
  }

  function challengesOf(chapter) {
    return chapter && Array.isArray(chapter.challenges) ? chapter.challenges : [];
  }

  /** Every challenge in play order: chapter by chapter, then in each chapter's order. */
  function allChallenges() {
    var list = [];
    chapters().forEach(function (chapter) {
      challengesOf(chapter).forEach(function (challenge) { list.push(challenge); });
    });
    return list;
  }

  function findChapter(chapterId) {
    var list = chapters();
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === chapterId) return list[i];
    return null;
  }

  /** The chapter object containing a challenge id (or null). */
  function chapterOf(challengeId) {
    var list = chapters();
    for (var i = 0; i < list.length; i++) {
      var items = challengesOf(list[i]);
      for (var j = 0; j < items.length; j++) if (items[j] && items[j].id === challengeId) return list[i];
    }
    return null;
  }

  function getChallenge(idOrChallenge) {
    if (idOrChallenge && typeof idOrChallenge === "object") return idOrChallenge;
    var content = SS.content;
    if (content && content.challengesById && hasOwn.call(content.challengesById, idOrChallenge)) {
      return content.challengesById[idOrChallenge];
    }
    var list = allChallenges();
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === idOrChallenge) return list[i];
    return null;
  }

  // ---------------------------------------------------------------------------
  // Profile helpers
  // ---------------------------------------------------------------------------

  function record(profile, challengeId) {
    var all = profile && profile.challenges;
    if (!all || typeof all !== "object" || !hasOwn.call(all, challengeId)) return null;
    var rec = all[challengeId];
    return rec && typeof rec === "object" ? rec : null;
  }

  function isComplete(profile, challengeId) {
    var rec = record(profile, challengeId);
    return !!(rec && rec.completed === true);
  }

  /** Saved best stars for a challenge (0 if not completed). */
  function savedStars(profile, challengeId) {
    var rec = record(profile, challengeId);
    if (!rec || rec.completed !== true) return 0;
    var stars = Math.floor(Number(rec.stars));
    if (!isFinite(stars)) return 1;
    return Math.min(3, Math.max(1, stars));
  }

  // ---------------------------------------------------------------------------
  // Stars, XP, ranks
  // ---------------------------------------------------------------------------

  /** Stars for a completion: 3 (no hints), 2 (one hint), 1 (2+ hints or the Answer Scroll). */
  function starsFor(state) {
    state = state || {};
    if (state.answerRevealed) return 1;
    var hints = Math.floor(Number(state.hintsUsed) || 0);
    if (hints <= 0) return 3;
    if (hints === 1) return 2;
    return 1;
  }

  function difficultyXp(difficulty) {
    var table = SS.DIFFICULTIES;
    if (table && hasOwn.call(table, difficulty) && table[difficulty] && isFinite(table[difficulty].xp)) {
      return Number(table[difficulty].xp);
    }
    return hasOwn.call(FALLBACK_XP, difficulty) ? FALLBACK_XP[difficulty] : FALLBACK_XP.easy;
  }

  /** XP for a challenge (object or id) completed with `stars` stars. */
  function xpFor(challenge, stars) {
    var ch = getChallenge(challenge);
    if (!ch) return 0;
    var s = Math.min(3, Math.max(0, Math.floor(Number(stars) || 0)));
    return Math.round((difficultyXp(ch.difficulty) * s) / 3);
  }

  /** XP the profile has earned (derived from saved stars; unknown ids are ignored). */
  function totalXp(profile) {
    var total = 0;
    allChallenges().forEach(function (ch) {
      if (ch) total += xpFor(ch, savedStars(profile, ch.id));
    });
    return total;
  }

  /** The most XP the current content can give (every challenge at 3 stars). */
  function maxXp() {
    var total = 0;
    allChallenges().forEach(function (ch) { if (ch) total += xpFor(ch, 3); });
    return total;
  }

  /** Minimum XP for each rank, for a given maximum. Ranks above Novice need at least 1 XP. */
  function thresholds(max) {
    return RANK_TABLE.map(function (r, i) {
      if (i === 0) return 0;
      return Math.max(1, Math.ceil((r.percent * max) / 100));
    });
  }

  /**
   * Rank for an amount of XP:
   *   { index, title, icon, minXp, nextTitle, nextXp, fraction }
   * fraction is the progress from this rank to the next (1 at the top rank).
   * `max` defaults to maxXp() for the loaded content.
   */
  function rankFor(xp, max) {
    var value = Math.max(0, Math.floor(Number(xp) || 0));
    var top = max === undefined ? maxXp() : Math.max(0, Math.floor(Number(max) || 0));
    var mins = thresholds(top);
    var index = 0;
    for (var i = 0; i < mins.length; i++) if (value >= mins[i]) index = i;
    var rank = RANK_TABLE[index];
    var hasNext = index < RANK_TABLE.length - 1;
    var nextXp = hasNext ? mins[index + 1] : null;
    var fraction = 1;
    if (hasNext) {
      var span = nextXp - mins[index];
      fraction = span > 0 ? Math.min(1, Math.max(0, (value - mins[index]) / span)) : 0;
    }
    return {
      index: index,
      title: rank.title,
      icon: rank.icon,
      minXp: mins[index],
      nextTitle: hasNext ? RANK_TABLE[index + 1].title : null,
      nextXp: nextXp,
      fraction: fraction
    };
  }

  // ---------------------------------------------------------------------------
  // Unlocks
  // ---------------------------------------------------------------------------

  /** Free practice: the profile's setting OR SS.config.unlockAll. */
  function unlockAll(profile) {
    var config = SS.config || {};
    return !!(config.unlockAll === true ||
      (profile && profile.settings && profile.settings.unlockAll === true));
  }

  function chapterHasCompletion(profile, chapter) {
    return challengesOf(chapter).some(function (ch) { return ch && isComplete(profile, ch.id); });
  }

  function chapterComplete(profile, chapter) {
    var items = challengesOf(chapter);
    return items.length > 0 && items.every(function (ch) { return ch && isComplete(profile, ch.id); });
  }

  function isChapterUnlocked(profile, chapterId) {
    var list = chapters();
    var index = -1;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === chapterId) { index = i; break; }
    if (index === -1) return false;
    if (index === 0 || unlockAll(profile)) return true;
    if (chapterHasCompletion(profile, list[index])) return true;
    return chapterComplete(profile, list[index - 1]);
  }

  function isChallengeUnlocked(profile, challengeId) {
    var chapter = chapterOf(challengeId);
    if (!chapter) return false;
    if (unlockAll(profile) || isComplete(profile, challengeId)) return true;
    if (!isChapterUnlocked(profile, chapter.id)) return false;
    var items = challengesOf(chapter);
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].id === challengeId) return i === 0 || isComplete(profile, items[i - 1] && items[i - 1].id);
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Statistics and navigation
  // ---------------------------------------------------------------------------

  /** { completed, total, stars, maxStars, complete } for one chapter. */
  function chapterStats(profile, chapterId) {
    var items = challengesOf(findChapter(chapterId));
    var completed = 0, stars = 0;
    items.forEach(function (ch) {
      if (!ch) return;
      if (isComplete(profile, ch.id)) completed++;
      stars += savedStars(profile, ch.id);
    });
    return {
      completed: completed,
      total: items.length,
      stars: stars,
      maxStars: items.length * 3,
      complete: items.length > 0 && completed === items.length
    };
  }

  /** { completed, total, stars, maxStars, xp, maxXp, percent } over all content. */
  function overallStats(profile) {
    var items = allChallenges();
    var completed = 0, stars = 0;
    items.forEach(function (ch) {
      if (!ch) return;
      if (isComplete(profile, ch.id)) completed++;
      stars += savedStars(profile, ch.id);
    });
    return {
      completed: completed,
      total: items.length,
      stars: stars,
      maxStars: items.length * 3,
      xp: totalXp(profile),
      maxXp: maxXp(),
      percent: items.length ? Math.round((100 * completed) / items.length) : 0
    };
  }

  /**
   * The challenge after `challengeId` in play order (same chapter, else the first of
   * the next chapter), or null if there is none or it is still locked.
   */
  function nextChallenge(profile, challengeId) {
    var items = allChallenges();
    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].id === challengeId) {
        var next = items[i + 1] || null;
        return next && isChallengeUnlocked(profile, next.id) ? next : null;
      }
    }
    return null;
  }

  /**
   * Where "Continue" should take the player: the first unlocked challenge that is not
   * complete, in play order. null when everything available is complete.
   */
  function firstIncomplete(profile) {
    var items = allChallenges();
    for (var i = 0; i < items.length; i++) {
      var ch = items[i];
      if (ch && !isComplete(profile, ch.id) && isChallengeUnlocked(profile, ch.id)) return ch;
    }
    return null;
  }

  SS.Progress = {
    RANKS: RANKS,
    starsFor: starsFor,
    xpFor: xpFor,
    totalXp: totalXp,
    maxXp: maxXp,
    rankFor: rankFor,
    isChapterUnlocked: isChapterUnlocked,
    isChallengeUnlocked: isChallengeUnlocked,
    chapterStats: chapterStats,
    overallStats: overallStats,
    nextChallenge: nextChallenge,
    firstIncomplete: firstIncomplete,
    unlockAll: unlockAll,
    // Small extras the UI may find handy.
    allChallenges: allChallenges,
    getChallenge: getChallenge,
    chapterOf: chapterOf,
    isComplete: isComplete,
    savedStars: savedStars
  };
})(typeof window !== "undefined" ? window : globalThis);
