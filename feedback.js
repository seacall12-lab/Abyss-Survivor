(function () {
  "use strict";

  window.AbyssSurvivor = window.AbyssSurvivor || {};
  const AS = window.AbyssSurvivor;
  let audioContext = null;
  let masterGain = null;
  let audioUnlocked = false;
  const lastPlayedAt = {};

  function getSettings() {
    const save = AS.State && AS.State.getSave ? AS.State.getSave() : null;
    return save && save.settings ? save.settings : {};
  }

  function now() {
    return window.performance && window.performance.now ? window.performance.now() : Date.now();
  }

  function ensureAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }
    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.34;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(function () { return undefined; });
    }
    return audioContext;
  }

  function tone(frequency, duration, type, volume, delay, endFrequency) {
    const context = audioContext;
    let oscillator;
    let gain;
    let start;

    if (!context || !masterGain) {
      return;
    }

    start = context.currentTime + Math.max(0, delay || 0);
    oscillator = context.createOscillator();
    gain = context.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), start);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume || 0.08), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playSound(type) {
    const settings = getSettings();
    const timestamp = now();
    const throttle = type === "hit" ? 70 : (type === "playerHit" ? 120 : 0);

    if (!audioUnlocked || settings.soundEnabled === false || (throttle && timestamp - (lastPlayedAt[type] || 0) < throttle)) {
      return;
    }
    if (!ensureAudio()) {
      return;
    }
    lastPlayedAt[type] = timestamp;

    if (type === "start") {
      tone(220, 0.08, "triangle", 0.07, 0, 330);
      tone(440, 0.12, "triangle", 0.06, 0.07, 660);
    } else if (type === "hit") {
      tone(150, 0.045, "square", 0.022, 0, 95);
    } else if (type === "playerHit") {
      tone(115, 0.16, "sawtooth", 0.09, 0, 58);
    } else if (type === "upgrade") {
      tone(392, 0.1, "sine", 0.06, 0, 523);
      tone(659, 0.16, "sine", 0.07, 0.09, 784);
    } else if (type === "boss") {
      tone(82, 0.38, "sawtooth", 0.1, 0, 55);
      tone(123, 0.32, "square", 0.055, 0.18, 82);
    } else if (type === "bossDefeated") {
      tone(110, 0.18, "sawtooth", 0.08, 0, 65);
      tone(330, 0.16, "triangle", 0.07, 0.12, 494);
      tone(659, 0.24, "sine", 0.07, 0.24, 880);
    } else if (type === "clear") {
      tone(330, 0.16, "triangle", 0.07, 0, 440);
      tone(523, 0.18, "triangle", 0.07, 0.14, 659);
      tone(784, 0.3, "sine", 0.08, 0.29, 1047);
    } else if (type === "gameover") {
      tone(220, 0.22, "triangle", 0.08, 0, 147);
      tone(110, 0.34, "sawtooth", 0.065, 0.18, 55);
    }
  }

  function vibrate(type) {
    const settings = getSettings();
    let pattern = 0;

    if (settings.vibrationEnabled === false || !navigator.vibrate) {
      return;
    }
    if (type === "playerHit") {
      pattern = 35;
    } else if (type === "boss") {
      pattern = [45, 45, 80];
    } else if (type === "bossDefeated" || type === "clear") {
      pattern = [30, 35, 30];
    } else if (type === "gameover") {
      pattern = [70, 40, 110];
    } else if (type === "upgrade") {
      pattern = 18;
    }
    if (pattern) {
      navigator.vibrate(pattern);
    }
  }

  function addShake(run, power, duration) {
    const settings = getSettings();

    if (!run || settings.screenShakeEnabled === false || settings.reducedEffects) {
      return;
    }
    run.screenShakePower = Math.max(Number(run.screenShakePower) || 0, power);
    run.screenShakeTimer = Math.max(Number(run.screenShakeTimer) || 0, duration);
    run.screenShakeDuration = Math.max(Number(run.screenShakeDuration) || 0, duration);
  }

  AS.Feedback = {
    unlock: function () {
      audioUnlocked = true;
      if (getSettings().soundEnabled !== false) {
        ensureAudio();
      }
    },

    emit: function (type, run) {
      playSound(type);
      vibrate(type);
      if (type === "hit") {
        addShake(run, 1.2, 0.06);
      } else if (type === "playerHit") {
        addShake(run, 5, 0.18);
      } else if (type === "boss") {
        addShake(run, 7, 0.36);
      } else if (type === "bossDefeated") {
        addShake(run, 9, 0.42);
      } else if (type === "clear" || type === "gameover") {
        addShake(run, 6, 0.3);
      }
    },

    update: function (run, delta) {
      if (!run) {
        return;
      }
      run.screenShakeTimer = Math.max(0, (Number(run.screenShakeTimer) || 0) - Math.max(0, Number(delta) || 0));
      if (run.screenShakeTimer <= 0) {
        run.screenShakePower = 0;
        run.screenShakeDuration = 0;
      }
    }
  };
})();
