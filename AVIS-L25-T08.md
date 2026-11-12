VERDICT: OK

PR #1209 (L25-T08), seconde relecture au SHA de tête 126097c4392f65349d6a2601ee75760278b953f5.
Relecteur Opus, 12/11/2026. Avis précédent : A CORRIGER au SHA df2c0bc5a291fc46d98e5c09671488cf5cb7334a. Fiche sensible : fusion par Will seul.

## Défaut précédent
1. `brouillon-local.ts:51` (création de clé en cours partagée) : LEVÉ. `deux-formulaires-une-seule-cle` utilise un stockage dont `lireCle` attend un tour de boucle, compte les écritures de clé (attendu : 1) et vérifie que les deux brouillons se reprennent. Le retrait de la ligne 51 fait échouer ce test.

## Régressions
- Le code `brouillon-local.ts` n'a pas changé depuis la relecture précédente. Le test a été resserré pour tenir la taille : les assertions regroupées sont les mêmes (`[reprendre(), brouillons.size]`), aucune n'a été retirée.
- Mutations encore tuées : délai 1 999 ms, clé extractible.
- Fichiers : les 4 du diff sont dans `fichiers_autorises`. Taille : 239 lignes pour une limite de 240. Journal : 6 lignes.
- Tests ciblés : 9 sur 9 verts. Aucun mot interdit, aucun secret, aucun prix, données fictives.

## Remarques (non bloquantes, reprises de l'avis précédent)
- Une erreur passagère de `lireCle` efface un brouillon peut-être lisible.
- Le chiffré n'est pas lié à son identifiant (`additionalData` d'AES-GCM absent).

## CI (pas un défaut de l'auteur)
Les jobs `tests` et `verifier` sont rouges à cause d'un seul test qui échoue aussi sur main (347401ab) : `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`. Ce test, ajouté par la PR #1215 (L22-T30), attend l'en-tête `porte_rgpd` dans `docs/mise-en-production.csv`, alors que la PR #1146 (L25-T01) a renommé la colonne en `porte`. Il faut corriger main avant de fusionner.
