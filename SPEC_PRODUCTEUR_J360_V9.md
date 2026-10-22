# Contrat d’intégration du producteur Journal 360° V9

Le véritable collecteur, son registre et son automatisation ne sont pas présents dans ce dépôt. Les scripts de génération existants sont des fixtures. Ce document spécifie l’intégration ; il ne crée ni collecte, ni tâche planifiée, ni import automatique. Toute connexion à un producteur externe devra utiliser son accès autorisé. Aucun fait du HTML fourni n’est certifié par Sitegoat.

## Fichier autonome et contrat V7

Chaque cycle livre un HTML UTF-8 autonome, sans CDN, accompagné facultativement de fichiers Markdown identiques à ceux embarqués. Créneaux Europe/Paris : 08:00 briefing, 10:00 nouveautés, 12:00 consolidation, 14:00 sciences/tech, 16:00 économie/business, 18:00 SENTINEL/AXDIA, 20:00 prospective, 22:00 bilan. Respecter les transitions d’heure d’été/hiver dans les offsets ISO, jamais un offset fixe annuel.

Le seul bloc `script#unifiedData[type="application/json"]` respecte intégralement `journal360.unified` schemaVersion 7, le schéma Zod strict existant et tous ses contrôles sémantiques : `editionId=journal360-day-YYYY-MM-DD`, huit créneaux `paris-v7-8`, révision positive, `sourceVerifiedAt`, `slotsIncluded`, `missingSlots`, `cumulativeStatus`, couverture, synthèse avec références, items intégraux, économie, jalons/dossiers Future, prompts et provenance. Aucun champ de brève ajouté dans les items ou l’objet V7. JSON maximum 2 Mio et budget de complexité existant. HTML maximum 10 Mio. Sérialiser `<` en `\u003c` dans TOUS les blocs JSON. Un budget dépassé produit FAIL explicite ; ne jamais tronquer pour réussir la validation. Les prompts .md restent complets, UTF-8, retours à la ligne conservés, SHA-256 sur les octets exacts de `content`.

Une édition tardive doit embarquer tous les contenus qu’elle prétend préserver : articles des quatre univers, économie France/zone euro/USA/Chine, chronologie, documents, prompts et brèves. La couverture éditoriale d’une journée et la présence physique des HTML intermédiaires sont deux choses distinctes. Sitegoat n’exige aucun import intermédiaire pour lire les contenus présents. Il ne peut certifier la couverture sans registre indépendant.

## Compagnon réel `quickBriefsData`

Nom et version repris du fichier fourni du 22/10 à 16h, sans contrat fictif alternatif :

```json
{
  "format": "journal360.quickbriefs",
  "schemaVersion": 1,
  "editionId": "journal360-day-2026-10-22",
  "editionDate": "2026-10-22",
  "editionSlot": "16:00",
  "items": [{
    "eventId": "example.event.20261022",
    "title": "Titre de démonstration, pas une actualité réelle",
    "theme": "Sciences",
    "publishedAt": "2026-10-22",
    "eventDate": "2026-10-22",
    "source": {"publisher": "Exemple", "url": "https://example.org/source"},
    "evidenceStatus": "non-testé",
    "googleQuery": "question technologique publique de démonstration",
    "relatedArticleEventId": null
  }],
  "notice": "Provenance et limites éditoriales explicites."
}
```

Schéma structurel : [JOURNAL360_QUICKBRIEFS_V1.schema.json](docs/JOURNAL360_QUICKBRIEFS_V1.schema.json). Source exécutable : `src/data/quickBriefsSchema.ts` et `extractQuickBriefs` dans `src/data/quickBriefs.ts`. Validation stricte, 512 Kio, 500 brèves maximum par snapshot (borne technique, aucun quota de collecte), bloc unique inerte ; identité/date/créneau identiques au V7, dates calendaires valides et pas de dates futures, HTTPS publique, identifiants uniques. Les relations `relatedArticleEventId` doivent pointer vers un article réellement embarqué. Un compagnon invalide refuse l’import complet avant écriture ; un compagnon absent n’invente aucun titre.

Statuts acceptés : `source-primaire`, `presse-sourcée`, `annoncé`, `déduit`, `contesté`, `non-testé`. Ce sont des déclarations du producteur, pas une revalidation des URL par le lecteur. Une URL de rubrique générale ne prouve pas un événement précis. Pour des statuts enrichis incompatibles, publier une nouvelle version du contrat, sans assouplir silencieusement v1.

Extension optionnelle reconnue dès v1 : `corrections[]` contenant `{at: instant ISO avec offset, reason: texte >=10 caractères, source: {publisher,url}}`. Conserver l’eventId lors d’une correction ; ajouter les anciennes sources à l’historique documentaire. La filiation de promotion se fait par eventId identique ou `relatedArticleEventId` explicite. Une brève promue est retirée du compteur de titres courts par défaut et reste accessible via le filtre des promotions avec ses variantes. Ne jamais fusionner deux événements sur leur seul titre ni changer leur identité à chaque créneau. L’index courant est calculé par journée+eventId ; la stabilité de cette identité est un engagement du producteur, pas un fait inféré par le lecteur. Une omission ultérieure ne supprime pas les brèves conservées dans les originaux déjà reçus.

`googleQuery` et `publicResearchQuestion` sont uniquement des formulations publiques ; jamais notes client, noms de clients, identifiants privés, prompts, chemins locaux ou clés. Les contrôles du lecteur bloquent les marqueurs sensibles connus et reviennent à Google sans texte si la question est absente ou refusée. Ne pas compter sur une détection automatique universelle des secrets. L’ouverture reste au clic.

## Registre durable à implémenter côté producteur

Source de vérité recommandée : registre versionné par journée, distinct des artefacts HTML. Chaque état contient révision, créneau, horodatage Paris/UTC, eventId stables, première apparition, dernières modifications, articles/brèves/sources/corrections/promotions, références de prompts et SHA-256 des artefacts. Stockage atomique par écriture temporaire, fsync si applicable puis renommage ; verrou journalier pour éviter deux écrivains ; précédent état immuable conservé. Les URL officielles primaires et les dates de vérification doivent appartenir à chaque fait. Sans accès au registre : reconstruire les seuls contenus accessibles, annoncer PARTIAL/UNKNOWN et expliquer ce qui ne peut être confirmé. Pas de cumul déclaré COMPLETE simplement parce qu’un fichier porte un nom de créneau tardif.

Cycle : charger registre -> nouvelles recherches différentielles -> ouvrir/vérifier sources -> distinguer annonces/mesures/benchmarks internes/réplications/scénarios -> fusion par identité -> corrections explicites -> matérialiser snapshot complet -> vérifier Zod+références+hash+budgets -> vérifier offline/interactions -> publier dans le répertoire de sortie du producteur autorisé. Rapport séparé : brèves nouvelles/conservées/promues, articles nouveaux/conservés/corrigés, contenus omis et sources manquantes. Un échec ne remplace pas le dernier état valide. Rollback par sélection du précédent état et des artefacts correspondants, sans suppression.

Objectif éditorial indicatif : 20–60 titres pour une journée riche, jamais de remplissage artificiel. Articles : aperçu 1–2 phrases, résumé narratif 3–5 phrases si la matière le permet, analyse, meilleure objection, dates du fait et de publication distinctes, conséquences mondiales et AXDIA/SENTINEL pertinentes, corrections et sources primaires. SENTINEL : travail défensif, données clients privées séparées, aucune prétention de scan ou d’exposition non prouvée, score indicatif >=80/100 expliqué pour les pistes codables.

Économie : INSEE/BdF/Eurostat/BCE/FMI/OCDE/BLS/BEA/Fed/NBS/PBoC ; série+unité+fréquence+définition stables, périodes normalisées, publication/vérification/révision et sources. Ne pas relier des valeurs absentes. Le lecteur trace uniquement des points admissibles de séries homogènes, et garde les autres statistiques ponctuelles. Les mesures énergie/cyber/IA requièrent un futur contrat distinct si leurs métadonnées ne rentrent pas dans le V7 ; aucun champ libre ajouté au V7. Pour l’IA : pas de comparaison de benchmarks hétérogènes ni de courbe de progression fictive.

Futur : observations distinctes des hypothèses/scénarios, horizons 2027/2030/2035/2040+, objections, déclencheurs, falsificateurs. Pas de prédiction AGI certaine. Chaque jeudi 16h : projet d’article SEO AXDIA public à relire, annexe privée distincte, aucune publication automatique. Les prompts VS Code commencent par diagnostic lecture seule ; pilote après validation humaine, baseline, tests et rollback.

## Compatibilité et défaillances

Sitegoat stocke `Edition.quickBriefs` de façon additive dans les mêmes magasins IndexedDB v4. V7 inchangé ; ZIP reste v3 pour les éditions unifiées. Une sauvegarde conserve le compagnon et le HTML exact ; à la restauration il est réextrait et comparé aux octets contrôlés. Un ancien lecteur peut ignorer le champ de manifeste, mais conserve l’original : V9 peut reconstruire le compagnon depuis une telle archive. La reconstruction depuis une base déjà importée par un ancien client se fait à l’ouverture locale de V9 avec contrôle SHA, sans demande de réimport et sans modifier les octets. Les préférences d’affichage sont locales et ne font pas partie du ZIP des documents.

NON IMPLÉMENTÉ : collecteur, registre durable côté producteur, planificateur 8 créneaux, recherches et vérification factuelle, transfert automatique de fichiers, synchronisation Future ou un registre de séries IA dédié. Leur disponibilité ne doit pas être déduite de cette spécification. Les fixtures synthétiques n’en constituent pas l’implémentation.
