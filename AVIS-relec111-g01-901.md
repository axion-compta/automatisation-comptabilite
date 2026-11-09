VERDICT: OK
SHA relu: ce70124fac303d3060d293c791affb75eead693c

# Avis relec111-g01-901 — PR 901, branche pilotage/L04-T52-deblocage (fiche sensible)

## Vérifications
- Diff : un seul fichier, `pilotage/fiches/L04-T52.md` (2 ajouts, 1 retrait). En-tête inchangé (statut, fichiers_autorises, exigences, criteres, taille_max_lignes) ; aucune autre section touchée.
- Ligne 20 : `bloque_par` remplacée par « Débloquée par la décision de Will du 09/11/2026 : D42 … et D29 … ». Le motif d'origine portait sur D42 (hébergement) et D29 (files de la console) : le blocage levé correspond exactement à D42/D29. J3a est cité comme déjà donné le 07/11/2026 (cohérent avec les journaux sur main, ex. L03-T52, L13-T48) ; aucune levée fondée sur D43, Q*, J10, un contact prestataire ou de vraies données.
- Ligne 26 : point 3 ajouté en fin de « À faire » ; il reprend la règle 13 de `CONSIGNE-AUTEUR3.md` (aucune adresse, machine, port, identifiant ni secret ; réglages lus à un seul endroit, valeurs d'exemple fictives ; interface + faux service pour ce que fournit la console ; base et tables propres à la compta).
- `node outils/gardes/fiches.mjs` sur la tête : « 891 fiches cohérentes », code 0 (mêmes 336 avertissements que sur main).
- Aucun mot interdit, aucun prix, aucune adresse ni secret.

## Remarques (non bloquantes)
- Le critère « T-LEC-26 rejoué sur les vraies files » et le point 1 « branchement … sur les files de la console » supposent le vrai service, alors que le point 3 impose l'interface et le faux service : l'auteur devra rejouer T-LEC-26 contre le faux service et le dire au journal ; à reformuler par Will à l'occasion.
- Le point 3 ne reprend pas mot pour mot « aucun accès direct à la base ou aux fichiers de la console » de la règle 13 ; le sens est couvert par « interface et faux service », à préciser si besoin.
