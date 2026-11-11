# BLOQUE-L15-T62
1. Cause : le catalogue des outils C4 (packages/contrat/src/chat/outils.json, 7 outils) et registre.json n'ont aucun outil qui exécute les actions principales des alertes (ouvrir_declaration_tva, rattacher_piece, ouvrir_mois, ouvrir_echeance, relire_piece, completer_piece, verifier_capitaux, relancer_client, payer_facture, ouvrir_rapprochement, lire_commentaire : packages/noyau/src/alertes/catalogue.ts).
2. La fiche interdit tout nouvel outil (« seulement ceux du catalogue C4 ») : le critère « 100 % des alertes MVP résolubles par leur action principale » est donc impossible.
3. outils.json (déclaration et schémas des outils) n'est pas dans les fichiers_autorises ; registre.json n'est autorisé que pour « brancher » un outil qui n'existe pas encore.
4. ALR-09 (payer_facture, argent) exigerait un outil d'écriture de niveau B ou M, décision de produit à prendre par Will.
5. Taille : fragment OpenAPI d'une route avec ses erreurs ≈ 85 lignes (reporter en fait 83 dans openapi.json), plus contrat, serveur, 11 cas ALR-01 à ALR-11 + 409/403/409 : mesure ≈ 300+ pour 300 max.
6. À changer : (a) ajouter outils.json et schémas de packages/contrat/src/chat/outils.ts aux fichiers_autorises ; (b) Will décide la liste des outils d'action par code ALR (nouveaux outils autorisés) ; (c) relever taille_max_lignes à 450 ou scinder en deux fiches (contrat+OpenAPI, puis serveur+tests).
Dépendances T59 et T60 : faites. Aucune PR ouverte concurrente vérifiée sur ces fichiers.
