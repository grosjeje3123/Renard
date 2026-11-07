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

async function open(mutate, route = 'accueil') {
  const st = JSON.parse(JSON.stringify(SEED));
  mutate?.(st);
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
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
  const { DESSINS, IDEES_LIBRES } = await import(`${process.cwd()}/src/content/dessins.js`);
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
  const withModel = deb.out.filter((o) => o.card);
  check('modèles : la vignette apparaît avec un modèle, pas avec une idée libre', withModel.length > 5 && deb.out.filter((o) => !o.card).every((o) => libres.has(o.text)), `${withModel.length}/40 avec modèle`);
  check('calque : le modèle est tracé sur la feuille dès le départ', withModel.every((o) => o.calque > 0));
  check('modèles : la difficulté est affichée (★☆☆ Facile)', withModel.every((o) => /^★☆☆ Facile$/.test(o.level)), withModel[0]?.level);
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
    await s.page.evaluate(() => { location.hash = 'accueil'; }); await s.page.waitForTimeout(700);
    check('galerie fermée : pas de bouton Galerie dans le menu', !(await buttons(s.page, '.home-nav button')).some((t) => /Galerie/.test(t)));
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
    await s.page.evaluate(() => { location.hash = 'accueil'; }); await s.page.waitForTimeout(700);
    check('galerie ouverte : le menu propose « Galerie »', (await buttons(s.page, '.home-nav button')).some((t) => /Galerie/.test(t)));
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
    check('dessiner : le choix de calque propose la feuille blanche et tous les dessins', (await s.page.$$eval('.mp-card', (a) => a.length)) === 1 + 15);
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
    check('première ouverture : le menu propose le Tableau', (await buttons(s.page, '.home-nav button')).some((t) => /Tableau/.test(t)));
    await s.page.click('.home-nav button:has-text("Tableau")'); await s.page.waitForTimeout(800);
    check('première ouverture : le Tableau s’ouvre', (await s.hash()) === '#tableau' && !!(await s.page.$('.tableau-board')));
    check('première ouverture : aucune erreur', s.errs.length === 0, s.errs.join(' | '));
    await s.ctx.close();
  }
  // classe de l'enfant : niveau de départ
  {
    const s = await open((st) => { st.settings.depart = 3; }, 'carte-3-0');
    const nbOuverts = await s.page.$$eval('.node:not(.locked):not(.free)', (a) => a.length);
    check('classe « fin du CP » : tous les mots du début sont ouverts sans avoir essayé de lettres', nbOuverts === 6, String(nbOuverts));
    await s.page.evaluate(() => { location.hash = 'accueil'; }); await s.page.waitForTimeout(700);
    check('classe « fin du CP » : le menu propose le Tableau', (await buttons(s.page, '.home-nav button')).some((t) => /Tableau/.test(t)));
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
  await s.page.click('[data-main=droite]'); await s.page.waitForTimeout(700);
  await s.page.click('.wl-body .btn-big'); await s.page.waitForTimeout(800);
  let st = await s.state();
  check('présentation : prénom nettoyé, classe et main enregistrés', st.name === 'Léa-Rose' && st.settings.classe === 'gs' && st.settings.depart === 1 && st.settings.main === 'droite' && st.settings.accueilFait === true, JSON.stringify({ n: st.name, c: st.settings.classe, d: st.settings.depart }));
  check('présentation : on arrive à l’accueil', (await s.hash()) === '#accueil');
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
  const ouverts = await g.page.$$eval('.node:not(.locked)', (a) => a.map((n) => n.textContent.trim()));
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
}

await browser.close();
console.log(fails ? `\n${fails} échec(s)` : '\nTout est OK');
process.exit(fails ? 1 : 0);
