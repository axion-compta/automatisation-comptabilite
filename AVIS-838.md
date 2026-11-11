VERDICT: A CORRIGER
SHA relu: 11750a3c2a6076120e495912eb9112105c0f8159

PR 838, fiche L10-T33 (branche lot-10/L10-T33). Relecture Opus locale au nouveau SHA, fiche lue sur origin/main. L'avis précédent (relec101-g01-838) ne vaut plus.

Vérifié :
- Périmètre : 6 fichiers, tous dans fichiers_autorises. 241 lignes (maximum 320). Aucune ligne « - - ». Rien dans routes.ts, openapi.*, app.ts, ni dans les dépendances.
- Critères relancés : les 7 tests nommés, plus detail-complet et le test de branchement : 9/9 verts ; pnpm contrat:openapi sans écart ; routesEcritureSansEnTete() reste [] ; pnpm verifier en local : seul rouge, un test de durée hors PR (chat/filtre-sortie), vert relancé seul. CI verte au SHA relu.
- Tests réels : 13 mutations sur 14 font rougir un test (tri, filtres, avoir rattaché, dateReference, décalage, 404, ligne de TVA, avoirsLies).
- Exactitude : liste et détails valides pour ReponseVentes et VenteDetail ; état par etatAffiche à dateReference ; avoir rattaché sous sa facture, avoir orphelin dans la liste ; signature routesVentes() gardée ; VENTE_INCONNUE en 404 ; seul l'identifiant change dans ventes-branchement.test.ts.
- Corrections de l'ancien avis : service et branchement faits ; 7 tests nommés faits ; identifiant d'exemple VP-1-038 fait ; journal fait (9 lignes).
- Aucun mot interdit, prix, secret ni nom réel. Pas d'alias d'import de it/test.

Corrections demandées (bloquantes) :
1. pilotage/fiches/L10-T33.md:8 : passer « statut: a_faire » à « statut: fait » (seule ligne à changer ; consigne auteur, garde termine). Les dépendances sont déjà à fait sur main.
2. packages/contrat/src/domaines/ventes-service.ts:66-68 : l'écriture rendue pour VP-1-038 (FA-2026-0031, jeu fictif volontairement en écart de 1 centime sur le TTC) n'est pas équilibrée : débit 678401, crédit 678400. Le 411000 prend ttcCentimes alors que les crédits valent HT + TVA. Rendre chaque écriture équilibrée (dériver les lignes de façon cohérente, ou ne pas rendre d'écriture pour une pièce aux montants incohérents) et ajouter, dans packages/contrat/src/__tests__/ventes.test.ts, une vérification de l'équilibre sur toutes les pièces du jeu, pas sur une seule.

Non bloquant :
- Test filtre-par-etat : vérifier une valeur exacte de joursDeRetard (aujourd'hui seulement > 0 ; la mutation « constante 1 » survit).
- Comptes 411000 et 445710 codés en dur, TVA regroupée sur un seul compte : acceptable pour des données fictives, à noter au journal.
