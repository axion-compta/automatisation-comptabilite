VERDICT: OK

PR n° 1206, fiche L21-T04, seconde relecture au SHA de tête c681e26987f4ec6eccce2c7a4dc2dc19fcc015d8.
Relecteur Opus, 12/11/2026. Avis précédent : A CORRIGER au SHA e02b32ea66dbaa9a75b3800a92d34704c12aeff7. Fiche sensible : fusion par Will seul.

## Défauts précédents
1. Filtre `texte(x.id) && texte(x.horodatage)` : LEVÉ. `sans-expert-confirmation-renforcee` refuse un id vide et un horodatage vide (dans les deux positions). Les mutations `true`, `texte(x.id)` seul et `texte(x.horodatage)` seul font toutes échouer un test.
2. Horodatage de la trace : LEVÉ. `trace-auteur-et-accord` utilise trois horodatages distincts et vérifie la valeur exacte. Les mutations `.at(0)`, tri retiré, `maintenant` à la place de l'horodatage de l'approbation, et horodatage vide pour l'accord par document échouent toutes.

## Régressions
- Le code `autorisation-cloture.ts` n'a pas changé depuis la relecture précédente : seuls les tests ont bougé, plus une fusion de main. La mutation du canal en liste blanche échoue toujours.
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 230 lignes pour une limite de 230. Journal : 4 lignes.
- Tests ciblés : 9 sur 9 verts. Aucun mot interdit, aucun secret, aucun prix, données fictives.

## Remarques (non bloquantes, reprises de l'avis précédent)
- Avec `confirmeeAEcran: true`, les canaux `api`, `import` et `systeme` sont admis. La fiche ne vise que `chat` et `voix` : à confirmer par Will.

## CI (pas un défaut de l'auteur)
Les jobs `tests` et `verifier` sont rouges à cause d'un seul test qui échoue aussi sur main (347401ab) : `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`. Ce test, ajouté par la PR #1215 (L22-T30), attend l'en-tête `porte_rgpd` dans `docs/mise-en-production.csv`, alors que la PR #1146 (L25-T01) a renommé la colonne en `porte`. Il faut corriger main avant de fusionner.
