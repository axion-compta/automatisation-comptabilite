VERDICT: OK
cff7b89cf94e61f51d0f18ae808f5bab414480da

PR #1095, fiche L09-T49 (**sensible** : double relecture, fusion par Will seul), relue au SHA de tête cff7b89cf94e61f51d0f18ae808f5bab414480da (relecteur Opus). Verdict sur le code : OK. **La CI est rouge (gitleaks), donc la PR n'est pas fusionnable en l'état** : voir ci-dessous. `pilotage/ARRET` absent sur origin/main.

## CI à cette tête (run 43161951239)
- Verts : types, lint, tests, gardes, e2e, licences, stryker.
- Rouge : `gitleaks`, et donc `verifier`, qui ne fait que reprendre son résultat.
- Cause exacte : 1 finding, règle `generic-api-key`, entropie 3,64. Il porte sur `apps/serveur/src/__tests__/profil-isolation.test.ts:20`, **au commit 77471fd530405740fd8e564fdec82337315a2202** (« wip: tests adaptés, isolation, journal, fiche fait »). C'est le deuxième commit de la PR, pas le premier : le premier, 0e4ef5c9, ne déclenche rien. La valeur signalée est la clé d'idempotence fictive `cle-fictive-isolation-01` : faux positif, ce n'est pas un secret.
- Le renommage a bien marché à la tête : la ligne vaut maintenant `valeur-factice-de-test`, et gitleaks ne signale rien sur 7ebeee55 ni sur cff7b89c. Mais l'action lance `gitleaks detect --log-opts=--no-merges --first-parent 0e4ef5c9^..cff7b89c`, qui analyse le diff de **chaque commit** de la PR. L'ancienne valeur reste dans 77471fd5, et le job restera rouge à chaque relance, quel que soit le contenu de la tête.
- Le `.gitleaksignore` ajouté en 7ebeee55 a été retiré en cff7b89c, puisqu'il est hors `fichiers_autorises`. L'effet net est nul.
- Pour débloquer, sans force-push : c'est un geste de Will, pas un défaut de l'auteur.
  - Soit une fiche qui autorise `.gitleaksignore` (fichier sensible) avec l'empreinte `77471fd530405740fd8e564fdec82337315a2202:apps/serveur/src/__tests__/profil-isolation.test.ts:generic-api-key:20`.
  - Soit une nouvelle branche depuis origin/main, avec le diff actuel en un seul commit, dans une nouvelle PR.
  - Soit une fusion par Will malgré ce job.

## Vérifié
- 24 fichiers, tous dans `fichiers_autorises`. Taille 292 lignes, plus 55 lignes d'`openapi.json` comptées à part (exemption L00-T38). La limite est de 300, et `gardes` est vert en CI.
- `pnpm contrat:openapi` puis `pnpm contrat:diff` : aucun écart.
- Les 4 tests nommés sont présents et au vert. Sur les tests du profil (serveur, contrat, `contrat-commun`, `commun-profil-ecriture`) : 10 fichiers, 417 tests verts.
- Tests existants adaptés : les 6 `expect` retirés sont remplacés un pour un par le même `expect` sur le chemin préfixé. Les suites communes passent par `sousSociete` et, sur le vrai serveur, par un jeton fictif et `creerFauxSessions`. Sans session, elles tombent en 401.
- Cinq mutations, toutes annulées, toutes rougissent :
  - retrait de la comparaison de société (1 test) ;
  - retrait du 401 (1 test) ;
  - retrait de l'override `toJSON` du 404 (1 test) ;
  - retrait de `exigerSociete` sur `confirmerChangement` (2 tests) ;
  - retrait de `exigerSociete` sur `ajouterValeurChamp` (2 tests).
- Le corps du 404 pour une société d'autrui est identique à celui d'une route inconnue : `{ code: 'INTROUVABLE', status: 404 }`. Les chemins sans préfixe donnent 404 sur le vrai serveur, mais restent servis par le faux serveur (E45, E39).
- `app.ts` n'ajoute que `sessionVerifiee` au contexte (+3/−2 lignes). `session` et `ContexteSession` sont inchangés.
- Données fictives (`soc-lemoine`, `soc-autre`, `personne-fictive-1`, jeton `jeton-fictif-lemoine`). Aucune adresse, aucun port, aucun secret, aucun mot interdit, aucun prix. Journal de 7 lignes, fiche à `fait`.

## Remarques (non bloquantes)
- Défaut de fiche : l'étape 2 demande que `versSessionRoute` « perde `societeId` », mais `apps/serveur/src/securite/jeton.ts` n'est pas dans `fichiers_autorises`. Ce n'est donc pas fait, et c'est correct. À reprendre dans L09-T52 ou L09-T53.
- Le service du profil reste mono-société (`soc-lemoine`). Une session d'une autre société qui appelle son propre préfixe passerait la garde et lirait les données fictives de Lemoine. C'est sans effet aujourd'hui (données fictives, aucune base), mais il faudra brancher le service sur `session.societeId` avec la base (L09-T48).
- La validation de l'entrée par oRPC passe avant le handler : un corps invalide rend 400, avant le 401 ou le 404. Cela ne révèle rien sur la société, mais c'est à garder en tête pour L09-T52.
- La classe `Introuvable` force `toJSON` par un double cast `as unknown as`. C'est acceptable et testé, mais c'est fragile si oRPC change sa sérialisation.
