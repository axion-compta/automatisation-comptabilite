VERDICT: OK
SHA relu: 78a2b542bba3008443363151e20dd0f7c0b19c41
PR: 940 — L15-T52 Cloche T08 « Ce qui demande mon attention » : tiroir des alertes et notifications, reporter, ignorer, annuler

## Vérifications
- Fichiers modifiés : 7, tous dans `fichiers_autorises` ; `api.ts` et `lecture.tsx` inchangés ; garde périmètre verte (7 fichiers, 300 lignes).
- Taille : 300 lignes ajoutées, 1 retirée ; limite de la fiche 300, respectée.
- Anciens défauts corrigés : plus de mot interdit ; le test `conflit-409-relit` prouve maintenant la relecture (la liste relue est vide, le test rougit si la relecture est retirée).
- Tests : les 9 tests nommés sont présents et passent (9/9) ; `pnpm verifier` : lint, tests (728 fichiers), tests des gardes et gardes verts ; types vérifiés à part avec `tsc --noEmit` (l'étape « types » échoue seulement à cause du Node 22 du cloud).
- Mutations, toutes rouges : relecture retirée après un 409 ; délai d'annulation porté à 20 s ; nouvelle clé d'idempotence à chaque clic ; focus non rendu à la fermeture.
- Aucun secret, aucune adresse de serveur ni de base (règle 13 de CONSIGNE-AUTEUR3), données fictives, aucun prix, aucun mot interdit, aucune garde touchée, aucune nouvelle dépendance.
- Journal : 4 lignes, commence par `# Journal L15-T52`.

## Remarques (non bloquantes)
- `apps/web/src/socle/Cloche.tsx:16` : `DELAI_ANNULATION_MS = 10_000` recopie la constante déjà exportée par `packages/contrat/src/domaines/alertes-service.ts:19`. L'importer éviterait un écart si le délai du serveur change.
- `apps/web/src/donnees/actions-alerte.ts:26` : supprimer le partage de la requête en cours (`enVol`) ne fait rougir aucun test, car la clé réutilisée suffit côté serveur. Ce n'est pas un risque, mais le double clic n'est pas couvert côté client.
