# Publier Renard sur Google Play : ce qu'il reste à faire à la main

Le code est prêt pour une version à publier (numéro de version, signature, sauvegarde Google coupée). Les étapes ci-dessous ne peuvent être faites que par vous.

## 1. Mettre le dépôt en privé (tout de suite)

GitHub > Settings > General > Danger Zone > *Change repository visibility* > Private. Tant que le dépôt est public, le code, les voix et les APK de test (onglet Releases) sont téléchargeables par tous. Supprimez aussi les anciennes Releases si elles ont été vues.

## 2. Ouvrir le compte développeur Google (le délai le plus long : à lancer maintenant)

Le compte se crée sur play.google.com/console (frais uniques de 25 dollars). Deux types de compte, deux délais :

| Type de compte | Ce que Google demande avant la mise en vente | Délai à prévoir |
| --- | --- | --- |
| Personnel | Un test fermé avec au moins 12 testeurs, inscrits sans interruption pendant 14 jours, puis une demande d'accès à la production que Google examine | 14 jours de test, plus le temps de trouver les testeurs et l'examen |
| Organisation | Un numéro D-U-N-S (gratuit, délivré par Dun & Bradstreet) et un document officiel de l'entreprise ; pas de test fermé obligatoire | Jusqu'à 30 jours pour le numéro |

- La règle des 12 testeurs vaut pour les comptes personnels créés après le 13 novembre 2023. Source : [aide Play Console, exigences de test](https://support.google.com/googleplay/android-developer/answer/14151465).
- Le numéro D-U-N-S : [aide Play Console, informations requises](https://support.google.com/googleplay/android-developer/answer/13628312). Vérifiez d'abord sur le site de Dun & Bradstreet si votre micro-entreprise en a déjà un, et si elle peut ouvrir un compte « organisation » : je n'ai pas pu le confirmer.
- Dans les deux cas, comptez plusieurs semaines entre l'ouverture du compte et la mise en vente. Le test fermé demande d'avoir déjà envoyé un fichier signé (étapes 4 et 5).

## 3. Choisir l'identifiant de l'application (définitif)

L'identifiant actuel est `fr.renard.ecriture`. Une fois l'application publiée, il ne peut plus changer. S'il doit porter votre nom de domaine ou d'éditeur, changez-le maintenant, aux trois endroits : `capacitor.config.json` (`appId`), `android/app/build.gradle` (`namespace` et `applicationId`), et le dossier `android/app/src/main/java/fr/renard/ecriture/` (ligne `package` de `MainActivity.java`).

## 4. Créer la clé d'envoi (une seule fois)

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

## 5. Fusionner la version, puis construire le fichier à envoyer

**D'abord fusionner.** Le workflow « AAB Google Play » vit dans `.github/workflows/aab.yml`. GitHub ne le propose dans l'onglet Actions que lorsqu'il est sur la branche principale : tant que la demande de fusion de la version 1.12 n'est pas fusionnée dans `main`, il n'apparaît pas.

Ensuite : GitHub > Actions > « AAB Google Play » > *Run workflow*. Le fichier `app-release.aab` se télécharge depuis l'exécution (artefact `renard-aab`). Le numéro de version vient de `package.json` : « 1.12.0 » donne le code 11200 ; il doit augmenter à chaque envoi.

L'APK de test (workflow « APK Android ») reste signé avec la clé de débogage : pratique pour vos essais, refusé par Google Play.

Ce fichier signé n'a encore jamais été construit : prévoyez un essai de ce premier fichier sur la tablette (piste de test interne de la Play Console) avant d'aller plus loin.

## 6. Essayer sur une vraie tablette avant d'envoyer

- Installer l'APK de test, jouer dix minutes, fermer l'application, la rouvrir : la progression est là.
- Tester le bouton retour d'Android au milieu d'un exercice.
- Ouvrir un cahier PDF et partager le code de sauvegarde.
- Écouter une vingtaine de phrases (dont une dictée entière, « Écris le mot maman », « On dirait une autre lettre »).
- Vérifier la sauvegarde : `adb shell bmgr backupnow fr.renard.ecriture` doit répondre que la sauvegarde n'est pas autorisée (« Backup is not allowed »).
- **Licence de la voix** : la voix du renard (v1.12) vient du modèle Piper « upmc », dont la fiche indique un corpus sous licence CC BY-SA 4.0 : usage commercial permis, à condition de citer la source (c'est fait dans les Crédits) ; la clause « partage dans les mêmes conditions » vise les œuvres dérivées du corpus. Savoir si elle s'étend aux enregistrements produits par le modèle n'est pas tranché : faites-le confirmer avant la mise en vente. La voix précédente (« siwis », CC BY 4.0, sans cette clause) se régénère en une commande : `python3 tools/voix-piper.py fr-siwis-medium.onnx --voix siwis --refaire`.
- **Permission INTERNET** : elle est encore déclarée dans `AndroidManifest.xml`, par prudence. L'application n'en a pas besoin pour fonctionner en théorie, mais cela doit être vérifié sur tablette : retirez la ligne `<uses-permission android:name="android.permission.INTERNET" />`, reconstruisez l'APK de test, et vérifiez que l'application s'ouvre, que les voix se lisent, que les PDF s'ouvrent. Si tout marche, gardez-la retirée : la fiche Play affichera alors « aucune autorisation », ce qui prouve la promesse « hors ligne ».

## 7. Le test fermé (compte personnel seulement)

- Play Console > Tests > Tests fermés : créer une piste, y envoyer le fichier `app-release.aab`, ajouter les adresses Google des testeurs, leur transmettre le lien d'inscription.
- Il faut 12 testeurs inscrits en continu pendant 14 jours : prévoyez-en quelques-uns de plus, car un testeur qui se désinscrit ne compte plus. Un test ouvert ne compte pas.
- Au bout des 14 jours, la demande d'accès à la production se fait dans la Play Console, avec quelques questions sur le test. Google l'examine : ce n'est pas automatique.
- Des parents d'élèves, des collègues et des proches avec une tablette Android font de bons testeurs : c'est aussi votre premier vrai retour d'usage.

## 8. Déclarations dans la Play Console

- **Public cible et contenu** : tranches d'âge « 5 ans et moins » et « 6 à 8 ans ». L'application relève alors du programme Familles.
- **Sécurité des données** : « aucune donnée collectée », « aucune donnée partagée ».
- **Politique de confidentialité** : publiez `docs/politique-de-confidentialite.md` (complétée) à une adresse web publique et donnez cette adresse.
- **Annonces** : non. **Achats intégrés** : non.
- **Appareils** : indiquez dans la description « conçu pour tablette Android » ; vous pouvez restreindre aux tablettes dans le catalogue d'appareils.
- **Fiche** : ne promettez que ce que la version fait. Aujourd'hui, les mots s'écrivent lettre par lettre (lettres détachées) ; les liaisons et les majuscules cursives ne sont pas encore là.
