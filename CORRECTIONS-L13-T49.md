VERDICT: A CORRIGER
SHA relu : 97934aa2ce401d3407872d2944f1a3cfe3dc8b89

# Avis de relecture renforcée : L13-T49 (PR #857, fiche sensible, droits)

## Contrôles effectués
- Périmètre : 4 fichiers, tous dans `fichiers_autorises`. Taille : 245 lignes pour 280 au plus (aucune ligne « - - »).
- Critère 1 : les 10 tests nommés passent, plus un test d'ordre ligne puis événement (11/11).
- Critère 2 : en retirant `await o.refus.ajouter(ligne)`, `trente-six-refus-non-humains` devient rouge (avec 4 autres tests). Vérifié.
- Critère 3 : `gestes.test.ts`, `gestes-routes.test.ts` et `persistance/__tests__/principes.test.ts` restent verts (36/36 avec garde-gestes).
- Critère 4 : `pnpm verifier` : vert (tests 664 fichiers, gardes vertes, lint vert). L'étape « types » a échoué seulement à cause du Node 22 du cloud ; `tsc --noEmit` lancé directement sur tous les paquets est vert.
- Mutations : écriture du refus retirée : rouge ; accord rendu si la base est en panne : rouge ; `startsWith` remplacé par `includes` : rouge ; minuscules retirées : rouge ; option `fusion` ignorée : rouge.
- Décision : `verifierGeste` appelé tel quel (pas de recalcul), carte contrôlée à la création, délai en argument, fermé par défaut sur une route sensible non déclarée, `Object.hasOwn` (pas de confusion avec `constructor` ou `toString`). L'événement ne porte ni nom, ni e-mail, ni identifiant de personne, ni canal.
- Aucun mot interdit, aucun prix, aucun secret, aucun octet NUL ; données fictives (`societe-fictive-1`). Journal : 8 lignes, commence par `# Journal L13-T49`, cite J3a et la décision de Will du 07/11/2026.

## Défauts bloquants
1. Écart à la fiche, § À faire 2, troisième puce : la fiche demande que l'acteur personne et son heure de connexion viennent d'une `Session` de L00-T50 (faux en mémoire dans les tests), que la réauthentification appelle `exigerNouvelleConnexion` (L00-T50, présent sur main dans `packages/noyau/src/session/port.ts:86`), et que `compta.geste.refuse` devienne une enveloppe de L00-T49 déposée dans la même transaction que la ligne `refus_geste` (`publier` remplacé par la `BoiteEnvoi` de la transaction). Rien de cela n'est fait : `apps/serveur/src/principes/garde-gestes.ts:31` garde `publier`, `:41` prend un `Acteur` déjà construit, `:62-67` écrit la ligne et publie hors de toute transaction. Le journal (ligne 6) reporte ce point au branchement, sans amendement de la fiche. Une fiche sensible ne peut pas abandonner une consigne de son « À faire » sans arbitrage. Correction demandée : soit implémenter cette puce (Session en faux mémoire, `exigerNouvelleConnexion`, enveloppe L00-T49 dans la transaction de la ligne), soit obtenir de Will un amendement explicite de la fiche (la fiche se contredit en partie : la signature de `creerGardeGestes` liste encore `publier`, et le contexte dit que « l'acteur arrive déjà construit »). Je laisse l'arbitrage à Will, mais ce point ne peut pas passer en silence.

## Remarques (non bloquantes)
- `garde-gestes.ts:75` : si `ver
