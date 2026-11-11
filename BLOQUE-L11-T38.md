# BLOQUE-L11-T38

Cause : pré-vol 3(b). Passer les routes des frais, véhicules et barème sous `PREFIXE_ROUTES_SOCIETE` casse des tests existants hors des `fichiers_autorises`, qui appellent les anciens chemins sans préfixe (`/frais`, `/frais/{id}`, `/frais/valider`, `/frais/{id}/proposer`, `/remboursements`, `/vehicules`, `/parametres/bareme_ik_voiture`) et l'en-tête `x-personne` :
- apps/serveur/src/__tests__/frais.test.ts, frais-actions.test.ts, frais-validation.test.ts, vehicules-bareme.test.ts
- packages/contrat/src/__tests__/frais.test.ts (l.72-73), vehicules-bareme.test.ts (l.76-77)
- packages/faux-serveur/src/__tests__/suite-frais.ts (8 occurrences), suite-frais-actions.ts (14), suite-vehicules-bareme.ts (8), commun-frais-actions.test.ts (1)

Autre point : tests existants + code à réécrire dépassent probablement `taille_max_lignes` (340).

Correction minimale : ajouter ces 9 fichiers de test aux `fichiers_autorises` de L11-T38 (ou les mettre à jour dans une fiche commune de préfixe), et relever `taille_max_lignes`. Aucune dépendance ni PR ouverte en conflit (dépendances L11-T27, L11-T28, L00-T50 faites).
