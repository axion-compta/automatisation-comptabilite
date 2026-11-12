VERDICT: OK

PR n°1210, fiche L19-T21, SHA de tête relu : 7b127df29d6322d1349969276f5fb507149816e0

- Périmètre : 4 fichiers, tous dans `fichiers_autorises` ; 115 lignes (max 200).
- Tests : `vitest run packages/textes/src/ton.test.ts` : les 6 tests nommés sont verts ; `node scripts/verifier.mjs --gardes` : 22 étapes vertes.
- Mutations tuées : retrait de `\p{Regional_Indicator}`, de `\bEUR\b`, de `t['’]` (tutoiement élidé), du filtre des phrases vides, de `[45]\d\d` réduit à `5\d\d`, de l'alternative « code seul ».
- Aucun texte existant de `fr` n'échoue aux contrôles d'emoji ou d'euros ; 20 messages distincts au vouvoiement.
- Aucun secret, aucun prix, aucun mot interdit ; journal de 6 lignes.

Remarques
- `ton.test.ts:19` : si on retire le filtre `/[\p{L}\p{N}]/u` dans `motsParPhrase`, aucun test ne rougit. Un signe isolé (« – », « : ») compterait alors comme un mot. Un cas comme `motsParPhrase('Un – deux.')` qui doit valoir `[2]` fermerait ce trou. Ce n'est pas bloquant : l'erreur ne pourrait que faire rougir à tort.
- `VERBE_GAIN` contient « touch » et « rapport ». « Appuyez sur la touche », s'il est suivi d'un montant en €, ferait rougir à tort. À surveiller.
