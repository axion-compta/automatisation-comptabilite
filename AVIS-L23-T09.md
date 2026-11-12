VERDICT: A CORRIGER

PR n°1195, fiche L23-T09, tête relue : 68041c0d81fd117e4baede4fcce81c3a9c77e841

## Défauts
1. `packages/noyau/src/change/taux.ts` (`dateDuTauxApplicable`, ligne `const publie = ...`) : mutation survivante. Supprimer `&& jourInstant === m[1]!` laisse les 5 tests du banc verts. Or cette condition règle un vrai cas : une consultation un samedi ou un dimanche avant l'heure de publication. Exemple : opération du samedi 2027-05-15, consultée le 2027-05-15T10:00Z. Le code rend le vendredi 2027-05-14 ; le mutant rend le jeudi 2027-05-13.
   Correction demandée : dans `samedi-taux-du-vendredi`, ajouter `expect(dateDuTauxApplicable('2027-05-15', '2027-05-15T10:00Z', REGLE)).toBe('2027-05-14');`.
2. `taux.ts` (`exigerRegle`) : remplacer `regle.jourSansCotation !== 'veille_ouvree'` par `false` survit. Aucun test ne refuse une valeur inconnue de `jourSansCotation`.
   Correction demandée : ajouter `expect(() => convertirAuCentime(100, 110000000, { ...REGLE, jourSansCotation: 'autre' as never })).toThrow(ErreurChange);`.
3. `taux.ts` (`regleChangeAuJour`) : deux filtres ne sont pas testés.
   - `trouvees.length !== 1` → `< 1` survit : deux lignes actives qui se chevauchent doivent lever `regle_invalide`, et le mutant prend la première en silence.
   - Supprimer `l.cle === 'change.bce.regle' &&` survit aussi.
   Correction demandée : dans `regle-lue-du-parametre-date`, ajouter un cas avec deux lignes non retirées qui couvrent la même date (erreur attendue), puis un cas où seule une ligne d'une autre clé couvre la date (erreur attendue).
4. `taux.ts` (`exigerRegle`) : supprimer `regle === null ||` survit. `regleChangeAuJour` avec `valeur: 'null'` doit lever `ErreurChange` et non `TypeError`.
   Correction demandée : ajouter `expect(() => regleChangeAuJour([{ ...lignes[0]!, valeur: 'null' }], 'FR', '2027-06-01')).toThrow(ErreurChange);`.

## Vérifié
- Fichiers : 6, tous dans `fichiers_autorises` ; 256 lignes ajoutées sur 260 au plus. `taux.test.ts` n'est pas modifié et passe (15 tests).
- Les 6 tests nommés passent en local (5 + 1).
- Le banc compte 50 cas en table, dont au moins 10 demi-centimes et des montants négatifs. Conversion BigInt via `fraction`.
- Mutations tuées : `<=` 5 → 6 (samedi ouvré), `jourInstant` sans repli sur la veille ouvrée, ainsi que les bornes `effet_debut` et `effet_fin` (frontière du 2028-01-01).
- Paramètre en `a_verifier` ; aucun appel réseau. Aucun secret, aucun prix, aucun mot interdit ; journal de 7 lignes.
- CI au SHA relu : 8 jobs verts, `verifier` encore en file.

## Remarques
- Le `source_url` provisoire (accueil BOFiP) pour la BCE est signalé comme tel : à remplacer par la vraie page lors de la vérification.
- L'heure de 15:00 UTC dépend de l'heure d'été ou d'hiver : à trancher au moment de la vérification (statut `a_verifier`).
- Fiche sensible : fusion par Will seul.
