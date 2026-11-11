# Conception des fiches V1 et V2 (11/11/2026)

Tu es concepteur (Opus). Tu CONÇOIS des fiches, tu ne codes RIEN. Deux dépôts sont montés : `will383842/automatisation-comptabilite` (public, le code et pilotage/fiches/) et `will383842/automatisation-comptabilite-prive` (privé, le registre des exigences).

## À lire d'abord
1. Dépôt public : `pilotage/LISEZMOI.md`, `CLAUDE.md`, et DEUX fiches existantes comme modèle (par exemple `pilotage/fiches/L04-T56.md` et `pilotage/fiches/L10-T36.md`) : copie exactement leur forme (en-tête, fichiers_autorises, taille_max_lignes, critères d'acceptation, sensible, dépendances, journal).
2. Dépôt privé : `documents-de-reference/registre_V3_7.csv` (colonnes id, domaine, titre, priorite, dependances, critere_acceptation, risque_legal, decision_fondateur, adr_console, phase_serveur, ecran_ou_spec, statut). Les exigences à traiter : statut = actif ET (priorite = V1 ou phase_serveur = V1) pour la V1 ; (priorite = V2 ou phase_serveur = V2) pour la V2. Lis aussi `documents-de-reference/PLAN_V5_3.md` (section P11 V1) et, si une exigence cite une spec (colonne ecran_ou_spec), le fichier correspondant sous `specs-backend/` du dépôt privé.
3. Les ADR du dépôt public (`docs/adr/`) et le code déjà sur main (la V0 est presque finie) : une fiche V1 doit s'appuyer sur ce qui existe (noms de fichiers réels).

## Ce que tu produis
- Les exigences qui te sont données dans ton prompt (domaines précisés) : regroupe-les en fiches de 100 à 300 lignes de code au plus chacune (une fiche = un livrable testable, une seule PR). Plusieurs exigences proches peuvent partager une fiche ; une exigence trop grosse se découpe.
- Numérotation : utilise UNIQUEMENT la plage d'identifiants donnée dans ton prompt (ex. L16-T01 à L16-T20). Ne sors pas de ta plage : d'autres concepteurs travaillent en parallèle sur les autres plages.
- Chaque fiche : `statut: a_faire`, `depend_de` (fiches existantes ou de ta plage, par leur identifiant ; les fiches V0 sont celles qui existent déjà sur main), `fichiers_autorises` précis (chemins réels, tests inclus, pilotage/fiches/<ID>.md et pilotage/journal/<ID>.md), `taille_max_lignes` (300 au plus), critères d'acceptation mesurables, `sensible: oui` pour argent, fiscalité, données de personnes, sécurité, IA. Liste dans la fiche les identifiants d'exigences du registre qu'elle couvre.
- Ligne OBLIGATOIRE dans chaque fiche : `bloque_par: V1 (ou V2) : ne pas planifier avant la fin de la V0 (décision de Will, 11/11/2026)`. Le script de lancement saute les fiches qui ont un bloque_par : ainsi aucune ne part par erreur. Si une exigence dépend en plus d'une décision de Will non prise (D42 hébergement, D43 IA, J3a identité, ou une colonne decision_fondateur / adr_console non résolue), ajoute-la dans le même bloque_par.
- Écran ou interface : une fiche d'interface dépend de la porte « maquette validée » si l'écran existe (regarde `pilotage/portes/`) ; sinon écris-le dans bloque_par.
- Un fichier de synthèse `pilotage/journal/<premier ID de ta plage>-conception.md` (30 lignes au plus) : liste des fiches créées, exigences couvertes, exigences NON couvertes et pourquoi, recoupements de fichiers avec d'autres plages.

## Règles
- Une seule PR « de pilotage » : branche `pilotage/fiches-<nom donné dans ton prompt>` depuis origin/main, qui N'AJOUTE QUE des fichiers `pilotage/fiches/LNN-TMM.md` et `pilotage/journal/LNN-TMM.md` (la garde périmètre refuse tout autre fichier). Titre : « <Vx> conception : fiches <premier ID> à <dernier ID> ». Pas de fusion. Pas de force-push. Commit et push « wip: » toutes les 10 minutes.
- Aucun secret. Données fictives seulement. Mots interdits dans les textes de produit : conforme, sans erreur, garanti, juriste, PDP. Jamais « Aucun gain garanti ». Décisions : D42, D43, J3a, D29, D87, D88 (voir pilotage/LISEZMOI.md et le registre) : une exigence qui les touche reste bloquée, tu ne les tranches pas.
- Ne copie AUCUN texte du dépôt privé qui soit une décision, une adresse, un nom de personne ou un chiffre commercial dans le dépôt public : reformule en critères techniques. Le dépôt public ne reçoit que des fiches techniques.
- Termine par un commentaire de PR : nombre de fiches, nombre d'exigences couvertes sur le nombre attendu.
