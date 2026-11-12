VERDICT: OK
PR #1130, SHA de tête b9a8f141ae30646ac1656697004d002defeb700d

Fiche L15-T62 (sensible : argent). Fusion par Will seul.

## Contrôles
- 8 fichiers, tous dans `fichiers_autorises` ; 292 ajouts et 7 retraits, soit 299 lignes (plafond 300). Le diff ne cite ni `chat/outils.*`, ni `actions/registre.json`, ni `.github/`. Aucune dépendance.
- CI verte au SHA de tête (9/9). Les 9 tests nommés sont verts en local.
- `pnpm contrat:openapi` rejoué : aucun écart sur `packages/contrat/openapi`.
- Le handler ne lit que `lister()` (port `Pick<…, 'lister'>`) : aucune écriture possible. ALR-09 (`payer_facture`) rend `mode: 'proposition'` et `aValider: true`, et exige `compta-valider` en plus de `compta-lire`. Le lien est relatif et validé par le schéma de sortie (`^/`, sans `//` ni `://`).
- Mutations faites à la main, chacune rougit puis est annulée :
  - `ACTIONS_PROPOSITION` vidé : 3 tests rouges (dont `paiement-proposition-seulement`) ;
  - contrôle `compta-valider` retiré : `role-insuffisant-403` rouge ;
  - contrôle `compta-lire` retiré : `role-insuffisant-403` rouge ;
  - contrôle de version retiré : `version-perimee-409` rouge ;
  - contrôle d'alerte active retiré : `alerte-inactive-409` et `resolution-par-code` rouges ;
  - lien rendu absolu : 3 tests rouges ;
  - écriture (`reporter`) ajoutée dans `lire` : `aucune-ecriture` rouge.
- Journal : 6 lignes, commence par `# Journal L15-T62`. Données fictives. Aucun mot interdit, aucun prix, aucun secret, aucune adresse de serveur.

## Remarques (non bloquantes)
- Les permissions viennent du port (fixées au démarrage, par défaut `compta-lire` et `compta-valider`), pas de la session de l'appelant. C'est ce que dit la fiche, et c'est le même modèle que `alertes-service.ts`. Mais tant que le port de session n'est pas branché, tout appelant passe le contrôle `compta-valider` d'ALR-09. Ce n'est pas grave ici puisque rien n'est exécuté ; il faudra le brancher sur la session avant toute exécution réelle.
- `resolution-par-code` : dans le jeu fictif, 4 codes sur 11 sont inactifs (ALR-03, ALR-06, ALR-07, ALR-11). Pour ces codes, on vérifie seulement le 409, pas le mode ni l'écran. Ailleurs, on ne vérifie que le préfixe `/<entreeMenu>/`, pas le sous-écran de `SOUS_ECRAN`. On peut ajouter un contrôle direct de `RESOLUTIONS[action].ecran` pour les 11 codes.
- `lien-interne` : `not.toMatch(/\d{3}/)` est un test faible contre un montant. Il suffit ici, car les liens sont figés.
- Décision déjà notée sur l'amendement (#1114) : AL-R4 est réduit à un lien d'ouverture. V3-UX-103 n'est couvert qu'en partie, et c'est à confirmer par Will à la fusion.
