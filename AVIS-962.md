VERDICT: OK
SHA relu : 5c333f86297225c3adacb310a99b9f9dd0855530

Fiche L15-T53, PR 962. 8 fichiers, tous dans fichiers_autorises ; 189 ajouts / 6 retraits (max 280) ; journal 8 lignes, en-tête correct ; aucun mot interdit, aucun prix, aucune donnée réelle ; aucune nouvelle dépendance. CI verte (9/9) au SHA relu.

## Tests
- `vitest run src/socle` (apps/web) : 10 fichiers, 101 tests verts (94 existants + 7 nommés : compteur-par-entree, point-exclamation-si-urgent, rien-a-zero, libelle-accessible-complet, cloche-s-ouvre-et-se-ferme, evenement-ouvrir-cloche, compteurs-en-panne-coque-intacte).
- Mutations à la main, toutes annulées :
  - « ! » toujours affiché : rouge (point-exclamation-si-urgent) ;
  - écoute de `ouvrir-cloche` retirée : rouge (evenement-ouvrir-cloche) ;
  - Compteur retiré de la barre du bas : rouge (compteur-par-entree) ;
  - libellé « dont une urgente » retiré : rouge (libelle-accessible-complet) ;
  - affichage à zéro : rouge (rien-a-zero) ;
  - condition `etat !== 'erreur'` retirée : reste VERT (voir remarque 1).

## Remarques (non bloquantes)
1. apps/web/src/socle/Compteur.tsx:25 : la mutation qui retire `compteurs.etat !== 'erreur'` survit. En panne (500), les données sont absentes, donc le test ne distingue pas. Un cas « compteurs reçus puis panne » (données périmées conservées) fixerait ce comportement.
2. apps/web/src/socle/Compteur.tsx:23 : sans exercice ouvert, la lecture interroge `/exercices/_/compteurs` toutes les 30 s pour rien. Mieux : ne pas interroger tant qu'aucun exercice n'est ouvert.
3. apps/web/src/socle/Coque.tsx:56-57 : sans exercice ouvert, ni le bouton de la cloche ni l'écoute de `ouvrir-cloche` n'ont d'effet visible. À noter au journal si c'est voulu.
4. Piège de la fiche : `Coque.tsx` est partagé avec le lot 07. Vérifier qu'aucune autre PR ouverte ne touche ce fichier avant de fusionner (base de la PR : 69605cb, main est plus récent).
