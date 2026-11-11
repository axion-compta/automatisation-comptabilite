VERDICT: OK

# Avis L00-T84, 3e relecture (PR #1049 fiche seule, PR #1050 exécution, SENSIBLE)

SHA de tête relus :
- PR #1049 : 3cfeb0348aa83067fe00fce8e9d8bc983f58f64f
- PR #1050 : 87f259d24a030dfd6ae76f7b2826607af287e063 (inchangé depuis l'avis c2b8caa)

Sensible (`sensible: oui`, fichiers sous `pilotage/`) : fusion par Will seul.

## Point de l'avis précédent (c2b8caa)
- Défaut bloquant (`statut: fait` dans la PR fiche seule) : CORRIGÉ. `pilotage/fiches/L00-T84.md:8` de #1049 porte `statut: a_faire` (commit 3cfeb03), seule ligne changée ; le diff de #1049 contre main ne touche que ce fichier (35 lignes). `garde:termine` vert en local ; mutation : remettre `fait` → `garde:termine ROUGE`. CI de #1049 : les 9 jobs verts.

## Vérifié sur #1050
- 6 fichiers, tous dans `fichiers_autorises` : 147 lignes (max 190). Critères relancés : `fiches.mjs` vert, `verifier.mjs --gardes` vert, `git grep` 2, 5 et 7 lignes.
- Simulation main + #1049 + #1050 : `garde:fiches` vert (1002 fiches), gardes vertes.
- CI : `gardes` rouge pour `garde:perimetre` (fiche L00-T84 absente de main) et `verifier` rouge par suite : attendu tant que #1049 n'est pas fusionnée, pas un défaut de l'auteur.
- Aucun mot interdit, aucun prix, aucune donnée réelle ; aucun `bloque_par` levé.

## Ordre de fusion (à suivre)
1. #1049 d'abord.
2. Puis mettre #1050 à jour par `git merge origin/main` et GARDER `statut: fait` dans `pilotage/fiches/L00-T84.md`. Simulé : après une fusion en squash de #1049, le merge donne un conflit add/add sur ce fichier ; après une fusion par commit de merge, il passe sans conflit mais reprend `statut: a_faire` de #1049 en silence (la fiche resterait à faire avec son journal). Vérifier la ligne 8 après le merge.
3. Puis #1060/#1061 : #1060 est fusionnée ; #1061 reste ouverte et doit ajouter `L09-T52` au `depend_de` de `L09-T54.md` (recoupement décrit dans l'avis c2b8caa, toujours valable).

## Remarques (non bloquantes)
- `pilotage/journal/L00-T84.md:5` (#1050) : « L09-T52 : … dépend de L09-T49 et L09-T52 » ; L09-T52 dépend de L09-T49 seulement. Non corrigée depuis l'avis précédent.
- #1050 a 22 commits de retard sur main ; la mise à jour se fait à l'étape 2 ci-dessus.
