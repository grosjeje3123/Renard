// Album de vignettes d'animaux (données). Comme les gommettes d'une maîtresse : elles récompensent
// la réussite, la persévérance et les étapes franchies, jamais le temps passé ni la régularité.
// Les règles sont déterministes (pas de tirage au sort, pas de série à maintenir, rien ne se perd).
// Ajouter une vignette = ajouter une entrée ici + son dessin dans src/ui/animals.js.
//
// Règles : 'first'  → première séance terminée
//          'persist'→ un essai raté suivi, dans la même séance, d'un essai réussi (recommencer paie),
//                     ou un exercice finalement acquis en y revenant (au moins deux séances)
//          'star3'  → trois étoiles sur l'exercice `skill` (ou exercice acquis : personne n'est bloqué)
//          'level'  → tous les exercices du niveau `level` acquis
//          'count'  → au moins `n` exercices du niveau `level` acquis (ex. : premiers mots)
//          'paper'  → au moins `n` exercices essayés sur le cahier (« J'ai essayé », sans preuve exigée)
//          'all'    → toutes les autres vignettes sont collées (sauf celles du cahier, qui restent un bonus)

export const STICKERS = [
  { id: 'herisson', animal: 'herisson', name: 'Le hérisson', page: 'start', rule: 'first',
    how: 'Termine ton premier exercice.',
    fact: 'Le hérisson se roule en boule quand il a peur : ses piquants le protègent.' },
  { id: 'tortue', animal: 'tortue', name: 'La tortue', page: 'start', rule: 'persist',
    how: 'Quand un essai est difficile, recommence : tu vas y arriver !',
    fact: 'La tortue porte sa maison sur son dos. Elle prend son temps, et elle y arrive !' },

  // Niveau 1 : une vignette par exercice, avec un animal qui va avec le thème
  { id: 'grenouille', animal: 'grenouille', name: 'La grenouille', page: 1, rule: 'star3', skill: 'lignes',
    how: 'Trace la pluie avec trois étoiles.',
    fact: 'La grenouille respire aussi par la peau. Elle adore quand il pleut !' },
  { id: 'poisson', animal: 'poisson', name: 'Le poisson', page: 1, rule: 'star3', skill: 'ronds',
    how: 'Trace la bulle avec trois étoiles.',
    fact: 'Le poisson respire sous l’eau grâce à ses branchies.' },
  { id: 'castor', animal: 'castor', name: 'Le castor', page: 1, rule: 'star3', skill: 'ponts',
    how: 'Trace les ponts avec trois étoiles.',
    fact: 'Le castor coupe des branches avec ses grandes dents pour construire des barrages.' },
  { id: 'canard', animal: 'canard', name: 'Le canard', page: 1, rule: 'star3', skill: 'vagues',
    how: 'Trace la rivière avec trois étoiles.',
    fact: 'Les plumes du canard sont huilées : l’eau glisse dessus sans les mouiller.' },
  { id: 'papillon', animal: 'papillon', name: 'Le papillon', page: 1, rule: 'star3', skill: 'boucles',
    how: 'Trace les rubans avec trois étoiles.',
    fact: 'Le papillon goûte avec ses pattes !' },
  { id: 'hibou', animal: 'hibou', name: 'Le hibou', page: 1, rule: 'level', level: 1,
    how: 'Apprends tous les tracés du niveau 1.',
    fact: 'Le hibou voit très bien la nuit. Il peut tourner la tête presque tout autour de lui.' },

  // Niveau 2
  { id: 'libellule', animal: 'libellule', name: 'La libellule', page: 2, rule: 'star3', skill: 'i',
    how: 'Écris le i avec trois étoiles.',
    fact: 'La libellule peut voler en arrière et rester immobile dans les airs.' },
  { id: 'rougegorge', animal: 'rougegorge', name: 'Le rouge-gorge', page: 2, rule: 'star3', skill: 'o',
    how: 'Écris le o avec trois étoiles.',
    fact: 'Le rouge-gorge chante même en hiver.' },
  { id: 'abeille', animal: 'abeille', name: 'L’abeille', page: 2, rule: 'star3', skill: 'a',
    how: 'Écris le a avec trois étoiles.',
    fact: 'L’abeille fait une petite danse pour dire à ses copines où sont les fleurs.' },
  { id: 'luciole', animal: 'luciole', name: 'La luciole', page: 2, rule: 'star3', skill: 'l',
    how: 'Écris le l avec trois étoiles.',
    fact: 'La luciole fabrique sa propre lumière pour briller dans la nuit.' },
  { id: 'ecureuil', animal: 'ecureuil', name: 'L’écureuil', page: 2, rule: 'star3', skill: 'e',
    how: 'Écris le e avec trois étoiles.',
    fact: 'L’écureuil cache des noisettes pour l’hiver. Parfois il les oublie, et un arbre pousse !' },
  // Paliers : l'alphabet est long, on fête les étapes en chemin
  { id: 'chat', animal: 'chat', name: 'Le chat', page: 2, rule: 'count', level: 2, n: 8,
    how: 'Apprends huit lettres.',
    fact: 'Le chat ronronne quand il est content, et ses moustaches l’aident à sentir les passages étroits.' },
  { id: 'mouton', animal: 'mouton', name: 'Le mouton', page: 2, rule: 'count', level: 2, n: 14,
    how: 'Apprends quatorze lettres.',
    fact: 'La laine du mouton le garde au chaud l’hiver. On la tond au printemps pour faire des pulls.' },
  { id: 'dauphin', animal: 'dauphin', name: 'Le dauphin', page: 2, rule: 'count', level: 2, n: 20,
    how: 'Apprends vingt lettres.',
    fact: 'Le dauphin siffle pour parler à ses amis. Chacun a son propre sifflement, comme un prénom.' },
  { id: 'cerf', animal: 'cerf', name: 'Le cerf', page: 2, rule: 'level', level: 2,
    how: 'Apprends toutes les lettres : de a à z !',
    fact: 'Les bois du cerf tombent chaque année, et de nouveaux repoussent.' },

  // Niveau 3 : les petits mots
  { id: 'lapin', animal: 'lapin', name: 'Le lapin', page: 3, rule: 'count', level: 3, n: 1,
    how: 'Apprends à écrire ton premier mot.',
    fact: 'Les dents du lapin poussent toute sa vie. Il les use en grignotant.' },
  { id: 'souris', animal: 'souris', name: 'La souris', page: 3, rule: 'count', level: 3, n: 3,
    how: 'Apprends à écrire trois mots.',
    fact: 'La souris a de longues moustaches pour sentir autour d’elle, même dans le noir.' },
  { id: 'cheval', animal: 'cheval', name: 'Le cheval', page: 3, rule: 'count', level: 3, n: 12,
    how: 'Apprends douze sons, mots ou phrases.',
    fact: 'Le cheval dort souvent debout : ses jambes se verrouillent pour qu’il ne tombe pas.' },
  { id: 'vache', animal: 'vache', name: 'La vache', page: 3, rule: 'count', level: 3, n: 35,
    how: 'Apprends trente-cinq sons, mots ou phrases.',
    fact: 'La vache passe plusieurs heures par jour à mâcher l’herbe, tranquillement.' },
  { id: 'ours', animal: 'ours', name: 'L’ours', page: 3, rule: 'level', level: 3,
    how: 'Apprends tous les sons, les mots et les phrases du niveau 3.',
    fact: 'L’ours se repose longtemps dans sa tanière pendant l’hiver.' },

  // Sur le cahier : on valorise le transfert vers le papier, sans prétendre le vérifier
  { id: 'escargot', animal: 'escargot', name: 'L’escargot', page: 'paper', rule: 'paper', n: 1,
    how: 'Écris sur ton cahier, avec ton crayon, puis touche « J’ai essayé ».',
    fact: 'L’escargot laisse une trace brillante derrière lui, comme ton crayon sur la feuille.' },
  { id: 'coccinelle', animal: 'coccinelle', name: 'La coccinelle', page: 'paper', rule: 'paper', n: 3,
    how: 'Essaie trois exercices différents sur ton cahier.',
    fact: 'La coccinelle mange les pucerons : c’est une amie du jardin.' },

  // La vignette dorée
  { id: 'renard', animal: 'renard', name: 'Le renard doré', page: 'gold', rule: 'all', gold: true,
    how: 'Colle toutes les vignettes des niveaux.',
    fact: 'C’est ton ami Renard ! Il est très fier : tu as trouvé tous les animaux.' },
];

export const STICKER_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

/** Pages de l'album : [id de page, titre, ids des vignettes]. Les niveaux à venir apparaissent en pointillé. */
export const ALBUM_PAGES = (levels) => [
  { id: 'start', title: 'Mes premiers pas', stickers: STICKERS.filter((s) => s.page === 'start') },
  ...levels.map((lv) => ({ id: lv.id, title: lv.name, available: lv.available, stickers: STICKERS.filter((s) => s.page === lv.id) })),
  { id: 'paper', title: 'Sur mon cahier', stickers: STICKERS.filter((s) => s.page === 'paper') },
  { id: 'gold', title: 'La vignette en or', stickers: STICKERS.filter((s) => s.page === 'gold') },
];
