VERDICT: OK
SHA relu : fb5c5ff81bfd84392660fcbc411c485a53ed1094

# Avis de relecture PR 996 (L07-T28, écran E53 « Mon abonnement »). Fiche non sensible

Fiche lue sur origin/main. Relecture au SHA ci-dessus. Aucun défaut bloquant.

## Mutations à la main (dans `apps/web/src/ecrans/e53/Ecran.tsx`, appliquées puis annulées)
- Case d'accord cochée par défaut : 3 tests échouent, dont `bouton-desactive-sans-accord`.
- Nouvelle clé à chaque envoi au lieu de `panneau.cle` : `renvoi-meme-cle` échoue.
- Message de succès avec le palier supérieur : `envoi-avec-accord-message-palier-inchange` échoue.
- Choix affichés sans `proposer_choix` : `normal-pas-de-choix` échoue.

## Contrôles
- Fichiers : 6, tous dans `fichiers_autorises`. Aucun chemin sensible, aucune dépendance. Taille : 274 lignes, sous 300.
- Vitest sur `apps/web/src/ecrans/e53` : 8 tests verts sur 8, les 8 noms de la fiche sont présents. `tsc --noEmit` vert sur `apps/web`. Gardes vertes, périmètre compris. La CI GitHub au SHA relu est verte.
- Aucun prix : ni €, ni tarif, ni montant. Le test `aucun-prix-ni-montant-a-l-ecran` le vérifie. « 100 pièces par mois » est le nom fictif d'un palier.
- Aucun mot interdit, aucun secret, aucun nom réel. Aucune valeur légale en dur : les seuils viennent des `alertes_bps` du serveur. Journal : 7 lignes, il commence par `# Journal L07-T28`.

## Remarques
- `apps/web/src/ecrans/e53/Ecran.tsx:67` : le fragment `' %'` est en dur. Un seuil non entier afficherait « 75.5 % » avec un point. Un formateur de pourcentage dans `affichage.ts` serait mieux, dans une autre fiche.
- Aucun test ne couvre le rendu des alertes de seuil (la fiche ne l'exige pas nommément).
- Après un envoi réussi, les choix restent affichés.
- `depasse-deux-choix` ne vérifie pas qu'aucun appel n'est fait après « Attendre le mois suivant ».
