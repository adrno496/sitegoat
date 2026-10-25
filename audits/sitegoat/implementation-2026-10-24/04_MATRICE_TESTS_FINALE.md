# Matrice finale des vérifications locales

Environnement : macOS arm64 / Apple M4, Node 24.21.0, npm 11.19.0, Playwright 1.64.0, Vite 8.3.4, Vitest 5.0.4, React 19.3.0, Dexie 4.4.6. Installation indépendante par `npm ci --ignore-scripts` : 531 paquets ajoutés, 532 audités. Aucun environnement utilisateur ou cloud réel.

| Commande / cas | Résultat exact | Preuve | Limite |
|---|---|---|---|
| Baseline lint / build / unitaires | PASS ; 333 PASS, 0 FAIL, 1 skip | baseline-lint/build/unit.log | Dépendances initiales partagées en lecture seule |
| Baseline E2E 272 cas | 243 PASS, 28 FAIL, 1 skip, 0 flaky | baseline-e2e-summary.json | 27 historiques + une collision de traces du premier harness ; replay isolé : 3 PASS |
| `npm run check` final | Lint, build, 345 unitaires PASS, 0 FAIL, 1 skip ; E2E 289 PASS, 0 FAIL, 1 skip, 0 flaky | check-final.log ; final-e2e-summary.json | 3 projets : Chromium/WebKit/Chromium mobile émulé ; retries 0 ; pas de certification de flakiness générale |
| `npm run typecheck` et lint après ajout des outils manuels | PASS, aucun diagnostic | typecheck-final.log ; lint-final.log | Contrôle syntaxique prépublication ; exécution V10 après publication dans 08 |
| HTML réel de référence, parser + roundtrip | 2 PASS, 0 FAIL, 0 skip | real-and-performance-final.log ; real-local.json | UTF-8 282997 octets, SHA exact, 19 articles/35 brèves/5 prompts/35 titres ; 3 réimports, un original |
| Boutons du vrai HTML V9, offline | 3 PASS ; chaque configuration vérifie 5 natifs +5 replis exacts, original intact et reload19 | real-browser-final.log ; real-browser-*.json | Ces preuves concernent le V9 exact, pas un fichier V10 supposé équivalent |
| Assistant personnel, véritables profils vierges | 3 PASS, 0 FAIL, 0 skip | personal-browser-complete.log | Journaux/notes/états, Futur, recherches, affichage/interface/thème ; actions séparées, pas d’atomicité interbases |
| Session périmée/pagehide, sans rechargement du document | 3 PASS, 0 FAIL, 0 skip | security-session-verified.log | Pas d’audit exhaustif de tout JavaScript possible |
| 5 scénarios de régression ciblés ×3 | 15 PASS | regressions-verified.log | Radar/filtres/Atlas/reload de recherche ; préconditions via interface |
| `npm run test:performance` | 4 PASS, 0 FAIL, 0 skip | performance-suite.log ; performance-v6/future.json | Node/jsdom/fake-indexeddb ; mesures RSS aux checkpoints, pas pic mémoire mobile |
| Corruption à longueur constante ; projection ; concurrence ; atomicité ; parent ; sandbox | 6 mutants détectés, chacun exit1 attendu | final-security-mutants.json ; mutant-*.log | Copies jetables distinctes, produit jamais neutralisé |
| Audit dépendances final | 0 avis applicables remontés | dependencies-final.json ; npm-ci.log | Uniquement les deux transitives dev corrigées ; aucune garantie de vulnérabilités inconnues |
| Nouvel HTML V10, après push et production vérifiée | 3 PASS ; 34 articles /54 brèves /11 prompts ; 11 natifs +11 replis exacts chacun ; original identique, offline reload | production-v10.json ; rapport 08 | Cadence 1100 ms ; rafale Chromium peut être bloquée ; aucun appareil physique |
| Cloud distant / téléphones physiques / lecteur d’écran / zoom natif 200% | NON TESTÉ | Checklist 07 | Tests mocks, émulation et zoom CSS ne les remplacent pas |

Le skip unitaire historique est `tests/v9-contract.unit.test.ts` : fichier réel du 22 et empreinte conditionnels, non fourni au chemin attendu. Les tests locaux dédiés du V9 du 24 ne réutilisent pas ce skip. Le skip E2E est : [{"title": "tactile Chromium réel : le défilement du HTML reste libre et le glissement au bord revient", "file": "v6-clean-reader.spec.ts", "project": "webkit"}]. Aucun nouveau skip et aucun test supprimé.

Tests officiels ajoutés : 12 cas unitaires et 6 scénarios E2E ×3 projets. Les configurations manuelles ajoutent parser/performance (2), V9 réel (3), restauration personnelle (3), sécurité de session (3), hors comptage officiel. Aucun mutant rouge n’est compté comme échec produit final.

Évolutions d’assertions : navigation mobile 11→12 avec présence d’Actualité rapide ; date brute d’édition remplacée par publication/preuve/édition contextualisées ; mode sûr choisi explicitement et testé séparément sur profil neuf ; volets ouverts par l’interface ; recherche modifiée attendue avant reload ; quota = brouillon conservé sans faux succès. Les comparaisons de restauration se font par identité et octets, pas par ordre de tableau ou prototype de realm.

La première passe globale intermédiaire interrompue a révélé des régressions réelles et des préconditions obsolètes ; elle reste dans check-first-full.log et n’est pas revendiquée verte. Seule la passe figée ci-dessus constitue la conclusion globale.


## Complément utilisateur 09

Affichage compact et API : `check-followup-final.log` = lint/build, 360 unitaires PASS/1 skip, 292 E2E PASS/1 skip. Puis restriction serveur au compte propriétaire : `followup-lint-latest.log`, `followup-typecheck-latest.log` PASS et `followup-unit-latest.log` **361 PASS/1 skip**, aucun FAIL. Bundle navigateur identique, aucun E2E supprimé. `followup-e2e-summary.json` : zéro unexpected/flaky, retries0. Tests Sources de mocks isolés du service worker ; vrai offline reload API+V10 vérifié séparément en production dans 09. Ne pas compter le rouge volontaire `source-owner-red.log` parmi les échecs finaux. Les captures `ui-compact-390/1440.png` sont synthétiques, sans journal utilisateur.


## Complément utilisateur 10 — En direct

Voir `10_ONGLET_EN_DIRECT_ET_RADAR_MONDIAL.md` et les reçus `live-*` pour la dernière validation et les limites. Le contrôle Sources contient désormais 21 tests, dont cinq nouveaux pour Banque mondiale et mutualisation après authentification. Les nouveaux scénarios En direct couvrent les trois projets existants. La navigation mobile étendue passe de 12 à 13 boutons avec l’ajout explicite d’En direct ; aucun écran antérieur ou contrôle de sécurité n’est supprimé. Les essais de cadence/visibilité sont simulés ; le hors ligne complet et le nouveau V10 sont réservés au test post-publication réel.


Validation locale finale du complément 10 : **`npm run check` PASS**, lint/build, **366 unitaires PASS / 1 skip**, **301 E2E PASS / 1 skip**, aucun FAIL/flaky, retries 0. `live-check-final.log`, `live-e2e-final-summary.json`, `live-validation-final.json`. Le premier passage global (300 PASS/1 échec du protocole WebKit/1 skip) est conservé séparément ; le rejeu ciblé 9 PASS puis ce second passage complet corrigent le harness sans modifier l’annulation du produit. Production `39a1d09` vérifiée par SHA de trois assets et par API HTTP ; V10 édition20 V2 : trois profils PASS, 37 articles/60 brèves/13 natifs+13 replis exacts, original inchangé et vrai offline reload (journal + radar16 cartes). Voir 10 pour les limites de mesure du réseau service worker et les limites matérielles.

CI distante du code `39a1d09` : **PASS**, run 40147136993 ; 366 unitaires et 301 E2E PASS, confirmés dans le log GitHub. Reçus `live-ci.json` / `live-ci-summary.log`. Le commit final des preuves ne modifie aucun fichier d’application, API, serveur, test ou dépendance ; les intitulés de mesures du harness de production sont explicités sans modifier les assertions.
