// garde:performance (V3-UX-050) : tableau unique des budgets de performance, docs/budgets-performance.csv.
// Rouge si une ligne est mal formée, si un couple écran + métrique a deux seuils, ou si outils/banc/*.mjs
// contient un seuil numérique en dur. Les seuils sont PROPOSÉS, à confirmer. CSV simple, sans guillemets.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ENTETE = 'ecran,metrique,seuil,unite';
const UNITES = ['ms', 's', 'ko', 'mo', 'pct'];
const NOM = /^[a-z0-9][a-z0-9-]*$/;
// Un identifiant « seuil… » suivi de « = » ou « : » puis d'un nombre.
const SEUIL_EN_DUR = /\bseuil\w*\s*[:=]\s*-?\d/i;

export function lireTableau(texte) {
  if (typeof texte !== 'string') throw new Error('tableau absent');
  const lignes = texte.split(/\r?\n/);
  if (lignes[lignes.length - 1] === '') lignes.pop();
  if (lignes[0] !== ENTETE) throw new Error(`en-tête invalide (attendu : ${ENTETE})`);
  const vus = new Set();
  return lignes.slice(1).map((l, k) => {
    const n = k + 2;
    if (l.includes('"')) throw new Error(`ligne ${n} : guillemet refusé`);
    const c = l.split(',');
    if (c.length !== 4) throw new Error(`ligne ${n} : ${c.length} colonnes au lieu de 4`);
    const [ecran, metrique, seuil, unite] = c;
    if (!NOM.test(ecran)) throw new Error(`ligne ${n} : ecran invalide`);
    if (!NOM.test(metrique)) throw new Error(`ligne ${n} : metrique invalide`);
    if (!/^\d+(\.\d+)?$/.test(seuil) || Number(seuil) <= 0 || !Number.isFinite(Number(seuil))) throw new Error(`ligne ${n} : seuil invalide « ${seuil} »`);
    if (!UNITES.includes(unite)) throw new Error(`ligne ${n} : unite invalide « ${unite} »`);
    const cle = `${ecran}/${metrique}`;
    if (vus.has(cle)) throw new Error(`ligne ${n} : seuil en double pour « ${cle} »`);
    vus.add(cle);
    return { ecran, metrique, seuil: Number(seuil), unite };
  });
}

/** `fichiersBanc` : [{ chemin, texte }]. Renvoie la liste des erreurs. */
export function analyser(lignes, fichiersBanc) {
  const erreurs = [];
  if (!lignes.some((l) => l.ecran === 'banc-volume' && l.metrique === 'p95')) erreurs.push('banc-volume/p95 absent du tableau (lu par outils/banc/volume.mjs)');
  for (const { chemin, texte } of fichiersBanc) {
    texte.split(/\r?\n/).forEach((l, i) => {
      if (SEUIL_EN_DUR.test(l)) erreurs.push(`${chemin}:${i + 1} : seuil numérique en dur (le lire dans docs/budgets-performance.csv)`);
    });
  }
  return erreurs;
}

export function main(racine = '.') {
  const chemin = `${racine}/docs/budgets-performance.csv`;
  const erreurs = [];
  let lignes = [];
  try {
    lignes = lireTableau(existsSync(chemin) ? readFileSync(chemin, 'utf8') : undefined);
  } catch (e) {
    erreurs.push(e.message);
  }
  const dossier = `${racine}/outils/banc`;
  const fichiers = existsSync(dossier)
    ? readdirSync(dossier, { recursive: true }).map((f) => String(f).replaceAll('\\', '/')).filter((f) => f.endsWith('.mjs')).map((f) => ({ chemin: `outils/banc/${f}`, texte: readFileSync(`${dossier}/${f}`, 'utf8') }))
    : [];
  erreurs.push(...analyser(lignes, fichiers));
  return erreurs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const erreurs = main();
  if (erreurs.length) {
    for (const e of erreurs) console.error(`garde:performance ROUGE : ${e}`);
    process.exit(1);
  }
  console.log('garde:performance vert');
}
