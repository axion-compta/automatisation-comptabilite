VERDICT: OK
SHA relu : 90dd1ec724110406c0156b5b362c064b12a974b7
PR : 935 — fiche L02-T59 — branche lot-02/L02-T59 — sensible : non

## Contrôles
- Fichiers modifiés : 7, tous dans `fichiers_autorises`.
- Taille : 186 lignes (max fiche 260, max dépôt 400) ; aucune ligne « - - ».
- Journal `pilotage/journal/L02-T59.md` : 5 lignes, commence par `# Journal L02-T59`.
- Tests : `apps/web/src/ecrans/e12` 3 fichiers, 22 tests verts ; les 6 tests nommés présents + un test pour les cas limites (deux trous, exercice décalé) ; écart absent couvert dans `ecart-affiche`.
- `tsc --noEmit` (apps/web) vert ; `node scripts/verifier.mjs --gardes` : tout est vert (21 étapes, dont textes et appels).
- Mutations (toutes rougissent un test puis annulées) : filtre `etat === 'ouvert'` retiré ; écart jamais affiché ; décalage d'un mois dans `nomMois` ; `aria-hidden` retiré de la frise.
- Aucun secret, aucune adresse en dur, aucun prix, aucun mot interdit ; textes dans `e12.ts` ; état donné par un mot et une forme (Pastille), pas la couleur seule.

## Remarques (non bloquantes)
- `Couverture.tsx` : une erreur de lecture de `/banque/trous` est ignorée sans message (pas de bandeau) ; acceptable en lecture seule, à signaler à l'écran plus tard si voulu.
- `Ecran.tsx:112` : l'id du compte est calculé deux fois dans la même expression ; une variable locale serait plus lisible.
