VERDICT: OK

PR #1134 « MVP conception : fiches L19-T01 à L19-T35 ». Seconde relecture Opus du 12/11/2026 (consigne LOT5, section R), au SHA de tête 5d43a7a46d296150419dd2b66d9fe8651f8fc70a. L'avis A CORRIGER précédent portait sur 234d9f245a4547839abf8b809674584d7c30c1f4.

## Remarques précédentes : toutes levées
1. L19-T15 (doublon de L26-T19, #1138) : la fiche est retirée.
2. L19-T16 : `depend_de` vaut maintenant `["L19-T14","L05-T45","L05-T10","L15-T53"]`. La chaîne sur Coque.tsx est gardée : L19-T13, puis T14, puis T16.
   Mutation : remettre « L19-T15 » fait rougir garde:fiches (L19-T13 et L19-T14 partagent alors Coque.tsx avec L19-T16 sans dépendance).
3. L19-T29 (doublon de L25-T15 et L25-T17, #1136) : la fiche est retirée.
4. Remarque sur L19-T08 : le critère nomme maintenant packages/faux-serveur/src/__tests__/commun-pieces-zones.test.ts.

## Rien n'est cassé
- Il reste 33 fiches, et le diff ne contient que pilotage/fiches/L19-*.md. Le dernier commit ne touche que les 4 fiches citées ci-dessus.
- Aucune fiche de la plage ne cite plus L19-T15 ni L19-T29.
- garde:fiches donne « 1096 fiches cohérentes ». garde:textes et garde:fictif sont vertes. Toutes les dépendances existent.
- Toutes les CI de la tête sont vertes.
- Recoupements avec les PR ouvertes : seulement les fichiers pivots déjà notés au premier avis (openapi.json, e01, e07, e08, Coque.tsx, main.tsx, registre lot-15). La PR de code #1140 (L11-T40) n'en touche aucun, pas plus que #1105, #1129 ou #1131.

## Remarques (non bloquantes)
- Le corps de la PR cite encore L19-T15 (T15) et L19-T29 (T29), ainsi que V3-UX-042 et V3-UX-125. Il faudra le mettre à jour avant la fusion.
- Règle maintenue : la PR fusionnée en second ajoute les depend_de vers les fiches déjà fusionnées qui partagent ses fichiers.
- L19-T35 porte sensible: oui. La fusion revient à Will seul.

SHA de tête relu : 5d43a7a46d296150419dd2b66d9fe8651f8fc70a
