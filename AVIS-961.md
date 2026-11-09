VERDICT: OK
SHA relu : 07767afbecec85914924c3498ae71b12276d9eb3

# Avis de relecture — PR 961, fiche L15-T60 (sensible)

## Contrôles
- Fichiers modifiés : les 4 sont dans `fichiers_autorises`.
- Taille : 251 ajouts, 1 suppression (252 lignes, max 300) ; aucune ligne « - - ».
- Isolation : la société vient de la session ; société du chemin différente = 400 `societe_unique` ; objet d'une société sœur = 400 ; objet d'un autre client ou inexistant = 404 au même corps (test `toEqual` entre les deux verdicts) ; un autre client ne voit pas l'objet. Aucune lecture ni écriture croisée trouvée.
- Rôles : `compta-valider` pour reporter/ignorer (403 `role_lecture` / `role_insuffisant`), `compta-exporter` pour exporter, réauthentification et MFA par `exigerNouvelleConnexion`. Expert invité : périmètre seulement, révoqué/expiré/inconnu refusé à chaque lecture. Masquage à chaque lecture, ETag par personne, `Cache-Control: private, no-cache`, `Vary: Authorization`.
- Tests ciblés : 16/16 au vert (vitest, Node 22).
- Mutations à la main (15) : 14 font rougir les tests (contrôle client, société de la cible, société du chemin, permission, permission de reporter, expert null, périmètre, rôle expert, réauthentification, exclusion de la recherche, ETag personne, ETag permissions, Cache-Control, chemin vide). Toutes annulées.
- Mots interdits, prix, secrets, octets NUL : aucun. Données fictives seulement.
- Journal : 7 lignes, commence par `# Journal L15-T60`.
- CI au SHA relu : 9/9 vertes (verifier, tests, types, lint, gardes, gitleaks, e2e, stryker, licences).

## Remarques (non bloquantes)
1. apps/serveur/src/domaines/isolation-interface.ts:88 — les rôles entrent dans l'ETag mais aucun test ne le vérifie (la mutation `[...s.roles].sort()` → `[]` survit). Ajouter, vers apps/serveur/src/__tests__/isolation-interface.test.ts:143, un cas « rôles différents, mêmes permissions = ETag différent ».
2. apps/serveur/src/domaines/isolation-interface.ts:56 — l'action `lire` n'exige aucune permission : une session sans `compta-lire` (par exemple `compta-saisir` seul) lit. La fiche ne l'exige pas ; à confirmer par Will, sinon exiger `compta-lire`.
3. Critère « tous les cas S de la spec 15 (R02 … P24) » : la spec 15 n'est pas dans le dépôt ; les tests suivent les comportements de la fiche sans correspondance cas par cas (le journal le dit). À vérifier par Will avant le jalon J-I4.
4. apps/serveur/src/domaines/isolation-interface.ts:42 — le chemin n'est pas normalisé (`..`, double `/`) ; le routeur qui appellera ce contrôle devra s'en charger.
