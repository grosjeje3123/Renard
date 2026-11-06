// Vérifie que le renard lit ses consignes à voix haute sans que l'enfant ait à toucher le haut-parleur,
// et qu'un avis apparaît pour les adultes quand la tablette n'a aucune voix française.
// Usage : node build.mjs --app && node tools/voix-auto.mjs
import { createRequire } from 'module';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch();
let fails = 0;
const check = (label, ok, info = '') => { console.log(`${ok ? 'OK  ' : 'ÉCHEC'} ${label}${info ? ' — ' + info : ''}`); if (!ok) fails++; };

async function open(voices) {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((list0) => {
    window.__spoken = [];
    const list = list0.map(([name, lang, local]) => ({ name, lang, localService: local, default: false, voiceURI: name }));
    const synth = { speaking: false, pending: false, paused: false, getVoices: () => list,
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 20); }, cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  }, voices);
  await page.goto('file://' + process.cwd() + '/www/index.html#accueil');
  await page.waitForTimeout(3200);
  return { ctx, page, errors, spoken: () => page.evaluate(() => window.__spoken.slice()), reset: () => page.evaluate(() => { window.__spoken.length = 0; }) };
}
const navTo = async (s, label) => { await s.page.click(`.home-nav button:has-text("${label}")`); await s.page.waitForTimeout(900); };
const noticeShown = (s) => s.page.evaluate(() => { const n = document.querySelector('.voice-notice'); return !!n && !n.hidden; });

// 1. Tablette sans voix française : l'avis apparaît, « Compris » le range pour de bon
{
  const s = await open([['Samantha', 'en-US', true]]);
  check('sans voix française : l’avis pour les adultes est affiché', await noticeShown(s));
  await s.page.click('.voice-notice button:has-text("Compris")'); await s.page.waitForTimeout(300);
  check('« Compris » range l’avis', !(await noticeShown(s)));
  await s.page.reload(); await s.page.waitForTimeout(3200);
  check('l’avis ne revient pas après « Compris »', !(await noticeShown(s)));
  check('sans voix : aucune erreur', s.errors.length === 0, s.errors.join(' | '));
  await s.ctx.close();
}

// 2. Avec une voix française : pas d'avis, et les consignes sont lues d'elles-mêmes
{
  const s = await open([['Thomas', 'fr-FR', true], ['Amélie (Premium)', 'fr-FR', true]]);
  check('avec une voix française : pas d’avis', !(await noticeShown(s)));
  await s.page.click('.home .home-fox'); await s.page.waitForTimeout(300); // un premier toucher, comme un enfant
  await s.reset(); await navTo(s, 'Niveaux');
  const n1 = await s.spoken();
  check('Niveaux : « Où est-ce qu’on va » est lu à la première visite', n1.some((x) => /Où est-ce qu’on va/.test(x)), JSON.stringify(n1).slice(0, 100));
  await s.page.evaluate(() => { location.hash = 'accueil'; }); await s.page.waitForTimeout(500);
  await s.reset(); await navTo(s, 'Niveaux');
  const n2 = await s.spoken();
  check('Niveaux : pas répété à la visite suivante', !n2.some((x) => /Où est-ce qu’on va/.test(x)), JSON.stringify(n2).slice(0, 100));
  await s.page.evaluate(() => { location.hash = 'accueil'; }); await s.page.waitForTimeout(500);
  await s.reset(); await navTo(s, 'Tableau');
  const t1 = await s.spoken();
  check('Tableau (écrire) : la consigne est lue à voix haute', t1.some((x) => /^Écris « .+ » : suis la première ligne/.test(x)), JSON.stringify(t1).slice(0, 120));
  await s.reset();
  await s.page.click('.mode-switch button:has-text("Dessiner"), button:has-text("Dessiner")'); await s.page.waitForTimeout(700);
  const t2 = await s.spoken();
  check('Tableau (dessiner) : l’idée est lue une seule fois', t2.filter((x) => /dessine|Dessine/.test(x)).length === 1, JSON.stringify(t2).slice(0, 160));
  check('avec voix : aucune erreur', s.errors.length === 0, s.errors.join(' | '));
  await s.ctx.close();
}
await browser.close();
console.log(fails ? `\n${fails} échec(s)` : '\nTout est OK');
process.exit(fails ? 1 : 0);
