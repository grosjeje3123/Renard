// Liste toutes les phrases que le renard peut dire (une ligne par phrase, avec son identifiant) pour les faire enregistrer.
// Usage : node tools/paroles.mjs        → écrit paroles/paroles-renard.csv et paroles/paroles-renard.txt
// Chaque texte long est découpé en phrases (voir src/core/voixId.js) : « Bravo ! Tu sais écrire le e ! » donne deux lignes.
// Ce qui n'est pas dans la liste (prénom de l'enfant, mot tapé librement…) est lu par la voix du système.
import fs from 'fs';
import path from 'path';
import { SKILLS, LEVELS } from '../src/content/skills.js';
import { STICKERS } from '../src/content/stickers.js';
import { FICHES } from '../src/content/fiches.js';
import { DESSINS, IDEES_LIBRES } from '../src/content/dessins.js';
import { feteSerie, feteNiveau, FETE_SUITE, FETE_SUITE_NIVEAU, FETE_SUITE_CARTE, introSeries } from '../src/content/series.js';
import { dicteeDit, DICTEE_FIN, DICTEE_PAS_ENCORE } from '../src/content/dictee.js';
import { dicteePool } from '../src/core/dictee.js';
import { newState } from '../src/core/progress.js';
import { LEAD, PRAISE, TIPS } from '../src/engine/feedback.js';
import { decouper, idPhrase, normaliser } from '../src/core/voixId.js';

const map = new Map(); // id -> { texte, origine }
const add = (texte, origine) => {
  for (const s of decouper(texte)) {
    const id = idPhrase(s);
    const deja = map.get(id);
    if (deja && normaliser(deja.texte) !== normaliser(s)) throw new Error(`Collision d'identifiant ${id} : « ${deja.texte} » / « ${s} »`);
    if (!deja) map.set(id, { texte: normaliser(s), origine });
  }
};
const bas = (t) => t.charAt(0).toLowerCase() + t.slice(1);

// 1. Compétences : consignes, modèle à copier, carte, félicitations
for (const s of Object.values(SKILLS)) {
  add(s.say.intro, 'consigne'); add(s.say.how, 'consigne'); add(s.say.bubble, 'consigne');
  if (s.short) add(s.short, 'carte');
  if (s.kind === 'letter') add(`Bravo ! Tu sais écrire le ${s.glyph} !`, 'félicitation');
  else if (s.phrase) add(`Bravo ! Tu sais écrire la phrase « ${s.glyph} » !`, 'félicitation');
  else if (s.kind === 'word') add(`Bravo ! Tu sais écrire « ${s.glyph} » !`, 'félicitation');
  else add(`Bravo ! Tu as réussi : ${s.title.toLowerCase()} !`, 'félicitation');
}
add('On a bien travaillé ! On reprendra une autre fois.', 'félicitation');
add('Bravo ! Encore un essai sans aide pour gagner ton trésor.', 'félicitation');
add('Bravo ! Encore un essai sans aide pour réussir ce mot.', 'félicitation');
for (let n = 2; n <= 6; n++) add(`Et ${n} nouvelles vignettes !`, 'félicitation');

// 1b. Séries : la fête de fin de série (un titre par série), la suite proposée, l'annonce du nombre de séries à la première ouverture d'un niveau
for (const lv of LEVELS) {
  if (!lv.available || !lv.sections || lv.sections.length < 2) continue;
  for (const sec of lv.sections) add(feteSerie(sec.title), 'félicitation');
  add(feteNiveau(lv.name), 'félicitation');
  add(introSeries(lv.sections.length), 'carte');
  // l'ordre de la classe choisi par les parents découpe le niveau 2 en paquets de 7 lettres
  if (lv.id === 2) for (let k = 1; k <= Math.ceil(lv.skills.length / 7); k++) add(feteSerie(`Dans l’ordre de la classe (${k})`), 'félicitation');
}
add(FETE_SUITE, 'félicitation'); add(FETE_SUITE_NIVEAU, 'félicitation'); add(FETE_SUITE_CARTE, 'félicitation');

// 1c. Dictée : ce que le renard dit pour chaque lettre, chiffre, mot ou son qu'on peut dicter (une phrase de consigne, puis le mot seul)
{
  const demo = newState(); demo.settings.demo = true; // tout est ouvert : on liste tout ce qui peut être dicté un jour
  for (const id of dicteePool(demo)) add(dicteeDit(SKILLS[id]), 'dictée');
  add(DICTEE_FIN, 'dictée'); add(DICTEE_PAS_ENCORE, 'dictée');
}

// 2. Vignettes, fiches animaux, album
for (const st of STICKERS) {
  add(st.fact, 'animal'); add(st.how, 'animal');
  add(`Et une nouvelle vignette : ${bas(st.name)} !`, 'félicitation');
  add(`Voici ${bas(st.name)} ! Touche un haut-parleur pour l’écouter, ou « Tout lire ».`, 'animal');
  for (const m of FICHES[st.animal]?.more || []) add(m, 'animal');
  if (FICHES[st.animal]?.move) add(FICHES[st.animal].move, 'animal');
}
add('Chaque réussite te donne une vignette d’animal. On les colle ici !', 'animal');
add('Tu as toutes les vignettes ! Quelle belle collection !', 'animal');
for (let n = 1; n < STICKERS.length; n++) add(`Tu as ${n} vignette${n > 1 ? 's' : ''} sur ${STICKERS.length}. Touche une vignette pour la regarder.`, 'animal');

// 3. Retours après un essai : compliment, éloge, conseil
for (const k of Object.values(LEAD)) for (const t of k) add(t, 'retour');
for (const k of Object.values(PRAISE)) for (const t of k) add(t, 'retour');
for (const [, t] of TIPS) add(t, 'retour');
add('Regardons ensemble.', 'retour');

// 4. Dessin libre
for (const m of DESSINS) add(m.ask || `Une idée : dessine ${m.phrase} !`, 'dessin');
for (const p of IDEES_LIBRES) add(`Une idée : dessine ${p} !`, 'dessin');
add('Dessine ce que tu veux sur la feuille !', 'dessin');

// 5. Tableau libre : « Écris … » pour le mot de départ et pour chaque mot ou phrase des exercices (« Mes mots »)
const mots = new Set(['renard']);
for (const s of Object.values(SKILLS)) if (s.kind === 'word') mots.add(s.glyph);
for (const m of mots) add(`Écris « ${m} » : suis la première ligne, puis les pointillés, puis écris tout seul !`, 'tableau');

// 6. Accueil (version sans prénom : avec un prénom, la phrase du prénom est lue par la voix du système)
for (const t of ['On se retrouve demain ! Aujourd’hui, on a bien travaillé.', 'Je fais une petite sieste… On se retrouve tout à l’heure !', 'J’ai bien travaillé avec toi ! Et si on faisait une pause ?',
  'Bonjour ! Je m’appelle Renard. Tu veux apprendre à écrire avec moi ?', 'Content de te revoir !', 'Bravo pour tes progrès !', 'Salut ! On refait un exercice que tu aimes ?',
  'Salut ! Je suis Renard. Aujourd’hui, on écrit ensemble ?']) add(t, 'accueil');

// 7. Tout le reste : les textes littéraux passés à say() / speak() dans l'interface
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []));
const LIT = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
for (const f of [...walk('src/ui'), ...walk('src/engine')]) {
  for (const ligne of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!/\b(say|speak)\(/.test(ligne)) continue;
    for (const m of ligne.matchAll(LIT)) {
      let t = m[2].replace(/\\'/g, '’').replace(/\\n/g, ' ');
      t = t.replace(/\$\{name\}/g, '');           // le prénom n'est pas enregistré
      if (t.includes('${') || t.length < 12 || !/\s/.test(t) || !/[.!?…»]$/.test(t.trim()) || !/^[A-ZÀ-Ö«]/.test(t.trim())) continue;
      add(t.replace(/ +([!?:;])/g, ' $1'), 'interface');
    }
  }
}

// Sortie
const lignes = [...map.entries()].map(([id, { texte, origine }]) => ({ id, origine, texte, lecture: texte.replace(/[«»]/g, '').replace(/\s+/g, ' ').trim() }));
const ordre = ['consigne', 'félicitation', 'retour', 'dictée', 'tableau', 'dessin', 'animal', 'carte', 'accueil', 'interface'];
lignes.sort((a, b) => ordre.indexOf(a.origine) - ordre.indexOf(b.origine) || a.texte.localeCompare(b.texte, 'fr'));
fs.mkdirSync('paroles', { recursive: true });
const csv = (v) => `"${String(v).replace(/"/g, '""')}"`;
fs.writeFileSync('paroles/paroles-renard.csv', '﻿' + ['id;origine;texte;lecture', ...lignes.map((l) => [l.id, l.origine, csv(l.texte), csv(l.lecture)].join(';'))].join('\n') + '\n');
const par = {};
for (const l of lignes) (par[l.origine] ||= []).push(l);
let txt = `PAROLES DU RENARD — ${lignes.length} phrases à enregistrer\n` +
  'Chaque ligne : identifiant | phrase. Le fichier audio de chaque phrase doit porter son identifiant : <identifiant>.mp3\n\n';
for (const o of ordre) if (par[o]) txt += `=== ${o.toUpperCase()} (${par[o].length}) ===\n` + par[o].map((l) => `${l.id} | ${l.texte}`).join('\n') + '\n\n';
fs.writeFileSync('paroles/paroles-renard.txt', txt);
const car = lignes.reduce((n, l) => n + l.lecture.length, 0);
console.log(`${lignes.length} phrases · ${car} caractères · environ ${Math.round(car / 15 / 60)} min d'audio`);
console.log(ordre.filter((o) => par[o]).map((o) => `${o} ${par[o].length}`).join(' · '));
