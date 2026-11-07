// garde:formats (V3-DEC-044) : catalogue docs/formats.csv des formats d'import et d'export.
// Convention : un format du code se déclare par `export const CODE_FORMAT = '<code>'` dans packages/*/src ou apps/*/src.
// Colonne controle : `prevu` (test pas encore écrit) ou `actif` (test d'aller-retour ou de validateur officiel obligatoire).
// Limite : CSV simple, sans guillemets ni espaces autour des valeurs. Les avertissements vont sur la sortie d'erreur (sortie 0).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ENTETE = 'code,sens,phase,exigence,test_id,niveau_test,ecran,outil_chat,controle';
const COLS = ENTETE.split(',');
const SENS = ['import', 'export'];
const CONTROLE = ['actif', 'prevu'];
const NIVEAUX = ['aller_retour', 'validateur_officiel', ''];

// Lit le texte du catalogue ; lève une Error au premier défaut de forme.
export function lireCatalogue(texte) {
  if (texte.charCodeAt(0) === 0xfeff) throw new Error('BOM en tête du catalogue (refusé)');
  const lignes = texte.split(/\r?\n/);
  if (lignes[lignes.length - 1] === '') lignes.pop();
  if (lignes.length === 0 || lignes[0] !== ENTETE) throw new Error(`en-tête invalide (attendu : ${ENTETE})`);
  const vus = new Set();
  return lignes.slice(1).map((l, k) => {
    const n = k + 2;
    if (l.includes('"')) throw new Error(`ligne ${n} : guillemet refusé`);
    const c = l.split(',');
    if (c.length !== COLS.length) throw new Error(`ligne ${n} : ${c.length} colonnes au lieu de ${COLS.length}`);
    if (c.some((v) => v !== v.trim())) throw new Error(`ligne ${n} : espace autour d'une valeur`);
    const v = Object.fromEntries(COLS.map((nom, i) => [nom, c[i]]));
    if (v.code === '') throw new Error(`ligne ${n} : code vide`);
    if (vus.has(v.code)) throw new Error(`ligne ${n} : code en double « ${v.code} »`);
    vus.add(v.code);
    if (!SENS.includes(v.sens)) throw new Error(`ligne ${n} : sens inconnu « ${v.sens} »`);
    if (!CONTROLE.includes(v.controle)) throw new Error(`ligne ${n} : controle inconnu « ${v.controle} »`);
    if (!NIVEAUX.includes(v.niveau_test)) throw new Error(`ligne ${n} : niveau_test inconnu « ${v.niveau_test} »`);
    return v;
  });
}

export function analyserCatalogue(lignes, testsConnus, codesDansLeCode) {
  const erreurs = [];
  const avertissements = [];
  for (const v of lignes) {
    const connu = v.test_id !== '' && testsConnus.has(v.test_id);
    if (v.controle === 'actif') {
      if (v.test_id === '') erreurs.push(`${v.code} : actif sans test_id`);
      else if (!connu) erreurs.push(`${v.code} : test_id « ${v.test_id} » inconnu`);
      if (v.niveau_test === '') erreurs.push(`${v.code} : actif avec niveau_test vide`);
    } else if (connu) {
      erreurs.push(`${v.code} : le test « ${v.test_id} » existe, passer à actif`);
    }
    if (v.ecran === '') avertissements.push(`${v.code} : ecran vide`);
    if (v.outil_chat === '') avertissements.push(`${v.code} : outil_chat vide`);
  }
  const codes = new Set(lignes.map((v) => v.code));
  for (const c of codesDansLeCode) if (!codes.has(c)) erreurs.push(`${c} : format du code sans ligne au catalogue`);
  return { erreurs, avertissements };
}

function gitGrep(args) {
  const r = spawnSync('git', ['grep', '-h', '-o', '-E', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0 && r.status !== 1) throw new Error('git grep impossible');
  return r.stdout.split('\n').filter((x) => x !== '');
}

export function testsDuDepot() {
  const lignes = gitGrep(["(^|[^A-Za-z0-9_.$])(it|test)\\(\\s*['\"`][^'\"`]+['\"`]", '--', '*.test.*']);
  return new Set(lignes.map((l) => l.replace(/^.*?\(\s*['"`]/, '').replace(/['"`]$/, '')));
}

export function codesDuDepot() {
  const lignes = gitGrep(["export const CODE_FORMAT = ['\"][^'\"]+['\"]", '--', 'packages/*/src', 'apps/*/src']);
  return new Set(lignes.map((l) => l.replace(/^.*?= ['"]/, '').replace(/['"]$/, '')));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const lignes = lireCatalogue(readFileSync('docs/formats.csv', 'utf8'));
    const r = analyserCatalogue(lignes, testsDuDepot(), codesDuDepot());
    for (const a of r.avertissements) console.error('garde:formats avertissement : ' + a);
    if (r.erreurs.length > 0) {
      console.error('garde:formats ROUGE\n' + r.erreurs.map((e) => ' - ' + e).join('\n'));
      process.exit(1);
    }
    console.log(`garde:formats vert (${lignes.length} format(s))`);
  } catch (e) {
    console.error('garde:formats ROUGE\n - ' + e.message);
    process.exit(1);
  }
}
