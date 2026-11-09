VERDICT: A CORRIGER
SHA relu : 535b567b2a35fe3d11c45cfdb60e462443a6494b
PR : #858 (relecture renforcée, fiche sensible débloquée par J3a)

## Vérifications faites
- Périmètre : 5 fichiers modifiés, tous dans `fichiers_autorises`. Taille : 249 ajouts, 1 suppression (250 ≤ 290).
- Tests : `verifier-exercice-clos.test.ts`, 10 tests verts (les 9 nommés + `doublon-refuse`). Suite complète : 664 fichiers, 6136 tests verts. `tsc --noEmit` vert, gardes vertes (l'étape `types` de `pnpm verifier` échoue ici seulement parce que le cloud a Node 22 alors que le dépôt demande Node 24 ; `tsc` lancé à part est vert).
- Mutations, toutes annulées ensuite :
  - test de statut `valide` retiré de `ecritures-figees.ts` : `mot75-2-update-refuse` rougit (critère 2 vérifié) ;
  - résultat de CC-PM07 remplacé par `'intact'` : `mot75-3-alteration-detectee` et `alteration-a-totaux-egaux` rougissent (critère 3 vérifié) ;
  - alerte limitée à `altere` : `instantane-absent-jamais-intact` rougit.
- Aucun import de `apps/serveur/src/ia` ni d'un client réseau dans les deux fichiers de code (critère 4).
- Aucune migration, aucune base réelle : déclencheur simulé en mémoire derrière `PortEcritures`.
- Aucun secret, aucun IBAN, aucun prix, aucun mot interdit. SIREN fictifs (123456782, 987654324), ceux de la fiche. Aucun octet NUL. Journal : 6 lignes, commence par « # Journal L13-T53 » et cite D42, J3a et la décision du 07/11/2026.
- `verifier-exercice-clos` est déjà dans `TACHES_PLANIFIEES` sur main : aucun test rouge de L13-T50.

## Défauts bloquants
1. `pilotage/journal/L13-T53.md:6` et `apps/serveur/src/taches/verifier-exercice-clos.ts` : le point 6 de « À faire » n'est pas traité. La fiche demande : « La tâche s'inscrit par l'interface `Planificateur` de L00-T53 (rythme en UTC, `passageId` fourni par le planificateur) ». Seul le « branchement réel » est hors périmètre. Le journal classe à tort « inscription au `Planificateur` » en hors périmètre, et la fiche passe pourtant à `statut: fait`.
   Correction : exporter de `verifier-exercice-clos.ts` une fonction d'inscription, par exemple `inscrireVerificationExercice(planificateur, rythme, preparer)`. Elle appelle `planificateur.inscrire({ nom: 'verifier-exercice-clos', rythme, executer })` avec le motif `annuelle`. Ajouter un test avec `creerFauxPlanificateur` (même forme que `inscrireEssaiMensuel` de L08-T46). Corriger ensuite la ligne du journal. Il reste environ 40 lignes de marge sur la taille maximale.

## Remarques (non bloquantes)
- `apps/serveur/src/persistance/ecritures-figees.ts:45` : aucun test ne vérifie la copie défensive de `lister`. Retirer `structuredClone` laisse les 10 tests verts. Ajouter une assertion : modifier l'objet rendu par `lister` ne change pas le stock.
- `apps/serveur/src/taches/verifier-exercice-clos.ts:38` : le déclencheur passé au moteur est toujours `'a_la_demande'`, quel que soit le motif. Pour `avant_export`, passer `'avant_export'` (déclencheur prévu par CC-PM07) rendrait la trace plus juste.
