VERDICT: A CORRIGER

PR 903 — branche pilotage/L05-T57-deblocage — fiche L05-T57 (sensible)
SHA relu : de23e48665686e767ee45d5cfdec1a0621a46674
Base : origin/main 31b9892 (branche à jour de main, un seul commit)

## Contrôles faits
- Diff : un seul fichier, `pilotage/fiches/L05-T57.md`, 2 ajouts et 1 retrait (numstat sans « - - »). Seuls changent la ligne `bloque_par:` (remplacée par « Débloquée par la décision de Will du 09/11/2026 … ») et le point 4 ajouté à « À faire ». En-tête (statut, sensible, depend_de, fichiers_autorises, taille, critères) inchangé.
- Le point 4 reprend la règle 13 de `CONSIGNE-AUTEUR3.md` : aucune adresse, machine, port, identifiant ni secret ; réglages lus à un seul endroit avec valeurs fictives ; interface + faux service pour la console ; base et tables propres à la compta.
- Le blocage levé correspond à D42 (démarrage sur le serveur d'Axion IA, base séparée) et D29 (avancer sans la console) ; J3a cité comme déjà donné le 07/11/2026 (comme l'indique le point 8 de la consigne auteur3), J10 gardé pour la production. Aucune autre décision (D43, Q*, contact prestataire, vraies données) n'est invoquée.
- Dépendances L05-T08, L05-T28, L05-T31 : `statut: fait` sur origin/main.
- `node outils/gardes/fiches.mjs` : 891 fiches cohérentes, code 0, aucun avertissement sur L05-T57 (336 avertissements, mêmes que main). `perimetre.mjs` et `textes.mjs` verts.
- Aucun mot interdit, aucun prix, aucune adresse ni secret.

## Défaut (risque réel)
1. `pilotage/fiches/L05-T57.md:12` (`fichiers_autorises`) et `:32` (« Pièges ») : la fiche dit elle-même « Corriger `fichiers_autorises` à la levée du blocage ». La PR lève le blocage sans le faire. Le chemin `apps/serveur/migrations/0XX_ia.sql` (« 0XX » littéral) est hors du dossier surveillé par `garde:migrations` (`DOSSIER = apps/serveur/src/base/migrations`, où se trouve déjà `080-exploitation-rgpd.sql`). Un auteur qui suit la fiche crée un fichier nommé `0XX_ia.sql` que la garde « migrations seulement additives » ne lit pas : un DROP ou un RENAME passerait sans contrôle sur une fiche sensible de schéma, et le critère « migrer appliqué deux fois » n'a aucun dossier de migrations reconnu.
   Correction demandée : dans la même PR, remplacer ce chemin par un nom réel dans le dossier de la garde, au format existant, par exemple `apps/serveur/src/base/migrations/NNN-ia.sql` avec un numéro libre (ni 080, ni 0601, 015, 015b, 0901, 0100 déjà réservés), et retirer ou mettre à jour la phrase « Corriger `fichiers_autorises` à la levée du blocage (convention de la console) » puisque la convention est désormais celle de la compta (base séparée, D42).

## Remarques (non bloquantes)
- Dans `documents-de-reference/decisions_en_attente.md` (dépôt privé), D42 désigne encore « Hetzner hébergeur principal » (07/11) et D29 le jour limite du 21/11 (D54) ; la décision du 09/11/2026 (serveur d'Axion IA, base séparée, avancer sans la console) n'y est pas encore inscrite. Inscrire cette décision au registre pour que les numéros cités dans la fiche se retrouvent.
- Le point 4 pourrait reprendre aussi « aucun accès direct à la base ou aux fichiers de la console » (règle 13) ; il est couvert implicitement par « propre base et propres tables ».
