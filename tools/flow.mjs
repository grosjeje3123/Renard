// Parcours de l'interface : pauses (suggestion, douce, limite du jour), choix de pause, mission cahier, dessin libre.
// Usage : node tools/flow.mjs <seed.json> [dist|www]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const SEED = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), PAGE = process.argv[3] || 'www';
const browser = await chromium.launch();
let fails = 0;
const check = (label, ok, info = '') => { console.log(`${ok ? 'OK  ' : 'ÉCHEC'} ${label}${info ? ' — ' + info : ''}`); if (!ok) fails++; };

const DESSINS_N = (await import(`${process.cwd()}/src/content/dessins.js`)).DESSINS.length;
async function open(mutate, route = 'accueil', viewport = { width: 1180, height: 820 }) {
  const st = JSON.parse(JSON.stringify(SEED));
  mutate?.(st);
  const ctx = await browser.newContext({ viewport, hasTouch: true });
  await ctx.addInitScript((j) => { if (!localStorage.getItem('renard-v1')) localStorage.setItem('renard-v1', j); }, JSON.stringify(st));
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(`file://${process.cwd()}/${PAGE}/index.html#${route}`);
  await page.waitForTimeout(700);
  return { page, ctx, errs, state: () => page.evaluate(() => JSON.parse(localStorage.getItem('renard-v1'))), hash: () => page.evaluate(() => location.hash) };
}
const buttons = (page, sel) => page.$$eval(sel, (a) => a.map((b) => b.textContent.trim()));
const day = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const clickText = (page, re, sel = 'button') => page.evaluate(([r, s]) => { const b = [...document.querySelectorAll(s)].find((x) => new RegExp(r).test(x.textContent)); if (b) b.click(); return !!b; }, [re, sel]);

// 1. Suggestion : le bouton devient « Pause », « Jouer quand même » relance et remet le compteur à zéro
{
  const s = await open((st) => { st.rest = { since: 17 * 60, at: Date.now(), sleepUntil: 0, overrideDay: '' }; });
  check('suggestion : le bouton principal propose la pause', /Pause/.test(await s.page.innerText('.btn-big')));
  check('suggestion : « Jouer quand même » est proposé', await clickText(s.page, 'Jouer quand même'));
  await s.page.waitForTimeout(700);
  check('suggestion : on repart sur un exercice', /#exercice-/.test(await s.hash()), await s.hash());
  const st = await s.state();
  check('suggestion : le compteur d’activité repart de zéro', st.rest.since < 60, `since=${st.rest.since}`);
  check('suggestion : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
  await s.ctx.close();
}
// 2. Pause : les trois choix
{
  const s = await open((st) => { st.rest = { since: 17 * 60, at: Date.now(), sleepUntil: 0, overrideDay: '' }; }, 'pause');
  const n = await s.page.$$eval('.pause-card', (a) => a.length);
  check('pause : trois choix', n === 3, `${n}`);
  await clickText(s.page, 'Bouger', '.pause-card');
  await s.page.waitForTimeout(400);
  check('pause : « Bouger » affiche un défi', await s.page.$eval('.move-panel', (e) => !e.hidden && e.textContent.length > 30));
  await clickText(s.page, 'Lire un animal', '.pause-card');
  await s.page.waitForTimeout(900);
  check('pause : « Lire un animal » ouvre une fiche', /#fiche-/.test(await s.hash()), await s.hash());
  const facts = await s.page.$$eval('.fact', (a) => a.length);
  check('fiche : 4 faits à lire', facts >= 4, `${facts}`);
  await clickText(s.page, 'J’ai fini');
  await s.page.waitForTimeout(800);
  check('fiche : « J’ai fini » revient à la pause', (await s.hash()) === '#pause', await s.hash());
  await clickText(s.page, 'Écrire sur le cahier', '.pause-card');
  await s.page.waitForTimeout(900);
  check('pause : « Écrire sur le cahier » ouvre la mission', /#cahier-/.test(await s.hash()), await s.hash());
  const before = await s.state();
  await clickText(s.page, 'J’ai essayé');
  await s.page.waitForTimeout(600);
  const after = await s.state();
  const id = (await s.hash()).replace('#cahier-', '');
  check('cahier : « J’ai essayé » est enregistré', (after.skills[id].paper?.n || 0) === ((before.skills[id]?.paper?.n) || 0) + 1, id);
  check('cahier : l’écran de félicitations apparaît', await s.page.$eval('.cah-done', (e) => !e.hidden));
  check('pause/cahier : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
  await s.ctx.close();
}
// 3. Pause douce : le renard dort, l'exercice est fermé, puis tout repart
{
  const s = await open((st) => { st.settings.pauseMode = 'douce'; st.rest = { since: 0, at: Date.now(), sleepUntil: Date.now() + 4000, overrideDay: '' }; }, 'exercice-o');
  await s.page.waitForTimeout(900);
  check('douce : un exercice pendant la sieste renvoie à la pause', (await s.hash()) === '#pause', await s.hash());
  check('douce : compte à rebours affiché', /sieste/.test(await s.page.innerText('.pause-status')), await s.page.innerText('.pause-status'));
  await s.page.waitForTimeout(4500);
  check('douce : à la fin, le renard est réveillé et un bouton ramène au jeu', await s.page.$eval('.pause-foot .btn-big', (e) => !e.hidden));
  check('douce : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
  await s.ctx.close();
}
// 4. Limite du jour : « à demain », levée par un adulte (appui long de 2 s)
{
  const s = await open((st) => { st.settings.pauseMode = 'limite'; st.settings.limiteMin = 30; st.usage[day()] = 31 * 60; }, 'exercice-o');
  await s.page.waitForTimeout(900);
  check('limite : l’exercice renvoie à la pause', (await s.hash()) === '#pause', await s.hash());
  check('limite : message « à demain »', /demain/.test(await s.page.innerText('.pause-status')));
  const b = await s.page.$('.hold'); const bb = await b.boundingBox();
  await s.page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await s.page.mouse.down();
  await s.page.waitForTimeout(800); await s.page.mouse.up(); await s.page.waitForTimeout(500);
  check('limite : un appui trop court ne lève rien', (await s.hash()) === '#pause');
  await s.page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await s.page.mouse.down();
  await s.page.waitForTimeout(2400); await s.page.mouse.up(); await s.page.waitForTimeout(900);
  check('limite : l’appui long de 2 s lève la limite pour la journée', (await s.hash()) === '#accueil', await s.hash());
  await s.page.evaluate(() => { location.hash = 'exercice-o'; }); await s.page.waitForTimeout(900);
  check('limite : l’exercice est de nouveau ouvert', /#exercice-o/.test(await s.hash()));
  check('limite : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
  await s.ctx.close();
}
// 5. Dessin libre : on dessine, on défait, on efface (avec confirmation)
{
  const s = await open(null, 'dessin');
  const box = await s.page.$eval('.draw-board', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const stroke = async (pts) => { await s.page.mouse.move(box.x + pts[0][0] * box.w, box.y + pts[0][1] * box.h); await s.page.mouse.down(); for (const p of pts) await s.page.mouse.move(box.x + p[0] * box.w, box.y + p[1] * box.h, { steps: 3 }); await s.page.mouse.up(); };
  await stroke([[0.2, 0.3], [0.5, 0.2], [0.8, 0.4]]);
  await clickText(s.page, '', '.swatch:nth-child(5)');
  await stroke([[0.2, 0.7], [0.5, 0.8], [0.8, 0.6]]);
  let n = await s.page.$$eval('.draw-board .ink path', (a) => a.length);
  check('dessin : deux traits dessinés', n === 2, `${n}`);
  // la feuille remplit la place libre (avant : 47 % de l'écran seulement sur iPad)
  const fill = await s.page.evaluate(() => { const b = document.querySelector('.draw-board').getBoundingClientRect(), w = document.querySelector('.board-wrap').getBoundingClientRect(); return { part: (b.width * b.height) / (w.width * w.height), vb: document.querySelector('.draw-board').getAttribute('viewBox'), ecran: (b.width * b.height) / (innerWidth * innerHeight) }; });
  check('dessin : la feuille occupe presque toute la zone libre', fill.part > 0.95, `${Math.round(fill.part * 100)} % de la zone, ${Math.round(fill.ecran * 100)} % de l’écran, viewBox ${fill.vb}`);
  check('dessin : la feuille prend au moins 55 % de l’écran', fill.ecran > 0.55, `${Math.round(fill.ecran * 100)} %`);
  const colors = await s.page.$$eval('.draw-board .ink path', (a) => a.map((p) => p.getAttribute('stroke')));
  check('dessin : deux couleurs différentes', colors[0] !== colors[1], colors.join(' / '));
  await clickText(s.page, 'Défaire');
  n = await s.page.$$eval('.draw-board .ink path', (a) => a.length);
  check('dessin : « Défaire » retire le dernier trait', n === 1, `${n}`);
  await clickText(s.page, 'Tout effacer');
  n = await s.page.$$eval('.draw-board .ink path', (a) => a.length);
  check('dessin : « Tout effacer » demande d’abord confirmation', n === 1, `${n}`);
  await clickText(s.page, 'Sûr');
  n = await s.page.$$eval('.draw-board .ink path', (a) => a.length);
  check('dessin : la confirmation efface', n === 0, `${n}`);
  const saved = await s.page.evaluate(() => localStorage.getItem('renard-v1'));
  check('dessin : rien n’est enregistré', !/M \d/.test(saved));
  check('dessin : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
  await s.ctx.close();
}

// 5b. Fin du dessin libre : « J'ai fini ! », retour confirmé, nouveau dessin, garder en image
{
  const s = await open(null, 'dessin');
  const box = await s.page.$eval('.draw-board', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const stroke = async (pts) => { await s.page.mouse.move(box.x + pts[0][0] * box.w, box.y + pts[0][1] * box.h); await s.page.mouse.down(); for (const p of pts) await s.page.mouse.move(box.x + p[0] * box.w, box.y + p[1] * box.h, { steps: 3 }); await s.page.mouse.up(); };
  const count = () => s.page.$$eval('.draw-board .ink path', (a) => a.length);
  const overlay = () => s.page.evaluate(() => { const o = document.querySelector('.dessin-end'); return o ? { title: o.querySelector('h2').textContent, buttons: [...o.querySelectorAll('button')].map((b) => b.textContent.trim()) } : null; });
  const back = () => s.page.evaluate(() => document.querySelector('button[aria-label="Retour à la carte"]').click());
  check('fin : « J’ai fini ! » est grisé tant que la feuille est vide', await s.page.$eval('.done-btn', (b) => b.disabled));
  await stroke([[0.2, 0.3], [0.5, 0.2], [0.8, 0.4]]);
  check('fin : « J’ai fini ! » s’active dès le premier trait', !(await s.page.$eval('.done-btn', (b) => b.disabled)));
  await clickText(s.page, 'J’ai fini');
  await s.page.waitForTimeout(300);
  let o = await overlay();
  check('fin : l’écran de fin félicite', o?.title === 'Quel beau dessin !', o?.title);
  check('fin : quatre choix clairs', o && ['Continuer à dessiner', 'Nouveau dessin', 'Garder en image (avec un adulte)', 'Retour à la carte'].every((t) => o.buttons.includes(t)), o?.buttons.join(' / '));
  await clickText(s.page, 'Continuer à dessiner');
  check('fin : « Continuer » ferme l’écran et garde le dessin', !(await overlay()) && (await count()) === 1);
  await back();
  await s.page.waitForTimeout(300);
  o = await overlay();
  check('fin : la flèche de retour demande confirmation quand un dessin est en cours', o?.title === 'Tu t’en vas ?' && o.buttons.includes('Je reste'), o?.title);
  check('fin : on reste sur l’écran de dessin', (await s.hash()) === '#dessin');
  await clickText(s.page, 'Je reste');
  check('fin : « Je reste » ramène au dessin intact', !(await overlay()) && (await count()) === 1);
  await clickText(s.page, 'J’ai fini');
  await s.page.waitForTimeout(200);
  await clickText(s.page, 'Nouveau dessin');
  check('fin : « Nouveau dessin » efface et recommence', !(await overlay()) && (await count()) === 0);
  await back();
  await s.page.waitForTimeout(500);
  check('fin : feuille vide, la flèche retourne directement à la carte', (await s.hash()) === '#carte-1', await s.hash());
  // garder en image
  await s.page.evaluate(() => { location.hash = 'dessin'; });
  await s.page.waitForTimeout(700);
  const box2 = await s.page.$eval('.draw-board', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await s.page.mouse.move(box2.x + box2.w * 0.2, box2.y + box2.h * 0.5); await s.page.mouse.down();
  for (const [x, y] of [[0.4, 0.2], [0.6, 0.8], [0.8, 0.5]]) await s.page.mouse.move(box2.x + box2.w * x, box2.y + box2.h * y, { steps: 5 });
  await s.page.mouse.up();
  await clickText(s.page, 'J’ai fini');
  await s.page.waitForTimeout(200);
  const [dl] = await Promise.all([s.page.waitForEvent('download', { timeout: 8000 }).catch(() => null), clickText(s.page, 'Garder en image')]);
  if (dl) { const path = `${process.env.OUT || '/tmp'}/dessin-test.png`; await dl.saveAs(path); const b = fs.readFileSync(path); check('image : fichier PNG valide', b.length > 4000 && b.subarray(1, 4).toString() === 'PNG' && /^dessin-renard-\d{4}-\d\d-\d\d\.png$/.test(dl.suggestedFilename()), `${dl.suggestedFilename()} ${b.length} octets`); }
  else check('image : le téléchargement démarre', false);
  await s.page.waitForTimeout(300);
  check('image : message de confirmation', /enregistré|prêt/.test(await s.page.evaluate(() => document.querySelector('.dessin-end .muted')?.textContent || '')));
  check('fin : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
  await s.ctx.close();
}

// 5c. Dessin libre : modèles, calque et difficulté progressive
{
  const { DESSINS, DESSINS_TRIES, IDEES_LIBRES } = await import(`${process.cwd()}/src/content/dessins.js`);
  const ask = (m) => m.ask || `Une idée : dessine ${m.phrase} !`;
  const askOf = new Map(DESSINS.map((d) => [ask(d), d]));
  const libres = new Set(IDEES_LIBRES.map((t) => `Une idée : dessine ${t} !`));
  const seen = async (mutate, n) => {
    const s = await open(mutate, 'dessin');
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(await s.page.evaluate(() => ({ text: document.querySelector('.side .b-text')?.textContent?.replace(/[\u00A0\u202F]/g, ' ').trim(), card: !document.querySelector('.model-card').hidden, calque: document.querySelectorAll('.draw-board .calque path').length, level: document.querySelector('.model-level')?.textContent })));
      await clickText(s.page, 'Autre idée');
      await s.page.waitForTimeout(40);
    }
    return { s, out };
  };
  // débutant : seulement des modèles faciles (ou des idées libres)
  const deb = await seen((st) => { st.skills = {}; st.settings.demo = false; }, 40);
  const bad = deb.out.filter((o) => o.card && (askOf.get(o.text)?.tier ?? 9) > 1);
  check('modèles : un débutant ne voit que des modèles faciles', bad.length === 0, bad.map((b) => b.text).slice(0, 3).join(' | '));
  // du plus simple au plus compliqué : l'ordre est celui de la liste, sans hasard, puis les idées libres, puis on recommence
  const facilesAsk = DESSINS_TRIES.filter((m) => m.tier === 1).map(ask);
  const attendu = [...facilesAsk, ...IDEES_LIBRES.map((t) => `Une idée : dessine ${t} !`)];
  const vusTxt = deb.out.map((o) => o.text);
  check('modèles : « Autre idée » suit l’ordre du plus simple au plus compliqué, puis les idées libres', attendu.every((t, i) => vusTxt[i] === t) && vusTxt[attendu.length] === attendu[0], vusTxt.slice(0, 5).join(' | '));
  check('modèles : au départ, le premier est un des plus simples (le moins de traits)', vusTxt[0] === ask(DESSINS_TRIES[0]) && facilesAsk.length >= 3, vusTxt[0]);
  const withModel = deb.out.filter((o) => o.card);
  check('modèles : la vignette apparaît avec un modèle, pas avec une idée libre', withModel.length > 5 && deb.out.filter((o) => !o.card).every((o) => libres.has(o.text)), `${withModel.length}/40 avec modèle`);
  // en rouvrant l'écran, on retrouve l'idée où l'enfant s'était arrêté
  const dernier = deb.out[deb.out.length - 1].text; // l'idée affichée avant le dernier « Autre idée » : on lit l'actuelle
  const actuelle = await deb.s.page.evaluate(() => document.querySelector('.side .b-text')?.textContent?.replace(/[\u00A0\u202F]/g, ' ').trim());
  await deb.s.page.evaluate(() => { location.hash = 'carte-1'; }); await deb.s.page.waitForTimeout(500);
  await deb.s.page.evaluate(() => { location.hash = 'dessin'; }); await deb.s.page.waitForTimeout(700);
  const reprise = await deb.s.page.evaluate(() => document.querySelector('.side .b-text')?.textContent?.replace(/[\u00A0\u202F]/g, ' ').trim());
  check('modèles : en rouvrant le dessin, on reprend l’idée où on s’était arrêté', !!actuelle && reprise === actuelle, `${actuelle} / ${reprise} (avant : ${dernier})`);
  check('calque : le modèle est tracé sur la feuille dès le départ', withModel.every((o) => o.calque > 0));
  check('modèles : la difficulté est affichée (★☆☆☆ Facile)', withModel.every((o) => /^★☆☆☆ Facile$/.test(o.level)), withModel[0]?.level);
  await deb.s.ctx.close();
  // enfant avancé (démo : tout ouvert) : on voit aussi des modèles difficiles, dont ceux du renard
  const adv = await seen((st) => { st.settings.demo = true; }, 80);
  const tiers = new Set(adv.out.filter((o) => o.card).map((o) => askOf.get(o.text)?.tier));
  check('modèles : les trois difficultés apparaissent quand tout est ouvert', [1, 2, 3].every((t) => tiers.has(t)), [...tiers].join(','));
  check('renard : il demande sa voiture / sa maison / son bateau / son cerf-volant', ['la voiture de Renard', 'la maison de Renard', 'le bateau de Renard', 'le cerf-volant de Renard'].every((p) => adv.out.some((o) => o.text === ask(DESSINS.find((d) => d.phrase === p)))));
  // interrupteur calque
  const s = adv.s;
  for (let i = 0; i < 30 && await s.page.$eval('.model-card', (e) => e.hidden); i++) await clickText(s.page, 'Autre idée');
  const n = () => s.page.$$eval('.draw-board .calque path', (a) => a.length);
  check('calque : présent', (await n()) > 0);
  await clickText(s.page, 'Calque');
  check('calque : « Calque » le retire', (await n()) === 0 && (await s.page.$eval('.calque-btn', (b) => b.getAttribute('aria-pressed'))) === 'false');
  await clickText(s.page, 'Calque');
  check('calque : « Calque » le remet', (await n()) > 0);
  // le calque ne bloque pas le dessin et ne part pas dans l'image
  const box = await s.page.$eval('.draw-board', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await s.page.mouse.move(box.x + box.w * 0.3, box.y + box.h * 0.5); await s.page.mouse.down();
  await s.page.mouse.move(box.x + box.w * 0.7, box.y + box.h * 0.5, { steps: 8 }); await s.page.mouse.up();
  check('calque : on dessine par-dessus', (await s.page.$$eval('.draw-board .ink path', (a) => a.length)) === 1);
  await clickText(s.page, 'J’ai fini');
  await s.page.waitForTimeout(200);
  const [dl] = await Promise.all([s.page.waitForEvent('download', { timeout: 8000 }).catch(() => null), clickText(s.page, 'Garder en image')]);
  if (dl) await dl.saveAs(`${process.env.OUT || '/tmp'}/dessin-calque.png`);
  check('calque : image enregistrée avec calque affiché', !!dl);
  check('modèles : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
  await s.ctx.close();
}
// 5d. Galerie du renard : fermée par défaut, ouverte par les parents, accrochée par l'enfant
{
  const draw = async (s, k = 1) => {
    const box = await s.page.$eval('.draw-board', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    for (let i = 0; i < k; i++) {
      await s.page.mouse.move(box.x + box.w * 0.2, box.y + box.h * (0.3 + i * 0.1)); await s.page.mouse.down();
      for (const [x, y] of [[0.4, 0.2], [0.6, 0.6], [0.8, 0.4]]) await s.page.mouse.move(box.x + box.w * x, box.y + box.h * (y + i * 0.1), { steps: 5 });
      await s.page.mouse.up();
    }
  };
  const buttons = (page, sel) => page.$$eval(sel, (a) => a.map((b) => b.textContent.trim()));
  // fermée : rien à accrocher, rien dans le menu, l'écran l'explique
  {
    const s = await open(null, 'dessin');
    await draw(s); await clickText(s.page, 'J’ai fini'); await s.page.waitForTimeout(250);
    check('galerie fermée : pas de bouton « Accrocher » à la fin du dessin', !(await buttons(s.page, '.dessin-end button')).some((t) => /Accrocher/.test(t)));
    await s.page.evaluate(() => { location.hash = 'jeux'; }); await s.page.waitForTimeout(700);
    check('galerie fermée : pas de carte Galerie dans les jeux', !(await s.page.$('.jeu-card[data-jeu="galerie"]')));
    await s.page.evaluate(() => { location.hash = 'galerie'; }); await s.page.waitForTimeout(700);
    check('galerie fermée : l’écran explique qu’un adulte peut l’ouvrir', /pas ouverte/.test(await s.page.innerText('.galerie')));
    check('galerie fermée : rien dans l’état enregistré', !((await s.state()).galerie?.length));
    check('galerie fermée : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
    await s.ctx.close();
  }
  // parents : le réglage existe, désactivé, et l'activer ouvre la galerie
  {
    const s = await open(null, 'parents');
    await s.page.focus('.gate-btn'); await s.page.keyboard.press('Enter'); await s.page.waitForTimeout(500);
    const has = await s.page.evaluate(() => { const c = [...document.querySelectorAll('.pcard')].find((x) => /Galerie de dessins/.test(x.querySelector('h3')?.textContent)); return c ? { on: c.querySelector('input').checked, text: c.textContent } : null; });
    check('parents : la carte « Galerie de dessins » existe, désactivée par défaut', has && has.on === false, has && String(has.on));
    check('parents : le texte dit où sont les dessins et qu’ils ne partent pas', has && /sur cette tablette seulement/.test(has.text) && /rien n’est envoyé/.test(has.text) && /sauvegarde/.test(has.text));
    await s.page.evaluate(() => { const c = [...document.querySelectorAll('.pcard')].find((x) => /Galerie de dessins/.test(x.querySelector('h3')?.textContent)); c.querySelector('input').click(); });
    await s.page.waitForTimeout(500);
    check('parents : activer le réglage l’enregistre', (await s.state()).settings.galerie === true);
    await s.ctx.close();
  }
  // ouverte : l'enfant accroche, revoit, retire
  {
    const s = await open((st) => { st.settings.galerie = true; }, 'dessin');
    await draw(s, 2); await clickText(s.page, 'J’ai fini'); await s.page.waitForTimeout(250);
    const btns = await buttons(s.page, '.dessin-end button');
    check('galerie ouverte : « Accrocher dans la forêt » est proposé', btns.some((t) => /Accrocher dans la forêt/.test(t)), btns.join(' / '));
    const fits = await s.page.evaluate(() => { const c = document.querySelector('.dessin-end .result-card').getBoundingClientRect(); const b = document.querySelector('.dessin-end .btn-big:last-of-type')?.getBoundingClientRect(); return c.top >= 0 && c.bottom <= innerHeight + 1; });
    check('galerie ouverte : l’écran de fin tient dans la fenêtre', fits);
    await clickText(s.page, 'Accrocher dans la forêt');
    await s.page.waitForTimeout(600);
    let st = await s.state();
    check('accrocher : le dessin est enregistré (2 traits, titre)', st.galerie.length === 1 && st.galerie[0].s.length === 2 && /^[A-ZÉ]/.test(st.galerie[0].title), JSON.stringify(st.galerie.map((e) => [e.title, e.s.length])));
    check('accrocher : le bouton devient « Voir ma galerie »', (await buttons(s.page, '.dessin-end button')).some((t) => /Voir ma galerie/.test(t)));
    check('accrocher : le calque n’est pas enregistré', st.galerie[0].s.every((x) => /^#[0-9a-f]{6}$/i.test(x.c)));
    await clickText(s.page, 'Continuer à dessiner'); await draw(s, 1); await clickText(s.page, 'J’ai fini'); await s.page.waitForTimeout(250);
    check('accrocher : après avoir continué, le même dessin est mis à jour', /mis à jour/.test(await s.page.innerText('.hang-note')));
    await clickText(s.page, 'Accrocher dans la forêt'); await s.page.waitForTimeout(500);
    st = await s.state();
    check('accrocher : toujours un seul dessin, avec 3 traits', st.galerie.length === 1 && st.galerie[0].s.length === 3, `${st.galerie.length} / ${st.galerie[0]?.s.length}`);
    await clickText(s.page, 'Voir ma galerie'); await s.page.waitForTimeout(800);
    check('galerie : on arrive sur l’écran Ma galerie', (await s.hash()) === '#galerie');
    check('galerie : un cadre, avec titre et date', (await s.page.$$eval('.cadre', (a) => a.length)) === 1 && (await s.page.$$eval('.cadre .cadre-titre', (a) => a[0].textContent.length)) > 3);
    check('galerie : le cadre montre le dessin', (await s.page.$$eval('.cadre svg path', (a) => a.length)) === 3);
    await s.page.screenshot({ path: `${process.env.OUT || '/tmp'}/galerie-1.png` });
    await s.page.evaluate(() => document.querySelector('.cadre').click()); await s.page.waitForTimeout(500);
    check('galerie : toucher un cadre l’ouvre en grand', !!(await s.page.$('.gal-zoom .zoom-svg')));
    await s.page.screenshot({ path: `${process.env.OUT || '/tmp'}/galerie-zoom.png` });
    await clickText(s.page, 'Retirer de la galerie');
    check('galerie : retirer demande d’abord confirmation', (await s.state()).galerie.length === 1 && /Sûr/.test(await s.page.innerText('.gal-zoom')));
    await clickText(s.page, 'Sûr'); await s.page.waitForTimeout(600);
    check('galerie : après confirmation, le dessin est retiré et la galerie est vide', (await s.state()).galerie.length === 0 && /vide/.test(await s.page.innerText('.mur-vide')));
    await s.page.evaluate(() => { location.hash = 'jeux'; }); await s.page.waitForTimeout(700);
    check('galerie ouverte : les jeux proposent « Ma galerie »', !!(await s.page.$('.jeu-card[data-jeu="galerie"]')));
    check('galerie : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
    await s.ctx.close();
  }
}

// 5e. Contenu étoffé : carte par étapes, ouverture des mots, tableau libre, classe de l'enfant
{
  const tried = (st, ids) => ids.forEach((id) => { st.skills[id] = { sessions: 1, attempts: 2, phase: 0, mastered: false, masteredAt: null, last: Date.now(), history: [] }; });
  // carte du niveau 2 : étapes, état des lettres
  {
    const s = await open((st) => { tried(st, ['i', 'o', 'a', 'l', 'e']); }, 'carte-2');
    const chips = await s.page.$$eval('.sec-chip', (a) => a.map((b) => b.textContent));
    check('carte niveau 2 : cinq étapes', chips.length === 5, chips.join(' | '));
    check('carte niveau 2 : l’étape en cours est surlignée', (await s.page.$$eval('.sec-chip.on', (a) => a.length)) === 1);
    await s.page.click('.sec-chip:nth-child(2)'); await s.page.waitForTimeout(700);
    check('carte niveau 2 : toucher une étape change la carte', (await s.hash()) === '#carte-2-1' && (await s.page.$$eval('.node', (a) => a.length)) === 5);
    const ouverts = await s.page.$$eval('.node:not(.locked)', (a) => a.map((n) => n.dataset.skill));
    check('carte niveau 2 : seul le u (suite des lettres) est ouvert', ouverts.length === 1 && ouverts[0] === 'u', ouverts.join(','));
    // un nœud verrouillé explique pourquoi
    await s.page.click('.node.locked'); await s.page.waitForTimeout(400);
    check('carte : un nœud fermé reste sur la carte', (await s.hash()) === '#carte-2-1');
    check('carte niveau 2 : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
    await s.ctx.close();
  }
  // niveau 3 : les mots s'ouvrent dès que leurs lettres sont essayées ; mot fermé : on dit quelles lettres manquent
  {
    const s = await open((st) => { tried(st, ['i', 'o', 'a', 'l', 'e']); }, 'carte-3-0');
    const ouverts = await s.page.$$eval('.node:not(.locked):not(.free)', (a) => a.map((n) => n.dataset.skill));
    check('niveau 3 : les six premiers mots sont ouverts d’un coup', ['mot_il', 'mot_la', 'mot_le', 'mot_loi', 'mot_oie', 'mot_aile'].every((x) => ouverts.includes(x)), ouverts.join(','));
    await s.page.evaluate(() => { location.hash = 'carte-3-3'; }); await s.page.waitForTimeout(700);
    await s.page.click('.node.locked'); await s.page.waitForTimeout(500);
    check('niveau 3 : un mot fermé dit quelles lettres manquent', /Il te manque/.test(await s.page.innerText('.side .bubble')), await s.page.innerText('.side .bubble'));
    await s.page.evaluate(() => { location.hash = 'carte-3-17'; }); await s.page.waitForTimeout(700);
    check('niveau 3 : les grandes phrases et le tableau libre sont sur la carte', (await s.page.$$eval('.node', (a) => a.length)) === 9 && !!(await s.page.$('.node.free')));
    await s.page.click('.node.free'); await s.page.waitForTimeout(800);
    check('carte : « Tableau libre » ouvre le tableau', (await s.hash()) === '#tableau' && !!(await s.page.$('.tableau-board')));
    await s.ctx.close();
  }
  // tableau libre : texte au clavier, casse, calque, écriture reconnue (confettis), mode dessin à calques, fin
  {
    const s = await open((st) => { st.name = 'Léa'; tried(st, ['i', 'l']); }, 'tableau');
    check('tableau : démarre avec le prénom (sans accent, majuscule au début)', (await s.page.innerText('.tb-text')) === 'Lea', await s.page.innerText('.tb-text'));
    check('tableau : deux rangées de calque (plein, pointillés)', (await s.page.$$eval('.cal-row', (a) => a.length)) === 2);
    check('tableau : trois casses proposées (abc, ABC, Abc)', (await buttons(s.page, '.tb-card .cs-btn')).join('|') === 'abc|ABC|Abc');
    // un mot bien écrit sur la première rangée est reconnu : coche, confettis, félicitations
    const trace = async (sel) => {
      const strokes = await s.page.evaluate((q) => [...document.querySelectorAll(q)].map((p) => {
        const m = p.ownerSVGElement.getScreenCTM(), L = p.getTotalLength(), pts = [];
        for (let d = 0; d <= L; d += 0.3) { const pt = p.getPointAtLength(d); const c = new DOMPoint(pt.x, pt.y).matrixTransform(m); pts.push([c.x, c.y]); }
        return pts;
      }), sel);
      for (const pts of strokes) {
        await s.page.mouse.move(...pts[0]); await s.page.mouse.down();
        for (const p of pts.slice(1)) await s.page.mouse.move(...p);
        await s.page.mouse.up();
      }
      return strokes.length;
    };
    const n = await trace('.cal-row.r0 path.center');
    await s.page.waitForTimeout(1500);
    check('tableau : « Lea » écrit sur le guide est reconnu (coche sur la rangée)', n >= 3 && (await s.page.$$eval('.badges .badge', (a) => a.length)) === 1, `${n} traits`);
    const flying = await s.page.$$eval('.confetti i', (a) => a.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.x > 0 && r.x < innerWidth && r.y > 0 && r.y < innerHeight; }).length);
    check('tableau : confettis visibles à l’écran et félicitations du renard', flying >= 15 && /Bravo|Magnifique|Super|Bien joué|Très bien/.test(await s.page.innerText('.side .bubble')), `${flying} confettis ; ${await s.page.innerText('.side .bubble')}`);
    await s.page.waitForTimeout(3600);
    check('tableau : les confettis disparaissent d’eux-mêmes', !(await s.page.$('.confetti')));
    await s.page.click('.tb-card .cs-btn[data-casse="maj"]'); await s.page.waitForTimeout(300);
    check('tableau : « ABC » écrit le texte en majuscules et efface les coches', (await s.page.innerText('.tb-text')) === 'LEA' && (await s.page.$$eval('.badges .badge', (a) => a.length)) === 0);
    check('tableau : l’écriture de la même rangée en majuscules attend toujours son modèle', (await s.page.$$eval('.cal-row', (a) => a.length)) === 2);
    await clickText(s.page, 'Quoi écrire'); await s.page.waitForTimeout(300);
    check('tableau : le clavier propose 26 lettres', (await s.page.$$eval('.tp-key', (a) => a.length)) === 26 + 2);
    check('tableau : le clavier suit la casse choisie (majuscules)', (await s.page.innerText('.tp-key[aria-label="Lettre c"]')) === 'C');
    await s.page.click('.tpick .cs-btn[data-casse="min"]'); await s.page.waitForTimeout(150);
    check('tableau : le clavier repasse en minuscules', (await s.page.innerText('.tp-key[aria-label="Lettre c"]')) === 'c');
    for (const k of ['c', 'h', 'a', 't']) await s.page.click(`.tp-key[aria-label="Lettre ${k}"]`);
    await clickText(s.page, 'C’est parti'); await s.page.waitForTimeout(400);
    check('tableau : le texte choisi s’affiche', (await s.page.innerText('.tb-text')) === 'chat');
    check('tableau : un autre texte remet la page à blanc', (await s.page.$$eval('.tableau-board .ink path', (a) => a.length)) === 0);
    const box = await s.page.$eval('.tableau-board', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await s.page.mouse.move(box.x + box.w * 0.2, box.y + box.h * 0.7); await s.page.mouse.down();
    for (const [x, y] of [[0.3, 0.65], [0.4, 0.75], [0.5, 0.7]]) await s.page.mouse.move(box.x + box.w * x, box.y + box.h * y, { steps: 5 });
    await s.page.mouse.up();
    await s.page.waitForTimeout(1300);
    check('tableau : un gribouillis n’est pas félicité', (await s.page.$$eval('.badges .badge', (a) => a.length)) === 0 && !(await s.page.$('.confetti')));
    check('tableau : on peut écrire librement sur la page', (await s.page.$$eval('.tableau-board .ink path', (a) => a.length)) >= 1);
    check('tableau : « J’ai fini » s’active après un trait', await s.page.$eval('.done-btn', (b) => !b.disabled));
    await s.page.click('.calque-btn'); await s.page.waitForTimeout(150);
    check('tableau : « Calque » masque les modèles', (await s.page.$$eval('.cal-row', (a) => a.length)) === 0);
    // mode dessin : calques de dessins, grille, feuille à part
    await s.page.click('.ms-btn[data-view="dessiner"]'); await s.page.waitForTimeout(300);
    check('dessiner : la feuille de dessin (10 de large, 7 de haut au moins) remplace la page lignée', /^0 0 10 (\d+(\.\d+)?)$/.test(await s.page.$eval('.tableau-board', (e) => e.getAttribute('viewBox'))) && +(await s.page.$eval('.tableau-board', (e) => e.getAttribute('viewBox'))).split(' ')[3] >= 7 && !(await s.page.$('.tableau-board .rules')));
    check('dessiner : la feuille de dessin est vide (l’écriture reste sur son autre feuille)', (await s.page.$$eval('.tableau-board .ink path', (a) => a.length)) === 0 && !(await s.page.$eval('.model-card:not(.tb-card)', (e) => e.hidden)));
    await clickText(s.page, 'Choisir'); await s.page.waitForTimeout(300);
    check('dessiner : le choix de calque propose la feuille blanche et tous les dessins', (await s.page.$$eval('.mp-card', (a) => a.length)) === 1 + DESSINS_N);
    await s.page.click('.mp-card[data-model="soleil"]'); await s.page.waitForTimeout(300);
    check('dessiner : le dessin choisi apparaît en pointillés sur la feuille', !!(await s.page.$('.cal-model.pointille')));
    await s.page.click('.calque-mode[data-mode="plein"]'); await s.page.waitForTimeout(150);
    check('dessiner : calque « Plein »', !!(await s.page.$('.cal-model.plein')) && !(await s.page.$('.cal-model.pointille')));
    await s.page.click('.calque-mode[data-mode="aucun"]'); await s.page.waitForTimeout(150);
    check('dessiner : calque « Caché »', !(await s.page.$('.cal-model')));
    await s.page.click('.calque-mode[data-mode="pointille"]');
    await s.page.click('.grid-btn'); await s.page.waitForTimeout(150);
    check('dessiner : la grille s’affiche', (await s.page.$$eval('.tableau-board .grid line', (a) => a.length)) > 8);
    await clickText(s.page, 'Choisir'); await s.page.waitForTimeout(250);
    await s.page.click('.mp-card.locked'); await s.page.waitForTimeout(150);
    check('dessiner : un dessin difficile dit qu’il s’ouvre plus tard', /plus tard/.test(await s.page.innerText('.mpick .tp-msg')));
    await clickText(s.page, 'Annuler'); await s.page.waitForTimeout(200);
    const box2 = await s.page.$eval('.tableau-board', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    await s.page.mouse.move(box2.x + box2.w * 0.4, box2.y + box2.h * 0.4); await s.page.mouse.down();
    for (const [x, y] of [[0.5, 0.3], [0.6, 0.4], [0.5, 0.5]]) await s.page.mouse.move(box2.x + box2.w * x, box2.y + box2.h * y, { steps: 5 });
    await s.page.mouse.up();
    check('dessiner : on dessine par-dessus le calque', (await s.page.$$eval('.tableau-board .ink path', (a) => a.length)) === 1);
    // Changer de modèle remet la feuille à blanc ; en garder le même la laisse comme elle est ; le calque a les couleurs de la vignette
    await clickText(s.page, 'Choisir'); await s.page.waitForTimeout(250);
    await s.page.click('.mp-card[data-model="soleil"]'); await s.page.waitForTimeout(250);
    check('dessiner : choisir le même modèle garde le dessin', (await s.page.$$eval('.tableau-board .ink path', (a) => a.length)) === 1);
    await clickText(s.page, 'Choisir'); await s.page.waitForTimeout(250);
    await s.page.click('.mp-card[data-model="maison"]'); await s.page.waitForTimeout(300);
    check('dessiner : choisir un autre modèle remet la feuille à blanc', (await s.page.$$eval('.tableau-board .ink path', (a) => a.length)) === 0);
    const tons = await s.page.$$eval('.cal-model.pointille path', (a) => [...new Set(a.map((p) => p.getAttribute('stroke')))]);
    check('dessiner : le calque en pointillés a les couleurs de la miniature (maison : orange, rouge, brun, bleu)', tons.length === 4 && !tons.includes('#7F8BC0'), tons.join(' '));
    await s.page.mouse.move(box2.x + box2.w * 0.4, box2.y + box2.h * 0.4); await s.page.mouse.down();
    for (const [x, y] of [[0.5, 0.3], [0.6, 0.4], [0.5, 0.5]]) await s.page.mouse.move(box2.x + box2.w * x, box2.y + box2.h * y, { steps: 5 });
    await s.page.mouse.up();
    check('dessiner : on redessine sur le nouveau modèle', (await s.page.$$eval('.tableau-board .ink path', (a) => a.length)) === 1);
    await clickText(s.page, 'Autre idée'); await s.page.waitForTimeout(300);
    check('dessiner : « Autre idée » remet aussi la feuille à blanc', (await s.page.$$eval('.tableau-board .ink path', (a) => a.length)) === 0 && await s.page.$eval('.done-btn', (b) => b.disabled));
    await s.page.mouse.move(box2.x + box2.w * 0.4, box2.y + box2.h * 0.4); await s.page.mouse.down();
    for (const [x, y] of [[0.5, 0.3], [0.6, 0.4], [0.5, 0.5]]) await s.page.mouse.move(box2.x + box2.w * x, box2.y + box2.h * y, { steps: 5 });
    await s.page.mouse.up();
    await s.page.click('.ms-btn[data-view="ecrire"]'); await s.page.waitForTimeout(300);
    check('écrire : on retrouve la page lignée et son écriture', !!(await s.page.$('.tableau-board .rules')) && (await s.page.$$eval('.tableau-board .ink path', (a) => a.length)) >= 1);
    await s.page.click('.ms-btn[data-view="dessiner"]'); await s.page.waitForTimeout(300);
    await clickText(s.page, 'J’ai fini'); await s.page.waitForTimeout(300);
    check('dessiner : la fin parle du dessin', /beau dessin/.test(await s.page.innerText('.dessin-end h2')));
    check('tableau : la fin propose de garder en image, jamais d’enregistrer toute seule', (await buttons(s.page, '.dessin-end button')).some((t) => /Garder en image/.test(t)) && !((await s.state()).galerie?.length));
    check('tableau : l’écran de fin tient dans la fenêtre', await s.page.evaluate(() => { const c = document.querySelector('.dessin-end .result-card').getBoundingClientRect(); return c.top >= 0 && c.bottom <= innerHeight + 1; }));
    check('tableau : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
    await s.ctx.close();
  }
  // première ouverture : le Tableau (écrire et dessiner avec calques) est dans le menu dès le départ, sans rien à débloquer
  {
    const s = await open((st) => { st.skills = {}; st.settings.depart = 1; });
    await s.page.click('.home-nav button:has-text("Jeux")'); await s.page.waitForTimeout(600);
    check('première ouverture : les jeux proposent le Tableau', !!(await s.page.$('.jeu-card[data-jeu="tableau"]:not(.off)')));
    await s.page.click('.jeu-card[data-jeu="tableau"]'); await s.page.waitForTimeout(800);
    check('première ouverture : le Tableau s’ouvre', (await s.hash()) === '#tableau' && !!(await s.page.$('.tableau-board')));
    check('première ouverture : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
    await s.ctx.close();
  }
  // classe de l'enfant : niveau de départ
  {
    const s = await open((st) => { st.settings.depart = 3; }, 'carte-3-0');
    const nbOuverts = await s.page.$$eval('.node:not(.locked):not(.free)', (a) => a.length);
    check('classe « fin du CP » : tous les mots du début sont ouverts sans avoir essayé de lettres', nbOuverts === 6, String(nbOuverts));
    await s.page.evaluate(() => { location.hash = 'jeux'; }); await s.page.waitForTimeout(700);
    check('classe « fin du CP » : les jeux proposent le Tableau', !!(await s.page.$('.jeu-card[data-jeu="tableau"]')));
    await s.ctx.close();
  }
  // parents : réglages
  {
    const s = await open(null, 'parents');
    await s.page.focus('.gate-btn'); await s.page.keyboard.press('Enter'); await s.page.waitForTimeout(500);
    check('parents : le réglage « Où en est l’enfant ? » existe', /Où en est l’enfant/.test(await s.page.innerText('body')));
    await clickText(s.page, 'Fin du CP', '.seg-b'); await s.page.waitForTimeout(300);
    check('parents : « Fin du CP » est enregistré', (await s.state()).settings.depart === 3);
    check('parents : l’ordre des lettres propose l’ordre alphabétique', /Ordre alphabétique/.test(await s.page.innerText('body')));
    await clickText(s.page, 'Ordre alphabétique'); await s.page.waitForTimeout(300);
    check('parents : l’ordre alphabétique est enregistré', JSON.stringify((await s.state()).settings.order2?.slice(0, 3)) === '["a","b","c"]');
    check('parents : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
    await s.ctx.close();
  }
}

// Premier lancement : écran de démarrage, présentation (prénom, classe, main), Options, Crédits
{
  const fresh = async (viewport = { width: 1180, height: 820 }) => {
    const ctx = await browser.newContext({ viewport, hasTouch: true });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    await page.goto(`file://${process.cwd()}/${PAGE}/index.html`); // sans ancre : comme à l'ouverture de l'application
    await page.waitForTimeout(700);
    return { page, ctx, errs, state: () => page.evaluate(() => JSON.parse(localStorage.getItem('renard-v1') || 'null')), hash: () => page.evaluate(() => location.hash) };
  };
  const s = await fresh();
  check('démarrage : l’écran « Touche pour jouer » s’affiche à l’ouverture', !!(await s.page.$('.screen.splash')) && /Touche pour jouer/.test(await s.page.innerText('.splash .btn-big')));
  // Un deuxième toucher, une fois la musique commencée, passe à la suite sans attendre la fin ; un double toucher immédiat ne coupe pas la musique
  const sk = await fresh();
  await sk.page.click('.splash .home-main'); await sk.page.click('.splash .home-main', { force: true }); await sk.page.waitForTimeout(500);
  check('démarrage : un double toucher immédiat ne saute pas la musique', (await sk.hash()) === '', await sk.hash());
  await sk.page.waitForTimeout(900); await sk.page.click('.splash .home-main', { force: true }); await sk.page.waitForTimeout(600);
  check('démarrage : un toucher plus tard passe à la suite sans attendre la fin de la musique', (await sk.hash()) === '#bienvenue', await sk.hash());
  check('démarrage : aucune erreur', sk.errs.length === 0, sk.errs.join(' | '));
  await sk.ctx.close();
  await s.page.click('.splash .home-main'); await s.page.waitForTimeout(3600);
  check('présentation : tablette neuve, le renard se présente', (await s.hash()) === '#bienvenue' && !!(await s.page.$('.screen.welcome .wl-input')), await s.hash());
  const skipBox = await s.page.evaluate(() => { const b = document.querySelector('.wl-skip').getBoundingClientRect(); return { right: b.right, top: b.top, w: innerWidth }; });
  check('présentation : « Passer » est en haut à droite', skipBox.right > skipBox.w - 60 && skipBox.top < 40, JSON.stringify(skipBox));
  await s.page.fill('.wl-input', 'léa-rose'); await s.page.click('.wl-body .btn-big'); await s.page.waitForTimeout(400);
  check('présentation : la deuxième question propose quatre classes', (await s.page.$$('[data-classe]')).length === 4);
  await s.page.click('[data-classe=gs]'); await s.page.waitForTimeout(700);
  check('présentation : la troisième question propose la main', (await s.page.$$('[data-main]')).length === 2);
  check('présentation : la main gauche est à gauche, la main droite à droite', (await s.page.$$eval('[data-main]', (a) => a.map((x) => x.dataset.main + ':' + Math.round(x.getBoundingClientRect().x)))).map((x) => x.split(':')).every(([m, x], i, all) => i === 0 ? m === 'gauche' : m === 'droite' && +x > +all[0][1]));
  await s.page.click('[data-main=droite]'); await s.page.waitForTimeout(700);
  check('présentation : une question pour les adultes sur le temps d’écran', /Pour les adultes/i.test(await s.page.innerText('.wl-body')) && (await s.page.$$('.wl-adulte .seg')).length === 2);
  await clickText(s.page, '^30 min$', '.wl-adulte .seg-b'); await s.page.waitForTimeout(200);
  await s.page.click('.wl-body .btn-big'); await s.page.waitForTimeout(500);
  await s.page.click('.wl-body .btn-big'); await s.page.waitForTimeout(800);
  let st = await s.state();
  check('présentation : la limite du jour choisie est enregistrée', st.settings.pauseMode === 'limite' && st.settings.limiteMin === 30, JSON.stringify({ m: st.settings.pauseMode, l: st.settings.limiteMin }));
  check('présentation : prénom nettoyé, classe et main enregistrés', st.name === 'Léa-Rose' && st.settings.classe === 'gs' && st.settings.depart === 1 && st.settings.main === 'droite' && st.settings.accueilFait === true, JSON.stringify({ n: st.name, c: st.settings.classe, d: st.settings.depart }));
  check('premier lancement : la démarche en trois étapes est montrée tout de suite', (await s.hash()) === '#methode', await s.hash());
  await s.page.click('.mt-actions .btn-big'); await s.page.waitForTimeout(700);
  check('présentation : on arrive à l’accueil', (await s.hash()) === '#accueil');
  check('accueil : regroupé (niveaux, trésors, jeux, démarche, parents)', (await s.page.$$eval('.home-nav .lbl', (l) => l.map((x) => x.textContent).join(','))) === 'Niveaux,Trésors,Jeux,Démarche,Parents', await s.page.$$eval('.home-nav .lbl', (l) => l.map((x) => x.textContent).join(',')));
  const opt = await s.page.evaluate(() => { const b = document.querySelector('.top-right [aria-label=Options]'); if (!b) return null; const r = b.getBoundingClientRect(); return { right: r.right, top: r.top, w: innerWidth }; });
  check('accueil : le bouton Options est en haut à droite', !!opt && opt.right > opt.w - 160 && opt.top < 40, JSON.stringify(opt));
  // Options
  await s.page.click('[aria-label=Options]'); await s.page.waitForTimeout(500);
  check('options : la page s’ouvre', (await s.hash()) === '#options' && /Mélodie du démarrage/.test(await s.page.innerText('body')));
  await clickText(s.page, 'CP, fin d’année', '.seg-b'); await s.page.waitForTimeout(300);
  st = await s.state();
  check('options : changer de classe règle le niveau de départ', st.settings.classe === 'cp2' && st.settings.depart === 3, JSON.stringify({ c: st.settings.classe, d: st.settings.depart }));
  await clickText(s.page, 'Mélodie du démarrage', 'label'); await s.page.waitForTimeout(300);
  check('options : la mélodie peut être coupée', (await s.state()).settings.jingle === false);
  // Crédits
  await clickText(s.page, 'Crédits'); await s.page.waitForTimeout(500);
  check('crédits : la page s’ouvre', (await s.hash()) === '#credits' && /L’idée/.test(await s.page.innerText('body')) && /Jérôme Hosdez/.test(await s.page.innerText('body')));
  check('crédits : rien ne dépasse de la fenêtre en largeur', await s.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  // Rouvrir l'application : plus de présentation, mais l'écran de démarrage ; mélodie coupée => pas de son attendu
  await s.page.goto(`file://${process.cwd()}/${PAGE}/index.html`); await s.page.waitForTimeout(600);
  await s.page.click('.splash .home-main'); await s.page.waitForTimeout(3600);
  check('réouverture : on va droit à l’accueil, sans refaire la présentation', (await s.hash()) === '#accueil', await s.hash());
  check('premier lancement : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
  await s.ctx.close();
  // Les parents règlent le niveau de départ : la classe suit sans se contredire
  const p = await open((x) => { x.settings.classe = 'gs'; x.settings.depart = 1; x.settings.accueilFait = true; }, 'parents');
  await p.page.focus('.gate-btn'); await p.page.keyboard.press('Enter'); await p.page.waitForTimeout(500);
  await clickText(p.page, 'Début du CP', '.seg-b'); await p.page.waitForTimeout(300);
  st = await p.state();
  check('parents : « Début du CP » met aussi la classe à « CP, début d’année »', st.settings.depart === 2 && st.settings.classe === 'cp1', JSON.stringify({ c: st.settings.classe, d: st.settings.depart }));
  await clickText(p.page, 'Avant le CP', '.seg-b'); await p.page.waitForTimeout(300);
  st = await p.state();
  check('parents : « Avant le CP » redonne une classe de maternelle', st.settings.depart === 1 && ['ms', 'gs'].includes(st.settings.classe), st.settings.classe);
  check('parents : aucune erreur (classe)', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
  // Grande section : la carte du niveau 1 ouvre d'emblée la première majuscule
  const g = await open((x) => { x.skills = {}; x.settings.classe = 'gs'; x.settings.depart = 1; x.settings.accueilFait = true; }, 'carte-1-1');
  const ouverts = await g.page.$$eval('.node:not(.locked)', (a) => a.map((n) => n.querySelector('.nlabel')?.textContent.trim() || ''));
  check('grande section : la première majuscule est ouverte', ouverts.length >= 1 && ouverts.some((t) => /(^|\s)I$/.test(t)), ouverts.join(','));
  const ex = await open((x) => { x.skills = {}; x.settings.classe = 'gs'; x.settings.depart = 1; x.settings.accueilFait = true; }, 'exercice-maj_I');
  check('majuscule : l’exercice « I » s’ouvre', (await ex.hash()) === '#exercice-maj_I' && /Le I majuscule/.test(await ex.page.innerText('.exo-bar')));
  check('majuscule : la colonne de gauche tient dans la fenêtre', await ex.page.evaluate(() => [...document.querySelectorAll('.exo-card,.model-chip')].every((e) => e.getBoundingClientRect().bottom <= innerHeight)));
  check('majuscule : aucune erreur', ex.errs.length === 0 && g.errs.length === 0, ex.errs.concat(g.errs).join(' | '));
  await g.ctx.close(); await ex.ctx.close();
  // Les chiffres : la carte, l'exercice du 5 (deux traits), et l'échelle des mots et des phrases
  const ch = await open((x) => { x.skills = {}; x.settings.classe = 'gs'; x.settings.depart = 1; x.settings.accueilFait = true; }, 'carte-1-6');
  check('chiffres : la carte montre les dix chiffres et « Mon prénom »', (await ch.page.$$('.node:not(.free)')).length === 10 && !!(await ch.page.$('.node.free')), String((await ch.page.$$('.node:not(.free)')).length));
  const c5 = await open((x) => { x.settings.demo = true; x.settings.accueilFait = true; }, 'exercice-chf_5');
  check('chiffres : l\'exercice du 5 s\'ouvre', (await c5.hash()) === '#exercice-chf_5' && /Le chiffre 5/.test(await c5.page.innerText('.exo-bar')));
  check('chiffres : la colonne de gauche tient dans la fenêtre', await c5.page.evaluate(() => [...document.querySelectorAll('.exo-card,.model-chip')].every((e) => e.getBoundingClientRect().bottom <= innerHeight)));
  const lad = await open((x) => { x.settings.demo = true; x.settings.accueilFait = true; }, 'carte-3-17');
  check('échelle : les grandes phrases sont à la fin du niveau 3', /Les grandes phrases/.test(await lad.page.innerText('.bar-title')) && (await lad.page.$$('.node:not(.free)')).length === 8);
  check('échelle : les paliers de mots et de phrases se suivent dans le bandeau', await lad.page.$$eval('.sections button', (b) => b.slice(-11).map((x) => x.textContent).join('|').includes('Les mots de 4 lettres') && b.at(-1).textContent.includes('grandes phrases')));
  const lg = await open((x) => { x.settings.demo = true; x.settings.accueilFait = true; }, 'exercice-mot_champignon');
  check('échelle : un très grand mot s\'ouvre et se lit', (await lg.hash()) === '#exercice-mot_champignon' && /champignon/.test(await lg.page.innerText('.exo-bar')));
  check('chiffres et échelle : aucune erreur', [ch, c5, lad, lg].every((z) => z.errs.length === 0), [ch, c5, lad, lg].flatMap((z) => z.errs).join(' | '));
  for (const z of [ch, c5, lad, lg]) await z.ctx.close();
  // Des mots et des phrases en capitales, à la fin du niveau 1, du plus simple au plus difficile
  const mm = await open((x) => { x.skills = {}; x.settings.classe = 'gs'; x.settings.depart = 1; x.settings.accueilFait = true; }, 'carte-1-7');
  check('capitales : les premiers mots sont sur la carte, fermés tant que les majuscules ne sont pas essayées', /Mes premiers mots en capitales/.test(await mm.page.innerText('.bar-title')) && (await mm.page.$$('.node:not(.free)')).length === 10 && (await mm.page.$$('.node.locked')).length === 10);
  check('capitales : l\'échelle se suit dans le bandeau (4 paliers de mots, 2 de phrases)', await mm.page.$$eval('.sections button', (b) => b.slice(-6).map((x) => x.textContent).join('|').includes('Les mots de 4 lettres') && b.at(-1).textContent.includes('Des phrases courtes')));
  const mx = await open((x) => { x.settings.demo = true; x.settings.accueilFait = true; }, 'exercice-mm_LUNE');
  check('capitales : le mot LUNE s\'ouvre', (await mx.hash()) === '#exercice-mm_LUNE' && /LUNE/.test(await mx.page.innerText('.exo-bar')));
  check('capitales : la colonne de gauche tient dans la fenêtre', await mx.page.evaluate(() => [...document.querySelectorAll('.exo-card,.model-chip')].every((e) => e.getBoundingClientRect().bottom <= innerHeight)));
  const mp = await open((x) => { x.settings.demo = true; x.settings.accueilFait = true; }, 'exercice-mp_TU_AS_FAIM');
  check('capitales : la phrase TU AS FAIM s\'ouvre', (await mp.hash()) === '#exercice-mp_TU_AS_FAIM' && /TU AS FAIM/.test(await mp.page.innerText('.exo-bar')));
  check('capitales : aucune erreur', [mm, mx, mp].every((z) => z.errs.length === 0), [mm, mx, mp].flatMap((z) => z.errs).join(' | '));
  for (const z of [mm, mx, mp]) await z.ctx.close();

  // Épaisseur du trait : plus fine à mesure que le niveau monte, réglable, et plus épaisse si l'enfant a du mal
  const widths = {};
  for (const [id, trait] of [['lignes', 'auto'], ['e', 'auto'], ['mot_il', 'auto'], ['e', 'fin'], ['e', 'epais']]) {
    const z = await open((x) => { x.settings.demo = true; x.settings.accueilFait = true; x.settings.trait = trait; }, `exercice-${id}`);
    widths[`${id}/${trait}`] = await z.page.evaluate(() => parseFloat(document.querySelector('svg.board').style.getPropertyValue('--e-ink')));
    check(`épaisseur : ${id} (${trait}) s'ouvre sans erreur`, z.errs.length === 0, z.errs.join(' | '));
    await z.ctx.close();
  }
  check('épaisseur : le trait s\'affine du niveau 1 au niveau 3', widths['lignes/auto'] > widths['e/auto'] && widths['e/auto'] > widths['mot_il/auto'], JSON.stringify(widths));
  check('épaisseur : « Fin » < « Selon le niveau » (niveau 2) < « Épais »', widths['e/fin'] < widths['e/auto'] && widths['e/auto'] < widths['e/epais']);
  const dif = await open((x) => { x.settings.accueilFait = true; x.settings.demo = false; x.settings.depart = 3; x.settings.classe = 'cp2'; x.skills.e = { sessions: 2, attempts: 3, phase: 0, mastered: false, masteredAt: null, last: Date.now(), history: [0.2, 0.3, 0.4].map((sc) => ({ t: 1, ph: 0, sc, st: 1, c: {}, tg: [] })) }; }, 'exercice-e');
  check('épaisseur : un exercice difficile démarre plus épais', (await dif.page.evaluate(() => parseFloat(document.querySelector('svg.board').style.getPropertyValue('--e-ink')))) > widths['e/auto']);
  await dif.ctx.close();
  // Les trois étapes sont expliquées, et le point du i vient pendant l'écriture
  const ex3 = await open((x) => { x.settings.demo = true; x.settings.accueilFait = true; }, 'exercice-mot_lit');
  check('étapes : l\'exercice numérote les trois étapes, bien visibles', (await ex3.page.$$eval('.phase .ph-n', (n) => n.map((x) => x.textContent).join(''))) === '123' && /trois étapes/i.test(await ex3.page.getAttribute('.phases', 'aria-label')));
  await ex3.page.waitForSelector('.phase-banner.show', { timeout: 30000 });
  check('étapes : l\'étape en cours est annoncée sur le cahier', /Étape 1 sur 3/.test(await ex3.page.innerText('.phase-banner')));
  check('avancement : la place dans la série est affichée', /\d+ \/ \d+/.test(await ex3.page.innerText('.serie-track')) && (await ex3.page.$$('.st-dot.cur')).length === 1);
  const nums = await ex3.page.$$eval('.gs', (gs) => gs.map((g) => [g.querySelector('.snum')?.textContent, !g.querySelector('.ink-path') && g.querySelectorAll('path').length === 0].join('')));
  check('numérotation : lit = l, i, son point, t, barre du t (le point porte le 3)', nums.length === 5 && nums.map((x) => x[0]).join('') === '12345', JSON.stringify(nums));
  check('étapes : aucune erreur', ex3.errs.length === 0, ex3.errs.join(' | '));
  await ex3.ctx.close();
  const tb = await open((x) => { x.settings.demo = true; x.settings.accueilFait = true; }, 'tableau');
  check('tableau : trois étapes nommées sur les rangées (Guide, Pointillés, Tout seul)', (await tb.page.$$eval('.step-name', (n) => n.map((x) => x.textContent).join('|'))) === 'Guide|Pointillés|Tout seul' && (await tb.page.$$eval('.step-num', (n) => n.map((x) => x.textContent).join(''))) === '123');
  check('tableau : le sous-titre explique les trois étapes', /trois étapes/.test(await tb.page.innerText('.bar-title p')));
  check('tableau : aucune erreur', tb.errs.length === 0, tb.errs.join(' | '));
  await tb.ctx.close();
  // Écran de paysage peu haut : la feuille du tableau reste grande et les outils tiennent sans défiler
  const court = await open((x) => { x.settings.demo = true; x.settings.accueilFait = true; }, 'tableau', { width: 1024, height: 520 });
  const dims = await court.page.evaluate(() => { const p = document.querySelector('.board-host').getBoundingClientRect(), s = document.querySelector('.side'); return { h: Math.round(p.height), w: Math.round(p.width), scroll: s.scrollHeight - s.clientHeight }; });
  check('paysage court : la feuille du tableau fait presque toute la hauteur (≥ 85 %)', dims.h >= 520 * 0.85, JSON.stringify(dims));
  check('paysage court : les outils tiennent sans défiler', dims.scroll <= 2, JSON.stringify(dims));
  await court.ctx.close();
  const op = await open((x) => { x.settings.accueilFait = true; }, 'options');
  await op.page.getByRole('radio', { name: 'Fin', exact: true }).click();
  await op.page.waitForTimeout(800);
  check('épaisseur : le choix « Fin » est enregistré depuis Options', (await op.state()).settings.trait === 'fin');
  await op.ctx.close();
}

// 5g. Séries : annonce, numéros, fête de fin de série, série suivante, petit dessin
{
  const { LEVELS } = await import(`${process.cwd()}/src/content/skills.js`);
  const prem = LEVELS[2].sections[0];
  const finie = (x) => { const t = Date.now(); for (const id of prem.skills) x.skills[id] = { sessions: 2, attempts: 6, phase: 3, mastered: true, masteredAt: t, last: t, history: [{ t, ph: 3, sc: 0.9, st: 3, c: {}, tg: [] }] }; };
  const base = (x) => { x.settings.accueilFait = true; x.settings.classe = 'cp2'; x.settings.depart = 3; x.settings.voix = false; };
  const txt = (p, sel) => p.$eval(sel, (e) => e.textContent.replace(/[  ]/g, ' ').trim());

  // première ouverture d'un niveau : le renard annonce le nombre de séries, les pastilles sont numérotées
  const m = await open((x) => base(x), 'carte-3');
  const n3 = LEVELS[2].sections.length;
  check(`séries : la carte dit « Série 1 sur ${n3} »`, (await txt(m.page, '.bar-title p')).startsWith(`Série 1 sur ${n3} ·`), await txt(m.page, '.bar-title p'));
  check('séries : les pastilles de séries sont numérotées', (await m.page.$$eval('.sec-chip .sc-i', (a) => a.map((e) => e.textContent).join(','))).startsWith('1,2,3,4'));
  check('séries : le renard annonce le nombre de séries la première fois', (await txt(m.page, '.b-text')).includes(`${n3} séries`), await txt(m.page, '.b-text'));
  check('séries : l’annonce est notée comme faite', (await m.state()).seen?.['serie-intro-3'] === true);
  await m.page.evaluate(() => { location.hash = 'niveaux'; }); await m.page.waitForTimeout(500);
  await m.page.evaluate(() => { location.hash = 'carte-3'; }); await m.page.waitForTimeout(700);
  check('séries : l’annonce n’est pas répétée', !(await txt(m.page, '.b-text')).includes('séries'), await txt(m.page, '.b-text'));
  await m.page.evaluate(() => { location.hash = 'niveaux'; }); await m.page.waitForTimeout(500);
  check('séries : les niveaux annoncent leur nombre de séries', (await m.page.$$eval('.lc-series', (a) => a.map((e) => e.textContent))).join('|') === `${LEVELS[0].sections.length} séries|5 séries|${n3} séries`);
  check('séries : aucune erreur (carte)', m.errs.length === 0, m.errs.join(' | '));
  await m.ctx.close();

  // série terminée mais pas encore fêtée : la carte mène à la fête, une seule fois
  const f = await open((x) => { base(x); finie(x); x.series = { '3:premiers': { t: Date.now(), vu: false } }; x.seen = { 'serie-intro-3': true }; }, 'carte-3');
  await f.page.waitForTimeout(900);
  check('séries : la carte ouvre la fête d’une série terminée', (await f.hash()) === '#serie-3-0', await f.hash());
  check('séries : la fête nomme la série', (await txt(f.page, '.serie-end h2')) === 'Bravo ! Tu as fini la série « Mes premiers mots » !', await txt(f.page, '.serie-end h2'));
  check('séries : la fête montre les mots appris', (await f.page.$$eval('.se-words li', (a) => a.map((e) => e.textContent.trim()).join(' '))) === 'il la le loi oie aile');
  check('séries : la fête montre toutes les séries en pastilles, la 1re finie', (await f.page.$$eval('.se-dot', (a) => a.length)) === n3 && (await f.page.$$eval('.se-dot.on', (a) => a.length)) === 1);
  check('séries : la fête dit 1 série terminée sur N', (await txt(f.page, '.se-left')) === `1 série terminée sur ${n3}`, await txt(f.page, '.se-left'));
  check('séries : la fête tient dans la fenêtre', await f.page.evaluate(() => { const c = document.querySelector('.serie-end .result-card').getBoundingClientRect(); return c.top >= 0 && c.bottom <= innerHeight; }));
  check('séries : la fête est notée comme vue', (await f.state()).series['3:premiers'].vu === true);
  await f.page.waitForTimeout(5200); // la mise en valeur du bouton est finie
  await f.page.evaluate(() => { location.hash = 'carte-3-0'; }); await f.page.waitForTimeout(700);
  check('séries : une fois vue, la fête ne revient pas', (await f.hash()) === '#carte-3-0', await f.hash());
  await f.page.evaluate(() => { location.hash = 'serie-3-0'; }); await f.page.waitForTimeout(900);
  await f.page.click('.se-next'); await f.page.waitForTimeout(700);
  check('séries : « Série suivante » ouvre la série 2', (await f.hash()) === '#carte-3-1', await f.hash());
  check('séries : aucune erreur (fête)', f.errs.length === 0, f.errs.join(' | '));
  await f.ctx.close();

  // un petit dessin pour fêter ça : le tableau s'ouvre sur la feuille à dessiner, avec le calque suivant
  const d = await open((x) => { base(x); finie(x); x.series = { '3:premiers': { t: Date.now(), vu: true } }; x.seen = { 'serie-intro-3': true }; }, 'serie-3-0');
  await d.page.waitForTimeout(500);
  await d.page.click('.se-draw'); await d.page.waitForTimeout(1200);
  check('séries : « Un petit dessin » ouvre le tableau', (await d.hash()) === '#tableau', await d.hash());
  check('séries : le tableau est sur la feuille à dessiner', (await d.page.$eval('.ms-btn[data-view="dessiner"]', (b) => b.classList.contains('on'))) && (await d.page.$eval('.tableau', (r) => r.dataset.view)) === 'dessiner');
  check('séries : un dessin est proposé (calque à suivre)', !!(await d.page.$('.cal-model')) || (await txt(d.page, '.b-text')).startsWith('Une idée'), await txt(d.page, '.b-text'));
  check('séries : l’idée du dessin avance dans la suite', (await d.state()).settings.dessinVu !== '');
  await d.page.evaluate(() => { location.hash = 'accueil'; }); await d.page.waitForTimeout(600);
  await d.page.evaluate(() => { location.hash = 'tableau'; }); await d.page.waitForTimeout(900);
  check('séries : l’ouverture sur le dessin ne vaut qu’une fois', (await d.page.$eval('.tableau', (r) => r.dataset.view)) === 'ecrire');
  check('séries : aucune erreur (dessin)', d.errs.length === 0, d.errs.join(' | '));
  await d.ctx.close();

  // petit écran de tablette en paysage
  const c = await open((x) => { base(x); finie(x); x.series = { '3:premiers': { t: Date.now(), vu: false } }; x.seen = { 'serie-intro-3': true }; }, 'serie-3-0', { width: 1024, height: 520 });
  await c.page.waitForTimeout(600);
  check('séries : la fête tient dans un paysage court (1024×520)', await c.page.evaluate(() => { const r = document.querySelector('.serie-end .result-card').getBoundingClientRect(), b = document.querySelector('.se-next').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && b.bottom <= innerHeight; }));
  await c.ctx.close();

  // enchaînement automatique : si rien ne bouge la carte de la série suivante s'ouvre ; un toucher l'annule ; les parents peuvent le couper ; pas à la fin d'un niveau
  {
    const fete = (mut) => open((x) => { base(x); finie(x); x.series = { '3:premiers': { t: Date.now(), vu: false } }; x.seen = { 'serie-intro-3': true }; mut?.(x); }, 'serie-3-0');
    const A = await fete(), T = await fete(), O = await fete((x) => { x.settings.serieAuto = false; }), F = await fete((x) => { for (const id of LEVELS[2].skills) x.skills[id] = x.skills[prem.skills[0]]; });
    await A.page.waitForTimeout(11000);
    check('enchaînement : une barre se remplit sur « Série suivante » quand rien ne bouge', !!(await A.page.$('.serie-end .se-next .se-count')) && !!(await A.page.$('.se-auto')));
    check('enchaînement : pas de barre quand les parents l’ont coupé', !(await O.page.$('.se-count')));
    check('enchaînement : pas de barre à la fin d’un niveau', !(await F.page.$('.se-count')) && (await txt(F.page, '.serie-end h2')).includes('tout le niveau'));
    await T.page.mouse.click(30, 30);
    check('enchaînement : un toucher annule la barre', !(await T.page.$('.se-count')) && !(await T.page.$('.se-auto')));
    await A.page.waitForTimeout(9000);
    check('enchaînement : si rien ne bouge, la série suivante s’ouvre toute seule', (await A.hash()) === '#carte-3-1', await A.hash());
    check('enchaînement : aucun exercice ne démarre tout seul', !(await A.hash()).startsWith('#exercice'));
    check('enchaînement : après un toucher, on reste sur la fête', (await T.hash()) === '#serie-3-0', await T.hash());
    check('enchaînement : coupé par les parents, on reste sur la fête', (await O.hash()) === '#serie-3-0', await O.hash());
    check('enchaînement : à la fin d’un niveau, on reste sur la fête', (await F.hash()) === '#serie-3-0', await F.hash());
    check('enchaînement : aucune erreur', [A, T, O, F].every((z) => z.errs.length === 0), [A, T, O, F].flatMap((z) => z.errs).join(' | '));
    for (const z of [A, T, O, F]) await z.ctx.close();
  }

  // une série pas finie ne se fête pas
  const p = await open((x) => { base(x); x.seen = { 'serie-intro-3': true }; }, 'serie-3-0');
  await p.page.waitForTimeout(700);
  check('séries : pas de fête pour une série pas finie', (await p.hash()) === '#carte-3', await p.hash());
  await p.ctx.close();
}

// 5h. Jeux et dictée, difficulté qui monte, avis des parents sur le papier
{
  const txt = (page, sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => '');
  const prete = (page) => page.waitForFunction(() => document.querySelector('.dictee-end') || (document.querySelector('.board') && !document.querySelector('.board').classList.contains('locked')), null, { timeout: 30000 }).then(() => true, () => false);

  // l'accueil mène aux jeux ; la dictée est jouable quand l'enfant a déjà écrit quelque chose, grisée sinon
  const a = await open(null, 'accueil');
  check('jeux : le bouton « Jeux » est sur l’accueil', (await buttons(a.page, '.home-nav .nav')).some((t) => /Jeux/.test(t)));
  await clickText(a.page, 'Jeux', '.home-nav button');
  await a.page.waitForTimeout(500);
  check('jeux : le bouton ouvre le menu des jeux', (await a.hash()) === '#jeux', await a.hash());
  check('jeux : la dictée est proposée à un enfant qui a déjà écrit', !!(await a.page.$('.jeu-card[data-jeu="dictee"]:not(.off)')));
  check('jeux : aucune erreur', a.errs.length === 0, a.errs.join(' | '));
  await a.ctx.close();

  const v = await open((x) => { x.skills = {}; x.series = {}; }, 'jeux');
  check('jeux : sans exercice, la dictée est grisée', !!(await v.page.$('.jeu-card[data-jeu="dictee"].off')));
  await v.page.click('.jeu-card.off', { force: true });
  await v.page.waitForTimeout(400);
  check('jeux : toucher une dictée grisée ne l’ouvre pas', (await v.hash()) === '#jeux', await v.hash());
  await v.page.evaluate(() => { location.hash = '#accueil'; });
  await v.page.waitForTimeout(300);
  await v.page.evaluate(() => { location.hash = '#dictee'; });
  await v.page.waitForTimeout(600);
  check('dictée : sans exercice à dicter, on revient aux jeux', (await v.hash()) === '#jeux', await v.hash());
  await v.ctx.close();
  const m = await open((x) => { x.settings.voix = false; }, 'dictee');
  await m.page.waitForTimeout(500);
  check('dictée : sans la voix du renard, on revient aux jeux', (await m.hash()) === '#jeux', await m.hash());
  check('jeux : sans voix, la carte dit pourquoi', /Remets la voix/.test(await txt(m.page, '.jeu-card[data-jeu="dictee"] .jc-note')));
  await m.ctx.close();

  // une dictée : consigne dite mais jamais écrite, cahier sans modèle ni point de départ, « Passer » ne note rien
  const d = await open(null, 'dictee');
  const avant = JSON.stringify((await d.state()).skills);
  check('dictée : le cahier est en mode « tout seul »', (await d.page.getAttribute('.board', 'data-phase')) === '2');
  const nbPoints = await d.page.$$eval('.dc-dot', (a) => a.length);
  check('dictée : un point par exercice', nbPoints >= 2 && nbPoints <= 5, String(nbPoints));
  const bulle = await txt(d.page, '.b-text');
  check('dictée : la bulle ne montre pas la réponse', /Écoute bien/.test(bulle) && !/Écris/.test(bulle), bulle);
  const depart = await d.page.evaluate(() => [...document.querySelectorAll('.board .gs .start')].every((e) => getComputedStyle(e).display === 'none'));
  check('dictée : aucun point de départ affiché', depart);
  check('dictée : le renard a fini de parler, le cahier s’ouvre', await prete(d.page));
  const modelHidden = await d.page.evaluate(() => !document.querySelector('.board').classList.contains('show-model'));
  check('dictée : le modèle n’est pas montré avant l’essai', modelHidden);
  for (let k = 0; k < nbPoints; k++) { await d.page.click('.dc-skip'); await d.page.waitForTimeout(500); if (k < nbPoints - 1) await prete(d.page); }
  await d.page.waitForSelector('.dictee-end', { timeout: 15000 }).catch(() => {});
  check('dictée : tout passé, un mot doux et pas de bilan', /autre fois/.test(await txt(d.page, '.dictee-end h2')) && !(await d.page.$('.dc-recap')), await txt(d.page, '.dictee-end h2'));
  const apres = await d.state();
  check('dictée : passer ne note rien', JSON.stringify(apres.dictees || {}) === '{}');
  check('dictée : les exercices acquis ne bougent pas', JSON.stringify(apres.skills) === avant);
  await clickText(d.page, 'Les jeux');
  await d.page.waitForTimeout(500);
  check('dictée : « Les jeux » ramène au menu', (await d.hash()) === '#jeux', await d.hash());
  check('dictée : aucune erreur', d.errs.length === 0, d.errs.join(' | '));
  await d.ctx.close();

  // la difficulté qui monte : trois nouveaux exercices acquis sans un raté → le suivant commence aux pointillés
  const phase = async (mutate) => {
    const z = await open(mutate, 'exercice-a');
    await z.page.waitForSelector('.board', { timeout: 15000 });
    const r = { ph: await z.page.getAttribute('.board', 'data-phase'), feuilles: await z.page.$$eval('.phase.past', (x) => x.length), errs: z.errs };
    await z.ctx.close();
    return r;
  };
  const E = await phase((x) => { x.aisance = ['x', 'e', 'e', 'e']; });
  const N = await phase(null);
  const X = await phase((x) => { x.aisance = ['e', 'e', 'x']; });
  const C = await phase((x) => { x.aisance = ['e', 'e', 'e']; x.settings.montee = false; });
  const Dm = await phase((x) => { x.aisance = ['e', 'e', 'e']; x.settings.demo = true; });
  const Df = await phase((x) => { x.aisance = ['e', 'e', 'e', 'e', 'e', 'e']; });
  check('difficulté : très à l’aise, défi « tout seul » d’emblée', Df.ph === '2' && Df.feuilles === 2, JSON.stringify(Df));
  check('difficulté : à l’aise, un nouvel exercice commence aux pointillés', E.ph === '1' && E.feuilles === 1, JSON.stringify(E));
  check('difficulté : sans aisance, il commence par le guide', N.ph === '0' && N.feuilles === 0, JSON.stringify(N));
  check('difficulté : un seul raté et tout redevient comme avant', X.ph === '0', JSON.stringify(X));
  check('difficulté : coupée par les parents, on commence par le guide', C.ph === '0', JSON.stringify(C));
  check('difficulté : en démonstration, on commence par le guide', Dm.ph === '0', JSON.stringify(Dm));
  check('difficulté : aucune erreur', [E, N, X, C, Dm].every((r) => r.errs.length === 0), [E, N, X, C, Dm].flatMap((r) => r.errs).join(' | '));

  // « Comment ça marche » avant le premier exercice lancé avec Jouer ; puis plus jamais. Papier : le cahier de vacances se prépare.
  const mt = await open((x) => { x.settings.accueilFait = true; x.settings.methodeVue = false; x.settings.demo = false; });
  await mt.page.click('.home-panel .btn-big');
  await mt.page.waitForTimeout(800);
  check('démarche : « Jouer » montre d’abord les trois étapes', (await mt.hash()).startsWith('#methode-'), await mt.hash());
  check('démarche : un seul cahier qui passe par les trois étapes', (await mt.page.$$('.mt-one svg.board')).length === 1 && (await mt.page.$$('.mt-pill')).length === 3);
  check('démarche : tout tient sur une page, sans défiler', await mt.page.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 1));
  check('démarche : les conditions de réussite et les six règles pour les parents', (await mt.page.$$('.mt-cond dt')).length === 4 && (await mt.page.$$('.mt-crit li')).length === 6);
  await mt.page.click('.mt-actions .btn-big');
  await mt.page.waitForTimeout(800);
  check('démarche : « C’est parti » enchaîne sur l’exercice', (await mt.hash()).startsWith('#exercice-'), await mt.hash());
  await mt.page.evaluate(() => { location.hash = 'accueil'; });
  await mt.page.waitForTimeout(800);
  await mt.page.click('.home-panel .btn-big');
  await mt.page.waitForTimeout(800);
  check('démarche : la deuxième fois, « Jouer » va droit à l’exercice', (await mt.hash()).startsWith('#exercice-'), await mt.hash());
  await mt.page.evaluate(() => { location.hash = 'papier'; });
  await mt.page.waitForSelector('.papier .pcard');
  const [dlv] = await Promise.all([mt.page.waitForEvent('download', { timeout: 60000 }).catch(() => null), mt.page.click('.pp-go')]);
  check('papier : le cahier de vacances se prépare sans passer par l’espace parents', !!dlv && /cahier-de-vacances/.test(dlv.suggestedFilename()), dlv?.suggestedFilename());
  check('démarche et papier : aucune erreur', mt.errs.length === 0, mt.errs.join(' | '));
  check('page de travail : aucune récompense annoncée pendant l’effort', !/À gagner|Gagné :/.test(await mt.page.evaluate(() => { location.hash = 'exercice-ronds'; return new Promise((r) => setTimeout(() => r(document.body.innerText), 1500)); })));
  const sp = await open((x) => { x.settings.voix = true; for (const id of ['i', 'o', 'a', 'maj_I', 'maj_L']) x.skills[id] = { ...(x.skills[id] || {}), sessions: 1, attempts: 3, phase: 3, mastered: true, masteredAt: Date.now() - 3 * 864e5, last: Date.now() - 3 * 864e5, history: [] }; }, 'dictee-surprise');
  await sp.page.waitForTimeout(1500);
  check('dictée surprise : trois éléments seulement', (await sp.page.$$('.dc-dots > *')).length === 3, String((await sp.page.$$('.dc-dots > *')).length));
  check('dictée surprise : aucune erreur', sp.errs.length === 0, sp.errs.join(' | '));
  await sp.ctx.close();
  await mt.ctx.close();

  // espace parents : réglage, avis sur le papier, dictées
  const p = await open(null, 'parents');
  await p.page.focus('.gate-btn'); await p.page.keyboard.press('Enter'); await p.page.waitForTimeout(500);
  check('parents : le réglage de la difficulté qui monte existe, actif par défaut', await p.page.$eval('#set-montee', (e) => e.checked === true || e.getAttribute('aria-checked') === 'true').catch(() => false));
  const nb = await p.page.$$eval('.paper-row .avis-btn', (a) => a.length);
  check('parents : trois avis possibles sur chaque essai papier', nb >= 3 && nb % 3 === 0, String(nb));
  await clickText(p.page, 'À retravailler', '.avis-btn');
  await p.page.waitForTimeout(300);
  let st = await p.state();
  check('parents : « À retravailler » est enregistré', st.skills.i.paper.avis === 'encore' && st.skills.i.paper.avisAt > 0, JSON.stringify(st.skills.i.paper));
  check('parents : le bouton choisi est marqué', await p.page.$eval('.paper-row .avis-btn[data-avis="encore"]', (e) => e.getAttribute('aria-pressed') === 'true'));
  await clickText(p.page, 'Réussi facilement', '.avis-btn');
  await p.page.waitForTimeout(300);
  st = await p.state();
  check('parents : on peut changer d’avis', st.skills.i.paper.avis === 'facile', st.skills.i.paper.avis);
  check('parents : sans dictée, la carte l’explique', /Pas encore de dictée/.test(await p.page.innerText('body')));
  check('parents : aucune erreur', p.errs.length === 0, p.errs.join(' | '));
  await p.ctx.close();
  const q = await open((x) => { x.dictees = { i: { n: 2, best: 3, last: 1, t: Date.now() }, o: { n: 1, best: 3, last: 3, t: Date.now() - 1000 } }; }, 'parents');
  await q.page.focus('.gate-btn'); await q.page.keyboard.press('Enter'); await q.page.waitForTimeout(500);
  const lignes = await q.page.$$eval('.dict-row', (a) => a.map((e) => e.innerText.replace(/\s+/g, ' ')));
  check('parents : les dictées sont listées, la plus récente d’abord', lignes.length === 2 && /à revoir/.test(lignes[0]) && !/à revoir/.test(lignes[1]), JSON.stringify(lignes));
  check('parents : aucune erreur (dictées)', q.errs.length === 0, q.errs.join(' | '));
  await q.ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} échec(s)` : '\nTout est OK');
process.exit(fails ? 1 : 0);
