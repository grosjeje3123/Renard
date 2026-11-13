// Petits utilitaires DOM et jeu d'icônes (traits arrondis, lisibles par de jeunes enfants).

const SVG_TAGS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'line', 'text', 'defs']);
export function h(tag, props = {}, ...kids) {
  const el = SVG_TAGS.has(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') { for (const [name, val] of Object.entries(v)) { if (name.startsWith('--')) el.style.setProperty(name, val); else el.style[name] = val; } }
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c.nodeType ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

const S = 'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
export const ICONS = {
  play: '<path d="M8 4.8v14.4L20 12z" fill="currentColor"/>',
  back: `<path d="M15 5l-7 7 7 7" ${S} stroke-width="3.2"/>`,
  home: `<path d="M3.5 11.5L12 4l8.5 7.5M6 10v9h12v-9" ${S}/>`,
  map: `<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5zM9 4v13.5M15 6.5V20" ${S} stroke-width="2.2"/>`,
  album: `<circle cx="12" cy="12" r="8.6" ${S} stroke-width="2.3"/><circle cx="8.6" cy="9.2" r="1.9" fill="currentColor"/><circle cx="15.4" cy="9.2" r="1.9" fill="currentColor"/><circle cx="6.8" cy="13.6" r="1.7" fill="currentColor"/><circle cx="17.2" cy="13.6" r="1.7" fill="currentColor"/><path d="M12 12.4c-2.3 0-4 1.7-4 3.5 0 1.2.9 1.8 2 1.8.7 0 1.3-.4 2-.4s1.3.4 2 .4c1.1 0 2-.6 2-1.8 0-1.8-1.7-3.5-4-3.5z" fill="currentColor"/>`,
  frame: `<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4" ${S} stroke-width="2.2"/><path d="M6.4 16.4l3.8-4.4 3 3 2-2 2.4 3.4" ${S} stroke-width="2"/><circle cx="15.6" cy="9.2" r="1.6" fill="currentColor"/>`,
  chest: `<path d="M4 11a8 8 0 0116 0v8H4zM4 11h16M12 11v4" ${S} stroke-width="2.2"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor"/>`,
  lock: `<rect x="5" y="10.5" width="14" height="9.5" rx="2.6" ${S}/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" ${S}/>`,
  speaker: `<path d="M4 9.5h3.5L12 5.8v12.4L7.5 14.5H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.5 9a4.2 4.2 0 010 6M18 6.6a7.6 7.6 0 010 10.8" ${S} stroke-width="2.2"/>`,
  mute: `<path d="M4 9.5h3.5L12 5.8v12.4L7.5 14.5H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 9.5l5 5M21 9.5l-5 5" ${S} stroke-width="2.4"/>`,
  eye: `<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" ${S} stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`,
  hand: `<path d="M9 11V5.5a1.6 1.6 0 013.2 0V10M12.2 9.5V4.4a1.6 1.6 0 013.2 0V10M15.4 10V6a1.6 1.6 0 013.2 0v7.5c0 4-2.6 7-6.4 7-2.7 0-4.4-1.4-5.7-3.6L4.6 13a1.5 1.5 0 012.5-1.6L9 14" ${S} stroke-width="2"/>`,
  replay: `<path d="M5 12a7 7 0 112.1 5M5 6.5V12h5.5" ${S} stroke-width="2.8"/>`,
  star: '<path d="M12 2.8l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7 6.1 20.8l1.2-6.5L2.5 9.7l6.6-.9z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  starO: `<path d="M12 2.8l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7 6.1 20.8l1.2-6.5L2.5 9.7l6.6-.9z" ${S} stroke-width="2"/>`,
  leaf: '<path d="M5 19C4 11 9 5 20 4c0 10-5 16-13 16.2M5 19c3-4 6-7 10-9" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>',
  leafO: `<path d="M5 19C4 11 9 5 20 4c0 10-5 16-13 16.2M5 19c3-4 6-7 10-9" ${S} stroke-width="2"/>`,
  dice: `<rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4" ${S} stroke-width="2.3"/><circle cx="8.6" cy="8.6" r="1.5" fill="currentColor"/><circle cx="15.4" cy="8.6" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="8.6" cy="15.4" r="1.5" fill="currentColor"/><circle cx="15.4" cy="15.4" r="1.5" fill="currentColor"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" ${S} stroke-width="3.4"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18" ${S} stroke-width="3.2"/>`,
  moon: '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" fill="currentColor"/>',
  arrowR: `<path d="M5 12h14M13 6l6 6-6 6" ${S} stroke-width="3"/>`,
  tableau: `<rect x="3" y="4.5" width="18" height="13" rx="2.4" ${S} stroke-width="2.2"/><path d="M7 9.5h6M7 13h10M9 20.5h6" ${S} stroke-width="2"/>`,
  pencil: `<path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 013 3L8 18.5zM14.5 6l3.5 3.5" ${S} stroke-width="2.2"/>`,
  book: `<path d="M12 6.5C9.8 5 6.8 4.6 3.5 5v12c3.3-.4 6.3 0 8.5 1.5 2.2-1.5 5.2-1.9 8.5-1.5V5c-3.3-.4-6.3 0-8.5 1.5zM12 6.5v12" ${S} stroke-width="2.2"/>`,
  help: `<circle cx="12" cy="12" r="9" ${S} stroke-width="2.2"/><path d="M9.3 9.4a2.8 2.8 0 015.3 1.2c0 1.8-2.6 2.3-2.6 4" ${S} stroke-width="2.2"/><circle cx="12" cy="17.6" r="1.3" fill="currentColor"/>`,
  page: `<path d="M6.5 3.5h8l3.5 3.5v13.5h-11.5z" ${S} stroke-width="2.2"/><path d="M14.5 3.5V7H18M9.5 12h5M9.5 15.5h5" ${S} stroke-width="2.2"/>`,
  run: `<circle cx="14.6" cy="4.6" r="2.1" fill="currentColor"/><path d="M9.5 12.2l3-2.8 3.4 1.5 2.4 3M12.4 9.5L11 14l3.4 2.2.9 4.3M11 14l-4.4 1" ${S} stroke-width="2.2"/>`,
  trash: `<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" ${S} stroke-width="2.2"/>`,
  gear: `<path d="M4 7h8.5M18.5 7H20M4 12h2.5M12.5 12H20M4 17h10.5M20.5 17H20" ${S} stroke-width="2.4"/><circle cx="15.5" cy="7" r="2.6" ${S} stroke-width="2.2"/><circle cx="9.5" cy="12" r="2.6" ${S} stroke-width="2.2"/><circle cx="17.5" cy="17" r="2.6" ${S} stroke-width="2.2"/>`,
  music: `<path d="M9 18V6l10-2v12" ${S} stroke-width="2.4"/><circle cx="6.5" cy="18" r="2.6" fill="currentColor"/><circle cx="16.5" cy="16" r="2.6" fill="currentColor"/>`,
};
export const icon = (name, size = 24, cls = '') => `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
