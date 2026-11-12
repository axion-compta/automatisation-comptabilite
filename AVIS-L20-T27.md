VERDICT: A CORRIGER

PR #1194, fiche L20-T27, relue au SHA de tête 10171df640da0759e1f6bd545d8ffb96272aec50.

## Vérifié
- Fichiers : les 5 du diff sont dans `fichiers_autorises`. Taille : 105 lignes, pour une limite de 120.
- Tests ciblés : `vitest run src/vocabulaire-annee.test.ts` donne 3 tests sur 3 réussis.
- Les tests web E56 et E57 lisent les textes par clé : le changement de texte ne les casse pas.
- Aucun mot interdit, aucun secret, aucun prix. Le journal fait 6 lignes et commence par `# Journal L20-T27`.
- CI : tous les jobs sont verts, sauf `verifier` encore en file au moment de la relecture.
- Mutations qui font échouer un test : « Exercice précédent » remis dans `e56.comparaison.titre` ; « année comptable » non datée dans `e57.tableau.legende` ; gabarit de dates inversé.

## Défauts
1. `packages/textes/src/vocabulaire-annee.test.ts:49` (`titres()`) : le filtre `/\.(titre|legende)$/` ne retient que les clés nommées exactement `titre` ou `legende`. Les autres titres des écrans échappent au contrôle `exercice-absent-des-titres` : `videTitre` (e24-ventes, n04), `sansTitre` (e01, t08), `titres.*` (e01, t08), `legendeTableau` (pages-publiques), `verifierTitre` et `conservationTitre` (export-complet). Trois mutations survivent : « exercice » ajouté dans `e24-ventes.videTitre`, dans `pages-publiques.legendeTableau` ou dans `t08.alerte.titres['ALR-04']`, et les 3 tests restent verts.
   Correction demandée : retenir tout chemin dont un segment contient `titre` ou `legende` sans tenir compte de la casse (par exemple `/(^|\.)[^.]*(titre|legende)/i`). Ajouter une assertion sur un cas fabriqué, du type `videTitre: 'Aucune vente sur cet exercice'`, qui doit être détecté.
2. Même fichier, ligne 25 (`EXERCICE`) : la règle n'est vérifiée que sur les vrais textes, qui ne contiennent plus le mot. Rendre `/exercice/` sensible à la casse ne fait échouer aucun test. Ajouter un cas fabriqué en minuscules (« votre exercice ») qui doit être détecté.

## Remarques (ne bloquent pas)
- 15 mentions existantes de « année comptable » sans dates sont exemptées une par une (`GENERIQUES`). Elles sont hors périmètre, mais la fiche dit « chaque ». Il faut une fiche de suivi pour les dater (n03, n04, e19, e39, e45).
- E56 et E57 disent « année » et non « année comptable datée » : le mot « exercice » n'apparaît plus et la règle n'est pas contournée, mais à l'écran le lexique retenu est « année comptable ».
