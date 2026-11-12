VERDICT: OK

PR n°1215, fiche L22-T30, tête relue : 86dd80ac093d193a57658e2456950c64b2aa362f

Ce qui a été vérifié : 5 fichiers, tous dans fichiers_autorises ; diff de 160 lignes, soit exactement le maximum de 160 ; les 6 tests nommés passent ; même en-tête que docs/mise-en-production.csv ; 11 cases, dont les cases 10 et 11 en `a_preciser`, sans énoncé inventé ; aucun secret, aucun prix, aucun mot interdit ; vérificateur fictif ; journal de 5 lignes. L'affirmation « lireListe non importable » est exacte : NB_POINTS = 19 est figé dans mise-en-production.mjs et `etat` renvoie une autre forme. La logique reprise est identique.

Mutations tuées : borne `<= NB_CASES`, doublon de numéro, `a_preciser` jamais cochée, `coche_incomplete`, nombre de colonnes, boucle des numéros manquants, `trim`, seuil des erreurs dans `main`, en-tête.

## Remarques (ne bloquent pas)
- Le mutant `remplis === 3` → `remplis >= 2` survit. Il est sans effet sur `main`, car une ligne remplie à moitié est déjà une erreur ; il n'est visible que si l'on appelle `etatOuverture` sans regarder les erreurs.
- Deux mutants équivalents survivent : `num >= 0`, déjà exclu par la regex, et le contrôle du jour dans `dateReelle`, que le contrôle du mois couvre déjà.
- La CI de la tête n'avait pas démarré au moment de la relecture (tous les jobs en file d'attente).
