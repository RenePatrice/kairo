# Kairo – règles pour les agents IA
- Lis docs/CAHIER_DES_CHARGES.md avant tout travail. Respecte exactement sa stack, son modèle de données et ses tokens.
- Direction de design : interface IA-native de nouvelle génération (verre liquide, UI adaptative, mouvement à ressorts). Aucun design classique ou plat. Références : docs/design/.
- Toute surface flottante utilise GlassSurface, jamais un fond opaque codé à la main. Toujours prévoir le repli « transparence réduite ».
- Animations avec Motion et les ressorts définis dans tokens.ts ; respecter « réduire les animations ».
- TypeScript strict, pas de `any`. Pas de nouvelle dépendance sans justification.
- Logique horaire uniquement dans packages/core, avec tests. L'interface ne calcule jamais d'heures.
- L'IA propose, le code applique : sortie validée par Zod, jamais appliquée sans validation de l'utilisateur. IA uniquement Llama (petit modèle local ou Llama sur notre VPS via le relais), aucune API propriétaire. L'app n'appelle jamais le VPS directement.
- Couleurs, espacements, rayons, polices : uniquement depuis tokens.ts.
- Toutes les chaînes via i18next (fr + en).
- Mobile d'abord : vérifier 375 px, 768 px et 1280 px. Accessibilité : libellés, contraste ≥ 4,5:1, clavier.
- Avant de dire « terminé » : pnpm lint && pnpm typecheck && pnpm test doivent passer.
- Petites étapes. Après chaque tâche, résume ce qui a changé et quoi tester à la main.
- Ne jamais commiter de secrets, clés de signature ou fichiers .env.

## Web d'abord, puis APK et iOS
- Kairo est **d'abord une application web** (React + TypeScript + Vite), installable en PWA. C'est la seule base de code.
- L'APK Android et l'app iOS sont produits **à partir de ce même build web** avec Capacitor (`npx cap sync`, puis Android Studio / Xcode). Jamais de réécriture en Kotlin, Swift, React Native ou Flutter.
- Tout doit d'abord fonctionner dans un navigateur (Chrome, Safari, mobile et ordinateur). On teste toujours la version web avant de générer l'APK.
- Ce qui dépend du téléphone (notifications, haptique, fichiers, widgets, Live Activities) passe par l'interface `platform` : une version web + un plugin Capacitor. Le code des écrans ne sait pas sur quelle plateforme il tourne.
- Aucune dépendance qui ne marche pas dans un navigateur sans repli web.

## Fichiers de référence
- docs/CAHIER_DES_CHARGES.md : la source de vérité (vision, design, stack, modèle de données, phases, critères d'acceptation).
- docs/design/prototype/Main.dc.html : la maquette cliquable. Sa logique (dans la balise <script>) montre le comportement attendu de chaque écran : cadran du jour, check-in, focus/Pomodoro, objectifs, bilans, trophées, assistant, i18n FR/EN.
- docs/design/i18n/ : les traductions FR → EN déjà validées, à reprendre dans les fichiers i18next.
- docs/design/logo/ : logo Kairo (SVG) et icônes d'app.
- docs/PROMPTS.md : un prompt prêt à coller par phase.
