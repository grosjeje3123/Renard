// Le renard : mascotte dessinée en SVG, animée en CSS, pilotée par une petite classe.
// Humeurs : neutral, joy, encourage, think, surprise, sleep, wave. Parole : talk(true/false).
// Chaque humeur se lit d'un coup d'œil, même en petit : visage (yeux, sourcils, bouche), tête penchée, gestes des pattes
// (poing levé, patte au menton, mains sur les joues, salut) et signes (« ? », traits de surprise, z z z).

const C = {
  o: '#F08A24', light: '#F7AE57', deep: '#D86F1B', cream: '#FFF2DF', dark: '#3A2216', tip: '#4B2B1B',
  pink: '#F4A39C', pack: '#3F9A94', strap: '#2E7C77', pencil: '#F2C14E',
};

export const FOX_CSS = `
.fox{display:block;width:100%;height:100%;overflow:visible;--lx:0px;--ly:0px}
.fox .bob{animation:fox-bob 3.4s ease-in-out infinite}
.fox .tail{transform-box:view-box;transform-origin:262px 392px;animation:fox-tail 2.8s ease-in-out infinite}
.fox .earL{transform-box:view-box;transform-origin:120px 130px;animation:fox-ear 6s ease-in-out infinite}
.fox .earR{transform-box:view-box;transform-origin:280px 130px;animation:fox-ear 7.5s ease-in-out 1.2s infinite}
.fox .eyes{transform-box:view-box;transform-origin:200px 170px;transition:transform .09s}
.fox.blink .eyes{transform:scaleY(.08)}
.fox .pupil{transform:translate(var(--lx),var(--ly));transition:transform .18s ease-out}
.fox .arm{transition:transform .35s cubic-bezier(.3,1.5,.5,1)}
.fox .armL{transform-box:view-box;transform-origin:146px 304px}
.fox .armR{transform-box:view-box;transform-origin:254px 304px}
.fox .brow{transition:transform .25s}
.fox .browL{transform-box:view-box;transform-origin:150px 128px}
.fox .browR{transform-box:view-box;transform-origin:250px 128px}
.fox .ears-up{transition:transform .25s}
.fox .sparkles,.fox .zzz,.fox .dots{opacity:0;transition:opacity .2s}
.fox .m-open,.fox .m-o,.fox .m-hmm,.fox .m-talk,.fox .eyes-happy,.fox .eyes-wide,.fox .eyes-sleep{display:none}
.fox .head{transform-box:view-box;transform-origin:200px 290px;transition:transform .3s cubic-bezier(.3,1.4,.5,1)}
.fox .gest{display:none}
.fox .g-shock{transform-box:view-box;transform-origin:200px 170px}
.fox .wavearm{transform-box:view-box;transform-origin:298px 354px}
.fox .qmark{opacity:0;transition:opacity .2s}

/* Humeurs */
.fox[data-mood=joy] .eyes-open,.fox[data-mood=sleep] .eyes-open,.fox[data-mood=surprise] .eyes-open{display:none}
.fox[data-mood=joy] .eyes-happy{display:inline}
.fox[data-mood=joy] .m-smile,.fox[data-mood=surprise] .m-smile,.fox[data-mood=think] .m-smile,.fox[data-mood=sleep] .m-smile,.fox[data-mood=encourage] .m-smile,.fox[data-mood=wave] .m-smile{display:none}
.fox[data-mood=joy] .m-open,.fox[data-mood=encourage] .m-open,.fox[data-mood=wave] .m-open{display:inline}
.fox[data-mood=joy] .blush{opacity:.95}
.fox[data-mood=joy] .sparkles{opacity:1}
.fox[data-mood=joy] .bob{animation:fox-jump .75s ease-in-out 2}
.fox[data-mood=joy] .tail{animation-duration:.7s}
.fox[data-mood=joy] .armL{transform:rotate(38deg)}
.fox[data-mood=joy] .armR{transform:rotate(-38deg)}
.fox[data-mood=encourage] .browL{transform:rotate(11deg) translateY(-7px)}
.fox[data-mood=encourage] .browR{transform:rotate(-11deg) translateY(-7px)}
.fox[data-mood=encourage] .blush{opacity:.9}
.fox[data-mood=encourage] .head{transform:rotate(-3deg)}
.fox[data-mood=encourage] .g-fist{display:inline}
.fox[data-mood=encourage] .armR,.fox[data-mood=encourage] .armL{display:none}
.fox[data-mood=encourage] .g-fist .fist{animation:fox-pump .8s ease-in-out infinite;transform-box:view-box}
.fox[data-mood=encourage] .g-fist .fistR{transform-origin:316px 352px}
.fox[data-mood=encourage] .g-fist .fistL{transform-origin:84px 352px;animation-direction:reverse}
.fox[data-mood=think] .browL{transform:translateY(-17px) rotate(-8deg)}
.fox[data-mood=think] .browR{transform:translateY(3px) rotate(-9deg)}
.fox[data-mood=think] .m-hmm{display:inline}
.fox[data-mood=think] .qmark{opacity:1;animation:fox-q 2s ease-in-out infinite;transform-box:view-box;transform-origin:196px 80px}
.fox[data-mood=think] .head{transform:rotate(-7deg)}
.fox[data-mood=think] .g-chin{display:inline}
.fox[data-mood=think] .armR{display:none}
.fox[data-mood=think]{--lx:8px;--ly:-8px}
.fox[data-mood=wave] .head{transform:rotate(3deg)}
.fox[data-mood=wave] .g-wave{display:inline}
.fox[data-mood=wave] .armR{display:none}
.fox[data-mood=wave] .blush{opacity:.9}
.fox[data-mood=wave] .wavearm{transform-box:view-box;transform-origin:298px 354px;animation:fox-wave .55s ease-in-out infinite alternate}
.fox[data-mood=wave] .waves{animation:fox-dots .55s ease-in-out infinite alternate}
.fox[data-mood=surprise] .eyes-wide{display:inline}
.fox[data-mood=surprise] .m-o{display:inline}
.fox[data-mood=surprise] .browL,.fox[data-mood=surprise] .browR{transform:translateY(-14px)}
.fox[data-mood=surprise] .ears-up{transform:translateY(-10px)}
.fox[data-mood=surprise] .head{transform:translateY(-4px) scale(1.02)}
.fox[data-mood=surprise] .g-cheeks,.fox[data-mood=surprise] .g-shock{display:inline}
.fox[data-mood=surprise] .armL,.fox[data-mood=surprise] .armR{display:none}
.fox[data-mood=surprise] .g-shock{animation:fox-shock .5s ease-out 2}
.fox[data-mood=surprise] .bob{animation:fox-hop .5s ease-out 1}
.fox[data-mood=sleep] .eyes-sleep{display:inline}
.fox[data-mood=sleep] .m-sleep{display:inline}
.fox[data-mood=sleep] .zzz{opacity:1}
.fox[data-mood=sleep] .head{transform:rotate(8deg) translateY(8px)}
.fox[data-mood=sleep] .earL{transform:rotate(-24deg)}
.fox[data-mood=sleep] .earR{transform:rotate(24deg)}
.fox[data-mood=sleep] .tail,.fox[data-mood=sleep] .earL,.fox[data-mood=sleep] .earR{animation:none}
.fox[data-mood=sleep] .bob{animation:fox-breathe 4s ease-in-out infinite}
.fox .m-sleep{display:none}
/* Parole : la bouche s'ouvre et se ferme */
.fox[data-talk="1"][data-mood=neutral] .m-smile,.fox[data-talk="1"][data-mood=encourage] .m-open,.fox[data-talk="1"][data-mood=wave] .m-open,.fox[data-talk="1"][data-mood=think] .m-hmm{display:none}
.fox[data-talk="1"][data-mood=neutral] .m-talk,.fox[data-talk="1"][data-mood=encourage] .m-talk,.fox[data-talk="1"][data-mood=wave] .m-talk,.fox[data-talk="1"][data-mood=think] .m-talk{display:inline;animation:fox-talk .34s ease-in-out infinite;transform-origin:200px 242px;transform-box:view-box}

@keyframes fox-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes fox-breathe{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(2px) scaleY(.99)}}
@keyframes fox-tail{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(7deg)}}
@keyframes fox-ear{0%,86%,100%{transform:rotate(0)}90%{transform:rotate(-7deg)}94%{transform:rotate(3deg)}}
@keyframes fox-jump{0%,100%{transform:translateY(0)}40%{transform:translateY(-34px) rotate(-2deg)}70%{transform:translateY(0) rotate(1deg)}}
@keyframes fox-hop{0%{transform:translateY(0)}45%{transform:translateY(-22px)}100%{transform:translateY(0)}}
@keyframes fox-tilt{0%,100%{transform:rotate(0)}50%{transform:rotate(-2.5deg)}}
@keyframes fox-wave{from{transform:rotate(-8deg)}to{transform:rotate(10deg)}}
@keyframes fox-pump{0%,100%{transform:rotate(0)}50%{transform:rotate(-9deg)}}
@keyframes fox-q{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-7px) rotate(3deg)}}
@keyframes fox-shock{0%{opacity:0;transform:scale(.7)}60%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
@keyframes fox-talk{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
@keyframes fox-spark{0%,100%{transform:scale(.6) rotate(0);opacity:.2}50%{transform:scale(1.15) rotate(25deg);opacity:1}}
@keyframes fox-dots{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes fox-zzz{0%{transform:translate(0,0);opacity:0}30%{opacity:1}100%{transform:translate(14px,-26px);opacity:0}}
.fox .sp{animation:fox-spark 1s ease-in-out infinite}
.fox .sp:nth-child(2){animation-delay:.25s}.fox .sp:nth-child(3){animation-delay:.5s}.fox .sp:nth-child(4){animation-delay:.15s}
.fox .dots circle{animation:fox-dots 1.2s ease-in-out infinite}.fox .dots circle:nth-child(2){animation-delay:.2s}.fox .dots circle:nth-child(3){animation-delay:.4s}
.fox .zzz text{animation:fox-zzz 3s ease-in infinite}.fox .zzz text:nth-child(2){animation-delay:1s}.fox .zzz text:nth-child(3){animation-delay:2s}
@media (prefers-reduced-motion:reduce){.fox *{animation:none!important;transition:none!important}}
`;

const ear = (mirror) => `
<g ${mirror ? 'transform="translate(400,0) scale(-1,1)"' : ''}>
  <path d="M82 154 C66 104 72 56 92 20 C128 38 166 70 184 104 Z" fill="${C.o}"/>
  <path d="M100 116 C94 88 96 64 104 44 C126 58 146 78 156 100 Z" fill="${C.cream}"/>
  <path d="M92 20 C112 28 128 42 142 58 C122 62 100 66 82 76 C82 56 84 38 92 20 Z" fill="${C.tip}"/>
</g>`;

const sparkle = (x, y, s = 1) => `<path class="sp" style="transform-origin:${x}px ${y}px;transform-box:view-box" d="M${x} ${y - 14 * s} L${x + 4 * s} ${y - 4 * s} L${x + 14 * s} ${y} L${x + 4 * s} ${y + 4 * s} L${x} ${y + 14 * s} L${x - 4 * s} ${y + 4 * s} L${x - 14 * s} ${y} L${x - 4 * s} ${y - 4 * s} Z" fill="#FFD25A"/>`;

const ACC = {
  echarpe: `<g><path d="M136 286 C170 312 230 312 264 286 L270 310 C232 336 168 336 130 310 Z" fill="#D94A4A"/><path d="M146 318 L134 384 L170 378 L178 326 Z" fill="#C13A3A"/><path d="M150 330 L146 350 M156 332 L152 352" stroke="#FFD9D0" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>`,
  noeud: `<g transform="translate(0,4)"><path d="M200 300 L166 282 C160 296 160 306 166 318 Z" fill="#3E6FB0"/><path d="M200 300 L234 282 C240 296 240 306 234 318 Z" fill="#3E6FB0"/><circle cx="200" cy="300" r="9" fill="#2F5890"/></g>`,
  lunettes: `<g fill="rgba(255,255,255,.18)" stroke="${C.dark}" stroke-width="5"><circle cx="150" cy="172" r="36"/><circle cx="250" cy="172" r="36"/><path d="M186 168 Q200 160 214 168" fill="none"/><path d="M114 168 L84 158 M286 168 L316 158" fill="none" stroke-linecap="round"/></g>`,
  chapeau: `<g><ellipse cx="200" cy="104" rx="108" ry="22" fill="#B98C48"/><path d="M142 102 C142 56 164 36 200 36 C236 36 258 56 258 102 Z" fill="#D2A75C"/><path d="M142 94 C170 104 230 104 258 94 L258 104 C230 114 170 114 142 104 Z" fill="#7A5230"/></g>`,
  medaille: `<g><path d="M178 304 L200 350 L222 304" fill="none" stroke="#D94A4A" stroke-width="9" stroke-linejoin="round"/><circle cx="200" cy="362" r="17" fill="#F5C541" stroke="#C99A1E" stroke-width="3"/><path d="M200 351 L204 360 L214 361 L206 367 L209 377 L200 371 L191 377 L194 367 L186 361 L196 360 Z" fill="#FFF3B0"/></g>`,
};


// Gestes : dessinés devant la tête, visibles seulement dans l'humeur qui les demande (voir FOX_CSS).
const limb = (d) => `<path d="${d}" fill="none" stroke="${C.deep}" stroke-width="35" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${C.o}" stroke-width="29" stroke-linecap="round" stroke-linejoin="round"/>`;
const paw = (x, y, r = 19) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r - 3}" fill="${C.tip}"/><path d="M${x - 7} ${y - r + 7} L${x - 7} ${y - 2} M${x + 2} ${y - r + 6} L${x + 2} ${y - 2}" stroke="#6A4430" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
const GESTES = `
  <g class="gest g-fist">
    ${limb('M250 316 C284 320 312 330 316 352')}
    <g class="fist fistR">${limb('M316 352 L322 296')}${paw(322, 282, 23)}</g>
    ${limb('M150 316 C116 320 88 330 84 352')}
    <g class="fist fistL">${limb('M84 352 L78 296')}${paw(78, 282, 23)}</g>
    ${sparkle(356, 250, 0.8)}${sparkle(44, 250, 0.8)}
  </g>
  <g class="gest g-chin">
    ${limb('M250 316 C292 324 298 300 254 290')}
    ${paw(243, 281, 21)}
  </g>
  <g class="gest g-wave">
    ${limb('M250 316 L298 354')}
    <g class="wavearm">${limb('M298 354 L322 280')}${paw(325, 266, 21)}</g>
    <g class="waves" fill="none" stroke="${C.deep}" stroke-width="6" stroke-linecap="round"><path d="M352 246 Q364 264 352 282"/><path d="M366 232 Q386 264 366 296"/></g>
  </g>
  <g class="gest g-cheeks">
    ${limb('M152 316 C116 330 86 318 96 284')}${paw(100, 266, 20)}
    ${limb('M248 316 C284 330 314 318 304 284')}${paw(300, 266, 20)}
  </g>
  <g class="gest g-shock" fill="none" stroke="${C.deep}" stroke-width="7" stroke-linecap="round">
    <path d="M200 40 L200 66"/><path d="M170 46 L178 68"/><path d="M230 46 L222 68"/>
    <path d="M30 112 L50 124"/><path d="M20 152 L44 156"/><path d="M370 112 L350 124"/><path d="M380 152 L356 156"/>
  </g>
  <g class="qmark" aria-hidden="true">
    <circle cx="176" cy="84" r="4.5" fill="#fff" stroke="${C.deep}" stroke-width="3"/><circle cx="186" cy="68" r="7" fill="#fff" stroke="${C.deep}" stroke-width="3"/>
    <ellipse cx="214" cy="34" rx="37" ry="28" fill="#fff" stroke="${C.deep}" stroke-width="4"/>
    <text x="214" y="49" text-anchor="middle" font-size="42" font-weight="700" fill="${C.deep}" font-family="Fredoka,system-ui,sans-serif">?</text>
  </g>`;

export function foxSVG({ accessories = [] } = {}) {
  const has = (k) => accessories.includes(k);
  return `
<svg class="fox" data-mood="neutral" viewBox="0 0 400 460" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Le renard">
 <g class="bob">
  <g class="tail">
    <path d="M262 414 C336 428 396 398 398 330 C400 296 382 268 356 260 C372 296 350 332 318 346 C296 356 274 356 262 350 Z" fill="${C.o}"/>
    <path d="M356 260 C382 268 400 296 398 330 C394 322 382 314 366 310 C372 294 368 276 356 260 Z" fill="${C.cream}"/>
  </g>
  <rect x="110" y="288" width="180" height="132" rx="30" fill="${C.pack}"/>
  <path d="M132 292 C132 276 268 276 268 292" fill="none" stroke="${C.strap}" stroke-width="9" stroke-linecap="round"/>
  <path d="M138 292 C126 332 124 392 148 426 L252 426 C276 392 274 332 262 292 C240 304 160 304 138 292 Z" fill="${C.o}"/>
  <ellipse cx="200" cy="366" rx="44" ry="56" fill="${C.cream}"/>
  <path d="M174 296 C174 330 172 362 166 394 M226 296 C226 330 228 362 234 394" fill="none" stroke="${C.strap}" stroke-width="12" stroke-linecap="round"/>
  <rect x="160" y="372" width="14" height="8" rx="3" fill="#8FD0C9"/><rect x="226" y="372" width="14" height="8" rx="3" fill="#8FD0C9"/>
  <ellipse cx="168" cy="432" rx="32" ry="16" fill="${C.tip}"/><ellipse cx="232" cy="432" rx="32" ry="16" fill="${C.tip}"/>
  <g class="arm armL"><path d="M150 304 C132 320 124 352 126 380 C132 389 148 389 154 380 C152 354 158 330 166 316 Z" fill="${C.o}"/><ellipse cx="139" cy="383" rx="16" ry="12" fill="${C.tip}"/></g>
  <g class="arm armR"><path d="M250 304 C268 320 276 352 274 380 C268 389 252 389 246 380 C248 354 242 330 234 316 Z" fill="${C.o}"/><ellipse cx="261" cy="383" rx="16" ry="12" fill="${C.tip}"/></g>
  ${has('echarpe') ? ACC.echarpe : ''}${has('noeud') ? ACC.noeud : ''}${has('medaille') ? ACC.medaille : ''}

  <g class="head">
  <g class="ears-up"><g class="earL">${ear(false)}</g><g class="earR">${ear(true)}</g></g>

  <path d="M200 92 C150 92 100 112 78 150 C66 172 54 190 40 202 C62 204 78 206 92 214 C110 252 150 282 200 284 C250 282 290 252 308 214 C322 206 338 204 360 202 C346 190 334 172 322 150 C300 112 250 92 200 92 Z" fill="${C.o}"/>
  <path d="M44 203 C100 200 160 196 200 172 C240 196 300 200 356 203 C340 204 324 206 308 214 C290 252 250 282 200 284 C150 282 110 252 92 214 C76 206 58 204 44 203 Z" fill="${C.cream}"/>

  <ellipse class="blush" cx="108" cy="228" rx="19" ry="11" fill="${C.pink}" opacity=".6"/>
  <ellipse class="blush" cx="292" cy="228" rx="19" ry="11" fill="${C.pink}" opacity=".6"/>

  <g class="eyes">
   <g class="eyes-open">
    <ellipse cx="150" cy="170" rx="26" ry="31" fill="#fff"/><ellipse cx="250" cy="170" rx="26" ry="31" fill="#fff"/>
    <g class="pupil"><circle cx="150" cy="172" r="19" fill="${C.dark}"/><circle cx="157" cy="163" r="6.5" fill="#fff"/><circle cx="144" cy="181" r="3" fill="#fff"/></g>
    <g class="pupil"><circle cx="250" cy="172" r="19" fill="${C.dark}"/><circle cx="257" cy="163" r="6.5" fill="#fff"/><circle cx="244" cy="181" r="3" fill="#fff"/></g>
   </g>
   <g class="eyes-wide">
    <ellipse cx="150" cy="168" rx="30" ry="36" fill="#fff"/><ellipse cx="250" cy="168" rx="30" ry="36" fill="#fff"/>
    <circle cx="150" cy="170" r="14" fill="${C.dark}"/><circle cx="154" cy="165" r="4.5" fill="#fff"/>
    <circle cx="250" cy="170" r="14" fill="${C.dark}"/><circle cx="254" cy="165" r="4.5" fill="#fff"/>
   </g>
   <g class="eyes-happy" fill="none" stroke="${C.dark}" stroke-width="9" stroke-linecap="round"><path d="M124 178 C132 156 168 156 176 178"/><path d="M224 178 C232 156 268 156 276 178"/></g>
   <g class="eyes-sleep" fill="none" stroke="${C.dark}" stroke-width="7" stroke-linecap="round"><path d="M126 170 C138 182 162 182 174 170"/><path d="M226 170 C238 182 262 182 274 170"/></g>
  </g>
  <path class="brow browL" d="M122 128 Q150 112 176 126" fill="none" stroke="${C.tip}" stroke-width="7" stroke-linecap="round"/>
  <path class="brow browR" d="M224 126 Q250 112 278 128" fill="none" stroke="${C.tip}" stroke-width="7" stroke-linecap="round"/>

  <path d="M186 208 C192 203 208 203 214 208 C214 217 205 224 200 226 C195 224 186 217 186 208 Z" fill="${C.dark}"/>
  <ellipse cx="195" cy="209" rx="4" ry="2.2" fill="#fff" opacity=".5"/>
  <path d="M200 226 L200 236" stroke="${C.dark}" stroke-width="4" stroke-linecap="round"/>
  <path class="m-smile" d="M176 238 C186 254 197 252 200 236 C203 252 214 254 224 238" fill="none" stroke="${C.dark}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <g class="m-open"><path d="M174 236 C180 272 220 272 226 236 C214 242 186 242 174 236 Z" fill="${C.dark}" stroke="${C.dark}" stroke-width="4" stroke-linejoin="round"/><path d="M186 258 C192 250 208 250 214 258 C208 268 192 268 186 258 Z" fill="${C.pink}"/></g>
  <g class="m-o"><ellipse cx="200" cy="248" rx="11" ry="14" fill="${C.dark}"/></g>
  <path class="m-hmm" d="M182 244 C192 240 206 246 220 238" fill="none" stroke="${C.dark}" stroke-width="5" stroke-linecap="round"/>
  <g class="m-talk"><path d="M180 238 C184 262 216 262 220 238 C210 244 190 244 180 238 Z" fill="${C.dark}" stroke="${C.dark}" stroke-width="4" stroke-linejoin="round"/></g>
  <path class="m-sleep" d="M190 242 C196 248 204 248 210 242" fill="none" stroke="${C.dark}" stroke-width="5" stroke-linecap="round"/>

  ${has('lunettes') ? ACC.lunettes : ''}
  ${has('chapeau') ? ACC.chapeau : ''}

  <g transform="rotate(32 284 104)">
    <rect x="276" y="52" width="16" height="74" rx="2" fill="${C.pencil}"/><rect x="276" y="52" width="6" height="74" rx="2" fill="#F7D679"/>
    <path d="M276 52 L292 52 L284 30 Z" fill="#E8C69C"/><path d="M281 40 L287 40 L284 30 Z" fill="${C.dark}"/>
    <rect x="276" y="120" width="16" height="12" rx="3" fill="#EE8A97"/><rect x="276" y="114" width="16" height="6" fill="#B8C0C8"/>
  </g>
  </g>
${GESTES}
  <g class="sparkles">${sparkle(56, 90, 1.1)}${sparkle(348, 84, 1.3)}${sparkle(30, 238, 0.9)}${sparkle(372, 232, 1)}</g>
  <g class="dots" fill="${C.deep}"><circle cx="318" cy="60" r="5"/><circle cx="338" cy="44" r="7"/><circle cx="364" cy="28" r="9"/></g>
  <g class="zzz" aria-hidden="true" fill="${C.deep}" font-family="Fredoka,system-ui,sans-serif" font-weight="700"><text x="296" y="92" font-size="36">z</text><text x="322" y="62" font-size="46">z</text><text x="350" y="30" font-size="58">z</text></g>
 </g>
</svg>`;
}

/** Contrôleur : humeur, parole, regard, clignement, accessoires. */
export class Fox {
  constructor(host, { accessories = [], scale = 1 } = {}) {
    this.host = host;
    this.accessories = accessories;
    this.scale = scale;
    this.render();
    this.blinkTimer = null;
    this.scheduleBlink();
    this.onMove = (e) => this.lookAt(e.clientX, e.clientY);
    window.addEventListener('pointermove', this.onMove, { passive: true });
  }
  render() {
    const mood = this.svg?.dataset.mood || 'neutral';
    const talk = this.svg?.dataset.talk || '0';
    this.host.innerHTML = foxSVG({ accessories: this.accessories });
    this.svg = this.host.querySelector('svg');
    this.svg.dataset.mood = mood;
    this.svg.dataset.talk = talk;
    this.svg.style.transform = `scale(${this.scale})`;
    this.svg.style.transformOrigin = '50% 100%';
  }
  setAccessories(list) { this.accessories = list; this.render(); }
  setScale(s) { this.scale = s; this.svg.style.transform = `scale(${s})`; }
  setMood(m, ms = 0) {
    this.svg.dataset.mood = m;
    clearTimeout(this.moodTimer);
    if (ms) this.moodTimer = setTimeout(() => this.setMood('neutral'), ms);
    // relance l'animation de saut / sursaut
    const bob = this.svg.querySelector('.bob');
    bob.style.animation = 'none'; void bob.getBoundingClientRect(); bob.style.animation = '';
  }
  talk(on) { this.svg.dataset.talk = on ? '1' : '0'; }
  lookAt(x, y) {
    if (!this.svg.isConnected || this.svg.dataset.mood === 'think' || this.svg.dataset.mood === 'sleep') return;
    const r = this.svg.getBoundingClientRect();
    if (!r.width) return;
    const dx = (x - (r.left + r.width / 2)) / Math.max(200, r.width);
    const dy = (y - (r.top + r.height * 0.4)) / Math.max(200, r.height);
    const cl = (v, m) => Math.max(-m, Math.min(m, v));
    this.svg.style.setProperty('--lx', `${cl(dx * 16, 7).toFixed(1)}px`);
    this.svg.style.setProperty('--ly', `${cl(dy * 14, 6).toFixed(1)}px`);
  }
  scheduleBlink() {
    this.blinkTimer = setTimeout(() => {
      if (!this.svg.isConnected) return this.scheduleBlink();
      this.svg.classList.add('blink');
      setTimeout(() => this.svg.classList.remove('blink'), 120);
      this.scheduleBlink();
    }, 2200 + Math.random() * 3200);
  }
  destroy() { clearTimeout(this.blinkTimer); clearTimeout(this.moodTimer); window.removeEventListener('pointermove', this.onMove); }
}
