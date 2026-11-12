VERDICT: A CORRIGER

PR #1214 (L21-T17). Tête relue : c95f8749b145fe2121049447ce95b90b3fb3a1ec
Relecteur Opus, consigne LOT5 section R. Seconde relecture, après l'avis A CORRIGER sur 8bf05e27992ceff5a705c984baf4980bad1b32ae.

## Défauts de l'avis précédent : vérifiés par mutation
1. `contrats-agents.ts:48`, `return chemin === '' ? '$' : chemin` remplacé par `return null` : le mutant est tué par les éléments de liste `null`, `3` et `[]` → `soldes[0]`. Corrigé.
2. `contrats-agents.ts:73`, `propositions.length < 2 || ...` : le mutant est tué par la proposition unique contredite (1000 contre un recalcul de 0). Corrigé.

## Vérifié
- Fichiers : les 6 fichiers du diff sont dans `fichiers_autorises`. 169 lignes ajoutées et 3 supprimées (maximum 280). Aucun octet NUL.
- 15 tests passent en local : `contrats-agents.test.ts` et `gardien-sortie.test.ts`.
- 14 mutations essayées. 13 sont tuées, dont `isSafeInteger` → `isFinite`, la propagation du défaut d'une liste, `texte` et `booleen` toujours acceptés, le retrait du contrôle des champs inconnus, le chemin pointé, `centimes()` sur le recalcul, `every` → `some`, `reprise: ['L','B']` et `reprise: []`.
- Aucun secret, aucun prix, aucun mot interdit. Données fictives. Journal de 7 lignes.

## Défaut (mutation survivante, nouvelle)
1. `packages/noyau/src/reprise/contrats-agents.ts:50` : on peut remplacer `!Object.hasOwn(s.champs, nom)` par `!(nom in s.champs)` sans qu'aucun test ne rougisse.
   Conséquence : une sortie de modèle `{"decision":"continuer","motifs":[],"constructor":1}` (ou `toString`, `__proto__`…), obtenue par `JSON.parse`, serait acceptée alors qu'elle a un champ en trop. Le contrat ne serait plus strict, ce qui compte sur une fiche sensible (IA).
   Correction : dans `champ-en-trop-rejete`, ajoute `expect(refus('chef_dossier', JSON.parse('{"decision":"continuer","motifs":[],"constructor":1}'))).toEqual({ ok: false, code: 'hors_contrat', chemin: 'constructor' });`.

## Remarques
- Fiche sensible : fusion par Will seul.
