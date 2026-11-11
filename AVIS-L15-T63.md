VERDICT: OK
4bac8c363b22cfd45d63de7bdd41393afa9786ea

# Avis PR 1047 (L15-T63, résumé quotidien par e-mail) : seconde relecture, SENSIBLE

Relu au SHA de tête ci-dessus, après la correction qui répond à l'avis A CORRIGER du SHA f536b12. Fiche lue sur origin/main (82aa0a7). D88 : aucun fournisseur d'e-mail choisi, interface `PortEnvoi` et faux de test seulement, aucun envoi réel. Fusion par Will seul.

## Défauts de l'avis précédent : vérifiés par mutation
1. Journal en échec après envoi : la réservation reste prise (`parti`), l'erreur remonte (`envois_en_echec`). Test « journal en échec après envoi : aucun second envoi ».
   - libération même après l'envoi (`if (!parti)` → `if (true)`) : le test rougit ;
   - `parti = true` retiré : le test rougit.
2. Chaque personne est isolée : la décision et le calcul de l'heure sont dans le `try` ; une erreur donne `echec` pour cette personne seule. Tests `it.each` : compte NaN, infini, non entier, heure invalide, fuseau invalide ; la personne suivante reçoit son résumé.
   - décision remise hors du `try` : les 5 cas rougissent ;
   - `throw new Error('envois_en_echec')` retiré : 4 tests rougissent ;
   - libération après échec d'envoi retirée : le test de reprise rougit.
- Remarques précédentes traitées : `dejaEnvoyes()` lu une fois par passage ; catégorie à 0 absente du rendu (mutation `x.n > 0` → `x.n >= 0` : le test du rendu rougit).

## Contrôles
- Périmètre : 4 fichiers, tous dans `fichiers_autorises`. Taille : 298 pour un maximum de 300. Aucune ligne « - - ». Aucun nom de fournisseur, aucun montant ni nom de tiers, aucun mot interdit, aucun prix, données fictives (`exemple.fr`). 07:30 et Europe/Paris marqués HYPOTHÈSE.
- Tests locaux (Node 22) : `resume-email.test.ts` 18 sur 18. CI verte au SHA relu (run 43092943920 : verifier, tests, e2e, gardes, types, lint, licences, gitleaks, stryker). Fusion avec main sans conflit (mergeable : clean).

## Remarques
- `pilotage/journal/L15-T63.md` n'est plus à jour : « 12 passent » (18 désormais) et « Fiche non touchée : en attente de #1032 » (#1032 est fusionnée). La fiche reste `statut: a_faire` alors que L15-T68 dépend d'elle : à passer à `fait`, ici ou par une PR de statut après la fusion.
- Une heure hors bornes (ex. 25 ou -1) n'est pas refusée : `Date.UTC` la reporte au jour voisin (25 : aucun envoi ; -1 : envoi dès minuit). Sans danger pour le critère « un envoi par jour », mais à valider à la saisie de l'heure.
- Un jeton est créé avant un envoi en échec et reste valide (usage unique) : à nettoyer avec le stockage réel.
