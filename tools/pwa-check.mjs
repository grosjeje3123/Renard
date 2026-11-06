// Vérifie la version installable (pwa/) : manifest et icônes valides, installable, démarrage sans réseau,
// aucune requête hors de son propre hébergement, plein écran proposé dans l'espace parents.
// Usage : node build.mjs --pwa && node tools/pwa-check.mjs
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let f = path.join('pwa', decodeURIComponent(url.pathname));
  if (url.pathname.endsWith('/')) f = path.join(f, 'index.html');
  if (!f.startsWith('pwa') || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://localhost:${server.address().port}`;
const ok = [], ko = [];
const check = (name, cond, detail = '') => (cond ? ok : ko).push(`${name}${detail ? ' — ' + detail : ''}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const page = await ctx.newPage();
const requested = [];
page.on('request', (r) => { if (!/^(data|blob):/.test(r.url())) requested.push(r.url()); });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { window.__viol = []; document.addEventListener('securitypolicyviolation', (e) => window.__viol.push(`${e.violatedDirective} ${e.blockedURI}`)); });
await page.goto(`${origin}/#accueil`);
await page.waitForSelector('#app *');
await page.waitForFunction(() => navigator.serviceWorker?.controller || false, null, { timeout: 15000 }).catch(async () => {
  await page.reload(); // la première visite n'est pas contrôlée : le service worker prend la main dès la suivante
});
await page.waitForFunction(() => navigator.serviceWorker?.controller || false, null, { timeout: 15000 });
check('service worker actif et contrôle la page', true);

// 1. Manifest et installabilité (mêmes critères que Chrome)
const cdp = await ctx.newCDPSession(page);
const man = await cdp.send('Page.getAppManifest');
check('manifest lu sans erreur', !man.errors.length, JSON.stringify(man.errors));
const m = JSON.parse(man.data);
check('nom, nom court, langue', m.name && m.short_name === 'Renard' && m.lang === 'fr');
check('plein écran demandé', m.display === 'fullscreen' && m.display_override?.includes('standalone'));
check('icônes 192, 512 et masquable', ['192x192', '512x512'].every((s) => m.icons.some((i) => i.sizes === s)) && m.icons.some((i) => i.purpose === 'maskable'));
const inst = await cdp.send('Page.getInstallabilityErrors');
check('installable (aucune erreur Chrome)', !inst.installabilityErrors.length, JSON.stringify(inst.installabilityErrors));
for (const i of m.icons) {
  const resp = await ctx.request.get(new URL(i.src, origin).href); // hors page : la page elle-même n'a pas le droit de fetch
  const b = await resp.body();
  const r = [resp.status(), b.readUInt32BE(16), b.readUInt32BE(20)];
  check(`icône ${i.src}`, r[0] === 200 && `${r[1]}x${r[2]}` === i.sizes, r.join('/'));
}
const meta = await page.evaluate(() => ({
  apple: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content,
  touch: document.querySelector('link[rel="apple-touch-icon"]')?.href,
  vp: document.querySelector('meta[name="viewport"]')?.content,
}));
check('iPad : mode application + icône', meta.apple === 'yes' && /apple-touch-icon\.png$/.test(meta.touch || ''), JSON.stringify(meta));

// 2. Vie privée : la page ne peut rien envoyer ailleurs
const attempts = await page.evaluate(async () => {
  const out = {};
  try { await fetch('https://example.com/collect?x=1'); out.fetch = 'PASSÉ'; } catch { out.fetch = 'bloqué'; }
  out.img = await new Promise((res) => { const i = new Image(); i.onload = () => res('PASSÉ'); i.onerror = () => res('bloqué'); i.src = 'https://example.com/pixel.png'; });
  try { await fetch('/index.html'); out.memeOrigine = 'passé'; } catch { out.memeOrigine = 'bloqué'; }
  return out;
});
check('fetch et image vers un autre site bloqués par la CSP', attempts.fetch === 'bloqué' && attempts.img === 'bloqué', JSON.stringify(attempts));
// (connect-src 'none' : même son propre hébergement est refusé à la page ; seul le service worker relit les fichiers)
check('la page ne peut pas non plus appeler son propre hébergement', attempts.memeOrigine === 'bloqué', JSON.stringify(attempts));

// 3. Démarrage sans réseau
await ctx.setOffline(true);
await page.goto(`${origin}/#accueil`);
await page.waitForSelector('#app *', { timeout: 8000 });
const txt = await page.evaluate(() => document.body.innerText.slice(0, 200));
check('démarre sans réseau (accueil affiché)', /Renard|jouer|explor|Salut|Bonjour|écri/i.test(txt), txt.replace(/\s+/g, ' ').slice(0, 90));
const sw = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
check('servi par le service worker hors connexion', /sw\.js$/.test(sw || ''), sw);
await ctx.setOffline(false);

// 4. Parcours rapide + espace parents : carte « Affichage » et plein écran
await page.evaluate(() => { window.__viol.length = 0; });
for (const r of ['niveaux', 'carte-1', 'exercice-lignes', 'tableau', 'parents']) { await page.evaluate((h) => { location.hash = h; }, r); await page.waitForTimeout(500); }
const gate = await page.$('.gate-btn'); const bb = await gate.boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up(); await page.waitForTimeout(700);
const card = await page.evaluate(() => { const c = [...document.querySelectorAll('.pcard')].find((x) => /^Affichage/.test(x.querySelector('h3')?.textContent || '')); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
check('carte « Affichage » dans l’espace parents', !!card, card?.slice(0, 120));
const btn = await page.evaluateHandle(() => [...document.querySelectorAll('.pcard button')].find((x) => /plein écran/i.test(x.textContent)));
const hasBtn = !!(await btn.asElement());
check('bouton « Passer en plein écran »', hasBtn);
if (hasBtn) {
  await btn.asElement().click(); await page.waitForTimeout(600);
  const fs1 = await page.evaluate(() => !!document.fullscreenElement);
  const label = await btn.asElement().evaluate((b) => b.textContent.trim());
  check('plein écran activé au toucher', fs1 && /Quitter/.test(label), `${fs1} / ${label}`);
  await btn.asElement().click(); await page.waitForTimeout(600);
  check('plein écran quitté au second toucher', !(await page.evaluate(() => !!document.fullscreenElement)));
}
const viol = await page.evaluate(() => window.__viol);
check('aucune violation de CSP pendant le parcours', viol.length === 0, JSON.stringify(viol));
const foreign = requested.filter((u) => !u.startsWith(origin) && !/example\.com/.test(u));
check('aucune requête hors de l’hébergement (hors les essais bloqués)', foreign.length === 0, JSON.stringify(foreign));
check('aucune erreur de page', errors.length === 0, errors.join(' | '));

// 5. Installée : la carte l'annonce
const ctx2 = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const p2 = await ctx2.newPage();
await p2.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { value: true }); });
await p2.goto(`${origin}/#parents`);
await p2.waitForSelector('.gate-btn'); const g2 = await (await p2.$('.gate-btn')).boundingBox();
await p2.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2); await p2.mouse.down(); await p2.waitForTimeout(2400); await p2.mouse.up(); await p2.waitForTimeout(700);
const inst2 = await p2.evaluate(() => [...document.querySelectorAll('.pcard')].find((x) => /^Affichage/.test(x.querySelector('h3')?.textContent || ''))?.innerText.replace(/\s+/g, ' '));
check('installée : « s’ouvre déjà sans barre de navigateur »', /s’ouvre déjà sans barre/.test(inst2 || ''), inst2);

await browser.close(); server.close();
console.log(ok.map((s) => '✔ ' + s).join('\n'));
if (ko.length) console.log(ko.map((s) => '✘ ' + s).join('\n'));
console.log(ko.length ? `RÉSULTAT : ${ko.length} problème(s)` : 'RÉSULTAT : OK');
process.exit(ko.length ? 1 : 0);
