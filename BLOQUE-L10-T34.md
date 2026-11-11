# BLOQUE-L10-T34

Deux blocages, dont un nouveau (PR 1026, branche `lot-10/L10-T34`, SHA 2d003c1b423e93c4315a7db89ce5c1aee3265443).

1. `registres.test.ts` (ordre-garde-puis-modules-puis-socle) suppose les registres de lot vides. Corrigé par la PR 1010 (L00-T76), relue OK, en attente de fusion. CI `tests` rouge (1 échec sur 7358) tant qu'elle n'est pas fusionnée.
2. NOUVEAU : la garde `garde:portes` est rouge en CI (job `gardes`). Le diff touche des chemins back-end (`packages/faux-serveur/`) ; la garde cherche les écrans de la fiche L10-T34 et exige `pilotage/portes/e24-vente.json` et `pilotage/portes/e24-ventes.json` (porte « maquette validée ») sur origin/main. Ces deux fichiers n'existent pas. Reproduit en local avec `GITHUB_HEAD_REF=lot-10/L10-T34 node outils/gardes/portes.mjs`.
   - Hors périmètre : `pilotage/portes/` n'est pas dans les `fichiers_autorises`, et les portes relèvent de la validation de maquette par Will. Aucune garde n'a été assouplie.

Décision demandée à Will : valider les maquettes e24-vente et e24-ventes (fiches de porte dédiées), ou lever l'exigence pour cette fiche. Puis fusionner la PR 1010 et relancer la CI de la PR 1026.
