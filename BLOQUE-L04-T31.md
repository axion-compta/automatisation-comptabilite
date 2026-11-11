# BLOQUE-L04-T31
- Fiche : L04-T31 (faux serveur : pièces en lecture, suite commune aux deux cibles).
- Code et tests écrits : 13 tests verts (vrai serveur et faux serveur), tsc vert, 193 lignes pour 280 permises.
- Gardes lancées avec scripts/verifier.mjs --gardes : toutes vertes sauf `portes.mjs`.
- Garde en cause : pilotage/portes, deux messages :
  - lot back-end de l'écran e07 sans porte « maquette validée » (pilotage/portes/e07.json absent sur origin/main) ;
  - idem pour l'écran e08 (pilotage/portes/e08.json absent).
- Cause hors de la fiche : les fichiers de portes e07 et e08 ne figurent pas dans fichiers_autorises.
- À changer : Will ajoute les portes e07 et e08 (maquette validée, datée et nommée, D62) sur main, puis la fiche est relancée.
- Aucune branche lot-04/L04-T31 poussée (point 10 de la consigne).
