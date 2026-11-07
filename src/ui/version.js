// Version affichée dans les crédits : numéro et mois de fabrication, fixés au moment de la fabrication (build.mjs).
/* global __APP_VERSION__, __APP_DATE__ */
export const version = () => {
  const v = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  const d = typeof __APP_DATE__ !== 'undefined' ? __APP_DATE__ : '';
  return d ? `version ${v} · ${d}` : `version ${v}`;
};
