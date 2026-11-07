// Petite musique de démarrage, synthétisée (aucun fichier audio) : un marimba qui court sur une gamme « espagnole », avec une
// basse qui marque le temps, des claquements de castagnettes sur les contretemps et un roulement final. C'est une composition
// originale, dans l'esprit des musiques de désert et de vallée des jeux d'aventure (aucune mélodie existante n'est reprise).
//
// Une lame de marimba, c'est un son boisé : une attaque sèche (le coup de mailloche), un son de fond qui sonne un moment,
// et deux harmoniques qui disparaissent très vite. Les aigus s'éteignent plus vite que les graves.
// Le module ne dépend que de l'API WebAudio : on peut donc le jouer en direct ou le « rendre » hors ligne (tools/marimba-wav.mjs).

/** La gamme « phrygienne dominante » sur la : la, si bémol, do dièse, ré, mi, fa, sol. Le saut si bémol → do dièse, c'est la couleur espagnole. */
export const GAMME = { la: 0, sib: 1, dod: 4, re: 5, mi: 7, fa: 8, sol: 10, la2: 12, sib2: 13, dod2: 16 };
/** Fréquence (Hz) d'une note, en demi-tons à partir du la 440. */
export const hz = (demitons) => 440 * Math.pow(2, demitons / 12);

export const TEMPO = 150; // noires par minute
const DOUBLE = 60 / TEMPO / 4; // une double croche : 0,1 s

const { la, sib, dod, re, mi, fa, sol, la2, sib2 } = GAMME;
/**
 * La mélodie : [position en doubles croches, note en demi-tons, force de 0 à 1]. Deux mesures : une descente qui s'arrête sur le
 * la, puis une réponse qui monte plus haut avant de retomber sur l'accord final (position 28).
 */
export const MELODIE = [
  [0, la, 0.8], [1, sib, 0.55], [2, dod, 0.6], [3, re, 0.6], [4, mi, 0.88], [6, mi, 0.5], [7, fa, 0.62],
  [8, mi, 0.72], [10, re, 0.6], [11, dod, 0.62], [12, sib, 0.78], [14, la, 0.7],
  [16, mi, 0.72], [17, fa, 0.56], [18, la2, 0.9], [19, sib2, 0.66], [20, la2, 0.74], [21, sol, 0.62], [22, fa, 0.62], [23, mi, 0.62],
  [24, fa, 0.58], [25, mi, 0.58], [26, re, 0.62], [27, dod, 0.72],
];
/** L'accord final de la majeur (la, mi, la, do dièse), « roulé » : les notes ne tombent pas tout à fait ensemble, comme sous les baguettes. */
export const ACCORD = [[0, 0.95], [7, 0.8], [12, 0.88], [16, 0.7]];
/** Les graves, qui marquent le temps : [position, note, force]. */
export const BASSE = [[0, la - 24, 0.7], [8, la - 24, 0.6], [12, mi - 24, 0.58], [16, la - 24, 0.7], [20, mi - 24, 0.58], [24, la - 24, 0.62]];
/** Les castagnettes sur les contretemps : [position, force]. Elles se répondent d'une mesure à l'autre. */
export const CLAQUES = [[3, 0.5], [6, 0.8], [7, 0.5], [11, 0.5], [14, 0.85], [15, 0.5], [19, 0.5], [22, 0.8], [23, 0.5], [26, 0.6], [27, 0.7]];

/** La musique principale se termine ici (secondes) : l'accord final tombe à la position 28 et résonne un moment. */
export const MOTIF_DUREE = 3.4;
/** Durée totale à prévoir pour un rendu hors ligne, avec la résonance de la dernière note. */
export const MOTIF_FIN = 5.2;

// [rapport à la note, force, constante de temps de l'extinction (s) pour do5] : les partiels d'une lame accordée
const PARTIELS = [[1, 1, 0.19], [3.98, 0.3, 0.05], [9.7, 0.06, 0.016]];

let bruit = new WeakMap(); // un petit souffle de bruit par contexte (le « toc » de la mailloche, le « tac » des castagnettes)
const souffle = (ctx) => {
  let b = bruit.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 12345; // bruit reproductible (même son à chaque fois)
    for (let i = 0; i < d.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = (seed / 4294967296) * 2 - 1; }
    bruit.set(ctx, b);
  }
  return b;
};

/** Branche une sortie dans `dest`, avec un placement gauche-droite si le navigateur sait le faire. */
function sortie(ctx, dest, gain, pan) {
  const bus = ctx.createGain();
  bus.gain.value = gain;
  let s = bus;
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; bus.connect(p); s = p; }
  s.connect(dest);
  return bus;
}

/** Une note de marimba : `t` en secondes du contexte, `force` de 0 à 1, `pan` de -1 (gauche) à 1 (droite). */
export function note(ctx, dest, freq, t, force = 0.8, pan = 0) {
  const bus = sortie(ctx, dest, 0.15 * force, pan);
  // les aigus sonnent moins longtemps que les graves
  const duree = Math.min(1.7, Math.max(0.45, Math.pow(523.25 / freq, 0.75)));
  let fin = t;
  for (const [r, a, tau0] of PARTIELS) {
    const f = freq * r;
    if (f > 11000) continue;
    const tau = tau0 * duree;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.003);
    g.gain.setTargetAtTime(0, t + 0.004, tau);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.004 + tau * 7);
    fin = Math.max(fin, t + 0.004 + tau * 7);
  }
  // le coup de mailloche
  const n = ctx.createBufferSource();
  n.buffer = souffle(ctx);
  const filtre = ctx.createBiquadFilter();
  filtre.type = 'bandpass';
  filtre.frequency.value = Math.min(5200, freq * 3.2);
  filtre.Q.value = 1.1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.55, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  n.connect(filtre).connect(g).connect(bus);
  n.start(t);
  n.stop(t + 0.05);
  return fin;
}

/** Un roulement de marimba : la même lame frappée très vite, de plus en plus doucement. */
export function roulement(ctx, dest, freq, t, duree = 0.55, force = 0.6, pan = 0) {
  const pas = 0.052;
  const n = Math.max(2, Math.round(duree / pas));
  let fin = t;
  for (let i = 0; i < n; i++) fin = Math.max(fin, note(ctx, dest, freq, t + i * pas, force * (1 - (0.55 * i) / n), pan));
  return fin;
}

/** Un claquement de castagnettes : deux petits « tac » très rapprochés (un son sec, un peu creux). */
export function claquement(ctx, dest, t, force = 0.6, pan = 0.4) {
  const bus = sortie(ctx, dest, 0.4 * force, pan);
  [[0, 2500, 1], [0.021, 3200, 0.7]].forEach(([dt, f, a]) => {
    const n = ctx.createBufferSource();
    n.buffer = souffle(ctx);
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'bandpass';
    filtre.frequency.value = f;
    filtre.Q.value = 3.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + dt);
    g.gain.linearRampToValueAtTime(a, t + dt + 0.0008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.032);
    n.connect(filtre).connect(g).connect(bus);
    n.start(t + dt);
    n.stop(t + dt + 0.05);
    // le creux du bois
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 780 + dt * 4000;
    og.gain.setValueAtTime(0.0001, t + dt);
    og.gain.linearRampToValueAtTime(0.28 * a, t + dt + 0.001);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.03);
    o.connect(og).connect(bus);
    o.start(t + dt);
    o.stop(t + dt + 0.04);
  });
  return t + 0.06;
}

/** Joue (ou programme) la musique entière à partir de l'instant `t0`. Renvoie l'instant où le dernier son s'éteint. */
export function jouerMotif(ctx, dest, t0 = 0) {
  const maitre = ctx.createGain(); // niveau d'ensemble réglé pour une crête vers -6 dBFS (mesurée par tools/marimba-wav.mjs)
  maitre.gain.value = 1.55;
  maitre.connect(dest);
  let fin = t0;
  const t = (pos) => t0 + pos * DOUBLE;
  const etale = (f) => Math.max(-0.5, Math.min(0.5, (Math.log2(f / 440) - 0.5) * 0.45)); // les aigus vont un peu à droite
  for (const [pos, d, force] of BASSE) fin = Math.max(fin, note(ctx, maitre, hz(d), t(pos), force, -0.35));
  for (const [pos, d, force] of MELODIE) fin = Math.max(fin, note(ctx, maitre, hz(d), t(pos), force, etale(hz(d))));
  for (const [pos, force] of CLAQUES) fin = Math.max(fin, claquement(ctx, maitre, t(pos), force, pos % 2 ? 0.45 : 0.25));
  // l'accord final, roulé, avec un roulement sur la note haute et un petit roulement de castagnettes
  ACCORD.forEach(([d, force], i) => { fin = Math.max(fin, note(ctx, maitre, hz(d), t(28) + i * 0.018, force, -0.2 + i * 0.14)); });
  fin = Math.max(fin, roulement(ctx, maitre, hz(la2), t(28) + 0.2, 0.6, 0.5, 0.15));
  for (let i = 0; i < 4; i++) fin = Math.max(fin, claquement(ctx, maitre, t(28) + 0.04 + i * 0.075, 0.55 - i * 0.08, 0.35));
  return fin;
}
