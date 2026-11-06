// Petit constructeur de chemins pour écrire les gabarits (y vers le haut, 1 unité = 1 interligne).
// Le résultat est une simple chaîne "M … C … L …" : le contenu reste de la donnée.

const f = (n) => Math.round(n * 1000) / 1000;
const rad = (d) => (d * Math.PI) / 180;

export class P {
  constructor() { this.parts = []; this.x = 0; this.y = 0; }
  M(x, y) { this.parts.push(`M ${f(x)} ${f(y)}`); this.x = x; this.y = y; return this; }
  L(x, y) { this.parts.push(`L ${f(x)} ${f(y)}`); this.x = x; this.y = y; return this; }
  C(x1, y1, x2, y2, x, y) { this.parts.push(`C ${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)} ${f(x)} ${f(y)}`); this.x = x; this.y = y; return this; }
  Q(x1, y1, x, y) { this.parts.push(`Q ${f(x1)} ${f(y1)} ${f(x)} ${f(y)}`); this.x = x; this.y = y; return this; }
  /** Arc d'ellipse centré en (cx,cy), angles en degrés (sens trigonométrique si a1 > a0, y vers le haut). */
  arc(cx, cy, rx, ry, a0, a1) {
    const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90));
    const step = (a1 - a0) / n;
    for (let i = 0; i < n; i++) {
      const t0 = rad(a0 + i * step), t1 = rad(a0 + (i + 1) * step);
      const k = (4 / 3) * Math.tan((t1 - t0) / 4);
      const p0 = [Math.cos(t0), Math.sin(t0)], p3 = [Math.cos(t1), Math.sin(t1)];
      const c1 = [p0[0] - k * p0[1], p0[1] + k * p0[0]];
      const c2 = [p3[0] + k * p3[1], p3[1] - k * p3[0]];
      this.C(cx + rx * c1[0], cy + ry * c1[1], cx + rx * c2[0], cy + ry * c2[1], cx + rx * p3[0], cy + ry * p3[1]);
    }
    return this;
  }
  /** Courbe paramétrique échantillonnée (utile pour vagues et boucles). */
  fn(t0, t1, n, g) {
    for (let i = 0; i <= n; i++) {
      const [x, y] = g(t0 + ((t1 - t0) * i) / n);
      if (i === 0 && this.parts.length === 0) this.M(x, y); else this.L(x, y);
    }
    return this;
  }
  toString() { return this.parts.join(' '); }
}

export const circlePoint = (cx, cy, rx, ry, a) => [cx + rx * Math.cos(rad(a)), cy + ry * Math.sin(rad(a))];
