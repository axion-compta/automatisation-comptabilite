VERDICT: OK

# Avis relec114-g01-908 : PR 908, pilotage/L10-T52-deblocage

SHA relu : cbab905831fe4f2a4221992f120258c18547ff28

## Vérifications
- Diff : un seul fichier, `pilotage/fiches/L10-T52.md` (2 ajouts, 1 retrait). Un seul commit au-dessus de origin/main.
- En-tête YAML intact (statut `a_faire`, `sensible: oui`, `depend_de`, `fichiers_autorises`, `taille_max_lignes`, `criteres` inchangés). Points 1 à 3 de « À faire » et « Hors périmètre » inchangés.
- La ligne `bloque_par:` est remplacée par « Débloquée par la décision de Will du 09/11/2026 : D42 (...) et D29 (...) ». Le motif d'origine reste comme contexte. Le texte ne lève ni J10 (« aucune production sans le feu vert J10 »), ni D43, ni une question Q*, ni un contact prestataire, ni l'usage de vraies données (« données FICTIVES seulement »). J3a est cité comme déjà donné le 07/11/2026, ce qui correspond au point 8 de CONSIGNE-AUTEUR3.md. L'identité réelle passe par une interface et un faux service.
- Point 4 ajouté à « À faire » : il reprend la règle 13 de origin/consignes/auteur3:CONSIGNE-AUTEUR3.md (aucune adresse, nom de machine, port, identifiant ni secret ; réglages lus à un seul endroit avec valeurs d'exemple fictives ; interface et faux service pour ce que la console fournit ; base et tables propres à la compta).
- `node outils/gardes/fiches.mjs` sur la branche : code 0, « 891 fiches cohérentes ». Les avertissements sont les mêmes que sur main. La règle « dépend d'une fiche bloquée » ne se déclenche pas (L10-T33, T37, T39, T40, T12 et L00-T50 ne sont pas bloquées).
- Aucun mot interdit, aucun prix, aucune adresse ni aucun secret dans la fiche. Le préfixe `/api/compta/v1/societes/{s}` est une valeur par défaut de constante, pas une adresse de serveur.

## Remarques (non bloquantes)
- D'autres fiches de main décrivent encore L10-T52 comme « bloquée » dans leur texte (L10-T12, L10-T33, L10-T37, L10-T39, L10-T49). C'est du contexte sans effet sur la garde. Cette PR n'a pas à les changer (une fiche = une PR).
