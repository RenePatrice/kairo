# Bilan de la Phase 2 · Intelligence

État au 26 novembre 2026. Kairo est pour l'instant utilisé **en local, sur un téléphone** (APK
signé), sans serveur : tout ce qui demande un hébergement (VPS, relais Supabase, stores) est
reporté jusqu'à la mise en ligne.

## Critères d'acceptation du cahier

| Critère | Statut | Preuve |
| --- | --- | --- |
| « Construis-moi une semaine d'étudiant avec du foot le samedi » produit une semaine valide en moins de 8 s | **Reporté** | Demande trop riche pour le moteur de règles : il faut Llama (relais ou téléphone). Le chemin est prêt et testé avec une réponse simulée : `packages/ai/src/__fixtures__/requests.ts` (cas « Construis-moi… »), validé par Zod, refusé s'il est invalide. |
| 0 modification sans validation dans les tests automatisés | **Réussi** | Les 55 demandes types vérifient que le planning ne change pas (`packages/ai/src/requests.test.ts`) ; la base n'applique une proposition qu'au toucher « Ajouter », en une transaction annulable (`packages/db/src/phase2.test.ts`) ; bout en bout : le nombre de créneaux en base reste 0 avant « Ajouter » (`apps/app/e2e/assistant.spec.ts`). |
| Rappels fonctionnels app fermée | **À vérifier sur le téléphone** | Notifications locales programmées dans Android (`@capacitor/local-notifications`, reprogrammées après redémarrage) ; calcul testé (minuit, heure d'hiver, limite iOS) dans `packages/core/src/reminders.test.ts` ; navigateur testé de bout en bout (`apps/app/e2e/reminders.spec.ts`). |
| Bêtas Google Play (test interne) et TestFlight | **Reporté** | Demande les comptes développeur (payants) et, pour iOS, un Mac. |

## Liste de la Phase 2

| Élément | Statut |
| --- | --- |
| Banc d'essai des modèles, Llama sur le VPS, relais Supabase, limite d'usage | Reporté (hébergement) |
| Petit modèle sur l'appareil (WebLLM) | Reporté : ≈ 1 Go à télécharger, dépend de WebGPU dans la WebView Android, à vérifier d'abord sur le téléphone |
| Schémas Zod (`LlmReply`, `AiSuggestion`) et prompt système FR / EN | Fait |
| Assistant texte + voix, propositions à valider / ajuster / annuler | Fait (écran Assistant de la maquette, qui remplace la CommandBar) |
| « Décris ta semaine » | Fait, par la carte « Pour commencer » de l'assistant (maquette) |
| Replanification des créneaux manqués | Fait (« Raté » → recaler aujourd'hui ou demain, Phase 1) |
| Alertes de surcharge et de sommeil < 7 h | Fait, sur les cartes de proposition de l'assistant |
| Rappels locaux, cases à cocher, Stats | Fait (Bilans : Jour, Semaine, Trophées) |
| Bilan du dimanche rédigé par l'IA | Fait par un brouillon tiré des chiffres de `core` ; Llama pourra le reformuler une fois branché |
| Objectifs du jour / de la semaine, énergie, récap, trophées, bilans auto | Fait (maquette) |
| Plannings multiples, export affiche A3 / PNG / `.ics`, glisser-déposer | Laissé de côté : absent de la maquette (décision du 24 novembre) |
| Projet iOS Capacitor | Reporté (pas de Mac) |
| Sauvegarde / restauration par fichier | Ajouté pour l'usage sur téléphone seul (pas de synchro) |

## Nouvelles dépendances (toutes justifiées par un critère du cahier)

- `@capacitor/local-notifications` : rappels app fermée.
- `@capacitor-community/speech-recognition` (MIT) : dictée sur Android, la WebView n'a pas Web Speech.
- `@capacitor/filesystem` et `@capacitor/share` : sauvegarde par fichier via le menu Partager.

## Points connus

- **Reconnaissance vocale** : assurée par le service de l'appareil ou du navigateur (Google dans
  Chrome, Apple dans Safari, service Android), pas par Llama. Seul le texte reconnu passe dans
  l'assistant. À mentionner dans la politique de confidentialité.
- **Rappels dans un navigateur** : ils ne sonnent que tant que l'onglet est ouvert (limite du web).
- **Alarmes exactes** (`SCHEDULE_EXACT_ALARM`) : à justifier auprès de Google Play à la publication.
- **Données** : elles ne vivent que sur le téléphone. Sauvegarder régulièrement (Réglages →
  « Enregistrer une sauvegarde ») et garder la clé de signature (`%USERPROFILE%\.kairo-signing`).

## À tester à la main sur le téléphone

1. Rappel app fermée : créneau dans 15 min, rappel 10 min avant, app fermée.
2. Micro de l'assistant : dicter « Salle jeudi de 7 h à 8 h », puis Ajouter.
3. Sauvegarde : enregistrer, ajouter un créneau, restaurer, puis Annuler.
4. Bilans : « Voir avec 8 semaines de démo », parcourir Jour, Semaine, Trophées et le récap.
