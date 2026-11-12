VERDICT: OK

PR #1092, fiche L11-T35, relue au SHA de tête f7928bf0aa13d63b5a11a3b0505056310a346a5d (première relecture, relecteur Opus).

## Vérifié
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; diff de 58 lignes pour une limite de 120. Aucun code.
- `REPRENDRE.md` : section du lot 11 seule, 10 lignes ; aucun autre bloc touché.
- Faits recoupés sur main : 46 fiches L11 ; `a_faire` = T35, T38, T39, T40, T41, T45. `bloque_par` de T39 = D43, D42 et `bloque_par` de T41 = T39, comme écrit dans les fiches. Banc NF 20 sur 20 confirmé par le journal de L11-T20.
- `pilotage/calibrage.csv` : en-tête et colonnes existantes conservés (consigne de la fiche) ; 40 lignes ; médiane recalculée à 22,05 min, cohérent avec les 22,1 annoncés.
- Mesures non faites marquées « non mesurés » ; aucune date de livraison annoncée ; aucun prix, aucun mot interdit, aucun nom réel. Journal de 5 lignes, commence par `# Journal L11-T35`.

## Remarques (non bloquantes)
- Colonne `decision` : `fusionnee` alors que `ligneCalibrage` (portier) écrit `fusion`. À harmoniser plus tard.
- L11-T45 (PR #945 fusionnée) n'a pas de ligne. C'est cohérent avec « une ligne par fiche faite », mais il faudra l'ajouter quand son statut passera à `fait`.
- Conflit attendu avec la PR #1089 (L08-T41), qui remplace l'en-tête de ce même fichier. L'avis A CORRIGER de #1089 lui demande de garder l'en-tête : la version de cette PR fait foi.
