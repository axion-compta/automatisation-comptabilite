VERDICT: OK

PR #1135 « MVP conception : fiches L24-T01 à L24-T36 ». Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R), au SHA de tête d6d1dfd1943a62fc5fef4fa23a73f9a66ee8e9a7. L'avis A CORRIGER précédent portait sur c28460adbc5fbf209e31948460a87bc0f07449d0.

## Remarques précédentes : toutes levées
1. L24-T01 (doublon de L21-T25, #1132) : la fiche est retirée.
2. L24-T20 (forme de `devise` en conflit avec L22-T19, #1139) : la fiche est retirée.
3. L24-T21 : `depend_de` vaut maintenant `["L13-T25"]`, et le Contexte ne cite plus L24-T20.
   Mutation : remettre L24-T20 fait rougir garde:fiches (« dépendance L24-T20 inconnue »).
4. L24-T22 :
   - a-nouveaux.ts, son test et les 3 tests a-nouveaux-* sont retirés des fichiers et des critères ;
   - le compte des tests (5) est cohérent avec les critères ;
   - la génération des à-nouveaux est renvoyée à L22-T20, dans le Contexte et dans « Hors périmètre ».
   L24-T23 garde sa dépendance vers L24-T22, qui existe toujours.
5. L24-T02 : etats.ts et etats.test.ts sont retirés, et `valider` n'est pas modifié. Le refus d'un validant vide passe dans piste.ts : les 7 tests sont dans piste.test.ts, et les fichiers autorisés sont cohérents avec le travail à faire. Le code `validant_absent` reste dans modele.ts, qui est bien autorisé.

## Rien n'est cassé
- Il reste 34 fiches, et le diff ne contient que pilotage/fiches/L24-*.md. Le dernier commit ne touche que les 5 fiches citées ci-dessus.
- Aucune fiche de la plage ne cite plus L24-T01 ni L24-T20.
- garde:fiches donne « 1097 fiches cohérentes ». garde:textes et garde:fictif sont vertes. Toutes les dépendances existent.
- Toutes les CI de la tête sont vertes.
- Recoupements avec les PR ouvertes : seulement les fichiers pivots déjà notés (openapi.json, plan.ts et son test avec L23-T02, registres du lot 13 avec L25-T14). piste.ts ne recoupe aucune autre fiche. Aucune PR de code ouverte ne touche ces chemins, y compris #1140.

## Remarques (non bloquantes)
- Le corps de la PR annonce encore 36 fiches, et liste L24-T01 et L24-T20 (V3-MOT-004 et V3-MOT-050). Il faudra le mettre à jour avant la fusion.
- Règle maintenue : la PR fusionnée en second ajoute les depend_de vers les fiches déjà fusionnées qui partagent ses fichiers.

SHA de tête relu : d6d1dfd1943a62fc5fef4fa23a73f9a66ee8e9a7
