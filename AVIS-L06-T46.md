VERDICT: OK
PR #1123, SHA de tête 399d4af97003969c47b52368d1f104b7d7c4266d

Fiche L06-T46 (sensible : fusion par Will seul). Décision de Will du 12/11/2026 : interface et faux serveur, drapeau en mémoire.

## Contrôles
- Fichiers : les 4 du diff sont dans `fichiers_autorises` (arret-console.ts, son test, fiche, journal).
- Taille : 159 lignes (155 +, 4 -) pour 200 au plus.
- Dépendances L06-T27 et L06-T39 : `statut: fait` sur main ; `poserArret`, `reprendre`, `estCoupe` et `CANAUX_COUPES` (L06-T11) sont bien sur main.
- Décision de Will respectée : interface `StockageDrapeaux` avec une seule implémentation en mémoire ; aucune commande réelle, aucun stockage réel, aucune adresse ni aucun secret.
- Amendement de la fiche (dans le diff) : `bloque_par` retiré et remplacé par la décision du 12/11, « Drapeau persistant » devient « drapeau derrière l'interface `StockageDrapeaux` ». Les 4 tests nommés et le critère T-SEC-7 sont gardés.
- Les 4 tests nommés sont présents : `commande-console-coupe-a` (A coupée en 503 par l'app de L06-T27, B à 200, commande en double non journalisée), `chat-imports-envois-coupes`, `reprise-par-administrateur-journalisee` (comptable refusé, administrateur accepté, journal exact), `redemarrage-garde-le-drapeau`. Il y a aussi un test `lecture-douteuse-coupe`.
- Données fictives (`societe-a`, `admin-fictif`, `console-fictive`), aucun prix, aucun mot interdit, journal de 7 lignes commençant par `# Journal L06-T46`.
- CI au SHA de tête : verifier, gardes, tests, types, lint, e2e, stryker, gitleaks et licences sont verts.

## Tests et mutations (local, au SHA de tête)
- `vitest run src/__tests__/arret-console.test.ts` : 5/5 verts.
- 5 mutations sur `arret-console.ts`, chacune rougit au moins un test : `catch` renvoie `false` ; reprise sans contrôle de `r.ok` ; journalisation supprimée ; `stockage.ecrire` supprimé ; garde `evenement === undefined` supprimée.

## Remarques (non bloquantes)
- `reprise` sur une cible jamais arrêtée renvoie `true` et journalise quand même un `securite.reprise` (comportement de `reprendre` de L06-T11). C'est sans danger, mais le journal note alors une reprise sans arrêt préalable. Ce cas pourra être filtré quand le stockage réel sera branché.
- Une lecture qui lève une exception est déjà traitée en « coupé » par l'app de L06-T27 (`apps/serveur/src/securite/arret.ts`) comme par `coupe()` : la règle « lecture douteuse = coupé » vaut donc des deux côtés.
