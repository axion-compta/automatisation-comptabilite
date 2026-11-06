import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyser, analyserDepot } from '../litteraux.mjs';

const f = (texte, chemin = 'packages/noyau/src/metier.ts') => [{ chemin, texte }];
// Les exemples sont inventés et assemblés ici pour ne pas figurer en clair dans le dépôt.
const nombre = ['4', '2'].join('');
const date = ['2031', '04', '09'].join('-');

test('date-litterale-refusee', () => {
  const pb = analyser(f(`const d = '${date}';`));
  assert.equal(pb.length, 1);
  assert.match(pb[0], /metier\.ts:1 date littérale/);
  assert.deepEqual(analyser(f("const d = 'demain';")), []);
});

test('taux-litteral-refuse', () => {
  const pb = analyser(f(`const tauxNormal = ${nombre};`));
  assert.equal(pb.length, 1);
  assert.match(pb[0], /littéral numérique/);
  assert.deepEqual(analyser(f('const tauxNormal = 0;\nconst total = 7;')), []);
  assert.deepEqual(analyser(f('const tauxZero = 1;')), []);
});

test('seuil-compare-refuse', () => {
  assert.equal(analyser(f(`if (montant > seuilDeclaration + ${nombre}) return;`)).length, 1);
  assert.equal(analyser(f(`const delaiMois = ${nombre}; // seuil`)).length, 1);
  assert.deepEqual(analyser(f(`if (montant > limite) return nb(${nombre});`)), []);
});

test('pourcentage-en-chaine-refuse', () => {
  const pb = analyser(f(`const t = "${nombre} %";`));
  assert.equal(pb.length, 1);
  assert.match(pb[0], /%/);
  assert.deepEqual(analyser(f('const t = `${x}%`; const u = "100"; // 5%')), []);
});

test('fichier-de-test-ignore', () => {
  const rouge = `const tauxNormal = ${nombre}; const d = '${date}';`;
  assert.deepEqual(analyser(f(rouge, 'packages/noyau/src/__tests__/a.ts')), []);
  assert.deepEqual(analyser(f(rouge, 'apps/serveur/src/a.test.ts')), []);
  assert.deepEqual(analyser(f(rouge, 'packages/parametres/src/a.ts')), []);
  assert.deepEqual(analyser(f(rouge, 'apps/web/src/a.ts')), []);
  assert.ok(analyser(f(rouge, 'apps/serveur/src/a.ts')).length >= 1);
});

test('exception-avec-raison-acceptee', () => {
  const texte = `const tauxNormal = ${nombre};`;
  const exc = [{ fichier: 'packages/noyau/src/metier.ts', motif: 'tauxNormal', raison: 'valeur inventée pour un essai' }];
  assert.deepEqual(analyser(f(texte), exc), []);
  const contenu = { '/r/outils/gardes/litteraux-exceptions.json': JSON.stringify(exc), '/r/packages/noyau/src/metier.ts': texte };
  const git = (a) => (a[0] === 'rev-parse' ? '/r\n' : 'packages/noyau/src/metier.ts\0');
  assert.deepEqual(analyserDepot(git, (p) => contenu[p]), []);
});

test('exception-sans-raison-refusee', () => {
  const texte = `const tauxNormal = ${nombre};`;
  for (const raison of [undefined, '', '   ']) {
    const pb = analyser(f(texte), [{ fichier: 'packages/noyau/src/metier.ts', motif: 'tauxNormal', raison }]);
    assert.ok(pb.some((p) => /sans raison/.test(p)));
    assert.ok(pb.some((p) => /littéral numérique/.test(p)));
  }
});

test('depot-reel-vert', () => {
  assert.deepEqual(analyserDepot(), []);
});
