VERDICT: OK
SHA relu : 2af064d870b67e26d510f1b1ec94f52bc4b1e15c

PR de pilotage 966, nouvelle fiche L07-T43 : lecture de l'offre de la console et faux service.

## Contrôles
- Corps de PR : « Fiche: L07-T43 ». Une seule fiche, ajout seul (33 lignes, 0 retrait).
- `depend_de` : L07-T00, L07-T08, L07-T09, toutes `statut: fait` sur origin/main. Les fiches citées hors dépendance (L07-T18, L07-T19, L07-T28) existent.
- `fichiers_autorises` : offre.ts, offre-memoire.ts et leur test sous `packages/noyau/src/abonnement/`, nouveaux, sans recoupement avec une fiche du lot 07.
- Aucun prix : le module LIT l'offre et refuse toute clé `prix`, `montant`, `tarif`, `marge`. Aucune route d'inscription, aucun secret ni adresse, aucun mot interdit.
- D29 : faux service d'offre en mémoire. D73 : modes d'arrivée acceptés dans le type `Offre`. D42 : rien en dur. Unité du quota laissée en paramètre (D71, à confirmer par Will).
- Critères testables (clé inconnue, booléen strict, `modeIa`, `actionChangement`, refus fermé par défaut). `taille_max_lignes: 250` raisonnable. CI verte au SHA relu.

## Défauts
Aucun.

## Remarques
- pilotage/fiches/L07-T43.md:16 et :33 : le critère fait refuser une clé `prix` (donc le test contiendra ce mot) alors que les Pièges interdisent « prix » dans le code par un test de lecture du source. Préciser que ce test lit `offre.ts` et `offre-memoire.ts`, pas le fichier de test.
- pilotage/fiches/L07-T43.md:16 : aucun critère ne vérifie les modes d'arrivée (D73). Ajouter « modes d'arrivée : seulement `installation_axion` et `libre_service`, sinon refus », en cohérence avec L07-T44.
