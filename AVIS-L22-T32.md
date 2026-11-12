VERDICT: A CORRIGER

PR #1156, fiche L22-T32, tête 69971a0d055ecba732ee7ada91b5b55bd2bebc09.

Vérifié :
- Fichiers dans fichiers_autorises ; 118 lignes (max 200) ; sources.test.ts non modifié et vert ; garde:perimetre verte en local ; tsc et eslint verts.
- 16 tests verts (regles-hierarchie + sources). Mutations détectées : debutValidite < -> <= ; finValidite < -> <= ; retrait de borneValide (début et fin) ; retrait du contrôle de la date d'opération ; perimees ignorée dans le verdict ; forme du verdict sans date.

Défauts :
1. packages/noyau/src/agents/sources.ts:46 : mutant survivant `trouvees.some(` -> `trouvees.every(` (16/16 verts). Ajouter dans regles-hierarchie.test.ts (source-valide-a-la-date-acceptee) un registre avec deux entrées de même id@version, l'une périmée et l'autre couvrant la date : verdict { valide: true } attendu ; et le cas inverse où aucune ne couvre : perimees attendue.
2. packages/noyau/src/agents/__tests__/regles-hierarchie.test.ts:42 : cas limite « ordre inversé » absent. Ajouter une entrée avec debutValidite postérieure à finValidite (ex. début 2027-01-01, fin 2026-01-01) : la date 2026-06-15 doit rendre perimees: [CITATION].

Remarques :
- injection-antidater-refusee est détecté par le motif générique ignore_consignes, pas par l'antidatage ; le journal le signale (demande d'antidatage seule non détectée, fiche à ouvrir). Code existant, pas un défaut de l'auteur.
- cent-pourcent-des-cas-bloquants compare un quotient flottant à 1 ; `expect(reussis).toBe(noms.length)` est plus net (facultatif).
- Fiche sensible : fusion par Will seul.
