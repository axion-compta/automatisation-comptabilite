VERDICT: OK
SHA relu : 29ae4faa71c48ad17666788d05fa76f2b9e8fa8c

Relecture de la PR #954 (fiche L08-T42, sensible: oui, branche lot-08/L08-T42). Relecture stricte.

Vérifié
- Fichiers modifiés : les 4 fichiers sont dans `fichiers_autorises`. `domaines/sante.ts`, `app.ts` et le contrat ne sont pas touchés. Aucune migration n'est écrite ni exécutée : la fiche n'en demande pas, et `migrationAttendueDepuis` ne fait que lire des noms de forme `NNN-mot.sql`.
- Taille : 121 + 70 + 2 + 6 = 199 lignes, sous la limite de 250 ; aucune ligne « - - ».
- Règle 13 (auteur3) : les trois ports (`PortBase`, `PortFile`, `PortCoffre`) sont des interfaces avec des faux en mémoire dans les tests. Il n'y a ni réseau ni conteneur, ni adresse ou secret en dur. La chaîne de connexion de test est fictive (`hote-fictif.exemple.fr`), assemblée par morceaux. Aucun import de `ia`.
- Exigences de la fiche : les appels partent en même temps (`Promise.allSettled`), avec une minuterie et un `AbortController` par appel. Un rejet, une exception synchrone ou un délai dépassé rendent la valeur de repli. Une migration lue qui n'est pas un entier >= 0 donne `null`. L'état est calculé par la seule règle `etatSante` (L08-T06). Seules les clés `etat`, `version` et `migration` sortent, ce qui garde les `causes` internes. Les réglages invalides sont refusés dès la création, avec un essai à vide.
- Tests : les 10 tests nommés sont présents, plus 3 autres. Les cas limites sont couverts (NaN, Infinity, 1.5, -1, '3', null, liste vide, noms ignorés). Vitest : 24/24 verts.
- Mutations qui rougissent : abort retiré, `lue >= 0` retiré, `causes` ajoutées à la réponse (9 rouges, dont `sans-nom-d-hote`), maximum des migrations remplacé par le dernier nom, contrôle de `delaiMs` retiré, erreur brute du port renvoyée comme valeur.
- CI verte sur le SHA de tête (verifier, gardes, gitleaks, lint, types, tests, stryker, e2e, licences).
- Aucun prix, aucun mot interdit. Le journal fait 6 lignes et commence par `# Journal L08-T42`.

Remarques (non bloquantes)
- sante-reelle.ts:29 : la mutation qui retire `clearTimeout(minuterie)` survit. Le test `delai-depasse-compte-comme-panne` ne vérifie `getTimerCount()` que si tous les appels dépassent le délai. Un test où les ports répondent vite, suivi de `vi.getTimerCount() === 0`, fermerait ce trou.
- sante-reelle.ts:46 : la mutation qui retire `=== true` survit. Aucun test ne fait rendre au coffre une valeur non booléenne (`'oui'`, 1). Le risque est faible, car le port est typé.
