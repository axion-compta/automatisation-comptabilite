VERDICT: A CORRIGER

PR #1133 « MVP conception : fiches L20-T01 à L20-T33 », relue au SHA de tête 6ca719bed58b65a2e53aa7a15a96f26dde269e33 (branche pilotage/fiches-MVP-20, à jour de main).
Relecteur Opus, consigne LOT5 section R. Je ne bloque pas tout le lot. Je demande de retirer les fiches qui recoupent, plus une reprise mécanique des critères.

## Défauts
1. Recoupement avec des fiches non faites de main. La consigne de relecture exige « SANS recoupement ». garde:fiches signale les trois premiers en avertissement.
   - L20-T09, L20-T10, L20-T13 avec L17-T26 : `apps/web/src/ecrans/e07/Ecran.tsx` et `packages/textes/src/ecrans/e07.ts`.
   - L20-T14 avec L16-T17 : `packages/contrat/src/registres/lot-04.ts`, `packages/contrat/openapi/lot-04/openapi.json` et `apps/serveur/src/registres/lot-04.ts`.
   - L20-T24 avec L16-T19 : `packages/contrat/src/registres/lot-01.ts`, `packages/contrat/openapi/lot-01/openapi.json` et `apps/serveur/src/registres/lot-01.ts`.
   Les fiches L16-T17, L16-T19 et L17-T26 sont bloquées : aucune dépendance n'est donc possible.
   Correction demandée : retirer L20-T09, T10, T13, T14 et T24, ainsi que les fiches qui en dépendent (T15 dépend de T14, T25 dépend de T24). Une décision écrite de Will qui accepte ces recoupements, notée dans les fiches, pourrait la remplacer.
2. Doublon contradictoire avec une autre PR ouverte : L20-T28 (V3-IMP-038, `banque/plateforme-releve.ts`) et L24-T26 (PR #1135, V3-BAN-013, `banque/import/plateforme.ts`).
   - Les deux traitent le relevé d'une plateforme d'encaissement, mais de façon opposée. L24-T26 le refuse avec explication et n'importe aucune ligne ; L20-T28 rapproche chaque opération ou la marque `a_verifier`.
   - Correction demandée : retirer l'une des deux. Will tranche le comportement du MVP.
3. Forme des critères, dans les 33 fiches. Elles écrivent « les tests nommés passent : <noms> », sans fichier de test ni nombre.
   - Ce n'est pas la forme du modèle L04-T56, ni celle des 1063 fiches de main : « les N tests nommés de <fichier> passent ». Un nom de test sans fichier ne se vérifie pas de façon univoque.
   - Correction demandée : réécrire chaque critère sous la forme « les N tests nommés de <fichier de test> passent : <noms> ». Faire un critère par fichier quand la fiche en a plusieurs, par exemple L20-T01 avec `organe.test.ts`, `assemblee.test.ts` et `sci-sans-greffe.test.ts`.
4. Recoupements avec les fiches d'autres PR de conception ouvertes. Ils dépendent de l'ordre de fusion :
   - L20-T08 et L20-T12 : registres `lot-03` (contrat, serveur, faux serveur) et `openapi/lot-03`, avec L22-T17 (#1139) et L23-T20 (#1137) ;
   - E07 (L20-T09, T10, T13) : avec L23-T21 (#1137) et L19-T11 (#1134) ;
   - L20-T14 : `openapi/lot-04`, avec L19-T07 (#1134) ;
   - L20-T15 : E08 (`e08/Ecran.tsx`, `textes/ecrans/e08.ts`), avec L22-T18 (#1139) et L19-T10 (#1134) ;
   - L20-T27 : `textes/ecrans/e57.ts`, avec L26-T36 (#1138) ;
   - L20-T32 : `chat/Discussion.tsx` et `textes/ecrans/e25.ts`, avec L26-T14, T16, T17, T18 et T27 (#1138) et L25-T12 (#1136).
   Correction demandée : la PR fusionnée en second ajoute à ces fiches un `depend_de` vers la fiche déjà fusionnée. Si #1133 passe en premier, rien à changer ici.

## Contrôles faits (au vert)
- Forme : clés et ordre identiques à L04-T56, sections Contexte, À faire, Hors périmètre, Pièges. `statut: a_faire`, aucun `bloque_par`.
- `taille_max_lignes` entre 120 et 300 pour chaque fiche.
- `depend_de` : toutes les fiches citées existent (main ou cette PR), aucune n'est bloquée.
- Recoupements internes : seulement entre fiches chaînées (T08 et T12, puis T09, T10 et T13).
- Aucun recoupement avec le diff d'une PR de code ouverte (#1131, #1129, #1128, #1105).
- Dossiers : nouveaux fichiers sous des paquets existants ; `openapi/lot-01` et `openapi/lot-03` seront générés par `pnpm contrat:openapi`.
- Doublons avec main : aucune exigence déjà portée par une fiche de main.
- Mots interdits : aucun. Données fictives (@exemple.fr), aucun nom, aucune adresse, aucun montant ni texte privé.
- Gardes lancées sur la tête : fiches (1096 cohérentes, avertissements du défaut 1), textes, fictif, termine et portes au vert.

## Remarques (non bloquantes)
- L20-T21 (à-nouveaux provisoires de N+1, `exercices/a-nouveaux.ts`) et L22-T20 (#1139, à-nouveaux de clôture, `cloture/a-nouveaux.ts`) sont proches. La fiche fusionnée en second devrait réutiliser le calcul de l'autre.
- Les « Pièges » ne portent pas la phrase « Recoupement vérifié le … » du modèle. À ajouter avec la correction 3.
- La PR fait 1047 lignes (au-delà de 400), comme le demande la consigne d’une seule PR de conception. Fusion par Will seul.
