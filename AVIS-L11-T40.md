VERDICT: A CORRIGER
PR #1140, SHA de tête 63536bfb69fd61024d6ae1c4bd616abeac18da69

Fiche L11-T40 (sensible : argent, cohérence des états), lue sur origin/main. Fusion par Will seul. Seconde relecture, après l'avis A CORRIGER au SHA 3adcbd16b0d68eed66c17ab1b2687ba84462db0c.

## Contrôles passés
- 5 fichiers, tous dans `fichiers_autorises`. Taille : 238 + 12 = 250 lignes, pour une limite de 250.
- CI verte au SHA de tête (9/9). Les 7 tests du fichier passent en local (vitest, Node 22).
- Journal : 7 lignes, commence par `# Journal L11-T40`. Aucun mot interdit, aucun prix, aucun secret ; données fictives.

## Suivi de l'avis précédent (vérifié par mutation)
- Défaut 1 (`echec-de-transaction-aucun-evenement`) : levé. L'acteur est le bon et l'horodatage `pas-utc` fait échouer la construction après la mutation. Mutation « avaler l'échec de construction dans `ecrireEtPublier` » : 1 test rouge.
- Défaut 2 (version de `compta.frais.valide`) : levé. `versionDe` lit la version réelle, et la mutation `const version = 1` donne 1 test rouge. Le lecteur n'est pas branché dans `app.ts` (hors périmètre) : c'est un défaut de fiche, que je confirme. `jeuFrais` n'est connu que d'`app.ts`.
- Défaut 3 (version de `propose` après complément) : levé. La mutation `version: 1` dans `propose` donne 1 test rouge.
- Mutations également tuées : retrait du filtre `d.statut === avant` ; statut précédent ignoré.

## Défaut
1. `apps/serveur/src/domaines/frais-evenements.ts:64` : la branche « version inconnue : aucun événement » (`version === undefined ? [] : ...`) n'est couverte par aucun test. La mutation qui la retire laisse les 7 tests verts. C'est pourtant le seul chemin des routes réelles, car `routesFraisValidation` appelle `creerFraisPublies(service, unite)` sans lecteur. Sans cette branche, `creerEnveloppe` lève `champ_manquant` APRÈS que le service a passé le frais à `valide`. La route renverrait alors une erreur, avec un état modifié et sans événement.
   Correction : un test qui appelle `creerFraisPublies(service, boite)` sans `versionDe`, vérifie que `valider` aboutit (lot rendu) et que la boîte reste vide. La limite de 250 lignes est atteinte : regroupe des assertions existantes pour libérer la place, sans retirer de test.

## Remarques
- `pilotage/journal/L11-T40.md:6` dit encore « version de `valide` fixée à 1 », ce qui n'est plus vrai. À écrire : « `valide` non publié par les routes tant que `versionDe` n'est pas branché dans `app.ts` (défaut de fiche) ». Le point 2 du corps de la PR est à mettre à jour de la même façon.
- Les mutations suivantes survivent, sur du code inchangé depuis la première relecture. Ce sont des renforcements possibles, pas des blocages :
  - `version: 1` pour `exclu_paye_societe` : équivalente tant que ce statut n'existe qu'à la création ;
  - charge de `compta.frais.valide` sans `ecriture_id` ;
  - `personne_id` faux dans `compta.remboursement.prepare`.
  Un `toEqual` sur la charge complète de ces deux événements suffirait.
- Les remarques précédentes restent valables (`statuts.set` avant la fin de la transaction, statut précédent inconnu, état en mémoire non annulé, régularisation IK sans transition). Elles sont signalées par l'auteur, à trancher par Will.
