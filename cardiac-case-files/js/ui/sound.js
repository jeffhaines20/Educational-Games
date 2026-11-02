/*
 * The Cardiac Case Files — tiny synthesized sound effects (CCF.UI.sound).
 *
 * Every sound is generated with the Web Audio API (no audio files). The audio context is
 * created lazily on the first sound, which always follows a click or key press, so
 * browsers' autoplay rules are respected. All calls are wrapped in try/catch: a browser
 * without Web Audio simply stays silent. Off with ?sound=off or in Settings.
 *
 *   CCF.UI.sound.play("correct")     CCF.UI.sound.setEnabled(false)
 */
(function (global) {
  "use strict";
  var CCF = (global.CCF = global.CCF || {});
  var UI = (CCF.UI = CCF.UI || {});

  var enabled = true;
  var ctx = null, master = null, room = null;

  function context() {
    if (!enabled) return null;
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        var comp = ctx.createDynamicsCompressor();
        master.connect(comp);
        comp.connect(ctx.destination);
        room = ctx.createConvolver();
        room.buffer = impulse(0.9, 3.2);
        var wet = ctx.createGain();
        wet.gain.value = 0.22;
        room.connect(wet);
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

  /** One oscillator note. o: { freq, to, type, start, dur, gain, attack, wet, filter } */
  function voice(o) {
    var t0 = ctx.currentTime + (o.start || 0);
    var dur = o.dur || 0.3;
    var osc = ctx.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    var gain = ctx.createGain();
    var peak = o.gain === undefined ? 0.15 : o.gain;
    var attack = o.attack || 0.006;
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
      send.connect(room);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** A filtered noise burst (paper, stamp thud). */
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
      send.connect(room);
    }
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  function chime(freq, start, dur, gain) {
    gain = gain === undefined ? 0.1 : gain;
    voice({ freq: freq, start: start, dur: dur, gain: gain, wet: 0.5 });
    voice({ freq: freq * 2.01, start: start, dur: dur * 0.5, gain: gain * 0.25, wet: 0.5 });
  }

  var SOUNDS = {
    click: function () {
      voice({ freq: 1100, to: 800, dur: 0.05, gain: 0.03 });
    },
    open: function () {
      noise({ dur: 0.22, from: 1800, to: 700, q: 0.8, gain: 0.03 });
    },
    page: function () {
      noise({ dur: 0.18, from: 3200, to: 1400, q: 0.7, gain: 0.03 });
    },
    /** A monitor-style heartbeat blip: "lub-dub". */
    heartbeat: function () {
      voice({ freq: 980, dur: 0.09, gain: 0.05, type: "sine" });
      voice({ freq: 980, start: 0.16, dur: 0.07, gain: 0.03, type: "sine" });
    },
    correct: function () {
      chime(659.25, 0, 0.5, 0.08);
      chime(987.77, 0.1, 0.7, 0.08);
    },
    wrong: function () {
      voice({ freq: 220, to: 196, type: "triangle", dur: 0.24, gain: 0.07, filter: { freq: 900 } });
      voice({ freq: 185, to: 165, type: "triangle", start: 0.14, dur: 0.3, gain: 0.06, filter: { freq: 800 } });
    },
    hint: function () {
      chime(523.25, 0, 0.4, 0.05);
      chime(698.46, 0.12, 0.5, 0.05);
    },
    reveal: function () {
      noise({ dur: 0.3, from: 2400, to: 900, q: 0.7, gain: 0.04 });
      chime(587.33, 0.08, 0.5, 0.05);
    },
    /** The rubber stamp coming down: a low thud with a papery slap. */
    stamp: function () {
      voice({ freq: 120, to: 55, type: "sine", dur: 0.28, gain: 0.32 });
      noise({ dur: 0.12, from: 900, to: 300, q: 0.6, gain: 0.18, type: "lowpass", attack: 0.004 });
      noise({ start: 0.02, dur: 0.16, from: 3500, to: 1200, q: 0.8, gain: 0.05, attack: 0.005 });
    },
    star: function (index) {
      chime(880 * Math.pow(2, (index || 0) * 4 / 12), 0, 0.7, 0.07);
    },
    rankup: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { chime(f, i * 0.09, 1.1, 0.07); });
      voice({ freq: 261.63, type: "triangle", dur: 1.2, gain: 0.04, attack: 0.04, wet: 0.5 });
    },
    unlock: function () {
      [392, 523.25, 659.25].forEach(function (f, i) { chime(f, i * 0.08, 0.9, 0.06); });
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
