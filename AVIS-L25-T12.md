VERDICT: OK

PR #1216 (L25-T12). Tête relue : c55174b59e90a5821e70e5775d62cff718d75d24
Relecteur Opus, consigne LOT5 section R. Première relecture.

## Vérifié
- Fichiers : les 9 fichiers du diff sont dans `fichiers_autorises`. 200 lignes ajoutées et 21 supprimées (maximum 280). Aucune ligne « - - », aucun octet NUL.
- Les 6 tests nommés sont présents. Les tests existants de `carte-action.test.tsx` sont gardés, avec les libellés mis à jour ; aucun n'est retiré.
- 51 tests passent en local (carte-action, apps/web/src/chat, e25). La CI de la tête est verte (gardes, tests, types, lint, e2e, stryker, gitleaks, licences, verifier).
- La fiche est respectée :
  - sept états ;
  - ordre Valider, Modifier, Refuser ;
  - un seul bouton plein ;
  - `contexte` n'agit que sur la classe CSS ;
  - mention « Préparé par IA, à valider » inchangée ;
  - Refuser → `plus_tard`, la carte reste affichée et peut être rouverte, sans POST ni DELETE ;
  - Entrée n'applique jamais une action M ou I.
- 15 mutations essayées, toutes tuées. Elles portent sur :
  - le contexte par défaut, la classe propre au contexte et le `contexte="chat"` de Message ;
  - l'état `erreur` dans `effectif` et `actif` ;
  - le masquage de Modifier en modification ;
  - la remise à zéro de la confirmation par Refuser et par Modifier ;
  - le libellé Plus tard et le bouton Rouvrir ;
  - Entrée sur B seulement ;
  - les trois transitions de `Discussion`.
- Aucun secret, aucun prix, aucun mot interdit. Données fictives. Journal de 7 lignes.

## Remarques
- L'état `modification` n'ouvre aucun formulaire d'édition : il retire seulement le bouton Modifier. La fiche ne demande pas plus, mais il faudra une fiche pour l'édition elle-même.
- La clé `e25.carte.appliquer` est gardée avec le texte « Valider » pour `discussion.test.tsx`. Elle sera à retirer quand ce test passera à `valider`.
