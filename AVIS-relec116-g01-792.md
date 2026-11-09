VERDICT: OK
SHA relu : 6e9ad0d818018a1cc0d93e7e525dcf931d2145cf
PR : 792 (fiche L11-T23, faux serveur : frais en lecture, branche lot-11/L11-T23)

## Fusion avec main (depuis l'avis OK à f161560991dac2b4ffecd68359b5000fee564fd6)
- Les lignes ajoutées/retirées de la PR à 6e9ad0d contre main sont strictement identiques à celles de la PR à f161560 contre sa base (comparaison des patchs : aucune différence). Rien de perdu, rien de dupliqué.
- `frais.ts`, `suite-frais.ts`, journal et fiche inchangés entre f161560 et 6e9ad0d.
- `handlers.ts` : un seul import et un seul `...creerHandlersFrais(base, attendre)`, à côté de FEC/Santé venus de main. `contrat-commun.test.ts` : un import et deux appels `suiteFrais` (vrai et faux serveur), FEC et Profil de main conservés.
- La branche fusionne proprement avec le main actuel (5557c9e, `git merge-tree`).

## Contrôles
- 6 fichiers, tous dans `fichiers_autorises` ; 120 lignes ajoutées, 1 modifiée, pour 250 autorisées ; aucune ligne binaire.
- Aucune garde ni `.github/` touché ; aucune dépendance nouvelle.
- Journal `pilotage/journal/L11-T23.md` : 6 lignes, titré `# Journal L11-T23`.
- Aucun mot interdit, aucun prix, données fictives.
- `vitest run src/__tests__/contrat-commun.test.ts` (packages/faux-serveur) : 300 réussis, 4 todo, 0 échec.
- Mutation : 404 `FRAIS_INCONNU` remplacé par 200 dans `frais.ts` : 1 test rougit. Mutation annulée.
