// Construit l'APK localement : page de l'app, synchronisation Capacitor, puis Gradle (Windows, macOS, Linux).
// Prérequis : Node 20+, JDK 21 et Android Studio (ou le SDK Android avec ANDROID_HOME défini).
import { spawnSync } from 'child_process';
import fs from 'fs';
const win = process.platform === 'win32';
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd, shell: win });
  if (r.status !== 0) { console.error(`\nÉchec : ${cmd} ${args.join(' ')}`); process.exit(r.status || 1); }
};
run('node', ['build.mjs', '--app']);
run('npx', ['cap', 'sync', 'android']);
run(win ? 'gradlew.bat' : './gradlew', ['assembleDebug'], 'android');
const apk = 'android/app/build/outputs/apk/debug/app-debug.apk';
console.log(fs.existsSync(apk) ? `\nAPK prêt : ${apk}` : '\nAPK introuvable : voir les messages ci-dessus.');
