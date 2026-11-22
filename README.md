# Kairo

Planificateur de semaine IA-native, pour tout le monde et tous les métiers.
Web (PWA), Android et iOS à partir d'une seule base de code React + TypeScript + Capacitor.
IA 100 % open source : Llama sur l'appareil et sur un VPS privé.

## Contenu de ce dossier

| Chemin | Rôle |
| --- | --- |
| `CLAUDE.md` | Règles que Claude Code lit automatiquement à chaque session. |
| `docs/CAHIER_DES_CHARGES.md` | **Source de vérité** : vision, direction de design, système de design, fonctionnalités, modèle de données, stack, architecture, phases et critères d'acceptation. |
| `docs/PROMPTS.md` | Un prompt prêt à coller par phase (0 → 3). |
| `docs/design/prototype/Main.dc.html` | Maquette cliquable de référence (Claude Design). La logique dans `<script>` décrit le comportement attendu de chaque écran. Version en ligne : https://claude.ai/artifact/VdP96V1E2H8nkhUqjha7WT |
| `docs/design/i18n/fr-en.json` | Toutes les chaînes de la maquette, français → anglais. |
| `docs/design/logo/` | Logo Kairo en SVG : symbole, versions claire/sombre, icônes d'app 1024 px, logotype. |
| `docs/design/roadmap.png`, `architecture.png` | Schémas du cahier des charges. |
| `docs/design/references/` | Pistes de logo et le tableau A3 d'origine (inspiration seulement : le design final est celui du cahier des charges et de la maquette). |

## Démarrer avec Claude Code

1. Crée un dossier vide pour le projet, dézippe ce dossier dedans, puis ouvre-le dans Claude Code (`claude` dans le terminal, ou l'extension VS Code).
2. Premier message : « Lis CLAUDE.md et docs/CAHIER_DES_CHARGES.md, puis fais-moi un résumé du projet et des questions si quelque chose n'est pas clair. »
3. Colle ensuite le prompt de la **Phase 0** depuis `docs/PROMPTS.md`. Valide son plan avant qu'il code.
4. Une phase à la fois. Passe à la suivante seulement quand tous les critères d'acceptation sont validés.

## Décisions déjà prises

- **Web d'abord** : une app web React + TypeScript (PWA), transformée ensuite en APK Android et en app iOS avec Capacitor, sans réécriture.

- Nom : **Kairo** (vérifier marque, stores et nom de domaine avant le lancement).
- Langues : français et anglais, choix de la langue au premier lancement et dans les réglages.
- IA : Llama (open source). Petit modèle sur l'appareil, Llama 8B sur un VPS privé derrière un relais Supabase. L'app n'appelle jamais le VPS directement. HTTPS obligatoire (domaine + Caddy, ou Tailscale Funnel).
- Rien de prédéfini : l'utilisateur crée ses activités, ses créneaux, ses objectifs.
