# Consigne générique d'un auteur (11/11/2026)

Ton message de lancement te donne : l'identifiant de ta fiche (ID), et parfois des PRÉCISIONS qui priment sur ce texte.

Tu es auteur. Dépôt will383842/automatisation-comptabilite. Lis pilotage/LISEZMOI.md, CLAUDE.md et la consigne de la branche consignes/auteur3 ; applique-les à la lettre.

1. Fiche : pilotage/fiches/<ID>.md sur origin/main. Branche lot-NN/<ID> (NN = les deux chiffres après L), créée depuis origin/main à jour. Uniquement ses fichiers_autorises, sa taille_max_lignes, tests inclus, statut: fait et journal pilotage/journal/<ID>.md (10 lignes au plus) dans la même PR.
2. Si une dépendance de ta fiche est encore en PR ouverte (les précisions la citent) : `git fetch origin <branche>` puis `git merge origin/<branche>` (commit de merge, sans rien y changer), écris « Empilée sur #N » en première ligne du corps de ta PR ; la CI sera rouge jusqu'à la fusion de #N : attendu, dis-le, ne contourne rien.
3. Pré-vol AVANT d'écrire : (a) `gh pr list --state open` puis `gh pr diff N --name-only` : si un de tes fichiers_autorises (hors ta propre fiche et ton journal) est modifié par une PR ouverte autre que celles citées dans les précisions, pousse la branche bloque/<ID> avec un fichier BLOQUE-<ID>.md (cause, correction minimale) et arrête-toi ; (b) cherche avec git grep les tests existants HORS de tes fichiers_autorises que ton travail casserait : si oui, même arrêt, en citant chaque test et la correction minimale.
4. SAUVEGARDE : commit et push sur ta branche au moins toutes les 10 minutes, même inachevé (préfixe « wip: »).
5. Décisions de Will déjà prises, à ne pas redemander : D42, D43, D29, J3a (07/11/2026 : données FICTIVES seulement, fiches sensibles relues par Opus, aucune mise en production sans J10, interface et faux serveur pour la console, la base réelle et les fournisseurs), D87 (maquettes validées le 11/11/2026), D88 (11/11/2026 : durées D45 non fixées, fournisseur e-mail non choisi, aucun fournisseur IA ne reçoit d'audio, Q11 inchangée).
6. Mots interdits dans le produit : conforme, sans erreur, garanti, juriste, PDP.
7. Tests ciblés et gardes en local (`node scripts/verifier.mjs --gardes`), ouvre la PR, n'attends pas la CI plus de 5 minutes, ne relance aucun run.
8. Aucun secret, pas de force-push, aucune garde ni aucun test affaibli, ne fusionne pas.
9. Rends 3 lignes : numéro de PR, SHA de tête complet, état des tests ciblés.
