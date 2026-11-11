VERDICT: A CORRIGER

Fiche: L06-T48 (SENSIBLE) - PR #1071 - SHA de tête relu : e564ac3ec9f4547da0478a152df88bbc09270617
Relu : seulement ce que la fiche ajoute (diff contre lot-06/L06-T39 / #1052, encore ouverte). Les fichiers de L06-T39 sont identiques à #1052.

CI : n'a pas tourné (tests GitHub en panne générale). Relecture du code et des tests, exécution locale :
- vitest `apps/serveur/src/__tests__/signalements.test.ts` : 6/6 verts ; eslint et tsc sans remarque sur les fichiers ajoutés.
- Mutations qui rougissent : alerte retirée, source ignorée, tri inversé, corrélation non vérifiée.
- Mutations qui SURVIVENT : retrait de `Number.isInteger(d)` (ligne 71), retrait de `|| v.trim() === ''` (ligne 55).
- `garde:termine` / `garde:perimetre` rouges attendus tant que #1052 n'est pas fusionnée : ce n'est pas un défaut de l'auteur.

Périmètre : 4 fichiers, tous dans fichiers_autorises ; 239 lignes (limite 250). Journal 8 lignes, commence par « # Journal L06-T48 ». Les 4 tests nommés sont présents. Aucune durée de conservation en dur ; aucun prix, secret ni mot interdit ; données fictives.

## Défauts
1. `apps/serveur/src/__tests__/signalements.test.ts` : aucun cas limite NaN, Infinity ou non entier pour `dureeJours`. La mutation qui retire `Number.isInteger(d)` (`signalements.ts:71`) reste verte, alors qu'avec elle `dureeJours = 1.5` est accepté et `dureeJours = Infinity` fait lever `signalementsAPurger`, ce qui arrête la purge de toutes les sociétés suivantes.
   Correction : ajouter à `dureeEnVigueur` des cas NaN, Infinity et 1.5 qui attendent `undefined`, et un cas `purgerSignalements` avec Infinity qui attend aucune purge et l'alerte.
2. `signalements.ts:53-55` : le refus de champ vide (`societeId`, `personneId`, `nature` vides ou faits d'espaces) n'est testé nulle part ; la mutation qui le retire survit.
   Correction : un test par champ, qui attend `ErreurSignalement` code `champ_vide` et aucune ligne écrite.
3. `signalements.ts:91-95` : `illisibles`, rendu par `signalementsAPurger`, est ignoré. Un signalement dont `creeLe` est illisible n'est jamais purgé et rien ne le signale. Fiche purge / RGPD : la conservation sans fin doit se voir.
   Correction : alerte dédiée par `PortAlerteExploitation` (par ex. code `signalements_illisibles` avec la société et le nombre), plus un test.

## Remarques (non bloquantes)
- Une société dont `parametre.lire`, `alerter` ou `lister` lève arrête la purge des sociétés suivantes : envisager de continuer et d'alerter.
- `societes` est figé à l'inscription au planificateur : une société créée ensuite n'est jamais purgée (un port de lecture serait plus sûr).
- `dateEffet` est comparé en texte : un format non `AAAA-MM-JJ` n'est pas refusé.
- Demandes du portail (V3-SUP-010) : aucune interface dans le code, alors que le titre et le contexte les citent ; le journal le note.
- Table 092 sans colonne `correlation_id` : à prévoir dans une fiche de schéma (noté par l'auteur).
- PR sensible : fusion par Will seul.
