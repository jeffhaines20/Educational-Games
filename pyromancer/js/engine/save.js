/*
 * Pyromancer — SS.Save: profiles, save slots, Save Scrolls and SCORM storage.
 *
 * See docs/DESIGN.md §5.3 for the API. Notes on behaviour:
 *   * Slots are numbered 0 .. saveSlots-1 (show them to players as 1, 2, 3).
 *     listSlots() gives null for an empty slot and { slot, damaged: true } for a slot
 *     whose save can't be read (the UI can offer to delete it).
 *   * getProfile() returns the live profile object: read it, but change it only
 *     through these functions so that changes are saved.
 *   * Important changes (casts, hints, completions, settings…) are written at once;
 *     drafts and practice code are debounced and written by flush(), which also runs
 *     on pagehide / visibilitychange.
 *   * onChange(cb) → cb(profile, { type, challengeId }) after every saved change except
 *     draft / practice-code autosaves (so editors aren't re-rendered on each keystroke).
 *     type "sync" means another tab of the game saved the same profile and its progress
 *     was merged in.
 *   * Two tabs on one save: before writing, the stored copy is merged in (best of each
 *     challenge; names, settings and drafts follow whichever tab changed them), and a
 *     `storage` event from another tab merges its changes straight away.
 *   * If localStorage is blocked or full, everything keeps working in memory and
 *     storageWarning() explains that the Save Scroll is needed. Writes that failed are
 *     retried with the next write; the warning stays until all of them succeed.
 *   * Imported data is sanitised: wrong types fall back to defaults, wizard names are
 *     cleaned (control characters removed, at most 24 characters) and unknown fields
 *     are dropped. Save codes start with "PYRO1." (older "SNS1." codes still import).
 *   * SCORM mode (an LMS API was found): one profile, no slots. Compact progress lives
 *     in cmi.suspend_data (always ≤ 4000 characters: challenge ids and "seen" keys are
 *     stored as 6-character hashes), drafts and code stay in localStorage keyed by the
 *     learner id. On init the LMS data is merged with the local copy, taking the best
 *     of each challenge; the LMS wins for name and settings. A fresh attempt (also after
 *     an instructor reset) keeps only the wizard's name, settings and code from the
 *     local copy. Values are sent only when they change; commits happen at once after a
 *     completion and when the page is hidden or closed, otherwise at most once a minute.
 *     Importing a Save Scroll is off unless SS.config.scorm.allowImport is true.
 *   * SS.config.scormRequired (set by tools/build.py in the SCORM package): if no LMS
 *     connection can be made after a few tries (~2.5 s, during init()), the game runs
 *     with local saves and storageWarning() says that nothing reaches the course.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});

  var hasOwn = Object.prototype.hasOwnProperty;

  var PROFILE_VERSION = 1;
  var FILE_FORMAT = "pyromancer-save";
  var LEGACY_FILE_FORMATS = ["syntax-and-sorcery-save"];
  var CODE_PREFIX = "PYRO1.";
  var CODE_RE = /^(PYRO|SNS)(\d+)\./i;  // "SNS1." codes come from before the game was renamed
  var SUSPEND_PREFIX = "S1";
  var SUSPEND_BUDGET = 4000;           // fits SCORM 1.2 (4096) and SCORM 2004 2nd edition (4000)
  var DRAFT_DELAY_MS = 800;
  var COMMIT_INTERVAL_MS = 60000;      // routine LMS commits: at most once a minute
  var SCORM_RETRY_DELAYS_MS = [250, 500, 750, 1000];
  var MAX_NAME = 24;
  var MAX_CODE = 200000;               // characters per draft / bestCode / practice code
  var MAX_IMPORT = 20 * 1024 * 1024;
  var MAX_CHALLENGES = 2000;
  var MAX_SEEN = 2000;
  var MAX_HINTS = 20;
  var MAX_COUNT = 1000000;
  var DEFAULT_NAME = "Apprentice";
  var DEFAULT_SETTINGS = { sound: true, reduceMotion: false, editorFontSize: 15, unlockAll: false };
  var FONT_MIN = 10, FONT_MAX = 32;

  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
  var PROFILE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  // Control and invisible formatting characters (ZWJ/ZWNJ are kept: emoji and some scripts need them).
  var CONTROL_CLASS = "[\\u0000-\\u001F\\u007F-\\u009F\\u200B\\u200E\\u200F\\u2028-\\u202E\\u2060-\\u2064\\u2066-\\u2069\\uFEFF\\uFFF9-\\uFFFB]";
  var CONTROL_RE = new RegExp(CONTROL_CLASS, "g");     // for replace()
  var HAS_CONTROL_RE = new RegExp(CONTROL_CLASS);      // for test(): no lastIndex state
  var LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

  var MSG = {
    blocked: "This browser is blocking saved games (for example in a private window or on a locked-down " +
      "computer), so your progress will only last until you close this page. Use the Save Scroll to keep it.",
    full: "This browser's storage is full, so your latest progress could not be saved here. " +
      "Use the Save Scroll to keep it.",
    scormLocal: "This browser is blocking local storage, so unfinished code drafts won't be kept. " +
      "Your progress is still saved by your course.",
    scormFailed: "Your progress couldn't be sent to your course just now. It is still saved in this browser; " +
      "it will be sent again with your next spell.",
    scormMissing: "This activity couldn't connect to your course, so your progress and score aren't being " +
      "recorded. Close it and reopen it from the course.",
    importOff: "Your course saves your progress automatically, so importing is turned off here.",
    empty: "Paste a save code or choose a Save Scroll file first.",
    notScroll: "That doesn't look like a Save Scroll. Paste the whole save code (it starts with PYRO1.) " +
      "or choose the .json file you downloaded.",
    damaged: "This Save Scroll is damaged or incomplete — part of it may be missing. Copy the whole code " +
      "(or download the file) again and retry.",
    newer: "This Save Scroll was made by a newer version of Pyromancer. Open the newer version of the " +
      "game to use it.",
    tooBig: "That file is far too large to be a Save Scroll.",
    badSlot: function (n) { return "Choose a save slot from 1 to " + n + "."; }
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  var initialised = false;
  var initResult = null;
  var initPromise = null;
  var local = null;          // a working localStorage object, or null
  var localBlocked = false;  // localStorage can't be used at all
  var probeFailed = false;   // localStorage was already full when the game started
  var memory = {};           // values not (yet) in localStorage: the newest copy of each key
  var failedKeys = {};       // keys whose last write to localStorage failed (retried with every write)
  var lastSeen = {};         // key → the JSON this tab last read from / wrote to localStorage
  var scormMode = false;
  var scormMissing = false;  // SCORM package, but no LMS connection could be made
  var lmsFailing = false;    // the LMS rejected the last save
  var lastCommitAt = 0;
  var commitTimer = null;
  var learner = null;        // { id, name } in SCORM mode
  var active = null;         // { slot, profile }
  var listeners = [];
  var draftTimer = null;
  var pending = false;       // unsaved draft / practice changes
  var looseCode = "";        // practice code when no profile is active
  var scormExtras = { entries: [], seen: [] };   // suspend_data items we couldn't match (kept as-is)

  function config() { return SS.config || {}; }

  function prefix() {
    var key = config().storageKey;
    return typeof key === "string" && key ? key : "pyromancer";
  }

  function slotCount() {
    var n = Math.floor(Number(config().saveSlots));
    return n >= 1 && n <= 10 ? n : 3;
  }

  function slotKey(slot) { return prefix() + ":slot:" + slot; }
  function lastSlotKey() { return prefix() + ":lastSlot"; }
  function scormKey() {
    var id = learner && learner.id ? learner.id : "anonymous";
    var safe;
    try { safe = encodeURIComponent(id); } catch (e) { safe = "learner-" + hash6(id); }
    return prefix() + ":scorm:" + safe;
  }

  function warn(message, error) {
    try { if (global.console && global.console.warn) global.console.warn("[SS.Save] " + message, error || ""); } catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function clampInt(value, min, max, fallback) {
    var n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    if (typeof n !== "number" || !isFinite(n)) return fallback;
    n = Math.floor(n);
    return Math.min(max, Math.max(min, n));
  }

  function nowISO() { return new Date().toISOString(); }

  /** A valid date (string or epoch ms) as an ISO string, else the fallback. */
  function isoOr(value, fallback) {
    if (typeof value !== "string" && typeof value !== "number") return fallback;
    try {
      var d = new Date(value);
      var t = d.getTime();
      if (!isFinite(t)) return fallback;
      var year = d.getUTCFullYear();
      if (year < 2000 || year > 2200) return fallback;
      return d.toISOString();
    } catch (e) {
      return fallback;
    }
  }

  function makeId() {
    var rand = "";
    try {
      var c = global.crypto;
      if (c && c.getRandomValues) {
        var a = new Uint32Array(2);
        c.getRandomValues(a);
        rand = a[0].toString(36) + a[1].toString(36);
      }
    } catch (e) { rand = ""; }
    if (!rand) rand = Math.floor(Math.random() * 1e12).toString(36) + Math.floor(Math.random() * 1e12).toString(36);
    return ("w" + Date.now().toString(36) + rand).slice(0, 40);
  }

  function stripLoneSurrogates(text) {
    return text.replace(LONE_SURROGATE_RE, function (match, before) { return before || ""; });
  }

  /** Clean a wizard name: no control characters, single spaces, at most 24 characters. */
  function cleanName(name) {
    if (typeof name !== "string") name = name === null || name === undefined ? "" : String(name);
    name = stripLoneSurrogates(name.replace(/[\t\n\r\v\f]/g, " ").replace(CONTROL_RE, ""))
      .replace(/\s+/g, " ").trim();
    var chars = Array.from(name);
    if (chars.length > MAX_NAME) name = chars.slice(0, MAX_NAME).join("").replace(/\u200D+$/, "").trim();
    return name;
  }

  function cleanCode(code) {
    if (typeof code !== "string") return null;
    if (code.length > MAX_CODE) return null;
    return stripLoneSurrogates(code);
  }

  function validId(id) {
    return typeof id === "string" && ID_RE.test(id);
  }

  function validSeenKey(key) {
    return typeof key === "string" && key.length > 0 && key.length <= 200 && key !== "__proto__" &&
      !HAS_CONTROL_RE.test(key);
  }

  /** FNV-1a, folded to 6 base-36 characters. Used for compact SCORM ids. */
  function hash6(text) {
    var h = 0x811c9dc5;
    text = String(text);
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    var s = (h % 2176782336).toString(36);          // 36^6
    while (s.length < 6) s = "0" + s;
    return s;
  }

  // ---------------------------------------------------------------------------
  // UTF-8 + base64url (no dependency on btoa/TextEncoder)
  // ---------------------------------------------------------------------------

  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  function utf8Encode(text) {
    var bytes = [];
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
        var d = text.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
        else c = 0xfffd;
      } else if (c >= 0xd800 && c <= 0xdfff) {
        c = 0xfffd;
      }
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return bytes;
  }

  function utf8Decode(bytes) {
    var out = "";
    for (var i = 0; i < bytes.length;) {
      var b = bytes[i];
      var c = 0xfffd, need = 0;
      if (b < 0x80) { c = b; need = 0; }
      else if (b >= 0xc2 && b < 0xe0) { c = b & 31; need = 1; }
      else if (b >= 0xe0 && b < 0xf0) { c = b & 15; need = 2; }
      else if (b >= 0xf0 && b < 0xf5) { c = b & 7; need = 3; }
      else { out += "\uFFFD"; i++; continue; }
      var ok = true;
      for (var k = 1; k <= need; k++) {
        var n = bytes[i + k];
        if (n === undefined || (n & 0xc0) !== 0x80) { ok = false; break; }
        c = (c << 6) | (n & 63);
      }
      if (!ok) { out += "\uFFFD"; i++; continue; }
      i += need + 1;
      var overlong = (need === 2 && c < 0x800) || (need === 3 && c < 0x10000);
      if (overlong || c > 0x10ffff || (c >= 0xd800 && c <= 0xdfff)) { out += "\uFFFD"; continue; }
      if (c >= 0x10000) {
        c -= 0x10000;
        out += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023));
      } else {
        out += String.fromCharCode(c);
      }
    }
    return out;
  }

  function base64urlEncode(bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      out += B64.charAt(n >> 18) + B64.charAt((n >> 12) & 63);
      if (i + 1 < bytes.length) out += B64.charAt((n >> 6) & 63);
      if (i + 2 < bytes.length) out += B64.charAt(n & 63);
    }
    return out;
  }

  /** Decode base64url (standard base64 and padding are accepted too). null if invalid. */
  function base64urlDecode(text) {
    text = String(text).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    if (text.length % 4 === 1) return null;
    var bytes = [];
    var buffer = 0, bits = 0;
    for (var i = 0; i < text.length; i++) {
      var v = B64.indexOf(text.charAt(i));
      if (v === -1) return null;
      buffer = (buffer << 6) | v;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buffer >> bits) & 255);
      }
    }
    return bytes;
  }

  // ---------------------------------------------------------------------------
  // Storage (localStorage with an in-memory fallback)
  // ---------------------------------------------------------------------------

  function openLocalStorage() {
    var ls = null;
    try { ls = global.localStorage; } catch (e) { return { ls: null, writable: false }; }
    if (!ls) return { ls: null, writable: false };
    var readable = false;
    try { ls.getItem(prefix() + ":probe"); readable = true; } catch (e) { readable = false; }
    if (!readable) return { ls: null, writable: false };
    var writable = false;
    try {
      ls.setItem(prefix() + ":probe", "1");
      writable = ls.getItem(prefix() + ":probe") === "1";
      ls.removeItem(prefix() + ":probe");
    } catch (e) {
      writable = false;
    }
    return { ls: ls, writable: writable };
  }

  /** What localStorage itself holds (ignoring values only kept in memory). */
  function readStored(key) {
    if (!local) return null;
    try {
      var value = local.getItem(key);
      return typeof value === "string" ? value : null;
    } catch (e) {
      return null;
    }
  }

  /** The newest value of a key: one that couldn't be stored yet, else localStorage's. */
  function readKey(key) {
    if (hasOwn.call(memory, key)) return memory[key];
    return readStored(key);
  }

  function trySet(key, value) {
    try {
      local.setItem(key, value);
    } catch (e) {
      if (!failedKeys[key]) warn("could not write " + key + " to localStorage", e);
      failedKeys[key] = true;
      return false;
    }
    delete memory[key];
    delete failedKeys[key];
    probeFailed = false;
    lastSeen[key] = value;
    return true;
  }

  /** Write a key (kept in memory if localStorage refuses). Also retries earlier failed writes. */
  function writeKey(key, value) {
    memory[key] = value;
    if (!local) return false;
    var ok = trySet(key, value);
    Object.keys(failedKeys).forEach(function (other) {
      if (other !== key && hasOwn.call(memory, other)) trySet(other, memory[other]);
    });
    return ok;
  }

  function removeKey(key) {
    delete memory[key];
    delete failedKeys[key];
    delete lastSeen[key];
    if (!local) return;
    try { local.removeItem(key); } catch (e) { /* ignore */ }
  }

  function storageFailing() {
    return localBlocked || probeFailed || Object.keys(failedKeys).length > 0;
  }

  /** The most important problem the player should know about, or null. */
  function currentWarning() {
    if (scormMissing) return MSG.scormMissing;
    if (scormMode) {
      if (lmsFailing) return MSG.scormFailed;
      return storageFailing() ? MSG.scormLocal : null;
    }
    if (localBlocked) return MSG.blocked;
    return storageFailing() ? MSG.full : null;
  }

  function parseJSON(text) {
    if (typeof text !== "string" || !text) return null;
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  // ---------------------------------------------------------------------------
  // Profiles: creation and sanitising
  // ---------------------------------------------------------------------------

  function defaultSettings() {
    return {
      sound: DEFAULT_SETTINGS.sound,
      reduceMotion: DEFAULT_SETTINGS.reduceMotion,
      editorFontSize: DEFAULT_SETTINGS.editorFontSize,
      unlockAll: DEFAULT_SETTINGS.unlockAll
    };
  }

  function emptyRecord() {
    return {
      completed: false, stars: 0, casts: 0, failedCasts: 0, hintsUsed: 0,
      answerRevealed: false, draft: null, bestCode: null, completedAt: null
    };
  }

  function newProfile(name) {
    var t = nowISO();
    return {
      version: PROFILE_VERSION,
      id: makeId(),
      wizardName: cleanName(name) || DEFAULT_NAME,
      createdAt: t,
      updatedAt: t,
      challenges: {},
      seen: {},
      settings: defaultSettings(),
      practiceCode: "",
      lastChallengeId: null
    };
  }

  function sanitizeSettings(raw, base) {
    var s = base ? {
      sound: base.sound, reduceMotion: base.reduceMotion, editorFontSize: base.editorFontSize, unlockAll: base.unlockAll
    } : defaultSettings();
    if (!isPlainObject(raw)) return s;
    if (typeof raw.sound === "boolean") s.sound = raw.sound;
    if (typeof raw.reduceMotion === "boolean") s.reduceMotion = raw.reduceMotion;
    if (raw.editorFontSize !== undefined) s.editorFontSize = clampInt(raw.editorFontSize, FONT_MIN, FONT_MAX, s.editorFontSize);
    if (typeof raw.unlockAll === "boolean") s.unlockAll = raw.unlockAll;
    return s;
  }

  function sanitizeRecord(raw) {
    if (!isPlainObject(raw)) return null;
    var rec = emptyRecord();
    rec.completed = raw.completed === true;
    rec.stars = rec.completed ? clampInt(raw.stars, 1, 3, 1) : 0;
    rec.casts = clampInt(raw.casts, 0, MAX_COUNT, 0);
    rec.failedCasts = clampInt(raw.failedCasts, 0, MAX_COUNT, 0);
    rec.hintsUsed = clampInt(raw.hintsUsed, 0, MAX_HINTS, 0);
    rec.answerRevealed = raw.answerRevealed === true;
    rec.draft = cleanCode(raw.draft);
    rec.bestCode = cleanCode(raw.bestCode);
    rec.completedAt = rec.completed ? isoOr(raw.completedAt, null) : null;
    return rec;
  }

  /** Turn anything (parsed JSON from storage or a file) into a valid profile, or null. */
  function sanitizeProfile(raw) {
    if (!isPlainObject(raw)) return null;
    var p = newProfile(raw.wizardName);
    if (typeof raw.id === "string" && PROFILE_ID_RE.test(raw.id)) p.id = raw.id;
    p.createdAt = isoOr(raw.createdAt, p.createdAt);
    p.updatedAt = isoOr(raw.updatedAt, p.createdAt);
    if (isPlainObject(raw.challenges)) {
      var ids = Object.keys(raw.challenges).slice(0, MAX_CHALLENGES);
      ids.forEach(function (id) {
        if (!validId(id)) return;
        var rec = sanitizeRecord(raw.challenges[id]);
        if (rec) p.challenges[id] = rec;
      });
    }
    var seenKeys = Array.isArray(raw.seen) ? raw.seen
      : isPlainObject(raw.seen) ? Object.keys(raw.seen).filter(function (k) { return raw.seen[k]; }) : [];
    seenKeys.slice(0, MAX_SEEN).forEach(function (key) {
      if (validSeenKey(key)) p.seen[key] = true;
    });
    p.settings = sanitizeSettings(raw.settings);
    p.practiceCode = cleanCode(raw.practiceCode) || "";
    p.lastChallengeId = validId(raw.lastChallengeId) ? raw.lastChallengeId : null;
    return p;
  }

  function copyRecord(rec) {
    var out = emptyRecord();
    Object.keys(out).forEach(function (k) { out[k] = rec[k]; });
    return out;
  }

  /** Best of two records (either may be null). Code comes from `primary` when it has some. */
  function mergeRecords(primary, other) {
    if (!primary && !other) return null;
    if (!primary) return copyRecord(other);
    if (!other) return copyRecord(primary);
    var r = emptyRecord();
    r.completed = primary.completed || other.completed;
    r.stars = r.completed ? Math.max(primary.completed ? primary.stars : 0, other.completed ? other.stars : 0, 1) : 0;
    r.casts = Math.max(primary.casts, other.casts);
    r.failedCasts = Math.max(primary.failedCasts, other.failedCasts);
    r.hintsUsed = Math.max(primary.hintsUsed, other.hintsUsed);
    r.answerRevealed = primary.answerRevealed || other.answerRevealed;
    r.draft = primary.draft !== null ? primary.draft : other.draft;
    // The best solution comes from the record with more stars (a tie keeps primary's).
    var otherBetter = other.completed && other.bestCode !== null &&
      (primary.bestCode === null || !primary.completed || other.stars > primary.stars);
    r.bestCode = otherBetter ? other.bestCode : (primary.bestCode !== null ? primary.bestCode : other.bestCode);
    var dates = [primary.completedAt, other.completedAt].filter(Boolean).sort();
    r.completedAt = r.completed ? (dates[0] || null) : null;
    return r;
  }

  /**
   * Merge `incoming` into `base` (both valid profiles) taking the best of each challenge.
   * With preferIncoming, the incoming name, settings and last challenge win.
   */
  function mergeProfiles(base, incoming, preferIncoming) {
    var out = sanitizeProfile(JSON.parse(JSON.stringify(base)));
    Object.keys(incoming.challenges).forEach(function (id) {
      out.challenges[id] = mergeRecords(out.challenges[id] || null, incoming.challenges[id]);
    });
    Object.keys(incoming.seen).forEach(function (key) { out.seen[key] = true; });
    if (preferIncoming) {
      out.wizardName = incoming.wizardName || out.wizardName;
      out.settings = sanitizeSettings(incoming.settings, out.settings);
      out.lastChallengeId = incoming.lastChallengeId || out.lastChallengeId;
    }
    if (!out.practiceCode && incoming.practiceCode) out.practiceCode = incoming.practiceCode;
    if (incoming.createdAt < out.createdAt) out.createdAt = incoming.createdAt;
    return out;
  }

  // ---------------------------------------------------------------------------
  // Progress helpers (SS.Progress loads after this file, so look it up lazily)
  // ---------------------------------------------------------------------------

  function progress() { return SS.Progress || null; }

  function contentChallenge(id) {
    var content = SS.content;
    if (content && content.challengesById && hasOwn.call(content.challengesById, id)) return content.challengesById[id];
    return null;
  }

  function contentIds() {
    var ids = [];
    var content = SS.content;
    if (content && Array.isArray(content.chapters)) {
      content.chapters.forEach(function (chapter) {
        (chapter && Array.isArray(chapter.challenges) ? chapter.challenges : []).forEach(function (ch) {
          if (ch && validId(ch.id)) ids.push(ch.id);
        });
      });
    }
    return ids;
  }

  function summary(slot, profile) {
    var P = progress();
    var stats = P ? P.overallStats(profile) : null;
    var completed = 0, stars = 0;
    if (!stats) {
      Object.keys(profile.challenges).forEach(function (id) {
        var rec = profile.challenges[id];
        if (rec.completed) { completed++; stars += rec.stars; }
      });
    }
    var xp = stats ? stats.xp : 0;
    var rank = P ? P.rankFor(xp) : { title: "Novice", icon: "" };
    return {
      slot: slot,
      wizardName: profile.wizardName,
      completed: stats ? stats.completed : completed,
      total: stats ? stats.total : 0,
      stars: stats ? stats.stars : stars,
      xp: xp,
      rankTitle: rank.title,
      rankIcon: rank.icon,
      updatedAt: profile.updatedAt
    };
  }

  // ---------------------------------------------------------------------------
  // SCORM: compact suspend_data
  //   S1|<flags><font>|<name>|<seen hashes>|<entries>|<last>
  //   entry = <id hash ×6><state><hints>[.<casts>[.<failed>[.<completed at>]]]  (base 36)
  //   state = completed + 2·answerRevealed + 4·stars
  // ---------------------------------------------------------------------------

  function b36(n) { return Math.max(0, Math.floor(n)).toString(36); }

  function encodeEntry(id, rec, opts) {
    var state = (rec.completed ? 1 : 0) + (rec.answerRevealed ? 2 : 0) + 4 * (rec.completed ? rec.stars : 0);
    var head = hash6(id) + b36(state) + b36(Math.min(35, rec.hintsUsed));
    var fields = [];
    if (opts.counts) fields.push(rec.casts ? b36(Math.min(46655, rec.casts)) : "", rec.failedCasts ? b36(Math.min(46655, rec.failedCasts)) : "");
    if (opts.dates && rec.completedAt) {
      while (fields.length < 2) fields.push("");
      fields.push(b36(Date.parse(rec.completedAt) / 1000));
    }
    while (fields.length && fields[fields.length - 1] === "") fields.pop();
    return fields.length ? head + "." + fields.join(".") : head;
  }

  function meaningful(rec) {
    return rec.completed || rec.hintsUsed > 0 || rec.answerRevealed || rec.casts > 0 || rec.failedCasts > 0;
  }

  function encodeName(name) {
    try {
      return encodeURIComponent(name).replace(/[!'()*~.]/g, function (c) {
        return "%" + c.charCodeAt(0).toString(16).toUpperCase();
      });
    } catch (e) {
      return "";
    }
  }

  function buildSuspend(profile, opts) {
    var s = profile.settings;
    var flags = (s.sound ? 1 : 0) + (s.reduceMotion ? 2 : 0) + (s.unlockAll ? 4 : 0);
    var settings = b36(flags) + b36(clampInt(s.editorFontSize, FONT_MIN, FONT_MAX, 15));
    var seen = opts.seen ? Object.keys(profile.seen).map(hash6) : [];
    if (opts.seen && opts.extras) seen = seen.concat(scormExtras.seen);
    seen = seen.filter(function (h, i, list) { return list.indexOf(h) === i; }).sort();
    var order = contentIds();
    var ids = Object.keys(profile.challenges).filter(function (id) {
      var rec = profile.challenges[id];
      return meaningful(rec) && (opts.incomplete || rec.completed);
    });
    ids.sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1) ia = 1e9;
      if (ib === -1) ib = 1e9;
      return ia - ib || (a < b ? -1 : a > b ? 1 : 0);
    });
    var entries = ids.map(function (id) { return encodeEntry(id, profile.challenges[id], opts); });
    if (opts.extras) entries = entries.concat(scormExtras.entries);
    if (opts.maxEntries !== undefined) entries = entries.slice(0, opts.maxEntries);
    var last = profile.lastChallengeId ? hash6(profile.lastChallengeId) : "";
    return [SUSPEND_PREFIX, settings, encodeName(profile.wizardName), seen.join(""), entries.join(","), last].join("|");
  }

  /** Encode a profile for suspend_data, dropping optional detail until it fits the budget. */
  function encodeSuspend(profile, budget) {
    budget = budget || SUSPEND_BUDGET;
    var steps = [
      { extras: true, seen: true, counts: true, dates: true, incomplete: true },
      { extras: false, seen: true, counts: true, dates: true, incomplete: true },
      { extras: false, seen: true, counts: true, dates: false, incomplete: true },
      { extras: false, seen: true, counts: false, dates: false, incomplete: true },
      { extras: false, seen: false, counts: false, dates: false, incomplete: true },
      { extras: false, seen: false, counts: false, dates: false, incomplete: false }
    ];
    var text = "";
    for (var i = 0; i < steps.length; i++) {
      text = buildSuspend(profile, steps[i]);
      if (text.length <= budget) return text;
    }
    // Still too long (hundreds of challenges): keep as many completed entries as fit.
    var opts = steps[steps.length - 1];
    var lo = 0, hi = Object.keys(profile.challenges).length;
    while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      opts.maxEntries = mid;
      if (buildSuspend(profile, opts).length <= budget) lo = mid; else hi = mid - 1;
    }
    opts.maxEntries = lo;
    return buildSuspend(profile, opts);
  }

  function standardSeenKeys() {
    var keys = ["prologue", "epilogue", "tutorial", "certificate", "welcome", "map", "practice", "grimoire"];
    var content = SS.content;
    if (content && Array.isArray(content.chapters)) {
      content.chapters.forEach(function (chapter) {
        if (!chapter || typeof chapter.id !== "string") return;
        ["chapter:", "intro:", "outro:", "unlocked:"].forEach(function (p) { keys.push(p + chapter.id); });
      });
    }
    contentIds().forEach(function (id) {
      ["challenge:", "lesson:", "intro:", "seen:"].forEach(function (p) { keys.push(p + id); });
      keys.push(id);
    });
    return keys;
  }

  var ENTRY_RE = /^[0-9a-z]{8}(\.[0-9a-z]*){0,3}$/;

  function decodeEntry(entry) {
    var state = parseInt(entry.charAt(6), 36);
    var fields = entry.length > 8 ? entry.slice(9).split(".") : [];
    var rec = emptyRecord();
    rec.completed = !!(state & 1);
    rec.answerRevealed = !!(state & 2);
    rec.stars = rec.completed ? Math.min(3, Math.max(1, state >> 2)) : 0;
    rec.hintsUsed = Math.min(MAX_HINTS, parseInt(entry.charAt(7), 36) || 0);
    rec.casts = fields[0] ? Math.min(MAX_COUNT, parseInt(fields[0], 36) || 0) : 0;
    rec.failedCasts = fields[1] ? Math.min(MAX_COUNT, parseInt(fields[1], 36) || 0) : 0;
    if (rec.completed && fields[2]) rec.completedAt = isoOr(parseInt(fields[2], 36) * 1000, null);
    return rec;
  }

  /**
   * LMS entries that matched no known challenge are kept aside. If content registers
   * later (or ids appear), adopt the entries that now match, taking the best of each.
   */
  function adoptExtras() {
    if (!scormMode || !active || !scormExtras.entries.length) return;
    var idByHash = {};
    contentIds().forEach(function (id) { var h = hash6(id); if (!hasOwn.call(idByHash, h)) idByHash[h] = id; });
    var adopted = false;
    scormExtras.entries = scormExtras.entries.filter(function (entry) {
      var id = idByHash[entry.slice(0, 6)];
      if (!id || !hasOwn.call(idByHash, entry.slice(0, 6))) return true;
      active.profile.challenges[id] = mergeRecords(active.profile.challenges[id] || null, decodeEntry(entry));
      adopted = true;
      return false;
    });
    if (adopted) writeActive();
  }

  /**
   * Decode suspend_data into a profile (without code). Hashes that match nothing known
   * are kept in scormExtras so they are written back unchanged. null if unreadable.
   */
  function decodeSuspend(text, knownProfile) {
    if (typeof text !== "string") return null;
    var parts = text.split("|");
    if (parts[0] !== SUSPEND_PREFIX || parts.length < 5) return null;
    var p = newProfile("");
    p.wizardName = "";

    var settings = parts[1] || "";
    var flags = parseInt(settings.charAt(0), 36);
    if (isFinite(flags)) {
      p.settings.sound = !!(flags & 1);
      p.settings.reduceMotion = !!(flags & 2);
      p.settings.unlockAll = !!(flags & 4);
    }
    p.settings.editorFontSize = clampInt(parseInt(settings.charAt(1), 36), FONT_MIN, FONT_MAX, DEFAULT_SETTINGS.editorFontSize);

    try { p.wizardName = cleanName(decodeURIComponent(parts[2] || "")); } catch (e) { p.wizardName = ""; }

    var idByHash = {};
    var known = contentIds();
    if (knownProfile) known = known.concat(Object.keys(knownProfile.challenges));
    known.forEach(function (id) { var h = hash6(id); if (!hasOwn.call(idByHash, h)) idByHash[h] = id; });

    var seenByHash = {};
    var seenKeys = standardSeenKeys();
    if (knownProfile) seenKeys = seenKeys.concat(Object.keys(knownProfile.seen));
    seenKeys.forEach(function (key) { var h = hash6(key); if (!hasOwn.call(seenByHash, h)) seenByHash[h] = key; });

    scormExtras = { entries: [], seen: [] };
    var seen = parts[3] || "";
    for (var i = 0; i + 6 <= seen.length; i += 6) {
      var h = seen.slice(i, i + 6);
      if (!/^[0-9a-z]{6}$/.test(h)) continue;
      if (hasOwn.call(seenByHash, h)) p.seen[seenByHash[h]] = true;
      else if (scormExtras.seen.indexOf(h) === -1) scormExtras.seen.push(h);
    }

    (parts[4] || "").split(",").forEach(function (entry) {
      if (!ENTRY_RE.test(entry)) return;
      var hashPart = entry.slice(0, 6);
      if (!hasOwn.call(idByHash, hashPart)) {
        if (scormExtras.entries.length < 500) scormExtras.entries.push(entry);
        return;
      }
      p.challenges[idByHash[hashPart]] = decodeEntry(entry);
    });

    var last = parts[5] || "";
    if (/^[0-9a-z]{6}$/.test(last) && hasOwn.call(idByHash, last)) p.lastChallengeId = idByHash[last];
    return p;
  }

  // ---------------------------------------------------------------------------
  // Keeping two tabs of the game in step
  // ---------------------------------------------------------------------------

  function own(obj, key) {
    return obj && hasOwn.call(obj, key) ? obj[key] : null;
  }

  function sameValue(a, b) {
    return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
  }

  /** Three-way choice: if this tab changed the value since `base`, keep ours, else take theirs. */
  function pick(base, mine, theirs) {
    return sameValue(mine, base) ? theirs : mine;
  }

  /**
   * Merge another tab's copy of the same profile into ours. Progress is the best of each
   * challenge; the name, settings, last challenge, drafts and practice code come from
   * whichever tab changed them since `base` (what this tab last saw stored).
   */
  function mergeTabs(base, mine, theirs) {
    var out = mergeProfiles(mine, theirs, false);
    if (!base) return out;
    out.wizardName = pick(base.wizardName, mine.wizardName, theirs.wizardName);
    Object.keys(out.settings).forEach(function (k) {
      out.settings[k] = pick(base.settings[k], mine.settings[k], theirs.settings[k]);
    });
    out.lastChallengeId = pick(base.lastChallengeId, mine.lastChallengeId, theirs.lastChallengeId);
    out.practiceCode = pick(base.practiceCode, mine.practiceCode, theirs.practiceCode);
    Object.keys(out.challenges).forEach(function (id) {
      var b = own(base.challenges, id), m = own(mine.challenges, id), t = own(theirs.challenges, id);
      out.challenges[id].draft = pick(b ? b.draft : null, m ? m.draft : null, t ? t.draft : null);
    });
    return out;
  }

  /** Replace the contents of a profile object without changing its identity. */
  function assignInPlace(target, source) {
    Object.keys(target).forEach(function (k) { if (!hasOwn.call(source, k)) delete target[k]; });
    Object.keys(source).forEach(function (k) { target[k] = source[k]; });
  }

  /**
   * If another tab stored a different version of the active profile since this tab last
   * looked, merge it in (or, if that slot now holds a different wizard, switch to it).
   * Returns true if the active profile changed.
   */
  function syncActive() {
    if (!active || !local) return false;
    var key = activeKey();
    var stored = readStored(key);
    if (stored === null || stored === lastSeen[key]) return false;
    var theirs = sanitizeProfile(parseJSON(stored));
    var base = sanitizeProfile(parseJSON(lastSeen[key]));
    lastSeen[key] = stored;
    if (!theirs) return false;
    if (theirs.id !== active.profile.id) {
      assignInPlace(active.profile, theirs);      // a new game or an import in another tab
    } else {
      assignInPlace(active.profile, mergeTabs(base, active.profile, theirs));
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // SCORM: sending progress to the LMS
  // ---------------------------------------------------------------------------

  function lmsReady() {
    try { return scormMode && !!SS.Scorm && SS.Scorm.isActive(); } catch (e) { return false; }
  }

  function commitLms() {
    if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; }
    lastCommitAt = Date.now();
    try { return SS.Scorm.commit() === true; } catch (e) { return false; }
  }

  /** Routine changes: commit at once if the last commit was a minute ago, else when it is. */
  function scheduleCommit() {
    if (commitTimer) return true;
    var wait = lastCommitAt + COMMIT_INTERVAL_MS - Date.now();
    if (wait <= 0) return commitLms();
    commitTimer = setTimeout(function () {
      commitTimer = null;
      if (lmsReady() && !commitLms()) lmsFailing = true;
    }, wait);
    return true;
  }

  /**
   * Send the active profile to the LMS. SS.Scorm skips values that haven't changed and
   * only commits when something was sent. urgent (a completion, init, the page being
   * hidden or closed): commit now; otherwise at most once a minute.
   */
  function pushScorm(urgent) {
    if (!active || !lmsReady()) return false;
    adoptExtras();
    var merged = syncActive();
    var ok = true;
    try {
      var limit = Math.min(SUSPEND_BUDGET, SS.Scorm.suspendDataLimit ? SS.Scorm.suspendDataLimit() : 4096);
      ok = SS.Scorm.saveSuspendData(encodeSuspend(active.profile, limit)) && ok;
      var P = progress();
      if (P) {
        var stats = P.overallStats(active.profile);
        ok = SS.Scorm.reportProgress({ completed: stats.completed, total: stats.total }) && ok;
      }
      ok = (urgent ? commitLms() : scheduleCommit()) && ok;
    } catch (e) {
      ok = false;
      warn("could not save to the LMS", e);
    }
    lmsFailing = !ok;
    if (merged) notify("sync", null);
    return ok;
  }

  // ---------------------------------------------------------------------------
  // Persisting the active profile
  // ---------------------------------------------------------------------------

  function activeKey() {
    if (!active) return null;
    return scormMode ? scormKey() : slotKey(active.slot);
  }

  function writeActive() {
    if (draftTimer) { clearTimeout(draftTimer); draftTimer = null; }
    pending = false;
    if (!active) return false;
    syncActive();
    active.profile.updatedAt = nowISO();
    var ok;
    try {
      ok = writeKey(activeKey(), JSON.stringify(active.profile));
    } catch (e) {
      ok = false;
      warn("could not serialise the profile", e);
    }
    if (!scormMode && readKey(lastSlotKey()) !== String(active.slot)) writeKey(lastSlotKey(), String(active.slot));
    return ok;
  }

  function notify(type, challengeId) {
    var profile = active ? active.profile : null;
    var info = { type: type, challengeId: challengeId || null };
    listeners.slice().forEach(function (cb) {
      try { cb(profile, info); } catch (e) { warn("onChange listener failed", e); }
    });
  }

  /** Save an important change right away (and send it to the LMS in SCORM mode). */
  function commitChange(type, challengeId, urgent) {
    writeActive();
    if (scormMode) pushScorm(!!urgent);
    notify(type, challengeId);
  }

  function scheduleWrite() {
    pending = true;
    if (draftTimer) return;
    draftTimer = setTimeout(function () {
      draftTimer = null;
      if (pending) writeActive();
    }, DRAFT_DELAY_MS);
  }

  /** Write pending drafts now; in SCORM mode send changes (committing at most once a minute). */
  function flush() {
    if (pending || draftTimer) writeActive();
    if (scormMode && active) pushScorm(false);
  }

  /** The page is being hidden or closed: save everything and commit to the LMS now. */
  function flushNow() {
    if (pending || draftTimer) writeActive();
    if (!scormMode) return;
    if (active) pushScorm(true);
    else if (lmsReady()) commitLms();
  }

  function onStorageEvent(event) {
    try {
      if (!active || !event || event.key !== activeKey()) return;
      if (event.storageArea && local && event.storageArea !== local) return;
      if (syncActive()) notify("sync", null);
    } catch (e) {
      warn("could not merge another tab's save", e);
    }
  }

  function installPageHooks() {
    try {
      if (typeof global.addEventListener === "function") {
        global.addEventListener("pagehide", function (event) {
          flushNow();
          if (scormMode && SS.Scorm && !(event && event.persisted)) SS.Scorm.finish();
        });
        global.addEventListener("storage", onStorageEvent);
      }
      var doc = global.document;
      if (doc && typeof doc.addEventListener === "function") {
        doc.addEventListener("visibilitychange", function () {
          if (doc.visibilityState === "hidden") flushNow();
        });
      }
    } catch (e) {
      warn("could not install page hooks", e);
    }
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  function scormWanted() {
    var cfg = config();
    return !(cfg.scorm && cfg.scorm.enabled === false) && !!SS.Scorm && typeof SS.Scorm.connect === "function";
  }

  function makeInitResult() {
    return {
      storage: local && !storageFailing() ? "local" : "memory",
      scorm: scormMode,
      learnerName: scormMode && learner && learner.name ? learner.name : null,
      defaultWizardName: scormMode ? defaultWizardName() : null,
      scormMissing: scormMissing
    };
  }

  /** The learner's first name, cleaned (for the default wizard name in SCORM mode). */
  function defaultWizardName() {
    if (!learner || !learner.name) return null;
    var first = cleanName(String(learner.name).split(" ")[0]);
    return first || null;
  }

  /** A profile's name, settings and code without any progress (for a fresh LMS attempt). */
  function codeOnly(profile) {
    var p = newProfile(profile.wizardName);
    p.settings = sanitizeSettings(profile.settings);
    p.practiceCode = profile.practiceCode;
    Object.keys(profile.challenges).forEach(function (id) {
      var rec = profile.challenges[id];
      if (rec.draft === null && rec.bestCode === null) return;
      var kept = emptyRecord();
      kept.draft = rec.draft;
      kept.bestCode = rec.bestCode;
      p.challenges[id] = kept;
    });
    return p;
  }

  /** Try to connect to the LMS; on success, switch to SCORM mode and load the learner's profile. */
  function connectLms() {
    var ok = false;
    try { ok = SS.Scorm.connect() === true; } catch (e) { ok = false; }
    if (!ok) return false;
    if (active) flush();
    scormMode = true;
    scormMissing = false;
    try { learner = SS.Scorm.getLearner(); } catch (e) { learner = null; }
    learner = learner || { id: "", name: "" };
    var key = scormKey();
    var raw = readKey(key);
    if (raw !== null && readStored(key) === raw) lastSeen[key] = raw;
    var localCopy = sanitizeProfile(parseJSON(raw));
    var suspend = "";
    try { suspend = SS.Scorm.loadSuspendData(); } catch (e) { suspend = ""; }
    var fresh = false;
    try { fresh = !suspend && SS.Scorm.isFreshAttempt(); } catch (e) { fresh = false; }
    var lms = null;
    if (suspend) {
      try { lms = decodeSuspend(suspend, localCopy); } catch (e) { lms = null; }
    }
    var profile = null;
    if (fresh) {
      // A new attempt (or the instructor reset this one): start again, keeping only the
      // wizard's name, settings and code from an earlier attempt on this computer.
      profile = localCopy ? codeOnly(localCopy) : null;
      lastSeen[key] = readStored(key);
    } else if (localCopy && lms) {
      if (!lms.wizardName) lms.wizardName = localCopy.wizardName;
      profile = mergeProfiles(localCopy, lms, true);
    } else if (lms) {
      if (!lms.wizardName) lms.wizardName = defaultWizardName() || DEFAULT_NAME;
      profile = lms;
    } else {
      profile = localCopy;
    }
    active = profile ? { slot: 0, profile: profile } : null;
    if (active) {
      writeActive();
      pushScorm(true);
    } else {
      commitLms();      // the "incomplete" status and exit=suspend set by connect()
    }
    return true;
  }

  function ensureInit() {
    if (initialised) return initResult;
    initialised = true;
    var opened = openLocalStorage();
    local = opened.ls;
    localBlocked = !opened.ls;
    probeFailed = !!(opened.ls && !opened.writable);
    if (scormWanted()) connectLms();
    installPageHooks();
    initResult = makeInitResult();
    return initResult;
  }

  function logScormMissing() {
    var f = null;
    try { f = SS.Scorm && SS.Scorm.lastError ? SS.Scorm.lastError() : null; } catch (e) { f = null; }
    warn("This is a SCORM package, but no connection to the LMS could be made " +
      (f ? "(" + f.call + ": error " + f.code + (f.text ? " " + f.text : "") + (f.diagnostic ? ", " + f.diagnostic : "") + ")"
        : "(no SCORM API in this window, its parents or its opener)") +
      ". Progress is only saved in this browser.");
  }

  function init() {
    if (initPromise) return initPromise;
    var result;
    try {
      result = ensureInit();
    } catch (e) {
      warn("init failed", e);
      result = { storage: "memory", scorm: false, learnerName: null, defaultWizardName: null, scormMissing: false };
    }
    if (scormMode || !config().scormRequired || !scormWanted()) {
      initPromise = Promise.resolve(result);
      return initPromise;
    }
    // A SCORM package, but no LMS yet: the LMS may still be setting up its API. Try a few
    // more times (~2.5 s), then tell the player that nothing reaches the course.
    initPromise = new Promise(function (resolve) {
      var attempt = 0;
      function next() {
        if (!scormMode && attempt < SCORM_RETRY_DELAYS_MS.length) {
          setTimeout(function () {
            try { if (!scormMode) connectLms(); } catch (e) { /* keep trying */ }
            next();
          }, SCORM_RETRY_DELAYS_MS[attempt++]);
          return;
        }
        if (!scormMode) {
          scormMissing = true;
          logScormMissing();
        }
        initResult = makeInitResult();
        resolve(initResult);
      }
      next();
    });
    return initPromise;
  }

  // ---------------------------------------------------------------------------
  // Slots and profiles
  // ---------------------------------------------------------------------------

  function checkSlot(slot) {
    var n = Number(slot);
    if (!(Math.floor(n) === n && n >= 0 && n < slotCount())) throw new Error(MSG.badSlot(slotCount()));
    return n;
  }

  /** { profile, damaged, raw } for a slot; damaged when something is stored there that can't be read. */
  function readSlot(slot) {
    var raw = readKey(slotKey(slot));
    if (raw === null) return { profile: null, damaged: false, raw: null };
    var profile = sanitizeProfile(parseJSON(raw));
    return { profile: profile, damaged: !profile, raw: raw };
  }

  function storageWarning() {
    ensureInit();
    return currentWarning();
  }

  function isScorm() {
    ensureInit();
    return scormMode;
  }

  /** Whether importData() is allowed (always, except in an LMS unless scorm.allowImport). */
  function canImport() {
    ensureInit();
    var cfg = config();
    return !scormMode || !!(cfg.scorm && cfg.scorm.allowImport === true);
  }

  function listSlots() {
    ensureInit();
    if (scormMode) {
      if (active) syncActive();
      return [active ? summary(0, active.profile) : null];
    }
    var out = [];
    for (var slot = 0; slot < slotCount(); slot++) {
      if (active && active.slot === slot) {
        syncActive();
        out.push(summary(slot, active.profile));
        continue;
      }
      var state = readSlot(slot);
      out.push(state.profile ? summary(slot, state.profile) : state.damaged ? { slot: slot, damaged: true } : null);
    }
    return out;
  }

  function createProfile(slot, wizardName) {
    ensureInit();
    if (scormMode) {
      if (active) {
        var name = cleanName(wizardName);
        if (name) active.profile.wizardName = name;
        commitChange("rename", null, true);
        return active.profile;
      }
      active = { slot: 0, profile: newProfile(wizardName || defaultWizardName()) };
      lastSeen[scormKey()] = readStored(scormKey());     // the new profile replaces whatever is stored
      commitChange("create", null, true);
      return active.profile;
    }
    slot = checkSlot(slot);
    if (active) flush();
    active = { slot: slot, profile: newProfile(wizardName) };
    lastSeen[slotKey(slot)] = readStored(slotKey(slot));
    commitChange("create", null);
    return active.profile;
  }

  function loadProfile(slot) {
    ensureInit();
    if (scormMode) {
      if (active) syncActive();
      return active ? active.profile : null;
    }
    slot = checkSlot(slot);
    if (active && active.slot === slot) {
      syncActive();                    // another tab may have moved on
      return active.profile;
    }
    var state = readSlot(slot);
    if (!state.profile) return null;
    if (active) flush();
    active = { slot: slot, profile: state.profile };
    if (readStored(slotKey(slot)) === state.raw) lastSeen[slotKey(slot)] = state.raw;
    if (readKey(lastSlotKey()) !== String(slot)) writeKey(lastSlotKey(), String(slot));
    notify("load", null);
    return state.profile;
  }

  function deleteSlot(slot) {
    ensureInit();
    if (scormMode) return false;
    slot = checkSlot(slot);
    if (active && active.slot === slot) {
      if (draftTimer) { clearTimeout(draftTimer); draftTimer = null; }
      pending = false;
      active = null;
    }
    removeKey(slotKey(slot));
    if (readKey(lastSlotKey()) === String(slot)) removeKey(lastSlotKey());
    notify("delete", null);
    return true;
  }

  function getProfile() {
    ensureInit();
    adoptExtras();
    return active ? active.profile : null;
  }

  function getLastSlot() {
    ensureInit();
    if (scormMode) return active ? 0 : null;
    var slot = clampInt(readKey(lastSlotKey()), -1, 1000, -1);
    if (slot < 0 || slot >= slotCount()) return null;
    if (active && active.slot === slot) return slot;
    return readSlot(slot).profile ? slot : null;
  }

  function renameWizard(name) {
    ensureInit();
    if (!active) return null;
    var clean = cleanName(name);
    if (!clean) return active.profile.wizardName;
    active.profile.wizardName = clean;
    commitChange("rename", null);
    return clean;
  }

  // ---------------------------------------------------------------------------
  // Challenge progress
  // ---------------------------------------------------------------------------

  function recordFor(challengeId, create) {
    if (!active || !validId(challengeId)) return null;
    var all = active.profile.challenges;
    if (hasOwn.call(all, challengeId)) return all[challengeId];
    if (!create) return null;
    all[challengeId] = emptyRecord();
    return all[challengeId];
  }

  /** A copy of a challenge's saved state (an empty record if there is none yet). */
  function getRecord(challengeId) {
    ensureInit();
    var rec = recordFor(challengeId, false);
    return rec ? copyRecord(rec) : emptyRecord();
  }

  function saveDraft(challengeId, code) {
    ensureInit();
    var rec = recordFor(challengeId, true);
    if (!rec) return false;
    var clean = code === null || code === undefined ? null : cleanCode(String(code));
    if (clean === null && code !== null && code !== undefined) return false;   // far too long: keep the old draft
    if (rec.draft === clean) return true;
    rec.draft = clean;
    scheduleWrite();
    return true;
  }

  function recordCast(challengeId, result) {
    ensureInit();
    var rec = recordFor(challengeId, true);
    if (!rec) return null;
    rec.casts = Math.min(MAX_COUNT, rec.casts + 1);
    if (!(result && result.passed)) rec.failedCasts = Math.min(MAX_COUNT, rec.failedCasts + 1);
    active.profile.lastChallengeId = challengeId;
    commitChange("cast", challengeId);
    return copyRecord(rec);
  }

  function hintLimit(challengeId) {
    var ch = contentChallenge(challengeId);
    return ch && Array.isArray(ch.hints) ? Math.min(MAX_HINTS, ch.hints.length) : MAX_HINTS;
  }

  function revealHint(challengeId) {
    ensureInit();
    var rec = recordFor(challengeId, true);
    if (!rec) return 0;
    var limit = hintLimit(challengeId);
    if (rec.hintsUsed < limit) {
      rec.hintsUsed += 1;
      commitChange("hint", challengeId);
    }
    return rec.hintsUsed;
  }

  function revealAnswer(challengeId) {
    ensureInit();
    var rec = recordFor(challengeId, true);
    if (!rec) return false;
    if (!rec.answerRevealed) {
      rec.answerRevealed = true;
      commitChange("answer", challengeId);
    }
    return true;
  }

  function recordCompletion(challengeId, details) {
    ensureInit();
    var rec = recordFor(challengeId, true);
    if (!rec) return { firstTime: false, previousStars: 0, stars: 0, bestStars: 0, xpGained: 0 };
    var P = progress();
    var challenge = contentChallenge(challengeId) || { id: challengeId, difficulty: "easy" };
    var xpBefore = P ? P.totalXp(active.profile) : 0;
    var rankBefore = P ? P.rankFor(xpBefore) : null;

    var firstTime = !rec.completed;
    var previousStars = rec.completed ? rec.stars : 0;
    var stars = P ? P.starsFor(rec) : (rec.answerRevealed ? 1 : rec.hintsUsed === 0 ? 3 : rec.hintsUsed === 1 ? 2 : 1);
    var best = Math.max(previousStars, stars);
    var code = details && typeof details.code === "string" ? cleanCode(details.code) : null;

    rec.completed = true;
    rec.stars = best;
    if (!rec.completedAt) rec.completedAt = nowISO();
    if (code !== null && (stars >= previousStars || rec.bestCode === null)) rec.bestCode = code;
    active.profile.lastChallengeId = challengeId;

    var known = !!contentChallenge(challengeId);
    var xpGained = P && known ? Math.max(0, P.xpFor(challenge, best) - P.xpFor(challenge, previousStars)) : 0;
    var xpAfter = P ? P.totalXp(active.profile) : 0;
    var rankAfter = P ? P.rankFor(xpAfter) : null;
    commitChange("completion", challengeId, true);
    return {
      firstTime: firstTime,
      previousStars: previousStars,
      stars: stars,
      bestStars: best,
      xpGained: xpGained,
      totalXp: xpAfter,
      rank: rankAfter,
      rankUp: !!(rankBefore && rankAfter && rankAfter.index > rankBefore.index)
    };
  }

  // ---------------------------------------------------------------------------
  // Seen flags, settings, practice code
  // ---------------------------------------------------------------------------

  function markSeen(key) {
    ensureInit();
    if (!active || !validSeenKey(key)) return false;
    if (active.profile.seen[key] === true && hasOwn.call(active.profile.seen, key)) return true;
    active.profile.seen[key] = true;
    commitChange("seen", null);
    return true;
  }

  function hasSeen(key) {
    ensureInit();
    if (!active || !validSeenKey(key)) return false;
    if (hasOwn.call(active.profile.seen, key)) return active.profile.seen[key] === true;
    if (scormMode && scormExtras.seen.length) {
      var i = scormExtras.seen.indexOf(hash6(key));
      if (i !== -1) {
        scormExtras.seen.splice(i, 1);
        active.profile.seen[key] = true;      // matched an LMS flag: keep it under its real name
        writeActive();
        return true;
      }
    }
    return false;
  }

  function getSettings() {
    ensureInit();
    return sanitizeSettings(active ? active.profile.settings : null);
  }

  function updateSettings(partial) {
    ensureInit();
    if (!active) return getSettings();
    active.profile.settings = sanitizeSettings(partial, active.profile.settings);
    commitChange("settings", null);
    return getSettings();
  }

  function getPracticeCode() {
    ensureInit();
    return active ? active.profile.practiceCode : looseCode;
  }

  function savePracticeCode(code) {
    ensureInit();
    var clean = cleanCode(code === null || code === undefined ? "" : String(code));
    if (clean === null) return false;
    if (!active) { looseCode = clean; return true; }
    if (active.profile.practiceCode === clean) return true;
    active.profile.practiceCode = clean;
    scheduleWrite();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Save Scrolls (export / import)
  // ---------------------------------------------------------------------------

  function exportCode() {
    ensureInit();
    if (!active) return "";
    var p = active.profile;
    var ch = {};
    Object.keys(p.challenges).forEach(function (id) {
      var rec = p.challenges[id];
      if (!meaningful(rec)) return;
      var row = [(rec.completed ? 1 : 0) + (rec.answerRevealed ? 2 : 0), rec.stars, rec.hintsUsed, rec.casts, rec.failedCasts];
      if (rec.completedAt) row.push(Date.parse(rec.completedAt));
      ch[id] = row;
    });
    var data = {
      v: PROFILE_VERSION,
      id: p.id,
      n: p.wizardName,
      c: p.createdAt,
      u: p.updatedAt,
      ch: ch,
      s: Object.keys(p.seen),
      o: [p.settings.sound ? 1 : 0, p.settings.reduceMotion ? 1 : 0, p.settings.editorFontSize, p.settings.unlockAll ? 1 : 0],
      l: p.lastChallengeId
    };
    return CODE_PREFIX + base64urlEncode(utf8Encode(JSON.stringify(data)));
  }

  function exportJSON() {
    ensureInit();
    if (!active) return "";
    if (pending) writeActive();
    var cfg = config();
    return JSON.stringify({
      format: FILE_FORMAT,
      version: PROFILE_VERSION,
      game: cfg.title || "Pyromancer",
      gameVersion: cfg.version || "",
      exportedAt: nowISO(),
      profile: active.profile
    }, null, 2);
  }

  function fileName(name) {
    var slug = String(name || "").replace(/[\\/:*?"<>|\u0000-\u001F\u007F]+/g, "").replace(/\s+/g, "-")
      .replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
    return "pyromancer-" + (slug || "wizard") + ".json";
  }

  function exportFile() {
    ensureInit();
    if (!active) return false;
    try {
      var doc = global.document;
      var json = exportJSON();
      var blob = new global.Blob([json], { type: "application/json" });
      var url = global.URL.createObjectURL(blob);
      var link = doc.createElement("a");
      link.href = url;
      link.download = fileName(active.profile.wizardName);
      link.rel = "noopener";
      link.style.display = "none";
      (doc.body || doc.documentElement).appendChild(link);
      link.click();
      setTimeout(function () {
        try { global.URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        try { if (link.parentNode) link.parentNode.removeChild(link); } catch (e) { /* ignore */ }
      }, 1500);
      return true;
    } catch (e) {
      warn("download failed", e);
      return false;
    }
  }

  function expandCode(data) {
    if (!isPlainObject(data)) throw new Error(MSG.damaged);
    if (typeof data.v === "number" && data.v > PROFILE_VERSION) throw new Error(MSG.newer);
    if (data.v !== PROFILE_VERSION) throw new Error(MSG.damaged);
    var raw = {
      id: data.id, wizardName: data.n, createdAt: data.c, updatedAt: data.u,
      challenges: {}, seen: Array.isArray(data.s) ? data.s : [], settings: {}, lastChallengeId: data.l
    };
    if (isPlainObject(data.ch)) {
      Object.keys(data.ch).slice(0, MAX_CHALLENGES).forEach(function (id) {
        var row = data.ch[id];
        if (!Array.isArray(row) || !validId(id)) return;
        var flags = clampInt(row[0], 0, 3, 0);
        raw.challenges[id] = {
          completed: !!(flags & 1),
          answerRevealed: !!(flags & 2),
          stars: row[1],
          hintsUsed: row[2],
          casts: row[3],
          failedCasts: row[4],
          completedAt: typeof row[5] === "number" ? row[5] : null
        };
      });
    }
    if (Array.isArray(data.o)) {
      raw.settings = {
        sound: data.o[0] === 1 || data.o[0] === true,
        reduceMotion: data.o[1] === 1 || data.o[1] === true,
        editorFontSize: data.o[2],
        unlockAll: data.o[3] === 1 || data.o[3] === true
      };
    }
    return sanitizeProfile(raw);
  }

  function decodeCode(code) {
    var match = CODE_RE.exec(code);
    if (!match) throw new Error(MSG.notScroll);
    if (parseInt(match[2], 10) > PROFILE_VERSION) throw new Error(MSG.newer);
    var bytes = base64urlDecode(code.slice(match[0].length));
    if (!bytes || !bytes.length) throw new Error(MSG.damaged);
    var data;
    try { data = JSON.parse(utf8Decode(bytes)); } catch (e) { throw new Error(MSG.damaged); }
    var profile = expandCode(data);
    if (!profile) throw new Error(MSG.damaged);
    return profile;
  }

  function decodeFile(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { throw new Error(MSG.damaged); }
    if (!isPlainObject(data)) throw new Error(MSG.notScroll);
    var raw = data;
    if (data.format === FILE_FORMAT || LEGACY_FILE_FORMATS.indexOf(data.format) !== -1 || isPlainObject(data.profile)) {
      if (typeof data.version === "number" && data.version > PROFILE_VERSION) throw new Error(MSG.newer);
      raw = data.profile;
    } else if (!("challenges" in data) && !("wizardName" in data)) {
      throw new Error(MSG.notScroll);
    }
    if (isPlainObject(raw) && typeof raw.version === "number" && raw.version > PROFILE_VERSION) throw new Error(MSG.newer);
    var profile = sanitizeProfile(raw);
    if (!profile) throw new Error(MSG.notScroll);
    return profile;
  }

  /** Read a save code or a Save Scroll file's text; returns a clean profile or throws a friendly Error. */
  function parseSaveScroll(input) {
    if (input === null || input === undefined) throw new Error(MSG.empty);
    var text = String(input);
    if (text.length > MAX_IMPORT) throw new Error(MSG.tooBig);
    text = text.replace(/^\uFEFF/, "").trim();
    if (!text) throw new Error(MSG.empty);
    // Codes pasted from emails or chats: ignore spaces/line breaks, wrapping quotes and a final full stop.
    var compact = text.replace(/\s+/g, "")
      .replace(/^["'\u201C\u201D\u2018\u2019<(\[]+/, "")
      .replace(/["'\u201C\u201D\u2018\u2019>)\].,;]+$/, "");
    if (CODE_RE.test(compact)) return decodeCode(compact);
    if (text.charAt(0) === "{") return decodeFile(text);
    throw new Error(MSG.notScroll);
  }

  function importData(textOrCode, slot) {
    ensureInit();
    if (scormMode && !canImport()) throw new Error(MSG.importOff);
    var imported = parseSaveScroll(textOrCode);
    if (scormMode) {
      if (active) {
        assignInPlace(active.profile, mergeProfiles(active.profile, imported, false));
      } else {
        active = { slot: 0, profile: imported };
        lastSeen[scormKey()] = readStored(scormKey());
      }
      commitChange("import", null, true);
      return active.profile;
    }
    slot = checkSlot(slot);
    if (active && active.slot !== slot) flush();
    imported.updatedAt = nowISO();
    active = { slot: slot, profile: imported };
    lastSeen[slotKey(slot)] = readStored(slotKey(slot));      // the import replaces the slot
    commitChange("import", null);
    return active.profile;
  }

  function onChange(cb) {
    if (typeof cb !== "function") return function () {};
    listeners.push(cb);
    return function unsubscribe() {
      var i = listeners.indexOf(cb);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  SS.Save = {
    init: init,
    storageWarning: storageWarning,
    isScorm: isScorm,
    canImport: canImport,
    listSlots: listSlots,
    createProfile: createProfile,
    loadProfile: loadProfile,
    deleteSlot: deleteSlot,
    getProfile: getProfile,
    getLastSlot: getLastSlot,
    renameWizard: renameWizard,
    getRecord: getRecord,
    saveDraft: saveDraft,
    recordCast: recordCast,
    revealHint: revealHint,
    revealAnswer: revealAnswer,
    recordCompletion: recordCompletion,
    markSeen: markSeen,
    hasSeen: hasSeen,
    getSettings: getSettings,
    updateSettings: updateSettings,
    getPracticeCode: getPracticeCode,
    savePracticeCode: savePracticeCode,
    exportCode: exportCode,
    exportJSON: exportJSON,
    exportFile: exportFile,
    importData: importData,
    onChange: onChange,
    flush: flush,
    // Exposed for tests (pure helpers).
    _cleanName: cleanName,
    _fileName: fileName,
    _hash6: hash6,
    _encodeSuspend: encodeSuspend,
    _decodeSuspend: decodeSuspend,
    _sanitizeProfile: sanitizeProfile,
    _parseSaveScroll: parseSaveScroll,
    DEFAULT_WIZARD_NAME: DEFAULT_NAME
  };
})(typeof window !== "undefined" ? window : globalThis);
