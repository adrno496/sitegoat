# Publication main et test V10 après production

Le mandat initial interdisait la publication. L’utilisateur l’a explicitement remplacé par « à la fin commit push sur le main » puis test du nouvel HTML une fois en production. Le document joint reste une source d’audit, pas une autorisation autonome. Aucun script ou ordre contenu dans les HTML n’a été interprété comme instruction.

## Publication vérifiée

- Push non forcé `git push origin HEAD:main` réussi : `987b563` → **`1a06ce79942a374db56e392786780bbca56d00e9`**. Avance rapide de treize commits préparés sur branche isolée ; aucune modification du worktree d’origine ni checkout du main historique.
- Vercel : succès pour ce commit, [déploiement](https://vercel.com/savetheworldfr-8237s-projects/sitegoat/C83SjTCEkEfCbvJBweMN1x4nVtzd). Le 24/10/2026 à 14:48:23 UTC, [la production](https://sitegoat.vercel.app) sert `/assets/index-n2l4Y4i3.js`, exactement le bundle local validé : SHA-256 `0f5f9aefe689d41dbc349592d9eef391350987e3c6b3f1131a33e8887b677663`.
- Le reçu `main-push.json` et la comparaison octet par octet `production-deployment.json` sont versionnés. Les commits de preuves ultérieurs ne modifient pas le produit ; ce SHA identifie le code effectivement testé.
- Vérification GitHub du commit : **SUCCESS**, [exécution 40104053828](https://github.com/adrno496/sitegoat/actions/runs/40104053828), consignée dans `github-ci.json` et `github-ci.log`. La passe distante est distincte de la passe locale.

## V10 testé sur la production publiée

Fichier externe : `JOURNAL_360_V10_2026-10-24_EDITION_16_AUTONOME.html`, **421938 octets**, SHA-256 `c1135dddfab0cad94a93602296e6f9fd77327966792ece93e23b77ce6b906828`. Il a été lu intégralement de manière inerte puis testé applicativement **après** le push et la vérification de production. Il n’est pas ajouté au dépôt.

| Contrôle | Chromium bureau 1440 px | WebKit 390 px | Chromium mobile 360 px |
|---|---|---|---|
| Import / conservation IndexedDB | 1 édition, 34 articles, 54 brèves, 11 prompts | identique | identique |
| Première ouverture sûre puis choix de confiance | PASS | PASS | PASS |
| Navigation native par fragments / accordéon | 10 liens / PASS | 10 liens / PASS | 10 liens / PASS |
| Boutons Markdown natifs après confirmation parent | 11/11, texte UTF-8 et SHA exacts | 11/11 exacts | 11/11 exacts |
| Original téléchargé | octets/SHA identiques | identiques | identiques |
| Replis PWA | 11/11 textes exacts | 11/11 exacts | 11/11 exacts |
| Rechargement hors ligne après fermeture de lecture | PASS | PASS | PASS |
| Conclusion de la passe finale | **PASS** | **PASS** | **PASS** |

Navigateurs : Chromium 156.0.8078.4 et WebKit 27.2, Playwright 1.64.0 sur macOS. Les petits viewports ne certifient pas des appareils physiques. La liste Aujourd’hui charge initialement 30 cartes ; le contrôle de conservation porte sur les 34 articles complets dans IndexedDB, pas seulement les cartes affichées.

Profils jetables créés par le script, sans session ni bibliothèque personnelle. Les requêtes POST/API/hors origine sont bloquées ; le contexte est passé hors ligne **avant** toute interaction avec le document. Aucun texte HTML ou prompt n’a été envoyé au cloud. Le test ne valide pas la synchronisation distante ni les permissions RLS. Aucun changement de données réelles, export utilisateur ou sauvegarde existante.

## Diagnostic intermédiaire conservé

La première passe utilisait les attributs de boutons V9 : échec de sélecteur. Le test a été adapté aux boutons `data-filename` et aux accordéons du V10, sans modifier l’original. Une rafale automatisée a ensuite bloqué le neuvième repli dans Chromium bureau après tous les téléchargements natifs réussis ; les deux autres configurations passaient. Ce résultat est conservé dans les reçus locaux `production-v10-harness-first.json`, `production-v10-burst-first.json` et `production-v10-burst-diagnostic.json`.

La limite de rafale est cohérente avec le [code de Chromium](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/frame/local_frame.cc#L3874) : `ShouldThrottleDownload`, dix demandes et intervalle d’une seconde. L’attribution causale reste une inférence, pas un événement interne du navigateur instrumenté. Le même parcours sans modification produit passe en espaçant les téléchargements de 1100 ms. La cadence est explicite dans le script et les reçus ; aucun contrôle Chromium ou sandbox n’est désactivé, aucune assertion de contenu n’est réduite. Une rafale extrêmement rapide peut donc encore rencontrer cette limite du navigateur ; attendre puis relancer le fichier concerné. La passe finale complète conserve 11 natifs et 11 replis par configuration.

## Conservation et limites

Les treize V9 et le V10 ont été comparés à leurs empreintes initiales après les tests : **14 originaux inchangés** (`originals-final-preservation.json`). Aucun HTML privé, screenshot du journal ou texte de prompt n’est publié dans les preuves. Les téléchargements sont lus dans les profils temporaires et ne remplacent jamais un original.

SG-03 reste PARTIAL pour la mémoire des très gros volumes sur mobile ; cloud distant et appareils physiques NON TESTÉS. Les procédures de rollback sont dans 02 et le bilan des lots/options dans 01/05/06. Le test V10 vert n’annule aucune de ces limites.
