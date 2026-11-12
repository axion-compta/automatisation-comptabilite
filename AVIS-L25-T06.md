VERDICT: OK
PR n°1185, tête 435463e7d70efa4212110bf29eb03e0f78b1a1b6 (fiche lue sur origin/main).

Vérifié :
- Fichiers : les 7 du diff sont dans `fichiers_autorises`. Taille 192 lignes pour un maximum de 240. `resume-email.ts` inchangé.
- Les 7 tests nommés passent, depuis la racine ; `resume-email.test.ts` passe toujours (25/25). `node outils/gardes/sous-traitants.mjs` : vert.
- Mutations tuées : filtre `actif`, `trim` et `toLowerCase` de la comparaison, égalité stricte (contre `includes`), journalisation du refus, validation de l'adresse de l'invitation, `encodeURIComponent` du jeton, ajout de l'invité avant l'envoi.
- Journal par code sans adresse. Adresses en `@exemple.fr`. REC-1 et TRA-1 inactifs, sans nom de fournisseur, UE `oui`. Aucun mot interdit, aucun secret, aucun prix (le « € » est une assertion d'absence de montant).

Remarques (non bloquantes) :
1. `invitation-email.test.ts:55` lit `docs/sous-traitants.csv` en chemin relatif : le test échoue (ENOENT) si vitest est lancé depuis `apps/serveur`. Il passe en CI (lancement depuis la racine). Pour suivre l'usage du dépôt, préférer `new URL('../../../../../docs/sous-traitants.csv', import.meta.url)`.
2. Mutants survivants mineurs : `invitation-email.ts:22`, `o.invitationId.trim() === ''` (aucun test avec un identifiant vide) et `o.adresse.trim()` (aucun test avec des espaces). `destinataires-autorises.ts:19`, `cible !== ''` est équivalent tant qu'aucune personne n'a d'adresse vide.
3. `lien-a-usage-unique` : l'usage unique est vérifié sur un faux `PortJetons` du test, pas sur du code de la fiche. Le code produit seulement le lien encodé. L'usage unique réel repose sur L06-T44.
4. L'invité reste ajouté si l'envoi échoue ensuite : comportement acceptable, mais à noter.
