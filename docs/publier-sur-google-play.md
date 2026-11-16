# Publier Renard sur Google Play : ce qu'il reste à faire à la main

Le code est prêt pour une version à publier (numéro de version, signature, sauvegarde Google coupée). Les étapes ci-dessous ne peuvent être faites que par vous.

## 1. Mettre le dépôt en privé (tout de suite)

GitHub > Settings > General > Danger Zone > *Change repository visibility* > Private. Tant que le dépôt est public, le code, les voix et les APK de test (onglet Releases) sont téléchargeables par tous. Supprimez aussi les anciennes Releases si elles ont été vues.

## 2. Choisir l'identifiant de l'application (définitif)

L'identifiant actuel est `fr.renard.ecriture`. Une fois l'application publiée, il ne peut plus changer. S'il doit porter votre nom de domaine ou d'éditeur, changez-le maintenant, aux trois endroits : `capacitor.config.json` (`appId`), `android/app/build.gradle` (`namespace` et `applicationId`), et le dossier `android/app/src/main/java/fr/renard/ecriture/` (ligne `package` de `MainActivity.java`).

## 3. Créer la clé d'envoi (une seule fois)

Sur un ordinateur avec Java :

```
keytool -genkeypair -v -keystore renard-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias renard
```

Gardez ce fichier et ses mots de passe en lieu sûr, hors du dépôt (un gestionnaire de mots de passe, plus une copie). Dans la Play Console, laissez « Play App Signing » activé : si la clé d'envoi est perdue, Google peut la remplacer.

Puis, dans GitHub > Settings > Secrets and variables > Actions, ajoutez quatre secrets :

| Secret | Valeur |
| --- | --- |
| `RENARD_KEYSTORE_BASE64` | le fichier encodé : `base64 -w0 renard-upload.jks` (Linux), `base64 -i renard-upload.jks` (macOS) |
| `RENARD_KEYSTORE_PASSWORD` | le mot de passe du fichier |
| `RENARD_KEY_ALIAS` | `renard` |
| `RENARD_KEY_PASSWORD` | le mot de passe de la clé |

## 4. Construire le fichier à envoyer

GitHub > Actions > « AAB Google Play » > *Run workflow*. Le fichier `app-release.aab` se télécharge depuis l'exécution (artefact `renard-aab`). Le numéro de version vient de `package.json` : « 1.12.0 » donne le code 11200 ; il doit augmenter à chaque envoi.

L'APK de test (workflow « APK Android ») reste signé avec la clé de débogage : pratique pour vos essais, refusé par Google Play.

## 5. Essayer sur une vraie tablette avant d'envoyer

- Installer l'APK de test, jouer dix minutes, fermer l'application, la rouvrir : la progression est là.
- Tester le bouton retour d'Android au milieu d'un exercice.
- Ouvrir un cahier PDF et partager le code de sauvegarde.
- Écouter une vingtaine de phrases (dont « Comme dans bateau », « On dirait une autre lettre »).
- Vérifier la sauvegarde : `adb shell bmgr backupnow fr.renard.ecriture` doit répondre que la sauvegarde n'est pas autorisée (« Backup is not allowed »).
- **Permission INTERNET** : elle est encore déclarée dans `AndroidManifest.xml`, par prudence. L'application n'en a pas besoin pour fonctionner en théorie, mais cela doit être vérifié sur tablette : retirez la ligne `<uses-permission android:name="android.permission.INTERNET" />`, reconstruisez l'APK de test, et vérifiez que l'application s'ouvre, que les voix se lisent, que les PDF s'ouvrent. Si tout marche, gardez-la retirée : la fiche Play affichera alors « aucune autorisation », ce qui prouve la promesse « hors ligne ».

## 6. Déclarations dans la Play Console

- **Public cible et contenu** : tranches d'âge « 5 ans et moins » et « 6 à 8 ans ». L'application relève alors du programme Familles.
- **Sécurité des données** : « aucune donnée collectée », « aucune donnée partagée ».
- **Politique de confidentialité** : publiez `docs/politique-de-confidentialite.md` (complétée) à une adresse web publique et donnez cette adresse.
- **Annonces** : non. **Achats intégrés** : non.
- **Appareils** : indiquez dans la description « conçu pour tablette » ; vous pouvez restreindre aux tablettes dans le catalogue d'appareils.
- **Fiche** : ne promettez que ce que la version fait. Aujourd'hui, les mots s'écrivent lettre par lettre (lettres détachées) ; les liaisons et les majuscules cursives ne sont pas encore là.
