VERDICT: OK

PR #1128 (L10-T39), SHA de tête relu : cad76bfb6a7a223e2041fb2514055782d63bd566

Seconde relecture, après l'avis A CORRIGER sur 98e7def4d90e6bd40e0d97d93f452293ee9b6392.

## Défaut précédent : levé

- `packages/contrat/src/domaines/ventes-actions-service.ts:57` : `corriger` refuse désormais par `VENTE_VALIDEE` une vente dont l'écriture est `valide` (ou la pièce `validee`). Le contrôle a lieu avant toute mutation, après le contrôle de version.
- `packages/contrat/src/domaines/ventes-actions.ts:36` : `VENTE_VALIDEE` est déclaré en 409 dans les erreurs de `corrigerVente`. `VERSION_PERIMEE` n'est pas réutilisé.
- Les tests demandés sont présents. Contrat : la correction après `valider` est refusée, celle de `VP-1-003` aussi, et `lireVersion` reste à 2 et 1. Serveur : réponse 409 avec le code `VENTE_VALIDEE`.
- OpenAPI : `node packages/contrat/scripts/openapi.mjs` régénère sans écart. Le fragment documente les erreurs par code HTTP et le 409 existait déjà, donc il ne change pas.

## Vérifié (OK)

- Fichiers : les 11 sont dans `fichiers_autorises`. Taille : 320 lignes hors fragment openapi, ce qui atteint le plafond de 320 sans le dépasser. Pour tenir, l'auteur a compacté le code : boucle sur les trois champs et `forEach` sur les trois cas `ENTREE_INVALIDE`. Aucune assertion n'est retirée.
- Vitest ciblé : 17/17 (`ventes-actions` contrat et serveur, `ventes-indicateurs`).
- Mutations :
  - Contrôle `VENTE_VALIDEE` retiré : 2 tests rouges.
  - Code 409 remplacé par 400 dans le contrat : 1 test rouge (serveur).
- CI verte sur cad76bfb (gardes, tests, types, lint, verifier, e2e, gitleaks, licences, stryker).
- Aucun mot interdit, aucun prix, données fictives. Journal : 5 lignes, il commence par `# Journal L10-T39`.

## Remarques (non bloquantes)

- `ventes-actions-service.ts:57` : chacune des deux conditions (`statutEcriture === 'valide'` et `statut === 'validee'`) suffit seule à faire passer les tests. Avec le jeu fictif, les deux statuts bougent toujours ensemble. Cette double garde est prudente. Un cas où un seul des deux statuts est à « validé » la rendrait testable.
- Les remarques de l'avis précédent restent valables : repli `'60000'` du délai côté serveur, paramètre `s` ignoré, clés d'idempotence globales à l'instance.
- PR sensible : fusion par Will seul.
