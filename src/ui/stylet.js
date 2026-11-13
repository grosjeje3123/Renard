// Doigt ou stylet : les deux marchent. Avec un stylet, la paume posée sur l'écran ne doit pas écrire.
// Un contact « tactile » est ignoré s'il arrive pendant qu'on écrit au stylet (ou dans les 8 secondes qui suivent, d'un écran à
// l'autre), ou s'il est très large (une paume, pas un doigt). Passé ce délai, le doigt remarche : un enfant qui pose le stylet n'est pas bloqué.
let lastPen = -Infinity;
const RECENT = 8000;
export const notePen = (e) => { if (e.pointerType === 'pen') lastPen = performance.now(); };
export const penRecent = () => performance.now() - lastPen < RECENT;
export function isPalm(e) {
  if (e.pointerType !== 'touch') return false;
  if (penRecent()) return true;
  return (e.width || 0) > 44 && (e.height || 0) > 44;
}
