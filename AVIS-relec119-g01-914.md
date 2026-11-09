VERDICT: OK
PR: 914
Fiche: L05-T65
Branche: lot-05/L05-T65
SHA relu: 7d59b5dcf2f6fdb3ee31515f478838f396d86602

## Vérifications
- Fichiers modifiés : les 4 `fichiers_autorises`, rien d'autre. 185 lignes (max 220), aucune ligne binaire.
- `automatique.ts` est écrit contre l'interface `PortConsoleAuto`, avec un faux service dans les tests. Aucune adresse, aucun réglage ni secret.
- Comportement :
  - une liste absente, vide ou illisible, ou une console en échec, donne `rien` ;
  - une entrée M, I, irréversible ou inconnue donne un refus `liste_refusee` ;
  - une action d'un niveau autre que B est refusée ;
  - un verdict autre que `automatique` donne `brouillon`, et rien n'est appliqué ;
  - une action appliquée est journalisée avec `acteur = agent:<nom>` et reste annulable ; si le journal échoue, l'action est annulée.
- Tests nommés présents : `liste-vide-rien-d-automatique`, `niveau-m-refuse-dans-la-liste`, `brouillon-ne-fait-rien`, `automatique-journalise-et-annulable`. Vitest : 6/6 verts.
- Mutations (chacune rougit au moins un test, puis annulée) :
  - contrôle `reversible` retiré ;
  - `verifierListe` retiré ;
  - tout verdict vrai accepté comme `automatique` ;
  - annulation retirée ;
  - garde d'annulation unique retirée.
- `tsc --noEmit` et eslint : verts. Gardes perimetre, migrations, textes, fictif, litteraux, portes, tests, termine, fiches : vertes.
- Journal : 7 lignes, titré `# Journal L05-T65`. Données fictives. Aucun prix, aucun mot interdit.

## Remarques (non bloquantes)
- `automatique.ts` (fonction `annuler`) : `annulee = true` est posé avant `await action.annuler()`. Si l'annulation échoue, un second appel ne fait plus rien et l'action n'est plus annulable par ce retour. Si le journal échoue après l'annulation, elle n'est pas journalisée. Mieux vaut poser le drapeau après une annulation réussie, et ajouter un test « annulation en échec puis nouvel essai ».
