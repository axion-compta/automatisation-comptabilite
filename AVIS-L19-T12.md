VERDICT: OK

PR n°1225, fiche L19-T12, relue au SHA de tête 3678a09cf6f0efc85dad082a7c19593c976582d6.

## Vérifié
- Les 5 fichiers modifiés sont tous dans `fichiers_autorises`. Taille : 162 ajouts et 1 suppression, sous le maximum de 180. Rien dans `.github/`, aucune garde touchée, aucune dépendance ajoutée.
- Les 5 tests nommés sont présents, avec un test de découverte en plus (`reglages-ecrans-decouverts`). Aucun test supprimé. 7 tests sur 7 passent. Les tests existants de `packages/ui` passent (232 sur 232).
- La découverte des écrans est réelle (`ecransDecouverts()` filtré sur le groupe `reglages`). Une découverte vide fait échouer `reglages-ecrans-decouverts`.
- `EtatDoute` : rôle `status`, message et raison en texte, bouton seulement si un libellé et `surAction` sont fournis.
- Mutations, toutes tuées :
  - `role` retiré ;
  - raison retirée ;
  - découverte vidée ;
  - erreur ou chargement de t05 remplacé par `null` ;
  - bouton affiché sans `surAction` ;
  - `EtatVide` de e45 remplacé.
- Aucun mot interdit, aucun prix, aucun secret, données fictives. Le journal fait 8 lignes avec le bon en-tête.

## Remarques (non bloquantes)
- e53 et t05 n'ont pas d'état vide (`EtatVide` n'y est pas utilisé). Conformément aux « Pièges » de la fiche, l'auteur ne les a pas corrigés et l'a signalé dans le journal et dans la PR. Il faudra ouvrir une fiche de suivi pour leur état vide.
- Les tests `vide`, `chargement` et `erreur` ne sont protégés contre une liste vide que par `reglages-ecrans-decouverts`. C'est acceptable, puisque ce test est dans le même fichier.
- `pnpm verifier` en local : `types` ne tourne pas sous Node 22 ; `tsc --noEmit` donne 0 erreur sur `@axion/web` et `@axion/ui`. Une mesure de temps instable dans `filtre-sortie.test.ts` (hors PR) passe quand on la relance seule.
