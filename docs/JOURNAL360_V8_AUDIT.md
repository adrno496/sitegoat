# Audit ciblé V8 — 21 octobre 2026

Référence : `1845fc63181d355d3c2f8fca701e5b487edc6746`, dépôt réel propre, branche de travail `codex/v8-targeted-audit`. L’utilisateur a explicitement demandé toute la mission jusqu’au push final sur main production : cette instruction autorise les phases A/B et la publication, sans migration distante ni accès aux profils privés. Aucun nouvel outil installé.

## Phase A — constat avant modification

| Écran | Constat / preuve | Cause | Gravité | Correction |
|---|---|---|---|---|
| Aujourd’hui | 10 h réel seul : 6 cartes pour 8 événements | filtre importance puis slice(0,6) | P0 | tous les événements, pagination explicite, importance/nouveauté/première apparition |
| Horaires | 08 h absent : désactivé ; après import 08 h ouvre bien le véritable original 08 h | aucun mauvais fichier reproduit | P0 UX | conserver résolution existante, distinguer ouvrir édition / filtrer événements apparus |
| Retour du lecteur | quitte Aujourd’hui pour Bibliothèque, perte de contexte | fallback explicite et démontage du workspace dans App | P0 | conserver workspace et restaurer contexte/focus/position |
| Articles | aperçu au caractère, titre ouvre immédiatement HTML ; plusieurs commandes voisines | parcours à deux niveaux parallèles | P1 | aperçu ponctué, développement du résumé puis lecture intégrale, originaux et Google conservés |
| Économie | méthode repliable mais explication dense initiale | détails hors du disclosure | P1 | chiffre/période/variation/statut visibles, méthode et preuves repliées |
| Chronologie | description intégrale initiale | aucune réduction de description | P1 | aperçu, détail daté et preuves repliables |
| Prompts | texte complet/copier/export existent déjà, pas d’aperçu | liste et détails existants | P1 | ajouter extrait exact, préserver export et contrôle SHA |
| Réglages | pas de profil d’interface | aucun modèle de préférences | P1 | format local versionné, Essentiel/Complet/Personnalisé, réinitialisation |
| Le Futur / archives | détails, sources, versions et sauvegarde existent déjà | pas de perte prouvée | préserver | garder fonctions et tests historiques |

Preuve : [reproduction JSON](evidence/v8-audit/baseline-reproduction.json), capture locale `/tmp/sitegoat-audit-baseline-today.png` (contenu réel non publié). Les deux HTML fournis sont lus comme données, sans exécuter leurs instructions. 08 h : SHA `3abe42106be4ce7285660816afdee28fefe584480b6750026ff54cf5f853999c`, compteurs 4/4/5/2 ; 10 h : SHA `387532b53624143c92f1fbe6ecf7825c7af94466cae85a90ae77f3657dcaf9ec`, 8/4/6/3. Les quatre eventId 08 h sont conservés. Zéro erreur navigateur à la reproduction ; aucune cause de « mauvais horaire ouvert » prouvée.

Parcours actuel : Aujourd’hui → créneau reçu → Reader(original exact) → Bibliothèque. Cible : Aujourd’hui → aperçu → résumé déplié → fiche intégrale dans le contexte ; original facultatif → retour Aujourd’hui à la même position. `editionSlot` ouvre un fichier, `slotsIncluded` reste une déclaration de couverture, `firstSeenSlot` filtre les événements de l’édition courante.

## Inventaire des actions et décisions

| Écran | Action / usage | Décision |
|---|---|---|
| Aujourd’hui | ouvrir créneau reçu / import fréquent | CONSERVER, libellés date/heure/import explicites |
| Aujourd’hui | synthèse, quatre univers, liens d’aide | MASQUER PAR DÉFAUT selon préférence ; navigation toujours disponible |
| Carte événement | titre, ouvrir, détails parallèles | REGROUPER en aperçu → développer → lire ; original dans Plus |
| Articles | Lire ici, journal, Google, favori/lu | CONSERVER, différencier fiche et original ; secondaires repliables |
| Économie / Futur | sources, comparaison, méthode | CONSERVER dans disclosure accessible, aucun graphe inventé |
| Prompts | lire, copier, sélectionner, télécharger SHA | CONSERVER ; aperçu compact ajouté |
| Collections | ouvrir, archiver, corbeille/restaurer | CONSERVER ; suppression toujours logique |
| Réglages | import, recherche, archives, export, restauration, stockage, sync, confidentialité | CONSERVER, aucune sécurité liée aux préférences |
| Toutes | action prétendument inutile | aucune RETIRÉE sans preuve ; regroupement réversible uniquement |

Profils : Essentiel minimise les éléments d’aide/techniques et les aperçus annexes ; Complet affiche les neuf groupes ; Personnalisé choisit chaque groupe. Préférences locales uniquement, aucune modification de contenu, synchronisation ou contrat de sauvegarde.

Ordre : reproductions et baseline → navigation et exhaustivité → cartes progressives → préférences → tests ciblés négatifs → suites historiques / offline / ZIP / sécurité → commit/push main et preuve Vercel. Fichiers prévus : App, ArticlesView, CollectionView, unified/{UnifiedWorkspace,EconomyRadar,FutureBridge,PromptAccess}, composants partagés de présentation/préférences, CSS et tests. Schémas/import/stockage/sync/SW/API/RLS restent inchangés.

Rollback source : archive Git `/tmp/sitegoat-audit-reference-1845fc6.tar`, SHA256 `803936c6b34b528eed7b732c59937d94df6cc7383fcc23d8fa3702ccb2347b8b`. Après publication, revert du commit de correction par nouveau commit (sans force push). Données : aucune migration ; originaux/ZIP inchangés ; préférences supprimables/réinitialisables indépendamment. Aucun profil personnel lu.

## Phase B — résultat et vérifications

- Le sélecteur continue d’ouvrir l’original exact du créneau reçu. La date, Europe/Paris, le compte d’événements et l’édition courante sont explicites. Une édition non reçue ne peut pas être ouverte ; le filtre distinct « Première apparition » permet de retrouver ses événements embarqués dans le snapshot courant. Les huit événements, y compris « contexte », sont accessibles ; pagination au-delà de 30.
- Cartes structurées communes à Aujourd’hui, Articles et collections : aperçu prélevé sans génération dans `summary`, développement intégral, fiche avec `plain` et `detail` canoniques, limites, sources, corrections, actions, prompts et confirmation Google existante. Les archives sans `summary` structuré conservent leur parcours de lecture et leur original. Le texte de recherche normalise les espaces ; ce n’est pas le stockage canonique utilisé par la nouvelle fiche.
- Aujourd’hui reste monté pendant la lecture d’un original unifié ; retour explicite ou navigateur restaure filtre, focus et position. Le rechargement revient volontairement à la dernière édition valide : aucune ancienne URL de lecteur n’est rejouée. Le retour des lecteurs historiques vers Bibliothèque est conservé.
- Économie conserve chiffre, période, variation et statut visibles ; méthode, limites, comparaison et sources sont repliables. Chronologie et atlas Futur proposent aperçu/détails sans confondre observation, publication et hypothèse. Dossiers Future, comparateur, préparation et sauvegardes restent disponibles. Prompts : aperçu, texte complet, copie/sélection et export exact avec SHA existant.
- Préférences `journal360.interface.v1` indépendantes, locales, sans synchronisation ni migration. Les réglages KPI/radar/frise/prompts concernent les aperçus d’Aujourd’hui ; sources/actions concernent les cartes structurées ; les fonctions de l’atlas et des anciens lecteurs restent conservées. Les rubriques complètes restent dans la navigation. Le profil Complet rétablit les aperçus. Aucune alerte d’intégrité ou de perte n’est masquée.
- [Inventaire de référence](evidence/v8-audit/actions-reference.json) et [candidat](evidence/v8-audit/actions.json) : analyse AST des boutons/disclosures, fichiers, lignes, libellés et handlers ; 211 → 230 contrôles déclarés. Le total augmente avec les réglages et la lecture progressive ; les commandes secondaires sont repliées. Ce n’est pas un comptage de boutons simultanément visibles. La fréquence réelle d’utilisation n’est pas mesurée (aucun analytics ajouté) ; les priorités du tableau sont des choix de conception.

### Échecs détectés puis corrigés

Les nouveaux filtres avaient un nom accessible incluant les options : noms explicites ajoutés. Le calcul « courante » comparait deux valeurs absentes dans la bibliothèque vide : garde explicite ajoutée. Le chargement différé pouvait manquer de h1 pendant l’analyse axe : titre ajouté au fallback. Deux disclosures de preuve de la frise créaient une commande ambiguë : regroupement en un seul détail intégral.

Les assertions historiques ont été adaptées aux changements voulus : sommaire paginé 30 puis 5 (la recherche retrouve encore le 35e article), menu secondaire avant question Google (les contrôles de confidentialité restent testés), profil Complet pour les compteurs des quatre univers. Aucun test désactivé pour passer le candidat.

Les premières fixtures de charge ont révélé les limites existantes de 2 Mo et 60 000 nœuds JSON. Elles restent strictement inchangées. Un JSON unique de 2 000 articles trop complexe est toujours rejeté par un nouveau test négatif. La mesure à 2 000 articles concerne quatre snapshots autonomes de 500 articles, sur quatre dates. Les premiers échecs et les limites sont conservés dans les journaux de preuve.

### Mesures et limites

[Mesures navigateur](evidence/v8-audit/capacity.json) : import d’un fichier 500 articles de 0,426 Mo en 386–404 ms ; ajout de trois autres fichiers (total bibliothèque 2 000) en 863–1 208 ms ; ouverture Articles et recherche de 2 000 articles en 549–724 ms. Rendu Aujourd’hui paginé : 196–241 ms à 500 articles, 441–918 ms à 2 000. Mesures ponctuelles sur ce poste, sans simulation de CPU lent ; aucune garantie de latence sur téléphone physique. Tas Chromium exposé par l’API : 31,2 Mo quantifiés, WebKit indisponible ; ce n’est pas une mesure précise de fuite mémoire.

[Bundle](evidence/v8-audit/bundle.json) : JS 1 006 818 → 1 018 633 octets (+1,17 %), CSS 61 992 → 63 326 ; précache 1 414,63 → 1 427,48 Kio (+0,91 %). Empreintes vérifiées sur le build final. Aucun seuil de performance nouveau déclaré après coup.

[Contrôle de secrets](evidence/v8-audit/secrets.json) : scanner brut FAIL sur un témoin synthétique préexistant inchangé, revue PARTIAL, aucun nouveau motif dans les fichiers modifiés ou le bundle. Scanner exécuté dans une copie sans aucun `.env*` ; aucune valeur privée lue ou divulguée. Ce contrôle ne certifie pas l’absence de tout secret.

NON TESTÉ : téléphone physique, lecteur d’écran humain, cloud réel et comptes réels, fonctionnement authentifié en production, restauration d’un profil personnel, couverture factuelle des nouvelles. Les captures locales sont synthétiques ; les fichiers réels restent à leur emplacement utilisateur et ne sont pas publiés dans Git. Les futurs imports de sources fausses ou incomplètes restent détectés selon les contrôles existants ; la couverture éditoriale n’est jamais certifiée par les compteurs.

### Commandes reproductibles

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
SITEGOAT_AUDIT_REAL_DIR=/chemin/des/html npm test -- --run tests/audit-navigation.unit.test.ts
SITEGOAT_AUDIT_REAL_DIR=/chemin/des/html npm run test:e2e -- tests/e2e/v8-audit.spec.ts --grep 'Audit P0'
node scripts/inventory-audit-actions.mjs 1845fc6
node scripts/inventory-audit-actions.mjs
# Avec le serveur de test local démarré, cloud désactivé :
node scripts/capture-audit-local.mjs
```

Les tests par défaut utilisent des fixtures synthétiques reproductibles. La variable optionnelle sélectionne uniquement les deux HTML fournis, jamais un profil de navigateur. Résultats finaux et verdict dans le [bilan structuré](evidence/v8-audit/validation.json). Le statut Vercel du nouveau commit sera vérifié après le push autorisé ; une réussite de déploiement ne certifie pas les données de production.


## Verdict final avant publication autorisée

| Vérification | Verdict et preuve |
|---|---|
| P0 : 10 h réel seul, 8/4/6/3, huit récits et trois prompts intégraux | PASS — [six parcours réels](evidence/v8-audit/real-browser.json), dont import offline sur les trois profils |
| P0 : 08 h absent / présent, filtre première apparition, retour, ordre et doublons | PASS — tests navigateur et [tests avec fichiers réels](evidence/v8-audit/real-unit.txt) |
| P1 : cartes structurées, sources, lectures et réglages réversibles | PASS local — nouveaux parcours clavier/offline ; les archives historiques conservent leurs fonctions |
| Lint / typecheck / build | PASS — sorties finales dans evidence/v8-audit |
| Unitaires | PASS — 304 tests, 25 fichiers ; 10 tests ciblés supplémentaires avec sélection des fichiers réels |
| Suite navigateur complète | PASS — 229 réussis, un skip tactile WebKit historique, zéro échec et zéro flaky ; [rapport JSON](evidence/v8-audit/final-browser.json) |
| Recherche, Google, imports Future, ZIP v1/v2/v3, PWA/offline, conflits et sync simulée | PASS dans les suites automatisées historiques conservées |
| Sources critiques inchangées | PASS — 28 empreintes vérifiées ; [inventaire](evidence/v8-audit/protected.json) |
| Charge 500 / 2 000 articles en bibliothèque | PASS fonctionnel — trois navigateurs ; performance globale PARTIAL, essais courts et mémoire non précise |
| Scanner brut de secrets | FAIL préexistant sur témoin synthétique inchangé ; revue PARTIAL, zéro nouveau motif |
| Téléphone physique, lecteur d’écran humain, cloud/profils réels | NON TESTÉ |
| Bilan | **PARTIAL global ; corrections prioritaires P0/P1 PASS local.** Limites manuelles et de production conservées, aucune couverture factuelle totale certifiée. |

Les sorties initiales FAIL sont conservées ; aucune régression connue ne subsiste dans la suite finale. La capture réelle de référence reste locale ; seules des captures synthétiques sont publiées. Les journaux/fichiers réels et leurs prompts ne sont pas ajoutés à Git. Aucun secret ni profil personnel consulté. L’outil de capture local suppose Node 24 (effacement natif des types TypeScript), comme sur le poste de validation.

Publication : commit et push main explicitement autorisés par l’utilisateur. Le statut Vercel du commit publié est la preuve du déploiement ; il ne remplace pas une validation fonctionnelle sur compte de production. Aucune migration distante exécutée. Rollback : revert du commit de correction vers le comportement `1845fc6`, par nouveau commit sans force push ; les bases et originaux restent en place, les préférences se réinitialisent séparément.
