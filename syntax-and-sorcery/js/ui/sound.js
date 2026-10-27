/*
 * Syntax & Sorcery — synthesized sound effects (SS.UI.sound).
 *
 * Every sound is generated with the Web Audio API (no audio files). The audio
 * context is created lazily on the first sound, which always follows a click or
 * key press, so browsers' autoplay rules are respected. All calls are wrapped in
 * try/catch: a browser without Web Audio simply stays silent.
 *
 *   SS.UI.sound.play("success")     SS.UI.sound.setEnabled(false)
 */
(function (global) {
  "use strict";
  var SS = (global.SS = global.SS || {});
  var UI = (SS.UI = SS.UI || {});

  var enabled = true;
  var ctx = null, master = null, reverb = null;

  function context() {
    if (!enabled) return null;
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.55;
        var comp = ctx.createDynamicsCompressor();
        master.connect(comp);
        comp.connect(ctx.destination);
        reverb = ctx.createConvolver();
        reverb.buffer = impulse(1.9, 3.4);
        var wet = ctx.createGain();
        wet.gain.value = 0.32;
        reverb.connect(wet);
        wet.connect(master);
      } catch (err) {
        ctx = null;
        return null;
      }
    }
    if (ctx.state === "suspended") {
      try { ctx.resume(); } catch (err) { /* ignore */ }
    }
    return ctx;
  }

  function impulse(seconds, decay) {
    var rate = ctx.sampleRate;
    var length = Math.floor(rate * seconds);
    var buffer = ctx.createBuffer(2, length, rate);
    for (var channel = 0; channel < 2; channel++) {
      var data = buffer.getChannelData(channel);
      for (var i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
  }

  /** One oscillator note. o: { freq, to, type, start, dur, gain, attack, wet, filter, detune } */
  function voice(o) {
    var t0 = ctx.currentTime + (o.start || 0);
    var dur = o.dur || 0.3;
    var osc = ctx.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    if (o.detune) osc.detune.value = o.detune;
    var gain = ctx.createGain();
    var peak = o.gain === undefined ? 0.15 : o.gain;
    var attack = o.attack || 0.008;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    var out = gain;
    if (o.filter) {
      var filter = ctx.createBiquadFilter();
      filter.type = o.filter.type || "lowpass";
      filter.frequency.value = o.filter.freq || 1200;
      filter.Q.value = o.filter.q || 0.8;
      gain.connect(filter);
      out = filter;
    }
    out.connect(master);
    if (o.wet) {
      var send = ctx.createGain();
      send.gain.value = o.wet;
      out.connect(send);
      send.connect(reverb);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** A filtered noise sweep (whooshes, paper, sparkle). */
  function noise(o) {
    var t0 = ctx.currentTime + (o.start || 0);
    var dur = o.dur || 0.3;
    var length = Math.floor(ctx.sampleRate * dur);
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var filter = ctx.createBiquadFilter();
    filter.type = o.type || "bandpass";
    filter.Q.value = o.q || 1;
    filter.frequency.setValueAtTime(o.from || 800, t0);
    if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(o.gain || 0.08, t0 + (o.attack || dur * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    if (o.wet) {
      var send = ctx.createGain();
      send.gain.value = o.wet;
      gain.connect(send);
      send.connect(reverb);
    }
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /** A bell: a sine plus two inharmonic partials, into the reverb. */
  function bell(freq, start, dur, gain) {
    gain = gain === undefined ? 0.12 : gain;
    voice({ freq: freq, start: start, dur: dur, gain: gain, wet: 0.7 });
    voice({ freq: freq * 2.756, start: start, dur: dur * 0.45, gain: gain * 0.22, wet: 0.7 });
    voice({ freq: freq * 5.404, start: start, dur: dur * 0.2, gain: gain * 0.08, wet: 0.7 });
  }

  var SOUNDS = {
    click: function () {
      voice({ freq: 900, to: 700, dur: 0.06, gain: 0.04 });
    },
    open: function () {
      voice({ freq: 520, to: 780, dur: 0.22, gain: 0.04, wet: 0.6 });
    },
    page: function () {
      noise({ dur: 0.2, from: 2600, to: 1100, q: 0.7, gain: 0.035, type: "bandpass" });
    },
    cast: function () {
      noise({ dur: 0.6, from: 400, to: 4200, q: 3, gain: 0.09, wet: 0.5 });
      voice({ freq: 280, to: 840, type: "triangle", dur: 0.5, gain: 0.05, wet: 0.6 });
      bell(1568, 0.32, 0.6, 0.035);
      bell(2093, 0.4, 0.6, 0.03);
    },
    success: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { bell(f, i * 0.09, 1.3, 0.1); });
      bell(1318.5, 0.42, 1.6, 0.06);
      noise({ start: 0.3, dur: 0.9, from: 5000, to: 9000, q: 1.5, gain: 0.025, wet: 0.8, type: "highpass" });
    },
    fail: function () {
      voice({ freq: 392, to: 370, type: "triangle", dur: 0.2, gain: 0.08, wet: 0.3 });
      voice({ freq: 311, to: 277, type: "triangle", start: 0.17, dur: 0.36, gain: 0.08, wet: 0.3 });
    },
    error: function () {
      voice({ freq: 196, to: 130, type: "sawtooth", dur: 0.32, gain: 0.05, filter: { freq: 900 } });
      noise({ dur: 0.18, from: 300, to: 120, q: 0.9, gain: 0.05, type: "lowpass" });
    },
    hint: function () {
      voice({ freq: 540, to: 480, dur: 0.24, gain: 0.08, attack: 0.04, wet: 0.5 });
      voice({ freq: 510, to: 430, start: 0.3, dur: 0.4, gain: 0.08, attack: 0.05, wet: 0.5 });
    },
    star: function (index) {
      bell(987.77 * Math.pow(2, (index || 0) * 4 / 12), 0, 0.9, 0.09);
    },
    unlock: function () {
      [392, 523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { bell(f, i * 0.08, 1.2, 0.08); });
      voice({ freq: 130.8, type: "triangle", dur: 1.2, gain: 0.05, attack: 0.05, wet: 0.5 });
    },
    rankup: function () {
      [261.63, 329.63, 392].forEach(function (f) { voice({ freq: f, type: "triangle", dur: 1.4, gain: 0.05, attack: 0.04, wet: 0.6 }); });
      [523.25, 783.99, 1046.5, 1567.98].forEach(function (f, i) { bell(f, 0.12 + i * 0.1, 1.4, 0.07); });
    },
    reset: function () {
      noise({ dur: 0.35, from: 3000, to: 600, q: 1.2, gain: 0.05 });
    }
  };

  function play(name, arg) {
    if (!enabled || !SOUNDS[name]) return;
    try {
      if (document.hidden) return;
      if (!context()) return;
      SOUNDS[name](arg);
    } catch (err) {
      /* sound is decoration; never let it break the game */
    }
  }

  function setEnabled(value) {
    enabled = !!value;
    if (!enabled && ctx && ctx.state === "running") {
      try { ctx.suspend(); } catch (err) { /* ignore */ }
    }
  }

  function isEnabled() {
    return enabled;
  }

  UI.sound = { play: play, setEnabled: setEnabled, isEnabled: isEnabled, names: Object.keys(SOUNDS) };
})(typeof window !== "undefined" ? window : globalThis);
