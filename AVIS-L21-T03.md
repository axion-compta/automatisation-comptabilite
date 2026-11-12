VERDICT: A CORRIGER

PR #1192, fiche L21-T03, tête relue : 93da07626a7670aa51514299b3f333d82986b91a

## Défauts
1. Mutant survivant, contrôle du type de `actif`. `packages/noyau/src/securite/dernier-admin.ts:29` : supprimer `if (typeof c.actif !== 'boolean') invalide();` laisse les 7 tests verts. Avec cette mutation, `{ personneId: 'alice@exemple.fr', actif: 'false' }` sur le dernier administrateur est accepté et rend un état corrompu (`actif: 'false'`, valeur vraie), ce qui contourne la protection.
   Correction demandée : test qui attend `ErreurSecurite` pour `actif` non booléen (`'false'`, `0`, `null`).
2. Mutant survivant, motif ou référence absents ou non textuels. `dernier-admin.ts:57` : retirer `typeof v !== 'string' ||` dans `vide` laisse les tests verts. `motif: undefined` lèverait alors une `TypeError` au lieu de rendre `entree_invalide`.
   Correction demandée : ajouter `{ motif: undefined }`, `{ reference: null }` et `{ motif: 3 }` aux cas de `recuperation-sans-motif-refusee`, avec le résultat `entree_invalide`.
3. Mutant survivant, rôle du demandeur invalide. `dernier-admin.ts:61` : retirer `|| !estRole(demande.role)` laisse les tests verts (un rôle inconnu rend `role_insuffisant` au lieu de lever `argument_invalide`).
   Correction demandée : test avec `role: 'roi'` qui attend `ErreurSecurite`.

## Vérifications faites
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille 179 lignes (max 180).
- 7 tests nommés présents ; 7/7 passent en local.
- Mutations qui rougissent : `x.actif &&` retiré ; `estRole(c.role)` retiré ; `trim()` retiré ; `canal === 'voix'` retiré ; `cible.actif = true` retiré ; `estCanal` retiré.
- Ajout du champ `beneficiaire` : justifié (la fiche le cite dans la trace sans le fournir), noté au journal.
- Aucun mot interdit, aucun prix, aucun secret ; données fictives (@exemple.fr).

## Remarques (non bloquantes)
- Les gardes `Array.isArray(etat/changements)` et `demande === null` survivent aussi aux mutations (une `TypeError` serait levée de toute façon) ; un test sur `null` les fixerait.
- CI : job `verifier` encore en attente ; les autres jobs sont verts.
- Fiche sensible : fusion par Will seul.
