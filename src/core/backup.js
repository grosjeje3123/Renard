// Sauvegarde de la progression : un code texte (compressé) que les parents copient ou enregistrent,
// puis recollent sur une autre tablette. Tout reste local : rien n'est envoyé nulle part.
import { STATE_VERSION, hydrate } from './progress.js';

const toB64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (b64) => {
  const s = atob(b64), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};
const through = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

/** Code de sauvegarde : « RENARD1: » (compressé) ou « RENARD0: » (si l'appareil ne sait pas compresser). */
export async function encodeBackup(state, now = Date.now()) {
  const { galerie: _dessins, ...sans } = state; // les dessins de la galerie restent sur la tablette (trop lourds pour un code à copier)
  const bytes = new TextEncoder().encode(JSON.stringify({ app: 'renard', v: STATE_VERSION, exported: now, state: sans }));
  if (typeof CompressionStream !== 'undefined') {
    try { return `RENARD1:${toB64(await through(bytes, new CompressionStream('gzip')))}`; } catch { /* repli ci-dessous */ }
  }
  return `RENARD0:${toB64(bytes)}`;
}

/** Relit un code de sauvegarde et retourne un état complet. Lève une Error au message lisible par un parent. */
export async function decodeBackup(text) {
  const m = /^RENARD([01]):(.+)$/.exec(String(text || '').replace(/\s+/g, ''));
  if (!m) throw new Error('Ce texte n’est pas un code de sauvegarde Renard.');
  let bytes;
  try { bytes = fromB64(m[2]); } catch { throw new Error('Le code est incomplet : copiez-le en entier.'); }
  if (m[1] === '1') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Cet appareil ne sait pas relire ce code.');
    try { bytes = await through(bytes, new DecompressionStream('gzip')); } catch { throw new Error('Le code est incomplet ou abîmé : copiez-le en entier.'); }
  }
  let data;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('Le code est abîmé.'); }
  const s = data?.state;
  if (data?.app !== 'renard' || !s || typeof s !== 'object' || s.v !== STATE_VERSION || typeof s.skills !== 'object' || s.skills === null) throw new Error('Ce code ne vient pas de Renard, ou d’une version trop différente.');
  return hydrate(s);
}
