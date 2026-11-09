VERDICT: OK

PR 904 — branche pilotage/L05-T65-deblocage — fiche L05-T65 (sensible)
SHA relu : c9c6acec64be485196e10d605014cf9e1c575aa2
Base : origin/main 31b9892 (branche à jour de main, un seul commit)

## Contrôles faits
- Diff : un seul fichier, `pilotage/fiches/L05-T65.md`, 2 ajouts et 1 retrait (numstat sans « - - »). Seuls changent la ligne `bloque_par:` (remplacée par « Débloquée par la décision de Will du 09/11/2026 … ») et le point 3 ajouté à « À faire ». En-tête (statut, sensible, depend_de, fichiers_autorises, taille, critères) inchangé.
- Le point 3 reprend la règle 13 de `CONSIGNE-AUTEUR3.md` : aucune adresse, machine, port, identifiant ni secret ; réglages lus à un seul endroit avec valeurs fictives ; interface + faux service pour ce que la console fournit (ici la réponse C4 `actionsAutomatiquesAutorisees` / `classerAction`) ; base et tables propres à la compta.
- Blocage d'origine : D29 (réponse C4 de la console) et Q6 (qui ouvre l'interrupteur). D29 est levé par la décision du 09/11/2026 (interface + faux service). Q6 est tranchée par D59 dans `documents-de-reference/decisions_en_attente.md` du dépôt privé (ligne 116, 07/11/2026) : double clé (le client administrateur le demande, Axion l'ouvre dans la console), niveau B réversible seulement, liste vide par défaut. Le contexte de la fiche (spec 05 fichier 04 §8 : liste vide par défaut, niveau B réversible, `brouillon` ne fait rien, acteur `agent:<nom>` journalisé et annulable) et les tests nommés sont cohérents avec D59. Aucune autre décision (J3a hors rappel, D43, J10, contact prestataire, vraies données) n'est invoquée pour lever le blocage.
- Dépendances L05-T09 et L05-T58 : `statut: fait` sur origin/main.
- `node outils/gardes/fiches.mjs` : 891 fiches cohérentes, code 0, aucun avertissement sur L05-T65 (336 avertissements, mêmes que main). `perimetre.mjs` et `textes.mjs` verts.
- Aucun mot interdit, aucun prix, aucune adresse ni secret.

## Remarques (non bloquantes)
- Le texte de déblocage ne cite que D42 et D29 alors que Q6, second motif du blocage, est levée par D59 ; Q6 reste écrite comme question ouverte dans « Motif d'origine ». Un auteur qui applique le point 8 (d) de la consigne auteur3 (« Q6 encore ouverte → BLOQUÉE ») sans lire le point 9 pourrait s'arrêter. Ajouter « Q6 tranchée par D59 (07/11/2026) : double clé, niveau B réversible seulement, liste vide par défaut » dans le Contexte.
- Dans le registre du dépôt privé, D42 désigne encore « Hetzner hébergeur principal » (07/11) et D29 le jour limite du 21/11 (D54) ; la décision du 09/11/2026 n'y est pas encore inscrite. L'inscrire pour que les numéros cités se retrouvent.
- Le registre emploie aussi « Q6 » pour D60 (suivi d'erreurs, autre spec) ; préciser « Q6 de la spec 05 » éviterait la confusion.
