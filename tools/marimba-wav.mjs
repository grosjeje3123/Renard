// Rend le motif de marimba hors ligne (OfflineAudioContext dans Chromium) : fichier WAV 16 bits pour l'écouter, et mesures
// (niveau de crête, niveau moyen, durée audible) pour vérifier qu'il ne sature pas.
// Usage : node tools/marimba-wav.mjs [sortie.wav]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { build } from 'esbuild';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2] || 'marimba-renard.wav';
const bundle = await build({ entryPoints: ['src/ui/marimba.js'], bundle: true, format: 'iife', globalName: 'M', write: false });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: bundle.outputFiles[0].text });
const res = await page.evaluate(async () => {
  const SR = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * (M.MOTIF_FIN + 0.3)), SR);
  const fin = M.jouerMotif(ctx, ctx.destination, 0.05);
  const buf = await ctx.startRendering();
  const notes = M.MELODIE.map(([pos, d]) => [0.05 + pos * 60 / M.TEMPO / 4, M.hz(d)]);
  return { fin, sr: SR, notes, l: Array.from(buf.getChannelData(0)), r: Array.from(buf.getChannelData(1)) };
});
await browser.close();
const n = res.l.length;
let peak = 0, sum = 0, last = 0;
for (let i = 0; i < n; i++) { const v = Math.max(Math.abs(res.l[i]), Math.abs(res.r[i])); peak = Math.max(peak, v); sum += res.l[i] ** 2; if (v > 0.002) last = i; }
// Vérification des attaques : à chaque note de la mélodie, l'énergie à la bonne hauteur doit monter juste après l'instant prévu
const goertzel = (x, from, to, f, sr) => { if (to <= from) return 0; from = Math.max(0, from); let s1 = 0, s2 = 0; const k = 2 * Math.cos((2 * Math.PI * f) / sr); for (let i = from; i < to; i++) { const s0 = x[i] + k * s1 - s2; s2 = s1; s1 = s0; } return (s1 * s1 + s2 * s2 - k * s1 * s2) / (to - from); };
let bonnes = 0; const ratees = [];
for (const [t, f] of res.notes) {
  const a = Math.round(t * res.sr);
  const apres = goertzel(res.l, a + Math.round(0.012 * res.sr), a + Math.round(0.07 * res.sr), f, res.sr);
  const avant = goertzel(res.l, a - Math.round(0.06 * res.sr), a - Math.round(0.005 * res.sr), f, res.sr);
  if (apres > avant * 1.15 + 1e-12) bonnes++; else ratees.push(`${t.toFixed(2)} s (${f.toFixed(0)} Hz)`);
}
console.log(`attaques repérées à la bonne hauteur : ${bonnes} sur ${res.notes.length}${ratees.length ? ` (non repérées : ${ratees.join(', ')} — notes répétées ou couvertes par la précédente)` : ''}`);
const db = (x) => (20 * Math.log10(x || 1e-9)).toFixed(1);
console.log(`crête ${peak.toFixed(3)} (${db(peak)} dBFS), niveau moyen ${db(Math.sqrt(sum / n))} dBFS, dernier son audible à ${(last / res.sr).toFixed(2)} s, fin annoncée ${res.fin.toFixed(2)} s`);
const wav = Buffer.alloc(44 + n * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 4, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(res.sr, 24); wav.writeUInt32LE(res.sr * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) { wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, res.l[i])) * 32767), 44 + i * 4); wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, res.r[i])) * 32767), 46 + i * 4); }
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, wav);
console.log('écrit', out);
if (peak >= 0.98) { console.error('SATURATION : la crête dépasse 0,98'); process.exit(1); }
