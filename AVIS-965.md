VERDICT: OK
SHA relu : d3e13e24cb9d5c493450e04de8947babb070aac9

PR de pilotage 965, nouvelle fiche L07-T42 (SENSIBLE) : port de la console, port neutre des bases clients, faux service, suite de contrat.

## Contrôles
- Corps de PR : « Fiche: L07-T42 ». Une seule fiche, ajout seul (34 lignes, 0 retrait).
- `depend_de` : L07-T00 et L00-T50, `statut: fait` sur origin/main.
- `fichiers_autorises` : port.ts, memoire.ts, suite et test sous `packages/noyau/src/mise-en-service/`, sans recoupement avec une fiche du lot 07 ni avec L07-T41, T43, T44.
- Aucune route d'inscription, aucun prix, aucun secret ; seule adresse citée : `https://console.exemple.invalid`, fictive et réservée aux tests. Aucun mot interdit.
- D29 (interface et faux service) : respectée (port, faux en mémoire, suite réutilisable par l'adaptateur réel). D42 (serveur d'Axion IA, rien en dur) : port neutre `PortBaseClient`, aucun nom d'hébergeur, pas de `process.env`. D73 : rappelée dans le contexte.
- Critères testables : dix appels simultanés, panne entre création et migrations puis rejeu, migrations rejouées, absence d'import de `apps/` et de `process.env`.
- `taille_max_lignes: 300` raisonnable. CI verte au SHA relu.

## Défauts
Aucun bloquant.

## Remarques
- Défaut connu, accepté : pilotage/fiches/L07-T42.md:23 dit « À faire APRÈS la fusion de L07-T41 » sans mettre L07-T41 dans `depend_de` (pilotage/fiches/L07-T42.md:11). Il ne bloque pas cette PR, mais il le deviendra si elle est fusionnée avant que la fiche L07-T41 soit sur main : toutes ses dépendances étant faites, une routine auteur du couloir B pourrait la prendre aussitôt. Or la fiche L07-T41 (PR 964) est à corriger. Conseil : fusionner 964 d'abord, puis ajouter `L07-T41` à `depend_de` de L07-T42 (une ligne) avant ou juste après la fusion de 965.
- pilotage/fiches/L07-T42.md:31 : « fiche bloquée à part (D29, D42, J3a) ». Depuis D76 du 09/11/2026 (J3a = oui : vraie base PostgreSQL, données fictives), le motif J3a n'est plus bloquant pour l'adaptateur réel ; mettre à jour la mention quand cette fiche sera écrite, et prévoir que `suiteMiseEnService` tourne aussi contre une vraie base PostgreSQL remplie de données fictives.
