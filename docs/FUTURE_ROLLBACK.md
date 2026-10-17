# Retour arrière — sans suppression de données

Le changement est préparé sur `codex/le-futur-local`. L’utilisateur a ensuite autorisé le commit et le push vers `main`. Un push peut déclencher le CI/CD déjà configuré ; aucune commande de déploiement manuel ou modification cloud n’est ajoutée. Base connue : `7df89109842b1dfdc2e987f67d0077be86368f84`, archive source `/tmp/journal360-ai-radar-baseline-7df8910.tar`, SHA-256 `a4f0d93e8924a41004d0c5b21e997abfd9bfaa13bafc8e7df3d557d8542498b4`.

1. Dans la version avec Le Futur, exporter **Sauvegarder Le Futur** et conserver ce ZIP privé. Exporter aussi la sauvegarde habituelle du journal : ces deux espaces sont séparés. Vérifier un exemplaire sur un navigateur/profil de test si nécessaire. Ne pas déplacer des données privées dans Git ni `public/`.
2. Pour inspecter l’ancien code sans modifier ce worktree, créer une copie Git distincte :

   ```sh
   git worktree add ../journal360-before-future 7df89109842b1dfdc2e987f67d0077be86368f84
   ```

   Depuis cette copie, installer les dépendances et reconstruire avec les commandes habituelles. Aucun `reset --hard`, nettoyage de données ou changement de branche d’un autre worktree n’est nécessaire.
3. Un retour de code sur le même serveur/origine nécessite une opération de livraison distincte et autorisée. L’ancien code retrouvera sa base `journal360-private` inchangée. Il n’affichera pas `journal360-future-private`, mais cette base reste présente. Ne jamais demander à l’utilisateur d’effacer les données du site pour revenir en arrière.
4. Pour revenir à Le Futur, reprendre la branche et son build, puis utiliser le mécanisme de mise à jour PWA existant. La base séparée redevient visible. Si nécessaire, restaurer son ZIP par fusion vérifiée. Un conflit de même sujet/révision demande une résolution éditoriale avec une nouvelle révision, pas un écrasement forcé.

Les stores nouveaux n’altèrent pas le schéma de la bibliothèque historique. Le mécanisme de service worker reste celui de la PWA ; aucune suppression manuelle d’IndexedDB. Un autre port, protocole, domaine ou profil navigateur crée une autre origine : l’absence de données dans ce contexte n’indique pas leur suppression dans l’origine précédente.

Les restaurations ont été testées sur des données synthétiques dans deux bases séparées, y compris collisions, notes divergentes, doublons et annulation transactionnelle. Les données utilisateur de production n’ont pas été restaurées ni manipulées pendant cette mission.

## Commits fonctionnels

- `77ede02` : correction du bouton d’import quotidien (défaut préexistant).
- `ae88109` : contrat, validation, stockage, versions, sauvegarde et budgets Le Futur.
- `ecb8309` : vue native, navigation, imports et tests E2E.
- `fcf86a0` : fichiers d’exemple exclus de la réécriture SPA Vercel.

Pour un retour du code partagé, préparer **sur une branche de retour** un revert des commits de fonctionnalité (UI puis stockage), examiner le diff et exécuter les vérifications avant tout push autorisé. La correction quotidienne peut être conservée indépendamment. Cette procédure n’exécute aucune suppression IndexedDB ; sauvegarder les deux espaces avant toute opération utilisateur.
