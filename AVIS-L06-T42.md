VERDICT: OK
PR #1129, SHA de tête 78ee57b4268c66f5c01462e43d2167c797e37927

Fiche L06-T42 (sensible : isolation). Fusion par Will seul. Troisième relecture, après l'avis A CORRIGER au SHA bb15225c449c75d6cf44c135e3fbd4cd633c1b64.

## Contrôles passés
- 4 fichiers, tous dans `fichiers_autorises` ; 294 lignes ajoutées, 0 retirée (plafond 300). Aucune dépendance. La fiche reste à `statut: a_faire`.
- CI verte au SHA de tête (9/9, dont `gardes`, `tests`, `verifier`). Tests ciblés verts en local (3 fichiers, 27 tests).
- Journal : 8 lignes, commence par `# Journal L06-T42`. Aucun mot interdit, aucun prix, aucun secret ; données fictives (`soc-1`, `obj-zz`, etc.).

## Suivi de l'avis précédent (vérifié par mutation)
- Défaut 1a (appels arrêtés à la validation) : levé. Les seuls arrêts en 400 `BAD_REQUEST` sont les 11 routes de la liste figée `VALIDATION_NON_REMPLIE`. Retirer une entrée de la liste fait rougir un test.
- Défaut 1b (objet étranger inexistant) : c'est un défaut de fiche, et je le confirme. `creerApp` appelle `creerRouteur(service, {}, options)` et ne laisse injecter aucun service de domaine. Le test est renommé (`T-ISO-1-reponses-http-uniformes`) et un commentaire précise qu'il ne prouve pas l'isolation. C'est la sortie que demandait l'avis.
- Mutations tuées (au moins un test rouge) : les trois natures visent le même objet ; en-tête de rôle fixé à `lecture` ; en-têtes de la route retirés ; corps retiré ; une entrée de moins dans la liste figée ; segment fixe et identifiant inversés ; borne 2xx `>` ; `aUnObjet` toujours vrai.
- Remarque sur le journal (`it.todo`) : levée.

## Remarques (pour Will, non bloquantes)
- Mesure au SHA de tête : 864 appels. Il y a 252 réponses 404 `EXERCICE_INCONNU` (le segment fixe `seg-1` n'est pas un exercice connu), 198 réponses 400 de la liste figée et 162 réponses 401 (`NON_AUTHENTIFIE`, `REAUTHENTIFICATION_REQUISE`). Près de deux appels sur trois s'arrêtent donc avant la lecture de l'objet. La cause est le même défaut de fiche (services non injectables) ; à reprendre avec la fiche qui câble la garde société.
- Restent à trancher par Will : l'énoncé de `08-cas-de-test.md` pour C08, C15, C16, C18 et C21 ; une fiche qui câble la garde société dans les routes et permet d'injecter des objets étrangers.
- `cas.test.ts` (C03, C22) reste un test de forme sur le SQL ; à remplacer quand J3a fournira une base de test.
- La mutation « le fournisseur lit l'en-tête sans `ROLES.find` » survit. Elle est équivalente tant que l'en-tête porte toujours un rôle valide.
