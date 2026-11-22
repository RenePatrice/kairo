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

## Ouvrir dans Android Studio (facultatif)

`pnpm android:open`

Les clés de signature de la version publiée ne doivent jamais être commitées (`*.jks` et
`*.keystore` sont ignorés).
