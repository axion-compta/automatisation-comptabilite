VERDICT: OK
PR: 928 — fiche L12-T48 (lot-12/L12-T48), fiche SENSIBLE : fusion par Will seul
SHA relu: 57a44a09213a1e9b9582d5490cfa2250672589e6

## Vérifications
- Fichiers modifiés : les 7 sont dans fichiers_autorises ; rien dans apps/serveur/src/base/migrations.
- Taille : 251 lignes ajoutées, 1 retirée (max 380) ; aucun octet NUL.
- Journal : 7 lignes, commence par « # Journal L12-T48 », cite D29 et J3a du 07/11/2026.
- Tests : 17 verts (11 nommés dont CT-40, 6 sur le texte SQL, sans aucune base).
- Critère « modification-refusee rougit si le refus est retiré » : vérifié (CT-40 et modification-refusee rougissent).
- Autres mutations (toutes rougissent puis annulées) : filtre société retiré (isolation-societe) ; validation ligne par ligne au lieu du lot entier (lot-tout-ou-rien) ; copies retirées (copie-non-modifiable) ; écart non entier accepté (ligne-invalide) ; déclencheur SQL sans DELETE (declencheur-update-delete).
- Cas limites présents : NaN, ±Infinity, non entiers, versionRegle 0, champs vides et espaces, lot vide, société vide ou espaces sur les 4 méthodes.
- Règle 13 (CONSIGNE-AUTEUR3) : interface + adaptateur en mémoire, SQL en texte jamais exécuté, aucune adresse ni secret, données fictives (societe-a, R1, p1).
- Aucun prix, aucun mot interdit, aucune valeur légale en dur.
- CI au moment de la relecture : gardes, tests, lint, types, e2e, stryker, gitleaks, licences verts ; verifier encore en file : à confirmer vert avant fusion.

## Remarques (non bloquantes)
- sql/a_compta-journal-verification.sql:28 : le déclencheur ligne à ligne ne bloque pas TRUNCATE ; à prévoir (BEFORE TRUNCATE ... FOR EACH STATEMENT, ou droits) dans la fiche de l'adaptateur réel.
- horodatage est en `text` : l'ordre de l'historique suppose un format ISO homogène ; à fixer avec le vrai schéma.
