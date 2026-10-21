# Lecture des éditions : conserver le HTML importé

21 octobre 2026. Référence avant cette correction : `f222963ca8a3d58bbc726d590b6f9e19471d1856`. Branche : `codex/preserve-original-edition-html`.

La demande est d'afficher la présentation du fichier importé, sans réorganiser ses articles. La projection documentaire ajoutée précédemment est retirée. Le lecteur conserve les styles inline, la structure, les rubriques, l'ordre et le moteur de rendu du producteur. Aucun remplacement de sa mise en page par une liste de textes n'est effectué pour la lecture d'une édition.

Les éditions V8 dynamiques nécessitent leurs scripts pour afficher leur contenu. Le lecteur les laisse désactivés initialement et propose un bouton visible **Afficher le HTML d’origine**, suivi de la confirmation de confiance existante. Après cette confirmation, le fichier s'affiche avec sa propre interface dans le sandbox opaque existant. Une visite ultérieure ne réactive pas silencieusement les scripts. L'alternative Texte indexé reste disponible explicitement ; elle ne remplace pas le HTML d'origine.

La CSP, l'interdiction des requêtes fetch et des ressources externes, l'isolation du stockage et le contrôle des messages Google restent en place. Le mode interactif conserve ses limites existantes : la navigation déclenchée par un script peut provoquer une requête réseau ; le sandbox n'est pas une garantie d'absence d'exfiltration du contenu du fichier. Aucune autorisation supplémentaire du cadre n'est ajoutée. Les téléchargements `.md` de l'application restent disponibles. Les mécanismes d'import, les octets originaux et les sauvegardes ne changent pas. La carte Aujourd'hui conserve son développement sur toute la largeur.

## Résultats

| Vérification | Verdict | Preuve |
| --- | --- | --- |
| Nouveaux contrôles de présentation sur l'ancien code | PASS : 3 échecs détectent la reconstruction ; 3 autres tests passent | [baseline-unit.txt](evidence/original-html/baseline-unit.txt) |
| Lint et build avec typage | PASS | [lint](evidence/original-html/lint.txt), [build](evidence/original-html/build.txt) |
| Suite unitaire | PASS : 310 tests | [unit.txt](evidence/original-html/unit.txt) |
| Tests unitaires sur les vrais HTML 08/10/16 h | PASS : 6 tests | [real-unit.txt](evidence/original-html/real-unit.txt) |
| Parcours réels Chromium, WebKit et mobile | PASS : 15 tests | [real-browser.txt](evidence/original-html/real-browser.txt), [JSON](evidence/original-html/real-browser.json) |
| Accessibilité automatique du nouvel avis et de la confirmation | PASS : aucune violation axe sur ce périmètre, Chromium bureau | [accessibility.json](evidence/original-html/accessibility.json) |
| Régression navigateur complète | PASS : 244 réussis, 1 ignoré préexistant, aucun échec | [journal](evidence/original-html/final-browser.txt), [JSON](evidence/original-html/final-browser.json) |
| Fichiers protégés : schémas, stockage, sauvegardes, cloud/sync, Google, Future, SW/API et configuration | PASS : 26 fichiers inchangés | [protected.json](evidence/original-html/protected.json) |
| Recherche de préfixes de secrets sur les fichiers source modifiés/nouveaux et dist | PASS sur ce périmètre, audit global PARTIAL | [secrets.json](evidence/original-html/secrets.json) |

Les fichiers réels sont identifiés par leurs [empreintes précédemment conservées](evidence/reading-fix/input-files.json). Chaque édition est importée seule dans une base de test vide, puis lue hors ligne. Les tests passent par le menu et les boutons propres au fichier, ouvrent chaque article et vérifient les textes complets. Ils vérifient aussi le refus de la confirmation, le sandbox avant/après consentement, le retour au mode sécurisé à la réouverture et l'égalité exacte des octets de l'original téléchargé. Le parcours 08/10/16 h conserve les 16 articles, les diagnostics et les téléchargements Markdown exacts.

Les unités comparent les styles et les éléments `#nav` / `#view` à ceux du fichier d'entrée. Aucun test n'est désactivé pour accepter une présentation reconstruite. Les textes HTML hostiles restent inertes en mode sécurisé. Le scanner global historique comporte toujours son contrôle positif synthétique inchangé ; il n'est pas présenté comme PASS global.

Premier passage complet : 234 réussis, 10 échecs et 1 ignoré ([journal](evidence/original-html/initial-browser-failures.txt), [JSON](evidence/original-html/initial-browser-failures.json)). Huit échecs venaient des boutons de la fixture synthétique placés sous les contrôles flottants du lecteur ; sa marge de présentation a été corrigée, sans changer l'application ni affaiblir les assertions. Deux anciens parcours ont expiré pendant une exécution anormalement prolongée. Les 15 parcours concernés repassent sur les trois projets, sans correction du code de synchronisation ni d'import : [recheck.txt](evidence/original-html/recheck.txt), [JSON](evidence/original-html/recheck.json). Les délais du premier passage ne constituent pas une mesure de performance exploitable. La seconde suite complète passe sans désactivation de test ; seul le test tactile natif WebKit préexistant reste ignoré. Verdict fonctionnel sur le périmètre testé : PASS. Aucune régression détectée dans ces suites ; les limites NON TESTÉ restent celles indiquées ci-dessous.

## Présentation et limites

Les captures de contrôle utilisent le gabarit fourni du 16 h avec des données entièrement synthétiques : [accueil original](evidence/original-html/original-home-desktop.png), [article bureau](evidence/original-html/original-article-desktop.png), [article mobile](evidence/original-html/original-article-mobile.png), [avant confirmation](evidence/original-html/before-confirmation.png). Les HTML réels ne sont pas ajoutés au dépôt.

JavaScript : 1 025 394 → 1 019 854 octets ; CSS : 63 410 → 63 626 octets ; précache : 1 434,16 → 1 428,96 Kio. Aucune dépendance ajoutée. [Mesures](evidence/original-html/bundle.json). Ce sont des tailles de build, pas un benchmark temporel.

NON TESTÉ : profil personnel de production, données cloud privées, téléphone physique et lecteur d'écran réel. Les fonctions du producteur qui exigent un réseau, un stockage de même origine ou des permissions non accordées au sandbox restent soumises aux protections existantes. Le thème propre au fichier est conservé. La couverture éditoriale PARTIAL n'est pas transformée en certification factuelle.

## Reproduction et rollback

```sh
npm run lint
npm run build
npm test
npm run test:e2e
SITEGOAT_AUDIT_REAL_DIR=/Users/dreano/Downloads npm test -- --run tests/unified-reading.unit.test.ts
SITEGOAT_AUDIT_REAL_DIR=/Users/dreano/Downloads npx playwright test tests/e2e/v8-reading.spec.ts
```

Exécuter les suites navigateur séquentiellement. Sans variable, les nouveaux parcours utilisent des fixtures synthétiques. Les fichiers applicatifs et tests validés sont identifiés dans [source-files.json](evidence/original-html/source-files.json).

Sauvegarde locale du code initial : `/tmp/sitegoat-original-html-reference-f222963.tar`, SHA-256 `3e41001d22181434b91cd344cb1b06f1f45262c930c53f4bfff150a9c564cc0d`.

Rollback : revert du commit de cette correction, validation puis publication du revert. Aucune migration et aucune suppression des données importées ne sont nécessaires. Les anciens artefacts générés par les tests sont restaurés avant commit. Ne pas effacer les données du navigateur pour actualiser la PWA.
