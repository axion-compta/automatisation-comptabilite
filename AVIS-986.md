VERDICT: A CORRIGER
SHA relu: 95df3ab6cdd786c063d07f87d81b722a39d8c407

PR 986, fiche L08-T37 (branche lot-08/L08-T37), sensible : oui (droits). Relecture stricte Opus locale, fiche lue sur origin/main. Fusion par Will seul.

Vérifié :
- Périmètre : 5 fichiers, tous dans fichiers_autorises ; ni handlers.ts, ni app.ts, ni le contrat, ni options-exploitation.ts touchés. Fusion propre avec origin/main actuel (c528b01).
- Taille : 257 lignes (maximum 260). Aucune ligne « - - », aucun octet NUL. Journal : 8 lignes, commence par « # Journal L08-T37 ».
- Le vrai serveur et le faux serveur appellent le même creerServicePersonnes ; état par instance vérifié (etat-propre-a-chaque-instance) ; REGLAGE_ABSENT 503 bien déclaré au contrat ; réglages de test fictifs, aucune valeur légale par défaut.
- Aucun mot interdit, prix, secret ni nom réel ; pas d'alias d'import de it/test.

Défauts bloquants :
1. Critère « pnpm verifier » non tenu : la CI est rouge au SHA relu (run 42931237830). Reproduit en local : packages/faux-serveur/src/__tests__/exploitation-branchement.test.ts (L08-T34) échoue sur cinq-routes-interceptees et base-appliquee (« POST /personnes/demandes/d1/traitement: expected 404 not to be 404 »), car le domaine branché répond 404 DEMANDE_INTROUVABLE. Ce fichier est hors périmètre : il faut une fiche corrective (décision de Will) qui l'autorise, par exemple en attendant un statut différent de 501 ; ne pas l'élargir dans cette PR.
2. suite-personnes.ts:64-73 (traiter-refus-sans-source-422) : le test accepte ISSUE_NON_PERMISE ou SOURCE_MANQUANTE et reçoit en fait ISSUE_NON_PERMISE ; la règle « refus sans source » n'est donc pas testée. Correction : construire un cas où le refus de conservation est permis et la source absente, et exiger exactement SOURCE_MANQUANTE ; si c'est impossible avec les options existantes, le noter au journal et demander une fiche corrective.
3. commun-personnes.test.ts:44 : pour la cible « faux serveur », sans-reglage-503 rejoue en fait le serveur en mémoire (cibleVrai(false)). Le chemin 503 du faux serveur (personnes.ts:21 côté faux) n'est jamais exécuté : le remplacer par 501 NOT_IMPLEMENTED laisse les 15 tests verts. Correction : appeler handlersPersonnes directement avec des options sans reglagesPersonnes (dans commun-personnes.test.ts, fichier autorisé) et exiger 503 REGLAGE_ABSENT.
4. faux-serveur/src/domaines/personnes.ts:29 : cleDe rend '' si l'en-tête idempotency-key manque, et les corps ne sont pas validés, alors que le contrat (EnTeteEcriture, CleIdempotence de 8 à 128 caractères) fait refuser ces requêtes par le vrai serveur. Les deux serveurs divergent. Correction : refuser comme le vrai serveur (même statut, même code) et l'ajouter à la suite commune.

Remarques :
- Journal, ligne 2 : « pas de PR ouverte » alors que la PR 986 est ouverte ; mettre le journal à jour.
- Mutations : 2 sur 3 détectées (clé de rejeu aléatoire côté faux ; 503 du serveur en mémoire) ; la 3e est le défaut 3.
