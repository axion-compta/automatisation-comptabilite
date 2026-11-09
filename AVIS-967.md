VERDICT: OK
SHA relu : 71fec2a3d2477a5560f09fa3ddd08f4321d680f0

PR de pilotage 967, nouvelle fiche L07-T44 : bloc commercial déclaré dans le manifeste, validé par le faux hôte.

## Contrôles
- Corps de PR : « Fiche: L07-T44 ». Une seule fiche, ajout seul (33 lignes, 0 retrait).
- `depend_de` : L07-T00 et L00-T51, `statut: fait` sur origin/main.
- `fichiers_autorises` : `apps/serveur/src/module-c4/manifeste.ts`, `outils/faux-hote-c4/contrat.mjs`, `outils/faux-hote-c4/test/manifeste-compta.test.mjs` (existants), fiche et journal. Aucun recoupement avec une fiche du lot 07 ; ailleurs, seules L00-T51 et L00-T52 (faites) citent ces fichiers.
- Aucun prix, tarif ni marge (critère explicite et refus des clés de prix dans le faux hôte). Aucune route d'inscription, aucun secret ni adresse, aucun mot interdit.
- D73 : modes d'arrivée `installation_axion` et `libre_service` déclarés. D29 : validé contre le faux hôte, `VERSION_CONTRAT` inchangée, hypothèse D74 notée « non vérifiée ». `actif: false` et interrupteur fermés.
- `taille_max_lignes: 200` raisonnable. Critères testables. CI verte au SHA relu.

## Défauts
Aucun bloquant.

## Remarques
- Défaut connu, accepté : pilotage/fiches/L07-T44.md:23 dit « de préférence APRÈS L07-T42 et L07-T43 » sans les mettre dans `depend_de` (pilotage/fiches/L07-T44.md:11). Non bloquant : la fiche ne touche pas leurs fichiers ; seul risque, des noms d'opérations ou de champs qui divergent. Conseil : reprendre dans le bloc les noms exacts fixés par L07-T41 (`creerEspace`, `inviter`, `suspendre`, `geler`, `supprimer`) et, une fois L07-T42 et L07-T43 sur main, les ajouter à `depend_de`.
- pilotage/fiches/L07-T44.md:16 : « coût en micro-centimes » décrit un champ d'événement de consommation, pas un prix ; préciser dans les Pièges qu'aucune valeur chiffrée n'est écrite dans le manifeste, seulement le nom et l'unité du champ.
