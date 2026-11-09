VERDICT: OK

PR : #952 (fiche L02-T70, branche pilotage/L02-T70-abandon)
SHA relu : 4edc9844dda3eccf81ca41a34c8376e6c0a9f97a

## Vérifications
- Un seul fichier modifié : pilotage/fiches/L02-T70.md (+2 −2), dans fichiers_autorises ; un seul commit.
- Corps de PR : « Fiche: L02-T70 ».
- bloque_par commence par « ABANDONNÉE par Will le 09/11/2026 (D63) » ; « Hors périmètre » mis à jour (aucune connexion bancaire directe).
- statut inchangé (a_faire) ; en-tête YAML intact ; aucune garde ni fichier .github/ touché.
- Aucun mot interdit, aucun prix, aucun nom de prestataire dans les lignes ajoutées.
- CI verte sur le SHA de tête (9/9 : gardes, tests, e2e, types, lint, licences, gitleaks, stryker, verifier).

## Remarques
- L'en-tête de la fiche porte `sensible: oui` (et le corps de PR le rappelle) : la fusion revient donc à Will seul.
