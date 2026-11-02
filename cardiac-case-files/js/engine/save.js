/*
 * The Cardiac Case Files — CCF.Save: profiles, save slots, save codes and LMS storage.
 * Contract: docs/DESIGN.md §5.2. Adapted from Pyromancer's SS.Save.
 *
 * API (every function returns copies, persists its change at once, and never throws):
 *   init()                       → { mode: "local" | "scorm", storageOk, warning }
 *                                  (+ learnerName, scormMissing, pending, scormVersion)
 *   isScorm()
 *   listSlots()                  → [{ slot, empty, damaged, summary }]  summary: { name, rankTitle,
 *                                  solved, total, stars, updatedAt } (+ rankIndex, xp, maxXp,
 *                                  maxStars, inProgress, createdAt, id)
 *   newProfile(slot, name)       → profile (becomes current) | null for a bad slot
 *   load(slot)                   → profile | null (empty or damaged slot)
 *   current() / currentSlot() / lastSlot()
 *   deleteSlot(slot)             → boolean
 *   rename(name)                 → the cleaned name | null (no profile)
 *   settings() / setSetting(key, value) → settings
 *   hasSeen(key) / markSeen(key)
 *   caseRecord(caseId)           → record | null
 *   saveCaseProgress(caseId, current) → boolean      (current = the UI's own JSON payload)
 *   clearCaseProgress(caseId)    → boolean
 *   recordSolve(caseId, { strikes, hints, stepCount })
 *                                → { stars, firstSolve, improved, xpGained, totalXp,
 *                                    rankUp: { from, to } | null }   (from/to are rank titles)
 *                                  (+ caseId, bestStars, previousStars, strikes, xp, rank,
 *                                     rankUp.fromIndex, rankUp.toIndex)
 *   recordDrill(drillId, streak) → { best, isBest } (+ played)
 *   exportCode()                 → "CCF1.…" ("" with no profile)
 *   importCode(code, slot)       → { ok: true, profile } | { ok: false, error }
 *   storageWarning()             → null | text for the player
 *   onChange(fn)                 → unsubscribe(); fn(profile, { type, caseId }) after every change
 *
 * Extras (not in DESIGN.md):
 *   ready()            → Promise of the final init() result (the SCORM package waits up to
 *                        ~2.5 s for an LMS that is slow to appear; otherwise resolves at once)
 *   summary()          → the current profile's slot summary (as in listSlots), or null
 *   previewCode(code)  → { ok: true, summary } | { ok: false, error } without importing
 *   canImport()        → false in an LMS unless CCF.config.scorm.allowImport
 *   flush()            → retry failed writes and commit to the LMS now
 *   DEFAULT_NAME ("Clinician"), MAX_NAME (40)
 *   setSetting({ key: value, … }) applies several settings at once.
 *
 * Profile (docs/DESIGN.md §5.2):
 *   { v: 1, id, name, createdAt, updatedAt,
 *     settings: { sound: true, reduceMotion: false, textSize: "md" },
 *     seen: { intro: true, … },
 *     cases: { <caseId>: { solved, bestStars, bestStrikes, xp, plays, firstSolvedAt,
 *                          lastPlayedAt, current } },
 *     drills: { <drillId>: { best, played } } }
 *
 * Behaviour:
 *   * Slots are numbered 0 .. saveSlots-1 (show them to players as 1, 2, 3). A slot that
 *     holds something unreadable is { empty: false, damaged: true } (the UI can offer to
 *     delete it). The last slot used is remembered (lastSlot()).
 *   * Records: bestStars/bestStrikes keep the best solve (fewest strikes); xp is the case's
 *     XP at bestStars; plays counts solves (replays included); firstSolvedAt is the first
 *     solve; lastPlayedAt is the last saveCaseProgress / clearCaseProgress / recordSolve.
 *     recordSolve() clears `current` (the case is closed).
 *   * recordSolve(): `strikes` is the case's total (wrong attempts + hints + "show me" uses,
 *     as counted by the UI; never less than `hints`). Stars come from CCF.Progress.starsFor;
 *     the best stars and fewest strikes are kept; only the XP above the best earlier solve
 *     is added. improved = first solve, more stars, or the same stars with fewer strikes.
 *     stepCount defaults to the case's number of steps.
 *   * `current` is the UI's in-progress payload ({ step, strikes, hints, answers, … }): any
 *     JSON object up to 8192 characters, stored as given (keep it under 2 KB).
 *     saveCaseProgress(id, null) is the same as clearCaseProgress(id).
 *   * Settings: sound and reduceMotion are booleans; textSize is a short word ("sm", "md",
 *     "lg", "xl" …). Other keys (letters, digits, _) may hold a boolean, a number or a short
 *     text (null removes them). Settings changed with no profile loaded are kept for the
 *     session and given to the next new profile; a new profile otherwise takes the current
 *     profile's settings.
 *   * onChange types: "new", "load", "delete", "rename", "settings", "seen", "progress",
 *     "solve", "drill", "import", "sync" (another tab of the game saved this profile and it
 *     was merged in), "slots" (another tab changed a different slot), "status" (the text of
 *     storageWarning() changed), "scorm" (an LMS connection arrived late and the game
 *     switched to the course's profile: go back to the title screen). Listeners get a copy
 *     of the profile; changes made by a listener are announced after the current round.
 *   * Two tabs on one save: before writing, the stored copy is merged in (best of each
 *     case; the name and settings follow whichever tab changed them; an in-progress state
 *     follows whichever copy was played more recently), and a `storage` event from another
 *     tab merges its changes straight away.
 *   * If localStorage is blocked or full, everything keeps working in memory and
 *     storageWarning() says to copy the save code. Failed writes are retried with every
 *     write and when the page is hidden; the warning stays until all of them succeed.
 *   * Imported and stored data is sanitised: wrong types fall back to defaults, names are
 *     cleaned (no control characters, at most 40 characters) and unknown fields are dropped.
 *     Records for case ids the content doesn't have (yet) are kept but never counted.
 *   * Save codes: "CCF1." + base64url(packed profile) + "." + a 6-character checksum. The
 *     checksum catches typos and truncation; codes from other games ("PYRO1." …) and newer
 *     versions ("CCF2.") are refused with a message for the player. Spaces, line breaks,
 *     wrapping quotes and a trailing full stop are ignored when a code is pasted.
 *   * SCORM mode (an LMS API was found): one profile, no slots. On the first launch it is
 *     created with the learner's name from the LMS. The packed profile (case ids as 6-char
 *     hashes, times in minutes) lives in cmi.suspend_data, always ≤ 4000 characters; if a
 *     profile ever grew past that, optional details are dropped in a fixed order (in-progress
 *     states except the latest, dates, play counts, seen flags, the latest in-progress state,
 *     unsolved records). A copy is kept in localStorage by learner id; on launch the two are
 *     merged (best of each case; the LMS wins for name and settings). A fresh attempt (also
 *     after an instructor reset) keeps only the name and settings. Score: round(100 × solved
 *     ÷ total); status completed/passed once solved ÷ total ≥ completionThreshold. Values are
 *     sent when they change; commits happen at once after a solve, an import and when the
 *     page is hidden or closed, otherwise at most once a minute. Importing a save code is off
 *     unless CCF.config.scorm.allowImport is true (then it merges into the course profile).
 *   * CCF.config.scormRequired (the SCORM package): if no LMS answers, the game runs on local
 *     slots, storageWarning() says nothing reaches the course, and init() keeps retrying in
 *     the background for ~2.5 s (onChange "scorm" if it then connects).
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});

  var hasOwn = Object.prototype.hasOwnProperty;

  var PROFILE_VERSION = 1;
  var CODE_GAME = "CCF";
  var CODE_VERSION = 1;
  var CODE_PREFIX = CODE_GAME + CODE_VERSION + ".";
  var OTHER_GAMES = { PYRO: "Pyromancer", SNS: "Pyromancer" };
  var PACK_PREFIX = "C1";
  var SUSPEND_BUDGET = 4000;           // fits SCORM 1.2 (4096) and SCORM 2004 2nd edition (4000)
  var COMMIT_INTERVAL_MS = 60000;      // routine LMS commits: at most once a minute
  var SCORM_RETRY_DELAYS_MS = [250, 500, 750, 1000];
  var TIME_EPOCH = Date.UTC(2020, 0, 1);
  var MAX_NAME = 40;
  var MAX_CASES = 2000;
  var MAX_SEEN = 500;
  var MAX_DRILLS = 20;
  var MAX_EXTRA_SETTINGS = 10;
  var MAX_CURRENT_CHARS = 8192;        // JSON length of one in-progress payload
  var MAX_JSON_DEPTH = 16;
  var MAX_IMPORT_CHARS = 400000;
  var MAX_PACKED_CHARS = 300000;
  var MAX_SCORM_EXTRAS = 500;
  var MAX_COUNT = 1000000;
  var MAX_STRIKES = 9999;
  var MAX_XP = 100000;
  var DEFAULT_NAME = "Clinician";

  var PROFILE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  var CASE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
  var DRILL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;
  var SETTING_KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
  var TEXT_SIZE_RE = /^[A-Za-z0-9-]{1,12}$/;
  var HASH_RE = /^[0-9a-z]{6}$/;
  var B36_RE = /^[0-9a-z]{1,10}$/;
  var ENTRY_RE = /^([A-Za-z0-9_-]{1,100}):([0-7])((?:\.[0-9a-z]{0,10}){0,8})$/;
  var CURRENT_RE = /^([A-Za-z0-9_-]{1,100}):([A-Za-z0-9_-]+)$/;
  var DRILL_RE = /^([A-Za-z0-9][A-Za-z0-9_-]{0,31}):([0-9a-z]{1,8})(?:\.([0-9a-z]{1,8}))?$/;
  // Control and invisible formatting characters (ZWJ/ZWNJ are kept: emoji and some scripts need them).
  var CONTROL_CLASS = "[\\u0000-\\u001F\\u007F-\\u009F\\u200B\\u200E\\u200F\\u2028-\\u202E\\u2060-\\u2064\\u2066-\\u2069\\uFEFF\\uFFF9-\\uFFFB]";
  var CONTROL_RE = new RegExp(CONTROL_CLASS, "g");     // for replace()
  var HAS_CONTROL_RE = new RegExp(CONTROL_CLASS);      // for test(): no lastIndex state
  var LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
  var HAS_LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/;
  var FORBIDDEN_KEYS = { "__proto__": true, "constructor": true, "prototype": true };

  var MSG = {
    blocked: "This browser is blocking saved games (for example in a private window or on a locked-down " +
      "computer), so your progress will only last until you close this page. Copy your save code " +
      "(in Settings) to keep it.",
    full: "This browser's storage is full, so your latest progress could not be saved here. " +
      "Copy your save code (in Settings) to keep it.",
    scormFailed: "Your progress couldn't be sent to your course just now. It is still saved in this " +
      "browser, and it will be sent again with your next answer.",
    scormMissing: "This activity couldn't connect to your course, so your progress and score aren't being " +
      "recorded. Close it and open it again from your course.",
    importOff: "Your course saves your progress automatically, so importing a save code is turned off here.",
    empty: "Paste a save code first.",
    notCode: "That doesn't look like a save code for The Cardiac Case Files. Copy the whole code — it " +
      "starts with " + CODE_PREFIX,
    otherGame: function (game) {
      return "That is a save code for " + game + ", not for The Cardiac Case Files.";
    },
    damaged: "This save code is damaged or incomplete — part of it may be missing or mistyped. Copy the " +
      "whole code again and retry.",
    newer: "This save code was made by a newer version of The Cardiac Case Files. Open the newer version " +
      "of the game to use it.",
    tooBig: "That is far too long to be a save code.",
    badSlot: function (n) { return "Choose a save slot from 1 to " + n + "."; },
    internal: "Something went wrong while reading that save code."
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  var initialised = false;
  var retryStarted = false;
  var retrying = false;
  var readyPromise = null;
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
  var looseSettings = null;  // settings changed while no profile was loaded
  var looseDrills = {};      // drill bests while no profile is loaded (this session only)
  var listeners = [];
  var notifying = false;
  var noticeQueue = [];
  var lastWarning = null;
  var scormExtras = emptyExtras();   // suspend_data records we couldn't match to a case id (kept as-is)

  function config() { return CCF.config || {}; }

  function prefix() {
    var key = config().storageKey;
    return typeof key === "string" && key ? key : "cardiac-case-files";
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
    try { if (global.console && global.console.warn) global.console.warn("[CCF.Save] " + message, error || ""); } catch (e) { /* ignore */ }
  }

  function emptyExtras() { return { records: {}, currents: {} }; }

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

  function timeOf(iso) {
    var t = typeof iso === "string" ? Date.parse(iso) : NaN;
    return isFinite(t) ? t : -Infinity;
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
    return ("p" + Date.now().toString(36) + rand).slice(0, 40);
  }

  function stripLoneSurrogates(text) {
    return text.replace(LONE_SURROGATE_RE, function (match, before) { return before || ""; });
  }

  /** Clean a player name: no control characters, single spaces, at most 40 characters. */
  function cleanName(name) {
    if (typeof name !== "string") name = name === null || name === undefined ? "" : String(name);
    name = stripLoneSurrogates(name.replace(/[\t\n\r\v\f]/g, " ").replace(CONTROL_RE, ""))
      .replace(/\s+/g, " ").trim();
    var chars = Array.from(name);
    if (chars.length > MAX_NAME) name = chars.slice(0, MAX_NAME).join("").replace(/‍+$/, "").trim();
    return name;
  }

  function notPrototypeKey(key) {
    return !(key in Object.prototype) && !FORBIDDEN_KEYS[key];
  }

  function validCaseId(id) { return typeof id === "string" && CASE_ID_RE.test(id) && notPrototypeKey(id); }
  function validDrillId(id) { return typeof id === "string" && DRILL_ID_RE.test(id) && notPrototypeKey(id); }

  function validSeenKey(key) {
    return typeof key === "string" && key.length > 0 && key.length <= 100 && notPrototypeKey(key) &&
      !HAS_CONTROL_RE.test(key) && !HAS_LONE_SURROGATE_RE.test(key);
  }

  function validSettingKey(key) {
    return typeof key === "string" && (key === "sound" || key === "reduceMotion" || key === "textSize" ||
      (SETTING_KEY_RE.test(key) && notPrototypeKey(key)));
  }

  /** FNV-1a, folded to 6 base-36 characters. Used for compact SCORM ids and code checksums. */
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

  function clone(value) {
    return value === null || value === undefined ? null : JSON.parse(JSON.stringify(value));
  }

  function sameJson(a, b) {
    return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
  }

  function parseJSON(text) {
    if (typeof text !== "string" || !text) return null;
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  function b36(n) { return Math.max(0, Math.floor(n)).toString(36); }

  function unb36(text, max) {
    if (typeof text !== "string" || !B36_RE.test(text)) return null;
    var n = parseInt(text, 36);
    return isFinite(n) && n <= max ? n : null;
  }

  /** An ISO time as base-36 minutes since 2020-01-01 ("" for none or earlier). */
  function minutesOf(iso) {
    var t = timeOf(iso);
    if (!isFinite(t) || t < TIME_EPOCH) return "";
    return b36((t - TIME_EPOCH) / 60000);
  }

  function isoFromMinutes(text) {
    var n = unb36(text, 1e9);
    return n === null ? null : isoOr(TIME_EPOCH + n * 60000, null);
  }

  /** Percent-encode everything except A–Z a–z 0–9 - _ (so "." "," ":" "|" stay free as separators). */
  function esc(text) {
    try {
      return encodeURIComponent(String(text)).replace(/[!'()*~.]/g, function (c) {
        return "%" + c.charCodeAt(0).toString(16).toUpperCase();
      });
    } catch (e) {
      return "";
    }
  }

  function unesc(text) {
    try { return decodeURIComponent(String(text)); } catch (e) { return null; }
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
      else { out += "�"; i++; continue; }
      var ok = true;
      for (var k = 1; k <= need; k++) {
        var n = bytes[i + k];
        if (n === undefined || (n & 0xc0) !== 0x80) { ok = false; break; }
        c = (c << 6) | (n & 63);
      }
      if (!ok) { out += "�"; i++; continue; }
      i += need + 1;
      var overlong = (need === 2 && c < 0x800) || (need === 3 && c < 0x10000);
      if (overlong || c > 0x10ffff || (c >= 0xd800 && c <= 0xdfff)) { out += "�"; continue; }
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

  /** Decode base64url (no padding). null if invalid. */
  function base64urlDecode(text) {
    text = String(text);
    if (text.length % 4 === 1) return null;
    var bytes = [];
    var buffer = 0, bits = 0;
    for (var i = 0; i < text.length; i++) {
      var v = B64.indexOf(text.charAt(i));
      if (v === -1) return null;
      buffer = ((buffer << 6) | v) & 0xffffff;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((buffer >> bits) & 255);
      }
    }
    return bytes;
  }

  function b64json(value) {
    return base64urlEncode(utf8Encode(JSON.stringify(value)));
  }

  function unb64json(text) {
    var bytes = base64urlDecode(text);
    if (!bytes) return null;
    try { return JSON.parse(utf8Decode(bytes)); } catch (e) { return null; }
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

  function retryFailedWrites(except) {
    if (!local) return;
    Object.keys(failedKeys).forEach(function (other) {
      if (other !== except && hasOwn.call(memory, other)) trySet(other, memory[other]);
    });
  }

  /** Write a key (kept in memory if localStorage refuses). Also retries earlier failed writes. */
  function writeKey(key, value) {
    memory[key] = value;
    if (!local) return false;
    var ok = trySet(key, value);
    retryFailedWrites(key);
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
    if (scormMode) return lmsFailing ? MSG.scormFailed : null;
    if (localBlocked) return MSG.blocked;
    return storageFailing() ? MSG.full : null;
  }

  // ---------------------------------------------------------------------------
  // Profiles: creation and sanitising
  // ---------------------------------------------------------------------------

  function defaultSettings() {
    return { sound: true, reduceMotion: false, textSize: "md" };
  }

  function extraSettingCount(s) {
    return Object.keys(s).filter(function (k) { return k !== "sound" && k !== "reduceMotion" && k !== "textSize"; }).length;
  }

  /** `base` (or the defaults) with the valid values of `raw` applied. */
  function sanitizeSettings(raw, base) {
    var s = isPlainObject(base) ? sanitizeSettings(base, null) : defaultSettings();
    if (!isPlainObject(raw)) return s;
    Object.keys(raw).forEach(function (key) {
      if (!validSettingKey(key)) return;
      var value = raw[key];
      if (key === "sound" || key === "reduceMotion") {
        if (typeof value === "boolean") s[key] = value;
        return;
      }
      if (key === "textSize") {
        if (typeof value === "string" && TEXT_SIZE_RE.test(value)) s.textSize = value;
        return;
      }
      if (value === null) { delete s[key]; return; }
      var ok = typeof value === "boolean" || (typeof value === "number" && isFinite(value)) ||
        (typeof value === "string" && value.length <= 40 && !HAS_CONTROL_RE.test(value) && !HAS_LONE_SURROGATE_RE.test(value));
      if (!ok) return;
      if (!hasOwn.call(s, key) && extraSettingCount(s) >= MAX_EXTRA_SETTINGS) return;
      s[key] = value;
    });
    return s;
  }

  function emptyRecord() {
    return {
      solved: false, bestStars: 0, bestStrikes: null, xp: 0, plays: 0,
      firstSolvedAt: null, lastPlayedAt: null, current: null
    };
  }

  /** A JSON value without prototype keys, functions or absurd nesting. */
  function cleanJson(value, depth) {
    if (value === null) return null;
    var type = typeof value;
    if (type === "string" || type === "boolean") return value;
    if (type === "number") return isFinite(value) ? value : null;
    if (type !== "object") return undefined;
    if (depth >= MAX_JSON_DEPTH) return null;
    if (Array.isArray(value)) {
      return value.map(function (item) {
        var v = cleanJson(item, depth + 1);
        return v === undefined ? null : v;
      });
    }
    var out = {};
    Object.keys(value).forEach(function (key) {
      if (FORBIDDEN_KEYS[key]) return;
      var v = cleanJson(value[key], depth + 1);
      if (v !== undefined) out[key] = v;
    });
    return out;
  }

  /** The UI's in-progress payload as a clean JSON object, or null if it can't be stored. */
  function sanitizeCurrent(raw) {
    if (!isPlainObject(raw)) return null;
    var json;
    try { json = JSON.stringify(raw); } catch (e) { return null; }
    if (typeof json !== "string" || json.length > MAX_CURRENT_CHARS) return null;
    var clean = cleanJson(parseJSON(json), 0);
    return isPlainObject(clean) ? clean : null;
  }

  function sanitizeRecord(raw, id) {
    if (!isPlainObject(raw)) return null;
    var r = emptyRecord();
    r.solved = raw.solved === true;
    if (r.solved) {
      r.bestStars = clampInt(raw.bestStars, 1, 3, 1);
      r.bestStrikes = raw.bestStrikes === null || raw.bestStrikes === undefined ? null : clampInt(raw.bestStrikes, 0, MAX_STRIKES, null);
      r.xp = clampInt(raw.xp, 0, MAX_XP, 0);
      r.firstSolvedAt = isoOr(raw.firstSolvedAt, null);
    }
    r.plays = clampInt(raw.plays, 0, MAX_COUNT, 0);
    if (r.solved && r.plays < 1) r.plays = 1;
    r.lastPlayedAt = isoOr(raw.lastPlayedAt, null);
    r.current = raw.current === null || raw.current === undefined ? null : sanitizeCurrent(raw.current);
    refreshXp(id, r);
    return r;
  }

  function sanitizeDrill(raw) {
    if (!isPlainObject(raw)) return null;
    return { best: clampInt(raw.best, 0, MAX_COUNT, 0), played: clampInt(raw.played, 0, MAX_COUNT, 0) };
  }

  function newProfileObject(name, settings) {
    var t = nowISO();
    return {
      v: PROFILE_VERSION,
      id: makeId(),
      name: cleanName(name) || DEFAULT_NAME,
      createdAt: t,
      updatedAt: t,
      settings: sanitizeSettings(settings, null),
      seen: {},
      cases: {},
      drills: {}
    };
  }

  /** Turn anything (parsed JSON from storage or an import) into a valid profile, or null. */
  function sanitizeProfile(raw) {
    if (!isPlainObject(raw)) return null;
    var p = newProfileObject(raw.name);
    if (typeof raw.id === "string" && PROFILE_ID_RE.test(raw.id)) p.id = raw.id;
    p.createdAt = isoOr(raw.createdAt, p.createdAt);
    p.updatedAt = isoOr(raw.updatedAt, p.createdAt);
    p.settings = sanitizeSettings(raw.settings, null);
    var seenKeys = Array.isArray(raw.seen) ? raw.seen
      : isPlainObject(raw.seen) ? Object.keys(raw.seen).filter(function (k) { return raw.seen[k] === true; }) : [];
    seenKeys.slice(0, MAX_SEEN).forEach(function (key) {
      if (validSeenKey(key)) p.seen[key] = true;
    });
    if (isPlainObject(raw.cases)) {
      Object.keys(raw.cases).slice(0, MAX_CASES).forEach(function (id) {
        if (!validCaseId(id)) return;
        var rec = sanitizeRecord(raw.cases[id], id);
        if (rec) p.cases[id] = rec;
      });
    }
    if (isPlainObject(raw.drills)) {
      Object.keys(raw.drills).slice(0, MAX_DRILLS).forEach(function (id) {
        if (!validDrillId(id)) return;
        var d = sanitizeDrill(raw.drills[id]);
        if (d) p.drills[id] = d;
      });
    }
    return p;
  }

  /** Replace the contents of a profile object without changing its identity. */
  function assignInPlace(target, source) {
    Object.keys(target).forEach(function (k) { if (!hasOwn.call(source, k)) delete target[k]; });
    Object.keys(source).forEach(function (k) { target[k] = source[k]; });
  }

  // ---------------------------------------------------------------------------
  // Content and progress (CCF.Progress and CCF.content load after this file)
  // ---------------------------------------------------------------------------

  function progress() { return CCF.Progress || null; }

  function contentCase(id) {
    var P = progress();
    if (P && typeof P.getCase === "function") {
      try { return P.getCase(id); } catch (e) { return null; }
    }
    return null;
  }

  function contentIds() {
    var P = progress();
    var list = [];
    try { list = P && typeof P.allCases === "function" ? P.allCases() : []; } catch (e) { list = []; }
    return list.map(function (k) { return k.id; }).filter(validCaseId);
  }

  /** Keep a record's xp in line with the content (cases the content doesn't know keep theirs). */
  function refreshXp(id, rec) {
    if (!rec) return rec;
    if (!rec.solved) { rec.xp = 0; return rec; }
    var k = contentCase(id);
    var P = progress();
    if (k && P) rec.xp = P.xpFor(k, rec.bestStars);
    return rec;
  }

  function refreshAllXp(profile) {
    Object.keys(profile.cases).forEach(function (id) { refreshXp(id, profile.cases[id]); });
    return profile;
  }

  function fallbackStars(strikes, steps) {
    if (strikes <= 0) return 3;
    return strikes <= Math.ceil(Math.max(1, steps) / 2) ? 2 : 1;
  }

  function totalXpOf(profile) {
    var P = progress();
    return P ? P.totalXp(profile) : 0;
  }

  function rankOf(xp) {
    var P = progress();
    if (P) return P.rankFor(xp);
    return { index: 0, title: "Student Clinician", minXp: 0, nextTitle: null, nextXp: null, fraction: 0 };
  }

  /** The slot summary of a profile (listSlots / summary). */
  function summaryOf(profile) {
    var P = progress();
    var stats = null;
    try { stats = P ? P.overall(profile) : null; } catch (e) { stats = null; }
    if (!stats) {
      stats = { solved: 0, total: 0, stars: 0, maxStars: 0, xp: 0, maxXp: 0, inProgress: 0 };
      Object.keys(profile.cases).forEach(function (id) {
        var rec = profile.cases[id];
        if (rec.solved) { stats.solved++; stats.stars += rec.bestStars; }
        if (rec.current) stats.inProgress++;
      });
    }
    var rank = rankOf(stats.xp);
    return {
      name: profile.name,
      rankTitle: rank.title,
      solved: stats.solved,
      total: stats.total,
      stars: stats.stars,
      updatedAt: profile.updatedAt,
      rankIndex: rank.index,
      xp: stats.xp,
      maxXp: stats.maxXp || 0,
      maxStars: stats.maxStars,
      inProgress: stats.inProgress || 0,
      createdAt: profile.createdAt,
      id: profile.id
    };
  }

  // ---------------------------------------------------------------------------
  // Merging two copies of a profile
  // ---------------------------------------------------------------------------

  /**
   * The in-progress state to keep when two copies of a record meet: the copy played more
   * recently wins; on a tie, the copy that changed it since `baseRec` (when known), else
   * `primary` (or `other` with preferOther).
   */
  function pickCurrent(primary, other, preferOther, baseRec) {
    var tp = timeOf(primary.lastPlayedAt), to = timeOf(other.lastPlayedAt);
    if (to > tp) return clone(other.current);
    if (tp > to) return clone(primary.current);
    if (sameJson(primary.current, other.current)) return clone(primary.current);
    if (baseRec !== undefined) {
      var baseCurrent = baseRec ? baseRec.current : null;
      if (sameJson(primary.current, baseCurrent)) return clone(other.current);
      if (sameJson(other.current, baseCurrent)) return clone(primary.current);
    }
    return clone(preferOther ? other.current : primary.current);
  }

  /** Best of two records (either may be null). */
  function mergeRecords(primary, other, preferOther, baseRec, id) {
    if (!primary && !other) return null;
    if (!primary) return refreshXp(id, clone(other));
    if (!other) return refreshXp(id, clone(primary));
    var r = emptyRecord();
    r.solved = primary.solved || other.solved;
    if (r.solved) {
      r.bestStars = Math.max(primary.solved ? primary.bestStars : 0, other.solved ? other.bestStars : 0, 1);
      var strikes = [primary, other].filter(function (x) { return x.solved && x.bestStrikes !== null; })
        .map(function (x) { return x.bestStrikes; });
      r.bestStrikes = strikes.length ? Math.min.apply(null, strikes) : null;
      r.xp = Math.max(primary.solved ? primary.xp : 0, other.solved ? other.xp : 0);
      var firsts = [primary.firstSolvedAt, other.firstSolvedAt].filter(Boolean).sort();
      r.firstSolvedAt = firsts[0] || null;
    }
    r.plays = Math.max(primary.plays, other.plays);
    var lasts = [primary.lastPlayedAt, other.lastPlayedAt].filter(Boolean).sort();
    r.lastPlayedAt = lasts.length ? lasts[lasts.length - 1] : null;
    r.current = pickCurrent(primary, other, preferOther, baseRec);
    return refreshXp(id, r);
  }

  /**
   * Merge `theirs` into a copy of `mine` (both valid profiles), taking the best of each case.
   * With preferTheirs, their name and settings win. `base` (optional) is the copy both
   * started from, for in-progress ties.
   */
  function mergeProfiles(mine, theirs, preferTheirs, base) {
    var out = clone(mine);
    var count = Object.keys(out.cases).length;
    Object.keys(theirs.cases).forEach(function (id) {
      var have = hasOwn.call(out.cases, id);
      if (!have && count >= MAX_CASES) return;
      if (!have) count++;
      var baseRec = base ? (hasOwn.call(base.cases, id) ? base.cases[id] : null) : undefined;
      out.cases[id] = mergeRecords(have ? out.cases[id] : null, theirs.cases[id], preferTheirs, baseRec, id);
    });
    Object.keys(theirs.seen).forEach(function (key) {
      if (Object.keys(out.seen).length < MAX_SEEN || hasOwn.call(out.seen, key)) out.seen[key] = true;
    });
    Object.keys(theirs.drills).forEach(function (id) {
      var a = hasOwn.call(out.drills, id) ? out.drills[id] : null, b = theirs.drills[id];
      if (!a && Object.keys(out.drills).length >= MAX_DRILLS) return;
      out.drills[id] = a ? { best: Math.max(a.best, b.best), played: Math.max(a.played, b.played) } : clone(b);
    });
    if (preferTheirs) {
      out.name = theirs.name || out.name;
      out.settings = sanitizeSettings(theirs.settings, null);
    }
    if (theirs.createdAt < out.createdAt) out.createdAt = theirs.createdAt;
    if (theirs.updatedAt > out.updatedAt) out.updatedAt = theirs.updatedAt;
    return out;
  }

  /** Three-way choice: if this tab changed the value since `base`, keep ours, else take theirs. */
  function pick(base, mine, theirs) {
    return sameJson(mine, base) ? theirs : mine;
  }

  /**
   * Merge another tab's copy of the same profile into ours: progress is the best of each
   * case; the name and each setting come from whichever tab changed them since `base`
   * (what this tab last saw stored).
   */
  function mergeTabs(base, mine, theirs) {
    var out = mergeProfiles(mine, theirs, false, base || null);
    if (!base) return out;
    out.name = pick(base.name, mine.name, theirs.name) || out.name;
    var keys = {};
    [base.settings, mine.settings, theirs.settings].forEach(function (s) { Object.keys(s).forEach(function (k) { keys[k] = true; }); });
    var settings = {};
    Object.keys(keys).forEach(function (k) {
      var value = pick(own(base.settings, k), own(mine.settings, k), own(theirs.settings, k));
      if (value !== null && value !== undefined) settings[k] = value;
    });
    out.settings = sanitizeSettings(settings, null);
    return out;
  }

  function own(obj, key) {
    return obj && hasOwn.call(obj, key) ? obj[key] : null;
  }

  // ---------------------------------------------------------------------------
  // Packing a profile into one line of text (save codes and SCORM suspend_data)
  //
  //   C1|<meta>|<name>|<settings>|<seen>|<cases>|<in progress>|<drills>
  //   meta        <profile id>.<created>.<updated>       times: base-36 minutes since 2020-01-01
  //   name        percent-encoded (only A–Z a–z 0–9 - _ stay as they are)
  //   settings    <flags: sound 1 + reduceMotion 2>.<textSize>[.<base64url JSON of other settings>]
  //   seen        the seen keys, percent-encoded, joined with "."
  //   cases       <key>:<state>[.<best strikes>[.<plays>[.<first solved>[.<last played>]]]] joined with ","
  //               key = the case id (save codes) or its 6-character hash (suspend_data);
  //               state = solved + 2 × best stars (0–7); numbers in base 36 ("" = 0 / none);
  //               an empty <last played> after a <first solved> means the same time.
  //   in progress <key>:<base64url JSON of `current`> joined with ","
  //   drills      <drill id>:<best>[.<played>] joined with ","
  // ---------------------------------------------------------------------------

  var CODE_OPTS = { hash: false, dates: true, plays: true, seen: true, currents: "all", unsolved: true, drills: true, extraSettings: true };

  var LADDER = [
    { dates: true, plays: true, seen: true, currents: "all", unsolved: true, drills: true, extraSettings: true },
    { dates: true, plays: true, seen: true, currents: "recent", unsolved: true, drills: true, extraSettings: true },
    { dates: false, plays: true, seen: true, currents: "recent", unsolved: true, drills: true, extraSettings: true },
    { dates: false, plays: false, seen: true, currents: "recent", unsolved: true, drills: true, extraSettings: true },
    { dates: false, plays: false, seen: false, currents: "recent", unsolved: true, drills: true, extraSettings: true },
    { dates: false, plays: false, seen: false, currents: "none", unsolved: true, drills: true, extraSettings: true },
    { dates: false, plays: false, seen: false, currents: "none", unsolved: false, drills: false, extraSettings: false }
  ];

  function withOpts(base, extra) {
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(extra || {}).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }

  function packSettings(s, withExtras) {
    var out = b36((s.sound ? 1 : 0) + (s.reduceMotion ? 2 : 0)) + "." + esc(s.textSize);
    if (withExtras) {
      var extras = {};
      Object.keys(s).forEach(function (k) { if (k !== "sound" && k !== "reduceMotion" && k !== "textSize") extras[k] = s[k]; });
      if (Object.keys(extras).length) out += "." + b64json(extras);
    }
    return out;
  }

  function unpackSettings(text) {
    var parts = String(text || "").split(".");
    var s = defaultSettings();
    var flags = unb36(parts[0] || "", 3);
    if (flags !== null) {
      s.sound = !!(flags & 1);
      s.reduceMotion = !!(flags & 2);
    }
    var size = parts[1] ? unesc(parts[1]) : null;
    if (typeof size === "string" && TEXT_SIZE_RE.test(size)) s.textSize = size;
    if (parts[2]) {
      var extras = unb64json(parts[2]);
      if (isPlainObject(extras)) {
        delete extras.sound; delete extras.reduceMotion; delete extras.textSize;
        s = sanitizeSettings(extras, s);
      }
    }
    return s;
  }

  function meaningful(rec) {
    return !!(rec && (rec.solved || rec.plays > 0 || rec.current || rec.lastPlayedAt));
  }

  function packRecord(key, rec, opts) {
    var state = rec.solved ? 1 + 2 * Math.min(3, Math.max(1, rec.bestStars)) : 0;
    var first = opts.dates && rec.solved ? minutesOf(rec.firstSolvedAt) : "";
    var last = opts.dates ? minutesOf(rec.lastPlayedAt) : "";
    if (first && last === first) last = "";
    var fields = [
      rec.solved && rec.bestStrikes ? b36(Math.min(MAX_STRIKES, rec.bestStrikes)) : "",
      opts.plays && rec.plays ? b36(Math.min(MAX_COUNT, rec.plays)) : "",
      first,
      last
    ];
    while (fields.length && fields[fields.length - 1] === "") fields.pop();
    return key + ":" + b36(state) + (fields.length ? "." + fields.join(".") : "");
  }

  function unpackRecord(stateDigit, rest) {
    var state = parseInt(stateDigit, 36);
    var f = rest ? rest.slice(1).split(".") : [];
    var r = emptyRecord();
    r.solved = (state & 1) === 1;
    if (r.solved) {
      r.bestStars = Math.min(3, Math.max(1, state >> 1));
      r.bestStrikes = f[0] ? (unb36(f[0], MAX_STRIKES) || 0) : 0;
    }
    r.plays = f[1] ? (unb36(f[1], MAX_COUNT) || 0) : 0;
    if (r.solved && r.plays < 1) r.plays = 1;
    var first = f[2] ? isoFromMinutes(f[2]) : null;
    var last = f[3] ? isoFromMinutes(f[3]) : null;
    if (r.solved) r.firstSolvedAt = first;
    r.lastPlayedAt = last || first;
    return r;
  }

  /** Case ids of a profile in play order (content order first, then the others sorted). */
  function orderedIds(profile) {
    var out = [];
    var taken = Object.create(null);
    contentIds().forEach(function (id) {
      if (hasOwn.call(profile.cases, id) && !taken[id]) { taken[id] = true; out.push(id); }
    });
    Object.keys(profile.cases).sort().forEach(function (id) {
      if (!taken[id]) { taken[id] = true; out.push(id); }
    });
    return out;
  }

  function pack(profile, opts) {
    var keyOf = function (id) { return opts.hash ? hash6(id) : id; };
    var ids = orderedIds(profile);
    var meta = [esc(profile.id), minutesOf(profile.createdAt), minutesOf(profile.updatedAt)].join(".");
    var seen = opts.seen ? Object.keys(profile.seen).filter(function (k) { return profile.seen[k] === true; }).sort().map(esc).join(".") : "";

    var entries = [];
    ids.forEach(function (id) {
      var rec = profile.cases[id];
      if (!meaningful(rec) || (!opts.unsolved && !rec.solved)) return;
      entries.push(packRecord(keyOf(id), rec, opts));
    });
    if (opts.hash) {
      Object.keys(scormExtras.records).sort().forEach(function (h) {
        var rec = scormExtras.records[h];
        if (!opts.unsolved && !rec.solved) return;
        entries.push(packRecord(h, rec, opts));
      });
    }
    if (opts.maxEntries !== undefined) entries = entries.slice(0, opts.maxEntries);

    var currents = [];
    if (opts.currents !== "none") {
      var busy = ids.filter(function (id) { return profile.cases[id].current; });
      if (opts.currents === "recent" && busy.length > 1) {
        var latest = busy[0];
        busy.forEach(function (id) {
          if (timeOf(profile.cases[id].lastPlayedAt) > timeOf(profile.cases[latest].lastPlayedAt)) latest = id;
        });
        busy = [latest];
      }
      busy.forEach(function (id) { currents.push(keyOf(id) + ":" + b64json(profile.cases[id].current)); });
      if (opts.hash && opts.currents === "all") {
        Object.keys(scormExtras.currents).sort().forEach(function (h) { currents.push(h + ":" + scormExtras.currents[h]); });
      }
    }

    var drills = !opts.drills ? [] : Object.keys(profile.drills).sort().map(function (id) {
      var d = profile.drills[id];
      return id + ":" + b36(d.best) + (opts.plays && d.played ? "." + b36(d.played) : "");
    });

    return [PACK_PREFIX, meta, esc(profile.name), packSettings(profile.settings, opts.extraSettings), seen,
      entries.join(","), currents.join(","), drills.join(",")].join("|");
  }

  /**
   * Unpack text made by pack(). hashMode: keys are 6-character hashes, looked up in idByHash
   * (unmatched ones are returned in `extras`). Returns { profile, extras } or null.
   */
  function unpack(text, hashMode, idByHash) {
    if (typeof text !== "string" || text.length > MAX_PACKED_CHARS) return null;
    var parts = text.split("|");
    if (parts.length < 8 || parts[0] !== PACK_PREFIX) return null;
    var p = newProfileObject("");
    var extras = emptyExtras();
    var resolve = function (key) {
      if (hashMode) return HASH_RE.test(key) && hasOwn.call(idByHash, key) ? idByHash[key] : null;
      return validCaseId(key) ? key : null;
    };

    var meta = parts[1].split(".");
    var pid = unesc(meta[0] || "");
    if (typeof pid === "string" && PROFILE_ID_RE.test(pid)) p.id = pid;
    var created = isoFromMinutes(meta[1] || "");
    if (created) p.createdAt = created;
    p.updatedAt = isoFromMinutes(meta[2] || "") || p.createdAt;

    var name = unesc(parts[2] || "");
    p.name = typeof name === "string" ? cleanName(name) : "";
    p.settings = unpackSettings(parts[3]);

    if (parts[4]) {
      parts[4].split(".").slice(0, MAX_SEEN).forEach(function (k) {
        var key = unesc(k);
        if (validSeenKey(key)) p.seen[key] = true;
      });
    }

    var count = 0;
    if (parts[5]) {
      parts[5].split(",").forEach(function (entry) {
        var m = ENTRY_RE.exec(entry);
        if (!m) return;
        var rec = unpackRecord(m[2], m[3]);
        var id = resolve(m[1]);
        if (id) {
          if (!hasOwn.call(p.cases, id) && count >= MAX_CASES) return;
          if (!hasOwn.call(p.cases, id)) count++;
          p.cases[id] = rec;
        } else if (hashMode && HASH_RE.test(m[1]) && Object.keys(extras.records).length < MAX_SCORM_EXTRAS) {
          extras.records[m[1]] = rec;
        }
      });
    }

    if (parts[6]) {
      parts[6].split(",").forEach(function (entry) {
        var m = CURRENT_RE.exec(entry);
        if (!m) return;
        var id = resolve(m[1]);
        if (id) {
          var current = sanitizeCurrent(unb64json(m[2]));
          if (!current) return;
          if (!hasOwn.call(p.cases, id)) {
            if (count >= MAX_CASES) return;
            count++;
            p.cases[id] = emptyRecord();
          }
          p.cases[id].current = current;
        } else if (hashMode && HASH_RE.test(m[1]) && m[2].length <= MAX_CURRENT_CHARS * 2 &&
                   Object.keys(extras.currents).length < MAX_SCORM_EXTRAS) {
          extras.currents[m[1]] = m[2];
        }
      });
    }

    if (parts[7]) {
      parts[7].split(",").slice(0, MAX_DRILLS).forEach(function (entry) {
        var m = DRILL_RE.exec(entry);
        if (!m || !validDrillId(m[1])) return;
        p.drills[m[1]] = { best: unb36(m[2], MAX_COUNT) || 0, played: m[3] ? (unb36(m[3], MAX_COUNT) || 0) : 0 };
      });
    }

    refreshAllXp(p);
    return { profile: p, extras: extras };
  }

  // ---------------------------------------------------------------------------
  // SCORM: suspend_data
  // ---------------------------------------------------------------------------

  /** Pack a profile for suspend_data, dropping optional detail until it fits the budget. */
  function encodeSuspend(profile, budget) {
    budget = budget || SUSPEND_BUDGET;
    var text = "";
    for (var i = 0; i < LADDER.length; i++) {
      text = pack(profile, withOpts(LADDER[i], { hash: true }));
      if (text.length <= budget) return text;
    }
    // Still too long (hundreds of cases): keep as many entries as fit.
    var opts = withOpts(LADDER[LADDER.length - 1], { hash: true });
    var lo = 0, hi = Object.keys(profile.cases).length + Object.keys(scormExtras.records).length;
    while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      opts.maxEntries = mid;
      if (pack(profile, opts).length <= budget) lo = mid; else hi = mid - 1;
    }
    opts.maxEntries = lo;
    return pack(profile, opts);
  }

  function hashTable(ids) {
    var table = {};
    ids.forEach(function (id) {
      var h = hash6(id);
      if (!hasOwn.call(table, h)) table[h] = id;
    });
    return table;
  }

  /**
   * Decode suspend_data into a profile. Case hashes that match no known id (the content's
   * and those of `knownProfile`) are kept in scormExtras and written back unchanged.
   * null if unreadable.
   */
  function decodeSuspend(text, knownProfile) {
    var ids = contentIds();
    if (knownProfile) ids = ids.concat(Object.keys(knownProfile.cases));
    var result = unpack(text, true, hashTable(ids));
    if (!result) return null;
    scormExtras = result.extras;
    return result.profile;
  }

  /**
   * suspend_data entries that matched no case id are kept aside. If the content registers
   * later (or the id appears in the profile), adopt the ones that now match.
   */
  function adoptExtras() {
    if (!scormMode || !active) return false;
    var records = Object.keys(scormExtras.records), currents = Object.keys(scormExtras.currents);
    if (!records.length && !currents.length) return false;
    var table = hashTable(contentIds().concat(Object.keys(active.profile.cases)));
    var cases = active.profile.cases;
    var adopted = false;
    records.forEach(function (h) {
      if (!hasOwn.call(table, h)) return;
      var id = table[h];
      cases[id] = mergeRecords(hasOwn.call(cases, id) ? cases[id] : null, scormExtras.records[h], true, undefined, id);
      delete scormExtras.records[h];
      adopted = true;
    });
    currents.forEach(function (h) {
      if (!hasOwn.call(table, h)) return;
      var id = table[h];
      var current = sanitizeCurrent(unb64json(scormExtras.currents[h]));
      delete scormExtras.currents[h];
      adopted = true;
      if (!current) return;
      if (!hasOwn.call(cases, id)) cases[id] = emptyRecord();
      if (!cases[id].current) cases[id].current = current;
    });
    if (adopted) writeActive();
    return adopted;
  }

  function lmsReady() {
    try { return scormMode && !!CCF.Scorm && CCF.Scorm.isActive(); } catch (e) { return false; }
  }

  function commitLms() {
    if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; }
    lastCommitAt = Date.now();
    try { return CCF.Scorm.commit() === true; } catch (e) { return false; }
  }

  /** Routine changes: commit at once if the last commit was a minute ago, else when it is. */
  function scheduleCommit() {
    if (commitTimer) return true;
    var wait = lastCommitAt + COMMIT_INTERVAL_MS - Date.now();
    if (wait <= 0) return commitLms();
    commitTimer = setTimeout(function () {
      commitTimer = null;
      if (!lmsReady()) return;
      lmsFailing = !commitLms();
      checkStatus();
    }, wait);
    return true;
  }

  /**
   * Send the active profile to the LMS. CCF.Scorm skips values that haven't changed and only
   * commits when something was sent. urgent (a solve, an import, init, the page being hidden
   * or closed): commit now; otherwise at most once a minute.
   */
  function pushScorm(urgent) {
    if (!active || !lmsReady()) return false;
    adoptExtras();
    var merged = syncActive();
    var ok = true;
    try {
      var limit = Math.min(SUSPEND_BUDGET, CCF.Scorm.suspendDataLimit ? CCF.Scorm.suspendDataLimit() : 4096);
      ok = CCF.Scorm.saveSuspendData(encodeSuspend(active.profile, limit)) && ok;
      var P = progress();
      if (P) {
        var stats = P.overall(active.profile);
        ok = CCF.Scorm.reportProgress({ solved: stats.solved, total: stats.total }) && ok;
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
  // Keeping two tabs of the game in step, and persisting the active profile
  // ---------------------------------------------------------------------------

  function activeKey() {
    if (!active) return null;
    return scormMode ? scormKey() : slotKey(active.slot);
  }

  /**
   * If another tab stored a different version of the active profile since this tab last
   * looked, merge it in (or, if that slot now holds a different profile, switch to it).
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

  function writeActive() {
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

  /** Tell the listeners; changes made inside a listener are announced after this round. */
  function notify(type, caseId) {
    noticeQueue.push({ type: type, caseId: caseId || null });
    if (notifying) return;
    notifying = true;
    try {
      var rounds = 0;
      while (noticeQueue.length && rounds++ < 100) {
        var notice = noticeQueue.shift();
        var list = listeners.slice();
        for (var i = 0; i < list.length; i++) {
          try {
            list[i](active ? clone(active.profile) : null, { type: notice.type, caseId: notice.caseId });
          } catch (e) {
            warn("an onChange listener failed", e);
          }
        }
      }
      if (noticeQueue.length) {
        warn("onChange: changes kept causing more changes; " + noticeQueue.length + " notices were dropped");
        noticeQueue = [];
      }
    } finally {
      notifying = false;
    }
  }

  /** Announce "status" when the storage warning changes. */
  function checkStatus() {
    var w = currentWarning();
    if (w !== lastWarning) {
      lastWarning = w;
      notify("status", null);
    }
  }

  /** Save a change right away (and send it to the LMS in SCORM mode), then tell the listeners. */
  function commitChange(type, caseId, urgent) {
    writeActive();
    if (scormMode) pushScorm(!!urgent);
    notify(type, caseId);
    checkStatus();
  }

  /** The page is being hidden or closed: retry failed writes and commit to the LMS now. */
  function flushNow() {
    if (active && local && hasOwn.call(failedKeys, activeKey())) writeActive();
    retryFailedWrites(null);
    if (scormMode) {
      if (active) pushScorm(true);
      else if (lmsReady()) commitLms();
    }
    checkStatus();
  }

  function onStorageEvent(event) {
    try {
      if (!event) return;
      if (event.storageArea && local && event.storageArea !== local) return;
      var key = event.key;
      if (active && (key === activeKey() || key === null || key === undefined)) {
        if (syncActive()) notify("sync", null);
        return;
      }
      if (!scormMode && (key === null || key === undefined || (typeof key === "string" && key.indexOf(prefix() + ":") === 0))) {
        notify("slots", null);
      }
    } catch (e) {
      warn("could not merge another tab's save", e);
    }
  }

  function installPageHooks() {
    try {
      if (typeof global.addEventListener === "function") {
        global.addEventListener("pagehide", function (event) {
          flushNow();
          if (scormMode && CCF.Scorm && !(event && event.persisted)) {
            try { CCF.Scorm.finish(); } catch (e) { /* ignore */ }
          }
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
  // Init and the LMS connection
  // ---------------------------------------------------------------------------

  function scormWanted() {
    var cfg = config();
    if (cfg.scorm === false || (cfg.scorm && cfg.scorm.enabled === false)) return false;
    return !!CCF.Scorm && typeof CCF.Scorm.connect === "function";
  }

  function makeInitResult() {
    var result = {
      mode: scormMode ? "scorm" : "local",
      storageOk: !!local && !storageFailing(),
      warning: currentWarning(),
      learnerName: scormMode && learner && learner.name ? learner.name : null,
      scormMissing: scormMissing,
      pending: retrying,
      scormVersion: scormMode && CCF.Scorm ? CCF.Scorm.version || null : null
    };
    lastWarning = result.warning;
    return result;
  }

  /** The learner's name from the LMS, cleaned (the default player name in SCORM mode). */
  function defaultName() {
    return (learner && cleanName(learner.name)) || DEFAULT_NAME;
  }

  /** A fresh LMS attempt: the same player name and settings, no progress. */
  function restartOf(profile) {
    return newProfileObject(profile.name, profile.settings);
  }

  /** Try to connect to the LMS; on success, switch to SCORM mode and load the learner's profile. */
  function connectLms() {
    var ok = false;
    try { ok = CCF.Scorm.connect() === true; } catch (e) { ok = false; }
    if (!ok) return false;
    var previous = active;
    scormMode = true;
    scormMissing = false;
    try { learner = CCF.Scorm.getLearner(); } catch (e) { learner = null; }
    if (!learner || typeof learner !== "object") learner = { id: "", name: "" };
    var key = scormKey();
    var raw = readKey(key);
    if (raw !== null && readStored(key) === raw) lastSeen[key] = raw;
    var localCopy = sanitizeProfile(parseJSON(raw));
    var suspend = "";
    try { suspend = String(CCF.Scorm.loadSuspendData() || ""); } catch (e) { suspend = ""; }
    var fresh = false;
    try { fresh = !suspend && CCF.Scorm.isFreshAttempt() === true; } catch (e) { fresh = false; }
    var lms = null;
    if (suspend) {
      try { lms = decodeSuspend(suspend, localCopy); } catch (e) { lms = null; }
      if (!lms) warn("the course's saved data (suspend_data) could not be read; starting from this browser's copy");
    }
    var profile = null;
    if (fresh) {
      // A new attempt (or the instructor reset this one): start again with the same name and settings.
      profile = localCopy ? restartOf(localCopy) : null;
    } else if (localCopy && lms) {
      if (!lms.name) lms.name = localCopy.name;
      profile = mergeProfiles(localCopy, lms, true, null);
    } else if (lms) {
      if (!lms.name) lms.name = defaultName();
      profile = lms;
    } else {
      profile = localCopy;
    }
    if (!profile) profile = newProfileObject(defaultName(), previous ? previous.profile.settings : looseSettings);
    refreshAllXp(profile);
    active = { slot: 0, profile: profile };
    writeActive();
    pushScorm(true);
    return true;
  }

  function ensureInit() {
    if (initialised) return;
    initialised = true;
    var opened = openLocalStorage();
    local = opened.ls;
    localBlocked = !opened.ls;
    probeFailed = !!(opened.ls && !opened.writable);
    if (scormWanted()) {
      try { connectLms(); } catch (e) { warn("could not connect to the LMS", e); }
    }
    installPageHooks();
    lastWarning = currentWarning();
  }

  function logScormMissing() {
    var f = null;
    try { f = CCF.Scorm && CCF.Scorm.lastError ? CCF.Scorm.lastError() : null; } catch (e) { f = null; }
    warn("This is a SCORM package, but no connection to the LMS could be made " +
      (f ? "(" + f.call + ": error " + f.code + (f.text ? " " + f.text : "") + (f.diagnostic ? ", " + f.diagnostic : "") + ")"
        : "(no SCORM API in this window, its parents or its opener)") +
      ". Progress is only saved in this browser.");
  }

  /** A SCORM package without an LMS (yet): retry for ~2.5 s in the background. */
  function startRetries() {
    retryStarted = true;
    retrying = true;
    scormMissing = true;
    readyPromise = new Promise(function (resolve) {
      var attempt = 0;
      function done() {
        retrying = false;
        if (!scormMode) logScormMissing();
        resolve(makeInitResult());
      }
      function next() {
        if (scormMode || attempt >= SCORM_RETRY_DELAYS_MS.length) { done(); return; }
        setTimeout(function () {
          try {
            if (!scormMode && connectLms()) notify("scorm", null);
          } catch (e) { /* keep trying */ }
          next();
        }, SCORM_RETRY_DELAYS_MS[attempt++]);
      }
      next();
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function init() {
    ensureInit();
    if (!scormMode && !retryStarted && config().scormRequired === true && scormWanted()) startRetries();
    return makeInitResult();
  }

  function ready() {
    ensureInit();
    if (readyPromise) return readyPromise;
    return Promise.resolve(makeInitResult());
  }

  function isScorm() {
    ensureInit();
    return scormMode;
  }

  function storageWarning() {
    ensureInit();
    return currentWarning();
  }

  function canImport() {
    ensureInit();
    var cfg = config();
    return !scormMode || !!(cfg.scorm && cfg.scorm.allowImport === true);
  }

  /** A slot number (0 .. saveSlots-1; numeric strings are fine) or null. */
  function validSlot(slot) {
    var n = typeof slot === "string" && slot.trim() !== "" ? Number(slot) : slot;
    return typeof n === "number" && Math.floor(n) === n && n >= 0 && n < slotCount() ? n : null;
  }

  /** { profile, damaged, raw } for a slot; damaged when something is stored there that can't be read. */
  function readSlot(slot) {
    var raw = readKey(slotKey(slot));
    if (raw === null) return { profile: null, damaged: false, raw: null };
    var profile = sanitizeProfile(parseJSON(raw));
    return { profile: profile, damaged: !profile, raw: raw };
  }

  function slotInfo(slot, profile, damaged) {
    return { slot: slot, empty: !profile && !damaged, damaged: !!damaged, summary: profile ? summaryOf(profile) : null };
  }

  function listSlots() {
    ensureInit();
    if (scormMode) {
      if (active) { adoptExtras(); syncActive(); }
      return [slotInfo(0, active ? active.profile : null, false)];
    }
    var out = [];
    for (var slot = 0; slot < slotCount(); slot++) {
      if (active && active.slot === slot) {
        syncActive();
        out.push(slotInfo(slot, active.profile, false));
        continue;
      }
      var state = readSlot(slot);
      out.push(slotInfo(slot, state.profile, state.damaged));
    }
    return out;
  }

  function newProfile(slot, name) {
    ensureInit();
    var settings = active ? active.profile.settings : looseSettings;
    if (scormMode) {
      if (active) {
        // One course profile: "new" keeps the progress and only takes the name.
        syncActive();
        var clean = cleanName(name);
        if (clean && clean !== active.profile.name) {
          active.profile.name = clean;
          commitChange("rename", null, true);
        }
        return clone(active.profile);
      }
      active = { slot: 0, profile: newProfileObject(cleanName(name) || defaultName(), settings) };
      lastSeen[scormKey()] = readStored(scormKey());     // the new profile replaces whatever is stored
      commitChange("new", null, true);
      return clone(active.profile);
    }
    var s = validSlot(slot);
    if (s === null) {
      warn("newProfile: " + MSG.badSlot(slotCount()) + " (got " + String(slot) + ")");
      return null;
    }
    active = { slot: s, profile: newProfileObject(name, settings) };
    lastSeen[slotKey(s)] = readStored(slotKey(s));       // the new profile replaces whatever is stored
    commitChange("new", null);
    return clone(active.profile);
  }

  function load(slot) {
    ensureInit();
    if (scormMode) {
      if (active) { adoptExtras(); if (syncActive()) notify("sync", null); }
      return active ? clone(active.profile) : null;
    }
    var s = validSlot(slot);
    if (s === null) return null;
    if (active && active.slot === s) {
      if (syncActive()) notify("sync", null);        // another tab may have moved on
      if (readKey(lastSlotKey()) !== String(s)) writeKey(lastSlotKey(), String(s));
      return clone(active.profile);
    }
    var state = readSlot(s);
    if (!state.profile) return null;
    active = { slot: s, profile: state.profile };
    if (readStored(slotKey(s)) === state.raw) lastSeen[slotKey(s)] = state.raw;
    if (readKey(lastSlotKey()) !== String(s)) writeKey(lastSlotKey(), String(s));
    notify("load", null);
    return clone(active.profile);
  }

  function current() {
    ensureInit();
    adoptExtras();
    return active ? clone(active.profile) : null;
  }

  function currentSlot() {
    ensureInit();
    return active ? active.slot : null;
  }

  function lastSlot() {
    ensureInit();
    if (scormMode) return active ? 0 : null;
    var slot = clampInt(readKey(lastSlotKey()), -1, 1000, -1);
    if (slot < 0 || slot >= slotCount()) return null;
    if (active && active.slot === slot) return slot;
    return readSlot(slot).profile ? slot : null;
  }

  function deleteSlot(slot) {
    ensureInit();
    if (scormMode) return false;
    var s = validSlot(slot);
    if (s === null) return false;
    if (active && active.slot === s) active = null;
    removeKey(slotKey(s));
    if (readKey(lastSlotKey()) === String(s)) removeKey(lastSlotKey());
    notify("delete", null);
    checkStatus();
    return true;
  }

  function rename(name) {
    ensureInit();
    if (!active) return null;
    syncActive();
    var clean = cleanName(name);
    if (!clean) return active.profile.name;
    if (clean !== active.profile.name) {
      active.profile.name = clean;
      commitChange("rename", null, true);
    }
    return clean;
  }

  function settings() {
    ensureInit();
    return clone(active ? active.profile.settings : (looseSettings || defaultSettings()));
  }

  function setSetting(key, value) {
    ensureInit();
    var patch = {};
    if (isPlainObject(key)) {
      Object.keys(key).forEach(function (k) { if (validSettingKey(k)) patch[k] = key[k]; });
    } else if (validSettingKey(key)) {
      patch[key] = value;
    } else {
      return settings();
    }
    if (!active) {
      var loose = sanitizeSettings(patch, looseSettings || defaultSettings());
      if (!sameJson(loose, looseSettings || defaultSettings())) {
        looseSettings = loose;
        notify("settings", null);
      }
      return settings();
    }
    syncActive();
    var next = sanitizeSettings(patch, active.profile.settings);
    if (!sameJson(next, active.profile.settings)) {
      active.profile.settings = next;
      commitChange("settings", null);
    }
    return settings();
  }

  function hasSeen(key) {
    ensureInit();
    if (!active || !validSeenKey(key)) return false;
    return hasOwn.call(active.profile.seen, key) && active.profile.seen[key] === true;
  }

  function markSeen(key) {
    ensureInit();
    if (!active || !validSeenKey(key)) return false;
    syncActive();
    if (hasOwn.call(active.profile.seen, key) && active.profile.seen[key] === true) return true;
    if (Object.keys(active.profile.seen).length >= MAX_SEEN) return false;
    active.profile.seen[key] = true;
    commitChange("seen", null);
    return true;
  }

  function recordFor(caseId, create) {
    if (!active || !validCaseId(caseId)) return null;
    var all = active.profile.cases;
    if (hasOwn.call(all, caseId)) return all[caseId];
    if (!create || Object.keys(all).length >= MAX_CASES) return null;
    all[caseId] = emptyRecord();
    return all[caseId];
  }

  function caseRecord(caseId) {
    ensureInit();
    adoptExtras();
    var rec = recordFor(caseId, false);
    return rec ? clone(refreshXp(caseId, rec)) : null;
  }

  function saveCaseProgress(caseId, state) {
    ensureInit();
    if (state === null || state === undefined) return clearCaseProgress(caseId);
    if (!active || !validCaseId(caseId)) return false;
    var clean = sanitizeCurrent(state);
    if (!clean) {
      warn("saveCaseProgress(" + caseId + "): the in-progress state must be a JSON object of at most " +
        MAX_CURRENT_CHARS + " characters; it was not saved");
      return false;
    }
    syncActive();
    var rec = recordFor(caseId, true);
    if (!rec) return false;
    rec.current = clean;
    rec.lastPlayedAt = nowISO();
    commitChange("progress", caseId, false);
    return true;
  }

  function clearCaseProgress(caseId) {
    ensureInit();
    if (!active || !validCaseId(caseId)) return false;
    syncActive();
    var rec = recordFor(caseId, false);
    if (!rec || rec.current === null) return true;
    rec.current = null;
    rec.lastPlayedAt = nowISO();
    commitChange("progress", caseId, false);
    return true;
  }

  function rankLabel(rank) {
    return rank && typeof rank.title === "string" ? rank.title : "";
  }

  function recordSolve(caseId, details) {
    ensureInit();
    details = isPlainObject(details) ? details : {};
    var rec = active && validCaseId(caseId) ? (syncActive(), recordFor(caseId, true)) : null;
    if (!rec) {
      var xpNow = active ? totalXpOf(active.profile) : 0;
      return { stars: 0, firstSolve: false, improved: false, xpGained: 0, totalXp: xpNow, rankUp: null };
    }
    var P = progress();
    var kase = contentCase(caseId);
    var hints = clampInt(details.hints, 0, MAX_STRIKES, 0);
    var strikes = Math.max(clampInt(details.strikes, 0, MAX_STRIKES, 0), hints);
    var steps = clampInt(details.stepCount, 1, 1000, 0) ||
      (kase && Array.isArray(kase.steps) && kase.steps.length) || 4;
    var stars = P ? P.starsFor(strikes, steps) : fallbackStars(strikes, steps);

    var xpBefore = totalXpOf(active.profile);
    var rankBefore = rankOf(xpBefore);
    var firstSolve = !rec.solved;
    var previousStars = rec.solved ? rec.bestStars : 0;
    var previousStrikes = rec.solved ? rec.bestStrikes : null;
    var caseXpBefore = kase && P ? P.xpFor(kase, previousStars) : 0;
    var time = nowISO();

    rec.solved = true;
    rec.bestStars = Math.max(previousStars, stars);
    rec.bestStrikes = previousStrikes === null ? strikes : Math.min(previousStrikes, strikes);
    rec.plays = Math.min(MAX_COUNT, rec.plays + 1);
    if (!rec.firstSolvedAt) rec.firstSolvedAt = time;
    rec.lastPlayedAt = time;
    rec.current = null;
    refreshXp(caseId, rec);
    var caseXpAfter = kase && P ? P.xpFor(kase, rec.bestStars) : 0;
    var improved = firstSolve || stars > previousStars ||
      (stars === previousStars && previousStrikes !== null && strikes < previousStrikes);

    commitChange("solve", caseId, true);
    var xpAfter = totalXpOf(active.profile);
    var rankAfter = rankOf(xpAfter);
    return {
      stars: stars,
      firstSolve: firstSolve,
      improved: improved,
      xpGained: Math.max(0, caseXpAfter - caseXpBefore),
      totalXp: xpAfter,
      rankUp: rankAfter.index > rankBefore.index
        ? { from: rankLabel(rankBefore), to: rankLabel(rankAfter), fromIndex: rankBefore.index, toIndex: rankAfter.index }
        : null,
      caseId: caseId,
      bestStars: rec.bestStars,
      previousStars: previousStars,
      strikes: strikes,
      xp: rec.xp,
      rank: clone(rankAfter)
    };
  }

  function recordDrill(drillId, streak) {
    ensureInit();
    var n = clampInt(streak, 0, MAX_COUNT, 0);
    if (!validDrillId(drillId)) return { best: n, isBest: false, played: 0 };
    var table = active ? active.profile.drills : looseDrills;
    if (active) syncActive();
    if (!hasOwn.call(table, drillId) && Object.keys(table).length >= MAX_DRILLS) return { best: n, isBest: false, played: 0 };
    var d = hasOwn.call(table, drillId) ? table[drillId] : { best: 0, played: 0 };
    var isBest = n > d.best;
    d.best = Math.max(d.best, n);
    d.played = Math.min(MAX_COUNT, d.played + 1);
    table[drillId] = d;
    if (active) commitChange("drill", null, false);
    return { best: d.best, isBest: isBest, played: d.played };
  }

  // ---------------------------------------------------------------------------
  // Save codes
  // ---------------------------------------------------------------------------

  function exportCode() {
    ensureInit();
    if (!active) return "";
    adoptExtras();
    var payload = base64urlEncode(utf8Encode(pack(active.profile, CODE_OPTS)));
    return CODE_PREFIX + payload + "." + hash6(payload);
  }

  function fail(message) {
    var e = new Error(message);
    e.friendly = true;
    return e;
  }

  /** A save code as a clean profile; throws an Error with a message for the player. */
  function parseCode(input) {
    if (input === null || input === undefined) throw fail(MSG.empty);
    var text = String(input);
    if (text.length > MAX_IMPORT_CHARS) throw fail(MSG.tooBig);
    // Codes pasted from emails or chats: ignore spaces, line breaks, invisible characters,
    // wrapping quotes or brackets and a final full stop.
    var compact = text.replace(/[\s​-‍⁠﻿­]+/g, "")
      .replace(/^["'“”‘’«»<(\[{`]+/, "")
      .replace(/["'“”‘’«»>)\]}`.,;:!?]+$/, "");
    if (!compact) throw fail(MSG.empty);
    var m = /^([A-Za-z]{2,10})(\d{1,4})\.([\s\S]*)$/.exec(compact);
    if (!m) throw fail(MSG.notCode);
    var game = m[1].toUpperCase();
    if (game !== CODE_GAME) {
      if (hasOwn.call(OTHER_GAMES, game)) throw fail(MSG.otherGame(OTHER_GAMES[game]));
      throw fail(MSG.notCode);
    }
    var version = parseInt(m[2], 10);
    if (version > CODE_VERSION) throw fail(MSG.newer);
    if (version !== CODE_VERSION) throw fail(MSG.notCode);
    var rest = m[3];
    var dot = rest.lastIndexOf(".");
    if (dot <= 0) throw fail(MSG.damaged);
    var payload = rest.slice(0, dot);
    var check = rest.slice(dot + 1).toLowerCase();
    if (!/^[A-Za-z0-9_-]+$/.test(payload) || !HASH_RE.test(check) || hash6(payload) !== check) throw fail(MSG.damaged);
    var bytes = base64urlDecode(payload);
    if (!bytes || !bytes.length) throw fail(MSG.damaged);
    var result = unpack(utf8Decode(bytes), false, null);
    if (!result) throw fail(MSG.damaged);
    var profile = result.profile;
    if (!profile.name) profile.name = DEFAULT_NAME;
    return profile;
  }

  function errorText(e) {
    return e && e.friendly && typeof e.message === "string" ? e.message : MSG.internal;
  }

  function importCode(code, slot) {
    ensureInit();
    var imported;
    try {
      if (scormMode && !canImport()) return { ok: false, error: MSG.importOff };
      var s = scormMode ? 0 : validSlot(slot);
      if (s === null) return { ok: false, error: MSG.badSlot(slotCount()) };
      imported = parseCode(code);
      if (scormMode) {
        syncActive();
        if (active) {
          // Into the course profile: the best of both; the course keeps its name and settings.
          assignInPlace(active.profile, mergeProfiles(active.profile, imported, false, null));
        } else {
          active = { slot: 0, profile: imported };
          lastSeen[scormKey()] = readStored(scormKey());
        }
        commitChange("import", null, true);
        return { ok: true, profile: clone(active.profile) };
      }
      imported.updatedAt = nowISO();
      active = { slot: s, profile: imported };
      lastSeen[slotKey(s)] = readStored(slotKey(s));      // the import replaces the slot
      commitChange("import", null);
      return { ok: true, profile: clone(active.profile) };
    } catch (e) {
      if (!(e && e.friendly)) warn("importCode failed", e);
      return { ok: false, error: errorText(e) };
    }
  }

  function previewCode(code) {
    ensureInit();
    try {
      return { ok: true, summary: summaryOf(parseCode(code)) };
    } catch (e) {
      return { ok: false, error: errorText(e) };
    }
  }

  function summary() {
    ensureInit();
    adoptExtras();
    return active ? summaryOf(active.profile) : null;
  }

  function flush() {
    ensureInit();
    flushNow();
    return currentWarning() === null;
  }

  function onChange(fn) {
    if (typeof fn !== "function") return function () {};
    listeners.push(fn);
    return function unsubscribe() {
      var i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  // ---------------------------------------------------------------------------
  // Nothing in CCF.Save throws: an unexpected error is logged and a safe value returned.
  // ---------------------------------------------------------------------------

  function guard(name, fn, fallback) {
    return function () {
      try {
        return fn.apply(null, arguments);
      } catch (e) {
        warn("internal error in CCF.Save." + name, e);
        return typeof fallback === "function" ? fallback.apply(null, arguments) : fallback;
      }
    };
  }

  function zeroSolve() {
    return { stars: 0, firstSolve: false, improved: false, xpGained: 0, totalXp: 0, rankUp: null };
  }

  CCF.Save = {
    init: guard("init", init, function () {
      return { mode: scormMode ? "scorm" : "local", storageOk: false, warning: MSG.blocked, learnerName: null, scormMissing: scormMissing, pending: false, scormVersion: null };
    }),
    ready: guard("ready", ready, function () { return Promise.resolve(null); }),
    isScorm: guard("isScorm", isScorm, false),
    listSlots: guard("listSlots", listSlots, function () { return []; }),
    newProfile: guard("newProfile", newProfile, null),
    load: guard("load", load, null),
    current: guard("current", current, null),
    currentSlot: guard("currentSlot", currentSlot, null),
    lastSlot: guard("lastSlot", lastSlot, null),
    deleteSlot: guard("deleteSlot", deleteSlot, false),
    rename: guard("rename", rename, null),
    settings: guard("settings", settings, defaultSettings),
    setSetting: guard("setSetting", setSetting, defaultSettings),
    hasSeen: guard("hasSeen", hasSeen, false),
    markSeen: guard("markSeen", markSeen, false),
    caseRecord: guard("caseRecord", caseRecord, null),
    saveCaseProgress: guard("saveCaseProgress", saveCaseProgress, false),
    clearCaseProgress: guard("clearCaseProgress", clearCaseProgress, false),
    recordSolve: guard("recordSolve", recordSolve, zeroSolve),
    recordDrill: guard("recordDrill", recordDrill, function () { return { best: 0, isBest: false, played: 0 }; }),
    exportCode: guard("exportCode", exportCode, ""),
    importCode: guard("importCode", importCode, function () { return { ok: false, error: MSG.internal }; }),
    previewCode: guard("previewCode", previewCode, function () { return { ok: false, error: MSG.internal }; }),
    storageWarning: guard("storageWarning", storageWarning, null),
    canImport: guard("canImport", canImport, false),
    summary: guard("summary", summary, null),
    flush: guard("flush", flush, false),
    onChange: guard("onChange", onChange, function () { return function () {}; }),
    DEFAULT_NAME: DEFAULT_NAME,
    MAX_NAME: MAX_NAME,
    // Exposed for tests (pure helpers).
    _cleanName: cleanName,
    _hash6: hash6,
    _pack: pack,
    _unpack: unpack,
    _encodeSuspend: encodeSuspend,
    _decodeSuspend: decodeSuspend,
    _sanitizeProfile: sanitizeProfile,
    _parseCode: parseCode,
    _codeOptions: CODE_OPTS
  };
})(typeof window !== "undefined" ? window : globalThis);
