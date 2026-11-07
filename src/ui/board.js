// Le cahier à écrire : dessin des lignes Seyes, du guide, démonstration animée,
// capture du geste (doigt ou stylet) et petits effets. Ne connaît ni la pédagogie ni le score.
import { BOARD } from '../core/board.js';
import { strokeToSvgPath } from '../core/template.js';
import { dist, polyLength, pointAt } from '../engine/geometry.js';
import { sleep } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent?.append(n);
  return n;
};
const fmt = (n) => Math.round(n * 1000) / 1000;

function smoothD(pts) {
  if (!pts.length) return '';
  if (pts.length < 3) return `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}` + pts.slice(1).map((p) => ` L ${fmt(p.x)} ${fmt(p.y)}`).join('') + (pts.length === 1 ? ' l 0.001 0' : '');
  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${fmt(pts[i].x)} ${fmt(pts[i].y)} ${fmt(mx)} ${fmt(my)}`;
  }
  const l = pts[pts.length - 1];
  return d + ` L ${fmt(l.x)} ${fmt(l.y)}`;
}

export class Board {
  /**
   * @param host     élément conteneur
   * @param template gabarit (voir core/template.js)
   * @param hooks    { onStrokeEnd(stroke), shouldHold(stroke) -> bool, onStrokeStart() }
   */
  constructor(host, template, hooks = {}) {
    this.host = host;
    this.tpl = template;
    this.hooks = hooks;
    this.enabled = false;
    this.penSeen = false;
    this.active = null; // { id, points, el, pointerType, lifts }
    this.hold = null; // { stroke, timer }
    this.demoToken = 0;
    this.inkEls = [];
    this.bd = template.board || BOARD;
    this.build();
  }

  build() {
    const { W, H, baseline } = this.bd;
    // Cadrage : on zoome sur la zone utile (lettres plus grandes = plus faciles à tracer pour de petites mains).
    // Le repère reste celui du cahier ; seul le viewBox change, la conversion des points passe par getScreenCTM.
    const bb = this.tpl.strokes.reduce((a, s) => ({ x0: Math.min(a.x0, s.bbox.x0), x1: Math.max(a.x1, s.bbox.x1), y0: Math.min(a.y0, s.bbox.y0), y1: Math.max(a.y1, s.bbox.y1) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
    const yTop = Math.min(bb.y0, baseline - 3) - 0.5, yBot = Math.max(baseline + 0.7, bb.y1 + 0.5); // les jambages (g, p, y…) descendent sous la ligne
    const vw = Math.min(W, Math.max((yBot - yTop) / 0.7, bb.x1 - bb.x0 + 1.6)), vh = vw * 0.7;
    const vx = Math.max(0, Math.min(W - vw, (bb.x0 + bb.x1) / 2 - vw / 2));
    const vy = Math.max(0, Math.min(H - vh, (yTop + yBot) / 2 - vh / 2));
    const svg = el('svg', { class: 'board', viewBox: `${vx.toFixed(3)} ${vy.toFixed(3)} ${vw.toFixed(3)} ${vh.toFixed(3)}`, role: 'img', 'aria-label': 'Cahier pour écrire' });
    svg.dataset.phase = '0';
    svg.style.setProperty('--k', String(Math.max(1, W / 12).toFixed(2))); // traits un peu plus épais quand le cahier est large
    this.svg = svg;
    el('rect', { class: 'paper', x: 0, y: 0, width: W, height: H, rx: 0.32 }, svg);
    const rules = el('g', { class: 'rules' }, svg);
    for (let y = 1; y < H; y++) {
      const k = baseline - y;
      el('line', { class: k === 0 ? 'r-base' : k === 2 || k === 3 ? 'r-main' : 'r-thin', x1: 0.25, x2: W - 0.25, y1: y, y2: y }, rules);
    }
    for (let x = 2; x < W; x += 2) el('line', { class: 'r-vert', x1: x, x2: x, y1: 0.3, y2: H - 0.3 }, rules);

    this.gGuide = el('g', { class: 'guide' }, svg);
    this.gModel = el('g', { class: 'model' }, svg);
    this.gDemo = el('g', { class: 'demo' }, svg);
    this.gInk = el('g', { class: 'ink' }, svg);
    this.gFx = el('g', { class: 'fx' }, svg);

    this.tpl.strokes.forEach((s, i) => {
      // Deux traits qui partent du même point (5, E, F, B, P…) : la pastille du second ne s'affiche que quand c'est son tour.
      const partage = this.tpl.strokes.slice(0, i).some((o) => Math.hypot(o.start.x - s.start.x, o.start.y - s.start.y) < 0.35);
      const g = el('g', { class: `gs future${partage ? ' shared' : ''}`, 'data-i': i }, this.gGuide);
      if (s.kind === 'dot') {
        el('circle', { class: 'road dotroad', cx: s.start.x, cy: s.start.y, r: 0.42 }, g);
      } else {
        const d = strokeToSvgPath(s, 3);
        el('path', { class: 'road', d }, g);
        el('path', { class: 'center', d }, g);
        const arrows = el('g', { class: 'arrows' }, g);
        for (let a = 0.9; a < s.length - 0.5; a += 1.7) {
          const p = pointAt(s.pts, a);
          el('path', { d: 'M -0.17 -0.15 L 0.1 0 L -0.17 0.15', transform: `translate(${fmt(p.x)} ${fmt(p.y)}) rotate(${fmt((p.angle * 180) / Math.PI)})` }, arrows);
        }
      }
      const st = el('g', { class: 'start' }, g);
      el('circle', { class: 'pulse', cx: s.start.x, cy: s.start.y, r: 0.3 }, st);
      el('circle', { class: 'sdot', cx: s.start.x, cy: s.start.y, r: 0.2 }, st);
      if (this.tpl.strokes.length > 1) {
        const t = el('text', { class: 'snum', x: s.start.x, y: s.start.y + 0.09, 'text-anchor': 'middle' }, st);
        t.textContent = String(i + 1);
      }
      // modèle (affiché brièvement après un essai)
      const m = s.kind === 'dot'
        ? el('circle', { cx: s.start.x, cy: s.start.y, r: 0.2 }, this.gModel)
        : el('path', { d: strokeToSvgPath(s, 3) }, this.gModel);
      m.setAttribute('class', 'm-shape');
    });

    this.host.replaceChildren(svg);
    svg.addEventListener('pointerdown', (e) => this.down(e));
    svg.addEventListener('pointermove', (e) => this.move(e));
    svg.addEventListener('pointerup', (e) => this.up(e));
    svg.addEventListener('pointercancel', (e) => this.up(e));
    svg.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setPhase(p) { this.svg.dataset.phase = String(p); }

  /** current : indice du trait attendu ; done : nombre de traits déjà réussis. */
  setProgress(current, done) {
    this.svg.querySelectorAll('.gs').forEach((g) => {
      const i = +g.dataset.i;
      g.classList.toggle('done', i < done);
      g.classList.toggle('current', i === current);
      g.classList.toggle('future', i > current);
    });
  }

  enable(on) { this.enabled = on; this.svg.classList.toggle('locked', !on); }

  clearInk() {
    this.cancelHold();
    this.gInk.replaceChildren();
    this.inkEls = [];
    this.active = null;
  }

  removeInk(node) { node?.remove(); this.inkEls = this.inkEls.filter((n) => n !== node); }

  toBoard(e) {
    const m = this.svg.getScreenCTM();
    if (!m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: Math.max(-0.2, Math.min(this.bd.W + 0.2, pt.x)), y: Math.max(-0.2, Math.min(this.bd.H + 0.2, pt.y)), t: performance.now() };
  }

  down(e) {
    if (!this.enabled || this.active) return;
    if (e.pointerType === 'pen') this.penSeen = true;
    if (this.penSeen && e.pointerType === 'touch') return; // paume ignorée quand un stylet est utilisé
    e.preventDefault();
    const p = this.toBoard(e);
    if (!p) return;
    this.hooks.onStrokeStart?.(e.pointerType);
    try { this.svg.setPointerCapture(e.pointerId); } catch { /* ok */ }
    // reprise d'un trait interrompu (l'enfant a levé le doigt trop tôt)
    if (this.hold && dist(p, this.hold.stroke.points[this.hold.stroke.points.length - 1]) < 1.6) {
      const s = this.hold.stroke;
      this.cancelHold();
      s.lifts++;
      s.points.push(p);
      this.active = { ...s, id: e.pointerId };
      this.active.ref = s;
      return;
    }
    this.cancelHold();
    const path = el('path', { class: 'ink-path' }, this.gInk);
    this.inkEls.push(path);
    const s = { id: e.pointerId, points: [p], el: path, pointerType: e.pointerType, lifts: 0 };
    s.ref = s;
    this.active = s;
    path.setAttribute('d', smoothD(s.points));
  }

  move(e) {
    const a = this.active;
    if (!a || e.pointerId !== a.id) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs.length ? evs : [e]) {
      const p = this.toBoard(ev);
      if (p) a.points.push(p);
    }
    a.el.setAttribute('d', smoothD(a.points));
  }

  up(e) {
    const a = this.active;
    if (!a || e.pointerId !== a.id) return;
    this.active = null;
    try { this.svg.releasePointerCapture(e.pointerId); } catch { /* ok */ }
    const stroke = a.ref; // l'objet persistant (points partagés)
    const last = this.toBoard(e);
    if (last) a.points.push(last);
    stroke.points = a.points;
    if (stroke.points.length < 2 || (stroke.points.length < 3 && !this.hooks.allowTap?.())) { this.removeInk(stroke.el); return; }
    if (this.hooks.shouldHold?.(stroke)) {
      this.hold = { stroke, timer: setTimeout(() => { const s = this.hold?.stroke; this.hold = null; if (s) this.hooks.onStrokeEnd?.(s); }, 1100) };
    } else {
      this.hooks.onStrokeEnd?.(stroke);
    }
  }

  cancelHold() { if (this.hold) { clearTimeout(this.hold.timer); this.hold = null; } }

  // ---------- Démonstration animée ----------
  cancelDemo() { this.demoToken++; this.gDemo.replaceChildren(); this.svg.classList.remove('demoing'); }

  async playDemo() {
    const token = ++this.demoToken;
    const alive = () => token === this.demoToken;
    this.gDemo.replaceChildren();
    this.svg.classList.add('demoing');
    for (const s of this.tpl.strokes) {
      if (!alive()) return;
      if (s.kind === 'dot') {
        const c = el('circle', { class: 'demo-dot', cx: s.start.x, cy: s.start.y, r: 0.2 }, this.gDemo);
        c.style.animation = 'demo-pop .5s ease-out both';
        await sleep(600);
        continue;
      }
      const path = el('path', { class: 'demo-path' }, this.gDemo);
      const pen = el('g', { class: 'demo-pen' }, this.gDemo);
      el('path', { d: 'M0 0 L0.3 -0.16 L0.16 -0.3Z', fill: '#E8C69C' }, pen);
      el('path', { d: 'M0 0 L0.09 -0.05 L0.05 -0.09Z', fill: '#3A2216' }, pen);
      el('path', { d: 'M0.16 -0.3 L0.3 -0.16 L1.25 -1.1 L1.1 -1.25Z', fill: '#F2C14E' }, pen);
      el('path', { d: 'M1.1 -1.25 L1.25 -1.1 L1.38 -1.23 L1.23 -1.38Z', fill: '#EE8A97' }, pen);
      const pts = s.pts, L = s.length;
      const dur = Math.max(900, Math.min(3600, (L / 3.0) * 1000));
      const t0 = performance.now();
      await new Promise((resolve) => {
        const frame = (now) => {
          if (!alive()) return resolve();
          const k = Math.min(1, (now - t0) / dur);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const sLen = e * L;
          const p = pointAt(pts, sLen);
          // polyligne jusqu'à sLen
          let acc = 0, d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
          for (let i = 1; i < pts.length; i++) {
            acc += dist(pts[i - 1], pts[i]);
            if (acc > sLen) break;
            if (i % 2 === 0) d += ` L ${fmt(pts[i].x)} ${fmt(pts[i].y)}`;
          }
          d += ` L ${fmt(p.x)} ${fmt(p.y)}`;
          path.setAttribute('d', d);
          pen.setAttribute('transform', `translate(${fmt(p.x)} ${fmt(p.y)})`);
          if (k < 1) requestAnimationFrame(frame); else resolve();
        };
        requestAnimationFrame(frame);
      });
      pen.remove();
      await sleep(350);
    }
    if (!alive()) return;
    await sleep(500);
    if (!alive()) return;
    this.gDemo.classList.add('fade');
    await sleep(450);
    if (!alive()) return;
    this.gDemo.classList.remove('fade');
    this.cancelDemo();
  }

  // ---------- Retours visuels ----------
  markInk(node, stars) {
    if (!node) return;
    node.classList.add(stars >= 2 ? 'good' : stars === 1 ? 'meh' : 'miss');
  }

  showModel(ms = 1800) {
    this.svg.classList.add('show-model');
    clearTimeout(this.modelTimer);
    this.modelTimer = setTimeout(() => this.svg.classList.remove('show-model'), ms);
  }

  burst(x, y, n = 12) {
    const g = el('g', { class: 'burst' }, this.gFx);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4, r = 0.9 + Math.random() * 1.1;
      const c = el('path', { class: 'bst', d: 'M0 -0.2 L0.06 -0.06 L0.2 0 L0.06 0.06 L0 0.2 L-0.06 0.06 L-0.2 0 L-0.06 -0.06Z', transform: `translate(${fmt(x)} ${fmt(y)})` }, g);
      c.style.setProperty('--dx', fmt(Math.cos(a) * r));
      c.style.setProperty('--dy', fmt(Math.sin(a) * r));
      c.style.fill = ['#FFD25A', '#F08A24', '#7ED6A5', '#8FB7F0'][i % 4];
    }
    setTimeout(() => g.remove(), 1100);
  }

  lastInkPoint() {
    const n = this.inkEls[this.inkEls.length - 1];
    return n ? n.getPointAtLength(n.getTotalLength()) : { x: this.bd.W / 2, y: this.bd.H / 2 };
  }

  destroy() { this.demoToken++; this.cancelHold(); clearTimeout(this.modelTimer); }
}
