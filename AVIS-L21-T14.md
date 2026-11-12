VERDICT: OK

PR #1220, fiche L21-T14 (sensible : fusion par Will seul). Première relecture Opus du 12/11/2026 (consigne LOT5, section R).
SHA de tête relu : 9e8868b2c96b3050ddff54f7b083538578097706

## Vérifié
- 4 fichiers, tous dans `fichiers_autorises` : `journal.ts`, son test, la fiche (seul `statut` change) et le journal. 197 lignes sur 200 permises ; aucune ligne « - - » ; aucune nouvelle dépendance.
- Les 5 tests nommés sont présents et réels : 5 sur 5 verts en local. CI verte au même SHA.
- Les quatre versions (règles, consignes, modèles, paramètres) sont obligatoires : vide, espaces seuls ou valeur absente sont refusés. Le journal est en ajout seul (objets gelés). Les versions du rapport sont numérotées à partir de 1, sans écrasement. Les mentions acceptées sont tracées avec leur auteur et leur horodatage. Le rejeu compare toutes les empreintes.
- Journal de 7 lignes, commence par « # Journal L21-T14 ». Données fictives ; aucun secret, prix ni mot interdit.

## Mutations (toutes tuées sauf une, équivalente)
- Version de consignes vide acceptée : `version-manquante-refusee` rougit.
- Écrasement d'une version de même empreinte : `rapport-versionne-sans-ecrasement` rougit.
- Rejeu qui ignore l'empreinte de sortie : `rejeu-a-l-identique` rougit.
- Numérotation à partir de 0 : `rapport-versionne-sans-ecrasement` rougit.
- Retrait de `getUTCDate() === jour` (`journal.ts:38`) : survit, mais la mutation est équivalente, car le contrôle du mois suffit déjà.

## Remarques (non bloquantes)
- Le corps de la PR annonce déjà « relecture Opus faite (VERDICT: OK) » avant cette relecture : à rectifier.
- `rejouer` renvoie vrai sur un journal vide. C'est cohérent et testé, mais l'appelant doit le savoir.
- `journal.ts:38` : la condition sur le jour est redondante.
