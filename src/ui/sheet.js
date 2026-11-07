// Feuille qui s'adapte à la place disponible (dessin libre et tableau libre).
// Avant : une feuille fixe de 10 × 7 laissait un grand vide au-dessus et au-dessous sur les tablettes plus « carrées »
// (iPad : à peine 40 à 47 % de l'écran) et en portrait. Maintenant la largeur reste de 10 unités, mais la hauteur suit
// la zone libre (rapport hauteur/largeur borné) : la feuille remplit presque tout l'espace sous la barre.
// Une feuille commencée garde son rapport (sinon les traits sortiraient du cadre quand on tourne la tablette) ;
// elle s'adapte de nouveau dès qu'elle est vide.

export const RATIO_MIN = 0.7; // 10 × 7, la feuille d'origine : jamais plus basse
export const RATIO_MAX = 1.25; // jamais plus haute que 10 × 12,5 (tablette en portrait)

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * @param {HTMLElement} wrap  la zone libre (dimensionnée par la mise en page, pas par la feuille)
 * @param {HTMLElement} host  le cadre de la feuille, dimensionné ici en pixels
 * @param {object} o
 *   locked() : vrai tant que la feuille a des traits (son rapport ne change plus)
 *   apply(ratio) : l'écran adopte ce rapport hauteur/largeur et renvoie celui qu'il a réellement retenu
 * @returns {{ refit(): void, set(ratio: number): void, ratio(): number, destroy(): void }}
 */
export function fitSheet(wrap, host, { min = RATIO_MIN, max = RATIO_MAX, locked = () => false, apply }) {
  let ratio = min, wanted = 0, ready = false;
  const measure = () => {
    const w = wrap.clientWidth, hgt = wrap.clientHeight;
    if (w < 40 || hgt < 40) return;
    if (!locked()) {
      const want = clamp(hgt / w, min, max);
      if (!ready || Math.abs(want - wanted) > 0.012) {
        wanted = want;
        const got = apply(want);
        if (got > 0) ratio = got;
        ready = true;
      }
    }
    const width = Math.floor(Math.min(w, hgt / ratio));
    host.style.width = `${width}px`;
    host.style.height = `${Math.floor(width * ratio)}px`;
  };
  let ro = null;
  const onResize = () => measure();
  if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(wrap); } else window.addEventListener('resize', onResize);
  measure();
  return {
    refit: measure,
    /** L'écran change de feuille (écrire ↔ dessiner) : on prend son rapport, puis on redimensionne. */
    set(r) { if (r > 0) ratio = r; measure(); },
    ratio: () => ratio,
    destroy() { ro?.disconnect(); window.removeEventListener('resize', onResize); },
  };
}
