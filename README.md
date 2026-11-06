# Renard — mon compagnon pour apprendre à écrire (prototype)

Prototype jouable pour enfants de 4 à 8 ans : un renard accompagne l'enfant dans le tracé de lignes et de formes, des 26 lettres cursives, de sons, de mots et de phrases simples, avec un tableau libre à calque, avec validation du geste, progression adaptative, récompenses, pauses, passage au papier et espace parents. Tout est en français, hors ligne, sans compte ni publicité.

## Lancer

```
npm install
npm test            # 76 tests : reconnaissance des tracés, progression, pauses, sauvegarde, PDF, tableau libre (reconnaissance d'un mot, majuscules)
npm run build       # produit dist/index.html (un seul fichier, polices incluses)
npm run build:app   # produit www/index.html (page complète pour l'application Android)
node build.mjs --pwa  # produit pwa/ : la version installable en plein écran (voir ci-dessous)
```

Ouvrir `dist/index.html` dans un navigateur (tablette, ou ordinateur avec souris). Routes : `#accueil`, `#niveaux`, `#carte-1` à `#carte-3` (ou `#carte-3-<section>`), `#exercice-<id>`, `#tresors`, `#album`, `#pause`, `#fiche-<vignette>`, `#cahier-<exercice>`, `#dessin`, `#galerie`, `#tableau`, `#parents` (maintenir le cadenas 2 s).

## Plein écran sur la tablette (iPad et Android) : version installable

`node build.mjs --pwa` produit le dossier `pwa/` : `index.html`, `manifest.webmanifest` (affichage `fullscreen`, repli `standalone`), `sw.js` (service worker : l'application est gardée sur la tablette et démarre sans réseau), les icônes (192, 512, masquable, `apple-touch-icon`), `_headers` (Netlify / Cloudflare Pages : revérification à chaque ouverture) et `LISEZMOI.txt`.

1. Déposer le dossier `pwa/` tel quel sur un hébergement HTTPS statique (Netlify Drop, Cloudflare Pages, GitHub Pages…).
2. Sur la tablette, ouvrir l'adresse une fois, avec une connexion. **iPad (Safari)** : Partager, « Sur l'écran d'accueil ». **Android (Chrome)** : menu ⋮, « Installer l'application ».
3. L'icône ouvre Renard sans barre de navigateur, hors connexion comprise.

À savoir : la progression est liée à l'adresse (changer d'adresse repart de zéro : utiliser le code de sauvegarde) ; sur iPad, l'icône de l'écran d'accueil a son propre stockage, distinct de celui de Safari ; la page garde `connect-src 'none'` (elle ne peut rien envoyer), seul le service worker relit les fichiers de l'application sur son hébergement ; une mise à jour arrive à la deuxième ouverture suivante avec connexion.
Dans l'espace parents, la carte « Affichage » propose aussi « Passer en plein écran » quand la page est ouverte dans un navigateur, et sur tablette tactile les PDF et images passent par la feuille de partage du système (Enregistrer dans Fichiers, Imprimer).
Contrôle : `node build.mjs --pwa && node tools/pwa-check.mjs` (installable selon Chrome, démarrage hors connexion, icônes, aucune requête hors de l'hébergement, plein écran).

## Obtenir l'APK (tablette Android)

Le projet Android (Capacitor 8, `android/`) est prêt : l'application est la même page que dans le navigateur, empaquetée dans une WebView, hors ligne. L'APK n'a pas été compilé dans l'environnement où le projet a été généré (le SDK Android n'y est pas accessible) : le premier build sur votre machine ou sur GitHub est le premier test réel sur tablette.

**Voie A, sans rien installer : GitHub Actions**

1. Créer un dépôt GitHub (privé) et y envoyer le contenu de ce dossier (sans `node_modules`).
2. Onglet **Actions** > **APK Android** > **Run workflow**.
3. Au bout de 5 à 10 minutes, l'APK apparaît dans l'onglet **Releases** du dépôt (`renard.apk`), téléchargeable directement depuis un téléphone ; il est aussi joint à l'exécution sous le nom `renard-apk`.

**Voie B, sur votre ordinateur** (Node 20+, JDK 21, Android Studio ou le SDK Android avec `ANDROID_HOME`)

```
npm ci
npm run apk        # produit android/app/build/outputs/apk/debug/app-debug.apk
```

**Installer sur la tablette** : copier l'APK (câble USB, Drive, mail), l'ouvrir depuis l'appli « Fichiers » et autoriser l'installation depuis cette source quand Android le demande. Avec un câble et le débogage USB : `adb install app-debug.apk`.

Notes :

- L'APK « debug » est signé avec une clé de test : parfait pour les essais de l'étape 3. Pour Google Play il faudra un bundle signé (`./gradlew bundleRelease`) avec votre propre clé, à garder précieusement.
- Identifiant : `fr.renard.ecriture` (à changer dans `capacitor.config.json` avant toute publication, puis `npx cap sync android`).
- Icône et écran de démarrage : générés par `npm run icons` à partir du renard SVG.
- Réseau : la page de l'application (`npm run build:app`) porte une politique de sécurité (CSP, `connect-src 'none'`) qui interdit à ses pages toute connexion, tout script et toute image distants. `node tools/csp-check.mjs` le vérifie dans un vrai navigateur. La permission Android `INTERNET` du modèle Capacitor est conservée (la retirer n'a pas pu être testé sur tablette) ; la synthèse vocale du système, elle, reste celle de l'appareil.
- PDF : les fiches à imprimer passent par la feuille de partage d'Android (plugins `@capacitor/filesystem` et `@capacitor/share`, fichier temporaire dans le cache). Ce chemin n'a pas pu être essayé sur une vraie tablette ; dans un navigateur, le PDF se télécharge.
- iPad : même code, mais il faut un Mac avec Xcode (`npx cap add ios`, puis ouvrir dans Xcode).

## Architecture (de bas en haut)

| Dossier | Rôle | Dépend de |
|---|---|---|
| `src/engine/` | Reconnaissance géométrique des tracés (DTW, direction, forme, proportions, fluidité) et phrases du renard. Aucune dépendance au DOM. | rien |
| `src/core/` | Moteur pédagogique : repère du cahier, gabarits, séances adaptatives (3 phases), progression, consolidation espacée, pauses, recommandations ; sauvegarde (`backup.js`) et mise en page PDF/SVG (`pdf.js`). | engine |
| `src/content/` | Données : exercices (graphisme, lettres, mots), niveaux, trésors (`skills.js`), vignettes d'animaux (`stickers.js`) et fiches animaux (`fiches.js`). **Ajouter un niveau = ajouter des données ici.** | core |
| `src/ui/` | Rendu : renard animé (SVG), cahier interactif, écrans, audio, décor. | core, content |

## Album de vignettes d'animaux

Comme les gommettes d'une maîtresse : 25 vignettes à coller dans l'album (écran **Album**), gagnées par la réussite et non par le temps passé. Règles déterministes, évaluées à partir de l'état de progression (`awardStickers` dans `src/core/progress.js`) :

- **Première séance** terminée : le hérisson.
- **Trois étoiles** (ou exercice acquis) sur chaque exercice des niveaux 1 et 2 : un animal par exercice.
- **Persévérance** : un essai raté puis réussi dans la même séance, ou un exercice finalement acquis en y revenant : la tortue.
- **Étapes** : niveau 1 terminé (hibou), niveau 2 terminé (cerf) ; paliers du niveau 2 : 8, 14 et 20 lettres acquises (chat, mouton, dauphin) ; niveau 3 : 1, 3, 12 et 35 exercices acquis (lapin, souris, cheval, vache), tout le niveau (ours).
- **Sur le cahier** (bonus) : un exercice essayé sur papier (escargot), trois exercices (coccinelle).
- Quand toutes les vignettes des niveaux sont collées : le **renard doré** (celles du cahier ne sont jamais une condition).

Pas de tirage au sort, pas de série à maintenir, rien ne se retire jamais, et une progression enregistrée avant l'arrivée des vignettes est rattrapée à la séance suivante. Ajouter une vignette : une entrée dans `src/content/stickers.js`, un dessin dans `src/ui/animals.js` et des faits dans `src/content/fiches.js` (les tests le vérifient). `node tools/sticker-gallery.mjs planche.html` produit une planche de contrôle.

## Fonctions ajoutées après le premier prototype

- **Tout est calé sur les lignes du cahier** : les formes du niveau 1 (pluie, bulle, ponts, vagues, boucles), les lettres et les mots posent leur pied sur la ligne d'écriture, montent exactement à la ligne de 2 interlignes (petites lettres, ponts, vagues) ou de 3 (l, boucles, pluie, bulle), et le point du i se pose sur la ligne de 3. Les lettres sont étirées verticalement au chargement (`snapToLines`, `src/content/skills.js`) ; `test/features.test.js` vérifie le calage.
- **Dessin libre guidé** : « J'ai fini ! » ouvre un écran de fin (continuer, nouveau dessin, garder en image avec un adulte, retour) et la flèche de retour demande confirmation tant qu'un dessin est en cours. 15 modèles très simples (`src/content/dessins.js`), en trois difficultés qui s'ouvrent avec la progression (3 exercices acquis → moyen, 7 → difficile ; tout ouvert en mode démonstration) : cerf-volant, bateau, voiture et maison de Renard font parler le renard. Le modèle s'affiche en vignette et en **calque** (pointillés pâles sur la feuille, désactivable) ; le calque n'est jamais dans l'image enregistrée. Rien n'est noté.
- **Galerie de dessins** (réglage parents, **désactivé par défaut** : tant qu'il l'est, rien n'est conservé). Activée, l'écran de fin du dessin libre propose à l'enfant « Accrocher dans la forêt » ; ses dessins apparaissent en cadres dans « Ma galerie » (menu d'accueil), s'ouvrent en grand et peuvent être retirés (confirmation). Les traits sont allégés (`src/core/galerie.js`, Douglas–Peucker) et enregistrés dans l'état local de l'appareil, 12 dessins au plus (le plus ancien est remplacé), jamais envoyés et **absents du code de sauvegarde** ; les parents les voient et peuvent tout vider, « Effacer la progression » aussi. Les dessins relus du stockage sont revalidés (couleur, chemin) avant d'être affichés.
- **Expressions du renard plus marquées** (`src/ui/fox.js`, `node tools/fox-gallery.mjs`) : tête penchée, gestes des pattes dessinés devant la tête (poings levés pour encourager, patte au menton et bulle « ? » pour réfléchir, mains sur les joues et traits pour la surprise, salut de la patte à l'arrivée), oreilles tombantes et tête qui s'affaisse pour dormir. Pas de colère : le renard ne se fâche jamais contre l'enfant.
- **Une réussite par étape** (réglage parents : une ou deux) : un exercice dure trois essais réussis (guide, pointillés, de mémoire). La répétition utile est reportée à d'autres jours (rappel express, consolidation).
- **Alphabet complet en cursive (niveau 2)** : 26 lettres en 6 familles (premières lettres, petites pointes, lettres rondes, grandes lettres, lettres qui voyagent…), lettres descendantes libres (p, g, q, j, y), calage sur les lignes de cahier (`HAUTEUR`), l'« e » redessiné avec une vraie boucle ouverte pour ne plus ressembler à un « l ». Le moteur accepte les lettres repassées (m, n, p) : le recouvrement du gabarit est plafonné par la portée du tracé (`dtwOpenEndAt`), et un mauvais point de départ plafonne la note à 2 étoiles.
- **Niveau 3 : sons, mots, phrases (74 exercices)** : sons (ou, on, an, in, ch, oi, au, eau, ai, eu, gn, qu), mots par thèmes (famille, animaux, nature, maison…) et phrases simples (`composeText`, lettres détachées, point du i/j en fin de mot, point final). La page de travail s'agrandit pour les mots longs et les phrases (`boardFor`) ; la tolérance s'élargit avec la largeur (`widthFactor`). Un exercice s'ouvre quand toutes ses lettres sont acquises ou au moins essayées ; les lettres restent dans l'ordre.
- **Classe de l'enfant** (parents) : « Où en est l'enfant ? » ouvre d'emblée les niveaux d'avant (avant le CP / début du CP / fin du CP) ; l'ordre des lettres propose aussi l'ordre alphabétique.
- **Tableau libre** (`#tableau`, menu d'accueil) : **Écrire** ou **Dessiner**, deux feuilles distinctes dans le même écran.
  - *Écrire* : une page lignée (interligne de cahier Seyès) où l'enfant écrit n'importe quel texte (lettres a–z, sans accents). Au choix **minuscules attachées**, **MAJUSCULES d'imprimerie** ou **majuscule au début** (`src/core/tableau.js` : `CASSES`, `cased`). Le calque est plein sur la 1re rangée (route + points de départ), en pointillés sur la 2e, absent ensuite ; il peut être masqué. Texte choisi au clavier de lettres, prénom, mots déjà connus ; page agrandie pour un texte long.
  - **Reconnaissance** (`checkRow`) : quand une rangée contient autant de traits que le mot en demande, un instant après le dernier trait le texte écrit est comparé au gabarit (n'importe où sur la rangée, plus petit ou plus grand, traits dans le désordre, point du i facultatif). Bien écrit → coche verte, **confettis** (`src/ui/confetti.js`, quelques étoiles seulement si « réduire les animations ») et félicitations du renard ; sinon un encouragement doux, sans jamais noter ni punir. Rien n'est enregistré.
  - *Dessiner* : feuille 10 × 7 avec des **calques** : choix parmi les 15 dessins (les plus difficiles s'ouvrent avec la progression) ou feuille blanche, calque en **trait plein pâle**, en **pointillés** ou **caché**, grille facultative. Le calque et la grille ne sont jamais dans l'image enregistrée.
  - Export en image (sans calque ni coches) ; accrocher dans la galerie si les parents l'ont activée. Rien n'est noté.
- **Écriture comme à l'école** : les minuscules suivent les conventions françaises (lignes de 2 interlignes pour les petites lettres, t et d à 2,5, b f h k l à 3 ; jambages de p, q, g, j, y et f qui descendent sous la ligne ; p = n à longue jambe ; q à tige droite ; les formes sont relevées sur l'alphabet affiché en classe (modèle Nathan, image fournie par les parents) : petite attaque en biais au départ (`ent`), grandes boucles hautes étroites pour l, h, b, f, k (`hampe`), e avec sa barre, r à toit plat, t en pointe avec barre à part, s en une seule courbe, v et w arrondis, x en « c à l'envers » puis « c », z qui part du haut avec ventre et boucle sous la ligne. Inclinaison de l'écriture : 0,06 (≈ 3,5°, `core/board.js`). Les majuscules sont des capitales d'imprimerie, **droites** (non penchées : `majuscules.js` les pré-incline en sens inverse pour annuler la pente du cahier ; `upright` dit à `composeText` de les mesurer dans le repère final) ; les majuscules cursives (CE1) ne sont pas encore proposées. `node tools/letters-gallery.mjs planche.svg abc 7` (ou `ABC`) produit une planche de contrôle avec point de départ et sens du tracé.
- **Renard qui grandit** : 7 stades (2, 5, 8, 20, 40, 70 compétences acquises), liés à ce qui est appris, jamais au temps passé.
- **Maîtrise consolidée** : un exercice acquis devient « consolidé » après deux réussites de mémoire, sans aide, à au moins deux jours d'intervalle ; un exercice acquis un autre jour redémarre directement en phase « tout seul » (rappel express), et un rappel passe avant la nouveauté. Seuils à valider avec de vrais enfants.
- **Pauses** (réglables par les parents) : suggestion, pause douce (le renard dort quelques minutes) ou limite du jour (levée par un adulte, appui long de 2 s). À chaque pause, l'enfant choisit : bouger, lire une fiche animal, écrire sur le cahier. Jamais de coupure au milieu d'un essai.
- **Papier** : mission cahier après un exercice acquis (« J'ai essayé », déclaré par l'enfant, rien n'est vérifié, validation facultative d'un adulte) et fiches à imprimer en A4 sur lignes Seyès (écriture et animal), avec réglure 2, 2,5 ou 3 mm.
- **Gaucher** : écran en miroir, modèle près du cahier (masqué de mémoire), cahier incliné à l'écran (réglable), pente acceptée un peu plus largement ; conseil de placement de la feuille adapté sur les fiches. L'effet de la tolérance de pente est faible (le moteur acceptait déjà de grandes inclinaisons) ; le miroir et l'inclinaison sont les vrais leviers.
- **Ordre des lettres** du niveau 2 modifiable (suivre la classe), **sauvegarde/restauration** par code texte (gzip + base64, `RENARD1:`), **dessin libre** (sans note ; rien d'enregistré sauf si les parents ouvrent la galerie).
- Voix : `src/core/voices.js` classe les voix françaises du système (voix qui restent sur l'appareil d'abord, puis les plus naturelles : « Premium », « Améliorée », Siri…). Le mode automatique ne prend jamais une voix « en ligne » s'il existe une voix locale ; les parents peuvent choisir une voix, la vitesse et le timbre (hauteur non modifiée par défaut). Une voix humaine enregistrée reste la solution durable (voir le dossier de conception).

Le moteur de reconnaissance est remplaçable : `recognizer.evaluateStroke(trait modèle, trait enfant, contexte)` et `evaluateAttempt(gabarit, évaluations)` forment le contrat (voir `src/engine/recognizer.js`). Un modèle d'apprentissage ou ML Kit Digital Ink pourra le remplacer sans toucher au reste.

## Outils de test (`tools/`)

- `shots.mjs`, `shots2.mjs`, `shots3.mjs` : captures des écrans (tablette paysage/portrait, téléphone, thème sombre, mode gaucher, pause, fiche, cahier, dessin, espace parents ; progression semée par `seed.mjs [gauche] [pause]`).
- `flow.mjs <seed.json> [dist|www]` : parcours automatisés des pauses (suggestion, douce, limite), du cahier, des fiches et du dessin.
- `csp-check.mjs` : vérifie en navigateur que la version application ne peut contacter aucun serveur.
- `pwa-check.mjs` : vérifie la version installable (manifest, installabilité, démarrage hors connexion, icônes, vie privée, plein écran) ; `make-pwa-icons.mjs` regénère ses icônes.
- `voice-check.mjs [ipad|android|chrome|aucune]` : vérifie l'écran « Voix du renard » avec une synthèse vocale simulée (le navigateur de test n'a pas de voix).
- `play.mjs <dossier> <exercice> <good|reverse|scribble>` : simule un enfant qui trace dans la vraie interface (Chromium + Playwright global) ; variables `SEEDFILE`, `PAGE=dist|www`, `TAG`.
- `render-templates.mjs`, `fox-gallery.mjs`, `sticker-gallery.mjs` : contrôle visuel des gabarits de lettres, des expressions du renard et des vignettes.
- `shots-stickers.mjs <dossier>` : captures de l'album (vide, partiel, complet ; paysage, portrait, téléphone, thème sombre).

Données : stockées uniquement dans le navigateur (`localStorage`, clé `renard-v1`). Rien n'est envoyé.
