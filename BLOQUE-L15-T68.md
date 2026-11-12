# BLOQUE L15-T68

Fiche : banc des 111 cas de la spec 15 et mesures de performance.

## Cause
1. Le texte de la spec 15 (cas T01 à T41, P01 à P26, R01 à R17 avec R06b et R07b, X01 à X23 avec X13b et X14b) n'est pas dans ce dépôt public. Le journal de L15-T60 et le bloc « Lot 15 » de REPRENDRE.md le disent déjà. Aucun énoncé de cas n'est lisible : écrire 111 tests « nommés par identifiant » reviendrait à inventer leur contenu, donc à ne rien prouver (surtout pour les cas S).
2. Le critère « tableau des cas de L15-T05 à mettre à jour » vise REPRENDRE.md, qui n'est pas dans les `fichiers_autorises` de L15-T68.
3. `apps/serveur/src/__tests__/banc-interface/` n'existe pas ; aucun test existant ne porte un identifiant de cas.

## Correction minimale
- Will dépose le texte des 111 cas (identifiant, entrée, résultat attendu, marque S) dans un fichier du dépôt, par exemple `docs/spec-15-cas.csv`, et ajoute ce chemin (lecture) ainsi que `REPRENDRE.md` aux `fichiers_autorises` de la fiche.
- Prévoir un `taille_max_lignes` supérieur à 300 ou scinder la fiche (une par famille T, P, R, X, plus une pour la performance) : 111 tests tiennent mal dans 300 lignes.
