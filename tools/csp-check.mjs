// Vérifie que la version « application » (www/index.html) ne peut contacter aucun serveur,
// et qu'un parcours complet de l'application ne déclenche aucune violation de la politique.
// Usage : node build.mjs --app && node tools/csp-check.mjs
import { createRequire } from 'module';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const page = await ctx.newPage();
const requests = [], failed = {};
page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) requests.push(r.url()); });
page.on('requestfailed', (r) => { failed[r.url()] = r.failure()?.errorText; });
const consoleCsp = [];
page.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) consoleCsp.push(m.text().slice(0, 140)); });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
await page.addInitScript(() => { window.__viol = []; document.addEventListener('securitypolicyviolation', (e) => window.__viol.push(`${e.violatedDirective} ${e.blockedURI}`)); });
await page.goto('file://' + process.cwd() + '/www/index.html#accueil');
await page.waitForTimeout(600);
const csp = await page.evaluate(() => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content);
console.log('CSP présente :', !!csp);
// 1. Les tentatives de connexion sont bloquées
const attempts = await page.evaluate(async () => {
  const out = {};
  try { await fetch('https://example.com/collect?x=1'); out.fetch = 'PASSÉ'; } catch { out.fetch = 'bloqué'; }
  try { out.xhr = await new Promise((res) => { const x = new XMLHttpRequest(); x.open('GET', 'https://example.com/'); x.onload = () => res('PASSÉ'); x.onerror = () => res('bloqué'); x.send(); }); } catch { out.xhr = 'bloqué'; }
  try { out.ws = await new Promise((res) => { try { const w = new WebSocket('wss://example.com/'); w.onopen = () => res('PASSÉ'); w.onerror = () => res('bloqué'); } catch { res('bloqué'); } }); } catch { out.ws = 'bloqué'; }
  out.img = await new Promise((res) => { const i = new Image(); i.onload = () => res('PASSÉ'); i.onerror = () => res('bloqué'); i.src = 'https://example.com/pixel.png'; });
  out.beacon = navigator.sendBeacon?.('https://example.com/b', 'x') ? 'PASSÉ (file d’attente)' : 'bloqué';
  const s = document.createElement('script'); s.src = 'https://example.com/x.js'; out.script = await new Promise((res) => { s.onload = () => res('PASSÉ'); s.onerror = () => res('bloqué'); document.head.append(s); });
  return out;
});
console.log('tentatives :', JSON.stringify(attempts));
// 2. Un parcours normal ne viole rien
await page.evaluate(() => { window.__viol.length = 0; });
for (const r of ['niveaux', 'carte-1', 'carte-3', 'exercice-lignes', 'tresors', 'album', 'pause', 'fiche-herisson', 'cahier-i', 'dessin', 'parents']) {
  await page.evaluate((h) => { location.hash = h; }, r);
  await page.waitForTimeout(700);
}
const b = await page.$('.gate-btn'); const bb = await b.boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up(); await page.waitForTimeout(700);
await page.evaluate(() => [...document.querySelectorAll('.pcard button')].find((x) => /Voir et imprimer les cahiers/.test(x.textContent)).click());
await page.waitForTimeout(800);
await page.click('.pp-go'); // cahier tout prêt, embarqué dans l'application
await page.waitForTimeout(800);
await page.evaluate(() => { location.hash = 'parents'; });
await page.waitForTimeout(800);
await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Créer le code/.test(x.textContent)).click());
await page.waitForTimeout(500);
const viol = await page.evaluate(() => window.__viol);
console.log('requêtes échouées (raison) :', JSON.stringify(failed));
console.log('messages CSP de la console :', JSON.stringify(consoleCsp));
console.log('violations pendant un parcours normal (doit être vide) :', JSON.stringify(viol));
console.log('requêtes réseau réelles :', JSON.stringify(requests));
console.log('erreurs de page :', errors.length ? errors.join(' | ') : 'aucune');
const ok = csp && Object.values(attempts).every((v) => v.startsWith('bloqué') || v.startsWith('PASSÉ (file')) && viol.length === 0 && requests.every((u) => /csp/i.test(failed[u] || '')) && !errors.length;
console.log(ok ? 'RÉSULTAT : OK' : 'RÉSULTAT : À EXAMINER');
await browser.close();
process.exit(ok ? 0 : 1);
