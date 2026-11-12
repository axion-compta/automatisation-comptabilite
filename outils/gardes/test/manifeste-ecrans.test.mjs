import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserManifeste, lireDossiersEcrans, CHEMIN_MANIFESTE, CHEMIN_OUTILS, CHEMIN_ECRANS } from '../manifeste-ecrans.mjs';
import { readFileSync } from 'node:fs';

const lire = (c) => JSON.parse(readFileSync(c, 'utf8'));
const reel = () => ({ manifeste: lire(CHEMIN_MANIFESTE), ecrans: lireDossiersEcrans(CHEMIN_ECRANS), outils: lire(CHEMIN_OUTILS).map((o) => o.nom) });
const verifier = (m) => analyserManifeste(m.manifeste, m.ecrans, m.outils);
const rouge = (mod, texte) => {
  const m = reel();
  mod(m);
  const pb = verifier(m);
  assert.ok(pb.some((p) => p.includes(texte)), `${texte} : ${pb.join(' | ')}`);
};

test('manifeste-complet-vert', () => {
  const m = reel();
  assert.ok(m.ecrans.length > 0 && m.manifeste.length === m.ecrans.length);
  assert.deepEqual(verifier(m), []);
});

test('ecran-sans-ligne-rouge', () => {
  rouge((m) => { m.manifeste.pop(); }, 'écran sans ligne');
  rouge((m) => { m.ecrans.push('e99'); }, 'écran sans ligne : e99');
});

test('ligne-sans-ecran-rouge', () => {
  rouge((m) => { m.manifeste.push({ ...m.manifeste[0], ecran: 'e98' }); }, 'ligne sans écran : e98');
  rouge((m) => { m.manifeste.push({ ...m.manifeste[0] }); }, 'ligne en double');
});

test('outil-inconnu-rouge', () => {
  rouge((m) => { m.manifeste[0].outil_chat = 'outil.fantome'; }, 'outil inconnu');
  rouge((m) => { delete m.manifeste[0].outil_chat; }, 'outil_chat manquant');
  rouge((m) => { m.manifeste[0].outil_chat = '  '; }, 'outil_chat manquant');
  rouge((m) => { delete m.manifeste[0].route; }, 'route manquante');
  rouge((m) => { m.manifeste[0].route = 'mois'; }, 'route sans /');
});

test('jeu-propre-rouge', () => {
  for (const jeu of ['propre', '', undefined, 'Commun']) rouge((m) => { m.manifeste[0].jeu = jeu; }, 'jeu différent de commun');
});

test('entrees-illisibles-rouges', () => {
  assert.ok(analyserManifeste(null, [], []).length > 0);
  assert.ok(analyserManifeste([], ['e01'], ['vue.ouvrir']).some((p) => p.includes('écran sans ligne')));
  assert.ok(analyserManifeste([{ ecran: 'e01', route: '/a', outil_chat: 'vue.ouvrir', jeu: 'commun' }], ['e01'], []).length > 0);
});
