VERDICT: A CORRIGER

PR : 926 (fiche L11-T31, sensible : non)
SHA relu : 23e7905d4685a477882526d8a299a179217cea41

## Défauts de l'ancien avis (AVIS-ancien-926, SHA 456bf10)
- Défaut 1 (État vide pour `brouillon`, `refuse` et `perso`) : NON corrigé. Le seul commit ajouté depuis l'ancien avis est 23e7905, « Fusion de main dans lot-11/L11-T31 ». `git diff 456bf10 23e7905 -- apps/web/src/ecrans/e17` est vide : ni `Ecran.tsx` ni le test n'ont changé.

## Défauts
1. `apps/web/src/ecrans/e17/Ecran.tsx:22-27` (`STATUTS`) et `:38-43` (`Etat`) : `STATUTS` ne couvre que `propose`, `valide`, `rembourse` et `en_compte_courant`. `Etat` rend `null` pour `brouillon`, `refuse` et `perso`, trois des neuf valeurs de `STATUTS_FRAIS` (`packages/contrat/src/domaines/frais.ts:5`).
   - Preuve par mutation : j'ai ajouté une sonde en local, puis je l'ai retirée. Elle parcourt `STATUTS_FRAIS`, rend `ligne('F1', { statut })` et exige que la 4e cellule ne soit pas vide. Résultat : 6 tests verts, 3 rouges (`etat-brouillon`, `etat-refuse`, `etat-perso`).
   - Aucun test du dépôt ne parcourt tous les statuts. On peut donc retirer un libellé sans faire rougir la suite.
   - Risque réel : un frais refusé ou personnel s'affiche avec son montant mais sans état. On peut croire qu'il sera remboursé. La fiche exige « état (`Pastille` + mot) » pour chaque ligne.
   - Correction demandée :
     - donner à chaque statut de `STATUTS_FRAIS` une pastille et un mot non vide, tiré des textes de l'écran validé ;
     - ajouter un test qui parcourt `STATUTS_FRAIS` et rougit si un libellé manque ou est vide ;
     - `packages/textes/src/ecrans/e17.ts` n'a toujours pas ces libellés (seulement `statuts.propose`, `valide`, `rembourse` et `enCompteCourant`), et ce fichier n'est pas dans `fichiers_autorises`. Il faut d'abord élargir la fiche (ajouts seulement dans `e17.ts`) ou passer par une fiche de textes en amont. Pas de libellé emprunté à un autre statut, pas de texte en dur (`garde:textes`).

## Contrôles
- Fichiers modifiés : les 5 `fichiers_autorises`, rien d'autre.
- Taille : 222 lignes ajoutées, 1 retirée (au plus 300 selon la fiche, moins de 400).
- Tests e17 : 18/18 verts sur ce SHA (2 fichiers).
- `pnpm garde:textes` vert. `node scripts/verifier.mjs --gardes` : 21 étapes vertes.
- Règle 13 : faux serveur et `fetch` simulé. Aucune adresse ni aucun secret en dur, rien en production.
- Journal : 6 lignes.
- Aucun mot interdit, aucun prix, données fictives. Aucune garde ni aucun test affaibli.
