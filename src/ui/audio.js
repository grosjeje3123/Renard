// Sons synthétisés (aucun fichier audio) et voix du renard (synthèse vocale du système).
// Tout reste sur l'appareil. Les sons ne démarrent qu'après un geste de l'enfant (règle des navigateurs).

import { chooseVoice, rankVoices, timbres, vitesses } from '../core/voices.js';
import { decouper, idPhrase } from '../core/voixId.js';
import { jouerMotif, MOTIF_DUREE } from './marimba.js';

// Voix enregistrées : { identifiant de phrase → extension }, fixé à la fabrication (build.mjs) d'après le dossier voix/.
/* global __VOIX__ */
const clips = typeof __VOIX__ !== 'undefined' ? __VOIX__ : {};

let ctx = null;
const cfg = { sons: true, jingle: true, voix: true, voixNom: '', vitesse: vitesses.normal, timbre: timbres.naturel };
let voice = null; // voix retenue (description de voices.js)
let current = null;
const listeners = new Set();

const allVoices = () => { try { return 'speechSynthesis' in window ? speechSynthesis.getVoices() : []; } catch { return []; } };

export function configureAudio(s) {
  cfg.sons = s.sons; cfg.voix = s.voix; cfg.jingle = s.jingle !== false;
  cfg.voixNom = s.voixNom || '';
  cfg.vitesse = vitesses[s.voixVitesse] ?? vitesses.normal;
  cfg.timbre = timbres[s.voixTimbre] ?? timbres.naturel;
  voice = chooseVoice(allVoices(), cfg.voixNom);
  if (!s.voix) stopSpeaking();
}

/** Voix françaises disponibles (meilleure en premier) et voix actuellement retenue. */
/** Des voix enregistrées sont-elles livrées avec cette version ? */
export const hasClips = () => Object.keys(clips).length > 0;
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

/** La petite musique de marimba du démarrage (ou de l'écran Options). Renvoie sa durée en secondes ; 0 si elle est coupée. */
export function jingle({ force = false } = {}) {
  if (!ctx || !cfg.sons || !(cfg.jingle || force)) return 0;
  try { jouerMotif(ctx, ctx.destination, ctx.currentTime + 0.03); } catch { return 0; }
  return MOTIF_DUREE;
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
  if (current) {
    const c = current; current = null;
    c.stopped = true; clearTimeout(c.timer);
    try { c.audio?.pause(); } catch { /* silencieux */ }
    c.release?.();
    c.finish();
  }
}

/** Joue un fichier enregistré. Résout true s'il a été joué jusqu'au bout (ou interrompu), false s'il faut retomber sur la voix du système. */
function playClip(file, state) {
  return new Promise((resolve) => {
    let a;
    try { a = new Audio(file); } catch { resolve(false); return; }
    state.audio = a;
    const end = (ok) => { clearTimeout(guard); a.onended = a.onerror = null; state.release = null; resolve(ok); };
    const guard = setTimeout(() => end(true), 30000);
    state.release = () => end(true);
    a.onended = () => end(true);
    a.onerror = () => end(false);
    a.play().catch(() => end(false)); // lecture refusée (pas encore de geste) ou fichier absent : voix du système
  });
}

/** Une phrase lue par la synthèse vocale du système (ou, sans synthèse, simplement attendue le temps de la dire). */
function synth(text, state) {
  return new Promise((resolve) => {
    const fin = () => { clearTimeout(state.timer); state.release = null; resolve(); };
    state.release = fin;
    const est = Math.max(900, text.length * 62);
    if ('speechSynthesis' in window) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = voice?.lang || 'fr-FR'; u.rate = cfg.vitesse; u.pitch = cfg.timbre;
        if (voice) u.voice = voice.voice;
        u.onend = fin; u.onerror = fin;
        speechSynthesis.speak(u);
        state.timer = setTimeout(fin, est * 2.2 + 1500);
        return;
      } catch { /* on retombe sur l'attente silencieuse */ }
    }
    state.timer = setTimeout(fin, est);
  });
}

/**
 * Fait parler le renard, phrase après phrase : le fichier enregistré de la phrase s'il existe (dossier voix/),
 * sinon la voix du système. Retourne une promesse résolue à la fin. `dit` : texte à lire s'il diffère du texte affiché.
 * Sans voix (réglage coupé), la durée est estimée pour animer la bouche quand même.
 */
export function speak(text, { onStart, onEnd, force = false, dit } = {}) {
  stopSpeaking();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; onEnd?.(); resolve(); };
    const state = { finish, timer: null, audio: null, release: null, stopped: false };
    current = state;
    onStart?.();
    const parts = cfg.voix || force ? decouper(dit ?? text) : [];
    if (!parts.length) { state.timer = setTimeout(finish, Math.max(900, text.length * 62)); return; }
    (async () => {
      for (const p of parts) {
        if (state.stopped) return;
        const id = idPhrase(p);
        if (clips[id] && (await playClip(`voix/${id}.${clips[id]}`, state))) continue;
        if (state.stopped) return;
        await synth(p, state);
      }
      if (!state.stopped) { if (current === state) current = null; finish(); }
    })();
  });
}
