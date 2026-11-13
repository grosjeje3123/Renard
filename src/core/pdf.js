// Mise en page de fiches imprimables : une liste de dessins (lignes, textes, cercles, images) en millimètres,
// rendue en PDF (A4, polices standard, aucun serveur) ou en SVG (aperçu à l'écran). Aucune dépendance.
// Origine en haut à gauche, y vers le bas ; les tailles de texte sont en points.

export const A4 = { w: 210, h: 297 };
const PT = 72 / 25.4;
const n2 = (v) => String(Math.round(v * 100) / 100);

// Largeurs des caractères ASCII 32 à 126 pour Helvetica (1/1000 d'em), pour couper les lignes de texte.
const REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, ...Array(10).fill(556), 278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, ...Array(10).fill(556), 333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
export const WIDTHS = { REG, BOLD };

const WIN = { '’': 0x92, '‘': 0x91, '“': 0x93, '”': 0x94, '…': 0x85, '–': 0x96, '—': 0x97, 'œ': 0x9c, 'Œ': 0x8c, '€': 0x80, '•': 0x95 };
const clean = (s) => String(s).replace(/[  ]/g, ' ');
const winBytes = (s) => [...clean(s)].map((ch) => WIN[ch] ?? (ch.codePointAt(0) < 256 ? ch.codePointAt(0) : 63));

/** Largeur d'un texte en millimètres. */
export function textWidth(str, size, bold = false) {
  const tab = bold ? BOLD : REG;
  let w = 0;
  for (const ch of clean(str)) {
    let c = ch.codePointAt(0);
    if (c < 32 || c > 126) { const base = ch.normalize('NFD')[0]; c = base ? base.codePointAt(0) : 63; }
    w += c >= 32 && c <= 126 ? tab[c - 32] : 556;
  }
  return (w / 1000) * size / PT;
}

/** Coupe un texte en lignes qui tiennent dans maxW millimètres. */
export function wrapText(str, maxW, size, bold = false) {
  const lines = [];
  let cur = '';
  for (const word of clean(str).split(/\s+/).filter(Boolean)) {
    const test = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(test, size, bold) > maxW) { lines.push(cur); cur = word; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

const rgb = (hex) => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
};

export class Page {
  constructor(w = A4.w, h = A4.h) { this.w = w; this.h = h; this.ops = []; }
  line(x1, y1, x2, y2, o = {}) { return this.poly([[x1, y1], [x2, y2]], o); }
  /** Trait : points [[x,y]…], options { w, color, dash:[a,b], fill, close, cap:'round'|'butt' } */
  poly(pts, o = {}) { this.ops.push({ t: 'poly', pts, w: 0.3, color: '#000000', ...o }); return this; }
  rect(x, y, w, h, o = {}) { this.ops.push({ t: 'rect', x, y, w, h, lw: 0.3, ...o }); return this; }
  circle(x, y, r, o = {}) { this.ops.push({ t: 'circle', x, y, r, lw: 0.3, ...o }); return this; }
  /** Texte sur la ligne de base y. align : 'left' | 'center' | 'right'. */
  text(str, x, y, o = {}) { this.ops.push({ t: 'text', str, x, y, size: 11, color: '#000000', align: 'left', ...o }); return this; }
  /** Paragraphe : retourne l'ordonnée suivante. */
  para(str, x, y, maxW, o = {}) {
    const size = o.size || 11, lh = o.lh || (size / PT) * 1.35;
    for (const l of wrapText(str, maxW, size, o.bold)) { this.text(l, x, y, o); y += lh; }
    return y;
  }
  /** Image vectorielle (chaîne SVG complète), rastérisée à l'export PDF. */
  svg(svg, x, y, w, h) { this.ops.push({ t: 'svg', svg, x, y, w, h }); return this; }
}

// ---------- PDF ----------
const bin = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 255);

function content(page, images) {
  const Y = (y) => n2((page.h - y) * PT);
  const X = (x) => n2(x * PT);
  const out = [];
  for (const o of page.ops) {
    if (o.t === 'poly') {
      if (!o.pts.length) continue;
      const dash = o.dash ? `[${o.dash.map((d) => n2(d * PT)).join(' ')}] 0 d` : '[] 0 d';
      const cap = o.cap === 'round' || (o.dash && o.dash[0] < 0.1) ? 1 : 0;
      const [r, g, b] = rgb(o.color);
      let s = `q ${n2(o.w * PT)} w ${cap} J 1 j ${dash} ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n`;
      if (o.fill) { const [fr, fg, fb] = rgb(o.fill); s += `${fr.toFixed(3)} ${fg.toFixed(3)} ${fb.toFixed(3)} rg\n`; }
      s += o.pts.map((p, i) => `${X(p[0])} ${Y(p[1])} ${i ? 'l' : 'm'}`).join('\n') + '\n';
      s += `${o.close || o.fill ? 'h ' : ''}${o.fill ? (o.color && !o.noStroke ? 'B' : 'f') : 'S'}\nQ`;
      out.push(s);
    } else if (o.t === 'rect') {
      const [r, g, b] = rgb(o.color || '#000000');
      let s = `q ${n2(o.lw * PT)} w ${o.dash ? `[${o.dash.map((d) => n2(d * PT)).join(' ')}] 0 d` : '[] 0 d'} ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n`;
      if (o.fill) { const [fr, fg, fb] = rgb(o.fill); s += `${fr.toFixed(3)} ${fg.toFixed(3)} ${fb.toFixed(3)} rg\n`; }
      s += `${X(o.x)} ${Y(o.y + o.h)} ${n2(o.w * PT)} ${n2(o.h * PT)} re ${o.fill && o.color ? 'B' : o.fill ? 'f' : 'S'}\nQ`;
      out.push(s);
    } else if (o.t === 'circle') {
      const k = 0.5523 * o.r, cx = o.x, cy = o.y, r = o.r;
      const P = (x, y) => `${X(x)} ${Y(y)}`;
      const [sr, sg, sb] = rgb(o.color || '#000000');
      let s = `q ${n2(o.lw * PT)} w [] 0 d ${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG\n`;
      if (o.fill) { const [fr, fg, fb] = rgb(o.fill); s += `${fr.toFixed(3)} ${fg.toFixed(3)} ${fb.toFixed(3)} rg\n`; }
      s += `${P(cx + r, cy)} m ${P(cx + r, cy + k)} ${P(cx + k, cy + r)} ${P(cx, cy + r)} c ${P(cx - k, cy + r)} ${P(cx - r, cy + k)} ${P(cx - r, cy)} c `
        + `${P(cx - r, cy - k)} ${P(cx - k, cy - r)} ${P(cx, cy - r)} c ${P(cx + k, cy - r)} ${P(cx + r, cy - k)} ${P(cx + r, cy)} c h ${o.fill ? (o.color ? 'B' : 'f') : 'S'}\nQ`;
      out.push(s);
    } else if (o.t === 'text') {
      const w = textWidth(o.str, o.size, o.bold);
      const x = o.align === 'center' ? o.x - w / 2 : o.align === 'right' ? o.x - w : o.x;
      const [r, g, b] = rgb(o.color);
      const hex = winBytes(o.str).map((c) => c.toString(16).padStart(2, '0')).join('');
      out.push(`BT /${o.bold ? 'F2' : 'F1'} ${n2(o.size)} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${X(x)} ${Y(o.y)} Td <${hex}> Tj ET`);
    } else if (o.t === 'svg') {
      const name = images.get(o);
      if (name) out.push(`q ${n2(o.w * PT)} 0 0 ${n2(o.h * PT)} ${X(o.x)} ${Y(o.y + o.h)} cm /${name} Do Q`);
    }
  }
  return out.join('\n');
}

async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Assemble le PDF. `raster(svg, px)` doit retourner { w, h, rgb:Uint8Array } (fournie par le navigateur) ;
 * sans elle, les images vectorielles sont ignorées.
 */
export async function toPDF(pages, { title = 'Renard', raster = null } = {}) {
  const chunks = [];
  let len = 0;
  const offsets = [];
  const push = (x) => { const b = typeof x === 'string' ? bin(x) : x; chunks.push(b); len += b.length; };
  const startObj = (id) => { offsets[id] = len; push(`${id} 0 obj\n`); };

  // numérotation : 1 catalogue, 2 pages, 3-4 polices, puis images, puis (page, contenu) par page
  let next = 5;
  const imgs = [];
  const pageImages = pages.map(() => new Map());
  if (raster) {
    for (let i = 0; i < pages.length; i++) {
      for (const o of pages[i].ops) {
        if (o.t !== 'svg') continue;
        const px = Math.round(Math.max(o.w, o.h) * 8); // ~200 ppp
        const img = await raster(o.svg, px);
        const id = next++;
        const flate = await deflate(img.rgb);
        imgs.push({ id, img, data: flate || img.rgb, flate: !!flate });
        pageImages[i].set(o, `Im${id}`);
      }
    }
  }
  const pageIds = pages.map(() => { const p = next++; const c = next++; return { p, c }; });

  push('%PDF-1.4\n%âãÏÓ\n');
  startObj(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObj(2); push(`<< /Type /Pages /Kids [${pageIds.map((x) => `${x.p} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`);
  startObj(3); push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');
  startObj(4); push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');
  for (const { id, img, data, flate } of imgs) {
    startObj(id);
    push(`<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8${flate ? ' /Filter /FlateDecode' : ''} /Length ${data.length} >>\nstream\n`);
    push(data); push('\nendstream\nendobj\n');
  }
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i], { p, c } = pageIds[i];
    const stream = content(page, pageImages[i]);
    const xo = [...pageImages[i].values()].map((nm) => `/${nm} ${nm.slice(2)} 0 R`).join(' ');
    startObj(p);
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(page.w * PT)} ${n2(page.h * PT)}] /Contents ${c} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xo ? ` /XObject << ${xo} >>` : ''} >> >>\nendobj\n`);
    startObj(c);
    const raw = bin(stream);
    const z = await deflate(raw); // les lignes Seyès pèsent lourd : le contenu est compressé quand l'appareil sait le faire
    const body = z || raw;
    push(`<< /Length ${body.length}${z ? ' /Filter /FlateDecode' : ''} >>\nstream\n`); push(body); push('\nendstream\nendobj\n');
  }
  const info = next++;
  startObj(info);
  push(`<< /Title <FEFF${[...title].map((ch) => ch.codePointAt(0).toString(16).padStart(4, '0')).join('')}> /Producer (Renard) >>\nendobj\n`);
  const xref = len;
  push(`xref\n0 ${info + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= info; id++) push(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(len);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

// ---------- SVG (aperçu à l'écran, mêmes dessins que le PDF) ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function toSVG(page) {
  const mm = (pt) => (pt / PT).toFixed(3);
  const dashAttr = (d) => (d ? ` stroke-dasharray="${d.map((x) => Math.max(x, 0.01)).join(' ')}"` : '');
  const body = page.ops.map((o) => {
    if (o.t === 'poly') {
      const cap = o.cap === 'round' || (o.dash && o.dash[0] < 0.1) ? 'round' : 'butt';
      return `<path d="${o.pts.map((p, i) => `${i ? 'L' : 'M'}${n2(p[0])} ${n2(p[1])}`).join('')}${o.close || o.fill ? 'Z' : ''}" fill="${o.fill || 'none'}" stroke="${o.fill && o.noStroke ? 'none' : o.color}" stroke-width="${o.w}" stroke-linecap="${cap}" stroke-linejoin="round"${dashAttr(o.dash)}/>`;
    }
    if (o.t === 'rect') return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${o.fill || 'none'}" stroke="${o.color || '#000'}" stroke-width="${o.lw}"${dashAttr(o.dash)}/>`;
    if (o.t === 'circle') return `<circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="${o.fill || 'none'}" stroke="${o.fill && !o.color ? 'none' : o.color || '#000'}" stroke-width="${o.lw}"/>`;
    if (o.t === 'text') return `<text x="${o.x}" y="${o.y}" font-size="${mm(o.size)}" font-weight="${o.bold ? 700 : 400}" fill="${o.color}" text-anchor="${o.align === 'center' ? 'middle' : o.align === 'right' ? 'end' : 'start'}" font-family="Helvetica, Arial, sans-serif">${esc(clean(o.str))}</text>`;
    if (o.t === 'svg') return `<image x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" href="data:image/svg+xml;utf8,${encodeURIComponent(o.svg)}"/>`;
    return '';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.w} ${page.h}" role="img" aria-label="Aperçu de la fiche"><rect width="${page.w}" height="${page.h}" fill="#fff"/>${body}</svg>`;
}
