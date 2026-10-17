# Le Futur — architecture locale et limites

Évolution additive de Journal 360 2.0.7, base `7df8910`. Le 17 octobre 2026, l’utilisateur a explicitement choisi **« Remplacer IA & Opportunités par Le Futur »**. Les onglets Articles, IA majeur et Sentinel restent disponibles ; Le Futur constitue la neuvième destination. La demande jointe interdisait le push automatique et le déploiement. Dans un message ultérieur, l’utilisateur a explicitement autorisé « à la fin commit push sur le main ». Travail préparé et testé sur `codex/le-futur-local`, puis push normal vers `main` après validation, sans force. Aucun déploiement manuel ni changement cloud ajouté.

## Frontières

- `future/routing.ts` détecte le marqueur `futureData` ou l’ancien `contentType:ai-radar` avant le regroupement quotidien. Un marqueur invalide reste dans le parcours de rejet dédié. JSON natif également accepté. Dans Le Futur, un journal ordinaire exige un transfert explicite vers Bibliothèque.
- `future/import.ts` décode UTF-8 strictement, contrôle extension/MIME/tailles, structure/profondeur, refuse les ressources et attributs actifs, extrait un seul script JSON inerte puis valide le contrat. HTML et JSON passent par le même schéma.
- `future/schema.ts` utilise Zod strict, bornes et références croisées. `SCHEMA_FUTUR_IA_v1.json` publie la structure ; les règles temporelles et croisées supplémentaires sont appliquées par Zod et `validateFuture`. Le JSON Schema seul ne remplace pas ces contrôles.
- `future/db.ts` utilise **une autre base IndexedDB**, `journal360-future-private`, version 1. Aucune migration de `journal360-private`, aucun changement Supabase, RLS, ACL, stockage cloud, code d’accès ou format de sauvegarde historique.
- `future/FutureView.tsx` rend du texte via React et des modules autorisés. Les données ne fournissent aucun composant, CSS ou JS. Le chargement du workspace et du dialogue est différé ; les fichiers sont précachés pour l’usage hors ligne. La liste ne charge pas les snapshots ni les originaux.

Le parseur quotidien refuse les marqueurs prospectifs même si appelé directement. Un lot mixte ouvre d’abord la vérification quotidienne puis celle de Le Futur : jamais deux dialogues simultanés. Un fichier importé n’est jamais une instruction destinée à Codex, à un LLM ou à l’application.

## Collections séparées

| Table | Contenu |
| --- | --- |
| documents | Métadonnées du dernier snapshot, index textuel normalisé limité à 250 000 caractères, horizons, date du dernier changement local. |
| versions | Révision, SHA-256 des octets originaux, hash canonique du JSON validé, nom/taille, différences et dates. |
| contents | Snapshot JSON complet, chargé pour le dossier consulté. |
| originals | Octets exacts du fichier fourni. |
| personal | Favori, notes, décision, invalidation, date de réexamen, suivi des actions, revues personnelles des sources. |
| changes | Historique local des imports et changements personnels. |
| settings | Dernière visite locale ; aucune session ou clé. |

Un `documentId` désigne un sujet, pas un jour. Une nouvelle révision doit avoir une révision et un `updatedAt` strictement supérieurs. Les snapshots sont complets et immuables. Le même original/hash ou payload canonique est ignoré. Une révision égale différente ou ancienne est refusée ; jamais d’écrasement. Les mises à jour exigent la lecture des différences et une confirmation. La transaction du lot conserve documents, versions, contenus, originaux et historique ensemble. La transaction annule les écritures si le quota, une collision ou les plafonds de la sauvegarde empêchent la fin du lot. `future/budget.ts` mesure le manifeste UTF-8 et le total retenu à chaque import, modification personnelle et restauration : aucune écriture acceptée ne doit rendre la sauvegarde dédiée impossible (3 000 versions, 50 000 événements, 32 Mio de manifeste, 150 Mio au total). L’estimation de capacité est préventive et approximative : IndexedDB garde le dernier mot.

Notes et suivi personnel sont distincts des versions. Retirer une action du snapshot n’efface pas son ancien suivi, qui reste dans la sauvegarde et les versions. Les textes personnels ne sont pas envoyés à un service externe.

## Rendu et confiance

Modules v1 : `timeline`, `scenarios`, `signals`, `actions`, `changes`, `sources`. La frise propose des liens explicites entre jalons. Les trajectoires accélération/modérée/ralentissement restent des scénarios sans probabilités inventées. Les efforts chiffrés exigent une justification. Aucun compteur d’efficacité fictif, aucune notification réseau ou automatique. Les statistiques visibles sont des décomptes locaux.

`observed` est affiché **Observation déclarée** ; il exige une preuve référencée. Un jalon de 2027+ ne peut pas être « observé » en 2026. Un dossier « observé » doit contenir une observation sourcée. Ceci ne constitue pas une certification de la source. `consultedAt` et `lastCheckedAt` sont explicitement des déclarations du fichier. La seule revue personnelle est enregistrée par une action locale et une justification ; elle ne certifie toujours pas le fait. Le site ne consulte pas automatiquement les liens. Liens externes HTTPS publics, ouverture explicite, `noopener noreferrer`.

L’aperçu HTML est optionnel, produit depuis le snapshot validé avec les styles du site, puis dérivé sans scripts/ressources, dans une iframe à origine opaque `sandbox=""` avec CSP `default-src 'none'`, `script-src 'none'`, connexions/images/formulaires interdits. Les styles et animations du fichier importé ne sont jamais chargés dans cet aperçu ; le choix motion et la réduction des mouvements restent contrôlés par le site. L’original demeure téléchargeable exactement. L’export portable est produit par le code du site, avec texte échappé, styles possédés par l’application, JSON encodé et aucune dépendance distante. Il ne contient pas les notes privées ; l’archive dédiée les inclut.

`motion:subtle|off` est la seule préférence importable de mouvement. Animations d’entrée CSS discrètes, désactivées par `off` et `prefers-reduced-motion`. Pas de carrousel automatique ni de bibliothèque graphique supplémentaire. Contraste clair/sombre et focus clavier vérifiés sur les scénarios de test ; lecteur d’écran humain et smartphone physique restent à vérifier.

## Sauvegarde et échanges entre appareils

`future/backup.ts` produit un ZIP privé dédié : `future.json`, snapshots, métadonnées, notes, suivi, historique, et `originals/fv-<sha256>.html|json`. Limites : 3 000 versions, manifeste 32 Mio, chaque original 10 Mio, archive décompressée 150 Mio. Les chemins ZIP, tailles déclarées puis effectives, unicités, SHA-256, correspondances payload/original et chronologie des versions sont contrôlés. Les originals sont reparsés lors de l’inspection ; aucune exécution. Une empreinte détecte une modification accidentelle mais n’authentifie pas l’auteur d’une archive.

La restauration prévisualisée fusionne dans une transaction. Même sujet/révision avec payload différent : annulation complète et conservation des deux archives pour résolution manuelle. Les notes sont réunies ; conflit de même UUID : autre note à identifiant déterministe. Les états personnels divergents restent dans une note de conflit, le plus récent devient l’état courant ; favoris réunis, clés de suivi/revue réunies. Pas de suppression silencieuse. Une fusion identique est idempotente sur les cas testés.

**Synchronisation automatique Le Futur : non configurée.** La synchronisation Supabase des journaux continue avec son modèle existant. Pour transférer Le Futur entre appareils, exporter puis restaurer sa sauvegarde séparée. Les tests de deux bases simulent cet échange ; ils ne prouvent pas une synchronisation réelle entre deux comptes/appareils. Sauvegarder les deux espaces séparément.

## Compatibilité AI-RADAR et P2

`aiRadar/` conserve uniquement l’interprétation stricte de l’ancien contrat et le lecteur HTML isolé. La migration est explicite, non destructive, produit un ID stable à partir du document/event d’origine, conserve les octets et classe les affirmations en « inconnu », les sources comme non consultées. Elle ne prétend pas convertir automatiquement toutes les anciennes opportunités en actions prospectives : l’original conserve les détails et une révision éditoriale du contrat Le Futur doit les restructurer.

Aucun flux ChatGPT ou YouTube, collecte de transcription, ordonnanceur, abonnement, endpoint ou tâche distante n’a été activé. Aucun abonnement ou API payante ajouté ; la consommation du CI/CD existant dépend des quotas du compte, non vérifiés. P2 nécessitera une API authentifiée ou des lots signés, quotas, anti-rejeu, déduplication ID/hash, journal d’erreurs et revue éditoriale avant import. Le workspace actuel ne promet aucune fraîcheur ou mise à jour automatique. Les capacités, quotas et coûts d’hébergement devront être vérifiés avant toute activation autorisée.

Les exemples publics passent par `/examples/future/`, explicitement exclus de la réécriture SPA Vercel. Le test du routage protège ces téléchargements ; le déploiement distant doit encore servir le nouveau build avant leur disponibilité publique.
