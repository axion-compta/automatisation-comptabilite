VERDICT: OK
SHA relu : 1180b6eb26fe452473b7c3c71c65aead92cc093b

PR de pilotage 968, déblocage de la fiche L15-T62 (SENSIBLE).

## Contrôles
- Corps de PR : « Fiche: L15-T62 ». Une seule fiche modifiée : `pilotage/fiches/L15-T62.md` (4 ajouts, 3 retraits), aucun autre fichier.
- Ligne `bloque_par` retirée du Contexte et remplacée par les décisions de Will du 09/11/2026 : D76 (J3a = oui, vraie base PostgreSQL, données fictives seulement), D42 (serveur d'Axion IA, base séparée), D29 (interface et faux service). Le motif d'origine reste en contexte.
- Nouvelle consigne À faire 3 : aucune adresse, machine, port, identifiant ni secret en dur ; réglages lus à un seul endroit ; catalogue des outils et circuit d'exécution contre une interface et un faux service. D29, D42, D76 respectées.
- `depend_de` : L15-T59 et L15-T60, `statut: fait` sur origin/main.
- `fichiers_autorises` : ajout de `routes.ts`, `app.ts`, `registre.json`, comme le prévoyaient les Pièges de la fiche d'origine. Dans le lot 15, recoupement seulement avec L15-T69 (`fait`). Ces fichiers communs sont aussi cités par des fiches `a_faire` d'autres lots (L04, L06, L09, L10, L11, L05-T67), comme d'habitude pour ces points de branchement ; la garde l'accepte (CI `gardes` verte).
- Aucune route d'inscription, aucun prix, aucun secret, aucun mot interdit. `taille_max_lignes: 300` inchangée et raisonnable. Statut et critères inchangés, testables (ALR-01 à ALR-11, 409, 403).
- CI verte (9/9) au SHA relu.

## Défauts
Aucun.

## Remarques
- pilotage/fiches/L15-T62.md:29 : « seulement ceux du catalogue C4 » ; le catalogue réel n'existe pas encore (D29). Préciser que les outils sont ceux du faux catalogue écrit contre l'interface, pour qu'un auteur ne crée pas d'outil hors catalogue faute de liste.
