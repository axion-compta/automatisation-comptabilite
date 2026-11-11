# BLOQUE-L09-T44

Fiche L09-T44 (écran E38 Questions de démarrage) : aucun code écrit.

- Cause : la fiche exige d'envoyer société cotée, paie et plusieurs pays par `POST /profil/champs/{cle}`.
- `CLES_PROFIL` (packages/contrat/src/domaines/profil-champs.ts, hors fichiers_autorises) ne contient que : denomination, forme, siren, exercice_debut, exercice_fin, regime_tva, regime_imposition, tenue, en_formation, a_commissaire_aux_comptes, code_postal_siege.
- `creerServiceProfilChamps` (profil-champs-service.ts:23) lève `CLE_INCONNUE` (404) pour toute autre clé : ces trois questions échoueraient contre le faux serveur.
- `profil-service.ts` ne produit pas non plus les blocages `societe_cotee`, `paie`, `plusieurs_pays` (seulement commissaire_aux_comptes, forme_hors_perimetre, siege_exclu).
- Dépendance L09-T37 (PR #1035) : fusionnée à part, sans conflit avec cette fiche.
- À changer : ajouter les 3 clés à `CLES_PROFIL` et les 3 blocages au service (fiche de contrat/faux serveur dédiée), ou retirer ces 3 questions de la fiche L09-T44.
- Mesure : 0 ligne de code écrite.
