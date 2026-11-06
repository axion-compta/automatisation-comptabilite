import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyserWorkflow, analyserCodeowners, ECRITURE_PAR_WORKFLOW, ecriturePermise } from '../ci.mjs';

const SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1';
const vert = `name: Essai
on:
  pull_request:
permissions:
  contents: read
jobs:
  a:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@${SHA} # v7
        with:
          persist-credentials: false
      - env:
          TITRE: \${{ github.event.pull_request.title }}
        run: echo "$TITRE"
`;

test('cas vert : workflow sûr', () => {
  assert.deepEqual(analyserWorkflow(vert, 'essai.yml'), []);
});

test('rouge : uses: x@v1', () => {
  const pb = analyserWorkflow(vert.replace(`actions/checkout@${SHA}`, 'actions/checkout@v1'), 'essai.yml');
  assert.ok(pb.some((p) => p.includes('non épinglée')));
});

test('rouge : pull_request_target', () => {
  const pb = analyserWorkflow(vert.replace('pull_request:', 'pull_request_target:'), 'essai.yml');
  assert.ok(pb.some((p) => p.includes('pull_request_target')));
});

test('rouge : ${{ }} dans un run', () => {
  const pb = analyserWorkflow(vert.replace('run: echo "$TITRE"', 'run: echo "${{ github.event.pull_request.title }}"'), 'essai.yml');
  assert.ok(pb.some((p) => p.includes('run:')));
  const bloc = vert.replace('run: echo "$TITRE"', 'run: |\n          echo "${{ github.head_ref }}"');
  assert.ok(analyserWorkflow(bloc, 'essai.yml').some((p) => p.includes('run:')));
});

test('rouge : contournement par # dans un run', () => {
  const pb = analyserWorkflow(vert.replace('run: echo "$TITRE"', 'run: echo " #${{ github.head_ref }}"'), 'essai.yml');
  assert.ok(pb.some((p) => p.includes('run:')));
});

test('rouge : permissions absentes, écriture, timeout manquant ou trop long, persist-credentials', () => {
  assert.ok(analyserWorkflow(vert.replace(/permissions:\n {2}contents: read\n/, ''), 'e.yml').some((p) => p.includes('permissions')));
  assert.ok(analyserWorkflow(vert.replace('contents: read', 'contents: write'), 'e.yml').some((p) => p.includes('écriture')));
  assert.ok(analyserWorkflow(vert.replace('    timeout-minutes: 10\n', ''), 'e.yml').some((p) => p.includes('timeout')));
  assert.ok(analyserWorkflow(vert.replace('timeout-minutes: 10', 'timeout-minutes: 30'), 'e.yml').some((p) => p.includes('timeout')));
  assert.ok(analyserWorkflow(vert.replace('persist-credentials: false', 'fetch-depth: 0'), 'e.yml').some((p) => p.includes('persist-credentials')));
});

test('id-token: write reste permis (signature sans clé)', () => {
  const pb = analyserWorkflow(vert.replace('contents: read', 'contents: read\n  id-token: write'), 'e.yml');
  assert.deepEqual(pb, []);
});

test('le ci.yml du dépôt est vert', () => {
  const texte = readFileSync(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.deepEqual(analyserWorkflow(texte, 'ci.yml'), []);
});

test('ci.yml sans tâche verifier est rouge', () => {
  const sans = readFileSync(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8').replace('name: verifier', 'name: autre');
  assert.ok(analyserWorkflow(sans, 'ci.yml').some((p) => p.includes('verifier')));
});

test('CODEOWNERS : complet vert, incomplet rouge', () => {
  const texte = readFileSync(new URL('../../../.github/CODEOWNERS', import.meta.url), 'utf8');
  assert.deepEqual(analyserCodeowners(texte), []);
  assert.ok(analyserCodeowners(texte.replace('/.npmrc @will383842', '')).length > 0);
});

// Écriture au niveau d'une tâche (hors niveau global).
const WF = '.github/workflows/';
const avecTache = (...droits) => vert.replace('  a:\n', `  a:\n    permissions:\n${droits.map((d) => `      ${d}: write\n`).join('')}`);
const ecritures = (texte, nom) => analyserWorkflow(texte, nom).filter((p) => p.includes('écriture'));

test('portier-contents-write-vert', () => {
  assert.deepEqual(analyserWorkflow(avecTache('contents', 'pull-requests'), `${WF}portier.yml`), []);
  assert.deepEqual(analyserWorkflow(avecTache('contents'), 'portier.yml'), []);
});

test('contents-write-dans-ci-rouge', () => {
  assert.ok(ecritures(avecTache('contents'), `${WF}ci.yml`).length > 0);
  assert.ok(ecritures(avecTache('contents'), 'ci.yml').length > 0);
});

test('contents-write-dans-version-rouge', () => {
  assert.ok(ecritures(avecTache('contents'), `${WF}version.yml`).length > 0);
  assert.deepEqual(analyserWorkflow(avecTache('id-token'), `${WF}version.yml`), []);
});

test('portier-packages-write-rouge', () => {
  assert.ok(ecritures(avecTache('packages'), `${WF}portier.yml`).length > 0);
  assert.ok(ecritures(avecTache('contents', 'issues'), `${WF}portier.yml`).length > 0);
});

test('ecriture-globale-rouge-partout', () => {
  for (const nom of ['portier.yml', 'alerte-fusion.yml', 'version.yml', 'ci.yml', 'autre.yml']) {
    for (const droit of ['contents', 'pull-requests', 'issues']) {
      const global = vert.replace('contents: read', `contents: read\n  ${droit}: write`);
      assert.ok(analyserWorkflow(global, `${WF}${nom}`).some((p) => p.includes('écriture')), `${nom} ${droit}`);
    }
  }
  const enLigne = vert.replace(/permissions:\n {2}contents: read/, 'permissions: { contents: write }');
  assert.ok(ecritures(enLigne, `${WF}portier.yml`).length > 0);
});

test('alerte-fusion-issues-seulement', () => {
  assert.deepEqual(analyserWorkflow(avecTache('issues'), `${WF}alerte-fusion.yml`), []);
  assert.ok(ecritures(avecTache('contents'), `${WF}alerte-fusion.yml`).length > 0);
  assert.ok(ecritures(avecTache('pull-requests'), `${WF}alerte-fusion.yml`).length > 0);
  assert.ok(ecritures(avecTache('issues'), `${WF}portier.yml`).length > 0);
});

test('workflow-inconnu-id-token-seulement', () => {
  for (const nom of [`${WF}inconnu.yml`, `${WF}Portier.yml`, `${WF}sous/portier.yml`, 'portier.yml.bak']) {
    assert.ok(ecritures(avecTache('contents'), nom).length > 0, nom);
  }
  assert.deepEqual(analyserWorkflow(avecTache('id-token'), `${WF}inconnu.yml`), []);
});

test('write-all-refuse', () => {
  for (const nom of ['portier.yml', 'alerte-fusion.yml', 'version.yml', 'ci.yml']) {
    const global = vert.replace(/permissions:\n {2}contents: read/, 'permissions: write-all');
    assert.ok(analyserWorkflow(global, `${WF}${nom}`).some((p) => p.includes('write-all')), nom);
    const tache = vert.replace('  a:\n', '  a:\n    permissions: write-all\n');
    assert.ok(analyserWorkflow(tache, `${WF}${nom}`).some((p) => p.includes('write-all')), nom);
  }
});

test('table par workflow : chemins exacts, ni ajout ni élargissement', () => {
  assert.deepEqual([...ECRITURE_PAR_WORKFLOW.keys()].sort(), [`${WF}alerte-fusion.yml`, `${WF}portier.yml`, `${WF}version.yml`]);
  assert.deepEqual([...ecriturePermise('portier.yml')].sort(), ['contents', 'pull-requests']);
  assert.deepEqual([...ecriturePermise('alerte-fusion.yml')], ['issues']);
  assert.deepEqual([...ecriturePermise('zzz.yml')], ['id-token']);
});

// Formes tordues du bloc permissions.
const globalPerm = (corps) => vert.replace(/permissions:\n {2}contents: read/, corps);
const tachePerm = (corps) => vert.replace('  a:\n', `  a:\n${corps}\n`);

test('global-ancre-ouvre-le-bloc-rouge', () => {
  const t = globalPerm('permissions: &p\n  contents: read\n  issues: write');
  assert.ok(ecritures(t, `${WF}alerte-fusion.yml`).length > 0);
  assert.ok(analyserWorkflow(t, `${WF}alerte-fusion.yml`).some((p) => p.includes('ancre')));
});

test('global-accolade-multiligne-rouge', () => {
  const t = globalPerm('permissions: {\n  contents: write\n}');
  assert.ok(ecritures(t, `${WF}portier.yml`).length > 0);
  assert.ok(ecritures(globalPerm('permissions: &p {\n  issues: write\n}'), `${WF}alerte-fusion.yml`).length > 0);
});

test('global-ancre-en-ligne-rouge', () => {
  const t = globalPerm('permissions: &p { contents: write }');
  assert.ok(ecritures(t, `${WF}portier.yml`).length > 0);
  assert.ok(analyserWorkflow(t, `${WF}portier.yml`).some((p) => p.includes('ancre')));
});

test('valeur-entre-guillemets-tache-rouge', () => {
  assert.ok(ecritures(tachePerm('    permissions:\n      contents: "write"'), `${WF}ci.yml`).length > 0);
  assert.ok(ecritures(tachePerm("    permissions:\n      contents: 'write'"), `${WF}ci.yml`).length > 0);
});

test('valeur-entre-guillemets-en-ligne-rouge', () => {
  assert.ok(ecritures(globalPerm('permissions: { contents: "write" }'), `${WF}portier.yml`).length > 0);
  assert.ok(ecritures(tachePerm('    permissions: { contents: "write" }'), `${WF}ci.yml`).length > 0);
});

test('write-all-entre-guillemets-rouge', () => {
  for (const q of ['"', "'"]) {
    assert.ok(analyserWorkflow(globalPerm(`permissions: ${q}write-all${q}`), `${WF}portier.yml`).some((p) => p.includes('write-all')));
    assert.ok(analyserWorkflow(tachePerm(`    permissions: ${q}write-all${q}`), `${WF}portier.yml`).some((p) => p.includes('write-all')));
  }
});

test('ancre-alias-fusion-refuses-dans-permissions', () => {
  for (const corps of ['    permissions: &p\n      contents: read', '    permissions: *p', '    permissions:\n      <<: *p']) {
    assert.ok(analyserWorkflow(tachePerm(corps), `${WF}ci.yml`).some((p) => p.includes('ancre')), corps);
  }
  assert.ok(analyserWorkflow(globalPerm('permissions:\n  <<: *p\n  contents: read'), `${WF}ci.yml`).some((p) => p.includes('ancre')));
});
