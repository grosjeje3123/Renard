// Fabrique un état de progression réaliste (plusieurs jours d'usage, papier, rappel espacé) pour tester l'interface.
// Usage : node tools/seed.mjs [droite|gauche] [pause] > seed.json
import { newState, recordSession, markPaper, confirmPaper, awardStickers } from '../src/core/progress.js';
const st = newState();
st.name = 'Léa';
if (process.argv.includes('gauche')) { st.settings.main = 'gauche'; st.settings.plateau = 5; }
const day = 86400000, now = Date.now();
const crit = (o) => ({ start: 1, direction: 1, shape: 0.9, size: 0.9, lines: 0.9, flow: 0.9, ...o });
const mk = (n, stars, c, tags = [], phase = 0) => ({ log: Array.from({ length: n }, (_, i) => ({ phase: Math.min(2, phase + (i > n / 2 ? 1 : 0)), score: stars / 3 - 0.05, stars, criteria: crit(c), tags })), phase: 2, mastered: false });
const win = (n = 6) => ({ ...mk(n, 3, {}), mastered: true });
recordSession(st, 'lignes', win(), now - 9 * day);
recordSession(st, 'lignes', win(2), now - 6 * day);
recordSession(st, 'lignes', win(2), now - 3 * day); // consolidé
recordSession(st, 'ronds', { ...mk(7, 2, { flow: 0.5 }, ['tremble']), mastered: true }, now - 5 * day);
recordSession(st, 'ponts', { ...mk(8, 2, { lines: 0.55, size: 0.6 }, ['trop-petit']), mastered: true }, now - 3 * day);
recordSession(st, 'vagues', mk(6, 1, { shape: 0.4, flow: 0.45 }, ['hors-chemin', 'pause']), now - 2 * day);
recordSession(st, 'i', win(), now - 1 * day);
recordSession(st, 'o', mk(5, 2, { direction: 0.4, start: 0.6 }, ['sens-inverse']), now);
markPaper(st, 'i', now - day); markPaper(st, 'i', now); confirmPaper(st, 'i', now);
awardStickers(st, now);
[[6, 600], [5, 900], [4, 420], [3, 1260], [2, 300], [1, 780], [0, 540]].forEach(([d, s]) => { const t = new Date(now - d * day); st.usage[`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`] = s; });
if (process.argv.includes('pause')) { st.rest = { since: 17 * 60, at: now, sleepUntil: 0, overrideDay: '' }; }
console.log(JSON.stringify(st));
