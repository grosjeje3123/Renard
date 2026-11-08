// Tableau libre : reconnaissance de ce que l'enfant écrit (félicitations), majuscules, calque posé sur la bonne ligne.
import test from 'node:test';
import assert from 'node:assert/strict';
import { calque, checkRow, cased, expectedStrokes, rowOf, page, fits, CASSES, TABLEAU } from '../src/core/tableau.js';
import { MAJUSCULES } from '../src/content/majuscules.js';
import { SKILLS, ECRITURE, composeText } from '../src/content/skills.js';
import { buildTemplate } from '../src/core/template.js';

/** Un enfant qui écrit le calque : le tracé du gabarit, un peu tremblé, décalé, parfois dans le désordre. */
function child(text, mode, baseline, { dx = 0, dy = 0, wobble = 0.07, seed = 1, shuffle = false, drop = -1 } = {}) {
  const c = calque(text, baseline, mode);
  let strokes = c.tpl.map((s, k) => {
    if (s.kind === 'dot') return { pts: [{ x: s.start.x + dx + 0.05, y: s.start.y + dy - 0.04 }] };
    const pts = s.pts.filter((_, i) => i % 2 === 0).map((p, i) => ({ x: p.x + dx + wobble * Math.sin(i * 0.9 + seed + k), y: p.y + dy + wobble * Math.cos(i * 1.1 + seed * 2 + k) }));
    return { pts };
  });
  if (drop >= 0) strokes = strokes.filter((_, i) => i !== drop);
  if (shuffle) strokes = strokes.slice().reverse();
  return strokes;
}
const base = TABLEAU.rows[1];
const run = (text, mode, strokes, phase = 1, boardW = TABLEAU.W) => checkRow({ text, mode, baseline: base, strokes, phase, boardW });

test('tableau : « Casse » : minuscules, MAJUSCULES, majuscule au début', () => {
  assert.equal(cased('Léa-Rose', 'min'), 'lea rose');
  assert.equal(cased('Léa-Rose', 'maj'), 'LEA ROSE');
  assert.equal(cased('Léa', 'debut'), 'Lea');
  assert.deepEqual(CASSES.map((c) => c.id), ['min', 'maj', 'debut']);
});

test('tableau : les 26 majuscules existent, tiennent sur 3 interlignes et se composent avec les minuscules', () => {
  assert.equal(Object.keys(MAJUSCULES).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  for (const mode of ['maj', 'debut']) {
    const c = calque('abcdefghijklmnopqrstuvwxyz', base, mode);
    assert.ok(c.tpl.length >= 26, `${mode} : ${c.tpl.length} traits`);
  }
  // une majuscule monte à la ligne de 3 interlignes
  const top = (t) => Math.min(...calque(t, base, 'maj').tpl.map((s) => s.bbox.y0));
  for (const l of 'ABEHKLMNTVXZ') assert.ok(Math.abs(base - top(l.toLowerCase()) - 3) < 0.08, `${l} monte de ${(base - top(l.toLowerCase())).toFixed(2)}`);
  // les majuscules sont plus larges : moins de lettres tiennent sur la page
  assert.ok(calque('lea', base, 'maj').width > calque('lea', base, 'min').width * 0.9);
});

test('tableau : le calque d\'un texte large reste posé sur sa ligne d\'écriture (la page ne le décale pas)', () => {
  for (const [text, mode] of [['le chat dort', 'min'], ['le chat dort', 'maj'], ['il a un chien', 'debut']]) {
    const c = calque(text, base, mode);
    if (!fits(text, mode)) continue;
    const foot = Math.max(...c.tpl.filter((s) => s.kind === 'path').map((s) => s.bbox.y1));
    assert.ok(foot >= base - 0.1 && foot <= base + 2.1, `${text} (${mode}) : le pied est à ${(foot - base).toFixed(2)} de la ligne`);
    const head = Math.min(...c.tpl.map((s) => s.bbox.y0));
    assert.ok(head >= base - 3.2, `${text} (${mode}) : la tête dépasse (${(base - head).toFixed(2)})`);
  }
});

test('tableau : un mot bien écrit est reconnu, à n\'importe quel endroit de la rangée et dans le désordre', () => {
  for (const [text, mode] of [['lea', 'min'], ['papa', 'min'], ['soleil', 'min'], ['LEA', 'maj'], ['lea', 'debut'], ['chat', 'maj']]) {
    for (const [phase, o] of [[0, { dx: 0 }], [1, { dx: 2.6, seed: 2 }], [2, { dx: -0.5, dy: 0.12, seed: 3, shuffle: true }]]) {
      const r = run(text, mode, child(text, mode, base, o), phase);
      assert.ok(r.ok && r.stars >= 2, `${text} (${mode}, phase ${phase}) : ${r.stars} étoiles, score ${r.score.toFixed(2)} ${r.tags}`);
    }
  }
});

test('tableau : un mot écrit plus petit ou plus grand que le calque est reconnu aussi', () => {
  const text = 'chat', c = calque(text, base, 'min'), x0 = c.bbox.x0;
  for (const k of [0.7, 0.85, 1.3, 1.5]) {
    const strokes = c.tpl.map((s) => ({ pts: (s.kind === 'dot' ? [s.start] : s.pts.filter((_, i) => i % 2 === 0)).map((p) => ({ x: x0 + (p.x - x0) * k, y: base + (p.y - base) * k })) }));
    const r = run(text, 'min', strokes, 2);
    assert.ok(r.ok, `échelle ${k} : ${r.stars} étoiles (${r.score.toFixed(2)})`);
  }
});

test('tableau : une phrase large est reconnue aussi (page agrandie)', () => {
  const text = 'le chat dort';
  assert.ok(fits(text));
  const pg = page(calque(text).width);
  const r = run(text, 'min', child(text, 'min', base, { dx: 1, seed: 4 }), 1, pg.W);
  assert.ok(r.ok, `phrase : ${r.stars} étoiles, score ${r.score.toFixed(2)} ${r.tags}`);
});

test('tableau : un mot incomplet, un autre mot ou un gribouillis ne sont pas félicités', () => {
  const text = 'lea';
  const n = expectedStrokes(text);
  // il manque une lettre
  const r1 = run(text, 'min', child(text, 'min', base, { drop: 0 }));
  assert.ok(!r1.ok && r1.tags.includes('trait-manquant'), `manque une lettre : ${r1.tags}`);
  // un autre mot (même nombre de lettres) : « lia » ≠ « lea »
  const other = child('mia', 'min', base);
  const r2 = run(text, 'min', other);
  assert.ok(!r2.ok, `un autre mot : ${r2.stars} étoiles`);
  // un gribouillis : autant de traits que de traits attendus, tracés en zigzag
  const scribble = Array.from({ length: n }, (_, k) => ({ pts: Array.from({ length: 24 }, (_, i) => ({ x: 2 + k * 1.2 + (i % 2 ? 1.1 : -1.1), y: base - 2 + (i % 3) * 0.9 })) }));
  const r3 = run(text, 'min', scribble);
  assert.ok(!r3.ok, `gribouillis : ${r3.stars} étoiles`);
  // rien du tout
  assert.ok(!run(text, 'min', []).ok);
});

test('tableau : le point d\'un i oublié ne bloque pas, mais un trait de lettre manquant oui', () => {
  const text = 'il';
  const full = child(text, 'min', base);
  const dotIdx = calque(text, base).tpl.findIndex((s) => s.kind === 'dot');
  assert.ok(dotIdx >= 0);
  const noDot = run(text, 'min', child(text, 'min', base, { drop: dotIdx }));
  assert.ok(noDot.tags.every((t) => t !== 'trait-manquant'), 'sans le point, le mot est encore évalué');
  assert.ok(run(text, 'min', full).ok);
});

test('tableau : les traits se rangent par rangée', () => {
  const rows = page(0).rows;
  const at = (b) => [{ x: 3, y: b - 1 }, { x: 4, y: b - 1.5 }];
  rows.forEach((b, i) => assert.equal(rowOf(rows, at(b)), i));
});

test('tableau : la page s’adapte à la place — rangées entières, jamais de ligne coupée, rapport d’origine par défaut', () => {
  const base = page(0);
  assert.deepEqual(page(0, 0.7), base, 'sans demande particulière, la page d’origine (3 rangées pour 18 de large)');
  assert.equal(base.rows.length, 3);
  const tall = page(0, 0.92);
  assert.equal(tall.W, 18);
  assert.equal(tall.rows.length, 4, 'un écran plus haut reçoit une rangée de plus');
  assert.ok(tall.H + 1e-9 >= tall.rows.at(-1) + 1.4, 'la dernière rangée tient dans la page');
  assert.ok(tall.H / tall.W <= 0.92 + 0.04, 'la page ne dépasse pas le rapport offert');
  // les trois premières rangées (calques) ne bougent pas
  assert.deepEqual(tall.rows.slice(0, 3), base.rows);
  // un texte long agrandit la page ; demander un rapport plus petit que l’origine ne la rend jamais plus plate
  const long = page(28, 0.5);
  assert.ok(long.H >= Math.ceil(long.W * 0.7), 'jamais plus plate que le rapport d’origine');
  for (const r of [0.7, 0.8, 0.92, 1, 1.1]) for (const w of [0, 12, 20, 30]) {
    const p = page(w, r);
    assert.ok(p.rows.every((b) => b + 1.4 <= p.H + 1e-9), `rangées dans la page (largeur ${w}, rapport ${r})`);
  }
});

// ---------- Majuscules droites, lettres revues (retour du 6 novembre) ----------
const tplOf = (text) => buildTemplate({ id: 't', kind: 'word', strokes: composeText(text, { skills: ECRITURE }) });

test('majuscules : droites (pas penchées), alors que les minuscules cursives restent inclinées', () => {
  const I = tplOf('I').strokes[0];
  assert.ok(I.bbox.w < 0.01 && I.bbox.h > 2.9, `le I est une barre verticale (${I.bbox.w.toFixed(3)} × ${I.bbox.h.toFixed(2)})`);
  const H = tplOf('H').strokes;
  assert.ok(H[0].bbox.w < 0.01 && H[1].bbox.w < 0.01, 'les deux montants du H sont droits');
  // une majuscule composée avec des minuscules reste droite, la minuscule suivante reste penchée
  const Hi = tplOf('Hi').strokes;
  assert.ok(Hi[0].bbox.w < 0.01 && Hi[1].bbox.w < 0.01, 'le H de « Hi » est droit');
  const i = tplOf('i').strokes[0];
  assert.ok(i.bbox.w > 0.3, `le i cursif garde son inclinaison (${i.bbox.w.toFixed(2)})`);
});

test('majuscules : l\'espace entre deux majuscules est le même qu\'entre deux lettres, sans chevauchement', () => {
  for (const w of ['HI', 'AB', 'LO', 'TO']) {
    const t = tplOf(w);
    const a = t.strokes[0].bbox, all = t.strokes.map((s) => s.bbox);
    const gaps = [];
    // première lettre = ses traits ; on compare le début de la deuxième lettre à la fin de la première
    const n = MAJUSCULES[w[0]].length;
    const left = Math.max(...all.slice(0, n).map((b) => b.x1)), right = Math.min(...all.slice(n).map((b) => b.x0));
    gaps.push(right - left);
    assert.ok(gaps[0] > 0.4 && gaps[0] < 0.8, `${w} : écart ${gaps[0].toFixed(2)}`);
    assert.ok(a.x0 >= 0, 'dans la page');
  }
});

test('lettres d\'après l\'alphabet de la classe : attaque courte, e avec sa barre, r à toit plat, x en deux c, z qui part du haut, boucles hautes étroites', () => {
  const body = (id) => buildTemplate(SKILLS[id]);
  const base = (t) => t.board.baseline;
  const up = (t, y) => base(t) - y; // hauteur au-dessus de la ligne d'écriture
  // les lettres qui montent partent un peu au-dessus de la ligne (petite attaque), pas de la ligne elle-même
  for (const id of 'ijnmpuy') {
    const t = body(id), h = up(t, t.strokes[0].start.y);
    assert.ok(h > 0.6 && h < 1.3, `${id} : petite attaque (départ à ${h.toFixed(2)})`);
  }
  // e : on part du milieu (la barre), pas du bas
  const e = body('e'), he = up(e, e.strokes[0].start.y);
  assert.ok(he > 0.8 && he < 1.4, `e : départ sur la barre (${he.toFixed(2)})`);
  // z : tout en haut à gauche, avec la barre du haut puis le jambage sous la ligne
  const z = body('z'), zs = z.strokes[0];
  assert.ok(up(z, zs.start.y) > 1.2, `le z commence en haut (${up(z, zs.start.y).toFixed(2)})`);
  assert.ok(up(z, zs.bbox.y0) >= 1.85, 'la barre du z est à la hauteur des petites lettres');
  assert.ok(zs.bbox.y1 - base(z) > 1.4, 'le z descend sous la ligne');
  // r : un seul trait, qui finit sur la ligne (toit plat + jambe)
  const r = body('r');
  assert.equal(r.strokes.length, 1);
  assert.ok(up(r, r.strokes[0].end.y) < 0.5, 'la jambe du r rejoint la ligne');
  // x : « c à l'envers » puis « c » : deux traits qui se touchent au milieu
  const x = body('x');
  assert.equal(x.strokes.length, 2);
  const [x1, x2] = x.strokes.map((s) => s.bbox);
  assert.ok(x1.x0 < x2.x0 && x1.x1 > x2.x0 && x2.x1 > x1.x1, 'le premier trait est à gauche, le second à droite, et ils se recouvrent un peu au milieu');
  // largeur de la boucle du haut : tracé entre 2,3 et 3 interlignes au-dessus de la ligne : étroite et allongée, comme au tableau
  const loopWidth = (id) => {
    const t = body(id), pts = t.strokes[0].pts.filter((p) => base(t) - p.y >= 2.3);
    return Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
  };
  for (const id of ['l', 'h', 'b', 'f', 'k']) assert.ok(loopWidth(id) >= 0.5 && loopWidth(id) <= 1.3, `${id} : boucle haute (${loopWidth(id).toFixed(2)})`);
});
