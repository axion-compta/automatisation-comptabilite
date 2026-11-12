VERDICT: A CORRIGER

PR #1140, fiche L11-T40, SHA de tête relu : 3adcbd16b0d68eed66c17ab1b2687ba84462db0c
Fiche lue sur origin/main (aucune PR d'amendement ouverte). Fiche `sensible: oui` : fusion par Will seul.

## Contrôles
- Fichiers : 5, tous dans `fichiers_autorises`. Taille : 233 + 12 = 245 lignes (limite 250).
- CI verte (verifier, tests, gardes, lint, types, e2e, gitleaks, licences, stryker).
- 6 tests nommés présents, verts en local (vitest, Node 22).
- Aucun mot interdit, aucun prix, aucun secret ; données fictives. Journal : 7 lignes, commence par `# Journal L11-T40`.
- Mutations : retirer `if (d.statut === avant) return []` rougit 2 tests (bien). Deux mutations survivent (défauts 1 et 3).

## Défauts
1. `apps/serveur/src/__tests__/frais-evenements.test.ts:57-58` (`echec-de-transaction-aucun-evenement`) : le commentaire dit « la mutation réussit puis le dépôt échoue (acteur invalide) », c'est faux. L'acteur `a@exemple.fr` ne correspond pas à `TRAJET.personneId` : le service lève `PERSONNE_DIFFERENTE` AVANT toute mutation, et `creerEnveloppe` ne contrôle pas l'`@` dans `acteur.id`. Le cas « état modifié, puis dépôt refusé » n'est donc pas testé. Preuve : la mutation qui avale l'échec de construction des événements dans `ecrireEtPublier` (`try { evts = evenements(r) } catch { evts = [] }`) laisse les 6 tests verts.
   Correction : provoquer un échec réel après la mutation (par exemple `horodatage: 'pas-utc'` dans le contexte, avec le bon acteur), vérifier que la boîte est vide ET que l'appel rejette ; corriger le commentaire.
2. `apps/serveur/src/domaines/frais-evenements.ts:62-66` (`VERSION_INITIALE = 1` pour `compta.frais.valide`) : la version publiée est fausse. Sonde : création d'un trajet (version 1, `compta.frais.propose` v1) puis validation ; le frais passe en version 2 mais `compta.frais.valide` part en version 1, la même que `propose`. Un consommateur qui ordonne ou dédoublonne par (objet_id, version) écartera la validation.
   Correction : ne publier que la version réelle, par exemple un lecteur optionnel `versionDe(fraisId)` passé à `creerFraisPublies` (le test l'alimente avec le jeu commun) et un test qui exige `version` = version du frais après validation. Si c'est impossible sans fichier hors périmètre (`app.ts`, service de validation), le dire comme « défaut de fiche » plutôt que publier une valeur fausse.
3. Test : la version des événements `propose` et `exclu_paye_societe` n'est vérifiée que pour des frais en version 1. La mutation `version: d.version` -> `version: 1` laisse les 6 tests verts. Correction : un cas où `propose` part après un complément (`a_completer` -> `propose`, version 2 ou plus) et qui vérifie `e.version === d.version`.

## Remarques (non bloquantes, pour Will)
- `creerFraisActionsPublies` : statut précédent inconnu = l'événement part. Sonde : un complément sans changement de statut d'un frais déjà `propose` du jeu publie un `compta.frais.propose` sans transition (cas de tout frais existant au démarrage).
- `statuts.set` est fait avant la fin de la transaction : si un vrai dépôt échoue après le calcul des événements, le rejeu avec la même clé ne publiera plus rien. À déplacer après la réussite de `executer`.
- Le service en mémoire n'est pas annulé si le dépôt échoue (« état sans événement ») ; hors fichiers autorisés, signalé par l'auteur.
- `compta.ik.regularisation_proposee` : seul le constructeur est testé, aucune transition à brancher (signalé par l'auteur, fiche à élargir ou découper).
- Routes : la boîte d'envoi par défaut est une boîte en mémoire propre à chaque route, non relayée ; le branchement réel est hors périmètre.
