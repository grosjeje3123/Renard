// Machine à états d'une séance d'exercice (pure, sans interface).
// Trois phases : 0 = suis le guide, 1 = guide en pointillé, 2 = écris de mémoire.
// On passe à la phase suivante après une réussite (2 étoiles ou plus) — ou deux si les parents le choisissent —, pas après un temps donné.
// La répétition utile se fait plus tard, à des jours espacés (voir progress.js : rappel et consolidation).
// Trois échecs de suite : le renard remontre le geste et on revient à une phase plus simple.

export const MAX_TRIES = 10;

export class Session {
  /**
   * startPhase : un exercice déjà acquis un autre jour recommence directement « tout seul » (rappel express).
   * reps : réussites demandées à chaque étape (1 par défaut, 2 pour s'entraîner davantage).
   */
  constructor(skillId, { demo = false, startPhase = 0, reps = 1, defi = false } = {}) {
    this.defi = defi && startPhase === 2; // défi « tout seul » d'emblée : au premier raté, on passe aux pointillés
    this.skillId = skillId;
    const n = demo ? 1 : reps === 2 ? 2 : 1;
    this.need = [n, n, n];
    this.phase = startPhase;
    this.wins = this.need.map((n, i) => (i < startPhase ? n : 0));
    this.fails = 0;
    this.tries = 0;
    this.helped = false; // modèle revu en phase 2 : la réussite ne compte pas pour la maîtrise
    this.log = [];
    this.done = false;
    this.mastered = false;
    this.ended = null; // 'complete' | 'tired'
  }

  get totalWins() { return this.wins.reduce((a, b) => a + b, 0); }
  get totalNeeded() { return this.need.reduce((a, b) => a + b, 0); }

  /** L'enfant demande à revoir la démonstration. */
  rewatch() { if (this.phase === 2) this.helped = true; }

  /**
   * Enregistre un essai. Retourne ce qu'il faut faire ensuite :
   * { action: 'again' | 'phase' | 'back' | 'done', rewatch?: bool }
   */
  submit({ stars, score, criteria, tags }) {
    this.tries++;
    const ok = stars >= 2;
    this.log.push({ phase: this.phase, stars, score, criteria, tags, helped: this.helped });
    if (ok) {
      this.fails = 0;
      this.wins[this.phase]++;
      if (this.wins[this.phase] >= this.need[this.phase]) {
        if (this.phase === 2) {
          this.done = true; this.ended = 'complete';
          this.mastered = !this.helped;
          return { action: 'done' };
        }
        this.phase++;
        this.helped = false;
        return { action: 'phase' };
      }
    } else {
      if (this.defi && this.phase === 2) {
        this.defi = false; this.fails = 0; this.phase = 1; this.wins[2] = 0; this.wins[1] = Math.max(0, this.need[1] - 1);
        return this.#maybeTired({ action: 'back', rewatch: true, defi: true });
      }
      this.fails++;
      if (this.fails >= 3) {
        this.fails = 0;
        if (this.phase > 0) { this.wins[this.phase] = 0; this.phase--; this.wins[this.phase] = Math.max(0, this.need[this.phase] - 1); return this.#maybeTired({ action: 'back', rewatch: true }); }
        return this.#maybeTired({ action: 'again', rewatch: true });
      }
    }
    return this.#maybeTired({ action: 'again' });
  }

  #maybeTired(res) {
    if (this.tries >= MAX_TRIES && !this.done) { this.done = true; this.ended = 'tired'; return { action: 'done', rewatch: false }; }
    return res;
  }

  summary() {
    const stars = this.log.map((l) => l.stars);
    return {
      skillId: this.skillId, tries: this.tries, stars, phaseReached: this.phase, ended: this.ended,
      mastered: this.mastered, bestStars: stars.length ? Math.max(...stars) : 0,
    };
  }
}
