# Revue locale — Google Mode IA dans Journal 360

Date : 14 octobre 2026, Europe/Paris. Validation effectuée localement, sans déploiement, accès de test au compte propriétaire ni changement de production. Le commit/push, puis la publication Vercel ont été autorisés séparément après cette revue.

## Inventaire effectué avant modification

- `src/features/Reader.tsx` existe : iframe srcdoc recréée par édition/mode/révision, zoom 70 %, mode sécurisé sans scripts, mode interactif après confirmation et préférence de confiance locale. Aucun ref d’iframe ni listener de messages d’édition existant.
- `src/features/import.ts` existe : DOMParser détaché, JSON editionData validé, originaux intacts ; copie de lecture supprimant les href externes, targets, ressources, bases et redirections. Adaptateur de fragments pushState/replaceState déjà présent en mode interactif.
- CSP parent dans `vercel.json` ; CSP enfant injectée par `isolatedHTML`. Sandbox strict. Les deux politiques sont conservées.
- Confirmation de confiance dans Reader, confirmation d’import dans ImportDialog, confirmation de restauration dans App ; focus et Échap fournis par `useDialogFocus`. Pleine page et arrière-plan inert déjà gérés dans Reader. Le seul autre listener message est celui du service worker pour SKIP_WAITING ; il est indépendant.
- Tests Vitest, Chromium et WebKit existants pour intégrité, import/export, lecture, favoris, notes, historique/interaction, zoom, offline, isolation, responsive et mise à jour PWA.
- Aucun fichier V5.3 original n’est présent dans ce dépôt. Une fixture synthétique reproduit le marqueur, le handshake version 1 et un fallback window.open pour exercer le contrat fourni.

## Résultat et limites

Le clic **En savoir plus** d’un lien Google marqué dans une édition interactive affiche une confirmation PWA avec la question et l’avertissement de transmission à Google. Seul **Ouvrir** déclenche l’ouverture externe ; **Annuler** et Échap ne naviguent pas. La question ne change pas pendant la confirmation. Une demande provenant d’une autre fenêtre, d’un ancien cadre, d’un type/version/payload inconnu ou d’une URL invalide est ignorée.

URL HTTPS littérale, hôte `www.google.com`, chemin `/search`, udm=50, q non vide de 2000 caractères maximum, URL de 4096 caractères maximum ; hl absent ou fr. Paramètres uniques parmi hl/udm/q exclusivement. Userinfo, ports explicites, schémas relatifs ou autres protocoles, domaines ressemblants, normalisations de chemin/hôte, fragments, encodages invalides, contrôles et redirections sont refusés. Le texte n’est ni exécuté ni enrichi de données PWA.

Le sanitizer conserve la destination validée dans la copie interactive avec un href local ; un script de capture placé avant les scripts importés neutralise leur fallback. Le mode sécurisé reste sans script ni lien externe actif. Le fichier importé, son JSON et les archives/export ne sont pas modifiés. Aucun allow-popups, allow-popups-to-escape-sandbox, allow-top-navigation ou allow-same-origin n’est ajouté.

Le retour de capacité utilise `"*"` uniquement vers le WindowProxy vérifié : l’origine opaque ne fournit pas d’origine adressable ; le message est une capacité publique et ne contient aucun secret. [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage), [sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe), [ouverture avec geste utilisateur](https://developer.mozilla.org/en-US/docs/Web/API/Window/open).

Le pont nécessite le mode interactif. Il ne remplace pas la confirmation de confiance du fichier et ne garantit pas qu’une question du fichier est publique. La limite préexistante de navigation du cadre par son propre script reste documentée dans SECURITY.md. Les réglages du navigateur peuvent bloquer une nouvelle fenêtre. Le résultat de recherche Google réel, la PWA installée sur téléphone et la V5.3 originale demandent une validation manuelle distincte.

## Contrôles

- **PASS** — `npm run lint`, `npm run build`, `npm test` : 73 tests unitaires, dont 48 nouveaux cas de validation/protocole/intégrité Google IA.
- **PASS** — `npm run test:e2e` : 30 parcours (13 Chromium desktop, 13 WebKit desktop et 4 Chromium mobile). Les 12 parcours Google IA couvrent fenêtre étrangère opaque et parent, ancien cadre, rechargement pendant une confirmation, URL/types/versions/payloads hostiles, handshake exact, liens statiques/dynamiques, absence d’ouverture sans confirmation, question figée, annulation et Échap, focus, accessibilité axe, popup avec activation utilisateur, absence d’opener/referrer, notes privées absentes du transfert, zoom/historique, offline et original intact.
- **PASS** — Régression existante : HTML/JSON, favoris, notes, recherche, import/export ZIP, lecture sûre/interactions, isolation, six largeurs, service worker et mise à jour sans perte.
- **PASS** — Sandbox inchangé ; chaîne CSP du cadre comparée intégralement dans les tests en modes sûr/interactif ; CSP du parent vérifiée par en-tête HTTP. `vercel.json`, `src/sw.ts` et `src/features/dialogFocus.ts` inchangés.
- **PASS** — `git diff --check`, contrôle des secrets et retour arrière en copie temporaire.
- **PARTIAL** — La compatibilité mobile repose sur Chromium avec émulation Pixel 7 et WebKit desktop ; ce n’est pas une validation de PWA installée sur un téléphone physique.
- **NON TESTÉ** — Safari iOS physique, PWA installée, fichier V5.3 original et résultat Google Mode IA en ligne. La vraie ouverture navigateur est testée, mais sa navigation Google est interceptée pour ne pas envoyer les données de test à Google.
- **FAIL** — Aucun échec restant dans les contrôles exécutés.

[Preuve structurée](evidence/google-ai.json) · [capture mobile](screenshots/google-ai-confirm-chromium-mobile.png) · [capture Chromium](screenshots/google-ai-confirm-chromium.png) · [capture WebKit](screenshots/google-ai-confirm-webkit.png). Les captures sont des navigateurs automatisés avec des données synthétiques ; elles ont été inspectées visuellement. Les résultats bruts restent dans `test-results/e2e-results.json` (ignoré par Git).

## Fichiers de cette modification

- `src/features/Reader.tsx` : ref, listener vérifié, confirmation et ouverture sur bouton, fermeture/invalidation, focus et protection du lecteur derrière le dialogue.
- `src/features/googleAi.ts` : validation stricte, parser du protocole et adaptateur de capture des liens marqués.
- `src/features/import.ts` : adaptation limitée des liens validés dans la copie interactive.
- `src/styles.css` : aperçu de question avec retour à la ligne et hauteur bornée.
- `playwright.config.ts` : projet Chromium mobile limité aux nouveaux tests Google IA.
- `tests/googleAi.unit.test.ts`, `tests/e2e/google-ai.spec.ts`, `tests/fixtures/google-ai.html` : validation, sécurité et parcours navigateurs.
- `SECURITY.md` : contrat et limites du pont.
- `docs/GOOGLE_AI_REVIEW.md`, `docs/evidence/google-ai.json`, `docs/evidence/google-ai-change.patch`, captures `docs/screenshots/google-ai-confirm-*.png` : revue et preuves.

Les modifications Supabase préexistantes restent séparées ; elles ne sont pas incluses dans le patch de ce travail. Le push initial a été protégé contre une publication non autorisée. Après autorisation explicite du déploiement Vercel, la protection temporaire a été retirée : le fonctionnement Git/Vercel initial est rétabli, avec publication automatique des pushes sur main. Les CSP et en-têtes restent inchangés. La validation locale et ses limites ci-dessus restent les preuves antérieures à la publication.

## Retour arrière

Le patch `docs/evidence/google-ai-change.patch` est construit depuis la copie des fichiers prise avant ce travail, incluant les modifications Supabase déjà présentes. Depuis la racine du projet :

```sh
git apply --check --reverse docs/evidence/google-ai-change.patch
git apply --reverse docs/evidence/google-ai-change.patch
npm run build
```

Ce retour restaure Reader/import/styles/configuration/Sécurité au point de départ de ce travail et supprime uniquement les nouveaux fichiers source/tests Google IA. Il ne touche pas IndexedDB, Supabase ni la production. Si de nouvelles modifications ont été faites ensuite dans ces fichiers, le contrôle du patch peut refuser son application : résoudre ce conflit avant d’appliquer quoi que ce soit. Les preuves et ce compte rendu peuvent être conservés. Ne pas utiliser un reset global du dépôt, car les changements Supabase antérieurs sont déjà présents.
