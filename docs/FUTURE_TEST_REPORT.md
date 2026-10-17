# Le Futur — vérifications et livraison locale

17 octobre 2026 · Journal 360 2.0.7 · branche `codex/le-futur-local` · référence avant changement `7df8910`.

Le choix utilisateur remplace IA & Opportunités par Le Futur. L’implémentation conserve Articles, les questions Google, IA majeur, Sentinel et le lecteur historique. L’utilisateur a ensuite explicitement autorisé le commit et le push vers `main`. Aucun déploiement manuel, job, appel LLM, abonnement nouveau, changement Supabase/RLS/ACL ou publication de transcription privée n’a été effectué. Le CI/CD déjà associé au push peut se déclencher.

## Résultats réellement mesurés

Les résultats finaux sont consignés dans [checks.json](evidence/future/checks.json). Les vérifications ont été exécutées localement avec Node 24/npm 11, Chromium, WebKit et une émulation Pixel 7. Réseau externe bloqué dans les parcours E2E, cloud simulé lorsque le test le prévoit. Les jeux de données et notes de test sont synthétiques ; les contextes de navigateur sont séparés des comptes et données utilisateur.

| Vérification | Statut | Preuve / portée |
| --- | --- | --- |
| Choix du dépôt, Git et version | PASS | [Baseline](FUTURE_BASELINE.md), source `journal360-claude-fix`, ancêtre de tous les correctifs retenus. |
| Copie du code avant changements | PASS | Archive Git suivie, SHA-256 dans la baseline. |
| Sauvegarde des IndexedDB réellement utilisés par l’utilisateur en production | NON TESTÉ | Aucun accès à ces données ; l’archive Git ne les sauvegarde pas. |
| Installation reproductible | PASS | `npm ci --no-audit --no-fund` dans la copie isolée sans `.env.local`, 531 packages, lockfile inchangé. Aucune nouvelle dépendance. |
| TypeScript, ESLint, build | EN COURS | Logs finaux `evidence/future/{typecheck,lint,build}.log`. |
| Unitaires et intégration | EN COURS | Contrats, sources, Unicode, tailles, dates, snapshots, original altéré, collisions, quota simulé, notes concurrentes, ZIP et deux bases locales. |
| E2E complets de non-régression | EN COURS | Journaux 08/16/21, Articles/Google, IA majeur/Sentinel, lecteur, backup/sync simulée, partage de fichier, thèmes et PWA. |
| Nouveaux E2E Le Futur | EN COURS | 5 parcours × Chromium/WebKit/mobile : six modules, import HTML/JSON, révision confirmée, notes/favoris, original isolé, export, ZIP, rechargement, offline, erreurs, migration explicite, manque d’espace et lot mixte. |
| Contraste et accessibilité automatisée | EN COURS | Axe WCAG A/AA sur Le Futur clair/sombre ; clavier, liens internes, 320/390/768/1440 et mouvements réduits. |
| Détection d’une erreur volontaire | PASS | [mutation.json](evidence/future/mutation.json) : autoriser un jalon futur comme observé fait échouer le test ; code restauré exactement, test repassé. |
| Performances synthétiques locales | EN COURS | 1 000 dossiers ; mesures séparées des garanties de fluidité sur téléphone. |
| Synchronisation privée automatique Le Futur | NON TESTÉ / NON CONFIGURÉE | Échange manuel d’archives vérifié entre deux bases ; aucun connecteur automatique ajouté. |
| Smartphone physique, VoiceOver/TalkBack humain | NON TESTÉ | Émulation et axe ne les remplacent pas. |
| Migration PWA depuis la version effectivement déployée, sur téléphone réel | NON TESTÉ | Le test local de remplacement réel du service worker protège les journaux ; aucune mise à jour distante effectuée. |
| Ingestion authentifiée / planificateur P2 | NON TESTÉ / DIFFÉRÉ | Aucun canal branché, aucune promesse de mise à jour automatique. |
| CI GitHub distant | NON TESTÉ | Workflow existant Node 24, npm ci, installation Chromium/WebKit et npm run check ; statut distant à vérifier après le push autorisé. |
| Certification de faits ou prédictions | NON APPLICABLE | Statuts importés toujours attribués ; aucune probabilité ou consultation inventée. |

## Échecs trouvés puis traités

La baseline immuable a 226 tests unitaires PASS et 136 E2E PASS, 1 ignoré, **3 FAIL préexistants** sur `v6-daily.spec.ts:127` (un cas, trois navigateurs). Une date effacée puis rétablie laissait le choix « version » sans parent désactiver Enregistrer malgré une journée désormais valide. Le correctif ne change que la condition du bouton selon la journée effective et la destination.

Les premiers nouveaux essais ont détecté des liens trop peu contrastés en sombre ; ils utilisent désormais la couleur d’encre du thème. Un test de concurrence a exposé la perte d’une note lorsque deux formulaires partaient du même état ; l’ajout de notes est maintenant réuni dans la transaction. Une collision d’UUID avec un autre texte est refusée sans remplacement. Les références du test ZIP-slip ont été ajustées au message exact, et la comparaison d’octets utilise un tableau pour éviter une différence de prototype entre contextes jsdom/Node.

Le parcours de mise à jour garde le dossier ouvert et actualise sa révision : le test a été corrigé pour vérifier cette actualisation. Le test clavier WebKit ne suppose plus qu’une préférence macOS de tabulation passe systématiquement au bouton suivant ; il vérifie l’activation au clavier, le téléchargement, un focus dans le workspace et un lien interne. Le parcours de tabulation sur un téléphone/Safari physique reste à examiner.

Plusieurs exécutions E2E ont été volontairement interrompues pour intégrer le durcissement du routage avant DOM et des attributs HTML entre guillemets ; elles ne sont pas comptées comme des suites complètes réussies. Le routage analyse uniquement les données de scripts, sans créer de DOM. Le test hostile surveille aussi toute requête vers un domaine d’exfiltration de test. Les journaux des interruptions sont distincts du résultat final.

## Sécurité et sauvegarde

Refus de champs/modules inconnus, URLs actives/non HTTPS/privées, scripts supplémentaires, ressources/attributs actifs, styles externes, JSON invalide/profond/trop gros et dates impossibles. Une injection textuelle est rendue comme du texte, jamais traitée comme une autorisation. Un scénario futur ne devient pas une observation vérifiée.

Le dépôt revalide original, SHA-256, kind et payload juste avant la transaction. Le hash canonique empêche les doublons dus à la seule présentation. Une ancienne/égale révision différente est refusée ; un lot en conflit ou dont l’original échoue sur quota annule toutes les écritures. Favoris/notes ne sont pas dans le snapshot éditorial.

Le ZIP dédié vérifie limites décompressées/chemins et original/payload, puis fusionne atomiquement. Deux appareils simulés gardent leurs notes et états divergents. Les conflits de révision annulent toute la restauration. Les empreintes prouvent la cohérence, pas l’identité de l’auteur. Les archives restent privées et l’export HTML ne contient pas les notes.

## Mesures et limites de performance

À compléter depuis [performance.json](evidence/future/performance.json), les logs de build et les échantillons `frames-*.json`. Les mesures Node/jsdom/fake-indexeddb ne représentent pas IndexedDB sur un téléphone. Les checkpoints RSS comprennent le processus de test, le DOM simulé et les archives en mémoire ; ils ne sont ni la mémoire du seul écran ni un pic garanti. Le ZIP est construit/validé en mémoire : les grosses archives peuvent demander beaucoup de RAM, malgré les limites de taille. Tester un volume réel sur l’appareil cible avant d’en dépendre.

Les visualisations et le dialogue sont chargés à la demande ; la PWA précache leurs bundles pour le mode hors ligne. La liste est paginée à 20 et ne charge pas les snapshots/originaux. Les exemples et le schéma ajoutent du cache local, sans police/CDN. Le bundle principal avait déjà un avertissement >500 kB ; celui-ci reste visible et n’a pas été masqué.

## Périmètre livré et restant

P0 local : onglet isolé, imports contrôlés, transactions, modules, versions, sauvegarde et exemple hors ligne. P1 local : comparateur, liens de frise, recherche/filtres, exports et suivi personnel. Synchronisation automatique multiappareils : absente, limitation visible ; transfert manuel par ZIP. P2 : conception différée d’un canal authentifié ou signé avec revue éditoriale, déduplication, anti-rejeu et quotas. Aucun coût de service nouveau engagé ; quotas d’hébergement à vérifier avant activation.

Voir [architecture](FUTURE_ARCHITECTURE.md), [guide et contrat](FUTURE_IMPORT_GUIDE.md) et [retour arrière](FUTURE_ROLLBACK.md). Les trois fixtures nommées ont été créées comme références synthétiques, car les fichiers portant ces noms n’étaient pas fournis.
