VERDICT: A CORRIGER

Fiche L15-T63 (SENSIBLE), PR #1047, SHA relu : f536b12e6a3d2540d1da97567d7f5959fe16773b
Fiche lue sur origin/main (7c5f74c), amendée par #1032 (L00-T83, fusionnée ; la branche `lot-00/L00-T83` n'existe plus, la fiche de main en est la version). Décision D88 : interface d'envoi et faux, aucun fournisseur, aucun envoi réel.

## Défauts
1. `apps/serveur/src/travaux/resume-email.ts:102-105` : le journal `envoye` est écrit dans le même `try` que l'envoi. Si `journaliser` échoue APRÈS un envoi réussi, le `catch` libère le jour et le passage suivant renvoie l'e-mail. Sonde : journal en échec puis passage suivant = 2 e-mails le même jour à la même personne. Le critère « jamais deux envois le même jour pour une personne » n'est pas tenu.
   Correction : ne libérer la réservation que si `envoyer` lui-même a échoué. Un échec du journal après l'envoi garde la réservation (et remonte l'erreur). Ajouter le test nommé « journal en échec après envoi : aucun second envoi ».
2. `apps/serveur/src/travaux/resume-email.ts:85-88` : la décision (`decisionResume`, `instantEnvoi`) est hors du `try`. Une seule personne dont un compte vaut NaN, Infinity ou un non entier (0,5), ou dont l'heure ou le fuseau est invalide, fait lever `nb_actions_invalide` ou `RangeError` et arrête tout le passage. Toutes les autres personnes ne reçoivent plus rien, à chaque minute. Sonde : `[{a_valider: NaN}, alice]` = 0 envoi pour alice. Aucun test ne couvre ces cas limites (NaN, Infinity, non entier, heure invalide).
   Correction : isoler chaque personne (erreur journalisée en `echec`, sans envoi, puis personne suivante) et ajouter les tests de ces cas limites.

## Vérifications
- Fichiers : 4, tous dans `fichiers_autorises` ; fiche non touchée.
- Taille : 299 ≤ 300 : une correction devra tenir dans cette limite.
- D88 : interface `PortEnvoi`, faux dans les tests seulement, aucun nom de fournisseur, aucun envoi réel, aucune dépendance ajoutée.
- Texte : nombres par catégorie seulement, aucun montant, aucun nom de tiers ; destinataire = adresse de la personne seulement ; lien de désinscription à jeton à usage unique ; sans accès sortant : inactif. 07:30 et Europe/Paris marqués HYPOTHÈSE comme la spec, pas une valeur légale.
- Inscription au `Planificateur` (UTC), conversion de l'heure à la décision, changement d'heure testé (29/03/2026).
- Aucun secret, aucun prix, aucun mot interdit, données fictives (`exemple.fr`). Journal 9 lignes, commence par `# Journal L15-T63`.

## Tests et mutations
- `vitest run src/travaux/__tests__/resume-email.test.ts` : 12/12 verts ; eslint et tsc propres.
- Mutations qui rougissent : réservation du jour retirée ; libération après échec retirée ; jeton accepté deux fois ; accès sortant ignoré ; heure choisie ignorée.
- Mutation qui reste verte : `texteResume` garde les catégories à 0 (« - 0 points urgents ») ; aucun test ne vérifie l'absence des catégories vides.

## Remarques
- `resume-email.ts:88` : `dejaEnvoyes()` est relu pour chaque personne à chaque minute. Le lire une fois par passage suffit.
- Un jeton est créé avant un envoi en échec et reste valide ; sans gravité (usage unique), à nettoyer avec le stockage réel.
- Ajouter au test de rendu une catégorie à 0 qui ne doit pas apparaître.
