VERDICT: OK

PR #1053 — L06-T37 — SHA de tête relu : 56c0eb9c8c4aed754ba618e884b82f9faed2c25c
SENSIBLE (fiche `sensible: oui`) : fusion par Will seul.

## Vérifications
- Fichiers : les 4 fichiers du diff sont dans `fichiers_autorises`. Taille : 179 lignes ≤ 200.
- Dépendances L06-T36, L06-T09, L00-T50 : `statut: fait` sur main.
- Tests nommés de la fiche présents : `six-minutes-refuse-quatre-minutes-permis`, `export-fec-ancienne-connexion-refuse` (C14), `recuperation-recente-bloque`, `operation-ordinaire-non-touchee` ; T-CNX-3 couvert (sensible au-delà du réglage refusé, sur les 8 opérations).
- Aucun délai en dur : délai, attente et code d'erreur lus à chaque appel dans `PortReglagesConsole` (test dédié qui change le réglage entre deux appels).
- Refus par défaut : sans session, sans mfa, authTime futur, console en panne, réglage NaN → 401.
- Tests ciblés : 9/9 verts (vitest). CI : verifier, tests, types, lint, gardes, stryker, gitleaks verts.
- Mutations (toutes détectées) : sauter `cloturer` (2 rouges) ; code d'erreur remplacé (2 rouges) ; panne console → réglage permissif (1 rouge) ; signal de récupération ignoré (1 rouge) ; validation de `reauthMaxMs` retirée (1 rouge).
- Aucun mot interdit, aucun prix, aucun secret ; données fictives. Journal : 8 lignes, commence par `# Journal L06-T37`.

## Remarques (non bloquantes)
- apps/serveur/src/securite/reauthentification.ts:59 : `exigerNiveau` est appelé hors du `try`. Si `derniereRecuperationMs` (ou l'horloge) n'est pas un entier (ex. NaN), `exigerNiveau` lève `argument_invalide` et la réponse est un 500, sans événement `securite.reauth_refusee`. La requête reste refusée (pas de fuite), mais un 401 tracé serait plus cohérent ; à traiter dans une fiche ultérieure si souhaité.
- Le branchement dans `app.ts` et la pose des étiquettes sur les routes restent à faire (hors périmètre, noté au journal).
