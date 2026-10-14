# Revue de sécurité locale V6

14 octobre 2026. Statut global **PARTIAL** : contrôles locaux exécutés, aucune certification de production ni accès au cloud réel. Architecture conservée : Vercel sert le shell ; IndexedDB garde les originaux privés ; Supabase garde des ZIP privés si l’utilisateur active la synchronisation.

## Frontières de confiance

L’import est non fiable : parsing DOM détaché sans exécution, JSON validé, React échappe les textes, HTML seulement dans `iframe.srcdoc`. Original distinct et intact. Le mode interactif reste le défaut demandé ; mode sûr sans scripts et mode texte restent disponibles. Sandbox **exactement** `allow-scripts` en interactif, vide en sûr. Aucun allow-same-origin, popup, top-navigation ou forms ajouté. `vercel.json`, CSP du shell et directives CSP du cadre inchangés. Ressources distantes/connect/object/frame/form bloqués ; images data/blob conservées.

**Risque préexistant ouvert** : un script importé peut tenter de naviguer son propre cadre. CSP/sandbox ne constituent pas une garantie générale d’interdiction de sa propre navigation ; les messages d’une origine non opaque sont refusés ensuite, mais cela n’annule pas une éventuelle requête externe du cadre. Aucune garantie « HTML hostile sans aucun réseau possible » n’est donnée en interactif. Le mode sûr est recommandé pour les fichiers non fiables. Une suppression/réécriture générale des scripts ou une permission sandbox supplémentaire aurait cassé des interactions ; pas de telle modification ici. Le scénario legacy `location.replace` et cette limite sont documentés dans SECURITY.md ; pas de nouvelle mitigation prétendument universelle.

Les sources sont ouvertes dans l’UI parent sur lien explicite HTTP(S), rel noopener noreferrer, après validation (y compris données anciennes). Ce contrôle d’URL n’est pas une analyse de réputation, ni une protection contre DNS rebinding/redirection servie par une source publique. Le parent ne précharge pas ces liens. Original téléchargé puis ouvert hors PWA : les restrictions du lecteur ne s’y appliquent plus.

## Pont Google

Avant tout parsing : `event.source === iframeRef.current?.contentWindow`, origine opaque `null`, mode interactif courant. Une origine `null` seule n’authentifie rien. Fenêtres étrangères et anciens cadres ignorés. La requête en attente est liée à édition/mode/révision du cadre/WindowProxy et ne peut être remplacée par un deuxième message.

Protocole v1 conservé :

```json
{"type":"journal360:google-ai:capability-request","version":1}
{"type":"journal360:google-ai:capability","version":1,"enabled":true}
{"type":"journal360:google-ai:open-request","version":1,"url":"https://www.google.com/search?hl=fr&udm=50&q=Question"}
```

URL search littérale ≤4096 caractères, https, hôte www.google.com exact, chemin /search exact, pas userinfo/port/fragment/URL réécrite. Seuls hl=fr optionnel, udm=50 et q non vide ≤2000 sont permis ; duplications, redirects, contrôles, UTF-8/percent encoding invalides, bidi refusés. `/ai` accepté uniquement comme constante exacte sans paramètres. Pas d’URL arbitraire.

Protocole v2 parallèle :

```json
{"type":"journal360:google-ai:capability-request","version":2}
{"type":"journal360:google-ai:capability","version":2,"enabled":true,"actions":["copy-question","open-entry"],"entryUrl":"https://www.google.com/ai","maxQuestionLength":2000}
{"type":"journal360:google-ai:question-request","version":2,"question":"Question publique à vérifier"}
```

Clés exactes et version numérique exigées. Question simple non vide ≤2000, sans contrôles ni bidi. Réponse `postMessage(...,"*")` uniquement au WindowProxy explicitement vérifié : origine opaque non adressable par origine textuelle ; aucun secret envoyé. Aucun appel externe depuis `message`.

Dialogue parent accessible avec aperçu/modification/Annuler. v1 : bouton Ouvrir transmet uniquement q de la demande validée ; pas de notes ajoutées. v2 : copie et ouverture de l’entrée /ai sont indépendantes et exclusivement sur geste humain. L’entrée ne contient jamais la question dans son URL. Presse-papier indisponible → sélection manuelle ; offline → ouverture refusée ; popup indisponible → lien explicite ; noopener peut renvoyer null même si ouverture réussie, sans faux diagnostic. Double ouverture du bouton neutralisée après demande. Boutons marqués des HTML capturés par le pont ; le marquage « public » n’est pas une preuve : avertissement et correction possibles. En mode sûr/texte, liste de questions extraite statiquement côté parent ; pas d’exécution ni de nouveau privilège.

Aucune donnée PWA n’est assemblée à la question : notes, contacts, architecture, tokens et statistiques absents du pont. Un auteur HTML peut déjà avoir inclus du texte sensible dans sa propre question ; l’UI ne peut classifier sa confidentialité. L’utilisateur la vérifie avant copie/ouverture.

L’aide officielle donne l’entrée /ai, sans contrat de préremplissage udm=50 : [Google Mode IA](https://support.google.com/websearch/answer/16011537?hl=fr-FR). Support du lien historique conservé mais non garanti par Google.

## Stockage, archives et synchronisation

ZIP **non chiffrés**, contenant originaux et notes ; garder les exports privés. SHA-256 vérifie l’intégrité interne, pas l’authenticité d’un producteur (un attaquant peut réécrire manifeste et empreintes). Entrées/tailles/chemins/manifeste/UUID/références contrôlés, restauration transactionnelle, collisions déterministes et notes conflictuelles conservées. Plafonds : 4000 éditions, manifeste64 MiB, original10 MiB, total décompressé150 MiB, upload cloud50 MiB. Échec clair sans suppression automatique. Les diagnostics n’exportent que code whitelisté, UUID, date (200 entrées), jamais message/stack/chemin/note/URL/session ; préférences exclues des snapshots.

API existante : getUser authentifie le JWT ; chemin Storage préfixé par UID vérifié, URLs signées limitées, bucket privé et RLS inchangés. Pagination testée par mocks uniquement. Rate limit existant en mémoire : accès5/min/IP, backups60/min/UID, **non distribué**, remise à zéro possible avec nouvelle instance/éviction de map. Le code partagé peut avoir 1..64 caractères ; sa force effective n’est pas connue. HMAC dérivé avec secret serveur conservé. Aucune prétention de durcissement distribué ou d’audit du compte réel.

Avant production : choisir un code réellement robuste ; évaluer limite distribuée si abus observés ; procédure propriétaire de rotation : inventaire appareils, export vérifié, changer secret/code et mot de passe dérivé de façon coordonnée côté serveur/compte, révoquer sessions serveur, reconnecter appareils, tester refus ancien code et restauration. **Aucune de ces opérations effectuée.** Ne jamais changer uniquement le secret serveur en laissant le compte avec un ancien mot de passe dérivé.

Historique illimité : aucune purge. Inventaire paginé jusqu’à5000, erreur explicite au-delà. Ancien serveur renvoyant exactement100 sans pagination → erreur de compatibilité, jamais faux inventaire complet. Backfill limité10 ZIP/cycle, progression enregistrée après chaque fusion ; pas de succès final si reste du travail. Auth/rate-limit/quota peuvent ralentir la reprise, pas de garantie de temps réel.

Les exports chiffrés sont reportés : concevoir ultérieurement enveloppe versionnée, AES-GCM authentifié, KDF salée, paramètres bornés et récupération documentée ; ni clé intégrée ni chiffrement annoncé aujourd’hui.

## Secrets et production

`.env.local` présent dans le dépôt source mais ignoré, pas dans le worktree ni la copie de baseline ; contenu jamais affiché/copied/modifié. L’archive citée dans la mission pourrait contenir ce fichier ; son exposition n’est pas établie ici. Le propriétaire doit vérifier à qui elle a été partagée ; si exposition confirmée, rotation séparément autorisée. Aucun HTML privé ajouté aux assets publics, aucune ingestion automatique, aucun appel Supabase réel, aucun commit/push/déploiement/configuration distante.

Proxy de tests bloque le réseau externe ; les faux Google sont interceptés localement ; API preview désactivée par défaut. Dépendances production : audit final0 vulnérabilité, sans équivaloir à une preuve d’absence de vulnérabilité. Voir rapport des tests pour les scénarios effectivement exécutés.

Références consultées : [srcdoc](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc), [iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe), [éviction du stockage](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [Dexie upgrade](https://dexie.org/docs/Version/Version.upgrade/). Le stockage persistant demandé au navigateur n’empêche pas une suppression manuelle ; l’hébergement HTTPS ne sauvegarde pas IndexedDB.
