# Boutons Google des journaux V6.4 et doublons — version 2.0.7

**Publication autorisée par Axel le 15 octobre 2026** (commit et push sur `main`) ; elle inclut le candidat 2.0.6 `0de1c33`. Avant publication, la production était la 2.0.5 `7a000d5` : même bundle `index-Dcojrkxa.js` que le build local de `main`, CSP `frame-src 'self' blob:`. Aucun changement Supabase, SQL, RLS, schéma IndexedDB, format de sauvegarde, service worker, API, CSP, sandbox ou Permissions-Policy.

## Diagnostic sur la version publiée 2.0.5

| Symptôme Android                              | Cause vérifiée                                                                                                                                                                                                  | Preuve                                                                                                                                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| « Copie bloquée par le navigateur ou la PWA » | Le journal V6.4.1 appelle `navigator.clipboard.writeText` dans son cadre `srcdoc` isolé ; `clipboard-write` n’y est pas délégué (pas d’attribut `allow`). Refus même quand le navigateur accorde la permission. | Console Chromium « Permissions policy violation: The Clipboard API has been blocked » ; `allowsFeature('clipboard-write')` faux dans le cadre, vrai dans la PWA. WebKit copie depuis le cadre.         |
| Google Mode IA n’ouvre rien                   | Lien `href="https://www.google.com/ai"` non marqué (V6.4.1 `#openAI`, V6.4.3 `.google-ai-open`) : l’import retire `href` et `target`. V6.4.1 affiche ensuite « Ouverture demandée… NON CONFIRMÉE ».             | Ancre sans `href`, aucun onglet, cadre inchangé.                                                                                                                                                       |
| Page grise, icône de document triste          | V6.4.1 `#openGoogle` : son `href` est remis par le script du journal après l’import, sans `target` ; le cadre tente d’ouvrir Google en lui-même ; la CSP du parent `frame-src` le bloque.                       | Cadre `chrome-error://chromewebdata/`, PWA à la même adresse, console « Framing 'https://www.google.com/' violates … frame-src ». Retour arrière : journal restauré. WebKit refuse sans page d’erreur. |

Le candidat 2.0.6 corrigeait les deux liens du V6.4.1, mais pas la copie du dialogue du journal, et ouvrait pour les liens du V6.4.3 un dialogue vide où **Ouvrir Google Mode IA** restait désactivé.

## Options comparées

| Option                                                                                              | Valeur                                                         | Risque                                                                                   | Décision             |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------- |
| A — ne rien changer, sélection manuelle                                                             | Aucune régression                                              | Les boutons restent inopérants ; archives non corrigées                                  | Repli seulement      |
| B — déléguer `clipboard-write` au cadre                                                             | Copie dans le journal                                          | Le HTML importé pourrait écrire le presse-papiers sur un clic ; ne règle pas l’ouverture | Écartée              |
| C — contrôles propres à la PWA                                                                      | Copie et ouverture hors du cadre                               | Faible : aucune permission ajoutée                                                       | Retenue, via D       |
| D — pont existant (session à usage unique, origine et source exactes, liste fermée de destinations) | Clic dans le journal → confirmation PWA → ouverture par la PWA | Déjà revu en 2.0.6                                                                       | Retenue et complétée |

## Modifications

- `src/features/googleAi.ts` : producteurs `6.1` et `6.4` seulement. Les boutons « En savoir plus » à dialogue producteur ouvrent la confirmation PWA (comme en 6.1). Le lien `/ai` voisin d’un bouton reçoit sa question explicite (`aiQuestion` ou `#public-<thème>`). Dans le cadre, la question affichée (`textarea#question`, `#deepQuestion`) est relue au clic, retours à la ligne normalisés ; vide ou invalide → demande sans texte au lieu d’un refus silencieux.
- `src/features/GoogleAiDialog.tsx` : **Ouvrir Google Mode IA** reste disponible quand la question est vide (aucun texte transmis), toujours bloqué par les marqueurs sensibles ; une copie refusée sélectionne la question.
- `src/features/import.ts`, `src/features/ImportDialog.tsx` : un doublon exact (SHA-256) n’est plus ignoré par défaut. Le dernier import remplace l’ancien sur place : même fiche, donc mêmes notes et favoris ; date d’import mise à jour (il redevient la version affichée de son créneau) ; sortie de l’archive et de la corbeille ; original rétabli s’il manquait ; nom de fichier conservé (il porte l’heure d’édition). « Ignorer le doublon » reste proposé.
- Version 2.0.7 ; tests `tests/v643.unit.test.ts`, `tests/e2e/v64-google-buttons.spec.ts`, fixture `tests/helpers/v643.ts` (contenu fictif).

## Validation

| Contrôle                                                        | Résultat                                                                                                                                                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prettier, ESLint, `tsc -b`, build                               | PASS                                                                                                                                                                                                            |
| Unités                                                          | PASS 208/208 (194 existantes + 14)                                                                                                                                                                              |
| E2E Chromium, WebKit, Pixel 7 simulé                            | PASS 115, 1 test tactile CDP ignoré sur WebKit, 0 échec                                                                                                                                                         |
| Vrai V6.4.3, build local, Google simulé, réseau bloqué          | 2.0.5 : aucun bouton Google ne réagit. 2.0.7 : confirmation PWA avec la question exacte (article, dossier, approfondissement) ; `/ai` sans paramètre ; `/search` avec `hl` et `q` identique ; aucune page grise |
| Vrai V6.4.1, mêmes conditions                                   | 2.0.5 : « Copie bloquée » (Chromium, Pixel 7 simulé). 2.0.7 : confirmation PWA directe, « Question copiée », presse-papiers identique à la question                                                             |
| PWA Android installée, iPhone, Google réel (connexion, CAPTCHA) | NON TESTÉ                                                                                                                                                                                                       |

Aucun contenu des journaux réels n’est conservé dans les preuves : seulement des booléens et des comptes.

## Retour arrière

Revenir à la 2.0.5 : remettre en production le déploiement Vercel précédent (`dpl_Dje5HSMVWmGNoBPBZZMwGuaAL9K9`), ou annuler les commits 2.0.6 et 2.0.7 sur `main` ; localement, `git switch --detach 7a000d52d6f2dc08973a5f0d775d55c202d4679e` puis `npm run build`. Les doublons déjà remplacés gardent leur nouvelle date et leur sortie d’archive ou de corbeille ; l’utilisateur peut les réarchiver. Aucune donnée n’est supprimée.
