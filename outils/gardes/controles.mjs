// garde:controles (V3-CTL-001, V3-CTL-070) : rouge si docs/controles.csv est absent, mal formé, ou si un test_id n'a pas de test.
// Titres de tests : premier argument chaîne de it( ou test( dans packages/noyau/src/controles/**/__tests__/*.test.ts suivis par git.
// Un catalogue réduit à son en-tête est vert. Limite : CSV simple (guillemets doubles gérés, pas de retour à la ligne dans un champ).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ENTETE = 'id,exigence,gravite,bloque,declencheurs,phase,test_id,parametres,actif';
const GRAVITES = ['B', 'M', 'm', 'I'];
const BLOQUE = ['validation_mois', 'preparation_tva', 'export_officiel', 'cloture', 'aucun'];
const DECLENCHEURS = ['arrivee', 'continu', 'nocturne', 'avant_tva', 'avant_export', 'avant_cloture', 'demande'];
const ACTIF = ['oui', 'non'];

function champs(ligne) {
  const out = [];
  let cur = '';
  let guil = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (guil) {
      if (c === '"' && ligne[i + 1] === '"') cur += ligne[i++];
      else if (c === '"') guil = false;
      else cur += c;
    } else if (c === '"') guil = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

// Titres des tests réellement exécutés : commentaires retirés, it.skip / it.todo / skipIf / runIf ignorés.
export function titresDeTests(texte) {
  const code = texte.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  const titres = [];
  for (const r of code.matchAll(/(?<![\w.$])(?:it|test)((?:\s*\.\s*\w+)*)\s*\(\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2/g)) {
    if (/\b(?:skip|todo|skipIf|runIf)\b/.test(r[1])) continue;
    titres.push(r[3]);
  }
  return titres;
}

// Chemins (sortie de git ls-files) des fichiers de tests du noyau qui comptent.
export function fichiersDeTests(chemins) {
  return chemins.filter((f) => /^packages\/noyau\/src\/controles\/(?:.*\/)?__tests__\/[^/]*\.test\.ts$/.test(f));
}

function couvert(testId, titres) {
  if (testId === '') return false;
  const re = new RegExp('(?<![\\w-])' + testId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])');
  return titres.some((t) => re.test(t));
}

// csv : texte du catalogue, ou null s'il est absent. Retourne la liste des problèmes.
export function analyser(csv, titres) {
  if (csv === null || csv === undefined) return ['docs/controles.csv absent'];
  const lignes = csv.split(/\r?\n/);
  if (lignes[lignes.length - 1] === '') lignes.pop();
  if (lignes[0].charCodeAt(0) === 0xfeff) lignes[0] = lignes[0].slice(1);
  if (lignes[0] !== ENTETE) return [`docs/controles.csv en-tête invalide (attendu : ${ENTETE})`];
  const pb = [];
  const vus = new Set();
  const cols = ENTETE.split(',');
  lignes.slice(1).forEach((l, k) => {
    const n = k + 2;
    const c = champs(l);
    if (c.length !== cols.length) {
      pb.push(`ligne ${n} : ${c.length} colonnes au lieu de ${cols.length}`);
      return;
    }
    const v = Object.fromEntries(cols.map((nom, i) => [nom, c[i]]));
    if (v.id === '') pb.push(`ligne ${n} : id vide`);
    if (vus.has(v.id)) pb.push(`ligne ${n} : id en double « ${v.id} »`);
    vus.add(v.id);
    if (!GRAVITES.includes(v.gravite)) pb.push(`ligne ${n} : gravite inconnue « ${v.gravite} »`);
    const bloques = v.bloque.split('|');
    for (const b of bloques) if (!BLOQUE.includes(b)) pb.push(`ligne ${n} : bloque inconnu « ${b} »`);
    if (bloques.includes('aucun') && bloques.length > 1) pb.push(`ligne ${n} : bloque « aucun » combiné à une autre valeur`);
    for (const d of v.declencheurs.split('|')) if (!DECLENCHEURS.includes(d)) pb.push(`ligne ${n} : declencheurs inconnu « ${d} »`);
    if (!couvert(v.test_id, titres)) pb.push(`ligne ${n} : test_id « ${v.test_id} » sans test`);
    if (!ACTIF.includes(v.actif)) pb.push(`ligne ${n} : actif inconnu « ${v.actif} »`);
  });
  return pb;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const r = spawnSync('git', ['ls-files', '-z', 'packages/noyau/src/controles'], { encoding: 'utf8', maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error('git ls-files impossible');
    const fichiers = fichiersDeTests(r.stdout.split('\0'));
    const titres = fichiers.flatMap((f) => titresDeTests(readFileSync(f, 'utf8')));
    const pb = analyser(existsSync('docs/controles.csv') ? readFileSync('docs/controles.csv', 'utf8') : null, titres);
    if (pb.length > 0) {
      console.error('garde:controles ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
      process.exit(1);
    }
    console.log(`garde:controles vert (${fichiers.length} fichier(s) de test)`);
  } catch (e) {
    console.error('garde:controles ROUGE\n - ' + e.message);
    process.exit(1);
  }
}
