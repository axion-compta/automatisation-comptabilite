VERDICT: A CORRIGER

PR #1087, fiche L02-T68, SHA de tête relu : 06cca869b4858e352f23d36f291f839b92c6aa86

## Vérifications
- Fichiers : les 5 du diff sont dans `fichiers_autorises` ; `Ecran.tsx`, `route.tsx`, `e03.test.tsx`, `api.ts` et le faux serveur ne sont pas touchés.
- Taille : 298 lignes ajoutées, 1 retirée (limite 300).
- Les 10 tests nommés sont présents et verts ; `apps/web/src/ecrans/e03` et `packages/textes` : 21 fichiers, 134 tests verts. CI : 9 jobs verts.
- Mutations (toutes rouges, puis annulées) : aperçu limité à 11 lignes, verrou contre le double clic retiré, Confirmer actif malgré une question restante, contrôle « IMPOSSIBLE » affiché comme « vérifié ».
- Textes dans e03-releve.ts, vouvoiement ; aucun mot interdit, aucun IBAN, données fictives.

## Défaut
1. apps/web/src/ecrans/e03/ImportReleve.tsx:77 : `formaterDateAffiche((rapport.dejaImporteLe ?? '').slice(0, 10))` lève « Date invalide : » quand `dejaImporteLe` est absent. Ce champ est optionnel dans `RapportReleve`, donc un rapport `{ etat: 'deja_importe' }` sans date est un cas valable pour le type. Constaté avec un test de sonde (non poussé) : le rendu lève et l'écran entier disparaît, sans message. Le `?? ''` montre que le cas était prévu, mais il mène à l'exception.
   Correction demandée : sans date (ou avec une date illisible), afficher une phrase sans date, par exemple une clé `dejaImporteSansDate` dans `packages/textes/src/ecrans/e03-releve.ts` (« Ce relevé est déjà importé. »), sans aperçu ni bouton Confirmer. Ajouter dans `deja-importe-zero-ligne` un cas sans `dejaImporteLe` qui échoue avant la correction.

## Remarques (non bloquantes)
- ImportReleve.tsx:88 : même risque si le service renvoie une ligne d'aperçu dont la date est mal formée (sonde : l'écran lève sur `31/03/2026`). Le serveur fait foi, mais un repli (date brute affichée) éviterait de perdre l'écran.
- ImportReleve.tsx:98 : `key={choix}` donne des clés en double si deux choix portent le même texte ; `key={i}` suffit.
