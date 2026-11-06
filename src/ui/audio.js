// Sons synthétisés (aucun fichier audio) et voix du renard (synthèse vocale du système).
// Tout reste sur l'appareil. Les sons ne démarrent qu'après un geste de l'enfant (règle des navigateurs).

import { chooseVoice, rankVoices, timbres, vitesses } from '../core/voices.js';

let ctx = null;
const cfg = { sons: true, voix: true, voixNom: '', vitesse: vitesses.normal, timbre: timbres.naturel };
let voice = null; // voix retenue (description de voices.js)
let current = null;
const listeners = new Set();

const allVoices = () => { try { return 'speechSynthesis' in window ? speechSynthesis.getVoices() : []; } catch { return []; } };

export function configureAudio(s) {
  cfg.sons = s.sons; cfg.voix = s.voix;
  cfg.voixNom = s.voixNom || '';
  cfg.vitesse = vitesses[s.voixVitesse] ?? vitesses.normal;
  cfg.timbre = timbres[s.voixTimbre] ?? timbres.naturel;
  voice = chooseVoice(allVoices(), cfg.voixNom);
  if (!s.voix) stopSpeaking();
}

/** Voix françaises disponibles (meilleure en premier) et voix actuellement retenue. */
export const frenchVoices = () => rankVoices(allVoices());
export const currentVoice = () => voice;
/** Prévient l'écran des parents quand la liste des voix arrive (elle se charge après le démarrage). */
export function onVoicesChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function unlockAudio() {
  try {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  } catch { /* silencieux */ }
}

function tone(freq, start, dur, { type = 'sine', gain = 0.1, to = null } = {}) {
  if (!ctx || !cfg.sons) return;
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.05);
}

const N = { do: 523.25, re: 587.33, mi: 659.25, sol: 783.99, la: 880, do2: 1046.5, mi2: 1318.5 };

export function sfx(name, i = 0) {
  if (!ctx || !cfg.sons) return;
  switch (name) {
    case 'tap': tone(520, 0, 0.09, { type: 'triangle', gain: 0.07 }); break;
    case 'pop': tone(380, 0, 0.12, { type: 'sine', gain: 0.1, to: 760 }); break;
    case 'start': tone(660, 0, 0.12, { type: 'triangle', gain: 0.07 }); break;
    case 'ok': tone(N.sol, 0, 0.16, { type: 'triangle', gain: 0.09 }); tone(N.do2, 0.09, 0.28, { type: 'triangle', gain: 0.09 }); break;
    case 'star': tone([N.do, N.mi, N.sol][i % 3] * 1.5, 0, 0.3, { type: 'sine', gain: 0.1 }); break;
    case 'win': [N.do, N.mi, N.sol, N.do2, N.mi2].forEach((f, k) => tone(f, k * 0.1, 0.4, { type: 'triangle', gain: 0.09 })); break;
    case 'oops': tone(330, 0, 0.22, { type: 'sine', gain: 0.07, to: 262 }); break;
    case 'giggle': [0, 0.09, 0.18].forEach((s, k) => tone(700 + k * 120, s, 0.08, { type: 'square', gain: 0.03 })); break;
    case 'unlock': [N.sol, N.do2, N.mi2, N.sol * 2].forEach((f, k) => tone(f, k * 0.12, 0.5, { type: 'sine', gain: 0.1 })); break;
    case 'sticker': tone(180, 0, 0.1, { type: 'sine', gain: 0.14, to: 90 }); tone(N.sol, 0.1, 0.18, { type: 'triangle', gain: 0.08 }); tone(N.do2, 0.2, 0.34, { type: 'triangle', gain: 0.08 }); break;
    default: break;
  }
}

if ('speechSynthesis' in window) {
  voice = chooseVoice(allVoices(), cfg.voixNom);
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    voice = chooseVoice(allVoices(), cfg.voixNom);
    listeners.forEach((fn) => { try { fn(); } catch { /* silencieux */ } });
  });
}

export function stopSpeaking() {
  try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch { /* silencieux */ }
  if (current) { clearTimeout(current.timer); current.finish(); current = null; }
}

/**
 * Fait parler le renard. Retourne une promesse résolue à la fin de la phrase.
 * Sans voix (réglage coupé ou indisponible), la durée est estimée pour animer la bouche quand même.
 */
export function speak(text, { onStart, onEnd, force = false } = {}) {
  stopSpeaking();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; onEnd?.(); resolve(); };
    const est = Math.max(900, text.length * 62);
    const state = { finish, timer: null };
    current = state;
    const useVoice = (cfg.voix || force) && 'speechSynthesis' in window;
    onStart?.();
    if (useVoice) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = voice?.lang || 'fr-FR'; u.rate = cfg.vitesse; u.pitch = cfg.timbre;
        if (voice) u.voice = voice.voice;
        u.onend = () => { clearTimeout(state.timer); finish(); };
        u.onerror = () => { clearTimeout(state.timer); finish(); };
        speechSynthesis.speak(u);
        state.timer = setTimeout(finish, est * 2.2 + 1500);
        return;
      } catch { /* on retombe sur le mode silencieux */ }
    }
    state.timer = setTimeout(finish, est);
  });
}
