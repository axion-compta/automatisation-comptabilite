VERDICT: OK
SHA relu : cf158c6eddb221b4408cd1368e38200c7eabfe91

PR #834 (pilotage/L04-T30) : un seul fichier modifié, pilotage/fiches/L04-T30.md (+3 / -2).

Vérifications :
- Frontmatter : 15 champs dans l'ordre attendu ; les 5 tableaux (exigences, depend_de, fichiers_autorises, nouvelles_dependances, criteres) sont du JSON valide ; aucun guillemet double interne dans titre ni lot.
- fichiers_autorises ajoute seulement apps/serveur/src/__tests__/pieces-branchement.test.ts.
- piece-001 existe : genererPieces() (packages/donnees-fictives/src/pieces.ts:119) construit les id `piece-${i+1}` sur 3 chiffres, donc i = 0 donne piece-001, présent avec la graine par défaut. C'est le premier scénario, non sensible ; même une pièce sensible répondrait 200 avec masquage.
- Le test routes-pieces-branchees n'est pas affaibli : l'item 5 limite le changement à p1 -> piece-001 (« aucune autre ligne ne change »). GET /pieces reste différent de 404, la plage de dates inversée reste en 400 et POST /pieces reste en 404. Le test vise toujours une pièce existante, et piece-inconnue-404 couvre le 404 PIECE_INCONNUE.
- Autres fiches : sur origin/main, seules L04-T55 (statut fait) et L00-T55 (sa fiche de création) citent pieces-branchement.test.ts. L04-T31, L04-T32, L04-T34 et L04-T50 ne citent ni ce test ni l'id p1, donc aucun impact.
- Mots interdits (conforme, sans erreur, garanti, juriste, PDP) : absents. Aucun prix.
- Base de la PR (fac4a01) contenue dans origin/main ; la fiche, le test et le générateur n'ont pas changé depuis.

Remarques (non bloquantes) :
- Les éléments « À faire » sont renumérotés de 5 à 6 ; le critère « les 6 tests nommés passent » reste juste, car l'item 5 ne crée pas de nouveau test nommé.
