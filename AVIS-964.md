VERDICT: OK
SHA relu : 87bdc3994e32aef128a66f74b27e09435da6f3c2

PR de pilotage 964, nouvelle fiche L07-T41 (SENSIBLE, relecture stricte) : opérations pures de mise en service (D73). Relecture du 09/11/2026 au nouveau SHA de tête (commit 87bdc39 du correcteur).

## Contrôles
- Corps de PR : « Fiche: L07-T41 », exigences V3-PLA-010 et V3-PLA-134. Une seule fiche, ajout seul (38 lignes, 0 retrait).
- Défaut 1 de l'avis précédent (suspendre/geler) : corrigé. Le critère et l'À faire disent maintenant : suspendre produit un `EtatVoulu` (`pause`, `arretEnvois: true`) passé à `recevoirEtatVoulu` ; geler appelle `poserGel` sur un `FinContrat` (L07-T11) et ne change pas l'état d'accès. Recoupé sur main : `poserGel(fin, o)` existe (packages/noyau/src/abonnement/gel.ts:29) et pose `gelModule.actif`, que `peutDemanderEffacement` lit (fin-contrat.ts, `geleActuellement`) : « bloque l'effacement » est exact et testable.
- Remarque 1 (code de refus de session) : traitée, `compte_de_personne`, symétrique de `compte_de_service` rendu par `exigerPersonne` (session/port.ts:82).
- Remarque 2 (raisons de refus) : traitée, un test par raison ; les quatre raisons citées (`gel_actif`, `trop_tot`, `pas_de_remise`, `pas_d_accuse`) sont exactement celles de `peutDemanderEffacement` sur main.
- `depend_de` toutes `statut: fait` sur origin/main (constat de l'avis précédent, inchangé). `fichiers_autorises` sous `packages/noyau/src/mise-en-service/`, sans recoupement.
- Aucune route d'inscription (L06-T01, Pièges) ; D73, D29, D42 respectées. Aucun prix, secret, adresse ni nom réel ; aucun mot interdit.
- CI verte (9/9, dont `verifier`) au SHA relu.

## Défauts
Aucun.

## Remarques (non bloquantes)
- `poserGel` exige `par`, `motif`, `auteur`, `horodatage` et `longueurMaxMotif` : l'auteur devra les recevoir en paramètres de `geler` (D42 : `longueurMaxMotif` jamais en dur).
- `poserGel` lève `gel_deja_actif` : le contrôle d'idempotence (même clé, même empreinte → `rejoue: true`) doit passer avant cet appel, sinon un rejeu de `geler` échouerait ; un test de rejeu de `geler` le vérifierait.
- PR sensible : fusion par Will seul.
