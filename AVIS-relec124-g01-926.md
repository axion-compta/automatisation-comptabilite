VERDICT: A CORRIGER
SHA relu : 0b29366068ca9287d3ada8720f681ae565810b43
PR : 926 — Fiche : L11-T31 (sensible: non)

## Vérifications
- Fichiers modifiés : 5, tous dans `fichiers_autorises`.
- Taille : 210 lignes ajoutées, 1 retirée (limite de la fiche : 300).
- Journal `pilotage/journal/L11-T31.md` : 6 lignes, commence par `# Journal L11-T31`.
- Règle 13 (auteur3) : aucune adresse ni secret ; faux serveur et réponses simulées ; données fictives.
- Aucun mot interdit, aucun prix, aucune garde ni aucun test affaibli.
- Critères : 9 tests nommés sur 9 ; `pnpm garde:textes` passe ; `pnpm verifier` passe (24 étapes).
- Mutations : « En attente » additionné à « À rembourser », donc rouge ; grisage posé sur la mauvaise ligne, donc rouge ; km affichés à zéro, donc rouge ; phrase « ce qui manque » vidée, donc rouge.

## Défauts
1. `apps/web/src/ecrans/e17/Ecran.tsx:62-66` : les en-têtes de colonnes reprennent des textes qui ne correspondent pas à la colonne.
   - date : « Du » ;
   - libellé : titre de l'écran ;
   - montant : « À rembourser » ;
   - état : « En attente » ;
   - ce qui manque : « Ajoutez le justificatif de ce frais. »
   `Tableau` recopie l'en-tête dans `data-entete` de chaque cellule, et c'est ce libellé qui s'affiche sur mobile. Une ligne « Payé par la carte de l'entreprise : rien à rembourser » montre alors son montant sous l'étiquette « À rembourser ». Cela contredit la règle centrale de la fiche (payé par l'entreprise, hors de tout total à rembourser). Le risque d'erreur de lecture sur de l'argent est réel.
   Correction : utiliser des en-têtes neutres (Date, Libellé, Montant, État, Ce qui manque). Ces textes n'existent ni dans `e17.ts` ni dans `fr.ts`, et `e17.ts` n'est pas dans `fichiers_autorises`. Il faut donc faire élargir la fiche à `packages/textes/src/ecrans/e17.ts` (ajouts seulement), ou créer une fiche de textes en amont, plutôt que d'emprunter des libellés faux.
2. `apps/web/src/ecrans/e17/Ecran.tsx:34-38` (`Etat`) : pour les statuts `brouillon`, `refuse` et `perso` (`STATUTS_FRAIS`), aucune pastille et aucun mot ne s'affichent. La fiche exige « `Pastille` + mot » pour l'état. Un frais refusé ou personnel apparaît sans état, avec son montant. Correction : ajouter les mots manquants, avec le même élargissement que pour le défaut 1, et un test par statut.

## Remarques (non bloquantes)
- Le test `erreur-sans-chiffre-partiel` simule la panne par une réponse 500 et non par l'en-tête `x-panne` du faux serveur prévu par la fiche. L'effet testé est le même.
