/*
 * Syntax & Sorcery — visual effects (SS.UI.effects).
 *
 *   initSky(el)                 draw the starfield behind the whole game
 *   createStage(scene)          a challenge's scene panel → { el, play(opts), fizzle(), reset(), casting(on) }
 *   play(effect, stageEl, opts) one of SS.SCENE_EFFECTS (manifest, sparkle, fire, bubble,
 *                               rise, shake, portal, lightning, bloom, frost)
 *   burst(el), celebrate()      sparkles for dialogs, a star shower for big moments
 *
 * Particles are short-lived spans animated by CSS (see "Effects" in style.css).
 * With reduced motion (OS setting or the in-game setting) no particles are made:
 * the success state simply fades in.
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});
  var u = UI.util;
  var h = u.h;

  var EFFECT_NAMES = ["manifest", "sparkle", "fire", "bubble", "rise", "shake", "portal", "lightning", "bloom", "frost"];

  function rnd(min, max) { return min + Math.random() * (max - min); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function particle(layer, cls, text, vars) {
    var el = h("span", { class: "fx-p " + cls, "aria-hidden": "true", style: vars || null }, text || null);
    layer.appendChild(el);
    return el;
  }

  function px(n) { return n.toFixed(1) + "px"; }
  function ms(n) { return Math.round(n) + "ms"; }
  function pct(n) { return n.toFixed(1) + "%"; }

  // --------------------------------------------------------------------------
  // Starfield
  // --------------------------------------------------------------------------

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function initSky(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = "1";
    var canvas = h("canvas", { class: "sky-stars" });
    root.appendChild(canvas);
    var twinkles = h("div", { class: "sky-twinkles" });
    var random = mulberry32(7);
    for (var i = 0; i < 26; i++) {
      twinkles.appendChild(h("span", {
        class: "twinkle",
        style: {
          left: pct(random() * 100), top: pct(random() * 92),
          "--d": (3 + random() * 5).toFixed(2) + "s", "--delay": (-random() * 6).toFixed(2) + "s",
          "--s": (1.5 + random() * 2.2).toFixed(1) + "px"
        }
      }));
    }
    root.appendChild(twinkles);
    root.appendChild(h("span", { class: "shooting-star" }));

    function draw() {
      u.safe(function () {
        var w = global.innerWidth || 1024, hgt = global.innerHeight || 768;
        var dpr = Math.min(global.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(hgt * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = hgt + "px";
        var g = canvas.getContext("2d");
        if (!g) return;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, hgt);
        var rand = mulberry32(1234);
        var count = Math.min(420, Math.round((w * hgt) / 2300));
        var colors = ["255,255,255", "214,205,255", "255,236,196", "190,245,238"];
        for (var i = 0; i < count; i++) {
          var x = rand() * w, y = rand() * hgt;
          var r = Math.pow(rand(), 3) * 1.25 + 0.25;
          var alpha = 0.25 + rand() * 0.6 * (1 - y / hgt * 0.45);
          g.fillStyle = "rgba(" + colors[Math.floor(rand() * colors.length)] + "," + alpha.toFixed(3) + ")";
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        }
        // a few brighter stars with a soft halo
        for (var j = 0; j < Math.round(count / 40); j++) {
          var sx = rand() * w, sy = rand() * hgt * 0.8, sr = 1 + rand() * 1.2;
          var grad = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 6);
          grad.addColorStop(0, "rgba(255,248,225,0.9)");
          grad.addColorStop(0.25, "rgba(244,207,115,0.25)");
          grad.addColorStop(1, "rgba(244,207,115,0)");
          g.fillStyle = grad;
          g.beginPath();
          g.arc(sx, sy, sr * 6, 0, Math.PI * 2);
          g.fill();
        }
      });
    }
    draw();
    global.addEventListener("resize", u.debounce(draw, 200));
  }

  // --------------------------------------------------------------------------
  // The ten scene effects. Each fills `layer` and returns { duration, keep? }.
  // --------------------------------------------------------------------------

  var EFFECTS = {
    manifest: function (layer, stage, opts) {
      var lines = String(opts.text || "").replace(/\r/g, "").split("\n")
        .map(function (l) { return l.replace(/\s+$/, ""); })
        .filter(function (l) { return l.trim() !== ""; })
        .slice(0, 3)
        .map(function (l) { return l.length > 38 ? l.slice(0, 37) + "…" : l; });
      if (!lines.length) lines = [opts.caption ? String(opts.caption).slice(0, 38) : "✨"];
      var box = h("div", { class: "fx-manifest", "aria-hidden": "true" });
      var n = 0;
      lines.forEach(function (line) {
        var row = h("div", { class: "fx-manifest-line" });
        Array.from(line).forEach(function (ch) {
          row.appendChild(h("span", { class: "fx-letter", style: { "--i": String(n++) } }, ch === " " ? " " : ch));
        });
        box.appendChild(row);
      });
      for (var i = 0; i < 12; i++) {
        particle(layer, "fx-spark", pick(["✦", "✧", "⋆"]), {
          "--dx": px(rnd(-150, 150)), "--dy": px(rnd(-60, 60)), "--delay": ms(rnd(100, 700)), "--size": px(rnd(9, 16))
        });
      }
      return { duration: Math.min(2600, 1100 + n * 30), keep: box };
    },

    sparkle: function (layer) {
      for (var i = 0; i < 32; i++) {
        var angle = Math.random() * Math.PI * 2, dist = rnd(45, 150);
        particle(layer, "fx-spark " + pick(["gold", "teal", "violet", "white"]), pick(["✦", "✧", "⋆", "✶", "•"]), {
          "--dx": px(Math.cos(angle) * dist), "--dy": px(Math.sin(angle) * dist * 0.65),
          "--delay": ms(rnd(0, 280)), "--size": px(rnd(9, 22))
        });
      }
      return { duration: 1500 };
    },

    fire: function (layer) {
      for (var i = 0; i < 28; i++) {
        particle(layer, "fx-flame", "", {
          "--x": pct(rnd(18, 82)), "--delay": ms(rnd(0, 650)), "--size": px(rnd(16, 40)),
          "--rise": px(rnd(60, 125)), "--sway": px(rnd(-22, 22))
        });
      }
      for (var j = 0; j < 10; j++) {
        particle(layer, "fx-ember", "", {
          "--x": pct(rnd(25, 75)), "--delay": ms(rnd(200, 900)), "--rise": px(rnd(90, 150)), "--sway": px(rnd(-40, 40))
        });
      }
      return { duration: 1800 };
    },

    bubble: function (layer) {
      for (var i = 0; i < 22; i++) {
        particle(layer, "fx-bubble", "", {
          "--x": pct(rnd(32, 68)), "--delay": ms(rnd(0, 950)), "--size": px(rnd(7, 24)),
          "--rise": px(rnd(55, 120)), "--sway": px(rnd(-28, 28))
        });
      }
      return { duration: 2000 };
    },

    rise: function (layer) {
      for (var i = 0; i < 16; i++) {
        particle(layer, "fx-mote", pick(["✦", "·", "✧"]), {
          "--x": pct(rnd(38, 62)), "--delay": ms(rnd(150, 1100)), "--size": px(rnd(8, 14)), "--fall": px(rnd(30, 60))
        });
      }
      return { duration: 1900 };
    },

    shake: function (layer) {
      for (var i = 0; i < 20; i++) {
        var angle = rnd(Math.PI * 1.05, Math.PI * 1.95), dist = rnd(50, 130);
        particle(layer, "fx-debris", pick(["◆", "▪", "⬥", "✦", "▴"]), {
          "--dx": px(Math.cos(angle) * dist), "--dy": px(Math.sin(angle) * dist * 0.7),
          "--rot": rnd(-260, 260).toFixed(0) + "deg", "--delay": ms(rnd(480, 600)), "--size": px(rnd(8, 16))
        });
      }
      return { duration: 1700 };
    },

    portal: function (layer) {
      layer.appendChild(h("span", { class: "fx-portal-ring", "aria-hidden": "true" }));
      layer.appendChild(h("span", { class: "fx-portal-core", "aria-hidden": "true" }));
      for (var i = 0; i < 18; i++) {
        particle(layer, "fx-swirl", "✦", {
          "--a": rnd(0, 360).toFixed(0) + "deg", "--r": px(rnd(40, 80)), "--delay": ms(rnd(0, 700)), "--size": px(rnd(7, 13))
        });
      }
      return { duration: 2000 };
    },

    lightning: function (layer) {
      layer.appendChild(h("span", { class: "fx-flash", "aria-hidden": "true" }));
      var bolts = u.svg("svg", { class: "fx-bolts", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" });
      for (var b = 0; b < 3; b++) {
        var x = rnd(15, 85), y = 0, points = [x.toFixed(1) + "," + y];
        var targetX = 50 + rnd(-8, 8), steps = 7;
        for (var s = 1; s <= steps; s++) {
          y = (58 * s) / steps;
          x = x + (targetX - x) / (steps - s + 1) + rnd(-9, 9);
          points.push(x.toFixed(1) + "," + y.toFixed(1));
        }
        bolts.appendChild(u.svg("polyline", { class: "fx-bolt", points: points.join(" "), style: { "--delay": ms(b * 170) } }));
      }
      layer.appendChild(bolts);
      for (var i = 0; i < 12; i++) {
        var angle = Math.random() * Math.PI * 2, dist = rnd(30, 90);
        particle(layer, "fx-spark teal", "✦", {
          "--dx": px(Math.cos(angle) * dist), "--dy": px(Math.sin(angle) * dist * 0.6),
          "--delay": ms(rnd(250, 600)), "--size": px(rnd(8, 15))
        });
      }
      return { duration: 1500 };
    },

    bloom: function (layer) {
      var garden = h("div", { class: "fx-garden", "aria-hidden": "true" });
      var flowers = ["🌸", "🌼", "🌷", "🌺", "🌿", "🌻"];
      for (var i = 0; i < 9; i++) {
        var x = 8 + i * 10.5 + rnd(-2.5, 2.5), height = rnd(24, 62);
        var vars = { "--x": pct(x), "--h": px(height), "--delay": ms(i * 90 + rnd(0, 60)) };
        garden.appendChild(h("span", { class: "fx-stem", style: vars }));
        garden.appendChild(h("span", { class: "fx-flower", style: vars }, pick(flowers)));
      }
      for (var j = 0; j < 10; j++) {
        particle(layer, "fx-petal", "", {
          "--x": pct(rnd(10, 90)), "--delay": ms(rnd(600, 1400)), "--drift": px(rnd(-40, 40)), "--size": px(rnd(6, 10))
        });
      }
      return { duration: 2100, keep: garden };
    },

    frost: function (layer) {
      layer.appendChild(h("span", { class: "fx-frost-veil", "aria-hidden": "true" }));
      for (var i = 0; i < 20; i++) {
        particle(layer, "fx-crystal", pick(["❄", "❅", "❆", "✳", "✧"]), {
          "--x": pct(rnd(4, 96)), "--y": pct(rnd(6, 90)), "--delay": ms(rnd(0, 800)),
          "--size": px(rnd(11, 26)), "--rot": rnd(-120, 120).toFixed(0) + "deg"
        });
      }
      return { duration: 2000 };
    }
  };

  /** Play a scene effect on a stage element. Resolves when it has finished. */
  function play(name, stageEl, opts) {
    opts = opts || {};
    if (!stageEl) return Promise.resolve(null);
    var effect = EFFECTS[name] ? name : "sparkle";
    if (u.reducedMotion()) {
      stageEl.classList.add("fx-calm");
      return u.delay(400).then(function () { stageEl.classList.remove("fx-calm"); return null; });
    }
    var layer = h("div", { class: "fx-layer", "aria-hidden": "true" });
    stageEl.appendChild(layer);
    stageEl.classList.add("fx-active", "fx-" + effect);
    var result = u.safe(function () { return EFFECTS[effect](layer, stageEl, opts); }, { duration: 800 }) || { duration: 800 };
    if (result.keep) {
      stageEl.appendChild(result.keep);
      stageEl.classList.add("has-keep", "keep-" + effect);
    }
    return u.delay(result.duration).then(function () {
      u.remove(layer);
      stageEl.classList.remove("fx-active", "fx-" + effect);
      return result.keep || null;
    });
  }

  /** A puff of smoke when a cast fails. */
  function fizzle(stageEl) {
    if (!stageEl || u.reducedMotion()) return;
    var layer = h("div", { class: "fx-layer", "aria-hidden": "true" });
    stageEl.appendChild(layer);
    stageEl.classList.remove("fx-fizzle");
    void stageEl.offsetWidth; // restart the CSS animation
    stageEl.classList.add("fx-fizzle");
    for (var i = 0; i < 8; i++) {
      particle(layer, "fx-smoke", "", { "--dx": px(rnd(-34, 34)), "--delay": ms(rnd(0, 220)), "--size": px(rnd(14, 28)) });
    }
    setTimeout(function () { u.remove(layer); stageEl.classList.remove("fx-fizzle"); }, 1300);
  }

  /** Sparkles bursting out of an element (e.g. the icon in the success dialog). */
  function burst(el, count) {
    if (!el || u.reducedMotion()) return;
    var layer = h("span", { class: "fx-layer fx-burst", "aria-hidden": "true" });
    el.appendChild(layer);
    for (var i = 0; i < (count || 18); i++) {
      var angle = Math.random() * Math.PI * 2, dist = rnd(40, 110);
      particle(layer, "fx-spark " + pick(["gold", "teal", "white"]), pick(["✦", "✧", "⋆"]), {
        "--dx": px(Math.cos(angle) * dist), "--dy": px(Math.sin(angle) * dist),
        "--delay": ms(rnd(0, 200)), "--size": px(rnd(9, 18))
      });
    }
    setTimeout(function () { u.remove(layer); }, 1500);
  }

  /** A shower of falling stars across the viewport (chapter complete, certificate). */
  function celebrate() {
    if (u.reducedMotion()) return;
    var layer = h("div", { class: "fx-celebrate", "aria-hidden": "true" });
    document.body.appendChild(layer);
    for (var i = 0; i < 46; i++) {
      particle(layer, "fx-falling " + pick(["gold", "teal", "violet", "white"]), pick(["✦", "✧", "★", "⋆"]), {
        "--x": pct(rnd(0, 100)), "--delay": ms(rnd(0, 1300)), "--size": px(rnd(10, 22)),
        "--drift": px(rnd(-60, 60)), "--dur": ms(rnd(1800, 2800))
      });
    }
    setTimeout(function () { u.remove(layer); }, 4400);
  }

  // --------------------------------------------------------------------------
  // A challenge's scene panel
  // --------------------------------------------------------------------------

  function createStage(scene) {
    scene = scene || {};
    var effect = EFFECT_NAMES.indexOf(scene.effect) >= 0 ? scene.effect : "sparkle";
    var glyph = h("span", { class: "scene-glyph" }, scene.icon || "✨");
    var caption = h("p", { class: "scene-caption" });
    var el = h("div", { class: "scene-stage scene-" + effect, "aria-hidden": "true" },
      h("div", { class: "scene-glow" }),
      h("div", { class: "scene-pedestal" }),
      h("div", { class: "scene-actor" }, h("div", { class: "scene-icon" }, glyph)),
      caption);
    var kept = null;

    function reset() {
      el.classList.remove("is-success", "has-keep", "keep-" + effect);
      glyph.textContent = scene.icon || "✨";
      caption.textContent = "";
      if (kept) { u.remove(kept); kept = null; }
    }

    function showSuccess() {
      el.classList.add("is-success");
      glyph.textContent = scene.successIcon || scene.icon || "✨";
      caption.textContent = scene.successText || "";
    }

    return {
      el: el,
      effect: effect,
      reset: reset,
      /** Play the success effect. opts.text = what the spell printed (for "manifest"). */
      play: function (opts) {
        reset();
        showSuccess();
        return play(effect, el, Object.assign({ caption: scene.successText }, opts || {})).then(function (keep) {
          kept = keep;
        });
      },
      showSuccess: showSuccess,
      fizzle: function () { fizzle(el); },
      casting: function (on) { el.classList.toggle("is-casting", !!on); }
    };
  }

  UI.effects = {
    names: EFFECT_NAMES,
    initSky: initSky,
    play: play,
    fizzle: fizzle,
    burst: burst,
    celebrate: celebrate,
    createStage: createStage
  };
})(typeof window !== "undefined" ? window : globalThis);
