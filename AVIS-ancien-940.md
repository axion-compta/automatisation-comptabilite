VERDICT: A CORRIGER
SHA relu : 91b68e625fd61faa777f948b9e80be196418281f

# Avis de relecture, PR 940 (fiche L15-T52), branche lot-15/L15-T52, première relecture

## Défauts bloquants
1. **Mot interdit dans le code.** `apps/web/src/donnees/actions-alerte.ts:14` : le commentaire dit « Corps conforme au contrat ». « conforme » est interdit dans les textes du dépôt (CLAUDE.md, règle 12). Aucun fichier de `apps/` ni de `packages/` ne le contient sur main : cette PR serait la première. La garde ne le voit pas dans un commentaire, d'où la CI verte. Correction : écrire par exemple « Corps vérifié selon le contrat ».
2. **Le test `conflit-409-relit` ne vérifie pas la relecture.** `apps/web/src/socle/__tests__/cloche.test.tsx:86-91` vérifie le message et le nombre de cartes (5). Le faux serveur ne change rien sur un 409, donc ces 5 cartes restent affichées même sans relecture. Mutation essayée : suppression de `relireApresAction(client, [racine + '/alertes'])` dans le `catch` (`Cloche.tsx:51`). Les 9 tests restent verts. Risque réel : sans relecture, la liste garde l'ancienne `version`. Chaque nouvel essai repart alors sur un 409, et le test ne protège pas l'exigence de la fiche (« 409 version = relit la liste »). Correction : dans le test, compter les `GET` sur `/exercices/EX2026/alertes` (le `fetch` est déjà remplacé par `poster`) et exiger une lecture de plus après le 409. Autre possibilité : faire changer la version côté faux serveur avant l'action et vérifier que la carte affiche la nouvelle donnée.

## Contrôles faits
- Fichiers modifiés : les 7 font partie des `fichiers_autorises`. `.github/`, les gardes, `api.ts` et `lecture.tsx` ne sont pas touchés. Aucune dépendance n'est ajoutée.
- Taille : 299 lignes ajoutées et 1 supprimée, pour 300 au plus (`git diff --numstat`, aucune ligne « - - »). La correction 2 doit tenir dans la marge : remplacer des lignes, sans en ajouter.
- CI du SHA relu : les 9 jobs sont au vert, dont `verifier`, `lint`, `types`, `gardes` et `tests`. La PR est fusionnable (`clean`).
- Tests : `vitest` sur `cloche.test.tsx`, 9 tests sur 9 passent. Les 9 tests nommés de la fiche sont présents.
- Mutations, toutes annulées ensuite :
  - délai d'annulation porté à 20 s → `annuler-disparait-apres-dix-secondes` rougit ;
  - Échap qui ne ferme plus → `echap-ferme-et-rend-le-focus` rougit ;
  - focus non rendu à la fermeture → `echap-ferme-et-rend-le-focus` rougit ;
  - nouvelle clé à chaque appel et sans dédoublonnage en vol → `meme-intention-meme-cle` rougit ;
  - relecture après 409 retirée → aucun test ne rougit (défaut 2).
- Règle 13 de CONSIGNE-AUTEUR3 : tout passe par `api.ts` et le faux serveur (`demarrerNoeud`). Aucune adresse, aucun port, aucun secret. Données fictives (`EX2026`). `JOURS_REPORT` vient du contrat, rien n'est en dur.
- Journal : 4 lignes, il commence par `# Journal L15-T52`.
- Prix : aucun. Mots interdits : un seul, voir le défaut 1. Textes de `t08.ts` au vouvoiement.

## Remarques (non bloquantes)
- `actions-alerte.ts:11` : la table `cles` est globale au module. Après un échec, la clé reste gardée pour cette intention. C'est voulu (rejeu = même clé), mais elle n'est jamais purgée tant que l'onglet reste ouvert.
- `Cloche.tsx` : la section des notifications n'affiche ni chargement ni erreur, contrairement aux alertes.
