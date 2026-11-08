VERDICT: A CORRIGER
SHA relu : c765ffe6025c8bd60ac5d0d71f5fa7f3904be9bd

# Avis de relecture L03-T56 (PR 852, sensible : fusion par Will seul)

## Vérifications faites
- Périmètre : 4 fichiers, tous dans `fichiers_autorises`. Taille 289 lignes, maximum 300. Aucune ligne binaire.
- Critère « les 10 tests nommés passent » : 10/10 verts (vitest ciblé).
- Critère « r4-gel-refuse-et-trace rouge si purgePossible est retiré » : mutation faite, r4 rouge, avec trop-tot et fin-de-contrat.
- Critère « aucune durée de conservation réelle » : durées et rotation inventées (7 ans, 4 jours, source `source-inventee`), rotation passée en argument.
- Critère `pnpm verifier` : lint, gardes, 664 fichiers de test (6136 tests) verts en local. L'étape `types` échoue seulement à cause du Node 22 du cloud. `tsc --noEmit` lancé directement est vert. CI au SHA relu : types, lint, tests, gardes, gitleaks, stryker, e2e et licences verts ; `verifier` encore en file.
- Mutations : contrôle de fin de contrat retiré, idempotence retirée, comparaison `>` remplacée par `>=`, alerte sans `return` : toutes rouges.
- Aucun secret, prix, SIREN ou IBAN réel, nom réel ni mot interdit. Aucun import d'IA. Aucune suppression directe : l'effacement passe par `PortEffacement`, une interface.
- Journal : 7 lignes, commence par `# Journal L03-T56`.

## Défaut bloquant
1. `apps/serveur/src/taches/purge-conservation.ts:109-112` : la confirmation des sauvegardes (`effacee_base` → `effacee_sauvegardes`) ne porte que sur les objets encore rendus par `PortObjets.lister`. Un adaptateur réel lira les objets en base, et l'objet a justement été effacé de la base par `effacerBase`. Il ne sera donc plus listé, et sa preuve « effacé de toutes les sauvegardes » (V3-PLA-063) ne sera jamais posée. Le faux port du test (`purge-conservation.test.ts:33`) liste encore l'objet après l'effacement, ce qui cache le défaut.
   Correction demandée, au choix :
   - (a) parcourir les purges `effacee_base` de la société sans passer par la liste des objets, par exemple avec une méthode `PortPurges.listerEffaceesBase(societeId)` ;
   - (b) ou bien écrire le contrat de `PortObjets.lister` dans le code (il continue de rendre un objet effacé de la base jusqu'à `effacee_sauvegardes`).
   Dans les deux cas, ajouter un cas au test `sauvegardes-confirmees-apres-rotation` où le faux `lister` ne rend plus l'objet après `effacerBase`.

## Remarques (non bloquantes)
- `purge-conservation.ts:110` : le filtre `objet.societeId !== societeId` n'est couvert par aucun test, car la mutation qui le retire reste verte. Le faux `lister` filtre déjà par société. Il faudrait un cas où `lister('societe-a')` rend aussi un objet de `societe-b`.
- La fiche dit que la tâche « s'inscrit par l'interface `Planificateur` de L00-T53 » : aucune inscription ni `TachePlanifiee` n'est exposée. C'est cohérent avec les autres tâches de `taches/` et avec la note du journal sur le branchement, mais il faut le reporter dans la fiche de suite.
- Un objet gelé ajoute 
