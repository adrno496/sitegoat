# Lecteur épuré — 2.0.5

À l’ouverture d’un HTML, le document occupe toute la hauteur. Deux boutons flottent dans les coins : retour à la bibliothèque et **Réduire la lecture**. Le titre de la PWA, le zoom, le réglage JS, l’historique et la synchronisation ne recouvrent plus le document. Réduire donne accès aux outils existants, aux notes et au bandeau de synchronisation de l’application. L’échelle reste à 70 % et le mode interactif reste le défaut ; le choix sécurisé mémorisé est respecté.

Le glissement horizontal depuis les huit premiers pixels du bord gauche revient à la bibliothèque. Les déplacements verticaux, courts, vers la gauche ou trop longs sont ignorés. Le cadre HTML conserve ses interactions et son défilement. Ce geste fonctionne également sans scripts dans le cadre. Il est inactif pendant une confirmation. Le système du téléphone peut réserver son propre geste de bord ; le petit bouton reste disponible.

Une ouverture ajoute une entrée de navigation locale contenant uniquement un identifiant d’édition et une session éphémère. Le retour navigateur peut fermer la lecture et Suivant la rouvrir. Le bouton et le geste ferment la visite en place, sans deviner un nombre d’entrées à traverser : les ancres d’un iframe participent à l’historique conjoint et ne signalent pas toujours leur parcours au parent. Les anciennes entrées d’une visite explicitement fermée ne rouvrent pas le document. Il peut rester des entrées identiques de bibliothèque dans l’historique navigateur. Aucun contenu du HTML n’est stocké dans l’URL ou cet état de navigation.

## Vérification

Les tests `tests/e2e/v6-clean-reader.spec.ts` vérifient les deux contrôles visibles, la pleine hauteur, les outils après réduction, les interactions, les notes, le hors-ligne, Retour/Suivant, les ancres internes et les gestes. Chromium utilise aussi de vrais événements tactiles CDP : défilement vertical du document puis geste horizontal de retour. WebKit exécute les contrôles pointeur et navigation ; son cas CDP est explicitement ignoré. Les suites existantes suivent désormais le parcours utilisateur « réduire → outil → agrandir ».

Les premiers essais ont révélé un bord tactile trop large et un conflit d’historique lors des changements de cadre. Le bord est limité à huit pixels et la fermeture explicite ne traverse plus l’historique opaque du cadre. Aucun test de sécurité n’a été retiré. Résultats finaux dans [verification.json](evidence/clean-reader/verification.json).

Safari iOS physique, Android physique et PWA installée sur téléphone : **NON TESTÉS**. Les ouvertures Google sont vérifiées par les tests existants avec destination simulée ; cette étape ne garantit pas de réponse Google réelle. La correction spécifique Google fait l’objet d’une mission séparée, sans publication automatique.

## Périmètre et retour arrière

Code : `src/features/Reader.tsx`, `src/features/readerHistory.ts`, `src/App.tsx`, `src/styles.css`. Tests : nouveau scénario et auxiliaires, adaptation des suites app/Google/V6/V6.1 et du contrôle de publication. Version : `package.json`, `package-lock.json`, `src/config.ts`. Documentation : ce rapport, README, preuves synthétiques.

Sandbox inchangé (`allow-scripts` uniquement en interactif), CSP parent/enfant inchangées. Import, originaux, schéma IndexedDB/ZIP, API et Supabase inchangés. Aucune migration ni opération Supabase requise. Le lecteur hors ligne utilise le service worker existant.

Retour arrière : après identification du commit de cette version, `git revert <commit-2.0.5>` puis vérifier et republier selon l’autorisation en vigueur. Pour restaurer immédiatement l’hébergement 2.0.4, l’ancien déploiement est `https://sitegoat-qu0d29e0o-savetheworldfr-8237s-projects.vercel.app` (promotion Vercel soumise à autorisation). Ne supprimer ni les données locales ni les archives cloud.
