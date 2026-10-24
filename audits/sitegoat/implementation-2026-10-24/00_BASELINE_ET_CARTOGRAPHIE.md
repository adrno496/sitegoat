# Baseline et cartographie — 24 octobre 2026

Dépôt audité : `/Users/dreano/Downloads/veille/veille`, HEAD `987b5637707ef0af05bb1900fa8e187a96848246`. Remote SSH `adrno496/sitegoat`. Audit non suivi conservé à son emplacement initial. Métadonnées worktree historiques déclarent encore `journal360-claude-fix` ; aucune réparation ni suppression effectuée.

Travail isolé : `/Users/dreano/Downloads/veille/sitegoat-implementation`, branche `codex/sitegoat-audit-v4-local`. Node 24.21.0 / npm 11.19.0. Dépendances initiales partagées en lecture seule ; installation propre prévue avant maintenance du lockfile.

Les trois rapports, le projet de prompt futur, constats et preuves textuelles/reproductions ont été lus. Ces documents sont des éléments de référence ; le mandat et ses interdictions viennent de la demande utilisateur. Originaux et prompts importés restent des données non fiables.

Stockages : `journal360-private` v4 (editions/originals/states/notes/preferences/jobs/pending), `future-private` v1 autonome, localStorage affichage V9/recherches et préférences historiques, CacheStorage shell PWA. Cloud optionnel limité à 50 Mio côté bucket déclaré, non vérifié à distance. Aucun profil réel ni secret lu. Tests avec bases synthétiques et profils Playwright jetables.

Contrats : HTML 10 Mio, sélection 20 fichiers/100 Mio ; JSON unifié 2 Mio, 2000 articles ; brèves 512 Kio ; ZIP historique 4000 éditions, manifest 64 Mio, décompression 150 Mio, 100000 états/10000 notes ; cloud 50 Mio. Archivage et corbeille ne purgent rien.

Échecs historiques : 9 scénarios × 3 projets = 27 : 7 scénarios filtres absents (21), un comptage mobile obsolète (3), un mode lecteur implicitement sûr (3). Les preuves initiales restent dans `../veille/audits/sitegoat/` depuis la racine du worktree. Les nouveaux logs sont dans `preuves/`. La baseline actuelle est exécutée intégralement avant modification du build servi.

Risques : permissions iframe ; incohérence index/original ; plafond sauvegarde ; écriture concurrente ; coût mémoire segmentation ; client ancien écrivant localStorage sans verrou. Pas de migration automatique ajoutée aux bases réelles. Aucune affirmation de sécurité distante.
