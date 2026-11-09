VERDICT: OK
PR: 927 — fiche L11-T32 (lot-11/L11-T32)
SHA relu: d88e40829a12f7c71144ec71b22c0e7bfb28ccc1

## Vérifications
- Fichiers modifiés : les 5 sont dans fichiers_autorises (route.tsx, Ecran.tsx, test, fiche, journal).
- Taille : 210 lignes ajoutées, 1 retirée (max 260) ; aucune ligne binaire, aucun octet NUL.
- Journal : 7 lignes, commence par « # Journal L11-T32 ».
- Les 8 tests nommés passent (vitest local) ; pnpm garde:textes vert ; CI : verifier, tests, lint, types, gardes, e2e, stryker, gitleaks, licences verts.
- Mutations (toutes rougissent puis annulées) : payeur a_confirmer affiché « société » ; id non encodé ; virgule des km remplacée par un point ; montant de trajet null affiché 0 ; appel réseau avec id vide ; 404 non traduit en « inconnu ».
- km par découpage de chaîne, sans flottant ni toFixed ; socle, api.ts et fr.ts non touchés.
- Aucun secret, aucune adresse réelle, aucun prix, aucun mot interdit ; données fictives (Lyon, Dijon, « Repas fictif »).

## Remarques (non bloquantes)
- Ecran.tsx:38 : l'état du frais est affiché brut (`f.statut`, ex. « propose ») et la date en ISO ; prévoir un libellé et un format de date dans une fiche suivante (textes e17-frais.ts).
