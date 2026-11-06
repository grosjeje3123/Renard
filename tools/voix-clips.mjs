// Vérifie la lecture des voix enregistrées : un fichier voix/<id>.mp3 est joué à la place de la voix du système pour sa phrase,
// les autres phrases restent lues par la synthèse, et un fichier introuvable retombe sur la synthèse.
// Usage : node tools/voix-clips.mjs   (fabrique temporairement www/ avec un faux fichier audio, puis remet tout en l'état)
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { idPhrase } from '../src/core/voixId.js';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
let fails = 0;
const check = (label, ok, info = '') => { console.log(`${ok ? 'OK  ' : 'ÉCHEC'} ${label}${info ? ' — ' + info : ''}`); if (!ok) fails++; };

const id = idPhrase('Bonjour !');
const fake = `voix/${id}.mp3`;
const idB = idPhrase('Je m’appelle Renard.'); // déclaré dans la liste mais le fichier sera introuvable côté serveur : repli sur la voix du système
const fakeB = `voix/${idB}.mp3`;
const existait = fs.existsSync('voix');
fs.mkdirSync('voix', { recursive: true });
for (const f of [fake, fakeB]) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.4', '-ac', '1', '-b:a', '32k', f]);
execFileSync('node', ['build.mjs', '--app']);

const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); let f = path.join('www', decodeURIComponent(u.pathname));
  if (u.pathname.endsWith('/')) f = path.join(f, 'index.html');
  if (f.endsWith(`${idB}.mp3`) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  const buf = fs.readFileSync(f);
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'accept-ranges': 'bytes', 'cache-control': 'no-store', 'content-length': buf.length });
  res.end(buf);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('response', (r) => { if (/\.mp3/.test(r.url())) console.log('   [réseau]', r.status(), r.url().slice(-22)); });
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  window.__ev = [];
  const list = [{ name: 'Thomas', lang: 'fr-FR', localService: true, default: false, voiceURI: 'Thomas' }];
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, pending: false, paused: false, getVoices: () => list,
    speak(u) { window.__ev.push('synth: ' + u.text); setTimeout(() => u.onend && u.onend(), 20); }, cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {} } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { window.__ev.push('clip: ' + this.getAttribute('src')); return play.call(this); };
});
await page.goto(`${origin}/#accueil`); await page.waitForTimeout(900);
const csp = await page.evaluate(() => document.querySelector('meta[http-equiv="Content-Security-Policy"]').content);
check('la CSP autorise les fichiers audio du même hébergement, rien d’autre', /media-src 'self'/.test(csp) && /connect-src 'none'/.test(csp), csp.match(/media-src [^;]+/)?.[0]);
const dire = async () => { await page.evaluate(() => { window.__ev.length = 0; }); await page.click('.home .b-say'); await page.waitForTimeout(1800); return page.evaluate(() => window.__ev.slice()); };

const ev1 = await dire();
check('« Bonjour ! » est joué depuis le fichier enregistré', ev1[0] === `clip: voix/${id}.mp3`, JSON.stringify(ev1));
check('fichier introuvable : la phrase est lue par la voix du système', ev1[1] === `clip: voix/${idB}.mp3` && ev1[2] === 'synth: Je m’appelle Renard.', JSON.stringify(ev1.slice(1)));
check('la phrase sans fichier est lue par la voix du système, dans l’ordre', ev1[3] === 'synth: Tu veux apprendre à écrire avec moi ?' && ev1.length === 4, JSON.stringify(ev1));
check('aucune erreur de page', errors.length === 0, errors.join(' | '));

await browser.close(); server.close();
fs.rmSync(fake, { force: true }); fs.rmSync(fakeB, { force: true });
if (!existait || fs.readdirSync('voix').length === 0) fs.rmSync('voix', { recursive: true, force: true });
execFileSync('node', ['build.mjs', '--app']);
console.log(fails ? `\n${fails} échec(s)` : '\nTout est OK');
process.exit(fails ? 1 : 0);
