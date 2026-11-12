VERDICT: A CORRIGER

PR n°1197, fiche L24-T19, tête 41c83f6fad2ab825083b0bf12de1cab4c502aaf7 (relecteur Opus, lot 5).

Contrôles passés : 4 fichiers, tous dans `fichiers_autorises` ; diff de 216 lignes, limite 220 ; les 5 tests nommés passent en local ; une écriture validée n'est jamais modifiée sur place (contre-passation et nouvelle écriture via `corriger`) ; période verrouillée exclue et comptée à part, bornes testées ; aucun secret, prix ni mot interdit ; données fictives ; journal de 8 lignes qui commence par `# Journal L24-T19`.

Mutations faites à la main : 9. Survivante : 1.

## Défaut à corriger (test seulement)
1. `packages/noyau/src/ecritures/reclassement.ts:54` : on peut retirer `filtre.dateFin` de la validation des dates sans qu'aucun test rougisse. Une `dateFin` invalide filtrerait alors en silence, par comparaison de chaînes, un mauvais ensemble d'écritures annoncé à la personne. Ajoute dans `apercu-nombre-annonce` :
   `expect(code(() => apercuReclassement(base, { ...filtre, dateFin: '2027-02-30' }, '625', verrous))).toBe('date_invalide');`

## Remarques (non bloquantes)
- Le diff est à 216 lignes pour une limite de 220 : l'ajout ci-dessus tient dans la marge.
- Le corps de la PR emploie, à propos de `tsc` et `eslint`, une expression proscrite par la règle 12 de CLAUDE.md : à reformuler.
