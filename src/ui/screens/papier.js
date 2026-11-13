// Papier : écrire sur de vraies feuilles. Les adultes y préparent, sans passer par l'espace parents, le cahier de vacances d'un niveau
// (une dizaine de pages) et des fiches à l'unité : mêmes modèles que sur l'écran, à imprimer en A4.
// Aucune donnée n'est envoyée nulle part : le PDF est fabriqué sur la tablette. Adresse : #papier.
import { h, icon, sleep } from '../dom.js';
import { forestScene } from '../art.js';
import { sfx } from '../audio.js';
import { cahierSeries, cahierPages, cahierPDF, deliverPDF, isNative, partageFichiers } from '../sheets.js';
import { card } from './parents-tools.js';

/* global __CAHIERS__ */
/** Les cahiers tout prêts, embarqués dans l'application (rien n'est fabriqué sur la tablette). */
const PRETS = typeof __CAHIERS__ !== 'undefined' ? __CAHIERS__ : {};
const octets = (b64) => { const bin = atob(b64), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };

function cahierCard(app) {
  const st = app.state, set = st.settings;
  const status = h('p', { class: 'muted', 'aria-live': 'polite' });
  const ouvrir = async (nv, btn) => {
    sfx('tap');
    btn.disabled = true;
    status.textContent = 'Ouverture du cahier…';
    await sleep(40);
    try {
      const pret = PRETS[nv.id];
      // Cahier tout prêt s'il est embarqué ; sinon (page d'essai), le même cahier fabriqué à la volée.
      const bytes = pret ? octets(pret.b64) : await cahierPDF(cahierPages(nv.id).pages, `Renard : cahier de vacances, niveau ${nv.id}`);
      const how = await deliverPDF(bytes, pret ? pret.nom : `renard-cahier-de-vacances-niveau-${nv.id}.pdf`);
      status.textContent = how === 'partage' ? 'La feuille de partage est ouverte : choisissez l’imprimante ou un dossier.'
        : how === 'annule' ? 'Enregistrement annulé.' : 'Le PDF est enregistré. Imprimez-le en A4, à 100 %.';
    } catch (e) {
      status.textContent = 'Le cahier n’a pas pu être ouvert sur cet appareil.';
    }
    btn.disabled = false;
  };
  const lignes = cahierSeries().map((nv) => {
    const pret = PRETS[nv.id];
    const btn = h('button', { class: 'btn-sec pp-go', type: 'button', 'data-niveau': String(nv.id), html: `${icon('page', 24)}<span>Imprimer ou enregistrer</span>` });
    btn.addEventListener('click', () => ouvrir(nv, btn));
    return h('div', { class: 'pp-row' },
      h('div', { class: 'pp-thumbs', 'aria-hidden': 'true' }, (pret?.apercus || []).map((src) => h('img', { src, alt: '' }))),
      h('div', { class: 'pp-info' }, h('strong', {}, `Niveau ${nv.id} · ${nv.name}`), h('small', {}, `${nv.classe} · 11 pages : couverture, règles, six pages d’écriture, trois jeux`), btn));
  });
  const c = card('Les cahiers de vacances',
    h('p', { class: 'muted' }, 'Les mêmes pour tous les enfants, tout prêts dans l’application. Une page par jour suffit.'),
    h('div', { class: 'pp-rows' }, lignes),
    h('div', { class: 'pp-how' },
      h('strong', {}, 'Comment faire ?'),
      h('ol', {},
        h('li', {}, 'Touchez « Imprimer ou enregistrer » sous le cahier choisi.'),
        h('li', {}, 'Le menu de partage de la tablette s’ouvre : choisissez Drive, Gmail ou « Fichiers » pour l’enregistrer ou vous l’envoyer.'),
        h('li', {}, 'Imprimez-le en A4, à 100 % : depuis la tablette (ouvrez le PDF, puis le menu ⋮, « Imprimer ») ou depuis un ordinateur.'))),
    status);
  c.classList.add('wide');
  return c;
}

export function papier(root, app) {
  root.classList.add('parents', 'options', 'papier');
  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour', onClick: () => { sfx('tap'); app.go(app.papierFrom || 'parents'); }, html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'Papier'), h('p', {}, 'Pour les adultes : feuilles à imprimer'))),
    h('div', { class: 'pgrid' },
      cahierCard(app),
      h('section', { class: 'pcard wide pp-intro' },
        h('h3', {}, 'Écrire sur du vrai papier'),
        h('p', { class: 'muted' }, 'Sur l’écran, l’enfant apprend le geste avec le renard ; sur la feuille, il le refait avec un crayon. Ces feuilles suivent la même démarche en trois étapes : le modèle, les pointillés, puis tout seul. Ces cahiers sont dans l’application : rien n’est téléchargé ni envoyé sur Internet.'),
        h('p', { class: 'muted' }, 'Ensuite, l’enfant touche « J’ai essayé » (mission cahier après un exercice), et vous pouvez donner votre avis dans l’espace parents : « réussi facilement », « avec de l’aide » ou « à retravailler ».'))),
  );
}
