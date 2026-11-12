// Rapport du temps humain par carte (V3-QUA-007) : médiane et 90e centile des factures simples face à des seuils
// passés en argument (réglages, pas des constantes). Jamais bloquant : code de sortie 0 sauf usage ou fichier mal formé.
// Usage : node outils/banc/temps-humain.mjs mesures.json --seuil-mediane-ms=N --seuil-p90-ms=N
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { centile, mediane } from './evaluateur.mjs';

/** Lit une liste de mesures { duree_ms, factureSimple } ; lève une erreur si le texte est mal formé. */
export function lireMesures(texte) {
  const liste = JSON.parse(texte);
  if (!Array.isArray(liste)) throw new Error('mesures_non_liste');
  for (const x of liste) {
    if (typeof x !== 'object' || x === null || !Number.isSafeInteger(x.duree_ms) || x.duree_ms < 0 || typeof x.factureSimple !== 'boolean') {
      throw new Error('mesure_invalide');
    }
  }
  return liste;
}

const vs = (valeur, seuil) => (valeur > seuil ? 'au-dessus' : 'au-dessous');

export function rapporter(mesures, seuils) {
  const durees = mesures.filter((x) => x.factureSimple === true).map((x) => x.duree_ms);
  if (durees.length === 0) return { n: 0 };
  const med = mediane(durees);
  const p90 = centile(durees, 90);
  return { n: durees.length, mediane: med, p90, medianeVsSeuil: vs(med, seuils.medianeMs), p90VsSeuil: vs(p90, seuils.p90Ms) };
}

const seuilDe = (args, nom) => {
  const brut = args.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
  const n = Number(brut);
  if (brut === undefined || brut === '' || !Number.isSafeInteger(n) || n < 0) throw new Error(`--${nom} requis (entier ≥ 0)`);
  return n;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const args = process.argv.slice(2);
    const fichier = args.find((a) => !a.startsWith('--'));
    if (!fichier) throw new Error('fichier de mesures requis');
    const seuils = { medianeMs: seuilDe(args, 'seuil-mediane-ms'), p90Ms: seuilDe(args, 'seuil-p90-ms') };
    const r = rapporter(lireMesures(readFileSync(fichier, 'utf8')), seuils);
    if (r.n === 0) console.log('temps humain : aucune facture simple mesurée');
    else {
      console.log(`temps humain : ${r.n} factures simples`);
      console.log(`médiane ${r.mediane} ms : ${r.medianeVsSeuil} du seuil ${seuils.medianeMs} ms`);
      console.log(`p90 ${r.p90} ms : ${r.p90VsSeuil} du seuil ${seuils.p90Ms} ms`);
    }
  } catch (e) {
    console.error('temps-humain : ' + (e instanceof Error ? e.message : String(e)));
    process.exit(2);
  }
}
