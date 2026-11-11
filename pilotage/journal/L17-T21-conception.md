# Conception V2 (reste) : fiches L17-T21 à L17-T40 (11/11/2026)

Exigences attendues : 20 (V2 actives, hors « Plateforme et conformité » et « Ventes et intégrations ») ; couvertes : 20 ; fiches : 20. Toutes portent `bloque_par: V2`.

## Fiches
- T21 ROL-013 rôles par cases ; T22 AGT-014 rejeu et commentaire contrôlé (+ D43) ; T23 IMP-007, IMP-008 entrées automatiques.
- T24 PCE-012 pièce citée absente ; T25 PCE-033 étiquettes (noyau, contrat, faux serveur) ; T26 PCE-033 écran E07.
- T27 BAN-042 simulation ; T28 BAN-055 chèques, dividendes, occasion ; T29 DEC-013 alertes tiers (accès à vérifier).
- T30 DEC-029 dépôt direct (décision et ADR console ouvertes) ; T31 DEC-033 logiciels de cabinet ; T32 CHT-030 mode local (+ D43).
- T33 CHT-032 partage, raccourcis, rappels, règles sourcées ; T34 UX-123 coffre chiffré ; T35 UX-062 file de photos.
- T36 DEM-011 bac à sable (décision ouverte) ; T37 DEM-012 contact et mesure ; T38 QUA-023 machine de référence (+ D42).
- T39 UX-093 widgets sectoriels (décision ouverte) ; T40 PRF-013 compléments du périmètre (décision ouverte).

## Couverture partielle (reste à écrire après la V0)
- ROL-013 : table `regle_permission` (L06-T39) et route de création des rôles.
- BAN-042, BAN-055 : panneau de l'écran E12 (aucune porte de maquette E12).
- IMP-007, DEC-013, DEC-033 : adaptateurs réels (choix et accords de Will).
- CHT-032 : la gestion des utilisateurs reste à la console ; routes et écran du chat.
- UX-062, UX-123 : branchement IndexedDB et application installable (V3-UX-061, V1).
- BAN-055 : le critère « tableau de prêt » relève de V3-MOT-080 (MVP), non repris.
- PRF-013 (domaine « Profil de société ») : absent de la liste du prompt mais compris dans « toutes sauf » ; traité.

## Recoupements de fichiers
- T25 : `packages/contrat/src/domaines/pieces.ts`, `pieces-service.ts`, faux serveur `domaines/pieces.ts` (fiches du lot 04).
- T26 : `apps/web/src/ecrans/e07/Ecran.tsx` et `packages/textes/src/ecrans/e07.ts` (L04-T40, PR ouverte).
- Autres plages : dépendances vers V3-PLA-110 et V3-PLA-185 (plage « Plateforme et conformité ») ; aucun fichier commun connu.
- Nom de ce fichier : la garde périmètre n'accepte que `LNN-TMM.md` ; à renommer si Will le demande.
