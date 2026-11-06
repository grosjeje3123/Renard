// Géométrie 2D utilisée par le moteur de tracé. Aucune dépendance au DOM.
// Convention : espace "guide", y vers le bas, unité = 1 interligne.

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function polyLength(p) {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += dist(p[i - 1], p[i]);
  return L;
}

export function bbox(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of p) {
    if (q.x < x0) x0 = q.x;
    if (q.x > x1) x1 = q.x;
    if (q.y < y0) y0 = q.y;
    if (q.y > y1) y1 = q.y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

/** Rééchantillonne à pas constant (en unités). Conserve t si présent. */
export function resample(p, spacing) {
  if (p.length < 2) return p.slice();
  const out = [{ ...p[0] }];
  let carry = 0;
  for (let i = 1; i < p.length; i++) {
    let a = p[i - 1];
    const b = p[i];
    let seg = dist(a, b);
    while (seg > 0 && carry + seg >= spacing) {
      const k = (spacing - carry) / seg;
      const q = lerpPt(a, b, k);
      out.push(q);
      a = q;
      seg = dist(a, b);
      carry = 0;
    }
    carry += seg;
  }
  const last = p[p.length - 1];
  if (dist(out[out.length - 1], last) > spacing * 0.3) out.push({ ...last });
  else out[out.length - 1] = { ...last };
  return out;
}

export function resampleN(p, n) {
  const L = polyLength(p);
  if (p.length < 2 || L === 0) return p.slice();
  return resample(p, L / (n - 1));
}

function lerpPt(a, b, k) {
  const q = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  if (a.t !== undefined && b.t !== undefined) q.t = a.t + (b.t - a.t) * k;
  return q;
}

/** Moyenne mobile de demi-fenêtre k (extrémités conservées). */
export function smooth(p, k) {
  if (k <= 0 || p.length < 3) return p.slice();
  const out = [];
  for (let i = 0; i < p.length; i++) {
    if (i === 0 || i === p.length - 1) { out.push({ ...p[i] }); continue; }
    const kk = Math.min(k, i, p.length - 1 - i);
    let sx = 0, sy = 0;
    for (let j = i - kk; j <= i + kk; j++) { sx += p[j].x; sy += p[j].y; }
    const n = 2 * kk + 1;
    out.push({ ...p[i], x: sx / n, y: sy / n });
  }
  return out;
}

export function segDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  let k = l2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  k = clamp01(k);
  return Math.hypot(p.x - (a.x + k * dx), p.y - (a.y + k * dy));
}

export function distToPolyline(p, poly) {
  if (poly.length === 1) return dist(p, poly[0]);
  let m = Infinity;
  for (let i = 1; i < poly.length; i++) {
    const d = segDist(p, poly[i - 1], poly[i]);
    if (d < m) m = d;
  }
  return m;
}

/** Vecteur de translation moyen entre p et sa projection sur poly (pour l'alignement ICP). */
export function meanOffsetToPolyline(pts, poly) {
  let sx = 0, sy = 0;
  for (const p of pts) {
    let best = Infinity, bx = 0, by = 0;
    for (let i = 1; i < poly.length; i++) {
      const a = poly[i - 1], b = poly[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      const k = l2 === 0 ? 0 : clamp01(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2);
      const qx = a.x + k * dx, qy = a.y + k * dy;
      const d = Math.hypot(p.x - qx, p.y - qy);
      if (d < best) { best = d; bx = qx - p.x; by = qy - p.y; }
    }
    sx += bx; sy += by;
  }
  return { x: sx / pts.length, y: sy / pts.length };
}

export const translate = (pts, dx, dy) => pts.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));

/** Position et direction (angle) au fil de la longueur d'arc s. */
export function pointAt(poly, s) {
  let acc = 0;
  for (let i = 1; i < poly.length; i++) {
    const seg = dist(poly[i - 1], poly[i]);
    if (acc + seg >= s || i === poly.length - 1) {
      const k = seg === 0 ? 0 : clamp01((s - acc) / seg);
      const a = poly[i - 1], b = poly[i];
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    acc += seg;
  }
  const p = poly[poly.length - 1];
  return { x: p.x, y: p.y, angle: 0 };
}
