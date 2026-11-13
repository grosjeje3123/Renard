// Papier : écrire sur de vraies feuilles. Les adultes y préparent, sans passer par l'espace parents, le cahier de vacances d'un niveau
// (une dizaine de pages) et des fiches à l'unité : mêmes modèles que sur l'écran, à imprimer en A4.
// Aucune donnée n'est envoyée nulle part : le PDF est fabriqué sur la tablette. Adresse : #papier.
import { h, icon, sleep } from '../dom.js';
import { forestScene } from '../art.js';
import { sfx } from '../audio.js';
import { cahierSeries, cahierPages, cahierPDF, deliverPDF, isNative, partageFichiers } from '../sheets.js';
import { card, seg, sheetsCard } from './parents-tools.js';

function cahierCard(app) {
  const st = app.state, set = st.settings;
  const niveaux = cahierSeries();
  let niveau = Math.min(3, Math.max(1, set.depart || 1));
  const levelHint = h('small', {});
  const hint = () => { const nv = niveaux.find((n) => n.id === niveau); levelHint.textContent = `${nv.name} · ${nv.classe}`; };
  const levelSeg = seg('Niveau', niveaux.map((n) => [n.id, `Niveau ${n.id}`]), niveau, (v) => { niveau = v; hint(); });
  const levelRow = h('div', { class: 'setrow stack' }, h('span', {}, h('strong', {}, 'Quel niveau ?'), levelHint), levelSeg);
  const status = h('p', { class: 'muted', 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn-sec', type: 'button', html: `${icon('arrowR', 22)}<span>${isNative() || partageFichiers() ? 'Préparer le cahier : imprimer ou enregistrer' : 'Préparer le cahier (PDF)'}</span>` });
  btn.addEventListener('click', async () => {
    sfx('tap');
    btn.disabled = true;
    status.textContent = 'Préparation du cahier…';
    await sleep(40); // laisse l'écran afficher le message avant le calcul
    try {
      const c = cahierPages(niveau, { name: st.name, lefty: set.main === 'gauche' });
      const bytes = await cahierPDF(c.pages, `Renard : cahier de vacances, ${c.titre}`);
      const how = await deliverPDF(bytes, `renard-cahier-de-vacances-niveau-${niveau}.pdf`);
      status.textContent = how === 'partage' ? `Cahier prêt (${c.pages.length} pages). La feuille de partage est ouverte : choisissez l’imprimante ou un dossier.`
        : how === 'annule' ? 'Enregistrement annulé.'
          : `Cahier prêt (${c.pages.length} pages) : le PDF est enregistré. Imprimez-le en A4, à 100 %.`;
    } catch (e) {
      status.textContent = 'Le cahier n’a pas pu être préparé sur cet appareil. Essayez une fiche à l’unité ci-dessous.';
    }
    btn.disabled = false;
  });
  hint();
  return card('Mon cahier de vacances',
    h('p', { class: 'muted' }, 'Une dizaine de pages par niveau : une couverture avec le renard, les règles, six pages d’écriture en grand (deux ou trois modèles par page, sans numéros) et trois petits jeux (labyrinthe, lettres cachées, points à relier). Une page par jour suffit.'),
    levelRow, btn, status);
}

export function papier(root, app) {
  root.classList.add('parents', 'options', 'papier');
  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à l’accueil', onClick: () => { sfx('tap'); app.go('accueil'); }, html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'Papier'), h('p', {}, 'Pour les adultes : feuilles à imprimer'))),
    h('div', { class: 'pgrid' },
      h('section', { class: 'pcard wide pp-intro' },
        h('h3', {}, 'Écrire sur du vrai papier'),
        h('p', { class: 'muted' }, 'Sur l’écran, l’enfant apprend le geste avec le renard ; sur la feuille, il le refait avec un crayon. Ces feuilles suivent la même démarche en trois étapes : le modèle, les pointillés, puis tout seul. Rien n’est envoyé sur Internet : le PDF est fabriqué sur cette tablette.'),
        h('p', { class: 'muted' }, 'Ensuite, l’enfant touche « J’ai essayé » (mission cahier après un exercice), et vous pouvez donner votre avis dans l’espace parents : « réussi facilement », « avec de l’aide » ou « à retravailler ».')),
      cahierCard(app),
      sheetsCard(app)),
  );
}
