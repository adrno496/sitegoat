# Compatibilité JOURNAL 360 Mobile V2 / éditions V6

Évaluation locale du 14 octobre 2026, base `b1fc804`, version de travail `2.0.0-local.1`. **PARTIAL pour un fichier V6 réel : aucun HTML du producteur ni archive veille(1).zip n’a été fourni.** Les fixtures sont explicitement synthétiques. L’inspection du dépôt 1.1.1 confirme les mécanismes décrits dans la mission ; elle ne prouve pas l’identité de la production.

## Producteur → représentation indexée

| Champ HTML JSON | Importeur / stockage | Validation et limites |
|---|---|---|
| `title` | titre de l’édition | texte borné, rendu React échappé |
| `editionDate` | `date` | journée civile YYYY-MM-DD valide, pas date de téléchargement ; Paris pour affichage |
| `sourceVerifiedAt` | même chaîne exacte | ISO Z/offset valide ou date legacy ; invalide omis avec avertissement ; affichage Europe/Paris |
| `schemaVersion:2` | `schemaVersion:2` | optionnel ; autre version ou métadonnées invalides : quarantaine des nouvelles métadonnées seulement |
| `editionId` | `externalEditionId` | ≤200 caractères ; regroupement automatique uniquement si égal à `journal360-day-` + date exacte |
| clé logique | `dayKey` | distincte du UUID local, indexée ; aucune fusion automatique legacy par titre/date |
| `revision` | `externalRevision` | entier 1..1 000 000 ; distinct du compteur local `revision` |
| `slotsIncluded` | même champ | sous-ensemble unique de 08:00,16:00,21:00, ordre normalisé ; absence ≠ preuve de cumul |
| `cumulativeStatus` | `declaredCumulativeStatus` | COMPLETE/PARTIAL/UNKNOWN ; `cumulativeStatus` indexé provisoire, contrôle recalculé à l’affichage avec toutes les versions reçues |
| `missingSlots` | même champ | mêmes créneaux, ≤3 uniques ; ne remplit jamais un trou |
| `retiredEventIds` | même champ | extension optionnelle ≤2000 IDs ≤200 caractères ; retrait déclaré exige encore vérification |
| `items[].id` | `articles[].id` | identifiant local de l’article, doublons signalés/ignorés, ≤200 caractères |
| `items[].event_id` | `eventId` | identifiant explicite de l’événement ; pas d’inférence sémantique |
| titre/rubrique/date | article indexé | dates calendaires validées ; article invalide omis avec avertissement, original intact |
| summary/plain/detail/steps | texte indexé | résumé exécutif « En clair » repris ; rien généré par le lecteur |
| sources URL / paire / objet | URL source indexée | HTTP(S) validée, pas userinfo, hôte local/privé littéral, IPv6 ou port arbitraire ; revalidation au rendu |
| `kind` | nature optionnelle | news/business/hypothesis/technical/decision ; absence affichée « nature non précisée », jamais comptée comme actualité attestée |
| `firstSeenSlot` | créneau optionnel | première apparition déclarée seulement, jamais déduite de l’heure d’import |
| champs inconnus | ignorés par l’index | conservés dans l’original octet pour octet, pas supprimés du HTML |

Le JSON n’est jamais exécuté. L’HTML original n’est jamais injecté dans le DOM parent. Limites inchangées : 10 MiB par HTML, 20 fichiers/100 MiB par sélection, 2000 articles indexés. Dépassement du nombre d’articles produit un avertissement explicite ; aucune fabrication d’article dans un créneau vide.

## Identité et sélection de journée

Chaque version garde un UUID et un original SHA-256. Pour V6 canonique, UUID de famille dérivé de `dayKey`, UUID de version dérivé de `dayKey+SHA` : deux appareils convergent sur la même identité pour les mêmes octets. Même révision + SHA différent = deux branches conservées. L’option indépendante conserve une copie séparée. Les anciennes notes/favoris restent ancrés à leurs UUID/article.id ; aucun transfert implicite entre versions ni jours.

Le contrôle compare les event_id à l’union des révisions antérieures disponibles. Il signale pertes, trous de créneaux/révisions, branches et PARTIAL déclaré. COMPLETE exige des IDs comparables et un cumul déclaré cohérent avec la chaîne reçue. Sans preuves, UNKNOWN. La dernière COMPLETE disponible prime sur une PARTIAL plus récente. Les contrôles portent sur les fichiers reçus, **pas sur la vérité éditoriale**. Le retrait déclaré reste à vérifier. L’arbitrage consiste à consulter chaque branche ; pas de certification manuelle persistante ajoutée.

## Exemple minimal synthétique

```json
{
  "schemaVersion": 2,
  "title": "Fixture du 14 octobre",
  "editionDate": "2026-10-14",
  "editionId": "journal360-day-2026-10-14",
  "revision": 1,
  "slotsIncluded": ["08:00"],
  "cumulativeStatus": "COMPLETE",
  "missingSlots": [],
  "sourceVerifiedAt": "2026-10-14T08:07:00+02:00",
  "items": [{"id":"a","event_id":"event-a","title":"Événement fictif","category":"Science","plain":"Texte de test","sources":["https://example.org/test"]}]
}
```

Insérer dans `<script id="editionData" type="application/json">`; le reste du document reste autonome. Fixture exécutable : `tests/helpers/v6.ts`. Signature fonctionnelle locale : schéma2 optionnel + UUID séparés + créneaux explicites + originaux SHA conservés + protocole Google v1/v2 simultané.

## Matrice des formats

| Format | État vérifié | Limites |
|---|---|---|
| Démonstrations et JSON legacy présents | PASS, unités et E2E | pas de classement automatique par jour sans métadonnées canoniques |
| HTML générique sans JSON | PASS, original et rendu | aucun article ni date inventé |
| V1/V4/V5.2/V5.3 producteurs originaux | NON TESTÉ | non fournis ; compatibilité fondée sur contrat legacy et fixture Google existante, pas certification de toutes ces éditions |
| V6 synthétique 08/16/21 | PASS | données artificielles, huit thèmes internes et sept sections testés |
| V6 réel, illustrations réalistes | NON TESTÉ | fichier producteur absent ; pixel PNG embarqué décodé hors ligne, charge 32 KiB aléatoires/version mesurée séparément |
| JSON malformé / métadonnées invalides | PASS pour cas couverts | repli legacy et avertissement ; octets originaux conservés |
| ZIP historique format1 | PASS | limites originales validées |
| ZIP avec données V6 format2 | PASS, aller-retour et base vide | clients 1.1.1 ne savent pas lire format2 ; mise à jour de tous les appareils nécessaire avant synchronisation V6 |
