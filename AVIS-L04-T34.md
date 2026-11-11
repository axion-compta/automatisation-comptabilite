VERDICT: OK

PR #1059, fiche L04-T34, SHA de tête relu : 80720f546e0893964134eb52d9575033d4d10ba3

Fiche `sensible: oui` (montants) : la fusion revient à Will seul.

## Contrôles faits
- Fichiers modifiés : tous dans `fichiers_autorises`. Taille : 234 lignes hors fragment `openapi/lot-04/openapi.json` (77 lignes, compté à part par la garde), sous le plafond de 300.
- Les 7 tests nommés sont présents ; `montant-illisible-400` couvre `abc`, `NaN`, `Infinity` et la chaîne vide ; une date impossible (31/02) est refusée.
- `routesEcritureSansEnTete()` reste `[]` (test `en-tete-absent-400`) ; le serveur répond 400 sans `idempotency-key`.
- Tests ciblés : contrat 11 verts, serveur 2 verts. CI verte sur les 9 jobs, `verifier` compris.
- Mutations (chaque fois le test rougit) : contrôle de pièce sensible retiré, historique non alimenté, chemin virtuel non recalculé, motif `ht@`/`tva@` élargi, champ corrigé laissé `douteux`, montant illisible accepté (4 échecs).
- `pieces-service.ts` : seulement `pieceCourante` et `mettreAJourPiece`, comme demandé.
- Aucune valeur légale en dur (longueur max lue dans le réglage daté), aucun mot interdit, aucun prix, aucun secret ; auteur et dates fictifs.
- Journal : 7 lignes, commence par `# Journal L04-T34`.
- Aucun avis antérieur pour cette fiche.

## Remarques (non bloquantes)
- `GET /pieces/{id}` ne relit pas le stock corrigé : une correction n'est pas visible à la lecture suivante. La limite est signalée dans le journal, et le fichier concerné est hors périmètre. Elle demande une fiche de suite.
- Sur le vrai serveur, le hook existant `apps/serveur/src/securite/en-tetes.ts` remplace tout corps 400 par un `BAD_REQUEST` générique : le client ne voit jamais le code `VALEUR_ILLISIBLE`. Le comportement existait avant cette PR ; le test serveur ne vérifie que le statut.
- L'ordre des dates de service n'est pas contrôlé : `date_service_fin` peut être corrigée avant `date_service_debut`. La fiche ne le demande pas.
- La branche est en retard sur `main` ; à remettre à jour avant fusion si la CI l'exige.
