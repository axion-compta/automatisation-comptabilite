VERDICT: OK

PR n°1191 (L20-T29), seconde relecture au SHA de tête 1b40ee901c9c6516c2e6ec91a4cf23cdd4723a4a.

## Défauts précédents (tous levés, vérifiés par mutation)
1. Borne C0 : les refus de 0x0B, 0x0C et 0x1F, et l'acceptation de 0x20, sont testés. Les mutations `code < 32` → `< 2` et → `< 31` font échouer le test.
2. Borne DEL : le refus de 0x7F et l'acceptation de 0x7E sont testés. Les mutations `>= 127` → `>= 128` et → `>= 126` font échouer le test.
3. Borne C1 : le refus de 0x9F et l'acceptation de 0xA0 sont testés. Les mutations `<= 159` → `<= 158` et → `<= 160` font échouer le test.
4. Table Latin-9 : les 8 octets sont décodés. Retirer n'importe laquelle des 8 entrées fait échouer `latin9-accepte`.
5. Séparateur ambigu : l'en-tête `x\ty|z` est testé. Trois mutations font chacune échouer le test : `=== 1` → `>= 1`, `find` → `return undefined`, `find` → `compatibles[0]`.

## Pas de régression
- Les octets 0x00 et 0x01 restent testés, désormais dans la boucle. Le commentaire sur la double marque d'ordre est corrigé.
- 5 tests sur 5 réussissent en local. Le diff fait 197 lignes pour un maximum de 200. Les fichiers sont dans `fichiers_autorises`. Le journal fait 8 lignes. Aucun mot interdit (« Prix » est un libellé de test).
- CI : tous les jobs sont verts sauf `tests` (et donc `verifier`). Le seul test en échec est `outils/exploitation/__tests__/ouverture.test.mjs` (en-tête `porte` attendu, `porte_rgpd` reçu). Il échoue de la même façon sur `origin/main` (conflit entre L22-T30 n°1215 et L25-T01 n°1146) : ce n'est pas un défaut de l'auteur. Il faut réparer main, puis relancer la CI.

## Remarques (ne bloquent pas)
- Un en-tête ambigu dont aucune lecture ne donne les en-têtes exacts n'est pas testé (le refus attendu est `format_fec_inconnu`).
- La fiche est sensible : seul Will peut la fusionner.
