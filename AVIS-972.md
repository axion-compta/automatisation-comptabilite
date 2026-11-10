VERDICT: OK
SHA relu: c9e6b0eacb7059b4858c4d25bec288fbca72ffb2

PR 972, fiche L11-T25 (faux serveur : véhicules et barème au jour J, suite commune), relecture Opus locale.

Vérifié :
- Périmètre : 6 fichiers, tous dans fichiers_autorises. Le diff fait environ 120 lignes, pour 220 permises.
- handlers.ts et contrat-commun.test.ts : un import et un appel chacun, sans toucher aux autres domaines.
- Le faux serveur utilise le même service que le vrai (`creerServiceVehiculesBareme`, `ErreurBareme`). La query est validée par l'inputSchema du contrat, sinon 400 BAD_REQUEST. Les erreurs suivent le contrat : BAREME_ABSENT 404, AMBIGU et ILLISIBLE 409, `defined: true`. C'est le même format que frais.ts.
- Aucun calcul dans les handlers, lecture seule, données fictives. L'immatriculation n'est pas exposée (carteGrise).
- La suite couvre les 7 cas de la fiche. Elle ajoute « personne inconnue » (liste vide), query vide ou absente, plusieurs dates invalides (2025-02-30, vide, texte) et des bornes absentes des deux côtés.
- Aucune valeur légale en dur, aucun prix, aucun nom réel.
- CI : 9 contrôles verts.

Remarques (non bloquantes) :
- Les erreurs 409 BAREME_AMBIGU et BAREME_ILLISIBLE ne sont pas jouées par la suite commune : le jeu fictif ne les produit pas. La fiche ne les exige pas dans les tests.
