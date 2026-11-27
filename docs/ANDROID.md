# APK Android (debug)

L'APK est produit à partir du même build web, emballé par Capacitor. On teste toujours la
version web avant.

## Prérequis (une seule fois)

- JDK 21 (Capacitor 8) : `winget install Microsoft.OpenJDK.21`
- SDK Android dans un chemin **sans espace**, par exemple `C:\Android\Sdk`, avec
  `platform-tools`, `platforms;android-36` et `build-tools;36.0.0` (via les outils en ligne de
  commande ou Android Studio).
- Fichier `apps/app/android/local.properties` (non commité) :
  `sdk.dir=C\:\Android\Sdk`

## Générer l'APK de debug (PowerShell)

```powershell
cd apps\app
pnpm android:sync                      # build web + copie dans le projet Android
cd android
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-21.0.13.102-hotspot'
.\gradlew.bat assembleDebug
# → app\build\outputs\apk\debug\app-debug.apk
```

## Installer sur un téléphone

1. Sur le téléphone : Paramètres → À propos → toucher 7 fois « Numéro de build », puis
   Options pour les développeurs → activer « Débogage USB ».
2. Brancher le téléphone en USB et accepter l'empreinte de l'ordinateur.
3. ```powershell
   C:\Android\Sdk\platform-tools\adb.exe install -r app\build\outputs\apk\debug\app-debug.apk
   ```

Sans câble : copier `app-debug.apk` sur le téléphone et l'ouvrir (autoriser « Installer des
applications inconnues » pour le gestionnaire de fichiers).

## APK release signé et aligné

La keystore de publication vit **hors du dépôt**, dans `%USERPROFILE%\.kairo-signing\` :

- `kairo-release.jks` : clé RSA 4096, alias `kairo`, valable 10 000 jours ;
- `keystore.properties` : `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.

**Sauvegardez ces deux fichiers** (gestionnaire de mots de passe, clé USB chiffrée). Sans eux,
impossible de publier une mise à jour de l'app sous le même nom.

```powershell
cd apps\app
powershell -ExecutionPolicy Bypass -File scripts\android-release.ps1
# → android\app\build\outputs\apk\release\kairo-<version>-release.apk
```

Le script : build web + `cap sync` → `gradlew assembleRelease` (non signé) → `zipalign -p 4`
→ `apksigner sign` (v2 + v3) → vérifie l'alignement et la signature. L'ordre compte : aligner
**avant** de signer, sinon la signature v2+ est invalidée.

Pour chaque nouvelle version, augmentez `versionCode` (et `versionName`) dans
`android/app/build.gradle`.

Installer : `C:\Android\Sdk\platform-tools\adb.exe install -r <apk>`. Un APK release ne
s'installe pas par-dessus l'APK de debug (signatures différentes) : désinstallez d'abord.

## Rappels, voix et minuteur de focus

- **Notifications** : Kairo demande l'autorisation à la fin de l'accueil et au premier créneau
  avec rappel. Si elle a été refusée : Paramètres Android → Applications → Kairo → Notifications.
- **À la minute près** : la permission `USE_EXACT_ALARM` (app d'agenda) est accordée d'office.
- **Annonce vocale** : module natif `KairoNativePlugin` (TextToSpeech d'Android), programmé avec
  AlarmManager : la voix parle même app fermée, au volume des notifications (muette en mode
  silencieux). Réglages → « Annonce vocale » pour la couper. Il faut une voix française
  installée (Paramètres → Synthèse vocale).
- **Minuteur de focus** : notification permanente avec compte à rebours, visible sur l'écran
  verrouillé et dans le volet ; un appui rouvre l'app.
- **Économie de batterie** : sur certains téléphones (Xiaomi, Tecno, Infinix, Samsung…), régler
  la batterie de Kairo sur « Sans restriction », sinon le système peut bloquer les rappels.

## Ouvrir dans Android Studio (facultatif)

`pnpm android:open`

Les clés de signature de la version publiée ne doivent jamais être commitées (`*.jks` et
`*.keystore` sont ignorés).
