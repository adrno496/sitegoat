# Complément du 25 octobre — En direct et radar économique mondial

L’utilisateur a repris la tâche après sa pause et a demandé un onglet dédié à la consultation continue des données API et au radar économique mondial. Son autorisation antérieure de commit/push sur main demeure applicable. Le travail reste réalisé sur `codex/sitegoat-audit-v4-local`, dans le worktree isolé ; aucun merge, force-push, traitement de bibliothèque personnelle ou déploiement manuel n’est nécessaire.

## Fonctionnement réalisé

**En direct** est accessible dans la navigation principale, après Articles. Il contient **Flux API** et **Radar économique mondial**. Les autres vues gardent leur contenu et leur ordre relatif. Les titres restent gras et la présentation des dates reste compacte.

- **Actualiser maintenant** récupère une fois les sources choisies. **Démarrer le suivi** lance un cycle puis une actualisation toutes les 15, 30 ou 60 minutes, 30 minutes par défaut, après la fin du cycle précédent. Les demandes sont séquentielles, sans chevauchement d’un même cycle.
- Aucun appel fournisseur au simple démarrage de l’application ou à l’ouverture de l’onglet : seule la disponibilité du catalogue est consultée. BCE et Banque mondiale sont cochées par défaut ; les moteurs à clé nécessitent connexion, sélection et sujet public explicite. Leur consommation de quota est indiquée dans le choix des sources.
- Le suivi se suspend hors ligne et quand la page est masquée. À la reprise, une échéance dépassée déclenche un seul cycle, sans rattrapage en rafale. Quitter En direct ou recharger la page arrête le suivi ; il faut le redémarrer. Ce n’est pas un service de veille exécuté sur un serveur 24 h/24.
- **Mettre en pause**, changer les sources, la recherche ou la fréquence annule la récupération en cours. Une réponse annulée ne doit pas écrire tardivement dans le cache. Les requêtes déjà parvenues à un fournisseur peuvent néanmoins avoir consommé son quota.
- Les dernières récupérations publiques restent lisibles hors ligne. Le cache commun aux deux espaces Sources/En direct garde dix couples source/recherche, avec leur date réelle de récupération et le sujet associé. Une panne/quota conserve les anciens résultats ; une panne de stockage laisse les nouveaux résultats en mémoire et affiche un avertissement.
- Le radar présente BCE + Banque mondiale, et conserve le radar des éditions importées dans **Indicateurs de mes éditions**. Les données importées ne sont pas réécrites ni remplacées par les API.

## Données économiques et exactitude

La nouvelle source Banque mondiale utilise un endpoint fixe sans clé : cinq zones (Monde, France, zone euro, États-Unis, Chine), deux indicateurs WDI (`NY.GDP.MKTP.KD.ZG`, croissance annuelle du PIB ; `FP.CPI.TOTL.ZG`, inflation annuelle des prix à la consommation), deux dernières observations non vides par série, dix cartes au maximum.

L’année statistique est affichée dans la carte ; elle n’est jamais présentée comme une date de publication. La date globale de mise à jour du catalogue ne devient pas une date de publication par observation. Une variation en points n’est calculée qu’entre années consécutives de la même série et de la même zone. Zéro est une valeur valide ; chaîne numérique, date non annuelle, valeur nulle/non finie sont exclues. Une série absente affiche **Donnée non fournie**, sans tendance fabriquée. La zone euro n’est pas confondue avec toute l’Europe.

Un appel réel a renvoyé dix séries ; les années disponibles diffèrent, par exemple inflation américaine 2024/2023 alors que plusieurs autres séries comprennent 2025. Les valeurs sont arrondies pour la lecture ; les cartes ne constituent ni des cours de marché instantanés ni une recommandation financière. Les liens du portail utilisent les codes pays à deux caractères vérifiés dans l’API pays officielle, distincts des codes ISO3 utilisés pour la requête statistique.

Références : [structure des appels Banque mondiale](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures), [requêtes pays](https://datahelpdesk.worldbank.org/knowledgebase/articles/898590-country-api-queries), [PIB](https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG), [inflation](https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG). L’API réelle a répondu ; une ouverture du portail de données par l’outil Web a renvoyé 429, sans contournement ni présentation de cette ouverture comme une vérification réussie.

## Sécurité et limites des API

Aucune nouvelle clé copiée : les trois variables serveur sensibles Brave/Tavily/Exa installées au complément 09 sont réutilisées. Le navigateur reçoit les résultats et la disponibilité des moteurs, jamais leurs clés. Le serveur exige le compte privé configuré, y compris pour un résultat en cache ou une requête mutualisée ; les tests d’accès anonyme et d’autre compte restent actifs.

Les appels simultanés identiques sont maintenant mutualisés dans un même processus **après authentification**, pour éviter une double consommation lors d’une reconnexion ou de plusieurs onglets. Au plus cinquante appels fournisseur distincts sont en vol par processus. Le cache 15 minutes, les limites de requêtes, le filtrage des secrets/liens, les endpoints fixes, le timeout et la limite 4 Mio restent appliqués. La cadence et le cache par processus ne constituent toujours pas un plafond de dépenses distribué Vercel. Aucun achat, nouvelle souscription ou récupération automatique des autres clés Sentinel.

Le cache contient des informations publiques et les mots de recherche saisis : ne pas y mettre de données personnelles. Il reste distinct des journaux et des trois sauvegardes personnelles ; il peut être reconstruit par récupération. Aucun changement de version IndexedDB ou migration réelle.

## Vérifications

Point de contrôle avant publication : **366 unitaires PASS / 1 skip**. Le premier `npm run check` complet termine avec lint/build/unitaires verts, **300 E2E PASS / 1 échec de protocole de test WebKit / 1 skip historique** (16,4 min). Après correction de l’observateur d’annulation, les neuf scénarios En direct sont verts, dont ce cas WebKit. Les 301 cas E2E distincts ont donc un passage réussi, mais ce n’est pas revendiqué comme une passe globale unique verte. Le second **`npm run check` complet est PASS** : lint, build, **366 unitaires PASS / 1 skip**, **301 E2E PASS / 1 skip**, aucun échec/flaky et retries 0 (17,8 min pour les E2E). `live-check-final.log`, `live-e2e-final-summary.json` et `live-validation-final.json` constituent ce bilan final, distinct du premier passage rouge. Aucun nouveau skip, retries 0.

Reçus : `live-full-first-summary.json`, `live-recheck-summary.json`, logs intermédiaires locaux, puis `live-check-final.log` pour le rejeu global. Le dernier changement de source concerne les liens Banque mondiale, couvert par les 366 unitaires complets rejoués et les 21 contrôles Sources ; aucun bundle navigateur modifié après ce point.

- Unitaires complets intermédiaires : **366 PASS, 1 skip historique**. Les cinq contrôles ajoutés couvrent les périodes/variations/manquants de la Banque mondiale, trois contrats invalides et la mutualisation d’appels privés authentifiés. Après ajustement des liens pays, les 21 tests du module sources sont rejoués : PASS.
- Six scénarios ciblés En direct sont verts sur Chromium, WebKit et Chromium mobile émulé : démarrage explicite, refus privé sans connexion, cache après erreur, contenu hostile inerte, navigation clavier, accessibilité automatisée, responsive ; puis cadence avec horloge simulée, visibilité simulée, vrais événements offline/online, pause, sortie et remontage sans redémarrage automatique. Le contrôle d’annulation en vol est ensuite rejoué avec les deux autres scénarios : **9 PASS sur trois projets**, preuve `live-recheck-e2e-final.log` / `live-recheck-e2e.json`.
- L’appel public Banque mondiale réel n’envoie aucune information de journal. Les recherches à clé ne sont pas multipliées pour tester un intervalle : ces cycles sont simulés en E2E. Le login réel du compte personnel et le plafond global de dépenses ne sont pas testés en production.
- Les mocks API bloquent volontairement le service worker ; leur rechargement est fait en ligne avant passage hors ligne. Le test de production séparé doit valider le vrai rechargement hors ligne, le service worker et les données publiques réelles, sans mock.

Incidents conservés : première sélection `status` ambiguë entre état global/toast/onglet, corrigée en ciblant l’onglet ; module lazy indisponible après mise hors ligne trop précoce dans le scénario sans service worker, précondition corrigée sans neutraliser le contrôle de production ; vrai appel en double à la reconnexion, corrigé en séparant le catalogue de l’horloge du cycle. Les logs intermédiaires rouges restent locaux. Le premier contrôle d’annulation attendait `requestfailed` de Playwright, événement non exposé par WebKit pour cette interception ; déplacer la libération de la route n’a pas résolu l’attente. Le test observe désormais le vrai signal abort et le vrai rejet Fetch `AbortError`, puis libère la réponse tardive et vérifie que le cache est resté intact. Les trois navigateurs passent ce contrôle. Aucune assertion de quota, d’intégrité ou de sécurité supprimée et aucun nouveau skip.

## Publication et contrôle réel

Push non forcé main **`39a1d0904d71b2fd77c78449b7d99d05d669fa6f`** réussi, après `4b9bd7e` (fonctionnalité) et le correctif du protocole d’annulation. Le déploiement automatique Vercel est vérifié par empreinte SHA-256 de trois fichiers : JavaScript principal, module En direct et sa feuille CSS ; tous identiques au build local. Le serveur expose dix sources, Banque mondiale renvoie dix cartes, les trois moteurs privés refusent l’anonyme (401), l’origine tierce est refusée (403) et un champ HTML synthétique supplémentaire est rejeté (400). Reçu `production-deployment-live.json`.

**V10 édition 20 V2 après publication : 3 PASS**, Chromium 156 / WebKit 27.2 à 390 px / Chromium à 360 px, chacun dans un profil vierge sans connexion personnelle : 37 articles, 60 brèves, 13 prompts natifs exacts, 13 replis exacts, original SHA identique, onze ancres et accordéons natifs, date compacte/titre gras, rechargement vraiment hors ligne du journal et des sources réelles BCE/Banque mondiale. Seize cartes de radar sont encore visibles après reload hors ligne. Espacement des téléchargements 1100 ms, aucun avertissement de throttling. Reçu `production-v10-followup.json`, captures `production-live-*` avant tout import, inspectées sur bureau et mobile.

La mesure par routage Playwright ne voit pas tous les fetches du service worker WebKit : son compteur d’appels publics routés est vide malgré les réponses réelles affichées. Le reçu nomme donc ce compteur **routedPublicApiCalls**, avec sa limite d’observation. Une ancienne constante « cloudTransfers: 0 » non instrumentée a été retirée du reçu et du harness ; aucun volume réseau global nul n’est revendiqué. Le reçu brut et le log d’exécution restent locaux ; seul l’intitulé des mesures est clarifié après exécution, sans changer de résultat ou d’assertion. Le contrôle de confidentialité repose sur le profil vierge sans login, les corps API bornés/provider-query et le passage physique hors ligne immédiatement après import, avant l’activation du HTML scripté.

**CI du code publié PASS** : [run 40147136993](https://github.com/adrno496/sitegoat/actions/runs/40147136993), terminé le 25 octobre à 00:52:36 UTC, 366 unitaires et 301 E2E PASS. `live-ci.json` et `live-ci-summary.log` en conservent le reçu ; le log complet reste local. Le second check local complet est lui aussi vert. Le dernier commit de preuves ne change pas `src`, `api`, `server`, les tests ni les dépendances : seulement les rapports, captures, patch de rollback et intitulés de mesures du harness de production. Le code fonctionnel déployé/testé reste celui de `39a1d09`. Aucune session ou synchronisation personnelle réelle testée.

## Journal V10 et conservation

À la reprise, le chemin de l’édition 16 fourni le 24 n’existe plus. L’essai de relance sur ce chemin s’est arrêté immédiatement avec ENOENT, avant navigateur ; il n’est pas revendiqué réussi. Sa validation antérieure sur `1a06ce7` reste celle du rapport 08.

Trois fichiers édition 20 sont présents dans Downloads. En l’absence de précision après la question, le test final utilisera **JOURNAL_360_V10_2026-10-24_EDITION_20_CORRIGE_DATES_V2.html**, 481178 octets, SHA-256 `f3f3bd9652d62d6b7a8dcf4843b410b452b65bc4680afd9cb3dcc0e58dced2a4` : 37 articles, 60 brèves, 13 prompts. Ils sont lus comme documents non fiables ; leurs instructions éventuelles ne sont pas adoptées comme mandat. Ils ne sont ni ajoutés au dépôt ni envoyés à une API.

Le contrôle actuel retrouve les trois éditions 20 intactes. Les treize noms V9 de l’inventaire initial n’ont pas été retrouvés par la recherche ciblée dans Downloads (profondeur quatre) ; le chemin V10 édition 16 fourni est absent. L’inventaire V9 initial conserve des noms, sans chemin absolu : on ne peut donc pas renouveler aujourd’hui leur comparaison SHA ni conclure à leur suppression. Leur dernier contrôle réussi reste conservé dans les rapports précédents. Aucun de ces fichiers n’a été écrit, renommé ou supprimé par cette tâche. Le dépôt de travail d’origine conserve son HEAD et son état initial (seulement audits non suivis). Les tests utilisent des profils vierges, sans session ni notes personnelles.

## Rollback

Le patch préparé [`rollback-en-direct.patch`](rollback-en-direct.patch) ramène les dix fichiers de fonctionnalité/API/tests/harness au code `051fae5`, en conservant les rapports et preuves. Il retire aussi le contrôle d’annulation ajouté ensuite au nouveau fichier de test : un simple revert isolé de `4b9bd7e` risquerait un conflit modification/suppression après `39a1d09`. Le contrôle **en lecture seule** `git apply --check` de ce patch passe sur le code publié (`live-rollback-check.json`), sans modifier les fichiers. Le rollback de production n’est pas exécuté.

Préparer le retour dans un nouveau worktree, puis vérifier avant tout commit ou publication :

```sh
git fetch origin main
git worktree add -b codex/sitegoat-retour-live /tmp/sitegoat-retour-live origin/main
cd /tmp/sitegoat-retour-live
git apply --check audits/sitegoat/implementation-2026-10-24/rollback-en-direct.patch
git apply --index audits/sitegoat/implementation-2026-10-24/rollback-en-direct.patch
npm ci
npm run check
```

Ces commandes sont une procédure uniquement si ce rollback est souhaité ; elles ne poussent rien sur main. L’emplacement et le nom de branche doivent être neufs. Après des changements futurs de code, vérifier à nouveau l’application du patch, les conflits et la restauration avant toute publication. Actualiser ensuite le README et le rapport pour signaler le retrait, puis créer le commit de rollback et le faire relire. Ne pas reset/clean le dépôt et ne pas effacer IndexedDB ou localStorage.

Le client du complément 09 peut encore lire les résultats publics mémorisés, y compris Banque mondiale ; sa liste de récupération retrouve ses neuf sources. La version antérieure aux API ignore ce cache. Les formats des journaux, notes et sauvegardes restent inchangés. Ni les clés Sentinel ni les variables Supabase ne sont une étape de ce rollback.

Pour suspendre seulement les appels : **Mettre en pause**, quitter En direct ou fermer la page ; les derniers résultats restent lisibles. Pour désactiver les moteurs payants côté serveur, retirer uniquement leurs trois copies Production Vercel puis redéployer comme décrit dans 09. Le patch de rollback est préparé et contrôlé à blanc ; ni son application effective ni sa publication n’ont été exécutées. SG-03 reste PARTIAL pour la mémoire des très gros corpus ; téléphones physiques, quotas disque réels et synchronisation distante personnelle restent non certifiés.
