// Vérifie l'écran « Voix du renard » avec une synthèse vocale simulée (le navigateur de test n'a pas de voix).
// Usage : node build.mjs --app && node tools/voice-check.mjs [ipad|android|chrome|aucune]
import { createRequire } from 'module';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const scenario = process.argv[2] || 'ipad';
const VOICES = {
  ipad: [['Thomas', 'fr-FR', true], ['Amélie (Premium)', 'fr-FR', true], ['Marie', 'fr-FR', true], ['Samantha', 'en-US', true]],
  android: [['fr-fr-x-frd-local', 'fr-FR', true], ['fr-fr-x-frd-network', 'fr-FR', false], ['fr-fr-x-fra-local', 'fr-FR', true]],
  chrome: [['Google français', 'fr-FR', false], ['Google US English', 'en-US', false]],
  aucune: [],
}[scenario];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((voices) => {
  window.__spoken = [];
  const list = voices.map(([name, lang, local]) => ({ name, lang, localService: local, default: false, voiceURI: name }));
  const listeners = {};
  const synth = {
    speaking: false, pending: false, paused: false,
    getVoices: () => (window.__voicesReady === false ? [] : list),
    speak(u) { window.__spoken.push({ text: u.text, voice: u.voice && u.voice.name, rate: u.rate, pitch: u.pitch, lang: u.lang }); setTimeout(() => u.onend && u.onend(), 30); },
    cancel() {}, pause() {}, resume() {},
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener() {},
    __fire(t) { (listeners[t] || []).forEach((f) => f()); },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  // Chrome charge la liste des voix après le démarrage : on la rend disponible plus tard.
  window.__voicesReady = false;
  window.__release = () => { window.__voicesReady = true; synth.__fire('voiceschanged'); };
}, VOICES);
await page.goto('file://' + process.cwd() + '/www/index.html#accueil');
await page.waitForTimeout(500);
await page.evaluate(() => { location.hash = 'parents'; });
await page.waitForTimeout(500);
const b = await page.$('.gate-btn'); const bb = await b.boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up(); await page.waitForTimeout(700);
const read = () => page.evaluate(() => ({
  opts: [...document.querySelectorAll('#voice-sel option')].map((o) => o.textContent),
  now: document.querySelector('#voice-sel')?.closest('.stackc')?.querySelector('.muted')?.textContent,
  warn: (() => { const w = document.querySelector('.voice-warn'); return w && !w.hidden ? w.textContent.slice(0, 60) + '…' : null; })(),
}));
console.log('— avant le chargement des voix :', JSON.stringify(await read()));
await page.evaluate(() => window.__release());
await page.waitForTimeout(300);
console.log('— après :', JSON.stringify(await read(), null, 1));
// Écoute avec le choix automatique
await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Écouter un exemple/.test(x.textContent)).click());
await page.waitForTimeout(200);
// Choix explicite d'une autre voix, vitesse lente, timbre renard
const names = await page.evaluate(() => [...document.querySelectorAll('#voice-sel option')].slice(1).map((o) => o.value));
if (names.length > 1) await page.selectOption('#voice-sel', names[names.length - 1]);
await page.evaluate(() => { for (const b of document.querySelectorAll('.seg-b')) if (/^Lente$|^Renard$/.test(b.textContent)) b.click(); });
await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => /Écouter un exemple/.test(x.textContent)).click());
await page.waitForTimeout(200);
console.log('— prononcé :', JSON.stringify(await page.evaluate(() => window.__spoken), null, 1));
await page.waitForTimeout(500);
const saved = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('renard-v1')).settings; return { voixNom: s.voixNom, voixVitesse: s.voixVitesse, voixTimbre: s.voixTimbre }; });
console.log('— réglages enregistrés :', JSON.stringify(saved));
await page.evaluate(() => document.querySelector('#voice-sel').closest('.pcard').scrollIntoView({ block: 'start' }));
await page.evaluate(() => { const d = document.querySelector('.voice-help'); if (d) d.open = true; });
await page.waitForTimeout(200);
await page.screenshot({ path: process.env.SHOT || '/tmp/voice.png', fullPage: false });
console.log('erreurs de page :', errors.length ? errors.join(' | ') : 'aucune');
await browser.close();
