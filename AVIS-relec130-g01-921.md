VERDICT: OK

PR : 921 (fiche L07-T17, sensible : non)
SHA relu : 9d5ca202db893966e2ac7052a91fb424e02dd4ef

## Défaut de l'ancien avis (relec123-g01-921)
- `acces-service.test.ts:12`, expression à virgule : corrigé. Elle est remplacée par un bloc `for … { sortie.push(k); parcourir(v, sortie); }`. `eslint` passe, sans aucune règle touchée. Le correctif ne modifie que ce fichier de test.

## Contrôles
- Fichiers modifiés : les 8 `fichiers_autorises` seulement. Taille : 220 lignes (limite 280).
- Tests : `acces-service.test.ts` 7/7, `commun-acces.test.ts` 9/9 (suite commune sur le vrai et le faux serveur). `node scripts/verifier.mjs` (rc 0) passe sur ce SHA.
- Mutations : LECTURE_SEULE ajouté aux états qui traitent, lien forcé, condition `reprise=oui` retirée. Chacune fait rougir des tests.
- Règle 13 : l'état vient du scénario fictif, l'horloge est injectée, aucune adresse ni secret. Données fictives, aucun mot interdit, aucun prix. Journal : 6 lignes, il commence par `# Journal L07-T17`.
