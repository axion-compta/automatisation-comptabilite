VERDICT: OK

PR #1115, fiche L16-T25, SHA de tête 7e85d98f0b60b7bea1377485da5554714022ed63
Relecture après l'avis A CORRIGER au SHA acaaf75071d31bd854aca14f0bbd504f7624da02.

## Défauts de l'avis précédent : vérifiés corrigés
1. `preparerDecision` (packages/noyau/src/juridique/decisions-courantes.ts:66-80) refuse par `donnees_invalides` un montant qui n'est ni `null` ni un entier sûr positif ou nul, et toute date qui n'est pas une date réelle AAAA-MM-JJ (contrôle aller-retour). `null` et `0` restent acceptés.
2. Le test `modele-non-approuve-refuse` couvre ordre inversé, identifiant vide, montants NaN, Infinity, -1 et 1.5, dates `abc`, `2026-02-31`, `2026-1-01`, et les cas valides `null` et `0`.

Mutations faites au SHA de tête, toutes détectées (1 test rouge ou plus) : retrait du contrôle du montant ; négatif accepté ; Infinity et non entier acceptés ; `null` refusé ; `0` refusé ; date de début libre ; date de fin libre ; retrait de l'aller-retour ; retrait du contrôle d'ordre ; identifiant vide accepté ; modèle non approuvé accepté ; statut non passé à `deposee`.

## Vérifications faites
- Fichiers : les 4 fichiers du diff sont dans `fichiers_autorises`. Taille : 246 lignes pour 250 au plus.
- Les 5 tests nommés passent (vitest local, 5/5). `pnpm verifier` relancé : toutes les étapes vertes (types relancés en forçant le moteur, Node 22 local). CI entièrement verte au SHA de tête, dont `gardes`.
- Aucun statut `signe` produit ; seule une pièce non vide fait passer à `deposee` ; remuneration.ts et assemblee/documents.ts non modifiés.
- Aucun prix, aucun mot interdit, données fictives. Journal : 8 lignes, commence par `# Journal L16-T25`.
- Fiche sensible : fusion par Will seul. Le retrait de la ligne `bloque_par` (levée annoncée au 12/11/2026) est à confirmer par Will à la fusion.

## Remarques (non bloquantes)
- La regex de `dateReelle` est redondante avec le contrôle aller-retour (sa suppression ne fait rougir aucun test, mutant équivalent).
- `ModeleDecision` reprend la forme de `ModeleDocument` au lieu de l'importer : deux types à tenir alignés.
