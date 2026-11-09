VERDICT: A CORRIGER
SHA relu: 442039a10341680fa72e6eb1b83daca077ee3b5e
PR 945 — fiche L11-T45 (ajout de pilotage/fiches/L11-T45.md). PR déjà fusionnée dans main : la correction passe par une nouvelle PR de pilotage.

## Défauts
1. pilotage/fiches/L11-T45.md:12 — `depend_de: ["L11-T31"]` est inversé et crée un blocage circulaire. Le Contexte dit que la PR 926 (L11-T31) importera `e17Statuts` après la fusion de cette fiche, donc L11-T31 a besoin de L11-T45. Or `pilotage/LISEZMOI.md:14` ne donne une fiche à un auteur que si toutes ses dépendances sont à `statut: fait`. L11-T31 est `a_faire` sur main, donc L11-T45 ne sera jamais prise, et L11-T31 ne peut pas passer sans elle. Correction demandée : `depend_de: []` (ou seulement les fiches déjà faites qui ont créé `e17.ts` et `e17-frais.ts`). Si besoin, ajouter L11-T45 au `depend_de` de L11-T31.
2. Origine des libellés : la fiche reconnaît que les libellés « n'existent dans aucun texte validé ». Aucune maquette E17 n'est dans le dépôt, et « Brouillon », « Refusé », « Personnel, hors remboursement » ne s'y retrouvent nulle part. Ces textes visibles par l'utilisateur sont donc inventés par la fiche et ne viennent pas de la maquette E17 validée. Correction demandée : citer la maquette E17 validée (écran, état) d'où vient chaque libellé, ou faire valider ces trois libellés par Will avant que la fiche soit exécutée.

## Contrôles passés
- `node outils/gardes/fiches.mjs` : vert (893 fiches cohérentes, avertissements préexistants seulement).
- `fichiers_autorises` réalistes : fichier neuf `packages/textes/src/ecrans/e17-statuts.ts` (sur le modèle de `e17-frais.ts`) et son test ; aucune autre fiche ne les nomme. Pas de chevauchement avec L11-T31 (fichiers `apps/web/src/ecrans/e17/`) ni avec L11-T41 (`e17.ts`).
- Les clés `brouillon`, `refuse` et `perso` existent bien dans `STATUTS_FRAIS` (`packages/contrat/src/domaines/frais.ts:5`).
- Critères testables (3 tests nommés, garde:textes, verifier) ; taille max 60 cohérente avec l'ajout.
- Diff de 30 lignes ; aucun secret, aucun prix, aucun mot interdit, aucune donnée réelle.

## Remarques
- La fiche cite `e17.test.tsx` et `ecrans.test.ts` comme tests existants : aucun n'existe sous `packages/textes/src/ecrans/__tests__/`. C'est sans conséquence (fichier neuf), mais la phrase pourrait induire l'auteur en erreur.
- Le titre de la routine parlait d'un ajout dans `e17.ts` ; la fiche crée plutôt un fichier neuf. Ce choix est meilleur : il évite le conflit avec L11-T41.
- L11-T31 n'a pas `e17-statuts.ts` dans ses `fichiers_autorises`. Ça suffit pour un import en lecture, mais il faut vérifier que la garde des textes accepte cet import depuis `Ecran.tsx`.
