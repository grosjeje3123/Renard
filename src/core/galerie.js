// Galerie du renard : les dessins que l'enfant choisit d'« accrocher dans la forêt ».
// Promesse de départ : rien n'est conservé. Cette fonction n'existe que si les parents l'activent (réglage `galerie`,
// désactivé par défaut) ET que l'enfant choisit d'accrocher un dessin. Les traits sont enregistrés dans l'état local
// de l'appareil (jamais envoyés, jamais dans le code de sauvegarde), au plus MAX_DESSINS dessins : le plus ancien est remplacé.
// Fonctions pures, sans interface : testables sans navigateur.

export const MAX_DESSINS = 12;
const MAX_CHARS = 60000; // taille maximale des traits d'un dessin (très largement au-dessus d'un dessin d'enfant)
const COLOR = /^#[0-9a-fA-F]{6}$/;
const PATH = /^[MLQlq0-9.\s-]+$/;

const fmt = (n) => Math.round(n * 100) / 100;

/** Chemin lissé passant par les points d'un trait (le même que celui dessiné à l'écran). */
export function pathD(pts) {
  if (pts.length === 1) return `M ${fmt(pts[0].x)} ${fmt(pts[0].y)} l 0.001 0`;
  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) d += ` Q ${fmt(pts[i].x)} ${fmt(pts[i].y)} ${fmt((pts[i].x + pts[i + 1].x) / 2)} ${fmt((pts[i].y + pts[i + 1].y) / 2)}`;
  const l = pts[pts.length - 1];
  return d + ` L ${fmt(l.x)} ${fmt(l.y)}`;
}

/** Ramer–Douglas–Peucker : garde les points qui comptent (écart toléré `eps`, en interlignes), sans récursion. */
export function simplify(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const A = pts[a], B = pts[b];
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
    let worst = -1, at = -1;
    for (let i = a + 1; i < b; i++) {
      const P = pts[i];
      const d = len < 1e-9 ? Math.hypot(P.x - A.x, P.y - A.y) : Math.abs(dy * P.x - dx * P.y + B.x * A.y - B.y * A.x) / len;
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > eps) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Traits à enregistrer : [{c, w, pts}] → [{c, w, d}], assez légers pour tenir sur la tablette. */
export function compactStrokes(strokes) {
  let out = [];
  for (const eps of [0.012, 0.03, 0.06, 0.12]) {
    out = strokes.filter((s) => s.pts?.length).map((s) => ({ c: s.c, w: fmt(s.w), d: pathD(simplify(s.pts, eps)) }));
    if (out.reduce((n, s) => n + s.d.length, 0) <= MAX_CHARS) break;
  }
  return out;
}

const validStroke = (s) => s && COLOR.test(s.c) && Number.isFinite(s.w) && s.w > 0 && s.w < 1 && typeof s.d === 'string' && s.d.length < MAX_CHARS && PATH.test(s.d);
/** Un dessin lu dans le stockage de l'appareil est-il utilisable ? (on ne fait jamais confiance aux données relues) */
export const validDrawing = (e) => !!e && typeof e.id === 'string' && Number.isFinite(e.t) && Array.isArray(e.s) && e.s.length > 0 && e.s.length < 400 && e.s.every(validStroke);

/** Les dessins accrochés, du plus récent au plus ancien. */
export const drawings = (st) => (Array.isArray(st.galerie) ? st.galerie.filter(validDrawing).slice().reverse() : []);
export const galleryCount = (st) => drawings(st).length;
export const galleryOn = (st) => !!st.settings?.galerie;

/**
 * Accroche un dessin. Si `replaceId` désigne un dessin encore présent, on le met à jour (l'enfant a continué après l'avoir accroché).
 * Retourne { entry, replaced: bool, dropped: bool } ; entry vaut null si la galerie est désactivée ou la feuille vide.
 */
export function hang(st, { strokes, title = 'Mon dessin', model = '', replaceId = '', now = Date.now() }) {
  if (!galleryOn(st)) return { entry: null, replaced: false, dropped: false };
  const s = compactStrokes(strokes);
  if (!s.length) return { entry: null, replaced: false, dropped: false };
  st.galerie = Array.isArray(st.galerie) ? st.galerie : [];
  const old = replaceId ? st.galerie.findIndex((e) => e.id === replaceId) : -1;
  if (old >= 0) {
    const entry = { ...st.galerie[old], title, m: model, s };
    st.galerie[old] = entry;
    return { entry, replaced: true, dropped: false };
  }
  const entry = { id: `d${now.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, t: now, m: model, title, s };
  st.galerie.push(entry);
  let dropped = false;
  while (st.galerie.length > MAX_DESSINS) { st.galerie.shift(); dropped = true; }
  return { entry, replaced: false, dropped };
}

export function unhang(st, id) {
  const n = (st.galerie || []).length;
  st.galerie = (st.galerie || []).filter((e) => e.id !== id);
  return st.galerie.length < n;
}
export function clearGallery(st) { st.galerie = []; }

/** Le dessin en SVG (fond crème), à insérer tel quel : couleurs et chemins sont revalidés. */
export function drawingSVG(e, { cls = '' } = {}) {
  const strokes = (e.s || []).filter(validStroke).map((s) => `<path d="${s.d}" fill="none" stroke="${s.c}" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<svg class="${cls}" viewBox="0 0 10 7" role="img" aria-label="${String(e.title || 'Dessin').replace(/[<>&"]/g, '')}"><rect width="10" height="7" rx="0.32" fill="#FFFDF7"/>${strokes}</svg>`;
}

/** Titre du dessin d'après l'idée proposée (« la maison de Renard » → « La maison de Renard »). */
export function titleFor(phrase) {
  const p = String(phrase || '').replace(/^ton /, 'mon ').replace(/^ta /, 'ma ').trim();
  return p ? p[0].toUpperCase() + p.slice(1) : 'Mon dessin';
}
