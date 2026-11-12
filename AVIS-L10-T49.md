VERDICT: OK

PR #1122, fiche L10-T49, relue au SHA de tête 661e267f6b44dc45d4423ebcf913a947e6e07792 (relecteur Opus, 12/11/2026).

## Contrôles
- Périmètre : 8 fichiers, tous dans `fichiers_autorises` ; 226 lignes ajoutées et 2 retirées (max 280). Rien sous `socle/`, ni dans `api.ts`, `menu.ts` ou `fr.ts`.
- Tests : `e44-client.test.tsx` et `e44.test.tsx`, 20/20 verts en local ; les 7 noms exigés sont présents et les tests de L01-T38 restent verts. CI verte.
- Mutations à la main qui rougissent : solde retiré, erreur 500 affichée comme « client inconnu », `encodeURIComponent` retiré sur la facture, SIREN masqué, lien posé aussi sur un fournisseur.
- Textes importés depuis `packages/textes/src/ecrans/e44-client.ts` ; vouvoiement ; aucun mot interdit ; données fictives. En cas d'erreur, aucun chiffre partiel (vérifié par le test). Le journal fait 5 lignes.

## Remarques (non bloquantes)
1. `Ecran.tsx:32` : l'affichage du numéro de TVA n'est vérifié par aucun test. Si on remplace `c.tva` par `t.absent`, les tests restent verts. Ajouter une assertion sur `FR00000000000` dans `tva-non-verifiee-jamais-valide`.
2. `Ecran.tsx:21` : la branche `bien` (« Ventes de biens ») de l'habitude n'est pas testée.
3. `e44-client.ts:11` : « {n} jours » affiche « 1 jours ». Prévoir le singulier.
4. `e44-client.test.tsx:38` : l'assertion `[data-signe] ?? dd span` est faible ; le solde est déjà couvert par ailleurs.
