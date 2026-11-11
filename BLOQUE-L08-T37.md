# BLOQUE-L08-T37
La CI de la PR 986 ne peut passer sans toucher un fichier hors `fichiers_autorises`.
- `packages/faux-serveur/src/__tests__/exploitation-branchement.test.ts` (L08-T34) attend « pas 404 » sur POST /personnes/demandes/d1/traitement ; le domaine branché répond 404 DEMANDE_INTROUVABLE, déclaré au contrat. Tests en échec : cinq-routes-interceptees, base-appliquee.
- Il faut une fiche corrective autorisant ce test (id existant, ou statut différent de 501).
- Types et taille sont corrigés sur lot-08/L08-T37 (branche mise à jour par merge de origin/main).
