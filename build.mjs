// Construit un seul fichier HTML autonome (polices, styles et code inclus, aucune requête réseau).
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

const out = await build({ entryPoints: ['src/main.js'], bundle: true, minify: process.env.NOMIN ? false : true, format: 'iife', target: ['es2020'], write: false, legalComments: 'none' });
const js = out.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');
const css = fs.readFileSync('src/styles.css', 'utf8');
const font = (pkg, file, family, weights) => {
  const b64 = fs.readFileSync(path.join('node_modules/@fontsource-variable', pkg, 'files', file)).toString('base64');
  return `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:${weights};src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
};
const fonts = font('fredoka', 'fredoka-latin-wght-normal.woff2', 'Fredoka', '300 700') + font('nunito', 'nunito-latin-wght-normal.woff2', 'Nunito', '200 1000');
let html = fs.readFileSync('src/index.template.html', 'utf8');
html = html.replace('/*FONTS*/', () => fonts).replace('/*CSS*/', () => css).replace('/*JS*/', () => js);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0), 'Ko');

// Politique de sécurité du contenu de l'application : aucune connexion réseau possible depuis les pages
// (connect-src 'none'), aucune page ni script externe, aucune image distante. Vérifiable par tools/csp-check.mjs.
export const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";

// Mode application (--app) : page HTML complète pour la WebView Android (Capacitor), dans www/.
// Le fichier dist/ reste un fragment (publié tel quel en artefact, qui ajoute lui-même doctype et en-têtes).
if (process.argv.includes('--app')) {
  const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="color-scheme" content="light dark">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>
</head>
<body>
${html}
</body>
</html>`;
  fs.mkdirSync('www', { recursive: true });
  fs.writeFileSync('www/index.html', page);
  console.log('www/index.html', (page.length / 1024).toFixed(0), 'Ko');
}

// Mode installable (--pwa) : dossier pwa/ à déposer sur un hébergement HTTPS. Une fois « ajouté à l'écran d'accueil »,
// Renard s'ouvre sans barre de navigateur (plein écran) et fonctionne sans connexion.
// La page garde connect-src 'none' : elle ne peut rien envoyer ; seul le service worker relit les fichiers de l'application sur son propre hébergement.
if (process.argv.includes('--pwa')) {
  const { createHash } = await import('crypto');
  const CSP_PWA = `${CSP.replace("img-src data: blob:", "img-src 'self' data: blob:")}; manifest-src 'self'; worker-src 'self'`;
  const iconDir = 'src/pwa/icons';
  const icons = fs.readdirSync(iconDir).sort();
  const manifest = fs.readFileSync('src/pwa/manifest.webmanifest', 'utf8');
  const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP_PWA}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#F08A24">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Renard">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>
</head>
<body>
${html}
<script>
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
}
</script>
</body>
</html>`;
  const version = createHash('sha1').update(page).update(manifest).update(icons.map((f) => fs.readFileSync(path.join(iconDir, f))).reduce((a, b) => Buffer.concat([a, b]), Buffer.alloc(0))).digest('hex').slice(0, 10);
  fs.rmSync('pwa', { recursive: true, force: true });
  fs.mkdirSync('pwa/icons', { recursive: true });
  fs.writeFileSync('pwa/index.html', page);
  fs.writeFileSync('pwa/manifest.webmanifest', manifest);
  fs.writeFileSync('pwa/sw.js', fs.readFileSync('src/pwa/sw.js', 'utf8').replace('__VERSION__', version));
  fs.copyFileSync('src/pwa/_headers', 'pwa/_headers');
  fs.copyFileSync('src/pwa/LISEZMOI.txt', 'pwa/LISEZMOI.txt');
  for (const f of icons) fs.copyFileSync(path.join(iconDir, f), path.join('pwa/icons', f));
  console.log('pwa/', icons.length + 5, 'fichiers · index', (page.length / 1024).toFixed(0), 'Ko · version', version);
}
