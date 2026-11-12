VERDICT: A CORRIGER

PR n°1147, tête relue : 3c8c9e9b06025c126814cec01ff00f2e930c958c

## Défauts
1. `packages/noyau/src/banque/__tests__/ecart-releve.test.ts:51` : les cas limites non entier et Infinity ne sont pas testés. La mutation de `packages/noyau/src/banque/ecart-releve.ts:22` `soustraire(centimes(soldeReleve), centimes(solde512))` en `soustraire(soldeReleve, solde512)` survit : `ouvrirEcart(1.5, 0.5, …)` rend alors une ligne de 1 centime au lieu d'être refusé (`soustraire` n'accepte que le résultat entier). Correction demandée : dans `ecart-nul-aucune-ligne`, ajouter `expect(() => ouvrirEcart(1.5 as never, 0.5 as never, '2026-03-31')).toThrow()` et un cas Infinity (`ouvrirEcart(Infinity as never, Infinity as never, '2026-03-31')`).

## Vérifié
- Fichiers : les 4 du diff sont dans `fichiers_autorises` ; 102 lignes, sous `taille_max_lignes` (180).
- 5 tests nommés présents et verts en local (vitest, Node 22).
- Mutations tuées : `ecart === 0` → `<= 0`, filtre `etat === 'ouverte'` retiré, garde double fermeture, motif vide, acteur vide, `trim()` retirés, date non vérifiée, ordre de soustraction inversé, date figée.
- Aucune écriture d'ajustement ; fiche respectée (ouvrirEcart, fermerEcart, bloquantsCloture).
- Aucun secret, aucun prix, aucun mot interdit, données fictives ; journal de 6 lignes commençant par `# Journal L24-T25`. CI verte.
