# BLOQUE-L05-T66
Cause : pré-vol (1), conflit de fichier avec une PR ouverte non citée.
- PR ouverte n°1032 « L00-T83 Amendement D88 et levée des blocages périmés » (branche lot-00/L00-T83, tête 3a84d86dec98d1f725b1933aa448a54ff4808a7c).
- Elle modifie pilotage/fiches/L05-T66.md (2 ajouts, 3 suppressions), fichier de mes fichiers_autorises : retrait de bloque_par, précision D88 (liste de ParametreLegal en argument, vide par défaut, lue par parametreAuJour).
- Ma PR devrait aussi passer statut à fait et retirer bloque_par dans cette même fiche : conflit de fusion certain.
- Pré-vol (2) : aucun test existant hors périmètre ne casserait (rien sur apps/serveur/src/chat/echeance*).
Correction minimale : fusionner la PR 1032 (par Will), puis relancer L05-T66 depuis origin/main ; ou citer 1032 comme PR attendue dans la consigne.
Rien n'a été codé.
