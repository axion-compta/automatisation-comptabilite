VERDICT: OK
SHA relu: f4e4827fca6adde37ce323228e7467650c3bd174

PR 985, fiche L07-T18 (branche lot-07/L07-T18), sensible : non. Relecture Opus locale, fiche lue sur origin/main.

Vérifié :
- Périmètre : 8 fichiers, tous dans fichiers_autorises. Ni handlers.ts, ni app.ts, ni le contrat (routes) touchés. Fusion propre avec origin/main actuel (c528b01).
- Taille : 211 lignes (maximum 280). Aucune ligne « - - », aucun octet NUL. Journal : 6 lignes, commence par « # Journal L07-T18 ».
- Critères : vitest volume-service.test.ts + commun-volume.test.ts au SHA relu (Node 24) : 19/19 ; suite commune jouée sur le vrai serveur ET sur le faux ; les 7 tests nommés présents et verts ; CI (tâche verifier) verte au SHA relu.
- Une seule logique : creerServiceVolume (contrat) appelle prevoirFinDeMois, seuilAtteint, etatQuota (dejaTraitees = utilise), palierSuperieur du noyau par chemin relatif ; le vrai et le faux serveur appellent ce même service. Horloge fixe injectée dans les tests.
- Tests réels : 3 mutations sur 4 détectées (filtre des alertes inversé : 7 rouges ; scénario ignoré côté faux : 3 rouges ; palier supérieur jamais nul : 1 rouge).
- Aucune clé cout, budget, jetons, montant ni prix dans la réponse (testé sur les 3 scénarios). Aucun mot interdit, prix, secret ni nom réel ; pas d'alias d'import de it/test. Corps de PR avec Fiche et V3-PLA-155, V3-PLA-156, V3-PLA-154.

Remarques (non bloquantes) :
1. volume-service.ts:23 : retirer 1 à prevision_fin_de_mois laisse les 19 tests verts ; aucun test ne fixe la valeur attendue de la prévision pour un scénario et une horloge donnés. Une valeur exacte (scénario volume=seuil, horloge 2026-06-15) renforcerait la suite.
2. Les tests palier-superieur-du-plus-grand-nul et palier-inconnu-refuse passent par construireVolume, pas par la suite commune ; acceptable car le service est le même pour les deux cibles.
