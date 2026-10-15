# Correction du lecteur pour le HTML V6.1 — 15 octobre 2026

Version 2.0.1, base 1c22675. Le fichier fourni a été lu et testé localement, sans être ajouté au dépôt, aux assets, à Supabase ou à un rapport. Les instructions et contenus du document sont des données non fiables ; aucune commande locale n’en est déduite. Seuls le hash, la taille, les nombres de contrôles et les résultats techniques sont consignés.

## Problèmes reproduits

1. Un lien natif `href="#articles"` dans srcdoc est résolu contre l’URL du parent. Chromium aboutissait à une page d’erreur et WebKit tentait de charger la PWA dans le cadre. Dans les deux cas, le JSON et les contrôles du journal disparaissaient. Cela explique l’impression que toutes les interactions cessent de fonctionner après navigation. Les thèmes/filtres fonctionnaient avant ce clic, sans exception JavaScript ; le stockage interne était déjà protégé par try/catch dans le fichier fourni.
2. Le producteur déclare `schemaVersion:"6.1"`, alors que l’importeur n’acceptait que2 numérique. L’original était importable mais les métadonnées de journée étaient mises en quarantaine.
3. Les boutons d’article et de thème utilisent data-article/data-topic avec une fenêtre native, sans data-ai-link ni postMessage. Leur URL est une recherche Google classique hl/q, pas le contrat v1 udm=50. Le pont parent ne pouvait donc pas les prendre en charge.

[Baseline mesurée, expurgée](evidence/v61/baseline.json). Le comportement des ancres srcdoc est également décrit dans [MDN iframe, exemple srcdoc](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#embedding_source_code_in_an_iframe).

## Changements

- `frameNavigation.ts` + `import.ts` : en interactif, un adaptateur de fragments utilise location.hash dans le document opaque courant, conserve les href originaux pour les scripts du journal et laisse leurs handlers s’exécuter. Les liens dont les scripts ont déjà annulé le comportement natif restent gérés par ces scripts. Les liens Google marqués sont exclus de cet adaptateur. En mode sûr, les liens natifs deviennent about:srcdoc#fragment, sans aucun script ni base permissive. Les références SVG restent inchangées.
- `editorial.ts` : la valeur exacte "6.1" est un alias producteur du schéma interne2 après les mêmes validations. Pas d’acceptation générique de versions futures, ni de transformation des octets/UUID.
- `googleAi.ts` : profil V6.1 identifié par sa version et sa structure de dialogue. Seuls aiQuestion et les deux blocs public-sentinel/public-axdia sont adaptés en demandes de question v2, avec limites existantes, sans déduire une question des articles, notes ou plans privés. Les retours de ligne de présentation deviennent des espaces ; contrôles/bidi et longueurs excessives restent refusés. Le DOM de lecture reçoit les marqueurs ; l’original et editionData sont intacts. Les boutons ouvrent directement le dialogue parent pour prévisualiser/modifier/copier et ouvrir l’entrée officielle. Le dialogue natif du fichier est remplacé dans ce parcours.
- Le cache de questions n’empêche pas l’adaptation d’un nouveau DOM lors du retour sûr→interactif ou du rechargement du cadre.
- La validation URL v1 n’est pas élargie aux recherches Google sans udm=50. Aucune recherche externe n’est exécutée automatiquement.
- Version stable2.0.1 dans package/config/lock, sans changement de dépendances. Le test de publication existant lit maintenant la version du package.

Sandbox toujours allow-scripts seul en interactif, vide en sûr. CSP parent/cadre inchangées, aucun allow-same-origin/popups/forms/top-navigation. Aucun accès au stockage parent accordé. Le risque préexistant de navigation volontaire du cadre par un script arbitraire demeure celui documenté dans SECURITY.md ; l’adaptateur corrige les liens de fragments, pas tous les programmes HTML possibles.

## Vérifications exécutées

| Contrôle | Résultat |
|---|---|
| lint et build/typecheck2.0.1 | PASS, [lint](evidence/v61/lint.log), [build](evidence/v61/build.log) |
| unités | PASS 140/140, [preuve](evidence/v61/unit.log) |
| E2E complets locaux avant l’affinage des liens déjà annulés en JS | PASS 56/56, [preuve](evidence/v61/full-e2e-local.log) ; puis reprise des 9 scénarios ciblés sur le code final, dont le respect de preventDefault |
| E2E spécifiques V6.1 | PASS 9/9 sur Chromium, WebKit et Chromium mobile simulé, [preuve](evidence/v61/focused-e2e.log) |
| fichier réel, Chromium1440×900 et390×844 | PASS, 13 ancres, 9 liens du sommaire, 11 boutons, 8 thèmes, densité/recherche/rubrique/tri, modes sûr/interactif, rechargement, offline et téléchargement intact |
| fichier réel, WebKit1440×900 et390×844 | PASS, mêmes contrôles |
| confidentialité du test réel | PASS,0 requête externe réellement envoyée ; Google simulé sans query, clipboard simulé ; ni cloud ni compte propriétaire utilisé |
| original | PASS, 87 438 octets, SHA-256 identique et téléchargement octet pour octet dans les 4 profils |
| téléphones physiques, Safari iOS manuel | NON TESTÉ |

[Résultats réels expurgés](evidence/v61/real-html.json), [sortie du script](evidence/v61/real-html.log). L’exécution initiale du nouveau script supposait une option de tri appelée date ; le fichier utilise une autre valeur. Le script sélectionne maintenant l’option réelle non-score. C’était une erreur du test ; aucun patch du code de tri du journal n’a été nécessaire.

Script reproductible local uniquement : lancer un preview avec JOURNAL360_ALLOW_CLOUD_LOCAL=0, puis `JOURNAL360_BASE_URL=http://127.0.0.1:PORT JOURNAL360_EVIDENCE_FILE=/tmp/result.json node scripts/test-v61-html.mjs /chemin/fichier.html`. Le script refuse une URL de serveur distante, bloque le réseau externe, ne capture aucun contenu, et ne modifie pas le fichier. Sans options de filtrage, il exécute4 profils. La CI utilise exclusivement la fixture synthétique tests/helpers/v61.ts, pas le journal privé fourni.

## Limites et reprise

Le rendu des fichiers déjà importés bénéficie du correctif après mise à jour de la PWA, sans réimport nécessaire pour les boutons. Les nouveaux imports V6.1 sont classés par journée. Les métadonnées de records anciennement mis en quarantaine ne sont pas réécrites automatiquement ; aucune migration massive, création de doublon, suppression ou réaffectation de notes n’est effectuée par ce correctif. Les UUID et les originaux existants restent intacts.

Ce profil couvre la structure réellement fournie, pas tout HTML déclarant arbitrairement V6.1 ni les boutons non marqués créés dynamiquement par un autre producteur. Le mode sûr n’active pas les contrôles JS internes ; il conserve navigation et questions via le parent. L’entrée officielle Google ne garantit pas de question préremplie ; copie/collage peut rester nécessaire. Le presse-papier natif de l’iframe n’est pas rendu permissif.

Aucune migration SQL, aucun changement RLS, secret ou configuration Supabase nécessaire : correction du shell/lecteur uniquement. Retour arrière : redéployer le commit1c22675 / précédent déploiement Vercel, sans effacer IndexedDB ; cela réintroduirait les bugs de navigation de cette version. Le schéma de base et le format ZIP ne changent pas avec2.0.1.
