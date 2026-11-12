# Consigne auteur : fiches de rattrapage MVP (L19 à L26)

Lis d'abord AUTEUR.md (même branche), puis applique ceci.

- Tes fiches sont données dans ton prompt (pilotage/fiches/<ID>.md sur origin/main). Elles sont indépendantes entre elles et avec les autres fiches en cours ; leurs dépendances sont faites.
- Fais-les l'une après l'autre. Pour CHAQUE fiche : branche lot-NN/<ID> depuis origin/main à jour, PR séparée dont le corps commence par `Fiche: <ID>`.
- Fiches récentes : si un chemin cité n'existe pas ou si la fiche contredit le code réel, adapte-toi au code réel dans le respect de fichiers_autorises ; si c'est impossible, pousse bloque/<ID> avec BLOQUE-<ID>.md (cause + ce qu'il faudrait) et passe à la suivante.
- Qualité avant d'ouvrir chaque PR : (1) pour chaque comparaison et chaque filtre, une mutation doit faire rougir un test ; cas limites 0, négatif, NaN, frontière ; (2) lance un sous-agent relecteur-qualité (Opus) sur ton diff et corrige ses remarques ; (3) tests ciblés en local (la CI complète tourne sur la PR).
- Commit et push `wip:` toutes les 10 minutes. Pas de fusion, pas de force-push, données fictives, aucun secret. Mots interdits dans les textes de produit : conforme, sans erreur, garanti, juriste, PDP.
