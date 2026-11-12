VERDICT: OK

PR n° 1208, fiche L21-T08, seconde relecture au SHA de tête bb52912dcb16f565f7111e6dfed8eeb30afca988.
Relecteur Opus, 12/11/2026. Avis précédent : A CORRIGER au SHA 8c0c6b0fc29f20b8cf84ffd39099cec95cf04583. Fiche sensible : fusion par Will seul.

## Défaut précédent
1. `variantes.ts:87` (`ok`) : LEVÉ. `ecart-de-totaux-refuse` couvre maintenant un débit importé de 1 centime en moins et un crédit importé de 1 centime en plus, avec l'écart signé exact, et le cas d'égalité. Les mutations `<= 0 && >= 0`, `>= 0 && <= 0`, crédit ignoré et `||` font toutes échouer ce test.

## Régressions
- Le code `variantes.ts` n'a pas changé depuis la relecture précédente : seul le test a bougé, plus une fusion de main.
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 179 lignes pour une limite de 220. Journal : 6 lignes.
- Tests ciblés : 6 sur 6 verts. Aucun mot interdit, aucun secret, données fictives. Le « 12 € » du test est un octet ISO-8859-15 à décoder, pas un prix.

## Remarques (non bloquantes, reprises de l'avis précédent)
- Un sens valide sans `Montant` donne 0,00 sans signal.
- Une ligne qui porte `Montant`/`Sens` et `Debit`/`Credit` voit ces deux dernières colonnes remplacées sans signal.

## CI (pas un défaut de l'auteur)
Les jobs `tests` et `verifier` sont rouges à cause d'un seul test qui échoue aussi sur main (347401ab) : `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`. Ce test, ajouté par la PR #1215 (L22-T30), attend l'en-tête `porte_rgpd` dans `docs/mise-en-production.csv`, alors que la PR #1146 (L25-T01) a renommé la colonne en `porte`. Il faut corriger main avant de fusionner.
