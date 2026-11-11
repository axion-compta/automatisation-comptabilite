# BLOQUE-L15-T64

Fiche L15-T64 non exécutée : arrêt au pré-vol (consigne auteur, point 1).

- Cause : la PR ouverte #1032 (« L00-T83 Amendement D88 et levée des blocages périmés D29, D42, D43, J3a », branche lot-00/L00-T83) modifie `pilotage/fiches/L15-T64.md`, fichier de `fichiers_autorises`.
- Effet de #1032 sur la fiche : la migration `015b-index-recherche.sql` devient `093-index-recherche.sql` (le nom `015b-…` est refusé par la garde `migrations`) et le contexte est mis à jour.
- Conséquence : écrire maintenant avec la fiche de `main` produirait une migration au nom refusé et un conflit sur la fiche.
- Reprise : après fusion de #1032, relancer l'auteur sur L15-T64 depuis `origin/main`.
- Aucun test existant hors périmètre ne casserait (aucune recherche en base n'existe encore).
