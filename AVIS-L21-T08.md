VERDICT: A CORRIGER

PR n° 1208, tête relue : 8c0c6b0fc29f20b8cf84ffd39099cec95cf04583
Relecteur Opus, 12/11/2026. Fiche sensible : fusion par Will seul.

## Vérifié
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 171 lignes ajoutées, 1 retirée, sous le plafond de 220.
- Tests ciblés : 6 sur 6 verts. Mots interdits, secrets, prix : aucun. Données fictives. Montants en centimes entiers.
- Mutations tuées : `fatal`, `ignoreBOM`, `trim()` du sens, `padStart(3)`, montant vide, table ISO-8859-15, `ecartCredit` retiré.

## Défaut (mutation survivante)
1. `packages/noyau/src/fec/variantes.ts:87` : `ok: ecartDebit === 0 && ecartCredit === 0` remplacé par `ecartDebit <= 0 && ecartCredit >= 0` laisse les tests verts. Un import avec moins de débit ou plus de crédit que le fichier serait alors déclaré bon. Correction : dans `ecart-de-totaux-refuse`, ajoute les cas importé = lu − 1 centime au débit et importé = lu + 1 centime au crédit, chacun attendu `ok: false` avec l'écart signé exact.

## Remarques (non bloquantes, déjà notées par l'auteur)
- Une ligne au sens valide mais sans `Montant` donne silencieusement `0,00` ; un refus `montant_invalide` serait plus sûr pour des données importées.
- Une ligne qui porte à la fois `Montant`/`Sens` et `Debit`/`Credit` voit ces deux dernières colonnes remplacées sans signal.
- `if (e instanceof ErreurFec)` (l. 45) : mutant équivalent en pratique.
