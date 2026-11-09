VERDICT: A CORRIGER
SHA relu : 1a64b4425ab748fb8de92767bf801d5ed6e550dc

PR de pilotage 964, nouvelle fiche L07-T41 (SENSIBLE) : opérations pures de mise en service (D73).

## Contrôles
- Corps de PR : « Fiche: L07-T41 ». Une seule fiche, ajout seul (38 lignes, 0 retrait).
- `depend_de` : L07-T00, L07-T02, L07-T10, L07-T11, L06-T13, L00-T50, toutes `statut: fait` sur origin/main. Les fonctions citées existent : `sha256Hex` et `contenuCanonique` (packages/noyau/src/journal/canonique.ts:20 et :42), `recevoirEtatVoulu` (abonnement/transitions.ts:16), `peutDemanderEffacement` avec `gel_actif` et `trop_tot` (abonnement/fin-contrat.ts:73), `Session.nature` (session/port.ts).
- `fichiers_autorises` : nouveaux fichiers sous `packages/noyau/src/mise-en-service/`, sans recoupement avec une autre fiche du lot 07 ni avec L07-T42, T43, T44.
- Aucune route d'inscription (Pièges : ni `inscri`, `register`, `signup`, `password`, `oubli`) ; L06-T01 respectée. Aucun prix ; « prix », « stripe » et « € » n'apparaissent que comme mots à refuser. Aucun secret ni adresse.
- D73 (deux modes d'arrivée : installation d'Axion et libre-service, la console crée le compte) : respectée. D29 : fonctions pures, port et faux service renvoyés à L07-T42. D42 : rien en dur, aucune variable d'environnement.
- `taille_max_lignes: 280` raisonnable. Aucun mot interdit. CI verte (9/9) au SHA relu.

## Défauts
1. pilotage/fiches/L07-T41.md:16 (critère « suspendre et geler produisent un `EtatVoulu` passé à `recevoirEtatVoulu` ») contredit pilotage/fiches/L07-T41.md:27 (« le sens exact de geler reste celui du gel pour litige (L07-T11) »). Sur main, le gel pour litige est `poserGel(fin, o)` sur un `FinContrat` (packages/noyau/src/abonnement/gel.ts:29), pas un `EtatVoulu` ; et `EtatVoulu.etat` ne vaut que `actif`, `pause` ou `arrete` (abonnement/types.ts:12), sans valeur « gelé ». Le critère n'est donc pas testable pour `geler` : l'auteur doit inventer soit un `EtatVoulu`, soit une sémantique. Correction : écrire « suspendre produit un `EtatVoulu` (`pause`, `arretEnvois: true`) passé à `recevoirEtatVoulu` ; geler appelle `poserGel` (L07-T11) et bloque l'effacement, sans changer l'état d'accès », ou préciser l'`EtatVoulu` exact attendu pour geler.

## Remarques
- pilotage/fiches/L07-T41.md:16 : le critère de session dit « une personne est refusée » ; préciser le code de refus attendu (par exemple `compte_de_personne`) pour qu'il soit vérifiable, à l'image de `exigerPersonne` qui rend `compte_de_service`.
- `peutDemanderEffacement` refuse aussi `pas_de_remise` et `pas_d_accuse` : un test par raison serait plus complet que les deux seuls `gel_actif` et `trop_tot`.
