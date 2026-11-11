VERDICT: OK
SHA relu: 8a041ea25e44b9aaecf374c0cf23c9a4391a9de4

PR 983, fiche L07-T41 (branche lot-07/L07-T41), sensible : oui. Relecture stricte Opus locale, fiche lue sur origin/main.

Vérifié :
- Périmètre : 4 fichiers, tous dans fichiers_autorises (operations.ts, son test, fiche passée à fait, journal). Rien dans .github/, aucune dépendance, aucune garde touchée.
- Taille : 280 lignes, égale à taille_max_lignes (280). Aucune ligne « - - », aucun octet NUL.
- Critères relancés au SHA relu : vitest src/mise-en-service 14/14 ; Stryker sur operations.ts 84,08 % (seuil 80) ; pnpm verifier en local : seuls rouges, des tests de durée hors PR (chat/gardien-entree, chat/filtre-sortie, bandeau-acces), verts relancés seuls. CI verte au SHA relu.
- Tests réels : 7 cassures sur 8 font rougir un test (empreinte, refus mémorisé, motif d'identifiant, peutDemanderEffacement, contrôle de session, rejoue, arretEnvois).
- Pureté : entrées gelées en profondeur, aucune mutation ; ni Date, ni Math.random, ni E/S : l'horodatage vient de ctx.
- Critères de la fiche : clé d'idempotence 8 à 128 caractères (bornes testées) ; rejeu à l'identique avec rejoue: true sans événement, contenu différent : cle_reutilisee ; deja_existant avant création ; identifiant ^[a-z0-9]{1,40}$ ; suspendre par recevoirEtatVoulu (pause, arretEnvois) ; geler par poserGel avec effacement bloqué ; supprimer : 4 refus rendus tels quels, rien d'effacé (seule effacementDemandeLe est posée) ; inviter sans envoi, rôle contrôlé par estRole ; session de personne refusée sur les 5 opérations ; clé __proto__ sans pollution.
- Données fictives (@exemple.fr), aucun mot interdit, prix, secret ni nom réel. Imports vitest sans alias. Journal : 4 lignes. Titre et corps de PR avec Fiche et exigences V3-PLA-010, V3-PLA-134.

Remarques non bloquantes (fiche ultérieure possible) :
1. operations.ts:48 : « { operation, ...demande } » laisse un champ operation de la demande écraser le nom d'opération (seulement avec une entrée hors types). Écrire « { ...demande, operation } ».
2. Ajouter un test « suspendre puis supprimer avec la même clé et le même organisationId donne cle_reutilisee » : remplacer l'empreinte par la demande seule laisse aujourd'hui les 14 tests verts.
3. operations.ts:115-125 : un second supprimer permis, avec une autre clé, écrase effacementDemandeLe et émet un second événement ; garder la première date.
4. operations.ts:97 et 110 : mettre « ...ctx » avant les champs explicites (par, auteur, source).
5. operations.ts:84 : une personne réinvitée avec une autre clé est ajoutée en double.

Fiche sensible : fusion par Will seul.
