VERDICT: A CORRIGER
SHA relu : 9a5f361c90bb2d72f768a319a8afd408ae3677e1

# Avis PR 988 (L00-T68 : fiches L00-T68, L00-T72, L00-T73, L00-T74), 3e relecture

Relecture stricte (fiches sensibles) au SHA de tête ci-dessus, contre la base `01c45796928cd15f568768dfcd141f11f6307cba` et contre `origin/main` actuel (`c528b01560214a593da95eb5e91581193335e208`, inchangé depuis l'avis précédent). L'avis précédent (SHA db8f6916) est remplacé. Le commit 9a5f361 change 3 lignes : L00-T68 point 7, L00-T72 point 3, L00-T74 Pièges.

## Défaut bloquant de l'avis précédent
**Corrigé dans le point 3, mais le point 2 dit le contraire.** L00-T72 point 3 dit maintenant : options de `creerApp` = `OptionsRouteur & OptionsModules & { session?: FournisseurSession }`, ou un `OptionsApp` défini ainsi dans `registres/types.ts`. Il dit aussi que `creerRouteur`, `implementerModules` et `implementerLotNN` reçoivent `OptionsRouteur & OptionsModules`. Le critère « creerRouteur et creerApp gardent la même signature effective » n'a pas changé. Les références restent justes sur main : `app.ts` ligne 155 (type en ligne avec `session?: FournisseurSession`), ligne 164 (`options.session?.(request.headers)`), ligne 73 (`creerRouteur` sans `session`).

## Remarques de l'avis précédent
- **L00-T74, Pièges : traitée.** « Toute mention de ces fichiers (par exemple « fichiers communs », « communs à tous les lots », « même règle de partage de `handlers.ts` que L10-T34 ») » : la consigne suit maintenant le critère `git grep`. Le « Hors périmètre » couvre déjà les Pièges.
- **L00-T68, test durable Idempotency : traitée dans l'idée, mais la consigne ne peut pas s'appliquer telle quelle** (voir défaut 2).

## Défauts à corriger (nouvelles incohérences, une ligne chacune)
1. **L00-T72 : le point 2 contredit le point 3.** Le point 2 dit toujours `implementerLotNN(os: OsContrat, options: OptionsRouteur)`, et le point 3 dit que `implementerLotNN` reçoit `OptionsRouteur & OptionsModules`. Un auteur qui suit le point 2 obtient un code qui compile (l'intersection reste assignable à `OptionsRouteur`). Mais les options ajoutées par un lot via `OptionsModules` n'arrivent jamais à son `implementerLotNN` : c'est la seconde moitié du défaut bloquant précédent. Correction : au point 2, écrire `implementerLotNN(os: OsContrat, options: OptionsRouteur & OptionsModules)`, et la même chose pour `implementerModules(os, options)`.
2. **L00-T68 point 7 : le test durable demande un appel impossible.** Sur main, `definitions()` (`openapi.ts` ligne 17) n'est pas exportée, et `routesEcritureSansEnTete()` (ligne 32) ne prend aucun argument. Un contrat fictif passé à `definitions(source)` ne peut donc pas être « détecté par `routesEcritureSansEnTete()` » : cette fonction relit toujours le contrat réel. L'auteur devrait inventer la signature, sur une garde. Correction : au point 3 ou 5, écrire que `routesEcritureSansEnTete(source = contrat complet)` et la recherche des lectures par POST prennent une source facultative, avec le contrat complet par défaut, ce qui ne change rien pour les appelants actuels. Au point 7, écrire que le test appelle `routesEcritureSansEnTete(contratFictif)` et attend l'operationId fictif. Mieux encore : ajouter ce test durable aux `criteres` de L00-T68, qui ne citent encore que l'essai jetable.

## Contrôles généraux (sans écart)
- Diff contre main : 4 fichiers (T68 41, T72 35, T73 34, T74 45 lignes), 155 lignes ajoutées, aucune supprimée, aucune ligne « - - », aucun octet NUL. Fusion avec `origin/main` sans conflit.
- 15 champs dans chacune des 4 fiches. Phases et dépendances inchangées : T68 en P0 sans dépendance, T72 en P0 après T68, T73 en P4 après L06-T29 (fait), T74 en P4 après T68, T72 et T73. `fichiers_autorises` inchangés.
- `node outils/gardes/fiches.mjs` sur la fusion avec main : « 906 fiches cohérentes », code 0.
- Aucun mot interdit, prix, secret ni nom réel. Aucune fiche arrivée sur main depuis l'avis précédent : la liste de T74 reste complète.
