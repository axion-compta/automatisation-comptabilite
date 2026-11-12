# BLOQUE L25-T11

## Cause
La fiche (À faire, point 4) interdit d'assouplir la garde : « si un outil n'a aujourd'hui aucun contrôle d'écran, arrêter ». Sur `origin/main`, trois des sept outils de `packages/contrat/src/chat/outils.json` n'ont aucun écran équivalent sous `apps/web/src/ecrans/` :
- `ecritures.lister` (GET /ecritures) : seul `apps/web/src/api.ts` (démonstration) l'appelle ; aucun écran ne liste les écritures (e12/AJustifier et e50 ne sont pas cette liste).
- `change.expliquer_ecart` (GET /ecarts-change/{id}/explication) : aucun écran ne l'appelle.
- `proposer_validation` : aucune route de proposition générique du contrat n'y correspond côté écran (la validation passe par le chat).

Les quatre autres ont un écran : `exercices.lister` (n03), `plan.lister` (n04), `tiers.lister` (e44), `vue.ouvrir` (chat).

## Ce qu'il faudrait
Une fiche d'écran (ou une décision de Will) qui crée le contrôle d'écran pour ces trois outils, ou retire l'outil du chat. Ensuite, la garde `parite-ecran.mjs` pourra rendre 0 sur main.
