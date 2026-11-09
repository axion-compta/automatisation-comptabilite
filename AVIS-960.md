VERDICT: OK
SHA relu : 8e426095f890ffda0ad34186f05099e1d8d6c98a

PR 960, PR de pilotage qui lève le blocage de la fiche sensible L15-T61 (relecture renforcée).

## Contrôles
- Un seul fichier modifié : pilotage/fiches/L15-T61.md (+2 -1), un seul commit ; en-tête inchangé (statut `a_faire`, `sensible: oui`, `fichiers_autorises`, `taille_max_lignes`, `criteres` identiques).
- pilotage/fiches/L15-T61.md:20 : la ligne `bloque_par:` est remplacée par la décision de Will du 09/11/2026 (D42 serveur d'Axion IA avec base séparée, D29) et J3a du 07/11/2026 avec ses quatre conditions (données fictives, relecture Opus, pas de production sans J10, interface + faux service) ; motif d'origine gardé en contexte. La garde `estBloquee` (outils/gardes/fiches.mjs:24) ne la voit plus bloquée.
- pilotage/fiches/L15-T61.md:26 : règle de séparation ajoutée, mot pour mot celle déjà fusionnée sur main dans L04-T51, L04-T52, L05-T56, L05-T57, L05-T65.
- depend_de : L15-T59, L00-T49, L00-T53 tous `statut: fait` sur origin/main.
- Fiche inchangée sur main depuis la base de la branche : pas de conflit ; PR fusionnable.
- Mots interdits, prix, secrets, adresses de serveur : aucun.
- CI au SHA relu : 9 contrôles verts.

## Remarques
- Fiche sensible : fusion par Will seul.
- L'entrée L15-T61 de outils/gardes/fiches-exceptions.json devient sans objet une fois la fiche débloquée ; à retirer dans une fiche dédiée (hors périmètre de cette PR).
