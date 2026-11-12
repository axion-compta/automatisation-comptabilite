import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyser, analyserDepot, concerne, FICHIER_REGLAGE } from '../mode-deploiement.mjs';
const codes = (texte, chemin = 'packages/noyau/src/x.ts') => analyser(texte, chemin).map((p) => `${p.ligne}:${p.code}`);
test('comparaison-de-mode-refusee', () => {
  for (const nom of ['MODE_DEPLOIEMENT', 'modeDeploiement', 'mode_deploiement']) {
    for (const op of ['===', '!==', '==', '!=']) {
      assert.deepEqual(codes(`if (${nom} ${op} x) {}`), ['1:branche_par_mode'], `${nom} ${op}`);
      assert.deepEqual(codes(`if (x ${op} ${nom}) {}`), ['1:branche_par_mode'], `inverse ${nom} ${op}`);
    }
  }
  assert.deepEqual(codes('const a = 1;\nconst b = config.modeDeploiement===y;'), ['2:branche_par_mode']);
  // Lire ou affecter le réglage n'est pas une branche.
  assert.deepEqual(codes('const m = modeDeploiement;\nlireReglage(MODE_DEPLOIEMENT);\nmode_deploiement = 1;'), []);
  assert.deepEqual(analyser('if (modeDeploiement === 1) {}', 'apps/web/src/a.tsx')[0], {
    chemin: 'apps/web/src/a.tsx',
    ligne: 1,
    code: 'branche_par_mode',
  });
});

test('switch-sur-mode-refuse', () => {
  assert.deepEqual(codes('switch (modeDeploiement) {\n case 1: break;\n}'), ['1:branche_par_mode']);
  assert.deepEqual(codes('switch (config.MODE_DEPLOIEMENT) {}'), ['1:branche_par_mode']);
  assert.deepEqual(codes('switch (mode_deploiement) {}'), ['1:branche_par_mode']);
  assert.deepEqual(codes('switch (autre) {\n case modeDeploiement:\n break;\n}'), ['2:branche_par_mode']);
  assert.deepEqual(codes('switch (autre) {\n case 1: break;\n}'), []);
});

test('litteral-installation-compare-refuse', () => {
  for (const lit of ['installation', 'heberge', 'installe']) {
    for (const op of ['===', '!==', '==', '!=']) {
      assert.deepEqual(codes(`if (x ${op} '${lit}') {}`), ['1:branche_par_mode'], `${lit} ${op}`);
      assert.deepEqual(codes(`if ("${lit}" ${op} x) {}`), ['1:branche_par_mode'], `inverse ${lit} ${op}`);
    }
  }
  // Faux positifs : mots voisins, affectation, valeur seule.
  assert.deepEqual(codes(`if (x === 'hebergement') {}\nif (x === 'installation-paquet') {}\nif (x === 'pre-installation') {}`), []);
  assert.deepEqual(codes(`const a = 'installation';\nconst b = { mode: 'heberge' };\nconst c = x === installation;`), []);
  assert.deepEqual(codes(`const a = installationPaquet === 'v2';`), []);
});

test('commentaire-ignore', () => {
  assert.deepEqual(codes(`// if (modeDeploiement === 'installation') {}`), []);
  assert.deepEqual(codes(`/* switch (modeDeploiement) {} */`), []);
  assert.deepEqual(codes(`/*\n if (x === 'heberge') {}\n*/\nconst a = 1;`), []);
  assert.deepEqual(codes(`const u = 'http://a'; if (modeDeploiement === 1) {}`), ['1:branche_par_mode']);
  // Le numéro de ligne reste celui du texte d'origine après un commentaire sur plusieurs lignes.
  assert.deepEqual(codes(`/*\n\n*/\nif (modeDeploiement === 1) {}`), ['4:branche_par_mode']);
});

test('fichier-de-test-ignore', () => {
  const texte = `if (modeDeploiement === 'installation') {}`;
  assert.deepEqual(analyser(texte, 'packages/noyau/src/__tests__/x.test.ts'), []);
  assert.deepEqual(analyser(texte, 'apps/web/src/__tests__/x.ts'), []);
  assert.equal(concerne('packages/noyau/src/x.ts'), true);
  assert.equal(concerne('apps/web/src/x.tsx'), true);
  assert.equal(concerne('apps/serveur/src/x.mjs'), true);
  assert.equal(concerne('outils/gardes/x.mjs'), false);
  assert.equal(concerne('packages/noyau/src/x.json'), false);
  assert.equal(concerne('docs/x.ts'), false);
  assert.equal(concerne('packages/noyau/node_modules/a/x.ts'), false);
  // Exception unique : le fichier de lecture du réglage.
  assert.equal(typeof FICHIER_REGLAGE, 'string');
  assert.deepEqual(analyser(texte, FICHIER_REGLAGE), []);
  assert.deepEqual(analyser(texte, FICHIER_REGLAGE + '.autre.ts').length, 1);
});

test('depot-actuel-vert', () => {
  const problemes = analyserDepot();
  assert.deepEqual(problemes, []);
  // Le parcours voit bien les fichiers (faux dépôt) et ne se tait pas si git échoue.
  const faux = analyserDepot(() => 'apps/web/src/a.ts\0docs/b.ts\0packages/x/src/c.ts\0', (f) => (f.startsWith('apps') ? 'if (modeDeploiement == 1) {}' : 'const a = 1;'));
  assert.deepEqual(faux, [{ chemin: 'apps/web/src/a.ts', ligne: 1, code: 'branche_par_mode' }]);
  assert.equal(analyserDepot(() => null).length, 1);
});
