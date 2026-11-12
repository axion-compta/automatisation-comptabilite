VERDICT: OK

PR n° 1207, fiche L21-T06, seconde relecture au SHA de tête d9d012edba8ec409c780fe62f351eda4abde601b.
Relecteur Opus, 12/11/2026. Avis précédent : A CORRIGER au SHA f9ae28e5446be4ba48a8544f33156dc1edacc16e.

## Défauts précédents
1. `validation` non gelée : LEVÉ. `figer` gèle une copie de `validation`, et `inventaire-valide-fige` vérifie que l'affectation de `validation.par` lève une erreur. Le retour au code d'avant fait échouer ce test.
2. Filtre MIME non testé : LEVÉ. `releve.jpg` (image), `bilan.mp4` (video) et `bilan.mp3` (audio) doivent rendre `a_classer`. Le retrait de `image`, de `video` ou de `audio` du motif, ou le filtre MIME désactivé, fait chaque fois échouer un test.
3. `Number.isNaN(Date.parse(horodatage))` : LEVÉ. `2026-13-45T99:99:99Z` est refusé ; le retrait du contrôle fait échouer un test.
4. Date du nom non bornée : LEVÉ. `n12025-01-15.pdf` et `2025011599.pdf` rendent `exercice: null` ; le retrait de `(?<!\d)` ou de `(?!\d)` fait échouer un test.

## Régressions
- Seule la ligne `figer` de `inventaire.ts` a changé ; le gel des lignes est toujours vérifié (mutation tuée).
- Fichiers : les 5 du diff sont dans `fichiers_autorises`. Taille : 249 lignes pour une limite de 250. Journal : 5 lignes.
- Tests ciblés : 7 sur 7 verts. Aucun mot interdit, aucun secret, aucun prix, données fictives.

## Remarques (non bloquantes, reprises de l'avis précédent)
- Les variantes `gl`, `fichier des ecritures` et `statuts?([^a-z]|$)` ne sont pas testées.
- `reclasserLigne` reclasse toutes les lignes qui portent le même nom.

## CI (pas un défaut de l'auteur)
Les jobs `tests` et `verifier` sont rouges à cause d'un seul test qui échoue aussi sur main (347401ab) : `outils/exploitation/__tests__/ouverture.test.mjs > onze-cases-attendues`. Ce test, ajouté par la PR #1215 (L22-T30), attend l'en-tête `porte_rgpd` dans `docs/mise-en-production.csv`, alors que la PR #1146 (L25-T01) a renommé la colonne en `porte`. Il faut corriger main avant de fusionner.
