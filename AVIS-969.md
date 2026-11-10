VERDICT: OK
SHA relu: 1ad14a84ca61cdc0f2397ee0f69b0f35a4eee821

PR 969, fiche L00-T67 (branche lot-00/L00-T67), relecture Opus locale.

Vérifié :
- Périmètre : 4 fichiers, tous dans fichiers_autorises (L04-T30.md, L10-T33.md, L00-T67.md, journal L00-T67.md). 13 lignes, plafond 60.
- L04-T30 et L10-T33 : seul fichiers_autorises change (le test de branchement est ajouté), plus une ligne de piège chacune. statut, depend_de, criteres et taille inchangés.
- Les deux tests de branchement existent sur main. La PR 837 change bien seulement `/pieces/p1` en `/pieces/piece-001`.
- L00-T67 : statut a_faire passe à fait. Le journal fait 5 lignes et commence par « # Journal L00-T67 ».
- Dépendances : aucune modifiée, donc pas de cycle possible.
- Gardes en local (verifier.mjs --gardes avec GITHUB_HEAD_REF, BASE_REF, TITRE_PR, CORPS_PR) : perimetre vert (L00-T67, 4 fichiers, 13 lignes), fiches 899 cohérentes, textes vert, fictif vert. Seule licences est rouge en local, faute de node_modules : cela vient du poste, pas de la PR. En CI, licences est vert.
- CI : les 9 contrôles sont verts.
- Aucun prix, aucun nom réel, aucun mot interdit.

Remarques (non bloquantes) :
- pilotage/fiches/L04-T30.md:33 et L10-T33.md:32 : le nouveau tiret est placé avant le paragraphe existant, sans ligne vide. En Markdown, ce paragraphe se rattache donc au tiret. C'est seulement de la mise en forme.
- La PR 838 (L10-T33) ne modifie pas encore ventes-branchement.test.ts. L'autorisation reste valable mais elle est pour l'instant inutilisée.
