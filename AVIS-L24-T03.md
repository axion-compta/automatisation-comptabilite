VERDICT: A CORRIGER

PR n°1196, fiche L24-T03, tête relue : 71b37cca4881bf979ed0c7557da21d32d320070a

## Défaut
1. `packages/noyau/src/plan/actions.ts:107` : mutation survivante. Remplacer `courant.nbEcritures !== apercu.nbEcritures` par `courant.nbEcritures > apercu.nbEcritures` laisse les 10 tests verts. Seul le cas « écriture ajoutée après l'aperçu » est testé. Si une écriture a été retirée depuis l'aperçu, le mutant fusionne avec un aperçu faux.
   Correction demandée : dans `fusion-sans-confirmation-sans-effet`, ajouter `expect(codePlan(() => fusionner(PLAN, ECRITURES.slice(1), apercu, true))).toBe('apercu_perime');`.

## Vérifié
- Fichiers : 4, tous dans `fichiers_autorises` ; 278 lignes ajoutées sur 280 au plus.
- Les 10 tests nommés passent en local (16 tests dans `src/plan`).
- Mutations tuées : `startsWith` → égalité stricte, `length > 0` → `> 1` (compte avec une seule écriture), `apercu_perime` en `<`, filtre de ligne des réaffectations, compte désactivé proposé, suppression de `verifierCompteMvp` (classe 8), `trim` du nom, contrôle de la source inconnue.
- Les écritures ne sont jamais modifiées (assertion sur `ECRITURES[0]`) ; plan immuable. Aucun secret, aucun prix, aucun mot interdit ; données fictives ; journal de 5 lignes.
- CI au SHA relu : 8 jobs verts, `verifier` encore en file.

## Remarques
- Signatures plus larges que la fiche. La fiche donne `fusionner(apercu, confirmation)` et `categorieVersCompte(categorie, plan)`. Le code prend aussi `plan` et `ecritures` dans le premier cas, et une table `correspondances` dans le second. C'est nécessaire pour des fonctions pures ; à reporter dans L24-T05 (contrat et serveur).
- `apercu_perime` ne compare que le nombre d'écritures ; les réaffectations sont de toute façon recalculées sur la liste courante.
- Fiche sensible : fusion par Will seul.
