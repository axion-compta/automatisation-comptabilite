VERDICT: OK

Relecture 3 de la PR 883, fiche SENSIBLE L11-T43 (branche `pilotage/L11-T43`).
SHA relu : 6e32ad12d6d5e95eac37784c4c38ae2ae250e507
Diff relu : `pilotage/fiches/L11-T43.md` seul (+57 lignes, aucune ligne « - - »). Avis précédent : AVIS-relec77-g01-883.md (D1, D2). Constats faits sur le code de `origin/main` (`frais-actions-service.ts`, `statuts.ts`, `payeur.ts`, `frais-actions.test.ts`).

## Les deux défauts de relec77
- D1 : corrigé. Le point 3 distingue les deux cas. Si le statut du noyau DIFFÈRE du statut courant et que `peutPasser` le refuse, on n'écrit ni le payeur ni `ligneBanqueId`, puis on passe à `a_completer` si c'est permis (cas `propose`). S'il est ÉGAL, on écrit le payeur et on garde le statut, comme aujourd'hui (`frais-actions-service.ts:117`, garde `r.statut !== f.statut`). Vérification de `completer-change-la-version` (`frais-actions.test.ts:51-60`) : avec la fiche, la dépense créée est `a_completer` ; `declaration: 'societe'` donne `a_completer` (`payeur.ts:48`). Les statuts sont égaux, donc `payeur: societe` est écrit et le test reste vert. Sur main, `propose` → `a_completer` est permis (`statuts.ts:7`), et le test est vert aussi.
- D2 : corrigé.
  - Justification exacte : le frais peut être repassé en `propose` puis validé par L11-T27 ; le double paiement n'est fermé que pour le `PATCH`.
  - Hors périmètre L11-T44 (a) : L11-T27 rejoue la correspondance bancaire avant `propose` et `valide` et refuse `FRAIS_PAYE_SOCIETE`, ou bien L11-T44 trace le conflit.
  - (b) : la PR qui rédige L11-T44 ajoute L11-T43 et L11-T44 à `depend_de` de `pilotage/fiches/L11-T27.md`, et elle n'est pas une PR en ajout seul. `L11-T27.md:11` n'a aujourd'hui ni L11-T43 ni L11-T44 : c'est cohérent.

## Contrôle d'ensemble
- Scénario de `completer-propose-ligne-societe-a-completer` : `LIB-002` correspond. Le noyau rend `exclu_paye_societe` (règle 1, `payeur.ts:42`), et `peutPasser(propose, exclu_paye_societe)` est faux. Le frais passe donc à `a_completer` en gardant `personne`, sans `ligneBanqueId`. Sur main, il reste `propose` avec `societe` et `LIB-002`, donc le test est bien rouge.
- `completer-payeur-societe-garde` adapté : `LIB-002` est la ligne du frais lui-même. Le point 2 ne retire que les lignes d'un AUTRE frais : le noyau rend donc `exclu_paye_societe`, statut égal au statut courant, et le test reste vert.
- Tests nommés : 5 rouges (constat sur main de relec77, inchangé) et 4 tueurs, chacun avec sa mutation nommée.
- Modifiabilité : `valide` et `TRANSITIONS.valide` (`rembourse`, `en_compte_courant`, `statuts.ts:8`), soit exactement `FIGES` (`frais-actions-service.ts:23`). Le comportement ne change pas.
- Trajet `propose` : réalisable dans les 4 fichiers. `carteGrisePieceId` est optionnel dans le noyau (`types.ts:63`), `exactOptionalPropertyTypes` est actif (`tsconfig.base.json:14`), et le paramètre `bareme_ik_voiture` est `valide` en 2025 et `a_verifier` en 2026 (`donnees-fictives/src/frais.ts:129-130`).
- Taille 340 : réaliste. Les `fichiers_autorises` existent ; le journal sera créé.
- Aucun mot interdit, aucun prix, données fictives seulement.

## Remarques (non bloquantes)
- Point 3 : préciser que le « statut du noyau » est celui obtenu APRÈS le point 1 (un `propose` ramené à `a_completer` faute de pièce). L'ordre se déduit, mais l'écrire évite une hésitation.
- L11-T44 (a), variante « trace le conflit » : elle ne ferme le double paiement que si L11-T27 lit cette trace avant `propose` et `valide`. À écrire dans L11-T44.
- La modification de `L11-T27.md` touche `pilotage/`, un chemin sensible : fusion par Will seul, comme prévu.
