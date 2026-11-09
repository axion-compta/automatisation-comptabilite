VERDICT: OK
SHA relu : 3bf7362d18285084c979102bc741a80402b42309

# Avis relec142-g01-951 — PR 951 (pilotage, fiche L11-T46)

## Vérifications
- Diff : un seul fichier ajouté, `pilotage/fiches/L11-T46.md` (30 lignes), aucune autre modification.
- `node outils/gardes/fiches.mjs` : vert (894 fiches cohérentes, seulement des avertissements déjà présents sur main).
- `depend_de: []` : la dépendance circulaire de L11-T45 (vers L11-T31 / PR 926) est bien levée. Ce n'est pas un doublon refusable : la fiche remplace L11-T45, comme l'indique son contexte.
- `fichiers_autorises` : `e17-libelles-statuts.ts`, son test, la fiche et le journal. Aucun de ces fichiers n'existe sur main et aucun ne recoupe L11-T41 (`e17.ts`, `Ecran.tsx`, `Depot.tsx`…) ni L11-T45 (`e17-statuts.ts`, `e17-statuts.test.ts`).
- La fiche est exécutable : `e17-frais.ts` (modèle) et `e17.statuts` (les 4 statuts à comparer) existent ; `brouillon`, `refuse` et `perso` font bien partie de `STATUTS_FRAIS` ; les scripts `garde:textes` et `verifier` existent ; le dossier `packages/textes/src/ecrans/__tests__/` existe.
- Les 3 tests nommés sont précis et échouent si le code est faux (texte vide ou identique à un statut existant).
- Aucun mot interdit, aucun prix, aucune donnée réelle. CI verte sur le SHA relu.

## Remarques (non bloquantes)
- `STATUTS_FRAIS` contient aussi `a_completer` et `exclu_paye_societe`, que la fiche ne traite pas : la colonne « État » de E17 risque de rester vide pour ces deux statuts. Il faudra le vérifier lors de la relecture de la PR 926, ou ouvrir une fiche de suite.
- Une fois L11-T46 fusionnée, il faudra clore L11-T45 (statut ou retrait) pour qu'aucun auteur ne la prenne.
