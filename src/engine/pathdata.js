// Lecture de chemins de type SVG (M, L, C, Q, Z, en coordonnées absolues)
// et aplatissement en polyligne. Les gabarits d'exercices sont écrits avec ce format.

const NUM = /-?\d*\.?\d+(?:e-?\d+)?/gi;

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}
function quad(p0, p1, p2, t) {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
}
const approxLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return L; };

/**
 * Convertit "M x y C ..." en liste de points {x,y}.
 * Les ordonnées sont celles du chemin tel qu'écrit (y vers le haut pour les lettres :
 * la conversion vers l'espace du guide est faite par buildTemplate()).
 */
export function parsePath(d) {
  const tokens = d.match(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  const out = [];
  let i = 0, cmd = null, cur = { x: 0, y: 0 }, start = null;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[MLCQZ]/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    if (cmd === 'Z') { if (start) { out.push({ ...start }); cur = start; } continue; }
    if (cmd === 'M') { cur = { x: num(), y: num() }; start = cur; out.push({ ...cur }); cmd = 'L'; }
    else if (cmd === 'L') { cur = { x: num(), y: num() }; out.push({ ...cur }); }
    else if (cmd === 'C') {
      const p1 = { x: num(), y: num() }, p2 = { x: num(), y: num() }, p3 = { x: num(), y: num() };
      const rough = approxLen([cur, p1, p2, p3]);
      const n = Math.max(8, Math.ceil(rough / 0.08));
      for (let k = 1; k <= n; k++) out.push(cubic(cur, p1, p2, p3, k / n));
      cur = p3;
    } else if (cmd === 'Q') {
      const p1 = { x: num(), y: num() }, p2 = { x: num(), y: num() };
      const rough = approxLen([cur, p1, p2]);
      const n = Math.max(6, Math.ceil(rough / 0.08));
      for (let k = 1; k <= n; k++) out.push(quad(cur, p1, p2, k / n));
      cur = p2;
    } else { i++; }
  }
  return out;
}
