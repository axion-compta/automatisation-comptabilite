VERDICT: OK
fa9b7c7e832053ae8dc15f43560542450253b1d7

# Avis PR 1034 (L10-T48, écran détail d'une vente E24) : 2e relecture

Relu au SHA de tête ci-dessus. Fiche lue sur origin/main (`sensible: non`). Avis précédent : commentaire de PR au SHA 68b1051, verdict A CORRIGER.

## Défaut précédent
- `pilotage/journal/L10-T48.md:1` : le titre est maintenant `# Journal L10-T48`. **Corrigé**, et `gardes` est vert.

## Contrôles
- L'amont #1026 (L10-T34) est fusionné. Le diff contre main ne contient plus que les 6 fichiers de la fiche, tous dans `fichiers_autorises`. Taille : 278 + 1 = 279 pour un maximum de 280. Aucune ligne « - - ». La branche fusionne sur main sans conflit.
- CI au SHA de tête : les 9 contrôles sont verts, y compris `verifier`, `gardes`, `e2e`, `tests` et `types`. Le critère « pnpm verifier » est donc tenu en CI.
- Les 8 tests nommés passent en local (vitest, Node 24, 8 sur 8). `pnpm garde:textes` est vert. Les cas limites de `taux-en-texte` sont couverts : NaN, ±Infinity, nombre non entier (12,5), nombre négatif et 0.
- Mutations faites à la main puis annulées, 5 sur 5 détectées :
  - décimale de `tauxEnTexte` : `taux-en-texte` rougit ;
  - erreur `introuvable` non traduite : `vente-inconnue-erreur-et-retour` rougit ;
  - lien de l'avoir vers la liste : `avoir-lie-cliquable` rougit ;
  - compte remplacé par le débit : `ecriture-preparee-par-ia` rougit ;
  - libellé de ligne retiré : `affiche-la-facture-et-les-lignes` rougit.
- Aucun mot interdit, aucun prix, aucun secret, aucune valeur légale en dur, données fictives. Aucun texte en dur dans le composant. Aucun bouton qui écrit. En erreur, aucun chiffre partiel (vérifié par le test). Journal : 6 lignes, commence par `# Journal L10-T48`. Les remarques de l'avis précédent sont traitées : clé `colonnes` morte retirée, `Infinity` testé, gabarit `{ecart}` noté au journal.

## Remarques (non bloquantes)
- Point 2 de la fiche : les lignes n'affichent ni la nature ni le taux, car le contrat `VenteDetail` ne porte pas ces champs. L'écart est noté au journal. C'est à Will de décider entre une fiche de contrat et une fiche corrigée.
- Le message du commit `bb9cb06` contient un mot interdit (« conforme »). Au moment de la fusion en squash, il faut retirer ce mot du message proposé par GitHub.
