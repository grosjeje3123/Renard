// Reconnaissance géométrique des tracés.
//
// Contrat (pour brancher plus tard un autre moteur : modèle d'apprentissage, ML Kit Digital Ink…) :
//   recognizer.evaluateStroke(templateStroke, userStroke, context) -> Evaluation
//   recognizer.evaluateAttempt(template, evaluations)               -> Evaluation agrégée
// Evaluation = { score 0..1, stars 0..3, criteria{start,direction,shape,size,lines,flow}, tags[], metrics{} }
// Tous les critères valent 0..1 ; 1 = parfait. Les erreurs d'enfant sont pardonnées par défaut.

import { clamp01, clamp, dist, polyLength, bbox, resample, resampleN, smooth, distToPolyline, meanOffsetToPolyline, translate } from './geometry.js';
import { dtwOpenEndAt } from './dtw.js';

export const CRITERIA = ['start', 'direction', 'shape', 'size', 'lines', 'flow'];
const WEIGHTS = { start: 0.14, direction: 0.2, shape: 0.36, size: 0.1, lines: 0.1, flow: 0.1 };

/** 1 si x <= good, 0 si x >= bad, linéaire entre les deux. */
const sc = (x, good, bad) => clamp01(1 - (x - good) / (bad - good));

export const starsFor = (score) => (score >= 0.78 ? 3 : score >= 0.58 ? 2 : score >= 0.3 ? 1 : 0);

const DEFAULTS = {
  tolerance: 1, // 1 = suivi du guide ; >1 = plus indulgent (écriture sans modèle)
  align: false, // true : on ignore un décalage global (écriture sans modèle)
  pen: false, // un stylet est plus précis qu'un doigt
  slant: null, // { min, max } : cisaillement horizontal admis (écriture plus droite ou penchée en arrière)
};

export class GeometricRecognizer {
  name = 'geometrique-v1';

  evaluateStroke(tStroke, user, ctx = {}) {
    const o = { ...DEFAULTS, ...ctx };
    const ts = o.tolerance * (o.pen ? 0.85 : 1);
    const raw = dedupe(user.points || []);
    if (raw.length === 0) return emptyEval(['vide']);
    if (tStroke.kind === 'dot') return this.#evaluateDot(tStroke, raw, ts);

    const clean = smooth(resample(raw, 0.07), 1);
    if (clean.length < 3 || polyLength(clean) < 0.3) return emptyEval(['trop-court']);

    // Proportions mesurées sur le tracé brut.
    const rb = bbox(clean), tb = tStroke.bbox;
    const dims = [];
    if (tb.w >= 0.8) dims.push(rb.w / tb.w);
    if (tb.h >= 0.8) dims.push(rb.h / tb.h);
    const gmean = dims.length ? Math.exp(dims.reduce((a, r) => a + Math.log(Math.max(r, 0.05)), 0) / dims.length) : 1;

    // Écriture sans modèle : on sépare "forme" et "placement". Si le tracé est homothétique du gabarit
    // (même rapport sur les deux axes), on le compare à taille égale ; la taille est jugée à part.
    let usr = clean;
    if (o.align) {
      if (dims.length === 2 && Math.abs(Math.log(dims[0] / dims[1])) < 0.25 && (gmean < 0.8 || gmean > 1.25)) {
        const cx = rb.x0 + rb.w / 2, cy = rb.y0 + rb.h / 2, k = 1 / gmean;
        usr = clean.map((p) => ({ ...p, x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k }));
      }
      // Recalage : on essaie deux points de départ, « pas de décalage » et « point à point le long du tracé ».
      // Le second évite qu'un n, un m ou un u écrit à demi-pas de sa place s'accroche à la mauvaise jambe.
      const fit = (tx, ty) => {
        for (let it = 0; it < 8; it++) {
          const off = meanOffsetToPolyline(translate(usr, tx, ty), tStroke.pts);
          tx += off.x; ty += off.y;
          const m = Math.hypot(tx, ty);
          if (m > 1.6) { tx *= 1.6 / m; ty *= 1.6 / m; }
          if (Math.hypot(off.x, off.y) < 0.01) break;
        }
        const moved = translate(usr, tx, ty);
        let r = 0;
        for (const p of moved) r += distToPolyline(p, tStroke.pts);
        return { tx, ty, r: r / moved.length };
      };
      const ua = resampleN(usr, 40), ta = resampleN(tStroke.pts, 40);
      const cnt = Math.min(ua.length, ta.length);
      const init = { x: 0, y: 0 };
      for (let i = 0; i < cnt; i++) { init.x += (ta[i].x - ua[i].x) / cnt; init.y += (ta[i].y - ua[i].y) / cnt; }
      const f0 = fit(0, 0), f1 = Math.hypot(init.x, init.y) < 2.5 ? fit(init.x, init.y) : f0;
      const { tx, ty } = f1.r < f0.r ? f1 : f0;
      usr = translate(usr, tx, ty);
      if (o.slant) usr = fitShear(usr, tStroke.pts, o.slant);
    }

    const tpl = tStroke.pts;
    const userLen = polyLength(usr);

    // --- Départ
    const d0 = dist(usr[0], tStroke.start);
    const start = sc(d0, 0.5 * ts, 1.8 * ts);

    // --- Précision et couverture
    let sum = 0, out = 0;
    for (const p of usr) { const d = distToPolyline(p, tpl); sum += d; if (d > 0.9 * ts) out++; }
    const precMean = sum / usr.length;
    const outFrac = out / usr.length;
    const A = resampleN(usr, 60), B = resampleN(tpl, 60);
    const fwd = dtwOpenEndAt(A, B);
    const samples = resample(tpl, 0.12);
    let covered = 0;
    for (const s of samples) if (distToPolyline(s, usr) <= 0.4 * ts + 0.05) covered++;
    // Les lettres où le crayon repasse sur le même trait (m, n, p…) peuvent paraître « couvertes » sans avoir été finies :
    // on tient aussi compte de l'avancement réel du geste le long du gabarit.
    const coverage = Math.min(covered / samples.length, fwd.reach + 0.12);
    const dEnd = dist(usr[usr.length - 1], tStroke.end);
    const precScore = sc(precMean, 0.2 * ts, 0.85 * ts);
    const covScore = clamp01((coverage - 0.6) / 0.32);

    // --- Sens du geste
    const costF = fwd.cost;
    const costR = dtwOpenEndAt(A, B.slice().reverse()).cost;
    const ratio = costF / (costR + 0.04);
    const direction = userLen < 0.5 ? 0.5 : clamp01((1.3 - ratio) / 0.55);
    // L'ordre des points compte aussi pour la forme : deux lettres voisines se distinguent mieux ainsi.
    const dtwScore = sc(costF, 0.16 * ts, 0.6 * ts);
    const shape = Math.pow(precScore, 0.4) * Math.pow(covScore, 0.35) * Math.pow(dtwScore, 0.25);

    // --- Proportions et lignes (coordonnées brutes, non alignées)
    const sizeErr = dims.length ? Math.max(...dims.map((r) => Math.abs(Math.log(Math.max(r, 0.05))))) : 0;
    const endFar = dEnd > 1.3 * ts;
    const complete = coverage >= 0.88 && !endFar;
    const size = complete || o.align ? sc(sizeErr, 0.14, 0.7) : 0.75;
    const eb = rb.y1 - tb.y1; // > 0 : sous la ligne
    const et = rb.y0 - tb.y0; // > 0 : trop bas (n'atteint pas le haut)
    const lines = complete ? sc(Math.max(Math.abs(eb), Math.abs(et)), 0.3, 1.1) : 0.75;

    // --- Continuité du geste
    const wobble = polyLength(smooth(clean, 1)) / Math.max(0.01, polyLength(smooth(clean, 5))) - 1;
    const pauses = countPauses(user.points || []);
    const lifts = user.lifts || 0;
    const flow = clamp01(1 - 0.55 * clamp01((wobble - 0.08) / 0.4) - 0.18 * Math.min(lifts, 2) - 0.08 * Math.min(pauses, 3));

    const criteria = { start, direction, shape, size, lines, flow };
    let score = CRITERIA.reduce((s, k) => s + WEIGHTS[k] * criteria[k], 0);
    // Garde-fous pédagogiques : on récompense l'effort, mais pas un tracé qui n'a rien à voir.
    score = Math.min(score, shape + 0.2); // sans forme reconnaissable, pas d'étoile
    if (coverage < 0.78 || dEnd > 2.2 * ts) score = Math.min(score, 0.48);
    else if (!complete) score = Math.min(score, 0.72);
    if (direction < 0.3) score = Math.min(score, 0.56);
    if (complete && (lines < 0.3 || size < 0.3)) score = Math.min(score, 0.74); // forme juste mais mal posée ou à la mauvaise taille
    if (start < 0.2) score = Math.min(score, 0.74);
    else if (start < 0.6) score = Math.min(score, 0.77); // départ loin du point vert : jamais trois étoiles

    const tags = [];
    if (direction < 0.4) tags.push('sens-inverse');
    if (start < 0.6) tags.push('depart-loin');
    if (!complete) tags.push('incomplet');
    if (size < 0.7 && (complete || o.align)) tags.push(gmean < 1 ? 'trop-petit' : 'trop-grand');
    if (complete && lines < 0.7) {
      if (eb < -0.4) tags.push('flotte');
      else if (eb > 0.4) tags.push('descend-trop');
      if (et > 0.4) tags.push('haut-court');
      else if (et < -0.4) tags.push('haut-depasse');
    }
    if (precScore < 0.55 && complete) tags.push('hors-chemin');
    if (flow < 0.6) tags.push(wobble > 0.2 ? 'tremble' : lifts ? 'leve' : 'pause');

    return { score, stars: starsFor(score), criteria, tags, metrics: { coverage, rawCov: covered / samples.length, reach: fwd.reach, dEnd, precMean, outFrac, d0, costF, costR, ratio, wobble, sizeErr, eb, et, userLen } };
  }

  #evaluateDot(tStroke, raw, ts) {
    const c = { x: raw.reduce((s, p) => s + p.x, 0) / raw.length, y: raw.reduce((s, p) => s + p.y, 0) / raw.length };
    const d = dist(c, tStroke.start);
    const bb = bbox(raw);
    const spread = Math.hypot(bb.w, bb.h);
    const start = sc(d, 0.45 * ts, 1.4 * ts);
    const shape = sc(spread, 0.6, 2.2);
    const lines = sc(Math.abs(c.y - tStroke.start.y), 0.5, 1.4);
    const criteria = { start, direction: 1, shape, size: 1, lines, flow: 1 };
    const score = 0.55 * start + 0.3 * shape + 0.15 * lines;
    const tags = [];
    if (start < 0.5) tags.push('point-loin');
    if (shape < 0.5) tags.push('point-trop-long');
    return { score, stars: starsFor(score), criteria, tags, metrics: { d, spread } };
  }

  evaluateAttempt(template, evals) {
    if (!evals.length) return emptyEval(['vide']);
    const w = evals.map((e, i) => (template.strokes[i]?.kind === 'dot' ? 0.5 : 1));
    const W = w.reduce((a, b) => a + b, 0);
    const avg = (f) => evals.reduce((s, e, i) => s + f(e) * w[i], 0) / W;
    const criteria = {};
    for (const k of CRITERIA) criteria[k] = avg((e) => e.criteria[k] ?? 1);
    let score = avg((e) => e.score);
    // Un trait raté ne doit pas être « compensé » par un trait facile (le point du i, par exemple) :
    // si un trait tracé est à 1 étoile ou moins, l'essai entier plafonne à 1 étoile.
    const weakPath = evals.some((e, i) => template.strokes[i]?.kind !== 'dot' && e.stars <= 1);
    if (weakPath) score = Math.min(score, 0.57);
    const tags = [...new Set(evals.flatMap((e) => e.tags))];
    return { score, stars: starsFor(score), criteria, tags, metrics: {} };
  }
}

/**
 * Redresse un tracé écrit plus droit (ou penché en arrière) que le modèle : cisaillement horizontal autour du
 * centre du tracé, retenu seulement s'il rapproche nettement du gabarit. k > 0 penche vers l'avant.
 */
function fitShear(usr, tpl, { min, max }) {
  const cy = usr.reduce((s, p) => s + p.y, 0) / usr.length;
  const probe = usr.filter((_, i) => i % 2 === 0);
  const cost = (k) => {
    const sh = probe.map((p) => ({ x: p.x - k * (p.y - cy), y: p.y }));
    const off = meanOffsetToPolyline(sh, tpl);
    let sum = 0;
    for (const p of sh) sum += distToPolyline({ x: p.x + off.x, y: p.y + off.y }, tpl);
    return sum / sh.length;
  };
  const base = cost(0);
  let bestK = 0, best = base;
  for (let k = min; k <= max + 1e-9; k += 0.04) { const c = cost(k); if (c < best) { best = c; bestK = k; } }
  if (bestK === 0 || base - best < 0.04) return usr;
  const sheared = usr.map((p) => ({ ...p, x: p.x - bestK * (p.y - cy) }));
  const off = meanOffsetToPolyline(sheared, tpl);
  return translate(sheared, off.x, off.y);
}

function emptyEval(tags) {
  return { score: 0, stars: 0, criteria: { start: 0, direction: 0, shape: 0, size: 0, lines: 0, flow: 0 }, tags, metrics: {} };
}

function dedupe(pts) {
  const out = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 0.015) out.push(p);
  }
  return out;
}

function countPauses(pts) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].t !== undefined && pts[i].t - pts[i - 1].t > 700) n++;
  return n;
}

export const recognizer = new GeometricRecognizer();
