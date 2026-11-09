VERDICT: OK
PR: 676 — fiche L15-T38 (lot-15/L15-T38)
SHA relu: 345356ea33d97fe2c9f0a07a40f36cd5532569b7

## Constat sur le périmètre demandé
- La consigne de relecture présentait cette PR comme l'écran N08 « Chercher ou demander », sensible. La fiche L15-T38 sur la branche dit autre chose : `sensible: non`, « Faux serveur : recherche globale, suite commune », hors périmètre « Pas d'écran » ; l'écran N08 relève de L15-T54.
- La PR ne contient aucun code d'écran : la comparaison avec la maquette est sans objet ici. De plus, `apercu/v2/maquettes/lot-01/N08.dc.html` et des captures N08 sont absents du dépôt (ni sur main ni sur la branche) : à vérifier lors de la relecture de L15-T54.
- garde:portes : verte localement sur la tête de branche (9 portes valides, dont pilotage/portes/n08.json sur main, daté 2026-11-09, valideur Will) ; job CI « gardes » vert. La porte n08 est bien requise ici puisque la PR touche packages/faux-serveur/.

## Vérifications
- Fichiers modifiés (diff contre main) : recherche.ts, suite-recherche.ts, recherche.test.ts, fiche, journal : tous dans fichiers_autorises ; handlers.ts et contrat-commun.test.ts non touchés.
- Taille : 164 lignes ajoutées, 7 retirées (max 270) ; aucun octet NUL. La branche a été remise à jour avec main par fusion (pas de force-push).
- Journal : 6 lignes, commence par « # Journal L15-T38 ».
- Critère « suite commune sur le vrai serveur ET sur le faux » : suite commune verte, 8 cas par cible (16), plus 3 tests propres au faux ; suite faux-serveur complète : 353 verts, 2 todo hors recherche.
- Mutations (toutes rougissent puis annulées) : corps invalide accepté en 200 ; curseur altéré accepté ; corps renvoyé dans la réponse d'erreur.
- Cas limites : bornes de q (1, 0, 200, 201 caractères, emoji), types inconnus, limite 0 / 21 / 1,5, corps non JSON, curseur altéré, extrait hostile échappé, pièce sensible exclue.
- Règle 13 (CONSIGNE-AUTEUR3) : faux service seulement, adresses de test en exemple.fr, aucun secret, aucun console.log du corps, données fictives (« Camille Fictif »).
- Aucun prix, aucun mot interdit.
- CI au moment de la relecture : e2e, gardes, lint, types, stryker, gitleaks, licences verts ; tests encore en cours : à confirmer vert avant fusion.

## Remarques (non bloquantes)
- recherche.ts:10 : le paramètre `options` est ignoré (`void options`) ; sans effet tant qu'aucun réglage n'est passé.
