VERDICT: OK

PR n°1176, fiche L23-T03 (sensible : fusion par Will seul), tête relue : 707c984d0e1d459e3db15691e7082d80515ba8b6

Vérifié : 6 fichiers, tous dans fichiers_autorises ; 210 lignes (max 220) ; 6 tests nommés verts ; noyau/plan (11 tests) et tout parametres (141 tests) verts ; tsc noyau et parametres verts ; comptes.ts non modifié ; CI verte ; valeurs légales seulement dans parametres, en `non_verifie` avec source ; aucun secret, prix ni mot interdit.
Mutations tuées (6/6) : fin incluse (`<=`), début exclu (`<`), `includes` au lieu de `startsWith`, contrôle `version_ambigue` retiré, contrôle aller-retour de date retiré, numéro vide accepté.
La frontière de la fiche est couverte : exercice décalé du 01/07/2024 ou du 31/12/2024 en ancienne version, 01/01/2025 en nouvelle version.

## Remarques
- `source_url` pointe sur la racine de Légifrance et non sur le texte : à préciser quand la ligne passera à `valide`.
- `versionPcg` ne valide pas le format des bornes `debut` et `fin` des versions (comparaison de chaînes). Elles viennent du catalogue, donc ce n'est pas bloquant.
