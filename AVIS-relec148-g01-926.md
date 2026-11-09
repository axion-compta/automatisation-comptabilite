VERDICT: OK

PR : 926 (fiche L11-T31, sensible : non)
SHA relu : 74c1e98c34050d5a7c01702f46c28b08d1af97a7

## Défauts de l'avis précédent (relec137-g01-926, SHA 23e7905)
- Défaut 1 (colonne État vide pour `brouillon`, `refuse` et `perso`) : corrigé. `apps/web/src/ecrans/e17/Ecran.tsx:28-30` : `STATUTS` couvre ces trois statuts, avec les libellés de `e17LibellesStatuts` (`packages/textes/src/ecrans/e17-libelles-statuts.ts`, déjà sur main). Aucun texte en dur, aucun libellé emprunté à un autre statut.
- Tests ajoutés : `etat-non-vide-<statut>` parcourt les 9 valeurs de `STATUTS_FRAIS` ; `etat-libelle-<statut>` exige chaque libellé de `e17LibellesStatuts` dans la 4e cellule.
- En-têtes mobiles : `data-entete` de chaque cellule = en-tête de sa colonne (test `en-tetes-de-colonnes-correspondent-a-la-colonne`).

## Mutations (faites puis annulées)
- Retrait de `brouillon`, de `refuse` puis de `perso` dans `STATUTS` : à chaque fois 2 tests rouges (`etat-non-vide-…` et `etat-libelle-…`).
- Mot vide pour `perso` : 2 tests rouges.
- En-tête de la colonne État remplacé par un autre texte : `en-tetes-de-colonnes-correspondent-a-la-colonne` rouge.

## Contrôles
- Fichiers modifiés : les 5 `fichiers_autorises`, rien d'autre.
- Taille : 239 lignes ajoutées, 1 retirée (au plus 300 selon la fiche). Aucune ligne « - - ».
- Tests e17 : 30/30 verts sur ce SHA (2 fichiers).
- `pnpm garde:textes` vert. `node scripts/verifier.mjs --gardes` : 21 étapes vertes.
- CI sur le SHA de tête : 9 contrôles terminés, tous verts (verifier, types, stryker, tests, licences, gardes, e2e, lint, gitleaks).
- Journal : 6 lignes, commence par `# Journal L11-T31`.
- Aucun mot interdit, aucun prix, données fictives. Aucune garde ni aucun test affaibli.

## Remarques
- `pilotage/journal/L11-T31.md:5` n'est plus à jour : il annonce des en-têtes empruntés et une pastille sans mot pour brouillon, refus et perso. Ce n'est plus le cas. À rectifier à l'occasion, sans bloquer.
