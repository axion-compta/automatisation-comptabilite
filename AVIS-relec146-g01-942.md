VERDICT: OK
SHA relu: f4a445cac853bdda09753070e2f13dcd483c1bf7
PR: 942 — L02-T60 Écran E12 : onglet « À justifier » (demandes groupées triées par impact, réponses prêtes affichées)

## Défaut de l'avis relec143-g01-942 : corrigé
- `apps/web/src/ecrans/e12/Ecran.tsx:44-51` : `toutesLesLignes` lit toutes les lignes, page par page (100 par page, le maximum accepté par le contrat), sans filtre d'état, sans compte et sans décalage. `Ecran.tsx:113` ne garde que les lignes de `d.ligneIds`, et la pagination est masquée seulement dans ce mode. La boucle s'arrête bien : page vide, ou décalage + 100 ≥ total.
- Le nouveau test `voir-les-lignes-hors-premiere-page` prend les 2 dernières lignes du premier lot de 100, donc des lignes hors de la page de 20 affichée. Mutations essayées :
  - retour à l'ancien code (filtre sur la page chargée) : le test échoue ;
  - une seule page de 20 : le test échoue ;
  - filtre d'état ajouté à la lecture : `voir-les-lignes-filtre-le-tableau` et `voir-les-lignes-hors-premiere-page` échouent.

## Onglet sans nombre inconnu : corrigé
- `Ecran.tsx:139` affiche « À justifier » sans nombre tant que `useNombreDemandes()` vaut `undefined` (chargement ou erreur). Test `onglet-sans-nombre-tant-inconnu` (réponse 500). Si on remet « (0) » quand le total est inconnu, ce test échoue.

## Vérifications
- Fichiers modifiés : 7, tous dans `fichiers_autorises`. Aucun fichier `.github/`, garde, lint, `package.json` ni lockfile touché.
- Taille : 253 lignes ajoutées et 7 retirées, soit 260 au total, pile la limite de la fiche (260). La garde de périmètre est verte en CI.
- Tests : dossier e12 vert en local (31/31, dont les 9 de `a-justifier.test.tsx`). Les 6 tests nommés et le test des cas limites (1 facture, nom absent, total à 0,01) sont présents. Le test « aucun POST » est présent.
- CI verte sur f4a445c : verifier, gardes, types, lint, tests, e2e, stryker, licences, gitleaks.
- Aucun mot interdit, aucun prix, aucun secret, données fictives seulement.
- Journal : 8 lignes, commence par `# Journal L02-T60`. Fiche : seul `statut` passe à `fait`.

## Remarques (non bloquantes)
- La lecture de la 2e page de 100 n'est pas testée. Si la boucle s'arrête après la première page (mutation essayée), aucun test n'échoue. Le code actuel est juste (le faux serveur en a 140, donc la lecture se fait en 2 pages). Un test avec une ligne au-delà de la 100e protégerait contre ce retour en arrière.
- En mode « lignes de la demande », les filtres d'état et de compte restent visibles mais sont ignorés tant qu'on n'a pas cliqué sur « Afficher toutes les lignes ». À clarifier plus tard.
