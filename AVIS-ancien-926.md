VERDICT: A CORRIGER

PR : 926 (fiche L11-T31, sensible : non)
SHA relu : 456bf10825fa57afd2152069b6b2ad7b8bf27861

## Défauts de l'ancien avis (relec130-g01-926)
- Défaut 1 (état absent pour `brouillon`, `refuse`, `perso`) : NON corrigé. Le seul commit depuis l'ancien avis (bc2f1d4) est 456bf10, « Fusion de main dans lot-11/L11-T31 ». Il ne touche ni `Ecran.tsx` ni le test.

## Défauts
1. `apps/web/src/ecrans/e17/Ecran.tsx:22-27` (`STATUTS`) et `:37-41` (`Etat`) : `STATUTS` ne connaît que `propose`, `valide`, `rembourse` et `en_compte_courant`. Pour `brouillon`, `refuse` et `perso`, `Etat` rend `null`, donc la colonne « État » est vide.
   - Preuve : j'ai ajouté en local, puis retiré, une sonde de 3 tests. Chaque test rend une ligne `ligne('F1', { statut })` et exige une 4e cellule non vide. Les 3 tests sont rouges (`etat-brouillon`, `etat-refuse`, `etat-perso`).
   - Risque réel : un frais refusé ou personnel s'affiche avec son montant mais sans état. On peut croire qu'il sera remboursé. La fiche exige « état (`Pastille` + mot) » pour chaque ligne.
   - Correction demandée :
     - donner à ces trois statuts une pastille et un mot non vide ;
     - ajouter un test par statut, qui rougit si le libellé est vide ;
     - les textes manquent dans `packages/textes/src/ecrans/e17.ts` (seulement `statuts.propose`, `valide`, `rembourse` et `enCompteCourant` sur `origin/main`), et ce fichier n'est pas dans `fichiers_autorises`. Il faut d'abord une PR de fiche qui ajoute ce fichier (ajouts seulement), ou une fiche de textes en amont. N'empruntez pas un libellé faux et n'écrivez pas de texte en dur (`garde:textes`).

## Contrôles
- Fichiers modifiés : les 5 `fichiers_autorises`, rien d'autre.
- Taille : 222 lignes ajoutées, 1 retirée (300 au plus dans la fiche, moins de 400).
- Tests e17 : 10/10 verts sur ce SHA. `node scripts/verifier.mjs --gardes` : rc 0, 21 étapes vertes.
- Règle 13 : faux serveur et `fetch` simulé, aucune adresse, aucun secret.
- Journal : 6 lignes, il commence par `# Journal L11-T31`.
- Aucun mot interdit, aucun prix, données fictives. Aucune garde n'est affaiblie.
