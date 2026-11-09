VERDICT: A CORRIGER
SHA relu: f9e2b85f45e256a067d824b694e52f1379f1bc9b

# Avis relec111-g01-902 — PR 902, branche pilotage/L05-T56-deblocage (fiche sensible)

## Vérifications
- Diff : un seul fichier, `pilotage/fiches/L05-T56.md` (2 ajouts, 1 retrait) ; seuls la ligne de blocage (l. 20) et le point 4 de « À faire » (l. 27) changent.
- Blocage levé : le motif d'origine était « feu vert J3a et réponse de la console sur le schéma et le module C4 (D29, ADR 0060 non réglé) ». J3a est cité comme donné le 07/11/2026 (cohérent avec les journaux sur main) et la réponse de la console est levée par D29 (avancer sans l'attendre) ; D42 couvre la base séparée. Aucune levée fondée sur D43, Q*, J10, un contact prestataire ou de vraies données.
- Point 4 : reprend la règle 13 de `CONSIGNE-AUTEUR3.md` (réglages lus à un seul endroit, valeurs fictives, interface + faux service, base et tables propres).
- `node outils/gardes/fiches.mjs` sur la tête : « 891 fiches cohérentes », code 0.
- Aucun mot interdit, aucun prix, aucune adresse ni secret.

## Défaut
1. `pilotage/fiches/L05-T56.md:12` et `:33` — la fiche est débloquée alors que son propre « Pièges » (l. 33) exige : « corriger `fichiers_autorises` AVANT de lancer l'auteur ». Le seul chemin de migration autorisé, `apps/serveur/migrations/0XX_chat.sql`, rend la fiche inexécutable :
   - « 0XX » est un littéral, pas un numéro ;
   - le dossier n'est pas celui des migrations du dépôt (`apps/serveur/src/base/migrations`, constante `DOSSIER` de `outils/gardes/migrations.mjs:7`) : une migration posée là échapperait à `garde:migrations` (additive, N/N-1) et ne serait pas appliquée, donc le critère « migrer appliqué deux fois » ne peut pas être tenu honnêtement ;
   - le nom avec `_` échoue au format `NNN-nom.sql` exigé par `analyserNoms` (`nom_invalide`).
   L'auteur ne peut ni deviner le chemin ni élargir `fichiers_autorises` (règle 1). Correction demandée : dans la même PR, remplacer ce chemin par `apps/serveur/src/base/migrations/NNN-chat.sql` avec un numéro libre supérieur au dernier sur main (aujourd'hui `080`), et aligner le point 1 de « À faire » (« nom et numéro selon la convention du dépôt, `garde:migrations` ») ; ou garder le blocage jusqu'à cette correction.

## Remarques
- Le « 0XX » littéral est à corriger par l'auteur de la PR de pilotage (voir défaut ci-dessus : ici il rend la fiche inexécutable).
- La note « ADR 0060 non réglé » reste au motif d'origine : préciser que D29 permet d'avancer sans l'ADR, avec un schéma propre à la compta.
