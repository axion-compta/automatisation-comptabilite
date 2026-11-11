VERDICT: A CORRIGER
SHA relu : db8f69163d48cd901ab0cabab88e454f37039096

# Avis PR 988 (L00-T68 : fiches L00-T68, L00-T72, L00-T73, L00-T74), 2e relecture

Relecture stricte (fiches sensibles) au SHA de tête ci-dessus, contre la base `01c45796928cd15f568768dfcd141f11f6307cba` et contre `origin/main` actuel (`c528b01560214a593da95eb5e91581193335e208`). L'avis précédent (SHA 14d248f9) est remplacé.

## Les 6 défauts de l'avis précédent
1. **Corrigé.** L00-T74 : le « À faire » demande aussi la substitution dans le « À faire » et le « Contexte » des fiches amendées, avec les exemples demandés. Le critère `git grep -nE 'routes[.]ts|app[.]ts|handlers[.]ts|contrat-commun'` est ajouté. Le « Hors périmètre » ne s'élargit qu'aux mentions de fichiers. J'ai vérifié que les critères des 18 fiches cibles ne citent aucun de ces fichiers : le critère `git grep` peut donc passer sans toucher aux critères, qui restent figés.
2. **Corrigé.** L07-T20 est retirée de la liste et de `fichiers_autorises`. Le titre indique 18 fiches, le corps de la PR aussi. Il ne reste aucune mention de « 19 » ni de L07-T20.
3. **Corrigé.** L00-T68 : la fusion se fait par chemin puis par méthode, une méthode en double est une erreur. Le cas `POST /pieces` à côté de `GET /pieces` est dans le point 3 et dans le critère de `registres.test.ts`.
4. **Corrigé.** L00-T68 : `routesEcritureSansEnTete()` (dans `openapi.ts`, fichier autorisé) et la recherche des lectures par POST parcourent socle + modules + chat. C'est écrit au point 5, et un critère avec un essai qui doit échouer est ajouté.
5. **Corrigé.** L00-T73 : le critère, le point 4 et le piège parlent maintenant de `matchRequestUrl` dans les deux sens, avec une valeur d'essai pour les paramètres et le cas `GET …/:id` contre une route statique. `matchRequestUrl` est bien exporté par msw 2.15.0 (version du faux serveur).
6. **Corrigé.** Le corps de la PR contient « Fiche: L00-T68 » et « Exigences: V3-QUA-027 ».

## Contrôles généraux
- Diff : 4 fichiers, 155 lignes ajoutées, aucune supprimée, aucune ligne « - - », aucun octet NUL. Fusion avec `origin/main` actuel sans conflit.
- Les 15 champs sont présents dans les 4 fiches. Phases et dépendances n'ont pas changé : T68 en P0 sans dépendance, T72 en P0 après T68, T73 en P4 après L06-T29 (maintenant `fait` sur main), T74 en P4 après T68, T72 et T73.
- `node outils/gardes/fiches.mjs` : 906 fiches cohérentes, code 0. Il ne reste que des avertissements entre lots différents.
- Aucun mot interdit, prix, secret ni nom réel.
- Fiches arrivées sur main depuis la base : aucune nouvelle fiche `a_faire` ne touche les fichiers partagés. L06-T29 touchait `handlers.ts` et `contrat-commun.test.ts`, mais elle est faite. La liste de T74 reste donc complète.

## Défaut à corriger (introduit par la correction)
1. **L00-T72, point 3 : le nouveau type des options de `creerApp` casse la signature et contredit le critère.** Le point 3 dit que le type en ligne de `creerApp` (`app.ts` ligne 155) « devient `OptionsRouteur & OptionsModules` ». Or `OptionsRouteur` est tiré de la signature de `creerRouteur` (ligne 73), qui n'a pas `session?: FournisseurSession`, alors que `creerApp` l'a et s'en sert (ligne 164, `options.session?.(request.headers)`). Appliquée à la lettre, la consigne fait échouer `pnpm types` et contredit le critère « creerRouteur et creerApp gardent la même signature effective ». Il y a un second problème, présent dès la première version : `implementerLotNN(os, options: OptionsRouteur)` ne reçoit pas `OptionsModules`. Les options qu'un lot ajoute par fusion de déclaration ne lui parviennent donc jamais, et ce mécanisme ne sert à rien. Correction :
   - écrire que les options de `creerApp` deviennent `OptionsRouteur & OptionsModules & { session?: FournisseurSession }`, ou un `OptionsApp` défini ainsi dans `registres/types.ts` ;
   - écrire que `creerRouteur` et `implementerLotNN` / `implementerModules` reçoivent `OptionsRouteur & OptionsModules` ;
   - garder le critère de signature effective inchangée.

## Remarques (non bloquantes)
- L00-T74 : plusieurs Pièges des fiches cibles citent aussi les anciens fichiers. Exemples : L04-T32 « `routes.ts`, `openapi.json`, `app.ts` : fichiers communs », L10-T36, T38 et T41 « Même règle de partage de `handlers.ts` que L10-T34 », L04-T31, L04-T33 et L11-T28. Le critère `git grep` oblige déjà à les traiter, et le « Hors périmètre » l'autorise. Mais le point « dans les Pièges » ne cite que la phrase « communs à tous les lots ». Mieux vaut écrire « toute mention de ces fichiers dans les Pièges » pour que la consigne suive le critère.
- L00-T68 : le contrôle « une route d'écriture de module sans Idempotency-Key fait échouer le test » n'est qu'un essai jetable noté au journal. Comme les registres sont vides au départ, c'est acceptable. Un test durable dans `registres.test.ts` (contrat de module fictif passé à `definitions(source)`) protégerait mieux contre une régression future.
