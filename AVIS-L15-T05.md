VERDICT: A CORRIGER
19208406485fe9ffb3c3d821a892cebaff796c4a

# Avis PR 1042 (L15-T05, sortie du lot 15)

Relu au SHA de tête ci-dessus, fiche lue sur origin/main (`sensible: non`, `tests_requis: non`). Aucun avis antérieur sur `avis/L15-T05`.

## Ce qui est tenu
- Périmètre : 3 fichiers, tous dans `fichiers_autorises`. Taille : 37 + 1 = 38 pour un maximum de 120. Aucune ligne « - - ». Bloc « Lot 15 » de 28 lignes (30 au plus). Aucun mot interdit, aucun prix, aucune date de livraison annoncée. Journal : 8 lignes, commence par `# Journal L15-T05`. `statut: fait` posé. CI verte (run 43079060892). La branche se fusionne sur main sans conflit.
- **Cas déclarés couverts : aucun.** Les 111 cas sont tous marqués « non établi ». Rien n'est donc affirmé sans test. Vérifié : le texte de la spec 15 n'est pas dans le dépôt, et `X13b` et `R06b` ne figurent que dans les fiches L15-T05, L15-T60 et L15-T68. Les tests `it('P01')`… de `packages/noyau/src/profil/__tests__/banc/` appartiennent au banc du profil, pas à la spec 15. Ils ne contredisent pas le tableau. Les cas S restent « en attente », comme la fiche le demande.
- **Mesures recalculées** avec l'API de recherche (PR fusionnées titrées « L15- », arrêt au 11/11/2026 17:57 UTC) : 75 PR, 64 fiches L15 distinctes, médiane 39,6 min ; 29 PR de fiches sensibles à 65,3 min, 39 non sensibles à 39,4 min, 7 PR L00 de création de fiches. Les chiffres du bloc sont exacts.

## Défauts bloquants
Main a avancé depuis la base de la PR (91ff466) : #1022 (L15-T65) et #1032 (L00-T83) sont fusionnées. Le bloc ne décrit plus l'état réel. Or le premier critère de la fiche demande ce qui est fait et ce qui reste bloqué, avec le motif de chaque blocage. Il faut fusionner origin/main, relire les en-têtes et corriger `REPRENDRE.md` :
1. `REPRENDRE.md:155` : « 63 `statut: fait` avant cette PR, 64 avec L15-T05 ; restent T62, T63, T64, T65, T67, T68 ». Sur main : 64 faites avant la PR, 65 avec elle ; T65 est faite ; restent T62, T63, T64, T67, T68.
2. `REPRENDRE.md:160` : « T65 : PR #1022 ouverte, non fusionnée » est faux (fusionnée, `statut: fait`). Retirer la ligne.
3. `REPRENDRE.md:163` : « La PR #1032, ouverte… relire les fiches après sa fusion ». Elle est fusionnée : remplacer cette ligne par les motifs relus.
   - `REPRENDRE.md:159` : T64 est débloquée (D42/D43/D29/J3a, contre une interface et un faux) et n'attend plus que ses dépendances.
   - `REPRENDRE.md:161` : le motif de T67 est désormais `bloque_par` : `Coque.tsx` et `coque.test.tsx` sont dans les `fichiers_autorises` de L06-T45 (lot 06), et non plus « recoupement avec le lot 07 ».
4. `REPRENDRE.md:173-176` : la colonne « Attente » dit « L15-T68 (bloquée) ». Sur main, L15-T68 est débloquée : elle est à faire et attend T62, T63 et T64. Écrire « attend L15-T68 (à faire, dépend de T62 à T64) », ou la formule que la fiche impose si T68 redevient bloquée.

## Remarques
- Les mesures de délai viennent d'une requête à l'API, pas d'un test. C'est normal pour un délai de fusion, mais la requête exacte n'est pas écrite. Ajouter dans le journal la requête et l'heure d'arrêt (`is:pr is:merged "L15-" in:title`, fusion avant 17:57 UTC), pour qu'on puisse la rejouer.
- Le tableau des cas regroupe par famille au lieu d'une ligne par cas. C'est acceptable tant qu'aucun cas n'est couvert, mais L15-T68 devra passer à une ligne par cas.
