import { foxSVG, FOX_CSS } from '../src/ui/fox.js';
import fs from 'fs';
const moods = ['neutral', 'joy', 'encourage', 'think', 'surprise', 'sleep', 'wave'];
const cell = (m, acc, talk) => `<div style="width:300px;height:345px;background:#FFE9C7;border-radius:12px;position:relative"><div style="position:absolute;left:8px;top:6px;font:14px sans-serif">${m}${talk ? ' (parle)' : ''}</div>${foxSVG({ accessories: acc }).replace('data-mood="neutral"', `data-mood="${m}" data-talk="${talk ? 1 : 0}"`)}</div>`;
const html = `<!doctype html><meta charset=utf-8><style>${FOX_CSS} body{margin:0;background:#fff;display:flex;flex-wrap:wrap;gap:8px;padding:8px;width:960px}</style>
${moods.map((m) => cell(m, [])).join('')}
${cell('neutral', ['echarpe', 'lunettes', 'chapeau', 'noeud', 'medaille'])}${cell('neutral', [], true)}${cell('joy', ['echarpe', 'chapeau', 'medaille'])}`;
fs.writeFileSync('/tmp/fox.html', html);
