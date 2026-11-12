# Essais de parcours

Les essais sont menés hors du dépôt ; l'outil ne lance aucune IA et ne lit que des rapports.

1. Les seuils de chaque parcours sont dans `docs/essais-parcours.csv` (durée, gestes, part de pièges corrigés).
2. Un rapport JSON : `parcours`, `date` (AAAA-MM-JJ), `version`, `mesures` (`duree_s`, `gestes`, `pieges_pct`).
3. Données fictives seulement dans les rapports.
4. `node outils/essais/parcours.mjs rapport1.json rapport2.json` affiche une ligne par parcours (vert ou rouge).
5. Un parcours rouge reste ouvert : il faut un nouvel essai vert, plus récent.
6. `--clore P1` vérifie la clôture du parcours et échoue sinon.
7. Les seuils sont proposés, à confirmer.
