VERDICT: A CORRIGER

PR #1098, SHA de tête 19ed860ab9da819901e55120e0a949ffed657967.

Ce qui est bon
- Diff : 1 fichier, 0 ajout, 1 suppression (`pilotage/fiches/L15-T67.md`, ligne `bloque_par:`), dans fichiers_autorises. Rien d'autre ne change.
- depend_de ["L15-T56", "L15-T54"] : les deux ont statut: fait sur origin/main.

Défauts
1. CI rouge : jobs `gardes` et `verifier`. Message : « garde:perimetre ROUGE - repli CORPS_PR refusé : la fiche L15-T67 n’est pas sensible ». La branche `pilotage/amende-L15-T67` n'est pas une branche de fiche, donc la garde se replie sur « Fiche: » du corps, repli réservé aux fiches sensibles (outils/gardes/perimetre.mjs:216-229). Ce n'est pas un défaut du contenu.
   Correction demandée : republier le même commit depuis la branche `lot-15/L15-T67` (absente du dépôt aujourd'hui), à supprimer après la fusion pour que l'auteur puisse la recréer, comme pour les PR de statut. Ne pas assouplir la garde.

Remarques (fichiers_autorises, à trancher par Will)
- `apps/web/src/socle/PanneauChat.tsx` n'existe pas encore ; Coque.tsx monte aujourd'hui `Discussion` (Coque.tsx:6). Pour que le panneau soit affiché dans l'application et que le critère « largeurs 56 px, 380 px et 50 % au plus vérifiées par capture » soit vérifiable, il faudra très probablement brancher le panneau dans `apps/web/src/socle/Coque.tsx` et adapter `apps/web/src/socle/__tests__/coque.test.tsx`. L06-T45 étant faite, le motif du blocage tombe : ces deux fichiers devraient être ajoutés aux fichiers_autorises (amendement séparé, ou ici si Will le veut).
- Attention : L16-T05 (a_faire, sensible: non) a aussi Coque.tsx dans ses fichiers_autorises. Ajouter Coque.tsx à L15-T67 rendrait deux fiches planifiables sur le même fichier : il faut fixer un ordre (dépendance ou planification l'une après l'autre).
