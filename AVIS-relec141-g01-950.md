VERDICT: OK
SHA relu : 68f1491b937f2dbc16f8ec4357382894e415e131
PR : 950 (pilotage, fiche L11-T46, non sensible), branche pilotage/L11-T46-fiche

## Vérifications
- Diff `origin/main...68f1491` : un seul fichier, `pilotage/fiches/L11-T46.md` (30 lignes ajoutées, aucune ligne « - - »).
- Champs cohérents avec L11-T45 : même titre, phase P6, lot 11, couloir D, exigences V3-MOT-061 et V3-MOT-060, taille 60, tests requis, mêmes critères. Seuls changent `ordre: 46`, `depend_de: []` et les noms de fichiers.
- `fichiers_autorises` réels : `e17-libelles-statuts.ts` et son test sont neufs (absents de main), dans un dossier existant ; le modèle `e17-frais.ts` existe ; `e17.statuts` contient bien les quatre statuts cités.
- Trois tests nommés (`statut-brouillon-non-vide`, `statut-refuse-non-vide`, `statut-perso-non-vide`). Chacun exige un texte non vide et différent des quatre libellés de `e17.statuts`. Un libellé vide ou recopié les fait échouer.
- Aucun recoupement de fichiers avec L11-T41 (`e17.ts`, `Ecran.tsx`, `Depot.tsx`) ni avec L11-T31 (`route.tsx`, `Ecran.tsx`, `e17.test.tsx`). `Ecran.tsx` et `e17.ts` sont exclus explicitement.
- `node outils/gardes/fiches.mjs` au SHA relu : code 0, « 894 fiches cohérentes » (avertissements préexistants seulement).
- Aucun mot interdit et aucun prix (la seule occurrence est « sans prix »). Aucune donnée réelle.

## Remarques
1. La PR 950 est **fermée sans fusion** (commentaire du propriétaire : « Doublon de L11-T45 (fusionnée) »). Or seule la *fiche* L11-T45 a été fusionnée (#945). Sur main, elle reste `a_faire` avec `depend_de: ["L11-T31"]`, ce qui maintient le blocage circulaire avec la PR 926. Sans L11-T46 ni correction de L11-T45, les libellés brouillon/refusé/personnel ne seront jamais produits.
2. Si L11-T46 est rouverte et fusionnée, il faut, dans une PR de pilotage séparée, abandonner L11-T45 ou retirer sa dépendance. Sinon, une fois la PR 926 fusionnée, un auteur pourra exécuter L11-T45 et créer `e17-statuts.ts`, qui exporte le même nom `e17Statuts` que L11-T46 : les libellés seraient en double.
3. La pointe actuelle de la branche (`3bf7362`, rebasée après la fermeture) diffère du SHA de tête de la PR. Elle renomme l'export en `e17LibellesStatuts`, ce qui supprime l'homonymie évoquée au point 2. Cette version n'appartient pas à la PR 950 relue. Préférer `3bf7362` si la fiche est reproposée.
