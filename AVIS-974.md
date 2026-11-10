VERDICT: A CORRIGER
SHA relu: f50c90092ad111f93d4e492656a3d32eb0f7399f

PR 974, fiche L07-T19 (domaine demande de palier), relecture Opus locale. CI : gardes, tests et verifier sont ROUGES.

Défauts :
1. Test existant cassé : apps/serveur/src/__tests__/abonnement-branchement.test.ts:24, cas `trois-routes-branchees`. Ce test poste `code_demande: 'palier-b'`. Avec le vrai service, ce palier est inconnu : la route répond 404 PALIER_INCONNU et l'assertion `not.toBe(404)` échoue (« expected 404 not to be 404 »). Ce fichier n'est pas dans fichiers_autorises. Correction : amender la fiche (pilotage) pour autoriser ce fichier, puis y remplacer 'palier-b' par un palier fictif valide ('compta-2'), aux lignes 24 et 36 si le second cas l'exige.
2. garde:portes ROUGE : « lot back-end de l'écran e53 sans porte "maquette validée" sur origin/main (pilotage/portes/e53.json) ». Une fiche qui dépend de L07-T19 autorise apps/web/src/ecrans/e53/. Ce blocage ne vient pas du code de l'auteur. Il attend la validation de la maquette E53 par Will (porte datée et nommée). Ne pas fusionner avant.

Vérifié (code correct) :
- Périmètre : 8 fichiers, tous autorisés. 257 lignes, pour 280 permises. Ni handlers.ts, ni app.ts, ni le contrat ne sont touchés.
- Codes traduits : accord_manquant, palier_inconnu, palier_identique et palier_non_superieur deviennent ACCORD_MANQUANT, PALIER_INCONNU, PALIER_IDENTIQUE et PALIER_NON_SUPERIEUR. Les statuts sont ceux du contrat : 422, 404, 422, 422. Toute autre ErreurAbonnement est relancée (500), jamais avalée.
- Idempotence : seules les réponses réussies sont gardées par clé, comme `packages/contrat/src/service.ts` (rejeux). Même clé avec un autre corps : première réponse.
- Le palier en vigueur n'est jamais modifié. Auteur fictif personne-fictive-1. Un état par serveur, et par scénario côté faux.
- Les 7 tests nommés sont présents, sur les deux cibles. Le cas « accord 'true' » donne 400.
- Aucun prix, aucun montant, aucun nom réel.

Remarques (non bloquantes) :
- `palier-inferieur-ou-identique-422` ne joue que le cas identique : le jeu fictif part toujours de compta-1. Le journal le signale ; le cas inférieur est couvert dans le noyau.
