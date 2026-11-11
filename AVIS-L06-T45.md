VERDICT: A CORRIGER
2b2902e6265cc8e47842e7f00188cc7bb98bb9cb

# Avis PR 1045 (L06-T45, bail de lecture du personnel Axion) — SENSIBLE (droits)

Relu au SHA de tête ci-dessus. Fiche de référence : version amendée par #1032. #1032 est fusionnée, la branche `lot-00/L00-T83` n'existe plus, donc la fiche est lue sur origin/main. Fusion par Will seul.

## Ce qui est tenu
- Périmètre : 5 fichiers, tous dans `fichiers_autorises`. Taille : 169 + 3 = 172 pour un maximum de 250. Aucune ligne « - - », aucun mot interdit, aucun prix, données fictives. Journal : 7 lignes, commence par `# Journal L06-T45`. La branche se fusionne sur main sans conflit.
- CI verte au SHA relu (run 43083513994 : `verifier`, `tests`, `e2e`, `gardes`, `types`, `lint`). En local (Node 24) : `bail-support.test.ts` 5 sur 5, `coque.test.tsx` 22 sur 22.
- Durée maximale passée en paramètre (`maxMs`), aucune valeur en dur dans le code.
- Mutations à la main (annulées ensuite), toutes détectées :
  - journalisation retirée → `C09-cinq-ecritures-cinq-refus-cinq-entrees` rougit ;
  - contrôle du bail retiré dans `decider` → `bail-expire-plus-d-acces` et `panne-de-la-console-refus-par-defaut` rougissent ;
  - `maintenant < fin` remplacé par `<=` → `bail-expire-plus-d-acces` rougit ;
  - contrôle de l'accord écrit retiré → `sans-bail-ou-sans-accord-ou-trop-long-aucun-acces` rougit ;
  - bandeau monté dès qu'un contexte existe → `bandeau-absent-sans-bail-ou-bail-echu` rougit ; bandeau jamais monté → `bandeau-visible-pendant-le-bail` rougit.

## Défauts bloquants
1. **Le bail n'est rattaché à aucune société.** `apps/serveur/src/securite/bail-support.ts:7-18` : `Bail` n'a pas de société, et `PortBails.lire(personneId)` (ligne 17) rend un seul bail par membre du personnel. `decider` (lignes 59-64) n'accepte donc qu'une question : « cette personne a-t-elle un bail quelque part ? ». Un accord écrit donné par la société A ouvre la lecture des dossiers de la société B. De même, `actif(personneId)` ne permet pas au client de savoir si un bail court sur SON dossier (bandeau). Correction : ajouter la société au bail et à la lecture (`lire(personneId, societeId)` ou équivalent), la passer à `decider` et à `actif`, et ajouter un test nommé « bail sur la société A, aucun accès à la société B ».
2. **Cas limites non testés : deux mutations survivent** (`bail-support.ts`, `bailCourt`) :
   - ligne 27, `!Number.isFinite(maxMs)` retiré : les 5 tests restent verts. Avec `maxMs` à `Infinity` ou `NaN`, un bail de n'importe quelle durée est accepté (la règle « une heure au plus » tombe). Ajouter des tests pour `maxMs` = `NaN`, `Infinity` et une valeur négative.
   - ligne 32, `maintenant >= debut` retiré : les 5 tests restent verts. Un bail pas encore commencé donnerait accès. Ajouter un test « avant `debutLe` : pas d'accès », et un test d'ordre inversé (`expireLe` avant `debutLe`).
3. `pilotage/fiches/L06-T45.md` reste en `statut: a_faire`. #1032 est fusionnée : il faut fusionner origin/main dans la branche et passer `statut: fait`, comme le corps de la PR l'annonce.

## Remarques
- `decider` appelle `this.actif` (ligne 64) : la méthode cesse de fonctionner si on l'extrait de l'objet (`const { decider } = support`). Mieux vaut une fonction locale.
- Le bandeau ne dépend que d'un contexte fourni par l'hôte : aucun code ne relie encore `actif` au `ContexteBailSupport`. Le journal le signale (branchement hors fichiers autorisés). Une fiche suivante devra faire ce lien.
