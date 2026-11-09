VERDICT: OK
SHA relu: 7da9940b0aa3acd1f3cde7c66bb98413657aebd4

# Avis relec132-g01-938 — PR 938, fiche L06-T35 (sensible: oui, fusion par Will seul)

## Contrôles
- Fichiers modifiés : `scenarios.test.ts`, la fiche et le journal, les 3 dans `fichiers_autorises`. Aucun code de production, `packages/noyau/src/index.ts` non touché, aucune dépendance.
- Taille : 300 lignes pour `taille_max_lignes: 300` (à la limite, pas au-delà).
- Couverture : un test par cas cité, nommé par son identifiant (29 cas). En tête, un test vérifie rôles et permissions du jeu avec `estRole` / `estPermission`. La liste des cas non rejoués est en commentaire de fin, comme demandé.
- 30 tests verts en local. Mutations (toutes rougissent) : séparation des tâches ignorée (T-ROL-3), lecture seule du personnel Axion retirée (C09), filtre de société retiré dans `lireDansSociete` (C02, C05, C11, C19).
- `tsc --noEmit` et eslint : verts. Gardes de `scripts/verifier.mjs`, dont `litteraux`, `textes` et `tests` : toutes vertes (seule l'installation échoue, à cause du Node 22 du cloud).
- Règle 13 (auteur3) : aucune adresse ni secret. Le jeton et l'IBAN de T-JRN-7 sont fictifs (clé IBAN fausse, vérifiée) et assemblés comme dans les tests existants de `journal/__tests__/`. Les réglages sont passés en argument.
- Journal : 6 lignes, commence par `# Journal L06-T35`. Données fictives (`@exemple.fr`, sociétés A/B/C), aucun prix, aucun mot interdit, aucune garde affaiblie.

## Remarques (non bloquantes)
- Comme la spec 06 n'est pas dans le dépôt, l'auteur a interprété T-ROL-2, T-ROL-3, T-ROL-5, C02 et C11 (journal, ligne 4). Will doit valider ces lectures avant de fusionner.
- Stryker n'a pas été lancé ici : le fichier ne contient que des tests et ne peut pas faire baisser le score ; la CI le confirmera.
