VERDICT: A CORRIGER

# Avis L11-T39 (PR #1131)

SHA de tête relu : 5856c35554ff89213802e2a7cda2765b377495ea
Fiche lue sur la branche de la PR (amendée selon la décision de Will du 12/11/2026 : interface + faux fournisseur, données fictives).

## Contrôles
- Fichiers : les 9 fichiers du diff sont dans `fichiers_autorises`.
- Taille : 240 lignes hors fragment openapi (70 lignes, comptées à part) pour un plafond de 300.
- CI au SHA de tête : 9 jobs verts (verifier, tests, e2e, lint, gitleaks, stryker, gardes, types, licences).
- Tests ciblés (contrat + serveur) : 8/8 verts en local.
- Aucun appel réseau, aucun fournisseur réel, aucun prix, aucun mot interdit, données fictives. Journal : 9 lignes, commence par `# Journal L11-T39`.

## Mutations (le test doit rougir)
| Mutation | Résultat |
|---|---|
| distance demandée avec départ OU arrivée | rouge |
| distance recopiée dans `kmDixiemes` sans geste | rouge |
| `quatreChiffres` non transmis à `determinerPayeur` | rouge |
| payeur forcé à `societe` | rouge |
| panne du fournisseur propagée | rouge |
| `trim()` retiré sur le départ | rouge |
| `confiance` ignorée dans le statut | **vert (survit)** |
| distance négative acceptée | **vert (survit)** |
| distance non entière acceptée | **vert (survit)** |

## Défauts
1. `packages/contrat/src/__tests__/frais-lecture-ia.test.ts:18` (`lecture-incertaine-a-completer`) : le ticket `PIE-2` n'a ni date ni TTC, le test passe donc grâce aux champs manquants et ne vérifie jamais la confiance. Remplacer `confiance === 'sure' && manquants.length === 0` par `manquants.length === 0` (`frais-lecture-ia.ts:74`) laisse tout vert. Correction demandée : ajouter dans ce test un ticket enregistré dont tous les champs sont présents mais avec `confiance: 'incertaine'`, et exiger `statut: 'a_completer'`.
2. `packages/contrat/src/domaines/frais-lecture-ia.ts:79` : aucun test sur une distance invalide renvoyée par le fournisseur. Retirer `d.kmDixiemes >= 0` ou `Number.isInteger(...)` laisse tout vert. Correction demandée : dans `sans-depart-ni-arrivee-aucune-distance` (ou un test voisin), enregistrer des distances `-1`, `12.5`, `NaN` et `Infinity` et exiger `distanceProposee` absente pour chacune.

## Remarques (non bloquantes)
- `frais-lecture-ia.ts:51` : `BANQUE_ESSAI` code en dur une carte société fictive `4242` et une fenêtre de 3 jours, qui doublonne `FENETRE_ESSAI` de `frais-actions-service.ts`. La route serveur (`apps/serveur/src/domaines/frais-lecture-ia.ts:8`) l'utilise par défaut : tout ticket se terminant par 4242 y est proposé « payé par la société ». Mieux vaudrait réutiliser `FENETRE_ESSAI` et les cartes du jeu fictif de `creerFrais`, pour que le payeur proposé à la lecture soit celui qui sera recalculé à la création.
- `frais-lecture-ia.ts:55` : date sentinelle `2000-01-01` et montant nul quand la date ou le TTC manquent ; dans ce cas, les 4 chiffres lus ne sont pas transmis. Le résultat reste `a_confirmer`, mais un appel direct sans ticket fictif serait plus lisible.
- `frais-lecture-ia.ts:73` : lecture incertaine mais complète, le payeur est quand même calculé sur des chiffres incertains (règle 2 possible). Il reste `a_completer`, donc non bloquant.
- À faire 1 (« alimente `creerFrais` ») : le service rend un brouillon, mais aucun frais n'est créé et `NouveauFrais` ne porte ni confiance ni mention. `frais-actions.ts` n'est pas dans `fichiers_autorises` : c'est un défaut de fiche, pas un défaut de l'auteur.
- La PR passe la fiche à `statut: fait` et retire `bloque_par` en citant la décision de Will du 12/11 ; PR sensible, fusion par Will seul.
