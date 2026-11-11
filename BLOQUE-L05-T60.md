# BLOQUE-L05-T60

Fiche L05-T60 non exécutée : pré-vol (1) en échec.

- La PR ouverte #1032 (« L00-T83 Amendement D88 et levée des blocages périmés D29, D42, D43, J3a », branche lot-00/L00-T83) modifie `pilotage/fiches/L05-T60.md`, un fichier de `fichiers_autorises`.
- Sur `origin/main`, la fiche porte encore le blocage Q3 : l'amendement D88 n'y est pas fusionné.
- Écrire la fiche (statut: fait) dans une autre PR créerait un conflit avec #1032.

Correction minimale : fusionner #1032 (par Will), puis relancer la routine sur L05-T60.

Pré-vol (2) : aucun test existant hors périmètre ne porte sur `Dictee.tsx` ni sur `voix/` (recherche git grep, aucun résultat).
