VERDICT: A CORRIGER
PR #1175, fiche L20-T21, tête 102d9a3812acf5a1bd9f476b5e89d0c05e76f133

Contrôles passés : 4 fichiers modifiés, tous dans fichiers_autorises ; 249 lignes ajoutées pour une limite de 250 ; les 5 tests nommés sont présents et passent (7/7 en local) ; `node scripts/verifier.mjs --gardes` est vert ; `tsc --noEmit` passe sur noyau ; aucun secret, prix ni mot interdit ; données fictives. Fiche sensible : fusion par Will seul.
J'ai fait 13 mutations à la main : 10 font échouer un test, 3 survivent.

## Défauts
1. `packages/noyau/src/exercices/a-nouveaux.ts:75`, frontière basse de la classe non testée. La mutation `classe >= 1` en `classe >= 0` survit : un compte de classe 0 serait alors repris en à-nouveaux sans qu'aucun test ne rougisse. Les tests ne couvrent que la classe 8 (`801000`). Correction demandée : dans `refus-balance-desequilibree-compte-hors-plan-montant-invalide`, ajouter un compte de classe 0 (ex. `012000`) et un compte de classe 9 (ex. `901000`), présents dans le plan, qui doivent rendre `compte_invalide`.
2. `packages/noyau/src/exercices/a-nouveaux.ts:127`, statut de N+1 non testé. Supprimer `statutConnu(exerciceN1.statut)` ne fait rougir aucun test. Correction demandée : dans `fec-officiel-n-plus-1-refuse-n-ouvert`, ajouter `fecOfficielAutorise({ debut: '2027-01-01', statut: 'x' as never }, undefined)`, qui doit rendre `statut_inconnu`.

## Remarques
- Mutation équivalente, sans action à prévoir : `resultat < 0` en `resultat <= 0` (ligne 82), parce que la ligne est déjà gardée par `resultat !== 0`.
- Le job CI `gitleaks` est rouge pour une cause d'environnement (licence absente), sans rapport avec le diff. Ce n'est pas un défaut de l'auteur.
- `verifier` était encore en file d'attente pendant la relecture.
