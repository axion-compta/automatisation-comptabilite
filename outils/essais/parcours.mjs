// Essais de parcours (V3-UX-086) : lit des rapports JSON d'essai menés hors du dépôt, calcule vert ou rouge.
// Aucune IA lancée ici. Usage : node outils/essais/parcours.mjs <rapport.json>... [--clore P1 [--correction AAAA-MM-JJ]]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ENTETE = 'parcours,ecran_depart,duree_max_s,gestes_max,pieges_min_pct';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dateValide = (d) => typeof d === 'string' && DATE.test(d) && new Date(d).toISOString().slice(0, 10) === d;
const nombre = (v) => typeof v === 'number' && Number.isFinite(v);

export function lireSeuils(texte) {
  const l = texte.split(/\r?\n/).filter((x, i, a) => x !== '' || i < a.length - 1);
  if (l[0] !== ENTETE) throw new Error(`en-tête invalide (attendu : ${ENTETE})`);
  const res = new Map();
  l.slice(1).forEach((ligne, k) => {
    const c = ligne.split(',');
    if (c.length !== 5 || c[0] === '') throw new Error(`ligne ${k + 2} : 5 colonnes attendues`);
    const [parcours, ecran, d, g, p] = c;
    for (const [nom, v] of [['duree_max_s', d], ['gestes_max', g], ['pieges_min_pct', p]]) {
      if (!/^\d+(\.\d+)?$/.test(v)) throw new Error(`ligne ${k + 2} : ${nom} invalide`);
    }
    if (res.has(parcours)) throw new Error(`ligne ${k + 2} : parcours en double « ${parcours} »`);
    res.set(parcours, { ecran, duree_max_s: Number(d), gestes_max: Number(g), pieges_min_pct: Number(p) });
  });
  return res;
}

export function lireRapport(texte) {
  let r;
  try { r = JSON.parse(texte); } catch { throw new Error('rapport mal formé (JSON)'); }
  if (r === null || typeof r !== 'object' || Array.isArray(r)) throw new Error('rapport mal formé (objet attendu)');
  if (typeof r.parcours !== 'string' || r.parcours === '') throw new Error('rapport mal formé : parcours');
  if (!dateValide(r.date)) throw new Error('rapport mal formé : date AAAA-MM-JJ');
  if (typeof r.version !== 'string' || r.version === '') throw new Error('rapport mal formé : version');
  const m = r.mesures;
  if (m === null || typeof m !== 'object') throw new Error('rapport mal formé : mesures');
  if (!nombre(m.duree_s) || m.duree_s < 0) throw new Error('rapport mal formé : duree_s');
  if (!Number.isInteger(m.gestes) || m.gestes < 0) throw new Error('rapport mal formé : gestes');
  if (!nombre(m.pieges_pct) || m.pieges_pct < 0 || m.pieges_pct > 100) throw new Error('rapport mal formé : pieges_pct');
  return r;
}

export function evaluer(rapport, seuils) {
  const s = seuils.get(rapport.parcours);
  if (!s) throw new Error(`parcours inconnu « ${rapport.parcours} »`);
  const m = rapport.mesures;
  const raisons = [];
  if (m.duree_s > s.duree_max_s) raisons.push(`duree ${m.duree_s} > ${s.duree_max_s}`);
  if (m.gestes > s.gestes_max) raisons.push(`gestes ${m.gestes} > ${s.gestes_max}`);
  if (m.pieges_pct < s.pieges_min_pct) raisons.push(`pieges ${m.pieges_pct} < ${s.pieges_min_pct}`);
  return { parcours: rapport.parcours, date: rapport.date, etat: raisons.length ? 'rouge' : 'vert', raisons };
}

// Clôture : le dernier essai doit être vert, plus récent que tout rouge (et que la correction si donnée).
export function cloturer(parcours, rapports, seuils, { correction } = {}) {
  if (!seuils.has(parcours)) throw new Error(`parcours inconnu « ${parcours} »`);
  const essais = rapports.filter((r) => r.parcours === parcours).map((r) => evaluer(r, seuils));
  if (essais.length === 0) throw new Error(`${parcours} : aucun essai`);
  const dernierRouge = essais.filter((e) => e.etat === 'rouge').map((e) => e.date).sort().at(-1);
  const verts = essais.filter((e) => e.etat === 'vert').map((e) => e.date).sort();
  const vert = verts.at(-1);
  if (vert === undefined) throw new Error(`${parcours} : essai rouge, nouvel essai obligatoire`);
  if (dernierRouge !== undefined && vert < dernierRouge) throw new Error(`${parcours} : dernier essai rouge, nouvel essai obligatoire`);
  if (dernierRouge !== undefined && vert === dernierRouge) throw new Error(`${parcours} : l'essai vert doit être plus récent que le rouge`);
  if (correction !== undefined && !dateValide(correction)) throw new Error('correction : date AAAA-MM-JJ attendue');
  if (correction !== undefined && vert <= correction) throw new Error(`${parcours} : l'essai vert doit suivre la correction`);
  return { parcours, clos: true, date: vert };
}

export function tableau(rapports, seuils) {
  const ids = [...new Set(rapports.map((r) => r.parcours))].sort();
  return ids.map((id) => {
    const e = rapports.filter((r) => r.parcours === id).map((r) => evaluer(r, seuils));
    const dernier = e.reduce((a, b) => (b.date > a.date || (b.date === a.date && b.etat === 'rouge') ? b : a));
    return { parcours: id, etat: dernier.etat, date: dernier.date, essais: e.length };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (nom) => {
    const i = args.indexOf(nom);
    if (i < 0) return undefined;
    const v = args.splice(i, 2)[1];
    if (v === undefined || v.startsWith('--')) { console.error(`${nom} attend une valeur`); process.exit(1); }
    return v;
  };
  const clore = option('--clore');
  const correction = option('--correction');
  try {
    const seuils = lireSeuils(readFileSync(new URL('../../docs/essais-parcours.csv', import.meta.url), 'utf8'));
    const rapports = args.map((f) => lireRapport(readFileSync(f, 'utf8')));
    for (const l of tableau(rapports, seuils)) console.log(`${l.parcours}\t${l.etat}\t${l.date}\t${l.essais}`);
    if (clore) console.log(JSON.stringify(cloturer(clore, rapports, seuils, { correction })));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
