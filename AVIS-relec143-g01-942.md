VERDICT: A CORRIGER
SHA relu: 2e4da2279572ff3c6054b94133e072a74c400e78
PR: 942 — L02-T60 Écran E12 : onglet « À justifier » (demandes groupées triées par impact, réponses prêtes affichées)

## Défaut
1. `apps/web/src/ecrans/e12/Ecran.tsx:115-117` : « Voir les lignes » filtre seulement la page déjà chargée (20 lignes, avec le filtre d'état, de compte et le décalage en cours), et masque la pagination. Les lignes de la demande qui ne sont pas sur cette page n'apparaissent jamais, sans aucun avertissement. Vérifié avec le faux serveur : 140 lignes, 5 demandes ; 4 demandes n'ont aucune ligne en page 1 et la 5e n'en a qu'une sur 3. Le tableau affiche alors « Lignes de la demande sélectionnée » avec un résultat vide ou incomplet. Le test `voir-les-lignes-filtre-le-tableau` ne le voit pas parce qu'il prend une ligne de la page 1.
   Correction demandée : afficher toutes les lignes de la demande, où qu'elles soient. Par exemple, lire chaque ligne (ou les pages nécessaires) à partir de `d.ligneIds`, sans le filtre d'état ni le décalage. Sinon, au minimum, remettre état, compte et décalage à zéro et annoncer clairement les lignes manquantes. Ajouter un test avec une demande dont les lignes ne sont pas en page 1 (en page 2 ou cachées par le filtre d'état).

## Vérifications
- Fichiers modifiés : 7, tous dans `fichiers_autorises` ; garde périmètre verte (224 lignes, limite 260).
- Tests : les 6 tests nommés et le test des cas limites (1 facture, nom absent, total à 0,01) passent ; dossier e12 au vert (29/29) ; `tsc`, eslint, gardes textes, appels, fictif et litteraux vertes.
- Mutations, toutes rouges : filtre retiré ; ordre de l'API inversé ; `aria-disabled` retiré ; nom du fournisseur vidé ; touche Fin vers le premier onglet.
- Réponses désactivées : aucun appel ni POST au clic, ce que le test vérifie.
- Aucun secret, aucune adresse de serveur ni de base (règle 13 de CONSIGNE-AUTEUR3), données fictives, aucun prix, aucun mot interdit, aucune garde touchée.
- Journal : 7 lignes, commence par `# Journal L02-T60`.

## Remarques (non bloquantes)
- L'onglet affiche « À justifier (0) » pendant le chargement et en cas d'erreur de lecture : mieux vaut ne pas afficher de nombre tant qu'il est inconnu.
