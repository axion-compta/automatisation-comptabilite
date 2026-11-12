VERDICT: A CORRIGER

PR n°1223, fiche L23-T11 (sensible), relue au SHA de tête dd0789486967de9b72f427dd5d63bf65c1c567df.

## Défaut
1. Une mutation survit sur la condition qui autorise l'exonération, dans `packages/noyau/src/controles/regles/ventes-b.ts:66` (`rempli`). Si l'on remplace `v.trim() !== ''` par `v !== ''`, une trace `valide` dont `idRequete`, `horodatage` ou `empreinteReponse` ne contient que des espaces autorise l'exonération, et les 301 tests de `controles/regles` restent verts. Pour une fiche sensible, une garde d'exonération sans test n'est pas acceptable.
   Correction : dans `packages/noyau/src/controles/regles/__tests__/ventes-b.test.ts`, test `valide-trace-permet-exoneration` (ou un test voisin), vérifier qu'une trace `valide` dont l'un des trois champs vaut `'  '` donne `ALERTE`, pour chacun des trois champs.

## Vérifié sans défaut
- Les 6 fichiers modifiés sont tous dans `fichiers_autorises`. Le diff fait 170 lignes, sous le maximum de 220. Rien dans `.github/`, aucune dépendance ajoutée, aucun octet NUL.
- Aucun test ni assertion n'a été supprimé. Les 6 tests nommés sont présents. 39 tests sur 39 passent (`vies.test.ts`, `ventes-b.test.ts`).
- Les mutations suivantes sont tuées :
  - `hors-perimetre`, `interrupteur-ferme` ou une panne qui donneraient `valide` ou `invalide` ;
  - une empreinte qui ignore la réponse ;
  - une horloge non injectée ;
  - `etat !== 'invalide'` ;
  - une empreinte non exigée ;
  - un statut enregistré ignoré.
- La réponse brute n'apparaît jamais en clair. `verifierVies` garde sa forme historique.
- Aucun taux, seuil, prix ou secret, aucun mot interdit, uniquement des données fictives. Le journal fait 7 lignes avec le bon en-tête.

## Remarques (non bloquantes)
- `ventes-b.ts:73` : le format de `valeur` quand un champ manque n'est pas vérifié par les tests. Une mutation qui remplace un champ non texte par `'z'` survit. Ajouter une assertion sur `valeur` avec `empreinteReponse: null`.
- `ventes-b.ts:82` : quand le statut enregistré n'est pas `verifie`, la preuve est `statut_vies:<statut>`, sans la trace VIES. La fiche demande « avec la trace en preuve » ; il serait utile de la joindre.
- `apps/serveur/src/connecteurs/vies.ts:78` : l'horodatage est pris avant l'appel. À préciser en commentaire.
- `vies.ts:72` : un numéro hors périmètre donne `a_confirmer`. Ce choix est prudent mais n'est pas documenté.
- `pnpm verifier` en local : `types` ne tourne pas (le cloud a Node 22) ; `tsc --noEmit` donne 0 erreur sur `apps/serveur` et `packages/noyau`. Une mesure de temps instable dans `filtre-sortie.test.ts` (hors PR) passe quand on la relance seule.
