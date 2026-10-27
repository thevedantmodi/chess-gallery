// Haptics and tiny synthesized sounds.
// No audio files, so nothing extra to cache.

let soundOn = true;
let hapticsOn = true;

function canVibrate() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function isIOS() {
  return (
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
  );
}

// iOS 18+: flipping a native switch plays the system haptic.
function iosTap() {
  const focused = document.activeElement;
  const label = document.createElement("label");
  label.ariaHidden = "true";
  label.style.display = "none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.appendChild(input);
  document.head.appendChild(label);
  label.click();
  label.remove();
  if (focused && focused !== document.activeElement && focused !== document.body) {
    focused.focus({ preventScroll: true });
  }
}

function haptic(ms = 10) {
  if (!hapticsOn) return;
  try {
    if (canVibrate()) navigator.vibrate(ms);
    else if (isIOS()) iosTap();
  } catch {
    /* no haptics here */
  }
}

let ctx = null;
function ac() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = ctx || new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function thock({ f = 190, dur = 0.07, gain = 0.16, click = 0.5 } = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.55, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur);

  const len = Math.floor(a.sampleRate * 0.02);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  const ng = a.createGain();
  ng.gain.value = gain * click;
  src.connect(bp).connect(ng).connect(a.destination);
  src.start(t);
}

function tone(freq, at, dur = 0.16, gain = 0.07) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const fx = {
  configure({ sound, haptics }) {
    if (sound !== undefined) soundOn = sound;
    if (haptics !== undefined) hapticsOn = haptics;
  },
  /** kind: move | capture | check | end | win | lose | good | bad */
  play(kind) {
    switch (kind) {
      case "move":
        haptic(8);
        if (soundOn) thock();
        break;
      case "capture":
        haptic(18);
        if (soundOn) thock({ f: 140, dur: 0.1, gain: 0.24, click: 0.9 });
        break;
      case "check":
        haptic(14);
        setTimeout(() => haptic(14), 110);
        if (soundOn) {
          thock({ f: 150, dur: 0.1, gain: 0.22, click: 0.8 });
          tone(740, 0.08, 0.12, 0.05);
        }
        break;
      case "good":
        haptic(12);
        if (soundOn) {
          tone(660, 0, 0.12);
          tone(880, 0.09, 0.18);
        }
        break;
      case "bad":
        haptic(30);
        if (soundOn) tone(196, 0, 0.22, 0.08);
        break;
      case "win":
        haptic(16);
        setTimeout(() => haptic(16), 120);
        if (soundOn) [523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.28));
        break;
      case "lose":
        haptic(24);
        if (soundOn) [392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.32));
        break;
      case "end":
        haptic(16);
        if (soundOn) [440, 392].forEach((f, i) => tone(f, i * 0.14, 0.28));
        break;
      default:
        haptic(8);
    }
  },
  tap() {
    haptic(6);
  },
};
