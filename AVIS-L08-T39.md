VERDICT: A CORRIGER

PR #1051 (L08-T39), relue au SHA de tête 00b847d65733053db5adb19032b59acec3adb6ff. Fiche lue sur origin/main. Empilée sur #986 (L08-T37).

## Les 3 jobs rouges de la CI, et pourquoi
1. `e2e` (11 tests sur 48 : axe-accueil-bureau, axe-accueil-telephone, axe-annees-comptables, menu-selon-largeur, et 7 tests de pannes.e2e.ts sur /essai). L'application ne démarre pas dans le navigateur. Erreur reproduite en local : `Module "node:crypto" has been externalized for browser compatibility. Cannot access "node:crypto.createHash"`. Chaîne d'import : `packages/faux-serveur/src/domaines/personnes.ts` (version 032c654a de L08-T37, import statique) → `contrat/domaines/personnes-service.ts` → `donnees-fictives/src/rgpd.ts` (`import { createHash } from 'node:crypto'`). Cela vient de la pile L08-T37, pas de L08-T39. #986 l'a corrigé depuis (import différé, tête 28c23e57, e2e vert). Vérifié : après `git merge origin/lot-08/L08-T37` sur la tête de #1051, l'e2e passe en entier (58 sur 58).
2. `gardes` : `garde:termine` (« L08-T39 : fait alors que L08-T37 ne l'est pas ») et `garde:perimetre` (fichiers de L08-T37 et de main empilés). C'est attendu tant que #986 n'est pas fusionnée ; ce n'est pas un défaut de l'auteur.
3. `verifier` : tâche agrégée, rouge parce que les deux jobs précédents le sont.
Le job `tests` est vert. En local, les 8 tests nommés passent, et toute la suite vitest passe après fusion avec main (811 fichiers).

## Défauts à corriger (fichiers autorisés de la fiche)
1. `apps/web/src/ecrans/e50/DemandesPersonnes.tsx:43` et `apps/web/src/ecrans/e50/RecherchePersonne.tsx:31` : toute erreur de lecture (réseau, 500, 403…) affiche `erreurs.reglageAbsent` (« Le réglage nécessaire n'est pas renseigné : demandez-le à votre administrateur. »). Ce message est faux hors du cas 503 `REGLAGE_ABSENT`. Correction : afficher `reglageAbsent` seulement si `ErreurLecture` a le statut 503 (ou le code `REGLAGE_ABSENT`), et sinon le texte générique existant `e50.etats.erreur` (`packages/textes/src/ecrans/e50.ts`).
2. `apps/web/src/ecrans/e50/__tests__/demandes-personnes.test.tsx` : l'état d'erreur n'a aucun test. Une mutation qui supprime la branche `etat === 'erreur'` reste verte (8 sur 8). Ajouter un test qui échoue sans la correction 1 : réponse 500 → message générique et aucune ligne ; réponse 503 `REGLAGE_ABSENT` → `reglageAbsent`.
3. Mettre la branche à niveau avec `git merge origin/lot-08/L08-T37` (ou `origin/main` une fois #986 fusionnée), sans rebase ni force-push, pour reprendre la correction `node:crypto` et rendre l'e2e vert.

## Vérifications faites
- Fichiers propres à la fiche : DemandesPersonnes.tsx, RecherchePersonne.tsx, Ecran.tsx (import et deux balises seulement), test, fiche, journal (9 lignes). Environ 246 lignes, limite 300. Les autres fichiers du diff appartiennent à L08-T37.
- Mutations (annulées ensuite) : pastille « à rappeler » retirée → `retard-et-rappel-en-mots` rougit ; date non formatée → `refus-avec-date-et-source` ; 422 non reconnu → `recherche-trop-courte-message` ; comptage par source faussé → `recherche-douze-pieces` ; état vide retiré → `liste-vide`.
- `garde:textes` et `garde:appels` verts. Aucun `<main>`. La saisie ne va jamais dans l'URL de la page. Données fictives (@exemple.fr), aucun mot interdit, aucun prix.

## Remarques (non bloquantes)
- Libellés des sources (`Tiers`, `Pièces`, `Écritures`, `Conversations`) écrits en dur dans `RecherchePersonne.tsx:10` : `e50Personnes` ne les prévoit pas et les fichiers de textes sont hors périmètre. C'est un défaut de fiche, à reprendre dans une fiche de textes.
- Refus sans date : la phrase rendue est « Conservé jusqu’au date à confirmer. ». Si `source_motif` manque, on lit « Source : date à confirmer. », ce qui n'a pas de sens. Il vaudrait mieux un texte dédié (fiche de textes).
- `EtatChargement libelle={t.titre}` : `e50.etats.chargement` conviendrait mieux.
- Formulaire envoyé sans aucun champ rempli : rien ne s'affiche. Un message « un champ au moins » aiderait.
