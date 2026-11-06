import { app } from './ui/app.js';
import { home } from './ui/screens/home.js';
import { levels } from './ui/screens/levels.js';
import { map } from './ui/screens/map.js';
import { exercise } from './ui/screens/exercise.js';
import { rewards } from './ui/screens/rewards.js';
import { album } from './ui/screens/album.js';
import { parents } from './ui/screens/parents.js';
import { pause } from './ui/screens/pause.js';
import { fiche } from './ui/screens/fiche.js';
import { cahier } from './ui/screens/cahier.js';
import { dessin } from './ui/screens/dessin.js';
import { tableau } from './ui/screens/tableau.js';
import { galerie } from './ui/screens/galerie.js';
import { FOX_CSS } from './ui/fox.js';

const style = document.createElement('style');
style.textContent = FOX_CSS;
document.head.append(style);

app.start(document.getElementById('app'), { accueil: home, niveaux: levels, carte: map, exercice: exercise, tresors: rewards, album, parents, pause, fiche, cahier, dessin, galerie, tableau });
