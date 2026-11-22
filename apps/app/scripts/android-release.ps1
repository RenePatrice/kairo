# Génère l'APK release signé et aligné : build web → Gradle (non signé) → zipalign → apksigner.
# La keystore et son mot de passe restent hors du dépôt (par défaut %USERPROFILE%\.kairo-signing).
param(
  [string]$SigningDir = "$env:USERPROFILE\.kairo-signing",
  [string]$BuildTools = 'C:\Android\Sdk\build-tools\36.0.0',
  [string]$JavaHome = 'C:\Program Files\Microsoft\jdk-21.0.13.102-hotspot'
)
$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = $JavaHome
$env:Path = "$JavaHome\bin;$env:Path"

$props = @{}
Get-Content "$SigningDir\keystore.properties" | ForEach-Object { $k, $v = $_ -split '=', 2; $props[$k] = $v }

$app = Split-Path $PSScriptRoot -Parent
Set-Location $app
pnpm android:sync
if ($LASTEXITCODE) { throw 'build web / cap sync en échec' }

Set-Location "$app\android"
.\gradlew.bat assembleRelease --console=plain
if ($LASTEXITCODE) { throw 'assembleRelease en échec' }

$out = "$app\android\app\build\outputs\apk\release"
$version = (Select-String -Path app\build.gradle -Pattern 'versionName "(.+)"').Matches[0].Groups[1].Value
$final = "$out\kairo-$version-release.apk"

# 1. Aligner AVANT de signer (signer puis aligner casse la signature v2+).
& "$BuildTools\zipalign.exe" -f -p 4 "$out\app-release-unsigned.apk" "$out\app-release-aligned.apk"
if ($LASTEXITCODE) { throw 'zipalign en échec' }

# 2. Signer ; le mot de passe passe par un fichier temporaire, jamais par la ligne de commande.
$pw = Join-Path $SigningDir '.pw'
Set-Content -NoNewline -Encoding ascii $pw $props.storePassword
try {
  & "$BuildTools\apksigner.bat" sign --ks "$SigningDir\$($props.storeFile)" `
    --ks-key-alias $props.keyAlias --ks-pass "file:$pw" --out $final "$out\app-release-aligned.apk"
  if ($LASTEXITCODE) { throw 'apksigner en échec' }
} finally {
  Remove-Item $pw -ErrorAction SilentlyContinue
}

# 3. Vérifier.
& "$BuildTools\zipalign.exe" -c -p 4 $final
if ($LASTEXITCODE) { throw 'alignement invalide' }
& "$BuildTools\apksigner.bat" verify --print-certs $final
if ($LASTEXITCODE) { throw 'signature invalide' }
Write-Host "APK prêt : $final"
