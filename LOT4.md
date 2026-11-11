# Consignes du lot 4 du 11/11/2026 (relecteurs et correcteurs)

Chaque section est une consigne complète. Ne lis que la tienne.

## R1

Tu es relecteur. Dépôt will383842/automatisation-comptabilite. Lis `git show origin/consignes/relecteur:CONSIGNES-RELECTEUR.md` et applique-la à la lettre, l'une après l'autre et dans l'ordre donné, aux PR ci-dessous, chacune au SHA de tête ACTUEL (lis-le avec `gh pr view N --json headRefOid`). Dépose un avis par fiche comme la consigne le dit (branche avis/<ID>, fichier AVIS-<ID>.md, VERDICT en première ligne, SHA complet relu), dès qu'il est prêt, avant de passer à la PR suivante. Fiches sensibles : relecture avec mutations. Une garde rouge due seulement à une PR amont non fusionnée n'est pas un défaut. Ne modifie rien, ne fusionne pas.

1. PRIORITAIRE : PR #1032 (fiche L00-T83, amendement de fiches, SENSIBLE). Un avis A CORRIGER existe sur avis/L00-T83 (critères « vraie base » de L06-T40 et L06-T41, « À faire » de L15-T64) : vérifie que chaque point est corrigé et qu'aucun blocage réel n'est levé à tort. Décision D88 de Will (11/11/2026) : durées D45 non fixées, fournisseur e-mail non choisi, transcription contre interface et faux, Q11 inchangée, L04-T49 découpée en 3 fiches.
2. PR #1036 (fiche L04-T32, SENSIBLE) : un avis A CORRIGER existait (commentaire de la PR) ; vérifie par mutation que chaque défaut est corrigé.

## R2

Tu es relecteur. Dépôt will383842/automatisation-comptabilite. Lis `git show origin/consignes/relecteur:CONSIGNES-RELECTEUR.md` et applique-la à la lettre, l'une après l'autre et dans l'ordre donné, aux PR ci-dessous, chacune au SHA de tête ACTUEL (lis-le avec `gh pr view N --json headRefOid`). Dépose un avis par fiche comme la consigne le dit (branche avis/<ID>, fichier AVIS-<ID>.md, VERDICT en première ligne, SHA complet relu), dès qu'il est prêt, avant de passer à la PR suivante. Fiches sensibles : relecture avec mutations. Une garde rouge due seulement à une PR amont non fusionnée n'est pas un défaut. Ne modifie rien, ne fusionne pas.

1. PR #986 (fiche L08-T37, SENSIBLE : données de personnes) : un avis A CORRIGER existait (avis/986 ou avis/L08-T37) ; la PR #1016 est fusionnée ; vérifie par mutation que chaque défaut est corrigé et que le cloisonnement entre sociétés tient.
2. PR #1045 (fiche L06-T45, SENSIBLE) : fiche amendée par la PR #1032, référence `git show origin/lot-00/L00-T83:pilotage/fiches/L06-T45.md`.
3. PR #1042 (fiche L15-T05, sortie du lot 15) si aucun avis n'existe encore sur avis/L15-T05 : chaque mesure et chaque cas déclaré couvert doit renvoyer à un test réel.

## R3

Tu es relecteur. Dépôt will383842/automatisation-comptabilite. Lis `git show origin/consignes/relecteur:CONSIGNES-RELECTEUR.md` et applique-la à la lettre, l'une après l'autre et dans l'ordre donné, aux PR ci-dessous, chacune au SHA de tête ACTUEL (lis-le avec `gh pr view N --json headRefOid`). Dépose un avis par fiche comme la consigne le dit (branche avis/<ID>, fichier AVIS-<ID>.md, VERDICT en première ligne, SHA complet relu), dès qu'il est prêt, avant de passer à la PR suivante. Fiches sensibles : relecture avec mutations. Une garde rouge due seulement à une PR amont non fusionnée n'est pas un défaut. Ne modifie rien, ne fusionne pas.

1. PR #1041 (fiche L04-T31) si aucun avis n'existe encore sur avis/L04-T31.
2. PR #1044 (fiche L04-T40) et 3. PR #1046 (fiche L04-T41) : empilées sur #1041, relis seulement ce que chaque fiche ajoute.
4. PR #1047 (fiche L15-T63, SENSIBLE) : fiche amendée par la PR #1032, référence `git show origin/lot-00/L00-T83:pilotage/fiches/L15-T63.md` ; décision D88 : fournisseur e-mail NON choisi, interface et faux, aucun envoi réel.

## C1

Tu es correcteur. Dépôt will383842/automatisation-comptabilite. Lis pilotage/LISEZMOI.md, CLAUDE.md et la consigne de la branche consignes/auteur3. Le relecteur a rendu A CORRIGER sur la PR ci-dessous : lis l'avis complet (`git fetch origin avis/L05-T60 && git show FETCH_HEAD:AVIS-L05-T60.md`, sinon les commentaires de la PR). Corrige CHAQUE défaut, dans les fichiers_autorises de la fiche seulement, avec un test qui échoue sans la correction. N'affaiblis aucun test ni aucune garde. Données FICTIVES. Mots interdits dans le produit : conforme, sans erreur, garanti, juriste, PDP. La fiche est amendée par la PR #1032 (en cours de correction) : la version à appliquer est la plus récente de `git show origin/lot-00/L00-T83:pilotage/fiches/L05-T60.md` (fais `git fetch origin lot-00/L00-T83` d'abord) ; si #1032 est fusionnée quand tu as fini, fais `git merge origin/main` et passe la fiche à statut: fait, sinon ne touche pas au fichier de fiche. Commit et push au moins toutes les 10 minutes (pas de force-push). Tests ciblés et gardes en local, n'attends pas la CI plus de 5 minutes, ne fusionne pas. Rends 3 lignes : SHA de tête complet, défauts corrigés, état des tests.

PR #1038, fiche L05-T60 (SENSIBLE), branche lot-05/L05-T60.

## C2

Tu es correcteur. Dépôt will383842/automatisation-comptabilite. Lis pilotage/LISEZMOI.md, CLAUDE.md et la consigne de la branche consignes/auteur3. Le relecteur a rendu A CORRIGER sur la PR ci-dessous : lis l'avis complet (`git fetch origin avis/L05-T66 && git show FETCH_HEAD:AVIS-L05-T66.md`, sinon les commentaires de la PR). Corrige CHAQUE défaut, dans les fichiers_autorises de la fiche seulement, avec un test qui échoue sans la correction. N'affaiblis aucun test ni aucune garde. Données FICTIVES. Mots interdits dans le produit : conforme, sans erreur, garanti, juriste, PDP. La fiche est amendée par la PR #1032 (en cours de correction) : la version à appliquer est la plus récente de `git show origin/lot-00/L00-T83:pilotage/fiches/L05-T66.md` (fais `git fetch origin lot-00/L00-T83` d'abord) ; si #1032 est fusionnée quand tu as fini, fais `git merge origin/main` et passe la fiche à statut: fait, sinon ne touche pas au fichier de fiche. Commit et push au moins toutes les 10 minutes (pas de force-push). Tests ciblés et gardes en local, n'attends pas la CI plus de 5 minutes, ne fusionne pas. Rends 3 lignes : SHA de tête complet, défauts corrigés, état des tests.

PR #1039, fiche L05-T66 (SENSIBLE), branche lot-05/L05-T66.

## C3

Tu es correcteur. Dépôt will383842/automatisation-comptabilite. Lis pilotage/LISEZMOI.md, CLAUDE.md et la consigne de la branche consignes/auteur3. Le relecteur a rendu A CORRIGER sur la PR ci-dessous : lis l'avis complet (`git fetch origin avis/L15-T64 && git show FETCH_HEAD:AVIS-L15-T64.md`, sinon les commentaires de la PR). Corrige CHAQUE défaut, dans les fichiers_autorises de la fiche seulement, avec un test qui échoue sans la correction. N'affaiblis aucun test ni aucune garde. Données FICTIVES. Mots interdits dans le produit : conforme, sans erreur, garanti, juriste, PDP. La fiche est amendée par la PR #1032 (en cours de correction) : la version à appliquer est la plus récente de `git show origin/lot-00/L00-T83:pilotage/fiches/L15-T64.md` (fais `git fetch origin lot-00/L00-T83` d'abord) ; si #1032 est fusionnée quand tu as fini, fais `git merge origin/main` et passe la fiche à statut: fait, sinon ne touche pas au fichier de fiche. Commit et push au moins toutes les 10 minutes (pas de force-push). Tests ciblés et gardes en local, n'attends pas la CI plus de 5 minutes, ne fusionne pas. Rends 3 lignes : SHA de tête complet, défauts corrigés, état des tests.

PR #1043, fiche L15-T64 (SENSIBLE), branche lot-15/L15-T64.
