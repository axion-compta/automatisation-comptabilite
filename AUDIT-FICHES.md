# Audit de fiches V1/V2 (12/11/2026) : tu RAPPORTES, tu ne corriges rien

Tu es auditeur (Opus). Deux dépôts montés : public `will383842/automatisation-comptabilite` (fiches dans `pilotage/fiches/`, code sur main) et privé `will383842/automatisation-comptabilite-prive` (registre `documents-de-reference/registre_V3_7.csv`, `PLAN_V5_3.md`, `specs-backend/`). Lis `pilotage/LISEZMOI.md` et `CONCEPTION-V1V2.md` (branche consignes/vague3 du dépôt public) : ce sont les règles que les fiches devaient suivre.

## Pour CHAQUE fiche de ton lot, contrôle
1. Forme : même en-tête que `L04-T56.md` / `L10-T36.md` ; `statut`, `sensible`, `depend_de`, `fichiers_autorises` (inclut la fiche et son journal), `taille_max_lignes` <= 300, `criteres` mesurables, ligne `bloque_par` présente.
2. Exactitude : chaque exigence citée existe dans le registre (colonne id), a bien la priorité V1/V2 et le sujet de la fiche ; son `critere_acceptation` est réellement couvert par les critères et les tests nommés de la fiche (compare phrase à phrase).
3. Oublis : une exigence V1/V2 du même domaine que la fiche, sans aucune fiche ; un critère d'acceptation du registre que la fiche ne teste pas.
4. Dépendances : chaque `depend_de` existe, est antérieur logiquement, pas de cycle ; la fiche s'appuie sur des fichiers qui existent VRAIMENT sur main (vérifie les chemins cités, ls / git ls-tree).
5. Harmonie : `fichiers_autorises` en recoupement avec une autre fiche L16/L17 ou une fiche V0 encore à faire (liste les paires) ; deux fiches qui font la même chose ; noms de tests, de routes, de clés incohérents entre fiches voisines ; vocabulaire de produit différent.
6. Sécurité et règles de fer : `sensible: oui` quand il y a argent, fiscalité, données de personnes, sécurité, IA ; mots interdits (conforme, sans erreur, garanti, juriste, PDP) ; aucun secret, adresse, nom de personne, chiffre commercial ou décision privée recopiés dans le dépôt public.
7. Blocages : le `bloque_par` cite-t-il toutes les décisions non prises (D42, D43, J3a, D29, D87, D88, colonnes decision_fondateur / adr_console) ? Une fiche peut-elle être lancée sans décision alors qu'elle touche à l'une d'elles ?

## Rapport
Fichier `revues/audit-fiches-<lot>.md` dans le dépôt PRIVÉ, branche `audit/fiches-<lot>` créée depuis main, un commit, push sans force-push, aucune PR. Contenu, en français :
- une ligne par fiche : `OK` ou `A CORRIGER` + la liste numérotée des défauts précis (fichier, ligne ou champ, ce qu'il faut écrire) ; classe chaque défaut BLOQUANT (la fiche échouera ou produira une erreur) ou MINEUR ;
- section « Oublis » : exigences V1/V2 sans fiche ou critères non couverts ;
- section « Recoupements » : paires de fiches qui touchent les mêmes fichiers ;
- verdict global du lot : PARFAIT, A RETOUCHER ou A REFAIRE, avec le nombre de fiches OK / à corriger.
Tu ne modifies AUCUNE fiche. Données fictives. Aucun secret.
