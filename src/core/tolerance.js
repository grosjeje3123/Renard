// Réglage de l'indulgence du moteur selon l'exercice et la phase.
// Les phases : 0 = suis le guide, 1 = guide en pointillé, 2 = écris de mémoire.
export const PHASES = ['guide', 'pointille', 'seul'];

// Pente de l'écriture : quand on écrit sans modèle, une lettre plus droite ou penchée en arrière reste la même lettre.
// Cisaillement horizontal admis (0,18 = pente du modèle) ; plus large pour le profil gaucher, dont l'écriture est souvent plus droite.
const SLANT = { droite: { min: -0.15, max: 0.25 }, gauche: { min: -0.15, max: 0.5 } };

/**
 * Un cahier plus large (mot long, phrase) se réduit à l'écran : à taille d'écran égale, le même tremblement du doigt
 * pèse davantage dans les unités du cahier. On élargit donc un peu la tolérance avec la largeur (jamais au-delà de ×1,45).
 */
export const widthFactor = (boardW = 10) => 1 + (Math.min(Math.max(boardW, 10), 35) / 10 - 1) * 0.18;

export function recognizerContext(skill, phase, settings = {}, pointerType = 'touch', boardW = 10) {
  const base = skill.kind === 'letter' || skill.kind === 'word' ? 0.7 : 1.0;
  const phaseFactor = [1.0, 1.1, 1.25][phase] ?? 1;
  return {
    tolerance: base * phaseFactor * (settings.souple ? 1.35 : 1) * widthFactor(boardW),
    align: phase >= 1,
    slant: phase >= 1 ? SLANT[settings.main] || SLANT.droite : null,
    pen: pointerType === 'pen',
  };
}
