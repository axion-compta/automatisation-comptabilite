# BLOQUE-L05-T62

Fiche : L05-T62 (recherche plein texte dans les conversations d'une société).
Dépendance L05-T56 : fait. Pas d'ARRET. Aucune ligne bloque_par dans la fiche.

Causes :
1. La fiche exige un index plein texte en français et des tests « sur une base de test » : migration SQL et persistance en base. Consigne auteur3 point 8(d) : ne pas faire, attend la console (21/11) ou Will.
2. fichiers_autorises cite apps/serveur/migrations/0XX_chat_recherche.sql (numéro à compléter). La garde migrations lit apps/serveur/src/base/migrations en NNN-mot.sql. Le chemin ne correspond pas et la fiche ne peut être modifiée que sur la ligne statut.

Il faudrait : que Will tranche la persistance en base, et corrige fichiers_autorises (chemin de migration exact, ou version en mémoire sans SQL).
Aucun code écrit ; 0 ligne de code.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
