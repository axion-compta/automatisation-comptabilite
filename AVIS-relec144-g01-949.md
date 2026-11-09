VERDICT: OK
SHA relu: f577616ff15c18218a8c9a03e3bc51e671c5aab4
PR: 949 — L07-T22 Garde d'état d'accès sur toutes les routes (fiche sensible : à fusionner par Will seul)

## Vérifications
- Fichiers modifiés : 10, tous dans `fichiers_autorises` ; `serveur.test.ts` et `faux-serveur.test.ts` inchangés ; aucune route ni le contrat modifiés.
- Taille : 283 lignes ajoutées, 1 retirée, limite de la fiche 300.
- CI du SHA de tête : verifier, licences, stryker, e2e, lint, gardes, types, gitleaks, tests tous verts.
- Tests locaux (5 fichiers dont les suites existantes) : 38/38 verts ; les 9 tests nommés sont présents.
- Mutations, toutes rouges : route inconnue → `lecture` ; paramètres `{id}` acceptant n'importe quel segment ; double étiquette tolérée ; refus ignoré dans `app.ts` ; refus ignoré dans le faux serveur ; scénario ignoré par la garde du vrai serveur.
- Fermé par défaut vérifié à la main en LECTURE_SEULE sur `POST /ecritures` : variantes `/ecritures/`, `//ecritures`, `/ecr%69tures`, `/ECRITURES`, `/./ecritures`, `/x/../ecritures`, `?`, `#`, `;`, et méthodes HEAD et OPTIONS → toutes 403 `ETAT_ACCES`.
- Table des 92 routes (`contrat` + `contratChat`) : aucune paire de routes de même méthode dont les chemins se recouvrent, donc aucun risque qu'une requête prenne la classe permissive d'une autre route.
- Le vrai serveur et le faux serveur lisent l'état par le même service d'accès et le même scénario que `GET /acces` ; corps de refus identique (testé). Panne `x-panne` 403 `FORBIDDEN` distincte et testée.
- Aucun secret, aucun prix, aucun mot interdit, aucun octet NUL ; données fictives (`exemple.fr`, « Achat fictif »).
- Règle 13 (CONSIGNE-AUTEUR3) : état d'accès lu par le service fictif, sans accès direct à la console.
- Journal : 7 lignes, commence par `# Journal L07-T22` ; il signale les POST sans étiquette refusés en lecture seule, comme la fiche le demande.

## Remarques (non bloquantes)
- La garde du vrai serveur passe avant le routeur : une route inconnue renvoie 403 `ETAT_ACCES` au lieu de 404 dans les états restreints. C'est le « fermé par défaut » voulu par la fiche, et c'est testé (`route-inconnue-fermee-par-defaut`).
- Le chat (`contratChat`) est classé lui aussi : ses POST sont refusés hors accès complet. À confirmer par le concepteur si une action du chat doit rester permise (étiquette à poser dans une autre fiche).
