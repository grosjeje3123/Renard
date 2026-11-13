// Papier : écrire sur de vraies feuilles. Les adultes y préparent, sans passer par l'espace parents, des cahiers PDF (une série ou un niveau
// entier, ou le cahier des animaux) et des fiches à l'unité : mêmes modèles que sur l'écran, sur des lignes Seyès, à imprimer en A4.
// Aucune donnée n'est envoyée nulle part : le PDF est fabriqué sur la tablette. Adresse : #papier.
import { h, icon, sleep } from '../dom.js';
import { forestScene } from '../art.js';
import { sfx } from '../audio.js';
import { cahierSeries, cahierPages, animauxPages, cahierPDF, deliverPDF, isNative, partageFichiers, REGLURES } from '../sheets.js';
import { card, row, seg, sheetsCard } from './parents-tools.js';

const fiches = (n) => `${n} fiche${n > 1 ? 's' : ''}`;

function cahierCard(app) {
  const st = app.state, set = st.settings;
  const niveaux = cahierSeries();
  let niveau = niveaux[0].id; // 1, 2, 3 ; 'a' = les animaux
  let reglure = REGLURES.find((r) => r.mm === set.reglure) ? set.reglure : 3;

  const sel = h('select', { id: 'pp-serie', class: 'txt sel', 'aria-label': 'Série à imprimer' });
  const fill = () => {
    const nv = niveaux.find((n) => n.id === niveau);
    const total = nv ? nv.series.reduce((a, s) => a + s.n, 0) : 0;
    sel.replaceChildren(...(nv
      ? [h('option', { value: '' }, `Tout le niveau ${nv.id} (${fiches(total)})`), ...nv.series.map((s) => h('option', { value: String(s.index) }, `${s.title} (${fiches(s.n)})`))]
      : [h('option', { value: '' }, 'Les 25 animaux du renard')]));
    serieRow.hidden = !nv;
  };
  const levelSeg = seg('Niveau', [...niveaux.map((n) => [n.id, `Niveau ${n.id}`]), ['a', 'Les animaux']], niveau, (v) => { niveau = v; fill(); hint(); });
  const levelHint = h('small', {});
  const hint = () => { const nv = niveaux.find((n) => n.id === niveau); levelHint.textContent = nv ? `${nv.name} · ${nv.classe}` : 'Une fiche par animal de l’album : à lire à deux, à raconter et à dessiner.'; };
  const levelRow = h('div', { class: 'setrow stack' }, h('span', {}, h('strong', {}, 'Quel cahier ?'), levelHint), levelSeg);
  const serieRow = row('Quelle série ?', 'Une série fait de 4 à 12 fiches : c’est vite prêt. Un niveau entier est plus long à préparer.', sel);
  const regRow = row('Taille des lignes', REGLURES.find((r) => r.mm === reglure).hint, seg('Taille des lignes', REGLURES.map((r) => [r.mm, r.label]), reglure, (v) => {
    reglure = v; set.reglure = v; app.applySettings();
    regRow.querySelector('small').textContent = REGLURES.find((r) => r.mm === v).hint;
  }));
  const status = h('p', { class: 'muted', 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn-sec', type: 'button', html: `${icon('arrowR', 22)}<span>${isNative() || partageFichiers() ? 'Préparer le cahier : imprimer ou enregistrer' : 'Préparer le cahier (PDF)'}</span>` });

  btn.addEventListener('click', async () => {
    sfx('tap');
    btn.disabled = true;
    status.textContent = 'Préparation du cahier… (quelques secondes, davantage pour un niveau entier)';
    await sleep(40); // laisse l'écran afficher le message avant le calcul
    try {
      const opts = { reglure, name: st.name, lefty: set.main === 'gauche' };
      const serie = sel.value === '' ? null : +sel.value;
      const c = niveau === 'a' ? animauxPages(opts) : cahierPages(niveau, { ...opts, serie });
      const bytes = await cahierPDF(c.pages, `Renard : ${c.titre}`);
      const nom = niveau === 'a' ? 'animaux' : `niveau-${niveau}${serie == null ? '' : `-serie-${serie + 1}`}`;
      const how = await deliverPDF(bytes, `renard-cahier-${nom}.pdf`);
      status.textContent = how === 'partage' ? `Cahier prêt (${fiches(c.n)}). La feuille de partage est ouverte : choisissez l’imprimante ou un dossier.`
        : how === 'annule' ? 'Enregistrement annulé.'
          : `Cahier prêt (${fiches(c.n)}) : le PDF est enregistré. Imprimez-le en A4, à 100 %.`;
    } catch (e) {
      status.textContent = 'Le cahier n’a pas pu être préparé sur cet appareil. Essayez une seule série, ou une seule fiche ci-dessous.';
    }
    btn.disabled = false;
  });
  fill(); hint();
  return card('Un cahier à imprimer',
    h('p', { class: 'muted' }, 'Une page de mode d’emploi (les trois étapes), puis une fiche par exercice, dans l’ordre du parcours. L’enfant écrit au crayon sur du vrai papier.'),
    levelRow, serieRow, regRow, btn, status);
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
