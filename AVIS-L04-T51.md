VERDICT: OK

PR #1108 (amendement de la fiche L04-T51), SHA de tête 0629d1ae31000a35f94c680c7f70cdc32f7d96f9 (branche pilotage/amende-L04-T51). Relecture du 12/11/2026, après l'avis A CORRIGER au SHA fab62f89455d31f11de2e53924dab8851e7b98cd.

Vérification du défaut de l'avis précédent
1. Liste incomplète : CORRIGÉ. `packages/faux-serveur/src/__tests__/commun-pieces.test.ts`, `commun-depot.test.ts` et `commun-correction.test.ts` sont ajoutés à `fichiers_autorises` ; les trois existent sur origin/main.

Contrôle indépendant de complétude (sur origin/main)
- Recherche de tous les chemins `/pieces…` et de tous les identifiants de route du lot 04 (`listerPieces`, `lirePiece`, `deposerPieces`, `etatPiece`, `relancerPiece`, `corrigerChamp`) dans les tests : chaque test qui appelle ces routes par URL est désormais dans la liste. `suite-depot.ts` et `suite-correction.ts` ne portent aucun chemin (cible abstraite) : leur absence est correcte. `recherche-base.test.ts` (lien `/pieces/…` en donnée) et `essai-mensuel.test.ts` (port `lirePiece` sans rapport) ne cassent pas.
- Diff : une seule ligne changée (`fichiers_autorises`, pilotage/fiches/L04-T51.md:12) ; rien d'autre ne bouge. CI 9/9 verte sur ce SHA.

Remarques (pour Will, non bloquantes pour l'amendement)
- Le front appelle encore les routes du lot 04 sans préfixe : apps/web/src/api.ts:214 (`/pieces` en POST), apps/web/src/ecrans/e07/Ecran.tsx:25, apps/web/src/ecrans/e08/Ecran.tsx:86. Contre le faux (msw, routes non préfixées) rien ne casse ; contre le vrai serveur (dev:reel) ces appels échoueront une fois la fiche faite. Le précédent du profil (packages/faux-serveur/src/domaines/profil.ts:42) sert les deux chemins dans le faux. À couvrir par une fiche de suivi.
- `taille_max_lignes` reste à 300 pour une douzaine de tests à reprendre : décision de Will (hausse ou scission).
- PR sensible (touche `pilotage/`) : fusion par Will seul.
