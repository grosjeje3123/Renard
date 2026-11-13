// Dessins des animaux des vignettes (SVG plat, viewBox 0 0 100 100, même style que les trésors).
// Chaque dessin reçoit un identifiant unique `u` (pour ses clipPath) et `D`, qui laisse passer les décors
// (gouttes, bulles, lueur…) sur une vignette collée et les retire sur la silhouette d'une vignette à gagner.

let uid = 0;

const eye = (x, y, r = 4.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2B1A12"/><circle cx="${x + r * 0.32}" cy="${y - r * 0.34}" r="${r * 0.36}" fill="#fff"/>`;
const cheek = (x, y, rx = 5, ry = 3.2) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#F59A8F" opacity=".5"/>`;
const mirror = (s) => `<g transform="translate(100 0) scale(-1 1)">${s}</g>`;
const sparkle = (x, y, r, c = '#fff') => `<path d="M${x} ${y - r}Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y}Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r}Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y}Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r}Z" fill="${c}"/>`;

/** Piquants : zigzag sur un arc (angles en radians, 0 = droite, π = gauche, 2π = droite en passant par le haut). */
function spikes(cx, cy, rOut, rIn, n, a0 = Math.PI, a1 = Math.PI * 2) {
  let d = '';
  for (let i = 0; i <= n * 2; i++) {
    const a = a0 + ((a1 - a0) * i) / (n * 2), r = i % 2 ? rIn : rOut;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
}

const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * (-90 + 60 * i);
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});

export const ANIMALS = {
  herisson: {
    bg: '#FBE8CE',
    draw: () => `
      <ellipse cx="50" cy="72" rx="35" ry="22" fill="#6E4C3B"/>
      <path d="${spikes(50, 62, 44, 34, 12)}" fill="#6E4C3B"/>
      <path d="${spikes(50, 64, 38, 30, 11, Math.PI * 1.04, Math.PI * 1.96)}" fill="#94705A"/>
      <circle cx="30" cy="52" r="6.5" fill="#F2CFA0"/><circle cx="70" cy="52" r="6.5" fill="#F2CFA0"/>
      <ellipse cx="50" cy="67" rx="26" ry="22" fill="#F2CFA0"/>
      <ellipse cx="50" cy="75" rx="12" ry="8.5" fill="#F9E3BF"/>
      ${eye(39, 62)}${eye(61, 62)}
      <ellipse cx="50" cy="70.5" rx="4.4" ry="3.2" fill="#3B2A24"/>
      <path d="M45.5 77.5Q50 81 54.5 77.5" fill="none" stroke="#3B2A24" stroke-width="2" stroke-linecap="round"/>
      ${cheek(32, 72)}${cheek(68, 72)}`,
  },

  tortue: {
    bg: '#E3F3C9',
    draw: () => {
      const hx = hex(50, 57, 9);
      const rays = hx.map(([x, y], i) => {
        const a = (Math.PI / 180) * (-90 + 60 * i);
        return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}L${(50 + 25 * Math.cos(a)).toFixed(1)} ${(57 + 22 * Math.sin(a)).toFixed(1)}" stroke="#3E7F48" stroke-width="2.2" stroke-linecap="round"/>`;
      }).join('');
      return `
      <ellipse cx="22" cy="42" rx="9" ry="6" transform="rotate(-35 22 42)" fill="#9BC66B"/><ellipse cx="78" cy="42" rx="9" ry="6" transform="rotate(35 78 42)" fill="#9BC66B"/>
      <ellipse cx="24" cy="74" rx="9" ry="6" transform="rotate(35 24 74)" fill="#9BC66B"/><ellipse cx="76" cy="74" rx="9" ry="6" transform="rotate(-35 76 74)" fill="#9BC66B"/>
      <path d="M45 80L50 92L55 80Z" fill="#9BC66B"/>
      <circle cx="50" cy="27" r="10.5" fill="#9BC66B"/>
      ${eye(45.5, 25, 2.4)}${eye(54.5, 25, 2.4)}
      <path d="M46.5 31Q50 34 53.5 31" fill="none" stroke="#3E7F48" stroke-width="1.8" stroke-linecap="round"/>
      <ellipse cx="50" cy="57" rx="29" ry="25" fill="#4F9E5A" stroke="#3E7F48" stroke-width="3"/>
      ${rays}
      <path d="${hx.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')}Z" fill="#86CE86" stroke="#3E7F48" stroke-width="2.2" stroke-linejoin="round"/>`;
    },
  },

  hibou: {
    bg: '#E4DAF5',
    draw: () => `
      <path d="M25 28L38 40L23 45Z" fill="#7B5A43"/><path d="M75 28L62 40L77 45Z" fill="#7B5A43"/>
      <ellipse cx="50" cy="60" rx="31" ry="33" fill="#8A6A4F"/>
      <ellipse cx="24" cy="66" rx="9" ry="20" transform="rotate(14 24 66)" fill="#6F523D"/><ellipse cx="76" cy="66" rx="9" ry="20" transform="rotate(-14 76 66)" fill="#6F523D"/>
      <ellipse cx="50" cy="76" rx="18" ry="18" fill="#EBD7B5"/>
      <path d="M41 70q4.5 4 9 0q4.5 4 9 0M39 78q5.5 4.5 11 0q5.5 4.5 11 0M42 86q4 3.5 8 0q4 3.5 8 0" fill="none" stroke="#B89A74" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="37.5" cy="50" r="15" fill="#F6E7CB"/><circle cx="62.5" cy="50" r="15" fill="#F6E7CB"/>
      <circle cx="37.5" cy="50" r="10.5" fill="#F5B63F"/><circle cx="62.5" cy="50" r="10.5" fill="#F5B63F"/>
      <circle cx="37.5" cy="50" r="6" fill="#2B1A12"/><circle cx="62.5" cy="50" r="6" fill="#2B1A12"/>
      <circle cx="39.5" cy="47.8" r="2" fill="#fff"/><circle cx="64.5" cy="47.8" r="2" fill="#fff"/>
      <path d="M45.5 58L54.5 58L50 67Z" fill="#F08A24"/>`,
  },

  cerf: {
    bg: '#D4EAD0',
    draw: () => {
      const side = `
        <path d="M41 42C38 32 33 25 27 18M36 31L25 29M32 24L24 20M30 19L31 12" fill="none" stroke="#7F5230" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse cx="26" cy="48" rx="10" ry="5.5" transform="rotate(-28 26 48)" fill="#B67A4B"/><ellipse cx="27" cy="48" rx="6" ry="3" transform="rotate(-28 27 48)" fill="#F0C9A5"/>`;
      return `${side}${mirror(side)}
      <path d="M32 44C32 39 40 37 50 37C60 37 68 39 68 44C68 57 62 71 58 81C56 87 44 87 42 81C38 71 32 57 32 44Z" fill="#BC8052"/>
      <circle cx="44" cy="45" r="1.7" fill="#F6E6CB"/><circle cx="56" cy="45" r="1.7" fill="#F6E6CB"/><circle cx="50" cy="49" r="1.7" fill="#F6E6CB"/>
      <ellipse cx="50" cy="78" rx="10" ry="8" fill="#F2DCBA"/>
      <ellipse cx="50" cy="83" rx="4.4" ry="3.2" fill="#3B2A24"/>
      ${eye(41, 58, 3.9)}${eye(59, 58, 3.9)}
      ${cheek(37, 68, 3.6, 2.4)}${cheek(63, 68, 3.6, 2.4)}`;
    },
  },

  renard: {
    bg: '#FFE9A0', gold: true,
    draw: () => `
      <path d="M23 20L47 36L17 51Z" fill="#F08A24"/><path d="M26 32L39 39L24 45Z" fill="#FFF3DC"/><path d="M23 20L32 26L27 30Z" fill="#5A3A2A"/>
      <path d="M77 20L53 36L83 51Z" fill="#F08A24"/><path d="M74 32L61 39L76 45Z" fill="#FFF3DC"/><path d="M77 20L68 26L73 30Z" fill="#5A3A2A"/>
      <path d="M14 47C14 39 26 35 50 35C74 35 86 39 86 47C86 63 68 81 50 87C32 81 14 63 14 47Z" fill="#F08A24"/>
      <path d="M14 48C25 54 39 62 50 64V87C32 81 16 64 14 48Z" fill="#FFF3DC"/>
      <path d="M86 48C75 54 61 62 50 64V87C68 81 84 64 86 48Z" fill="#FFF3DC"/>
      <ellipse cx="50" cy="82" rx="4.8" ry="3.6" fill="#3A2216"/>
      <ellipse cx="36" cy="54" rx="3.8" ry="4.6" fill="#2B1A12"/><circle cx="37.2" cy="52.4" r="1.4" fill="#fff"/>
      <ellipse cx="64" cy="54" rx="3.8" ry="4.6" fill="#2B1A12"/><circle cx="65.2" cy="52.4" r="1.4" fill="#fff"/>
      ${cheek(26, 63, 4.5, 3)}${cheek(74, 63, 4.5, 3)}`,
    deco: () => `${sparkle(19, 30, 6)}${sparkle(83, 24, 5)}${sparkle(84, 74, 6)}${sparkle(15, 74, 4)}`,
  },

  grenouille: {
    bg: '#D2ECF7',
    draw: () => `
      <ellipse cx="50" cy="68" rx="37" ry="26" fill="#6BBF59"/>
      <ellipse cx="50" cy="80" rx="22" ry="12" fill="#D2F0A8"/>
      <circle cx="31" cy="42" r="14.5" fill="#6BBF59"/><circle cx="69" cy="42" r="14.5" fill="#6BBF59"/>
      <circle cx="31" cy="42" r="10" fill="#fff"/><circle cx="69" cy="42" r="10" fill="#fff"/>
      <circle cx="32.5" cy="43" r="5.4" fill="#2B1A12"/><circle cx="67.5" cy="43" r="5.4" fill="#2B1A12"/>
      <circle cx="34.4" cy="40.8" r="1.8" fill="#fff"/><circle cx="69.4" cy="40.8" r="1.8" fill="#fff"/>
      <circle cx="40" cy="62" r="3" fill="#58A848"/><circle cx="62" cy="60" r="2.6" fill="#58A848"/><circle cx="51" cy="56" r="2" fill="#58A848"/>
      <circle cx="45.5" cy="57.5" r="1.4" fill="#2F6B2F"/><circle cx="54.5" cy="57.5" r="1.4" fill="#2F6B2F"/>
      <path d="M24 66Q50 88 76 66" fill="none" stroke="#2F6B2F" stroke-width="3.2" stroke-linecap="round"/>
      ${cheek(24, 73, 5, 3.2)}${cheek(76, 73, 5, 3.2)}`,
    deco: () => [[17, 24], [84, 30], [76, 12], [12, 46]].map(([x, y]) => `<path transform="translate(${x} ${y})" d="M0-5.5C3.2-.5 4.4 2.6 0 5.5C-4.4 2.6-3.2-.5 0-5.5Z" fill="#8FC8EA"/>`).join(''),
  },

  poisson: {
    bg: '#C9E9F5',
    draw: (u) => `
      <clipPath id="${u}b"><ellipse cx="52" cy="54" rx="29" ry="20"/></clipPath>
      <path d="M30 54L10 36Q16 54 10 72Z" fill="#F57C2B"/>
      <path d="M38 38Q50 18 68 34Z" fill="#F57C2B"/><path d="M46 68Q52 84 64 70Z" fill="#F57C2B"/>
      <ellipse cx="52" cy="54" rx="29" ry="20" fill="#FF9A3D"/>
      <g clip-path="url(#${u}b)"><path d="M43 30Q36 54 43 78" fill="none" stroke="#fff" stroke-width="7"/><path d="M58 30Q51 54 58 78" fill="none" stroke="#fff" stroke-width="5"/></g>
      <path d="M64 43Q60 54 64 65" fill="none" stroke="#E26A1A" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="71" cy="49" r="6" fill="#fff"/><circle cx="72" cy="49.5" r="3.2" fill="#2B1A12"/><circle cx="73.2" cy="48.2" r="1.1" fill="#fff"/>
      <path d="M80 58Q76 61 72 59" fill="none" stroke="#C45F0F" stroke-width="2.2" stroke-linecap="round"/>`,
    deco: () => `<circle cx="78" cy="24" r="5" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="88" cy="36" r="3" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="68" cy="14" r="3.4" fill="none" stroke="#fff" stroke-width="2.2"/>`,
  },

  castor: {
    bg: '#F4E1C6',
    draw: () => `
      <circle cx="27" cy="31" r="9" fill="#A06E43"/><circle cx="27" cy="31" r="5" fill="#6E4529"/>
      <circle cx="73" cy="31" r="9" fill="#A06E43"/><circle cx="73" cy="31" r="5" fill="#6E4529"/>
      <circle cx="50" cy="55" r="31" fill="#A06E43"/>
      <ellipse cx="50" cy="67" rx="18" ry="14" fill="#E3C196"/>
      <path d="M43 70h14v10q-7 4-14 0z" fill="#fff" stroke="#D3C8B2" stroke-width="1.6" stroke-linejoin="round"/><path d="M50 70v10" stroke="#D3C8B2" stroke-width="1.6"/>
      <ellipse cx="50" cy="59" rx="6.4" ry="4.4" fill="#3B2A24"/><ellipse cx="48.4" cy="57.6" rx="1.8" ry="1" fill="#fff"/>
      ${eye(37, 48, 4)}${eye(63, 48, 4)}
      <circle cx="42" cy="65" r="1" fill="#7A5230"/><circle cx="45" cy="67" r="1" fill="#7A5230"/><circle cx="58" cy="65" r="1" fill="#7A5230"/><circle cx="55" cy="67" r="1" fill="#7A5230"/>
      ${cheek(29, 61, 4.6, 3)}${cheek(71, 61, 4.6, 3)}`,
  },

  canard: {
    bg: '#D6EEFA',
    draw: () => `
      <ellipse cx="50" cy="86" rx="28" ry="12" fill="#FFD84A"/>
      <circle cx="50" cy="52" r="27" fill="#FFD84A"/>
      <path d="M50 26Q43 15 52 12Q49 19 57 24Z" fill="#FFD84A"/>
      <ellipse cx="50" cy="65" rx="17" ry="9.5" fill="#FF9A2E"/>
      <path d="M35 65Q50 70 65 65" fill="none" stroke="#D86F1B" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="45" cy="61" r="1.4" fill="#D86F1B"/><circle cx="55" cy="61" r="1.4" fill="#D86F1B"/>
      ${eye(39, 46, 3.9)}${eye(61, 46, 3.9)}${cheek(29, 57, 4.4, 3)}${cheek(71, 57, 4.4, 3)}
      <path d="M0 80Q12.5 73 25 80T50 80T75 80T100 80V100H0Z" fill="#6FBBE3"/>
      <path d="M0 89Q12.5 82 25 89T50 89T75 89T100 89V100H0Z" fill="#92D2EF"/>`,
  },

  papillon: {
    bg: '#EBDDF7',
    draw: () => {
      const wing = `
        <path d="M47 47C40 21 18 14 14 31C12 43 28 55 47 55Z" fill="#FF9F43" stroke="#8A4B1F" stroke-width="2" stroke-linejoin="round"/>
        <path d="M47 55C31 55 19 63 23 75C27 85 44 81 47 63Z" fill="#FFC857" stroke="#8A4B1F" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="27" cy="33" r="5" fill="#fff"/><circle cx="35" cy="45" r="2.6" fill="#fff"/><circle cx="33" cy="70" r="3.4" fill="#fff"/>`;
      return `${wing}${mirror(wing)}
        <path d="M48 28Q44 18 37 14M52 28Q56 18 63 14" fill="none" stroke="#4A2E3A" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="37" cy="14" r="2.3" fill="#4A2E3A"/><circle cx="63" cy="14" r="2.3" fill="#4A2E3A"/>
        <ellipse cx="50" cy="57" rx="4.4" ry="22" fill="#4A2E3A"/><circle cx="50" cy="33" r="6.2" fill="#4A2E3A"/>
        <circle cx="48" cy="32.4" r="1.3" fill="#fff"/><circle cx="52" cy="32.4" r="1.3" fill="#fff"/>`;
    },
  },

  libellule: {
    bg: '#D3EEF1',
    draw: () => {
      const wings = `
        <ellipse cx="31" cy="36" rx="21" ry="8" transform="rotate(-12 31 36)" fill="#fff" fill-opacity=".85" stroke="#7FBFD1" stroke-width="2"/>
        <ellipse cx="32" cy="50" rx="19" ry="7" transform="rotate(9 32 50)" fill="#fff" fill-opacity=".85" stroke="#7FBFD1" stroke-width="2"/>`;
      return `${wings}${mirror(wings)}
        <rect x="46" y="28" width="8" height="60" rx="4" fill="#2AA6A0"/>
        <path d="M46 52h8M46.4 60h7.2M46.8 68h6.4M47.2 76h5.6" stroke="#1C7F7B" stroke-width="1.8"/>
        <ellipse cx="50" cy="42" rx="7.5" ry="11" fill="#1E8E8A"/>
        <circle cx="50" cy="25" r="8" fill="#1E8E8A"/>
        <circle cx="44.5" cy="24" r="5.4" fill="#fff"/><circle cx="55.5" cy="24" r="5.4" fill="#fff"/>
        <circle cx="45" cy="24.6" r="2.7" fill="#2B1A12"/><circle cx="55" cy="24.6" r="2.7" fill="#2B1A12"/>
        <circle cx="46" cy="23.4" r="1" fill="#fff"/><circle cx="56" cy="23.4" r="1" fill="#fff"/>`;
    },
  },

  rougegorge: {
    bg: '#DCEFD2',
    draw: () => `
      <ellipse cx="50" cy="62" rx="32" ry="31" fill="#94714F"/>
      <ellipse cx="24" cy="64" rx="9" ry="19" transform="rotate(12 24 64)" fill="#7A5A3D"/><ellipse cx="76" cy="64" rx="9" ry="19" transform="rotate(-12 76 64)" fill="#7A5A3D"/>
      <ellipse cx="50" cy="80" rx="18" ry="13" fill="#F7E8CC"/>
      <path d="M27 53C27 43 36 39 50 39C64 39 73 43 73 53C73 67 64 79 50 79C36 79 27 67 27 53Z" fill="#F2793F"/>
      ${eye(41, 51, 3.9)}${eye(59, 51, 3.9)}
      <path d="M45 56L55 56L50 65Z" fill="#4A3426"/>
      ${cheek(33, 62, 4, 2.6)}${cheek(67, 62, 4, 2.6)}`,
  },

  abeille: {
    bg: '#FFF3BF',
    draw: (u) => `
      <clipPath id="${u}b"><circle cx="50" cy="58" r="27"/></clipPath>
      <ellipse cx="36" cy="32" rx="13" ry="19" transform="rotate(-30 36 32)" fill="#fff" fill-opacity=".92" stroke="#A9D4EC" stroke-width="2"/>
      <ellipse cx="64" cy="32" rx="13" ry="19" transform="rotate(30 64 32)" fill="#fff" fill-opacity=".92" stroke="#A9D4EC" stroke-width="2"/>
      <path d="M42 37Q38 24 30 19M58 37Q62 24 70 19" fill="none" stroke="#3A2F2A" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="30" cy="19" r="2.6" fill="#3A2F2A"/><circle cx="70" cy="19" r="2.6" fill="#3A2F2A"/>
      <path d="M47 84L50 94L53 84Z" fill="#3A2F2A"/>
      <circle cx="50" cy="58" r="27" fill="#FFD23F"/>
      <g clip-path="url(#${u}b)"><path d="M20 64Q50 74 80 64V70Q50 80 20 70Z" fill="#3A2F2A"/><path d="M20 74Q50 84 80 74V80Q50 90 20 80Z" fill="#3A2F2A"/></g>
      ${eye(41, 51, 4)}${eye(59, 51, 4)}
      <path d="M44 59Q50 64 56 59" fill="none" stroke="#3A2F2A" stroke-width="2.4" stroke-linecap="round"/>
      ${cheek(34, 59, 4.2, 2.8)}${cheek(66, 59, 4.2, 2.8)}`,
  },

  luciole: {
    bg: '#2C3A66',
    draw: () => {
      const side = `
        <ellipse cx="35" cy="56" rx="8" ry="22" transform="rotate(18 35 56)" fill="#CFD8FF" fill-opacity=".5"/>
        <path d="M44 47L30 52M44 55L28 62M45 63L32 72" stroke="#3B2F2F" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M47 24Q44 15 37 12" fill="none" stroke="#3B2F2F" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse cx="43" cy="57" rx="8" ry="20" fill="#5B4636"/>`;
      return `${side}${mirror(side)}
        <ellipse cx="50" cy="77" rx="11.5" ry="9.5" fill="#F7F26B"/>
        <ellipse cx="50" cy="39" rx="11.5" ry="8" fill="#E4573D"/><path d="M50 33v11" stroke="#8E2E20" stroke-width="2"/>
        <circle cx="50" cy="27" r="6.6" fill="#3B2F2F"/><circle cx="47.5" cy="26.4" r="1.6" fill="#fff"/><circle cx="52.5" cy="26.4" r="1.6" fill="#fff"/>`;
    },
    deco: () => `<circle cx="50" cy="77" r="24" fill="#F7F26B" opacity=".25"/><circle cx="50" cy="77" r="16" fill="#F7F26B" opacity=".3"/>${sparkle(18, 28, 5, '#FFF6C2')}${sparkle(82, 22, 4, '#FFF6C2')}${sparkle(86, 58, 4.4, '#FFF6C2')}${sparkle(15, 68, 3.6, '#FFF6C2')}`,
    decoFirst: true,
  },

  ecureuil: {
    bg: '#FBE3C8',
    draw: () => `
      <path d="M60 80C96 80 102 38 77 20C64 12 55 24 68 33C80 42 74 60 58 60Z" fill="#C9743A"/>
      <path d="M64 72C86 70 91 44 76 30" fill="none" stroke="#EBAE72" stroke-width="4.4" stroke-linecap="round"/>
      <ellipse cx="46" cy="84" rx="24" ry="19" fill="#C9743A"/>
      <path d="M27 40L28 20L44 31Z" fill="#C9743A"/><path d="M65 40L64 20L48 31Z" fill="#C9743A"/>
      <path d="M28 20Q25 11 30 7Q33 14 35 24Z" fill="#7A4222"/><path d="M64 20Q67 11 62 7Q59 14 57 24Z" fill="#7A4222"/>
      <circle cx="46" cy="53" r="25" fill="#C9743A"/>
      <ellipse cx="46" cy="63" rx="16" ry="11.5" fill="#F6E3C4"/>
      <ellipse cx="46" cy="57" rx="3.8" ry="2.9" fill="#4B2E22"/>
      <rect x="42.6" y="65.5" width="6.8" height="7" rx="1.6" fill="#fff" stroke="#D3C8B2" stroke-width="1.4"/>
      ${eye(35, 48, 4)}${eye(57, 48, 4)}${cheek(29, 59, 4, 2.6)}${cheek(63, 59, 4, 2.6)}
      <path d="M17 72Q24 64 31 72Z" fill="#6B4A2E"/><path d="M18 72Q24 87 30 72Z" fill="#C8934F"/>`,
  },
  // ---- Vignettes du cahier (papier) et du niveau 3
  escargot: {
    bg: '#E4F0CF',
    draw: () => {
      const spiral = (cx, cy, r0, r1, turns) => {
        let d = ''; const n = turns * 24;
        for (let i = 0; i <= n; i++) { const a = (i / 24) * Math.PI * 2, r = r0 + ((r1 - r0) * i) / n; d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; }
        return d;
      };
      return `
      <path d="M8 84Q8 70 20 70H90Q99 70 99 78Q99 86 90 86H16Q8 86 8 84Z" fill="#E9D29C"/>
      <path d="M12 86C10 66 12 56 20 52C27 49 31 56 30 68L28 78Z" fill="#E9D29C"/>
      <path d="M16 54L10 33M25 53L30 31" stroke="#E9D29C" stroke-width="4.4" stroke-linecap="round"/>
      <circle cx="10" cy="31" r="5.2" fill="#E9D29C"/><circle cx="30" cy="29" r="5.2" fill="#E9D29C"/>
      <circle cx="10" cy="31" r="2.6" fill="#2B1A12"/><circle cx="30" cy="29" r="2.6" fill="#2B1A12"/>
      <circle cx="10.9" cy="30" r=".9" fill="#fff"/><circle cx="30.9" cy="28" r=".9" fill="#fff"/>
      <path d="M17 68Q22 73 27 68" fill="none" stroke="#7A5A2E" stroke-width="2.2" stroke-linecap="round"/>
      ${cheek(15, 63, 3.4, 2.4)}
      <circle cx="64" cy="52" r="29" fill="#D98A45"/><circle cx="64" cy="52" r="24" fill="#E7A262"/>
      <path d="${spiral(64, 52, 2, 21, 2.6)}" fill="none" stroke="#8F5524" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M46 40Q52 28 66 26" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>`;
    },
    deco: () => `${sparkle(88, 22, 5)}${sparkle(16, 14, 4)}`,
  },

  coccinelle: {
    bg: '#DDF0CC',
    draw: () => `
      <path d="M6 96C10 66 34 58 62 66C84 72 98 84 100 98Z" fill="#6DB96C"/>
      <path d="M8 94C28 78 56 74 92 90" fill="none" stroke="#58A258" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M45 20L37 8M55 20L63 8" stroke="#2B1A12" stroke-width="2.6" stroke-linecap="round"/><circle cx="37" cy="8" r="2.4" fill="#2B1A12"/><circle cx="63" cy="8" r="2.4" fill="#2B1A12"/>
      <path d="M22 50L12 46M21 62L10 64M24 74L15 82M78 50L88 46M79 62L90 64M76 74L85 82" stroke="#2B1A12" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="50" cy="58" r="30" fill="#E5392F"/>
      <path d="M50 34V88" stroke="#2B1A12" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M31 33Q50 12 69 33Q50 41 31 33Z" fill="#2B1A12"/>
      <ellipse cx="42.5" cy="29" rx="3.6" ry="4.4" fill="#fff"/><ellipse cx="57.5" cy="29" rx="3.6" ry="4.4" fill="#fff"/>
      <circle cx="43" cy="30" r="1.8" fill="#2B1A12"/><circle cx="57" cy="30" r="1.8" fill="#2B1A12"/>
      <circle cx="36" cy="54" r="6" fill="#2B1A12"/><circle cx="64" cy="54" r="6" fill="#2B1A12"/>
      <circle cx="39" cy="75" r="5" fill="#2B1A12"/><circle cx="61" cy="75" r="5" fill="#2B1A12"/>
      <circle cx="29" cy="68" r="3.2" fill="#2B1A12"/><circle cx="71" cy="68" r="3.2" fill="#2B1A12"/>
      <path d="M32 50Q36 44 44 44" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`,
  },

  lapin: {
    bg: '#E8E3F5',
    draw: () => `
      <ellipse cx="36" cy="26" rx="9" ry="23" fill="#EFE7DF" transform="rotate(-8 36 26)"/><ellipse cx="36" cy="27" rx="4.6" ry="17" fill="#F4B9B3" transform="rotate(-8 36 27)"/>
      <ellipse cx="64" cy="26" rx="9" ry="23" fill="#EFE7DF" transform="rotate(8 64 26)"/><ellipse cx="64" cy="27" rx="4.6" ry="17" fill="#F4B9B3" transform="rotate(8 64 27)"/>
      <ellipse cx="50" cy="64" rx="29" ry="26" fill="#EFE7DF"/>
      <ellipse cx="50" cy="73" rx="13" ry="9.5" fill="#fff"/>
      ${eye(39, 58)}${eye(61, 58)}
      <path d="M46 65.5H54L50 70Z" fill="#E98C99"/>
      <path d="M50 70V74M50 74Q46 77 43 75M50 74Q54 77 57 75" fill="none" stroke="#7A5A5A" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="46.4" y="76" width="7.2" height="7" rx="1.6" fill="#fff" stroke="#D3C8B2" stroke-width="1.4"/><path d="M50 76v7" stroke="#D3C8B2" stroke-width="1.2"/>
      <path d="M18 66L30 68M18 73L30 72M82 66L70 68M82 73L70 72" stroke="#C9BDB2" stroke-width="1.6" stroke-linecap="round"/>
      ${cheek(31, 68, 4.6, 3)}${cheek(69, 68, 4.6, 3)}`,
  },

  souris: {
    bg: '#EBE6F2',
    draw: () => `
      <circle cx="27" cy="36" r="14.5" fill="#B7B0BD"/><circle cx="27" cy="36" r="9" fill="#F2B8C0"/>
      <circle cx="73" cy="36" r="14.5" fill="#B7B0BD"/><circle cx="73" cy="36" r="9" fill="#F2B8C0"/>
      <ellipse cx="50" cy="62" rx="29" ry="26" fill="#CFC8D4"/>
      <ellipse cx="50" cy="73" rx="15" ry="11" fill="#EFE9F1"/>
      ${eye(39, 56, 3.8)}${eye(61, 56, 3.8)}
      <circle cx="50" cy="67" r="4.2" fill="#E98C99"/><circle cx="48.8" cy="65.8" r="1.2" fill="#fff"/>
      <path d="M50 71V75M50 75Q46 78 43 76M50 75Q54 78 57 76" fill="none" stroke="#7A6A72" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="46.6" y="77" width="6.8" height="6.4" rx="1.6" fill="#fff" stroke="#D3C8B2" stroke-width="1.3"/>
      <path d="M12 64L33 68M13 74L33 73M88 64L67 68M87 74L67 73" stroke="#9B93A1" stroke-width="1.6" stroke-linecap="round"/>
      ${cheek(32, 68, 4.4, 3)}${cheek(68, 68, 4.4, 3)}`,
    deco: () => `<path d="M6 94L26 80L28 94Z" fill="#F4C84A"/><circle cx="19" cy="90" r="2" fill="#E3A92A"/><circle cx="24" cy="86" r="1.4" fill="#E3A92A"/>`,
  },

  blaireau: {
    bg: '#E4E8DD',
    draw: () => `
      <circle cx="25" cy="36" r="10" fill="#6E6A66"/><circle cx="25" cy="36" r="5.4" fill="#E9E5DE"/>
      <circle cx="75" cy="36" r="10" fill="#6E6A66"/><circle cx="75" cy="36" r="5.4" fill="#E9E5DE"/>
      <path d="M50 22C71 22 83 40 81 58C79 76 65 88 50 90C35 88 21 76 19 58C17 40 29 22 50 22Z" fill="#A8A39C"/>
      <path d="M50 24C62 24 68 40 66 58C64 74 58 84 50 86C42 84 36 74 34 58C32 40 38 24 50 24Z" fill="#FFFFFF"/>
      <path d="M36 27C41 26 45 42 46 62C46 70 44 72 42 72C38 60 33 44 31 33Z" fill="#2E2A28"/>
      <path d="M64 27C59 26 55 42 54 62C54 70 56 72 58 72C62 60 67 44 69 33Z" fill="#2E2A28"/>
      <circle cx="40" cy="52" r="5.2" fill="#fff"/><circle cx="60" cy="52" r="5.2" fill="#fff"/>
      ${eye(40, 52, 3.4)}${eye(60, 52, 3.4)}
      <ellipse cx="50" cy="76" rx="6.4" ry="4.6" fill="#2B1A12"/><ellipse cx="48.4" cy="74.6" rx="1.8" ry="1" fill="#fff"/>
      <path d="M50 80.6V83M50 83Q46.5 86 43.5 84M50 83Q53.5 86 56.5 84" fill="none" stroke="#2B1A12" stroke-width="1.8" stroke-linecap="round"/>
      ${cheek(29, 66, 4.2, 2.8)}${cheek(71, 66, 4.2, 2.8)}`,
    deco: () => `<path d="M0 92Q20 84 40 92T80 92T120 92V100H0Z" fill="#B9A27E"/>`,
  },

  poule: {
    bg: '#F7ECD8',
    draw: () => `
      <path d="M37 26Q37 12 45 17Q48 6 55 16Q63 10 63 25Z" fill="#E2483D"/>
      <ellipse cx="50" cy="58" rx="30" ry="31" fill="#C9743A"/>
      <path d="M22 66C26 84 40 92 50 92C60 92 74 84 78 66C70 76 60 80 50 80C40 80 30 76 22 66Z" fill="#A85B2A"/>
      <ellipse cx="50" cy="64" rx="17" ry="15" fill="#E39A5C"/>
      ${eye(38, 52, 4)}${eye(62, 52, 4)}
      <path d="M42 61H58L50 73Z" fill="#F2B632"/><path d="M42 61H58L50 65.5Z" fill="#E09A1E"/>
      <path d="M47 72Q45.5 82 50 84.5Q54.5 82 53 72Z" fill="#E2483D"/>
      ${cheek(30, 64, 4.4, 3)}${cheek(70, 64, 4.4, 3)}`,
    deco: () => `<g fill="#E3B24A"><ellipse cx="12" cy="92" rx="2.2" ry="1.4"/><ellipse cx="20" cy="95" rx="2.2" ry="1.4"/><ellipse cx="84" cy="93" rx="2.2" ry="1.4"/><ellipse cx="91" cy="89" rx="2.2" ry="1.4"/></g>`,
  },


  chat: {
    bg: '#FBE9D6',
    draw: () => `
      <path d="M20 44L24 14L46 30Z" fill="#E59A52"/><path d="M26 36L27 22L38 31Z" fill="#F4B9B3"/>
      <path d="M80 44L76 14L54 30Z" fill="#E59A52"/><path d="M74 36L73 22L62 31Z" fill="#F4B9B3"/>
      <ellipse cx="50" cy="60" rx="32" ry="28" fill="#EDA862"/>
      <path d="M44 33v9M50 31v10M56 33v9" stroke="#C97A36" stroke-width="3.2" stroke-linecap="round"/>
      <ellipse cx="50" cy="72" rx="15" ry="11" fill="#FFF1DE"/>
      ${eye(37, 58, 4.4)}${eye(63, 58, 4.4)}
      <path d="M46 66.4H54L50 71Z" fill="#E98C99"/>
      <path d="M50 71V75M50 75Q46 78.5 42.5 76.5M50 75Q54 78.5 57.5 76.5" fill="none" stroke="#7A5A5A" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M14 62L30 66M14 70L30 70M86 62L70 66M86 70L70 70" stroke="#B8845A" stroke-width="1.6" stroke-linecap="round"/>
      ${cheek(31, 68, 4.6, 3)}${cheek(69, 68, 4.6, 3)}`,
  },

  mouton: {
    bg: '#E7EEF7',
    draw: () => `
      <ellipse cx="22" cy="52" rx="10" ry="6" fill="#4A3F45" transform="rotate(-24 22 52)"/>
      <ellipse cx="78" cy="52" rx="10" ry="6" fill="#4A3F45" transform="rotate(24 78 52)"/>
      <g fill="#FFFFFF" stroke="#D9DFEA" stroke-width="1.6">
        <circle cx="30" cy="34" r="14"/><circle cx="50" cy="26" r="15"/><circle cx="70" cy="34" r="14"/>
        <circle cx="24" cy="54" r="13"/><circle cx="76" cy="54" r="13"/><circle cx="50" cy="48" r="22"/>
      </g>
      <ellipse cx="50" cy="64" rx="19" ry="23" fill="#5A4B52"/>
      <ellipse cx="50" cy="73" rx="10" ry="7.4" fill="#76656C"/>
      ${eye(42, 60, 3.4)}${eye(58, 60, 3.4)}
      <ellipse cx="50" cy="70.4" rx="3" ry="2" fill="#2B1A12"/>
      <path d="M50 72.4V76M50 76Q47 78.6 44.6 77M50 76Q53 78.6 55.4 77" fill="none" stroke="#2B1A12" stroke-width="1.5" stroke-linecap="round"/>
      ${cheek(37, 70, 3.6, 2.4)}${cheek(63, 70, 3.6, 2.4)}`,
  },

  cheval: {
    bg: '#EFE6D8',
    draw: () => `
      <path d="M62 14L70 4L74 20Z" fill="#8B5A33"/><path d="M40 16L34 5L30 22Z" fill="#8B5A33"/>
      <path d="M44 16C34 24 30 40 32 56C34 72 38 84 44 92H64C70 80 72 64 70 50C68 34 62 22 52 14Z" fill="#B87A45"/>
      <path d="M38 16C28 22 24 38 28 58C30 52 32 40 38 30Z" fill="#6E4325"/>
      <path d="M44 14C46 10 52 10 56 14L58 40C52 36 46 36 42 40Z" fill="#6E4325"/>
      <ellipse cx="54" cy="80" rx="15" ry="13" fill="#E8C79F"/>
      <ellipse cx="48" cy="82" rx="2.6" ry="3.6" fill="#5A3A22"/><ellipse cx="60" cy="82" rx="2.6" ry="3.6" fill="#5A3A22"/>
      <path d="M50 90Q54 93 58 90" fill="none" stroke="#5A3A22" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(41, 52, 3.8)}${eye(66, 52, 3.8)}
      <path d="M52 22L54 42" stroke="#F3E5D2" stroke-width="5" stroke-linecap="round"/>
      ${cheek(38, 66, 4, 2.6)}${cheek(70, 66, 4, 2.6)}`,
  },

  vache: {
    bg: '#E9F1DC',
    draw: () => `
      <path d="M26 30Q20 16 28 10M74 30Q80 16 72 10" fill="none" stroke="#E8D9B0" stroke-width="5.4" stroke-linecap="round"/>
      <ellipse cx="17" cy="42" rx="12" ry="7" fill="#2E2A30" transform="rotate(-24 17 42)"/><ellipse cx="83" cy="42" rx="12" ry="7" fill="#2E2A30" transform="rotate(24 83 42)"/>
      <ellipse cx="50" cy="52" rx="29" ry="29" fill="#FFFFFF"/>
      <path d="M26 36C34 24 52 26 56 36C48 40 36 46 26 36Z" fill="#2E2A30"/>
      <ellipse cx="50" cy="74" rx="21" ry="15" fill="#F6B1B1"/>
      <ellipse cx="42" cy="75" rx="3" ry="3.6" fill="#B86E73"/><ellipse cx="58" cy="75" rx="3" ry="3.6" fill="#B86E73"/>
      ${eye(38, 52, 4)}${eye(62, 52, 4)}
      <path d="M44 84Q50 88 56 84" fill="none" stroke="#B86E73" stroke-width="1.8" stroke-linecap="round"/>
      ${cheek(30, 62, 4.2, 2.8)}`,
  },
};

/**
 * Vignette ronde (bord blanc de gommette) : `locked` donne la silhouette en pointillé d'une vignette pas encore gagnée.
 */
export function stickerSVG(id, { locked = false, cls = '' } = {}) {
  const a = ANIMALS[id];
  if (!a) return '';
  const u = `stk${++uid}`;
  const deco = locked ? '' : (a.deco ? a.deco() : '');
  let art = a.draw(u);
  if (locked) art = art.replace(/(fill|stroke)="#[0-9a-fA-F]{3,8}"/g, '$1="var(--sil)"').replace(/ (fill-)?opacity="[^"]*"/g, '');
  const head = `<svg class="stk-art ${cls}" viewBox="0 0 100 100" aria-hidden="true">`;
  if (locked) {
    return `${head}<circle cx="50" cy="50" r="45" fill="var(--sil-bg)" stroke="var(--sil)" stroke-width="2.6" stroke-dasharray="5 5"/><g clip-path="url(#${u}c)" opacity=".9">${art}</g><defs><clipPath id="${u}c"><circle cx="50" cy="50" r="42"/></clipPath></defs></svg>`;
  }
  const ring = a.gold
    ? `<circle cx="50" cy="50" r="48.5" fill="#E9A92B"/><circle cx="50" cy="50" r="46.5" fill="#FFD866"/><circle cx="50" cy="50" r="44.5" fill="#fff"/>`
    : `<circle cx="50" cy="50" r="48" fill="#fff" stroke="#E7DAC1" stroke-width="1"/>`;
  return `${head}<defs><clipPath id="${u}c"><circle cx="50" cy="50" r="42"/></clipPath></defs>${ring}<circle cx="50" cy="50" r="42" fill="${a.bg}"/><g clip-path="url(#${u}c)">${a.decoFirst ? deco : ''}${art}${a.decoFirst ? '' : deco}</g><path d="M21 36A32 32 0 0 1 43 17" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" opacity=".55"/></svg>`;
}
