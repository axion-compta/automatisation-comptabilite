VERDICT: A CORRIGER

PR n°1187, tête relue : effc6c94360db481ac35bb7863a868148a129114

## Défauts
1. `packages/noyau/src/banque/sans-piece/__tests__/cas-forme.test.ts:57` : le cas limite non entier n'est pas testé. La mutation de `packages/noyau/src/banque/sans-piece/cas-forme.ts:36` `Number.isSafeInteger(m)` en `Number.isFinite(m)` survit : un montant de 1,5 centime donnerait alors une proposition en 108. Correction demandée : dans `brouillon-seulement`, ajouter `expect(() => proposerSelonForme({ montant: 1.5 as never }, 'EI')).toThrow(ErreurCasForme)` et le cas Infinity (`{ montant: Infinity as never }`).

## Vérifié
- Fichiers : les 4 du diff sont dans `fichiers_autorises` ; 110 lignes, sous `taille_max_lignes` (180).
- 5 tests nommés présents et verts en local (vitest, Node 22).
- `FORMES` (`profil/types.ts`) = EI, EURL, SARL, SASU, SAS, SCI : seule l'EI reçoit 108, toutes les sociétés sont testées.
- Mutations tuées : garde du montant invalide retirée, garde du montant nul retirée, condition `m < 0` de la restitution retirée, `=== true` en `!== false`, `Math.abs` retiré, EURL traitée comme une EI.
- Mutations `m > 0` → `m >= 0` et `m < 0` → `m <= 0` : équivalentes (zéro refusé avant).
- Toujours brouillon, `valide: false` ; aucun secret, aucun prix, aucun mot interdit, données fictives ; journal de 6 lignes commençant par `# Journal L24-T27`.
