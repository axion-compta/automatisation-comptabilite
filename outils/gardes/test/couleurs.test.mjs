import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserDepot, analyserTexte, estExclu } from '../couleurs.mjs';

test('vert : variable de jeton et dépôt réel', () => {
  assert.deepEqual(analyserTexte('a { color: var(--couleur-texte); }', 'a.css'), []);
  assert.deepEqual(analyserDepot(), []);
});

test('rouge : couleur hexadécimale en dur (3, 6 et 8 chiffres)', () => {
  assert.equal(analyserTexte('a { color: #fff; }', 'a.css').length, 1);
  assert.match(analyserTexte('const c = "#1f1b16";', 'a.ts')[0], /a\.ts:1 couleur en dur #1f1b16/);
  assert.equal(analyserTexte('x { color: #11223344 }', 'a.css').length, 1);
});

test('rouge : rgb, hsl et oklch en dur', () => {
  assert.equal(analyserTexte('color: rgb(1, 2, 3)', 'a.css').length, 1);
  assert.equal(analyserTexte('color: hsla(0, 0%, 0%, 1)', 'a.css').length, 1);
  assert.equal(analyserTexte('color: oklch(50% 0.1 20)', 'a.css').length, 1);
});

test('vert : ancre, entité et identifiant qui ressemblent à un hexadécimal', () => {
  assert.deepEqual(analyserTexte('<a href="#section-un">x</a> &#x41; #racine', 'a.html'), []);
});

test('exclusions : jetons, fichier généré, test', () => {
  assert.ok(estExclu('packages/ui/src/jetons.ts'));
  assert.ok(estExclu('packages/ui/src/jetons.css'));
  assert.ok(estExclu('apps/web/src/b.css', '/* Fichier généré : ne pas modifier */\na{color:#fff}'));
  assert.ok(estExclu('apps/web/src/__tests__/a.test.ts'));
  assert.ok(!estExclu('apps/web/src/a.css', 'a{color:#fff}'));
});

test('dépôt simulé : rouge sur un fichier suivi, vert une fois exclu', () => {
  const git = (args) => (args[0] === 'rev-parse' ? '/r\n' : 'apps/web/src/a.css\0packages/ui/src/jetons.css\0');
  const contenu = { '/r/apps/web/src/a.css': 'a{color:#abc}', '/r/packages/ui/src/jetons.css': ':root{--c:#abc}' };
  const pb = analyserDepot(git, (f) => contenu[f]);
  assert.equal(pb.length, 1);
  assert.match(pb[0], /apps\/web\/src\/a\.css:1/);
});

test('rouge : noms CSS sur propriété de couleur, majuscules ; vert : jeton, transparent, #add-bouton', () => {
  for (const l of ['a { color: red; }', 'style={{color:"white"}}', 'x { background: 1px solid Black }', 'color: RGB(1,2,3)', 'fill: Hsl(0 0% 0%)']) {
    assert.equal(analyserTexte(l, 'a.css').length, 1, l);
  }
  for (const l of ['a { color: transparent; border-color: currentColor; background: var(--couleur-fond) }', 'a[href="#add-bouton"] {}']) {
    assert.deepEqual(analyserTexte(l, 'a.css'), [], l);
  }
});
