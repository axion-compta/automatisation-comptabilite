VERDICT: A CORRIGER
3b62f41b9997d16582c2cc72187f5766cfcea705

# Avis PR 1042 (L15-T05, sortie du lot 15) : troisième relecture

Relu au SHA de tête ci-dessus, après la correction qui répond à l'avis A CORRIGER du SHA 8814f8a (e87a92f). Fiche lue sur origin/main (19292eb). En-têtes des fiches L15 relus sur 19292eb.

## Points de l'avis précédent
1. Compte : CORRIGÉ. « 65 avant cette PR, 66 avec L15-T05 ; restent T62, T63, T67, T68 » : juste sur main (65 `fait`, 5 `a_faire` dont T05).
2. Ligne T64 « faite (PR #1043) » : CORRIGÉ.
3. « dépend de T62 et T63 (T64 à T66 faites) » : CORRIGÉ (`depend_de` de T68 relu : T60 à T66, seules T62 et T63 `a_faire`).
4. #1043 citée et SHA de main relu (f77e2dd) : CORRIGÉ.
5. Journal aligné (65 faites, f77e2dd) : CORRIGÉ.

## Défaut bloquant
`REPRENDRE.md:158` : « T63 (envoi du résumé) : PR #1047 ouverte ». La PR #1047 (L15-T63) est FUSIONNÉE depuis le 11/11/2026 20:38 UTC, avant le commit de correction (21:20 UTC) ; la fiche L15-T63 est restée `statut: a_faire` sur main. Le premier critère (ce qui est fait et ce qui reste) n'est donc pas tenu sur cette ligne.
Correction demandée :
- ligne 158 : « T63 (envoi du résumé) : code fusionné (PR #1047), fiche encore `statut: a_faire` sur main (statut à passer à `fait`) ; point P2, aucun fournisseur d'e-mail choisi ; écrite contre une interface d'envoi et un faux » ;
- ligne 162 : citer #1047 parmi les PR fusionnées ;
- le compte de la ligne 154 reste juste (il suit les en-têtes de fiches) ; si la fiche T63 passe à `fait` avant la fusion, l'aligner (66 avant, 67 avec ; T68 dépend de T62 seule).

## Contrôles
- Périmètre : 3 fichiers, tous dans `fichiers_autorises`. Taille : 27 + 2 = 29 lignes (max 120), aucune ligne « - - ». Bloc « Lot 15 » : 27 lignes (30 au plus). Total du tableau : 41 + 26 + 19 + 25 = 111. Cas S « en attente », comme le demande la fiche.
- Aucun mot interdit, aucun prix, aucune date de livraison. Journal : 8 lignes, commence par `# Journal L15-T05`. `statut: fait` posé.
- CI au SHA relu : les 9 jobs verts.

## Remarques
- Mesures arrêtées au 11/11/2026 17:57 UTC : depuis, #1022, #1043 et #1047 (L15) sont fusionnées. Non bloquant : la fenêtre est écrite.
