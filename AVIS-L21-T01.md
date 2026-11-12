VERDICT: A CORRIGER

PR #1132 « MVP conception : fiches L21-T01 à L21-T25 », relue au SHA de tête 590eb8c387e08c320ea27518dca8f9dc8e2c308d (branche pilotage/fiches-MVP-21, à jour de main).
Relecteur Opus, consigne LOT5 section R. Une seule fiche est à retirer ; les 24 autres peuvent rester.

## Défaut (bloquant pour une seule fiche)
1. pilotage/fiches/L21-T25.md : doublon de L24-T01 (PR ouverte #1135), avec les mêmes fichiers.
   - Les deux fiches créent `packages/noyau/src/exercices/premier-exercice.ts` et `packages/noyau/src/exercices/__tests__/premier-exercice.test.ts`, pour la même règle (premier exercice de 6 à 24 mois, 25 mois refusés, bornes en paramètre daté). Elles rangent aussi les bornes dans deux catalogues différents (`catalogue/premier-exercice.ts` et `catalogue/exercices.ts`).
   - Elles n'ont aucune dépendance entre elles, et aucune n'est possible tant que l'autre PR n'est pas fusionnée.
   - Correction demandée : retirer L21-T25 de cette PR. V3-REP-040 sera ajoutée aux `exigences` de L24-T01 (PR #1135), ou laissée à une fiche ultérieure.

## Contrôles faits (tous au vert pour les 24 autres fiches)
- Forme : mêmes clés, dans le même ordre, et mêmes sections (Contexte, À faire, Hors périmètre, Pièges) que L04-T56. `statut: a_faire`, aucun `bloque_par`.
- `taille_max_lignes` entre 120 et 300 pour chaque fiche.
- Critères : « les N tests nommés de <fichier> passent » + `pnpm verifier`. Le nombre annoncé correspond aux noms listés et le fichier de test figure dans `fichiers_autorises`.
- `depend_de` : les 25 fiches citées existent (main ou cette PR), aucune n'est bloquée. L21-T05 dépend de L06-T42 (PR #1129 encore ouverte) : garde:termine la tiendra rouge jusqu'à sa fusion, ce qui est normal.
- `fichiers_autorises` : les dossiers existent ou sont nouveaux sous un paquet existant (`packages/noyau/src/reprise/`).
  - Aucun recoupement avec une fiche non faite de main.
  - Aucun recoupement avec le diff d'une PR ouverte (13 PR, `git diff --name-only`).
  - Seul recoupement avec une fiche d'une autre PR de conception : L21-T25 (voir le défaut ci-dessus).
  - `docs/reprise_regles.csv` est partagé par T20, T21 et T23, qui dépendent les unes des autres.
- Doublons avec main : aucune exigence déjà portée par une fiche de main. L21-T01 complète L18-T08 (PR #1102), sans la doubler : `autoriser.ts` d'un côté, `assimilation-decision.ts` de l'autre.
- Mots interdits : aucun. Aucun nom, aucune adresse, aucun montant ni texte privé.
- Gardes lancées sur la tête : fiches (1088 cohérentes), textes, fictif, termine et portes au vert.

## Remarques (non bloquantes)
- Recouvrement fonctionnel à surveiller avec la PR #1135 :
  - L24-T09 (plan et à-nouveaux reconstruits depuis un FEC ou une balance) recouvre L21-T09 et L21-T10 ;
  - L24-T12 (soldes d'ouverture équilibrés) recouvre L21-T10.
  Les fichiers et les exigences diffèrent (PCP-003 et AGT-011 contre REP-010 et REP-030). La fiche fusionnée en second devrait dépendre de l'autre et réutiliser son code au lieu de le refaire.
- La PR fait 827 lignes (au-delà de 400). Cela suit la consigne d'une seule PR de conception, comme pour V1 et V2.
- Fusion par Will seul (PR de pilotage).
