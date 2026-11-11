VERDICT: A CORRIGER
8814f8a7697891a34ff04fc306b9538878e433cb

# Avis PR 1042 (L15-T05, sortie du lot 15) : seconde relecture

Relu au SHA de tête ci-dessus, après la correction qui répond à l'avis A CORRIGER du SHA 1920840. Fiche lue sur origin/main (82aa0a7). `sensible: non`, `tests_requis: non` : la « mutation » consiste ici à confronter chaque affirmation du bloc aux en-têtes des fiches sur main.

## Défauts de l'avis précédent : tous corrigés au moment du push (main 253fbf4)
1. Compte « 64 avant, 65 avec » et T65 retirée de la liste : juste sur 253fbf4.
2. Ligne « T65 : PR #1022 ouverte » retirée.
3. Ligne #1032 remplacée par les motifs relus : T64 débloquée, T67 `bloque_par` (Coque.tsx dans L06-T45) : juste.
4. Colonne « Attente » : « attend L15-T68 (à faire, dépend de T62 à T64) » : juste sur 253fbf4.
- Remarque traitée : requête et heure d'arrêt des délais écrites au journal.

## Défaut bloquant (nouveau, PAS une faute de l'auteur)
Main a de nouveau avancé après le push : #1043 (L15-T64) est fusionnée à 20:10 UTC et `pilotage/fiches/L15-T64.md` est `statut: fait` sur main (82aa0a7). Relevé sur main : 65 fiches L15 faites, 5 à faire (T05, T62, T63, T67, T68). Le premier critère de la fiche (ce qui est fait et ce qui reste) n'est plus tenu. Fusionner origin/main, puis dans `REPRENDRE.md` :
1. `REPRENDRE.md:155` : « 64 `statut: fait` avant cette PR, 65 avec L15-T05 ; restent T62, T63, T64, T67, T68 » → « 65 avant cette PR, 66 avec L15-T05 ; restent T62, T63, T67, T68 ».
2. `REPRENDRE.md:159` : la ligne T64 doit dire « faite (PR #1043) » ou sortir de la liste des fiches en attente.
3. `REPRENDRE.md:161` et `172-175` : « dépend de T62 à T64 (T65 et T66 faites) » → « dépend de T62 et T63 (T64 à T66 faites) ».
4. `REPRENDRE.md:162` : citer #1043 parmi les PR fusionnées et le SHA de main relu.
5. `pilotage/journal/L15-T05.md` : « 64 faites avant cette PR (main 253fbf4) » à aligner.
Avant fusion, relire aussi la ligne T63 : si #1047 est fusionnée d'ici là, T63 devient faite.

## Contrôles
- Périmètre : 3 fichiers, tous dans `fichiers_autorises`. Taille : 36 + 1 = 37 pour un maximum de 120. Bloc « Lot 15 » : 27 lignes (30 au plus). Aucune ligne « - - », aucun mot interdit, aucun prix, aucune date de livraison. Journal : 8 lignes, commence par `# Journal L15-T05`. `statut: fait` posé. Total du tableau : 41 + 26 + 19 + 25 = 111 ; cas S « en attente ». Fusion avec main sans conflit (mergeable : clean).

## Remarques
- Ligne T63 : on peut signaler que la PR #1047 est ouverte.
