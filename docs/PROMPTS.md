# Kairo – prompts par phase pour Claude Code

Colle un prompt à la fois, dans l'ordre. Attends que la phase précédente passe ses critères d'acceptation.


**Phase 0**

```text
Lis docs/CAHIER_DES_CHARGES.md et CLAUDE.md. On démarre la Phase 0 · Fondations et langage visuel.
Donne-moi d'abord un plan court (fichiers, ordre de travail) et attends mon accord.
Ensuite : monorepo pnpm, TypeScript strict, ESLint, Prettier, Husky, GitHub Actions.
Implémente tokens.ts, la config Tailwind et GlassSurface (thin / regular / thick, reflet,
réfraction SVG sur Chromium, repli automatique). Construis les composants clés avec Motion
(ressorts, transitions partagées) et une page de prévisualisation sombre / clair / transparence
réduite. Le rendu doit évoquer le verre liquide des systèmes récents, pas un design plat.
Implémente les calculs horaires de packages/core avec tests (minuit, changement d'heure).
Arrête-toi quand chaque critère d'acceptation de la Phase 0 passe.
```

**Phase 1**

```text
Phase 0 terminée. Démarre la Phase 1 · MVP du cahier des charges. Plan d'abord.
Utilise le modèle de données tel quel. Construis l'accueil avec les 6 modèles, Aujourd'hui
(NowCard adaptative selon l'heure), Semaine (grille comme docs/design/prototype/Main.dc.html sur
ordinateur, balayage par jour sur téléphone), la fiche de bloc en verre, Catégories et Réglages.
Ajoute sauvegarde / restauration JSON, PWA hors ligne et le projet Android Capacitor.
Donne-moi les commandes exactes pour générer et installer l'APK de debug.
Termine en vérifiant chaque critère d'acceptation (réussi / échoué).
```

**Phase 2**

```text
Démarre la Phase 2 · Intelligence. Plan d'abord, avec le schéma Zod de AiSuggestion
et le prompt système de l'assistant avant tout code.
Crée la fonction serveur Supabase qui relaie vers Llama sur notre VPS (Ollama, HTTPS + jeton), le petit modèle sur l'appareil (WebLLM / llama.cpp,
limite d'usage). Construis la CommandBar (texte + voix) avec propositions en blocs fantômes
à valider, « Décris ta semaine », la replanification, les alertes, les rappels, les Stats,
le bilan du dimanche, les plannings multiples, l'export A3 / PNG / .ics, le glisser-déposer
et le projet iOS. Ajoute le jeu de 50 demandes types en tests (IA simulée en CI).
Rapporte chaque critère d'acceptation avec preuve.
```

**Phase 3**

```text
Démarre la Phase 3 · Présence ambiante et synchro. Plan d'abord, avec les tables Supabase
et les règles de sécurité par ligne avant tout code.
Ajoute les Live Activities iOS, la notification en cours et les widgets Android (plugins
natifs derrière l'interface platform), le compte facultatif, la synchro hors ligne d'abord
avec tests de conflits, les rotations, Sentry et le pipeline Fastlane.
Rédige les fiches des stores en français et en anglais.
```


**Astuces**

- Si la session devient longue ou confuse, recommence : « Lis le cahier des charges et CLAUDE.md ; Phase 1, tâches 1–3 faites ; continue avec la tâche 4. »
- Pour la logique délicate (minuit, fuseaux, sorties IA), demande les tests d'abord, puis le code.
- Pour le design, juge toujours sur un vrai téléphone : le verre se juge en mouvement, pas sur une capture.

