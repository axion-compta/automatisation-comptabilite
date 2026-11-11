VERDICT: OK
SHA relu: 78def601e50a08c45c63b520f1052927c7074c5f

PR 837, fiche L04-T30 (branche lot-04/L04-T30), sensible : non. Relecture Opus locale au nouveau SHA, fiche lue sur origin/main. L'avis précédent (relec102-g01-837) ne vaut plus.

Vérifié :
- Périmètre : 7 fichiers, tous dans fichiers_autorises ; routes.ts, openapi.*, app.ts et contrat.test.ts non touchés ; rien dans .github/, aucune dépendance. perimetre.mjs en mode PR : vert (7 fichiers, 230 lignes, maximum 300). Aucune ligne « - - ».
- Fiche sur la branche : seul le statut passe à fait. pieces-branchement.test.ts : seul l'identifiant change (p1 devient piece-001). Journal : 8 lignes.
- Critères relancés au SHA relu (Node 24) : les 6 tests nommés verts (dont serveur-repond-aux-pieces par Fastify inject) ; routesEcritureSansEnTete() reste [] ; pnpm contrat:openapi sans écart ; pnpm verifier : « tout est vert (24 étapes) » au second passage, le premier rouge seulement sur un test web de délai hors diff (e19), vert relancé seul. CI verte au SHA relu.
- Tests réels : chaque cassure fait rougir un test (tri, départage par id, accents, casse, chaque filtre du/au/etat/type/montantMin/montantMax, decalage, limite, total, champs et fournisseur d'une pièce sensible, PIECE_INCONNUE).
- Exactitude : tri recuLe décroissant puis id ; filtres combinés ; recherche sans accent ni casse ; limite 50 par défaut, total avant découpage ; détail sensible avec champs vides et sans fournisseur, validé par PieceDetail ; signature routesPieces() gardée ; PIECE_INCONNUE en 404 ; pas de pourcentage de confiance.
- Corrections de l'ancien avis : service et branchement faits ; 6 tests nommés faits ; journal fait.
- Aucun mot interdit, prix, secret ni nom réel ; it importé sans alias. Corps de PR avec Fiche et V3-DOC-010, V3-QUA-004, V3-IMP-022.

Non bloquant :
1. La branche porte 857 commits de l'ancien historique de main (réécrit depuis). Le diff contre la base est propre, mais il faut fusionner en squash, jamais par commit de fusion.
2. packages/contrat/src/__tests__/pieces.test.ts:37-45 : l'inclusion des bornes du/au n'est pas testée (la mutation < en <= survit).
3. pieces-service.ts:58 : une pièce sensible garde son fournisseur dans la liste (la fiche ne demande le masquage que dans le détail) ; à revoir avec la fiche des permissions.
