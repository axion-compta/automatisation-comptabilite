VERDICT: OK

PR #1205, fiche L20-T31, seconde relecture au SHA de tête a76969532db1878a048c12a850915809b40fa1d9.
Relecteur Opus, 12/11/2026. Avis précédent : A CORRIGER au SHA b10b31792aa8ed7b1956d38d67d4ea03b9e19497.

## Défaut précédent
1. Confiance `a_verifier` non fixée par les tests : LEVÉ. `compteur-a-valider-plus-n` vérifie maintenant que les questions portent sur `['p3', 'p4']`. La mutation `p.confiance === 'douteux'` vers `p.confiance !== 'sur'` fait échouer ce test.

## Régressions
- Le code `depot-recap.ts` n'a pas changé depuis la relecture précédente : seuls le test (une assertion ajoutée) et le journal ont bougé, plus une fusion de main.
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 150 lignes pour une limite de 150. Journal : 6 lignes, commence par `# Journal L20-T31`.
- Tests ciblés : 4 sur 4 verts. Aucun mot interdit, aucun secret, aucun prix, données fictives.

## CI (pas un défaut de l'auteur)
Les jobs `tests` et `verifier` sont rouges à cause d'un seul test qui échoue aussi sur main (347401ab) : `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`. Ce test, ajouté par la PR #1215 (L22-T30), attend l'en-tête `porte_rgpd` dans `docs/mise-en-production.csv`, alors que la PR #1146 (L25-T01) a renommé la colonne en `porte`. Il faut corriger main avant de fusionner ; la PR n'y est pour rien.
