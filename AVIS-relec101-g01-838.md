VERDICT: A CORRIGER
SHA relu: de04b5d97753f33a55b7966622599ff43324653f

# Avis relec101-g01-838 — PR 838, fiche L10-T33 (ventes en lecture)

CI verte, main fusionné sans conflit (`git merge-base --is-ancestor origin/main` vrai au moment de la relecture), mais la PR ne livre pas la fiche.

## Défauts bloquants
1. La PR ne modifie qu'un seul fichier : `pilotage/fiches/L10-T33.md` (+3/−2). Aucune ligne de code ni de test n'est livrée, alors que le titre annonce le service et le serveur en mémoire.
   - `packages/contrat/src/domaines/ventes-service.ts` absent : créer le service pur (`listerVentes`, `lireVente`) sur `genererVentes()`, avec `etat` par `etatAffiche` à `dateReference`, `joursDeRetard` hors noyau, `avoirsLies` sous la facture et tri `dateFacture` décroissante puis `id` (À faire, point 2).
   - `apps/serveur/src/domaines/ventes.ts` inchangé : remplacer les bouchons par le service, `VENTE_INCONNUE` en 404, signature `routesVentes()` gardée (point 3).
2. `tests_requis: oui` non tenu : aucun des 7 tests nommés n'existe (`liste-enveloppe-et-tri`, `filtre-par-etat`, `filtre-par-client-et-mois`, `avoir-sous-sa-facture`, `etat-coherent-avec-le-noyau`, `vente-inconnue-404`, `serveur-repond-aux-ventes`). Ajouter `packages/contrat/src/__tests__/ventes.test.ts` et `apps/serveur/src/__tests__/ventes.test.ts`, avec des tests qui rougissent si le code est faux. Aucune mutation n'a donc pu être faite.
3. `apps/serveur/src/__tests__/ventes-branchement.test.ts:14` toujours sur `/ventes/v1` : le changement `v1` → `VP-1-038` prévu au point 4 de la fiche modifiée n'est pas fait. Il faut le faire en même temps que le branchement du service, sinon ce test passe au rouge.
4. Journal `pilotage/journal/L10-T33.md` absent : l'ajouter (10 lignes au plus, première ligne `# Journal L10-T33`).

## Remarques
- La modification de la fiche (ajout de `ventes-branchement.test.ts` aux fichiers autorisés, seul l'identifiant change) est cohérente : une fois le service branché, `/ventes/v1` répondrait 404. Elle reste limitée et dans le périmètre de la fiche.
- Aucun mot interdit, aucun prix, aucun secret et aucune donnée non fictive dans le diff. La taille (5 lignes) est sous `taille_max_lignes: 320`. Le budget restant pour le code et les tests est donc d'environ 315 lignes.
- Critères à relancer quand le code sera là : `routesEcritureSansEnTete()` reste `[]`, `pnpm contrat:openapi` sans écart, `pnpm verifier`.
