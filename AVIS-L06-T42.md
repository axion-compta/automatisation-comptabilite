VERDICT: A CORRIGER
PR #1129, SHA de tête 2a8eb1aa2bacaa5096aefc7eb239c07274a408d9

Fiche L06-T42 (sensible : isolation). Fusion par Will seul.

## Contrôles passés
- 5 fichiers, tous dans `fichiers_autorises` ; 142 lignes ajoutées, 1 retirée (plafond 300). Aucune dépendance.
- CI verte au SHA de tête (9/9, dont `gardes` et `verifier`). Tests ciblés verts en local (22).
- Journal : 7 lignes, commence par `# Journal L06-T42`. Données fictives (`soc-1`, `soc-2`, `soc-9`). Aucun mot interdit, aucun prix, aucun secret.
- Renvois vérifiés : les 14 cas notés `L06-T35` (C02, C04 à C07, C09, C11 à C14, C17, C19, C24, C25) ont bien un test du même nom dans `packages/noyau/src/securite/__tests__/scenarios.test.ts`.

## Défauts
1. `apps/serveur/src/__tests__/isolation/generateur.ts:31-45` : le générateur n'appelle aucune route. Il appelle la seule fonction pure `verifierRequeteSociete` avec trois chemins qui ne diffèrent que par le segment société ; le verdict ne dépend ni de la route ni du rôle. Preuve par mutation (les 22 tests restent verts) :
   - `cheminSociete(route.chemin)` remplacé par `cheminSociete('/x')` (aucune route réelle) : vert ;
   - `roles: [role]` remplacé par un rôle fixe : vert.
   « 102 routes × 6 rôles » n'est donc qu'un seul cas répété ; une route qui oublie la garde société ou qui lit un objet d'une autre société ne ferait rien rougir. La spec (§7) demande un appel par route et par rôle, et un appel sur un OBJET d'une autre société et d'un autre client.
   Correction demandée : faire passer chaque cas par l'application (`creerApp(...).inject`, comme `alertes-resoudre.test.ts`), avec une session du rôle et, pour les routes à `{id}`, un objet fictif d'une autre société et d'un autre client ; attendu 403/404 au même corps qu'un objet inexistant. `T-ISO-1-zero-200` doit compter les réponses HTTP 2xx. Ajouter un test qui rougit si on retire la garde société d'une route (mutation à noter au journal).
2. Tests nommés exigés par la fiche (« À faire » 3) absents : `C16`, `C18`, `C21`, `C23` (`generateur.ts:58-59`, renvoyés « énoncé absent du dépôt »). Le critère « C01 à C25 verts ou renvoyés à leur fiche » n'est pas tenu : un renvoi sans fiche cible n'est pas un renvoi. Indice dans le dépôt : `pilotage/fiches/L06-T08.md:20` rattache C23 à l'isolation logique (mélange de sociétés), donc C23 peut s'écrire. Pour C16, C18, C21 (et C08, C15), si l'énoncé manque vraiment, c'est un défaut de fiche : Will doit fournir l'énoncé ou nommer la fiche de renvoi.
3. `apps/serveur/src/__tests__/isolation/cas.test.ts:11` : l'expression `/^(ici|L06-T35|renvoi.+)$/` accepte n'importe quel texte après « renvoi ». La resserrer pour exiger un identifiant de fiche ou de lot (`renvoi (L\d\d-T\d+|lot \d\d)`), sinon le défaut 2 reste invisible pour la CI.

## Remarques
- `cas.test.ts` (C03, C22) lit le SQL de `092-securite.sql` par expressions régulières : test de forme, pas d'exécution. Acceptable tant qu'il n'y a pas de base de test, à remplacer quand J3a la fournit.
- `isolation.test.ts:29` : `expect(c.verdict.ok === false && [400, 404]).toContain(...)` est difficile à lire ; écrire `expect(c.verdict.ok).toBe(false)` puis `expect([400, 404]).toContain(c.verdict.statut)`.
- La fiche passe à `statut: fait` alors que les critères ne sont pas tenus.
