# BLOQUE-L10-T34

Recoupement avec un test hors `fichiers_autorises`.

- `packages/faux-serveur/src/__tests__/registres.test.ts` (test `ordre-garde-puis-modules-puis-socle`) suppose que les quinze registres de lot sont vides : il ajoute son marqueur APRÈS les handlers des lots et attend `tous[tailleGarde] === marqueur`.
- Dès que `registres/lot-10.ts` renvoie les handlers de `GET /ventes` et `GET /ventes/:id` (ce que la fiche demande), ce test échoue : `tous[tailleGarde]` est `GET /ventes`, pas le marqueur. Constaté en local : 1 échec sur 7, 7/7 sans mon changement.
- Corriger ce test (marqueur placé avant les modules, ou position calculée à partir de la taille des modules) sort du périmètre de la fiche ; ne pas l'assouplir sans décision.

Travail prêt, non poussé car la CI serait rouge : `domaines/ventes.ts` (handlers MSW, 400/404), `registres/lot-10.ts`, `suite-ventes.ts` et `commun-ventes.test.ts` (7 cas, verts sur le vrai serveur et le faux).

Décision demandée à Will : ajouter `packages/faux-serveur/src/__tests__/registres.test.ts` aux `fichiers_autorises` de L10-T34 (ou une fiche dédiée au correctif du test).
