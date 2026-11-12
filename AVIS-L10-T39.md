VERDICT: A CORRIGER

PR #1128 (L10-T39), SHA de tête relu : 98e7def4d90e6bd40e0d97d93f452293ee9b6392

L'avis OK précédent de cette branche portait sur la PR #1107 (amendement de la fiche, SHA 3042c1cb26a94b770b7c3978d2d9dce88cebf8b8). Celui-ci relit tout le code de la PR #1128.

## Défaut bloquant

1. `packages/contrat/src/domaines/ventes-actions-service.ts:56-67` (`corriger`) : une vente dont l'écriture est déjà validée peut encore être corrigée. Le service ne contrôle ni `piece.statutEcriture === 'valide'` ni `piece.statut === 'validee'` avant la mutation. Reproduction : `valider('VP-1-009', 1, …)` puis `corriger('VP-1-009', { clientCode: 'CLI001', dateOperation: '2020-01-01' }, 2, …)`. Le résultat est 200, version 3, avec le client et la date changés. Même chose pour une pièce déjà validée dans le jeu fictif (`VP-1-003`, version 1). Une personne a validé une écriture comptable et on peut la modifier en silence, sans annulation : ce point est bloquant pour une fiche sensible.
   Correction demandée : dans `corriger`, refuser la correction d'une vente dont l'écriture est `valide`, avant toute mutation, par un 409 déclaré dans le contrat (`ventes-actions.ts`, erreurs de `corrigerVente`, par exemple un code `VENTE_VALIDEE` ; ne pas réutiliser `VERSION_PERIMEE`). La version reste inchangée. Ajouter dans `packages/contrat/src/__tests__/ventes-actions.test.ts` les assertions suivantes, qui échouent sans la correction : correction après `valider` refusée, correction de `VP-1-003` refusée, `lireVersion` inchangée. Ajouter aussi une assertion du code HTTP dans `apps/serveur/src/__tests__/ventes-actions.test.ts`. Régénérer `openapi/lot-10/openapi.json` par `pnpm contrat:openapi`. Tous ces fichiers sont dans `fichiers_autorises`. Attention à la taille : 319 lignes hors openapi pour un plafond de 320. Il faudra peut-être compacter un peu ailleurs, sans retirer de test.

## Vérifié (OK)

- Fichiers : les 11 fichiers sont dans `fichiers_autorises` (fiche sur main, après la fusion de #1107). Taille : 319 lignes hors fragment openapi (≤ 320). Garde périmètre verte.
- Les 9 tests nommés sont présents et passent : `vitest` ciblé donne 17/17 avec `ventes-indicateurs.test.ts`. Seule la ligne 62 de `ventes-indicateurs.test.ts` change (ajout de `'ventesActions'`), aucune assertion n'est retirée.
- `routesEcritureSansEnTete()` reste `[]`. `node packages/contrat/scripts/openapi.mjs` régénère sans écart.
- CI verte sur ce SHA (gardes, tests, types, lint, verifier, e2e, gitleaks, licences, stryker).
- Mutations, toutes détectées : suppression de l'incrément de version (6 tests rouges) ; corps retiré de l'empreinte d'idempotence (1) ; contrôle `a_verifier` retiré (2) ; contrôle `client_absent` retiré (1) ; délai de la config remplacé par une constante (1) ; rejeu désactivé (3) ; borne du réglage `VENTES_DELAI_ANNULATION_MS` assouplie (1).
- Le délai n'est pas écrit dans le contrat. `demanderValidation` (L01-T07) et `peutValiderFacture` (L10-T11) sont importés par chemin relatif. Aucune validation automatique. Aucune route de création, de numérotation ni d'envoi. Données fictives seulement, aucun prix, aucun mot interdit.

## Remarques (non bloquantes)

- `apps/serveur/src/domaines/ventes-actions.ts:6` : la valeur d'essai `'60000'` sert de repli quand `VENTES_DELAI_ANNULATION_MS` est absente. Elle reste acceptable tant que le serveur est en mémoire, mais il faudra la retirer quand le vrai réglage arrivera.
- Le paramètre de société `s` est ignoré et les clés d'idempotence sont globales à l'instance, pas propres à chaque société. Le domaine `clients` fait de même ; ce point est à traiter avec l'isolation réelle.
- `packages/contrat/src/__tests__/ventes-actions.test.ts:68` : l'indentation est décalée. Le test `cle-absente-400` contrôle le contrat OpenAPI ; le 400 à l'exécution est couvert par le test serveur.
- PR sensible (`sensible: oui`, touche `pilotage/`) : fusion par Will seul.
