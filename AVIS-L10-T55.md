VERDICT: OK

# Avis L10-T55 (PR #1040, sensible)

SHA relu : e870d01ec5e7213c5a76a9d84f94983cedd148c4 (branche `lot-10/L10-T55`, un commit sur `origin/main`).
Fiche de référence : `origin/lot-00/L00-T83:pilotage/fiches/L10-T55.md` (amendée par la PR #1032, non fusionnée).

## Vérifié et correct
- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 202 lignes pour un plafond de 280 ; aucune ligne « - - ». La fiche n'est pas modifiée (attente de #1032), ce qui est accepté.
- Les six types (`compta.vente.lue`, `a_verifier`, `validee`, `encaissee`, `serie_trou_detecte`, `compta.avoir.rattache`) sont créés par la même enveloppe de L00-T49. La charge contient des identifiants et des statuts seulement (`total` ou `partiel`, `tva_exigible`) ; un champ de montant est refusé (`champ_interdit`, testé).
- Effet du lien bancaire : l'écriture, le lettrage, le reste dû et l'événement `compta.vente.encaissee` sont faits dans `depot.transaction`, imbriquée dans `unite.executer`. Une panne à chacune des trois étapes ne laisse ni écriture, ni lettrage, ni reste dû, ni événement (critère de la fiche, relancé : vert).
- Les 4 tests nommés de la fiche sont présents, plus un test des six types. Ils passent localement (5/5).
- `node scripts/verifier.mjs --gardes` est vert (21 étapes) ; tsc et eslint sont propres. La CI de la PR est verte, `verifier` compris.
- Mutations : 6 sur 6 font rougir les tests (validation de la copie avant le travail, rejeu ignoré, statut inversé, TVA toujours vraie, lettrage omis, identifiant sans corrélation).
- Aucun mot interdit, aucun prix, aucun secret ; données fictives ; journal de 7 lignes qui commence par `# Journal L10-T55`.

## Remarques (non bloquantes)
- `apps/serveur/src/domaines/ventes-encaissement.ts:24` et `:59` : `DepotEncaissement.transaction` et `UniteDeTravail.executer` sont deux interfaces distinctes, validées l'une après l'autre (`:41`, puis la boîte). Dans le faux, rien ne peut échouer entre les deux. Un vrai adaptateur devra cependant les porter sur une seule transaction de base, sinon l'écriture pourrait être validée sans l'événement. À préciser pour l'adaptateur réel (par exemple, un `TxEncaissement` qui expose aussi la boîte), à l'attention de Will.
- Seul `compta.vente.encaissee` est émis par le lien bancaire. Les cinq autres types sont disponibles via `evenementVente`, mais aucun émetteur n'est branché. C'est cohérent avec le hors périmètre et L10-T05.
- Les cas limites du montant (0, négatif, NaN) relèvent de `ecritureEncaissement` (noyau) et ne sont pas retestés ici.
- Garde rouge éventuelle liée à #1032 : non comptée, comme demandé.
