VERDICT: A CORRIGER
PR #1171, fiche L20-T22, tête e520d83ffbc898acf7590df7ea00a86c64c6addd

Contrôles passés : 6 fichiers modifiés, tous dans fichiers_autorises ; 85 lignes ajoutées pour une limite de 140 ; les 4 tests nommés passent (noyau 4/4, textes 2/2) ; `node scripts/verifier.mjs --gardes` est vert ; aucun secret, prix ni mot interdit ; les phrases font 12 mots au plus.
J'ai fait 9 mutations à la main : 4 font échouer un test, 5 survivent (dont 1 équivalente).

## Défauts
1. `packages/noyau/src/exercices/dates-modifiables.ts:11`, contrôle de l'année non testé. Ces trois mutations survivent : retirer `!Number.isInteger(annee) ||`, retirer `annee < 1000 ||`, retirer `|| annee > 9999`. Aucun test n'appelle `datesParDefaut` avec une valeur invalide. Correction demandée : dans `dates-par-defaut`, ajouter les cas `NaN`, `Infinity`, `2026.5`, `999` et `10000`, qui doivent lever une erreur, et vérifier que `1000` et `9999` sont acceptés.
2. `packages/textes/src/moteur/exercices.ts:2`, ancre de début non testée. Retirer `^` de `/^\d{4}$/` ne fait rougir aucun test, alors qu'une année à 5 chiffres comme `12026` passerait. Correction demandée : dans `date-par-defaut-1er-janvier-31-decembre`, ajouter `phraseDatesParDefaut(12026)`, `phraseDatesParDefaut(-2026)` et `phraseDatesParDefaut(2026.5)`, qui doivent lever une erreur.

## Remarques
- Mutation équivalente, sans action à prévoir : retirer `!Number.isInteger(nbEcrituresValidees) ||` ne change rien, parce que `!== 0` refuse déjà NaN et 0.5.
- `PHRASE_DATES_MODIFIABLES` est copiée à l'identique dans noyau et dans textes. Aucun test ne vérifie que les deux restent égales : à rapprocher dans une fiche suivante, sans élargir celle-ci.
- Comme le dit le journal, `changerDateCloture` n'est pas encore reliée à `datesModifiables` : il faudra une fiche dédiée.
- `verifier` était encore en file d'attente pendant la relecture.
