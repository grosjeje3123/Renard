// Confettis : une volée de petits papiers colorés qui retombent, pour féliciter. Pur décor : rien ne dépend d'eux.
// `host` : un élément positionné (position: relative) ; (x, y) en pixels dans cet élément. Sans mouvement si l'enfant
// (ou l'appareil) a demandé moins d'animations : quelques étoiles qui s'effacent seulement.
const COLORS = ['#F08A24', '#E5392F', '#F4C84A', '#4E9A63', '#4A8FD6', '#8B6FD6', '#F27AA7'];

export function confetti(host, x, y, { n = 46, power = 1 } = {}) {
  if (!host || typeof host.animate !== 'function') return () => {};
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  host.append(layer);
  const count = calm ? Math.min(10, n) : n;
  const anims = [];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    const round = i % 3 === 0;
    const w = 7 + Math.random() * 8, hh = round ? w : 4 + Math.random() * 6;
    Object.assign(p.style, {
      position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${hh}px`, borderRadius: round ? '50%' : '2px',
      background: COLORS[i % COLORS.length], pointerEvents: 'none', willChange: 'transform, opacity',
    });
    layer.append(p);
    const ang = (-90 + (Math.random() - 0.5) * 150) * (Math.PI / 180);
    const v = (120 + Math.random() * 230) * power;
    const dx = Math.cos(ang) * v, up = Math.sin(ang) * v;
    const fall = 260 + Math.random() * 220;
    const rot = (Math.random() - 0.5) * 900;
    const dur = calm ? 700 : 1300 + Math.random() * 900;
    const frames = calm
      ? [{ opacity: 1, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(1.1)' }]
      : [
        { opacity: 1, transform: 'translate(0,0) rotate(0deg)' },
        { opacity: 1, offset: 0.35, transform: `translate(${dx * 0.7}px,${up * 0.8}px) rotate(${rot * 0.4}deg)` },
        { opacity: 0, transform: `translate(${dx}px,${up * 0.4 + fall}px) rotate(${rot}deg)` },
      ];
    anims.push(p.animate(frames, { duration: dur, delay: Math.random() * 120, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).finished.catch(() => {}));
  }
  const clear = () => layer.remove();
  Promise.all(anims).then(clear, clear);
  setTimeout(clear, 3500);
  return clear;
}
