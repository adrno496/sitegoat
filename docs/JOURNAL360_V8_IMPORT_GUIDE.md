# V8 — importer une seule édition tardive

Importer **uniquement** `snapshot-22.html` dans une bibliothèque vide suffit à ouvrir tous les contenus réellement embarqués. Les fichiers de 08/10/12/14/16/18/20 h ne sont pas obligatoires. Un créneau non importé n’est pas un article manquant. Le site ne recrée aucune information absente des fichiers disponibles.

## Exemple vérifiable

Les fichiers locaux [SYNTHÉTIQUES](../tests/fixtures/v8/) sont générés sans réseau par `node scripts/generate-v8-snapshots.mjs` : huit snapshots 08–22 h, leurs JSON, un manifeste de test indépendant et deux Markdown intégraux. `snapshot-22.html` contient A–H, quatre zones économiques, deux jalons, deux prompts et un dossier Future v1. `snapshot-18.html` contient A–F ; `snapshot-12.html` A–C. Les heures de première apparition sont déclarées dans le fichier et ne sont pas inventées par le navigateur. Ces exemples du 19 octobre ne représentent aucune actualité réelle.

1. Utiliser un profil navigateur de test neuf sur la démo locale ; ne pas effacer la bibliothèque personnelle.
2. Importer le seul HTML de 22 h, destination Bibliothèque, confirmer l’import.
3. Aujourd’hui : **8 articles disponibles, contenu autonome**, couverture non certifiée, un fichier distinct importé, comparaison antérieure NON DISPONIBLE. Les sept créneaux intermédiaires sont facultatifs.
4. Articles et les quatre univers donnent accès aux récits ; Économie expose FR/EU/US/CN, Chronologie IA les deux jalons et le dossier embarqué ; Mes prompts propose deux fichiers distincts. La recherche locale indexe ces contenus, sans requête Google automatique.
5. Le dossier Future embarqué est consultable intégralement en lecture seule et exportable en JSON validé. Son import dans **Le Futur** reste une action séparée et confirmée : aucune écriture interbases cachée. Le compteur de l’atlas séparé compte ses dossiers propres, pas les paquets encore embarqués dans les journaux.
6. Les prompts proposent Voir/Copier/Sélectionner/Télécharger. Les téléchargements correspondent aux octets UTF-8 embarqués ; un SHA fourni faux refuse l’import. Aucun bouton n’exécute le prompt.

## Les quatre dimensions

| Dimension dérivée | Sens et limites |
|---|---|
| Intégrité VALID | Contrat, références et SHA fournis contrôlés à l’import ; les fichiers invalides sont refusés avant écriture. Ce n’est pas une certification des sources. L’écran ne relit pas le hash de l’original à chaque rendu ; l’export ZIP le vérifie de nouveau. |
| Autonomie AUTONOMOUS | Les données du snapshot sont accessibles sans autres fichiers. N’implique pas « tous les faits du monde/jour ». INCOMPLETE signale une omission par rapport aux témoins locaux ou un index interne incomplet. Les conflits de révision dégradent la confiance de couverture, sans rendre les octets du snapshot inutilisables. |
| Couverture UNKNOWN / PARTIAL | UNKNOWN sans registre factuel indépendant. PARTIAL si le producteur la déclare, si des sources sont non vérifiées ou si les fichiers locaux révèlent une contradiction. VERIFIED_COMPLETE n’est jamais accordé par cette implémentation, même avec les huit imports. |
| Historique SINGLE_SNAPSHOT / SOME_VERSIONS_MISSING / FULL_CHAIN | Versions physiques distinctes reçues dans ce navigateur, indépendamment du contenu du dernier fichier. Un doublon exact ne crée pas une deuxième version. |

Les champs V7 `cumulativeStatus`, `slotsIncluded`, `missingSlots`, `previousRevisionRef` restent des déclarations du producteur. Le champ historique local de cumul est conservé pour compatibilité ; il n’est plus le badge unique de diagnostic V7. Les anciens V6/21 h gardent leur fonctionnement et contrat historiques.

## Réconciliation sans réécriture

Le courant est choisi par créneau puis révision et départage technique déterministe ; un conflit de même créneau/révision est visible, le choix reste provisoire et ne certifie pas la branche factuellement juste. Les éditions arrivées dans le désordre ne rétrogradent pas l’affichage.

Un événement antérieur omis reste indexé avec son original. Les prompts, jalons et dossiers embarqués omis restent consultables depuis les versions réellement reçues, avec provenance. Les anciens textes/sources d’un événement corrigé peuvent être recherchés avec ouverture de l’original correspondant. Les anciennes variantes de prompts portant le même ID restent consultables dans la bibliothèque des documents/historique ; la recherche globale privilégie la dernière variante par ID. Les listes sont paginées ; aucune copie persistante du snapshot n’est produite.

Une omission constatée est un témoin local, pas la preuve universelle de la couverture du jour. Sans ancien fichier ou registre indépendant, l’application ne peut pas deviner qu’un événement C a été omis : autonomie du contenu présent, couverture UNKNOWN. Une modification sans correction documentée ou une première apparition changée appelle vérification. Un retrait n’est pas appliqué comme suppression ; ses justifications restent dans les déclarations/corrections et originaux. Aucun tombstone distant ni protocole producteur supplémentaire n’est créé.

## Contrat et protections

V8 désigne la correction applicative. Le contrat d’entrée reste **journal360.unified schemaVersion 7**, `.strict()`, `paris-v7-8`, huit créneaux Paris, HTML autonome et `unifiedData` unique inerte. [Schéma structurel](JOURNAL360_UNIFIED_V7.schema.json), contrôles sémantiques Zod `src/data/unified.ts` inchangés. Aucun attribut arbitraire nouveau n’est attendu du producteur. JSON V7 brut n’est pas un import Future : le parcours principal reste HTML, le JSON Future suit son contrat strict v1 distinct.

Les budgets 10 Mo/HTML, 20 fichiers/100 Mo par lot, 2 Mo de métadonnées et les bornes des modules restent inchangés. Sérialiser `<` en `\u003c`, ne jamais concaténer `</script>` brut. Le V7 démarre sans scripts, iframe et CSP inchangées. Les scripts historiques ne sont pas exécutés pour indexer. Google conserve sa confirmation, ses contrôles et une question publique séparée ; aucun prompt privé n’est enrichi dans la question. Pas d’IA sémantique simulée.

## Sauvegardes et retour arrière

Journal : export ZIP v1/v2/v3 selon les données. Future : ZIP séparé v1. Exporter les deux pour couvrir les deux bases ; aucune fusion de sauvegardes n’est prétendue atomique. Les anciens clients peuvent refuser ZIP v3 : conserver le lecteur compatible et coordonner les versions avant un futur déploiement. V8 ne change ni version IndexedDB (journal 4/Future 1), ni format ZIP, ni SQL, ni configuration cloud/RLS.

Rollback source : conserver cette branche et son diff, ouvrir la copie de référence `/tmp/journal360-v8-reference-d3731ac` ou extraire `/tmp/journal360-v8-reference-d3731ac.tar` dans un nouveau dossier. Les 549 fichiers suivis ont été vérifiés par identités Git ; empreinte de l’archive dans `evidence/v8/environment.json`. Ne pas utiliser reset --hard/clean ni écraser les modifications utilisateur.

Rollback données : sauvegardes synthétiques restaurées et contrôlées en profil jetable ; ne jamais supprimer IndexedDB, originaux, notes, archives ou snapshots. Les données personnelles n’ont pas été ouvertes, exportées ni sauvegardées pendant cette mission ; un retour arrière complet sur profil réel reste NON TESTÉ et nécessite une autorisation distincte. Le vieux code V7 sait lire les mêmes octets, mais réaffiche son ancien diagnostic de cumul.

Le [plan de registre producteur](evidence/v8/architecture-decision.md) est désactivé et purement documentaire. Aucun backend ni automatisme ChatGPT, compte, clé ou tâche n’est connecté par ce travail.
