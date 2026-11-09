VERDICT: OK
SHA relu : e902e8db9bd15362ae45d3a3db53d4ba8fac117b
PR 909, branche pilotage/L11-T38-deblocage, fiche L11-T38 (sensible).

## Vérifications
- Diff : un seul fichier, `pilotage/fiches/L11-T38.md`, 2 ajouts et 1 retrait. Seule la ligne `bloque_par` est remplacée et un point 3 est ajouté à la fin de « À faire ». L'en-tête (statut, sensible, depend_de, fichiers_autorises, taille, critères), les tests nommés, le hors périmètre et les pièges ne changent pas.
- Le déblocage cite D42 et D29 (décision de Will du 09/11/2026) et rappelle J3a, donné le 07/11/2026 avec ses quatre conditions, dans les mêmes termes que les fiches déjà fusionnées (L12-T48, L03-T56). Aucune autre décision n'est invoquée pour lever le blocage : ni J10, ni D43, ni Q*, ni contact prestataire, ni vraies données. Le motif d'origine est gardé comme contexte.
- Le point 3 reprend la règle 13 de `CONSIGNE-AUTEUR3.md` : aucune adresse, machine, port, identifiant ni secret ; des réglages lus à un seul endroit, avec des valeurs fictives ; une interface et un faux service pour ce que fournit la console ; une base et des tables propres à la compta.
- Le travail de la fiche passe déjà par `PortSession` et `creerFauxSessions` (L00-T50), donc par une interface et un faux. Il n'a besoin d'aucune base réelle, ce qui est cohérent avec D29 et J3a.
- Carte des gestes G01 (PR 897) : G01 = valider une écriture, permission `compta-valider`, réauthentification `jamais`. La fiche exige `compta-valider` pour la validation et le test `valider-sans-compta-valider-403`, ce qui est cohérent. Elle ne retire ni n'affaiblit aucune entrée de `ROUTES_A_GESTE`.
- `node outils/gardes/fiches.mjs` sur la branche : 891 fiches cohérentes, 336 avertissements, les mêmes que sur origin/main.
- Aucun mot interdit, aucun prix, aucune adresse ni secret.

## Remarques (non bloquantes)
- La règle 13 interdit aussi « aucun accès direct à la base ou aux fichiers de la console ». Le point 3 ne le dit qu'implicitement, par la phrase sur l'interface et le faux service.
- D'anciennes fiches citent « D42 tranchée le 07/11/2026 (Hetzner) ». La D42 du 09/11/2026 (serveur d'Axion IA) la remplace. Une fiche de suite pourrait aligner ces anciennes fiches.
