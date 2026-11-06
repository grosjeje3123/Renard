// Application : état persistant (local uniquement), routage par ancre, temps d'utilisation, renard partagé.
import { newState, hydrate, STATE_VERSION, addUsage, foxStage, unlockedItems } from '../core/progress.js';
import { configureAudio, unlockAudio, stopSpeaking } from './audio.js';
import { Fox } from './fox.js';

const KEY = 'renard-v1';
let memoryCopy = null; // si le stockage du navigateur est indisponible

function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { raw = memoryCopy; }
  if (!raw) return newState();
  try {
    const s = JSON.parse(raw);
    if (!s || s.v !== STATE_VERSION) return newState();
    return hydrate(s);
  } catch { return newState(); }
}

export const app = {
  state: load(),
  root: null,
  cleanup: null,
  screens: {},
  lastTouch: Date.now(),
  saveTimer: null,

  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const raw = JSON.stringify(this.state);
      try { localStorage.setItem(KEY, raw); } catch { memoryCopy = raw; }
    }, 250);
  },
  reset() {
    this.state = newState();
    try { localStorage.removeItem(KEY); } catch { memoryCopy = null; }
    configureAudio(this.state.settings);
  },
  applySettings() { configureAudio(this.state.settings); this.save(); },
  /** Remplace la progression (restauration d'une sauvegarde). */
  restore(state) {
    const dessins = this.state.galerie; // la sauvegarde ne contient pas les dessins : ceux de cette tablette restent
    this.state = hydrate(state);
    this.state.galerie = dessins || [];
    configureAudio(this.state.settings);
    clearTimeout(this.saveTimer);
    const raw = JSON.stringify(this.state);
    try { localStorage.setItem(KEY, raw); } catch { memoryCopy = raw; }
  },

  /** Vers un écran : go('carte-1'), go('exercice-o')… (ancre simple, sans slash). */
  go(route) {
    if (location.hash === '#' + route) this.render();
    else location.hash = route;
  },

  equipped() {
    const have = new Set(unlockedItems(this.state));
    return this.state.equipped.filter((id) => have.has(id));
  },

  makeFox(host, extra = {}) {
    const stage = foxStage(this.state);
    return new Fox(host, { accessories: this.equipped(), scale: stage.scale, ...extra });
  },

  render() {
    this.cleanup?.();
    this.cleanup = null;
    stopSpeaking();
    const [name, ...rest] = (location.hash.slice(1) || 'accueil').split('-');
    const arg = rest.join('-');
    const screen = this.screens[name] || this.screens.accueil;
    this.root.replaceChildren();
    const sec = document.createElement('section');
    sec.className = 'screen';
    // Profil gaucher : l'écran est en miroir (la main qui écrit ne cache ni le renard ni les boutons).
    if (this.state.settings.main === 'gauche') sec.classList.add('lefty');
    // Cahier incliné à l'écran : on réduit un peu la feuille pour que ses coins restent visibles.
    const tilt = this.state.settings.plateau || 0, rad = Math.abs(tilt) * Math.PI / 180;
    const fit = Math.min(1, 10 / (10 * Math.cos(rad) + 7 * Math.sin(rad)), 7 / (10 * Math.sin(rad) + 7 * Math.cos(rad)));
    sec.style.setProperty('--tilt', `${tilt}deg`);
    sec.style.setProperty('--tilt-scale', String(Math.round(fit * 1000) / 1000));
    this.root.append(sec);
    this.cleanup = screen(sec, this, arg) || null;
    window.scrollTo(0, 0);
  },

  start(root, screens) {
    this.root = root;
    this.screens = screens;
    configureAudio(this.state.settings);
    document.addEventListener('pointerdown', () => { this.lastTouch = Date.now(); unlockAudio(); }, { capture: true, passive: true });
    window.addEventListener('hashchange', () => this.render());
    // Temps d'utilisation : on compte seulement les moments actifs (écran visible, interaction récente).
    setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - this.lastTouch < 30000) { addUsage(this.state, 5); this.save(); }
    }, 5000);
    this.render();
  },
};
