VERDICT: OK
SHA relu: 76dccef0c80b8bd6d4f168ca51edafa73d34ad15
PR: 944 — L08-T35 Domaine santé : service en mémoire, serveur en mémoire et faux serveur

## Vérifications
- Fichiers modifiés : 8, tous dans `fichiers_autorises` ; `handlers.ts`, `app.ts` et le contrat non touchés.
- Taille : 176 lignes ajoutées, 10 retirées, limite de la fiche 220.
- CI du SHA de tête : verifier, e2e, types, lint, tests, gardes, gitleaks, licences, stryker tous verts (l'échec précédent sur verifier/e2e est résolu).
- Correction 76dccef : ne touche que `sante-exploitation.ts` (import `fs` en espace de noms) et `faux-serveur/.../sante.ts` (version de repli hors Node). Aucun fichier de test modifié, aucune assertion retirée.
- Tests locaux : 11/11 verts (6 tests nommés présents, plus `version-invalide-refusee`).
- Mutations : champ `causes` ajouté à la sortie → rouge ; option `verification` ignorée → rouge ; panne simulée `panne` = `degrade` → rouge ; version du vrai serveur en dur → rouge (`meme-reponse-des-deux-serveurs`).
- Aucun secret, aucun nom d'hôte ni de base dans la réponse, aucun prix, aucun mot interdit, aucun octet NUL. Données fictives (`exemple.fr`, empreinte de zéros).
- Règle 13 (CONSIGNE-AUTEUR3) : service en mémoire, aucun accès direct à une base ; la vraie vérification reste à L08-T42.
- Santé des contrôles (`creerHandlersSante`, `suiteSante`) inchangée. Journal : 6 lignes, commence par `# Journal L08-T35`.

## Remarques (non bloquantes)
- `packages/faux-serveur/src/domaines/sante.ts` : la version de repli `0.0.0` est aujourd'hui égale à celle de `apps/serveur/package.json`, donc `meme-reponse-des-deux-serveurs` ne verrait pas un repli silencieux côté Node (mutation « version `0.0.0` en dur » restée verte). Sans risque tant que la version vaut `0.0.0` ; à surveiller au premier changement de version.
- Le faux serveur importe désormais `apps/serveur/src/domaines/sante-exploitation.ts` (dépendance du paquet vers l'application) ; autorisé par la fiche, mais une lecture de version placée côté contrat serait plus propre plus tard.
