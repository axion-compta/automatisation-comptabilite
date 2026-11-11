# Consignes du lot 5 du 11/11/2026 (reprise après changement de compte)

Chaque section est une consigne complète. Ne lis que la tienne. Ton prompt donne la section et les paramètres (PR, fiche).
Règles communes : dépôt will383842/automatisation-comptabilite ; lis pilotage/LISEZMOI.md et CLAUDE.md ; JAMAIS de force-push, JAMAIS de fusion, JAMAIS de secret ; données FICTIVES ; mots interdits dans le produit : conforme, sans erreur, garanti, juriste, PDP. Commit + push « wip: » toutes les 10 minutes. Une fiche amendée par une PR de pilotage ouverte : la version à appliquer est celle de cette PR (`git show origin/<branche>:pilotage/fiches/<ID>.md`).

## R (relecteur, Opus)

Tu es relecteur. Lis `git show origin/consignes/relecteur:CONSIGNES-RELECTEUR.md` et applique-la à la lettre, l'une après l'autre et dans l'ordre donné, aux PR de ton prompt, chacune au SHA de tête ACTUEL (`gh pr view N --json headRefOid`). Si un avis A CORRIGER existait (branche avis/<n°>, avis/<ID>, ou commentaire), vérifie par mutation que chaque défaut est corrigé. Dépose l'avis sur la branche avis/<ID fiche> (AVIS-<ID>.md) avec le SHA de tête complet, ET en commentaire de la PR.
Une PR dont le job `gardes` est rouge pour « garde:termine » (dépendance pas encore « fait ») ou « garde:perimetre » (fichiers d'une PR amont fusionnée en squash) : relis quand même le code ; signale-le, ce n'est pas un défaut de l'auteur.

## C (correcteur, Sonnet)

Tu es correcteur. Le relecteur a rendu A CORRIGER sur la PR de ton prompt : lis l'avis complet (`git fetch origin avis/<ID> && git show FETCH_HEAD:AVIS-<ID>.md`, sinon `avis/<n° PR>`, sinon les commentaires de la PR ; prends le plus récent). Travaille sur la branche de la PR (`gh pr view N --json headRefName`). D'abord `git merge origin/main` (pas de rebase, pas de force-push) et résous les conflits. Corrige CHAQUE défaut, dans les fichiers_autorises de la fiche seulement, avec un test qui échoue sans la correction. N'affaiblis aucun test ni aucune garde. Lance les tests ciblés et `node outils/gardes/perimetre.mjs` si possible. Pousse. Termine par un commentaire de PR qui liste chaque défaut et sa correction. Si un défaut est hors fichiers_autorises : ne le contourne pas, écris-le dans le commentaire (« défaut de fiche »).

## M (mise à niveau, Sonnet)

Tu mets à niveau les PR de ton prompt, l'une après l'autre. Pour chacune : branche de la PR, `git merge origin/main` (pas de rebase, pas de force-push), résous les conflits en gardant main pour ce qui vient d'une PR amont déjà fusionnée. But : que `git diff origin/main...HEAD --name-only` ne contienne plus QUE les fichiers de la fiche de la PR (les fichiers d'une PR amont fusionnée en squash doivent disparaître du diff). Si la garde périmètre signale « taille N lignes > 300 », réduis la taille sans retirer de test (factorise, retire les commentaires redondants). Ne change pas le comportement. Pousse, puis commentaire de PR « mise à niveau sur main ».

## S (statuts, Sonnet)

Le code de ces fiches est fusionné sur main mais leur fiche est restée `statut: a_faire`, ce qui rend rouge « garde:termine » des fiches qui en dépendent : L04-T31 (PR #1041 fusionnée), L10-T55 (PR #1040), L09-T37 (PR #1035).
Pour CHAQUE fiche, une PR séparée depuis origin/main : branche `lot-NN/<ID>` (ex. lot-04/L04-T31 ; supprimée après la fusion, tu peux la recréer), un seul changement : `statut: a_faire` -> `statut: fait` dans pilotage/fiches/<ID>.md. Titre « <ID> statut fait (code fusionné par la PR #N) ». Corps : lien vers la PR fusionnée et le journal pilotage/journal/<ID>.md.
Vérifie d'abord que chaque critère d'acceptation de la fiche est couvert par le code fusionné (lis la fiche et le journal). Si un critère manque, ne crée PAS la PR de cette fiche : commentaire sur la PR fusionnée avec ce qui manque.
Attends la CI (`gh pr checks N --watch`). Si « garde:perimetre » refuse ce changement, n'insiste pas : écris la cause exacte (message de la garde) dans le corps de la PR et arrête.
