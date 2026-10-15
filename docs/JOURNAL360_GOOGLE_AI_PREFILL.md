# Google Mode IA avec la question —2.0.2,15 octobre2026

Le profil V6.1 de2.0.1 ouvrait seulement l’entrée `/ai` après confirmation : la question devait être collée. Le correctif2.0.2 ajoute **Lancer la question** au dialogue parent, y compris aux questions préparées depuis le mode sûr. Le parent construit `https://www.google.com/search?hl=fr&udm=50&q=...` depuis le texte affiché ou modifié, sans ajouter notes, résumé, original, session ou autre donnée de la PWA. Les recherches v1 existantes gardent leur bouton **Ouvrir**. Copier et ouvrir l’entrée sans question restent deux actions de repli indépendantes.

## Validation et sécurité

- URL générée revalidée par la validation fermée existante : HTTPS, `www.google.com` exact, `/search` exact, seuls hl/udm/q ; pas d’identifiants, port, redirection, fragment ou autre destination.
- Question≤2000 caractères et URL≤4096 caractères ; contrôles et bidi refusés. Le texte décodé doit être identique : pas de troncature ni de remplacement implicite Unicode. Une question trop grande une fois encodée garde la copie et l’entrée manuelle, avec explication visible.
- Aucun `window.open` depuis `message`. Confirmation et geste utilisateur direct requis ; `noopener,noreferrer`. Le clic sur le lien de repli vérifie encore la demande courante et le réseau. Le lien contient la dernière question modifiée, pas une version ancienne.
- Vérification de l’expéditeur (`event.source` égal au WindowProxy du cadre courant), origine opaque, version et payload inchangée. La capacité v2 annonce en plus `open-question`. v1 reste strictement identique.
- Sandbox `allow-scripts` seul en interactif et vide en sûr ; aucune nouvelle permission. CSP parent et cadre inchangées. Les octets du journal, son JSON, ses UUID, favoris et notes ne sont pas modifiés. Aucun changement Supabase ni migration SQL.

## Résultats mesurés

| Contrôle | Statut et preuve |
|---|---|
| lint/build/typecheck | PASS ; [sortie du contrôle complet](evidence/v61/prefill-check.log) |
| unités | PASS148/148, dont construction de liens et refus des textes impropres au préremplissage |
| E2E Chromium ordinateur, Chromium mobile simulé, WebKit ordinateur | PASS59/59,4,3min ; [sortie complète](evidence/v61/prefill-check.log) ; source étrangère/ancien cadre rejetés, URL hostiles refusées, confirmation obligatoire, onze questions dont édition/accents/emoji, geste actif, sans opener/référent, offline/repli |
| contrôle du bundle/CSP et44 lancements sur4 profils synthétiques avant publication | PASS ; [preuve locale](evidence/v61/prefill-release-local.json) |
| fichier fourni, quatre profils Chromium/WebKit ordinateur/mobile simulé | PASS44 ouvertures confirmées, chaque q décodé égal à la question attendue ;13 ancres,9 liens d’index,8 thèmes, filtres, mode sûr, rechargement, lecteur offline et original intact ; [preuve expurgée](evidence/v61/prefill-real.json) |
| confidentialité des essais sur le fichier fourni | PASS : réseau externe bloqué, pages Google et clipboard simulés,0 envoi réel de contenu du journal ; ni compte ni sauvegarde cloud utilisés |
| Google réel, contexte Chromium neuf fr-FR, question publique fictive | **PARTIAL** : Google reçoit le lien demandé et conserve la question dans son URL de continuation, mais affiche un CAPTCHA. Aucune réponse IA observée, aucun contournement tenté. [Preuve sans IP ni identifiants](evidence/v61/prefill-google-live.json) |
| Safari iOS manuel sur téléphone physique | **NON TESTÉ** ; WebKit simulé ne remplace pas cette vérification |

Les pages Google simulées permettent de vérifier le lien réellement ouvert par la PWA, le q exact, le geste humain, l’absence de référent et d’opener. Elles ne prouvent pas que Google produira une réponse IA. Le test Google réel utilise exclusivement « Pourquoi le ciel est-il bleu ? », jamais une question extraite du journal fourni. L’[aide officielle Google](https://support.google.com/websearch/answer/16011537?hl=fr) décrit l’accès au Mode IA, sans fournir de garantie de compatibilité permanente pour le préremplissage udm=50.

## Reproduire

`npm run check` exécute lint/build/unités/E2E avec réseau externe bloqué.

Le fichier fourni reste hors du dépôt. Après preview local avec `JOURNAL360_ALLOW_CLOUD_LOCAL=0` : `JOURNAL360_BASE_URL=http://127.0.0.1:PORT JOURNAL360_EVIDENCE_FILE=/tmp/result.json node scripts/test-v61-html.mjs /chemin/journal.html`. Aucune capture ou question privée dans les preuves.

Après publication autorisée : `JOURNAL360_BASE_URL=https://sitegoat.vercel.app JOURNAL360_EVIDENCE_FILE=/tmp/release.json node scripts/test-google-ai-release.mjs`. Ce contrôle compare le bundle à dist et la CSP à vercel.json, puis vérifie44 lancements et les13 ancres sur4 profils, dans des bibliothèques locales neuves avec HTML synthétique. Google est simulé ; aucun compte ou objet Supabase n’est créé/modifié. Ce script peut aussi viser localhost avant publication.

## Fichiers et retour arrière

Code : `src/features/googleAi.ts`, `GoogleAiDialog.tsx`, `Reader.tsx` ; versions : `src/config.ts`, `package.json`, `package-lock.json`. Tests : `tests/googleAi.unit.test.ts`, `tests/e2e/v61.spec.ts`, `tests/e2e/v6.spec.ts`, `scripts/test-v61-html.mjs`, `scripts/test-google-ai-release.mjs`. Documentation : ce rapport, `README.md`, `SECURITY.md`, complément daté de `docs/JOURNAL360_V6_SECURITY_REVIEW.md` et preuves expurgées `docs/evidence/v61/prefill-*`.

Retour arrière : redéployer le commit2.0.1 `1e7b4442875f08bb48c68f932ca3bdf2260f5f0f` dans Vercel ou annuler le commit2.0.2 par un nouveau commit de revert. Aucun reset de production, effacement IndexedDB ou restauration SQL nécessaire. Le parcours redevient copie puis ouverture de l’entrée sans question pour v2 ; les améliorations V6.1 de navigation restent dans2.0.1. Mettre à jour la PWA sur chaque appareil pour obtenir la même version.
