VERDICT: OK
SHA relu : 50987ef5a7d9e17e5e9b0395b8d8946534e24201

# Avis relec85-g01-889 : PR 889, fiche L03-T44 (écran E19 Ma TVA)

Branche relue : `lot-03/L03-T44`, un commit (50987ef).

## Vérifications
- Fichiers : les 6 fichiers modifiés figurent dans `fichiers_autorises`.
- Taille : 226 lignes ajoutées, 1 retirée, sous le plafond de 300. Aucune ligne « - - ».
- Tests : les 6 tests nommés sont présents, plus `liste-de-periodes-vide`. Les cas limites exigés sont couverts : `piecesARegarder` à 1 (singulier) et liste de périodes vide. Vitest ciblé : 7 sur 7 passent.
- Mutations (annulées ensuite), chacune fait rougir au moins un test :
  1. un `Montant` ajouté dans la branche « doute » : `doute-aucun-montant-affiche` échoue ;
  2. libellé de `Pastille` vidé : `affiche-les-periodes` échoue ;
  3. le code `acces_refuse` n'est plus reconnu : `etat-erreur-403` échoue ;
  4. `piecesARegarder(2)` en dur : `doute-aucun-montant-affiche` échoue (cas singulier) ;
  5. branche `regime_non_traite` retirée : `regime-non-traite` échoue ;
  6. état `vide` ignoré : `liste-de-periodes-vide` échoue.
- Contrat : `ReponseEstimationTva`, `ReponsePeriodesTva` et `ReponseExercices` sont importés et jamais redéfinis. Le contrat définit `/exercices` « du plus récent au plus ancien », donc `body[0]` désigne bien l'exercice le plus récent.
- Textes : tous passent par `packages/textes/src/ecrans/e19.ts`, au vouvoiement. Il n'y a pas de `<main>` et le `<h1>` est unique.
- Aucun mot interdit, aucun prix, aucune donnée réelle (EX2026 est fictif), aucune affirmation fiscale, aucun taux ni seuil en dur.
- Gardes `garde:textes`, `garde:appels` et `garde:fictif` : vertes. `pnpm verifier` : toutes les étapes passent sauf « types », bloquée par le moteur (Node 22 dans le cloud). `pnpm -r exec tsc --noEmit`, lancé avec `engine_strict=false` : code 0. Suite complète : 685 fichiers, 6348 tests passent.
- Journal : 7 lignes, commence par `# Journal L03-T44`.

## Remarques (non bloquantes)
- `apps/web/src/ecrans/e19/route.tsx:9` : `groupe: 'menu'` au lieu du `'declarations'` demandé par la fiche. C'est justifié : le type `DefinitionEcran` (`socle/ecrans.ts`, hors périmètre) n'accepte que `'menu' | 'reglages' | 'autre'`, et l'écart est noté au journal. Prévoir une fiche si un groupe `declarations` est voulu.
- `Ecran.tsx` : le séparateur « . » qui suit `piecesARegarder(n)` est un caractère écrit dans le `.tsx`. Il est toléré par `garde:textes`.
