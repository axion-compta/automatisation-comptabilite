VERDICT: OK

PR #1106, SHA de tête 35de7cdf056ed05fbb87624fbec709590b09ed30 (branche lot-11/L11-T38). Relecture du 12/11/2026.

Vérifications
- Périmètre : 27 fichiers, tous dans fichiers_autorises ; app.ts et routes.ts intacts. Taille acceptée par la garde (openapi.json compté à part) ; CI 9/9 verte au SHA de tête. Dépendances L11-T27, L11-T28, L00-T50, L09-T49 « fait ».
- Les 4 tests nommés passent (`autre-societe-404`, `sans-session-401`, `chemin-frais-sans-prefixe-404` sur les 9 routes des 4 domaines ; `prefixe-dans-openapi`).
- Tests existants adaptés : seuls le montage (jeton fictif + `creerFauxSessions`) et les chemins changent ; aucune assertion retirée. Les suites communes `suiteFrais` et `suiteVehiculesBareme` tournent maintenant sur `cibleProfilVrai` (avec session) ; `commun-frais-actions` passe le jeton.
- Tests lancés : serveur 52/52 (5 fichiers), contrat 527 (81 fichiers, `routesEcritureSansEnTete` compris), faux serveur 377/377. `pnpm contrat:openapi` : aucun écart.
- Mutations (rouges) : `exigerSociete` retiré de `lireBaremeIk` -> 2 rouges ; retiré de `preparerRemboursement` -> 2 rouges.
- Aucune adresse, aucun port ni secret : jeton et sessions fictifs. Journal : 7 lignes, commence par « # Journal L11-T38 ». Aucun mot interdit, aucun prix.

Remarques (non bloquantes, pour L11-T47 ou une fiche de suivi)
- apps/serveur/src/domaines/frais-actions.ts:19 : l'ordre (contrôle de la société PUIS écriture) est bon, mais aucun test ne le protège. Une mutation qui fait l'écriture avant `exigerSociete` laisse `autre-societe-404` vert, alors qu'un frais serait créé dans la mauvaise société. Il faudrait ajouter, après la boucle « soc-autre », une lecture qui montre que rien n'a été créé ni modifié.
- apps/serveur/src/__tests__/frais-isolation.test.ts:9 : la session fictive n'a qu'une seule société. Une session à deux sociétés (`societes: ['soc-lemoine','soc-autre']`) protégerait contre un `exigerSociete` qui tolérerait toute société de la personne (cette mutation survit aujourd'hui ; profil.ts est hors de cette fiche).
- Si L06-T38 (#1103) est fusionnée, ses 4 clés (frais, fraisActions, fraisValidation, vehiculesBareme) pourront être retirées de `DOMAINES_SANS_PREFIXE` (non requis, la liste les tolère).
- Fiche sensible (sécurité) : double relecture, fusion par Will seul.
