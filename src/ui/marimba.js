// Petite musique de marimba, synthétisée (aucun fichier audio) : un motif joyeux qui monte, pour l'écran de démarrage.
// Une lame de marimba, c'est un son boisé : une attaque sèche (le coup de mailloche), un son de fond qui sonne un moment,
// et deux harmoniques qui disparaissent très vite. Les aigus s'éteignent plus vite que les graves.
// Le module ne dépend que de l'API WebAudio : on peut donc le jouer en direct ou le « rendre » hors ligne (tools/marimba-wav.mjs).

/** Fréquences (Hz) des notes du motif, en gamme pentatonique : toutes s'accordent entre elles, aucune fausse note possible. */
export const NOTE = { sol4: 392, do5: 523.25, re5: 587.33, mi5: 659.25, sol5: 783.99, la5: 880, do6: 1046.5, mi6: 1318.5, sol6: 1568 };

/**
 * Le motif : [note, début en secondes, force de 0 à 1]. Une montée en croche, un petit retour, puis l'accord final
 * « roulé » (les trois notes ne tombent pas tout à fait ensemble, comme sous les baguettes d'un vrai marimba).
 */
export const MOTIF = [
  [NOTE.do5, 0, 0.78], [NOTE.mi5, 0.17, 0.74], [NOTE.sol5, 0.34, 0.8], [NOTE.la5, 0.51, 0.9],
  [NOTE.sol5, 0.76, 0.66], [NOTE.mi5, 0.93, 0.66],
  [NOTE.do5, 1.14, 0.8], [NOTE.sol5, 1.18, 0.78], [NOTE.do6, 1.22, 0.95],
  [NOTE.mi6, 1.5, 0.5], [NOTE.sol6, 1.62, 0.42],
];
/** Durée du motif, avec la résonance de la dernière note. */
export const MOTIF_DUREE = 2.9;

// [rapport à la note, force, constante de temps de l'extinction (s) pour do5] : les partiels d'une lame accordée
const PARTIELS = [[1, 1, 0.19], [3.98, 0.3, 0.05], [9.7, 0.06, 0.016]];

let bruit = new WeakMap(); // un petit souffle de bruit par contexte (le « toc » de la mailloche)
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

/** Une note de marimba : `t` en secondes du contexte, `force` de 0 à 1, `pan` de -1 (gauche) à 1 (droite). */
export function note(ctx, dest, freq, t, force = 0.8, pan = 0) {
  const bus = ctx.createGain();
  bus.gain.value = 0.15 * force;
  let sortie = bus;
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; bus.connect(p); sortie = p; }
  sortie.connect(dest);
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

/** Joue (ou programme) le motif entier. Renvoie l'instant où le dernier son s'éteint. */
export function jouerMotif(ctx, dest, t0 = 0) {
  let fin = t0;
  MOTIF.forEach(([f, dt, force], i) => { fin = Math.max(fin, note(ctx, dest, f, t0 + dt, force, -0.35 + (0.7 * i) / (MOTIF.length - 1))); });
  return fin;
}
