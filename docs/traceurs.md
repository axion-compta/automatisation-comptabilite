# Traceurs et stockages locaux (V3-PLA-177)

Aucun témoin, aucun traceur ni aucune requête hors du domaine du produit au chargement des écrans (polices servies localement). Le test `apps/web/e2e/traceurs.e2e.ts` vérifie, en mode simulé, sur bureau et téléphone : 0 requête d'une autre origine, `document.cookie` vide, clés de `localStorage` et `sessionStorage` toutes listées ci-dessous.

| nom | type (témoin, stockage local) | finalité | durée | justification |
| --- | --- | --- | --- | --- |
| aucun | aucun | aucun | aucune | le test ne trouve aucun témoin ni aucune clé de stockage local |
