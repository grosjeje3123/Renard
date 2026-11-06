// Simulateur de tracés d'enfants pour tester le moteur sans écran.
import { resample, polyLength, bbox } from '../src/engine/geometry.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());

/**
 * opts : noise (σ bruit blanc, u), drift (amplitude d'ondulation lente, u), scale, dx, dy,
 *        reverse, from/to (fractions du chemin), speed (u/s), seed, pauseAt (fraction), lifts
 */
export function simulate(tStroke, opts = {}) {
  const { noise = 0.05, drift = 0.1, scale = 1, dx = 0, dy = 0, reverse = false, from = 0, to = 1, speed = 3, seed = 1, pauseAt = null } = opts;
  const r = rng(seed);
  let base = tStroke.pts.slice();
  if (reverse) base.reverse();
  const n = base.length;
  base = base.slice(Math.floor(from * (n - 1)), Math.ceil(to * (n - 1)) + 1);
  const bb = bbox(tStroke.pts);
  const cx = bb.x0 + bb.w / 2, cy = bb.y0 + bb.h / 2;
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];
  const f1 = 0.5 + r() * 0.5, f2 = 0.6 + r() * 0.6;
  let t = 0, s = 0;
  const pts = [];
  for (let i = 0; i < base.length; i++) {
    if (i > 0) s += Math.hypot(base[i].x - base[i - 1].x, base[i].y - base[i - 1].y);
    const x = cx + (base[i].x - cx) * scale + dx + drift * Math.sin(f1 * s + ph[0]) + noise * gauss(r);
    const y = cy + (base[i].y - cy) * scale + dy + drift * Math.sin(f2 * s + ph[1]) + noise * gauss(r);
    if (i > 0) t += (0.06 / speed) * 1000 * (0.7 + 0.6 * r());
    if (pauseAt !== null && i === Math.floor(pauseAt * base.length)) t += 900;
    pts.push({ x, y, t });
  }
  return { points: pts, lifts: opts.lifts || 0 };
}

export function scribble(seed = 3) {
  const r = rng(seed);
  const pts = [];
  let x = 3 + r() * 4, y = 2 + r() * 3, t = 0;
  for (let i = 0; i < 120; i++) { x += gauss(r) * 0.35; y += gauss(r) * 0.35; t += 16; pts.push({ x, y, t }); }
  return { points: pts, lifts: 0 };
}

export function tapAt(x, y, seed = 1) {
  const r = rng(seed);
  return { points: [0, 1, 2].map((i) => ({ x: x + gauss(r) * 0.05, y: y + gauss(r) * 0.05, t: i * 20 })), lifts: 0 };
}
