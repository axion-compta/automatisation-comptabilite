VERDICT: OK

PR n°1190 (L25-T02), seconde relecture au SHA de tête dee36ab9b164ae31e0d2cb101b83925079fde52e.

## Défauts précédents
1. Levé : le cas `cleId: ''` est ajouté. La mutation `installation-paquet.ts:37` `min(1)` retiré fait échouer `fichier-illisible-refuse`.
2. Levé : le cas `signature: ''` est ajouté. La mutation de la ligne 38 fait échouer le même test.
3. Levé : un JSON valide contient l'octet 0xFF dans la valeur de `source`. La mutation `{ fatal: true }` retiré (ligne 55) fait échouer le test.

## Pas de régression
- Aucun cas de test n'est retiré : les cinq textes invalides sont seulement regroupés dans un `map`. 15 tests sur 15 réussissent en local, dont ceux de `signature-paquet`.
- Le diff fait 260 lignes, soit pile le maximum. La garde refuse seulement au-delà, et le job `gardes` est vert. Les fichiers sont dans `fichiers_autorises`. Le journal fait 5 lignes.
- CI : tous les jobs sont verts sauf `tests` (et donc `verifier`). Le seul test en échec est `outils/exploitation/__tests__/ouverture.test.mjs` (en-tête `porte` attendu, `porte_rgpd` reçu). Il échoue de la même façon sur `origin/main` (conflit entre L22-T30 n°1215 et L25-T01 n°1146) : ce n'est pas un défaut de l'auteur. Il faut réparer main, puis relancer la CI.

## Remarques (ne bloquent pas, pour Will)
- Déjà signalée : la date d'effet n'est pas couverte par la signature. C'est un défaut de fiche, à traiter par une fiche de suite.
- La fiche est sensible : seul Will peut la fusionner.
