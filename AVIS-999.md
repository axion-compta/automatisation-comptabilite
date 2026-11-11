VERDICT: A CORRIGER
SHA relu : 26d7a4a1efe1555a48e4271869482f96926e266f

# Avis de relecture PR 999 (L08-T43). Fiche sensible : fusion par Will seul

Fiche lue sur origin/main. Relecture au SHA ci-dessus. Le code suit la fiche, mais trois tests nommés ne jouent pas le scénario qu'elle impose.

## Défauts bloquants (tous dans `apps/serveur/src/taches/__tests__/sondes-exploitation.test.ts`)
1. Lignes 21, 92 et 93, test `regroupement-dans-l-heure`. La fiche demande un troisième passage « une heure pile après le premier : renvoyé ». Le test règle `alertes.regroupement_secondes` à `'5400'` et passe à +90 min. Correction : `'3600'` à la ligne 21 et `apres(MAINTENANT, 60)` aux lignes 92 et 93.
2. Ligne 18, test `r14-copie-en-retard-une-alerte`. La fiche demande « 3 h de retard, 2 h permises ». Le test n'en permet qu'une (`'sonde.copie_retard_max_secondes': '3600'`). Correction : `'7200'`. Avec les corrections 1 et 2 appliquées ensemble (essai jetable, annulé), les 11 tests restent verts.
3. Ligne 125, test `reglage-absent-propage`. La fiche exige une `ErreurReglage` de code `reglage_absent`. Le test ne contrôle que le code. Correction : importer `ErreurReglage` et ajouter `expect(erreur).toBeInstanceOf(ErreurReglage)`.

## Mutations à la main (appliquées puis annulées, dans `sondes-exploitation.ts`)
- `sonde_muette` envoyée sur le canal principal : `r14-sonde-muette-canal-distinct` échoue.
- Plus d'écriture en mémoire dans `passerSondeSante` : deux tests de santé échouent.
- Les alertes envoyées ne sont plus mémorisées : `regroupement-dans-l-heure` échoue.
- Le `catch` des sources relance l'erreur d'origine : `alerte-sans-hote-ni-nom` échoue.

## Contrôles
- Fichiers : 4, tous dans `fichiers_autorises`. Taille : 297 + 1 lignes, sous 300.
- Vitest : 11 tests verts sur 11. `tsc --noEmit` vert sur `apps/serveur`. `verifier.mjs --gardes` : 21 étapes vertes. En local, `pnpm verifier` bute sur Node 22. La CI GitHub au SHA relu est verte.
- Aucun import de `apps/serveur/src/ia`, aucun client réseau.
- Aucune valeur légale en dur, aucun prix ni secret, aucun mot interdit. Données fictives (`hote-fictif.exemple.fr`). Journal : 5 lignes, il commence par `# Journal L08-T43`.

## Remarques
- `sondes-exploitation.ts:89` : `passerSondesHoraires` réécrit `echecsConsecutifs` avec la valeur lue avant les envois. Si les sondes tournaient en même temps sur la même mémoire, l'écriture de la sonde de santé serait perdue. À surveiller au branchement réel.
