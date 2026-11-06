import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserDepot, analyserMotsInterdits, analyserTexte, estExclu, MOTS_INTERDITS } from '../textes.mjs';

test('vert : textes venus de packages/textes et dépôt réel', () => {
  assert.deepEqual(analyserTexte('<button>{fr.actions.valider}</button>', 'a.tsx'), []);
  assert.deepEqual(analyserTexte('<p aria-label={fr.etats.vide}>{n} {" "}</p>', 'a.tsx'), []);
  assert.deepEqual(analyserDepot(), []);
});

test('rouge : texte en dur entre balises', () => {
  const pb = analyserTexte('const a = <button>Valider</button>;', 'a.tsx');
  assert.equal(pb.length, 1);
  assert.match(pb[0], /a\.tsx:1 texte en dur « Valider »/);
});

test('rouge : texte en dur après une expression et sur une autre ligne', () => {
  assert.equal(analyserTexte('<p>{n} écritures</p>', 'a.tsx').length, 1);
  assert.match(analyserTexte('<p>\n  Bonjour\n</p>', 'a.tsx')[0], /a\.tsx:1 /);
});

test('rouge : chaîne littérale entre accolades et attribut en dur', () => {
  assert.equal(analyserTexte("<p>{'Chargement'}</p>", 'a.tsx').length, 1);
  assert.match(analyserTexte('<input placeholder="Rechercher" />', 'a.tsx')[0], /attribut en dur/);
});

test('vert : commentaires et génériques ne comptent pas', () => {
  assert.deepEqual(analyserTexte('// <p>Bonjour</p>\n/* <b>Salut</b> */', 'a.tsx'), []);
  assert.deepEqual(analyserTexte("const [a, b] = useState<Panne>(''); const c = useState<Foo>(1);", 'a.tsx'), []);
});

test('exclusions : écran de test, test, fichier généré', () => {
  assert.ok(estExclu('apps/web/src/Ecran.tsx'));
  assert.ok(estExclu('apps/web/src/commandes/Palette.tsx'));
  assert.ok(!estExclu('apps/web/src/commandes/Autre.tsx', '<p>Bonjour</p>'));
  assert.ok(estExclu('apps/web/src/__tests__/a.test.tsx'));
  assert.ok(estExclu('apps/web/src/G.tsx', '// @generated\n'));
  assert.ok(!estExclu('apps/web/src/Autre.tsx', '<p>Bonjour</p>'));
});

test('rouge : mot interdit dans les textes, vert sinon', () => {
  assert.equal(MOTS_INTERDITS.length, 5);
  for (const mot of MOTS_INTERDITS) {
    assert.equal(analyserMotsInterdits(`un texte ${mot} ici`, 'fr.ts').length, 1, mot);
  }
  assert.deepEqual(analyserMotsInterdits("enregistrer: 'Enregistrer'", 'fr.ts'), []);
});

test('dépôt simulé : texte en dur et mot interdit signalés', () => {
  const git = (args) => (args[0] === 'rev-parse' ? '/r\n' : 'apps/web/src/B.tsx\0packages/textes/src/fr.ts\0');
  const contenu = { '/r/apps/web/src/B.tsx': '<p>Bonjour</p>', '/r/packages/textes/src/fr.ts': `x: '${MOTS_INTERDITS[0]}'` };
  assert.equal(analyserDepot(git, (f) => contenu[f]).length, 2);
});

test('rouge : texte avec parenthèses, point-virgule ou égal ; fragment ; attributs ; majuscules', () => {
  for (const l of ['<p>Supprimer (définitif)</p>', '<p>Bonjour; au revoir</p>', '<p>Total : 3 = 1+2</p>', '<>Bonjour</>', "<input placeholder='Rechercher' />", '<p title="Aide">{x}</p>']) {
    assert.equal(analyserTexte(l, 'a.tsx').length, 1, l);
  }
  assert.deepEqual(analyserTexte("const a = useState<Panne>(''); return <p>{fr.a}</p>;", 'a.tsx'), []);
  assert.equal(analyserMotsInterdits(`UN TEXTE ${MOTS_INTERDITS[0].toUpperCase()}`, 'fr.ts').length, 1);
});

test('dépôt simulé : un fr.test.ts avec mot interdit reste vert', () => {
  const git = (args) => (args[0] === 'rev-parse' ? '/r\n' : 'packages/textes/src/fr.test.ts\0');
  assert.deepEqual(analyserDepot(git, () => MOTS_INTERDITS[0]), []);
});
