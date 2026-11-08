import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { CHEMINS_BACK_END, VALIDEURS, ecransDeLaFiche, evaluer, validerPorte } from '../portes.mjs';

const AUJ = '2026-11-08';
const porte = (o = {}) => JSON.stringify({ ecran: 'x01', date: '2026-11-05', valideur: 'Will', ...o });
const fiche = (id, autorises, dep = []) =>
  `---\nid: ${id}\ndepend_de: ${JSON.stringify(dep)}\nfichiers_autorises: ${JSON.stringify(autorises)}\n---\n`;

// fichiers : contenu de origin/main ; branche : contenu de HEAD (ne doit jamais être lu) ; diff : chemins modifiés.
function monde({ diff, fichiers = {}, branche = {} }) {
  const appels = [];
  const git = (args) => {
    appels.push(args.join(' '));
    if (args[0] === 'diff') return diff === null ? null : diff.join('\0');
    if (args[0] === 'ls-tree') return Object.keys(fichiers).filter((f) => f.startsWith('pilotage/fiches/')).join('\n') + '\n';
    if (args[0] === 'show') {
      const [ref, ...chemin] = args[1].split(':');
      const src = ref === 'origin/main' ? fichiers : branche;
      return src[chemin.join(':')] ?? null;
    }
    return null;
  };
  return { git, appels };
}
const pr = (m, extra = {}) =>
  evaluer({ git: m.git, env: { GITHUB_HEAD_REF: 'lot-13/L13-T99', ...extra }, aujourdhui: AUJ, portesDuDepot: () => null, ecranExiste: () => true });
const FICHE_BACK = fiche('L13-T99', ['apps/serveur/src/a.ts', 'apps/web/src/ecrans/x01/Ecran.tsx']);

test('pri-16-01-backend-sans-porte-rouge', () => {
  const r = pr(monde({ diff: ['apps/serveur/src/a.ts'], fichiers: { 'pilotage/fiches/L13-T99.md': FICHE_BACK } }));
  assert.equal(r.pb.length, 1);
  assert.match(r.pb[0], /x01.*sans porte/);
});

test('pri-16-01-backend-avec-porte-vert', () => {
  const m = monde({ diff: ['apps/serveur/src/a.ts'], fichiers: { 'pilotage/fiches/L13-T99.md': FICHE_BACK, 'pilotage/portes/x01.json': porte() } });
  assert.deepEqual(pr(m).pb, []);
});

test('chaque chemin back-end déclenche le contrôle', () => {
  assert.deepEqual(CHEMINS_BACK_END, ['apps/serveur/', 'packages/contrat/', 'packages/faux-serveur/']);
  for (const c of CHEMINS_BACK_END) {
    const m = monde({ diff: [`${c}f.ts`], fichiers: { 'pilotage/fiches/L13-T99.md': FICHE_BACK } });
    assert.equal(pr(m).pb.length, 1, c);
  }
});

test('ecran-par-dependance-rouge', () => {
  const fichiers = {
    'pilotage/fiches/L13-T99.md': fiche('L13-T99', ['apps/serveur/src/a.ts']),
    'pilotage/fiches/L13-T98.md': fiche('L13-T98', ['apps/web/src/ecrans/x02/Ecran.tsx'], ['L13-T99']),
  };
  const r = pr(monde({ diff: ['apps/serveur/src/a.ts'], fichiers }));
  assert.equal(r.pb.length, 1);
  assert.match(r.pb[0], /x02/);
});

test('ecransDeLaFiche : propre, dépendants, doublons, faux écrans', () => {
  const fiches = [
    { id: 'A', fichiers_autorises: ['apps/web/src/ecrans/x01/E.tsx', 'apps/web/src/ecrans/x01/R.tsx', 'apps/web/src/ecrans/', 'apps/web/src/ecrans/y.ts'] },
    { id: 'B', depend_de: ['A'], fichiers_autorises: ['apps/web/src/ecrans/x02/E.tsx'] },
    { id: 'C', depend_de: ['Z'], fichiers_autorises: ['apps/web/src/ecrans/x03/E.tsx'] },
    { id: 'D', depend_de: ['A'] },
  ];
  assert.deepEqual(ecransDeLaFiche('A', fiches), ['x01', 'x02']);
  assert.deepEqual(ecransDeLaFiche('Z', fiches), ['x03']);
  assert.deepEqual(ecransDeLaFiche('Q', fiches), []);
});

test('diff-sans-backend-vert', () => {
  const m = monde({ diff: ['apps/web/src/ecrans/x01/Ecran.tsx', 'pilotage/journal/L13-T99.md'], fichiers: { 'pilotage/fiches/L13-T99.md': FICHE_BACK } });
  assert.deepEqual(pr(m).pb, []);
});

test('diff impossible ou fiche absente : rouge', () => {
  assert.equal(pr(monde({ diff: null })).pb.length, 1);
  assert.match(pr(monde({ diff: ['apps/serveur/a.ts'] })).pb[0], /introuvable/);
});

test('porte-seulement-sur-la-branche-rouge', () => {
  const m = monde({
    diff: ['apps/serveur/src/a.ts', 'pilotage/portes/x01.json'],
    fichiers: { 'pilotage/fiches/L13-T99.md': FICHE_BACK },
    branche: { 'pilotage/portes/x01.json': porte() },
  });
  assert.equal(pr(m).pb.length, 1);
  assert.ok(m.appels.every((a) => !a.includes('HEAD:')));
});

const CAS = [
  ['JSON illisible', '{pas du json', /illisible/],
  ['tableau', '[]', /objet/],
  ['null', 'null', /objet/],
  ['date jj/mm/aaaa', porte({ date: '05/11/2026' }), /date/],
  ['date 30 février', porte({ date: '2026-02-30' }), /date/],
  ['date future', porte({ date: '2026-11-09' }), /futur/],
  ['date non textuelle', porte({ date: 20261105 }), /date/],
  ['valideur vide', porte({ valideur: '' }), /valideur/],
  ['valideur en espaces', porte({ valideur: '   ' }), /valideur/],
  ['valideur hors liste', porte({ valideur: 'Inconnu' }), /hors liste/],
  ['ecran différent', porte({ ecran: 'x77' }), /différent/],
  ['champ inconnu', porte({ extra: 1 }), /inconnu/],
  ['champ date absent', JSON.stringify({ ecran: 'x01', valideur: 'Will' }), /date.*absent/],
  ['champ valideur absent', JSON.stringify({ ecran: 'x01', date: '2026-11-05' }), /valideur.*absent/],
  ['champ ecran absent', JSON.stringify({ date: '2026-11-05', valideur: 'Will' }), /ecran.*absent/],
];
for (const [nom, texte, motif] of CAS) {
  test(`porte-invalide-rouge : ${nom}`, () => {
    const pb = validerPorte(texte, 'x01.json', AUJ);
    assert.ok(pb.length > 0);
    assert.match(pb.join('\n'), motif);
  });
}

test('porte valide : aujourd’hui, CRLF et BOM acceptés', () => {
  assert.deepEqual(validerPorte(porte({ date: AUJ }), 'x01.json', AUJ), []);
  assert.deepEqual(validerPorte(JSON.stringify(JSON.parse(porte()), null, 2).replace(/\n/g, '\r\n'), 'x01.json', AUJ), []);
  assert.deepEqual(validerPorte('﻿' + porte(), 'x01.json', AUJ), []);
  assert.deepEqual(validerPorte(porte({ date: '2028-02-29' }), 'x01.json', '2030-01-01'), []);
  assert.ok(validerPorte(porte({ date: '2027-02-29' }), 'x01.json', '2030-01-01').length > 0);
});

test('porte-sans-ecran-rouge', () => {
  const r = evaluer({
    git: () => null,
    env: {},
    aujourdhui: AUJ,
    portesDuDepot: () => [{ nom: 'x09.json', texte: porte({ ecran: 'x09' }) }],
    ecranExiste: () => false,
  });
  assert.equal(r.pb.length, 1);
  assert.match(r.pb[0], /aucun dossier apps\/web\/src\/ecrans\/x09\//);
});

test('dossier-portes-absent-vert et pas-de-branche-de-fiche-vert', () => {
  const base = { git: () => null, aujourdhui: AUJ, portesDuDepot: () => null, ecranExiste: () => false };
  assert.deepEqual(evaluer({ ...base, env: {} }).pb, []);
  assert.deepEqual(evaluer({ ...base, env: { GITHUB_HEAD_REF: 'dependabot/npm/x' } }).pb, []);
  assert.deepEqual(evaluer({ ...base, env: { GITHUB_HEAD_REF: 'lot-13/fiches-x' } }).pb, []);
});

test('portes-du-depot-valides', () => {
  const dossier = 'pilotage/portes';
  const noms = readdirSync(dossier).filter((n) => n.endsWith('.json'));
  const portes = noms.map((nom) => ({ nom, texte: readFileSync(`${dossier}/${nom}`, 'utf8') }));
  const r = evaluer({ git: () => null, env: {}, aujourdhui: AUJ, portesDuDepot: () => portes, ecranExiste: (c) => existsSync(`apps/web/src/ecrans/${c}`) });
  assert.deepEqual(r.pb, []);
  assert.ok(r.msg.includes(`${noms.length} porte(s)`));
  for (const e of ['e44', 'n03', 'n04']) assert.ok(noms.includes(`${e}.json`), e);
  assert.deepEqual(VALIDEURS, ['Will']);
});
