VERDICT: OK

# Avis relec114-g01-907 : PR 907, pilotage/L10-T51-deblocage

SHA relu : 2c83c4c1a859a5ebc85444803fb6bfe1a1fe7d17

## Vérifications
- Diff : un seul fichier, `pilotage/fiches/L10-T51.md` (2 ajouts, 1 retrait). Un seul commit au-dessus de origin/main.
- En-tête YAML intact (statut `a_faire`, `sensible: oui`, `depend_de`, `fichiers_autorises`, `taille_max_lignes`, `criteres` inchangés). Sections « Hors périmètre » et « Pièges » inchangées.
- La ligne `bloque_par:` est remplacée par « Débloquée par la décision de Will du 09/11/2026 : D42 (...) et D29 (...) ». Le motif d'origine reste comme contexte. Le texte ne lève ni J10 (« aucune production sans le feu vert J10 »), ni D43, ni une question Q*, ni un contact prestataire, ni l'usage de vraies données (« données FICTIVES seulement », « Hors périmètre : Données réelles »). J3a est cité comme déjà donné le 07/11/2026, ce qui correspond au point 8 de CONSIGNE-AUTEUR3.md.
- Point 3 ajouté à « À faire » : il reprend la règle 13 de origin/consignes/auteur3:CONSIGNE-AUTEUR3.md (aucune adresse, nom de machine, port, identifiant ni secret ; réglages lus à un seul endroit avec valeurs d'exemple fictives ; interface et faux service pour ce que la console fournit ; base et tables propres à la compta).
- `node outils/gardes/fiches.mjs` sur la branche : code 0, « 891 fiches cohérentes ». Les avertissements sont les mêmes que sur main. La règle « dépend d'une fiche bloquée » ne se déclenche pas (L10-T00 et L10-T33 ne sont pas bloquées).
- Aucun mot interdit, aucun prix, aucune adresse ni aucun secret dans la fiche.

## Remarques (non bloquantes)
- La phrase « Le nom et l'emplacement exacts du dossier de migrations seront fixés par la réponse de la console » reste, alors que D29 permet d'avancer sans cette réponse. Le chemin `apps/serveur/migrations/0100_ventes.sql` fixé par `fichiers_autorises` suffit pour l'auteur. On pourra la reformuler plus tard.
- Le point 3 ne reprend pas mot pour mot « aucun accès direct à la base ou aux fichiers de la console ». L'idée est couverte par « la compta garde sa propre base et ses propres tables » et par le piège « Ne jamais toucher aux dépôts de la console ». Le relecteur du code devra vérifier que la migration ne vise pas le schéma `a_compta` de la console.
