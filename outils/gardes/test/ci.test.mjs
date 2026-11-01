import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyserWorkflow, analyserCodeowners } from '../ci.mjs';

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
