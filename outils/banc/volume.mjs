// Banc de volume hors production (V3-PLA-183, V3-QUA-026, T-ISO-6). Bases fictives seulement ;
// la connexion et les écrans sont des ports injectés (faux serveur). Aucun réseau ici.
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { centile } from './evaluateur.mjs';
import { lireTableau } from '../gardes/performance.mjs';

export const ECRANS = ['tableau-de-bord', 'liste-ecritures', 'grand-livre', 'rapprochement'];

/** Seuil de p95 lu dans le tableau unique docs/budgets-performance.csv (PROPOSÉ, à confirmer : jamais un engagement). */
export function lireSeuil(texte, ecran = 'banc-volume', metrique = 'p95') {
  const ligne = lireTableau(texte).find((l) => l.ecran === ecran && l.metrique === metrique);
  if (!ligne) throw new Error(`seuil absent du tableau pour ${ecran}/${metrique}`);
  return ligne.seuil;
}
export const SEUIL_P95_MS = lireSeuil(readFileSync(new URL('../../docs/budgets-performance.csv', import.meta.url), 'utf8'));

const prng = (graine) => {
  let s = graine >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Bases fictives déterministes ; la somme des lignes vaut exactement `lignes`. */
export function genererBases({ graine = 1, bases = 200, lignes = 500000 } = {}) {
  if (!Number.isSafeInteger(bases) || bases < 1 || !Number.isSafeInteger(lignes) || lignes < bases) throw new Error('parametres_invalides');
  const alea = prng(graine);
  const poids = Array.from({ length: bases }, () => 1 + Math.floor(alea() * 9));
  const total = poids.reduce((a, b) => a + b, 0);
  const liste = poids.map((p, i) => ({ societe_id: `soc-${String(i + 1).padStart(4, '0')}`, nom: `Société fictive ${i + 1}`, lignes: Math.max(1, Math.floor((p * lignes) / total)) }));
  let reste = lignes - liste.reduce((a, b) => a + b.lignes, 0);
  for (let i = 0; reste !== 0; i = (i + 1) % bases) {
    const pas = reste > 0 ? 1 : -1;
    if (liste[i].lignes + pas >= 1) { liste[i].lignes += pas; reste -= pas; }
  }
  return liste;
}

/** Ouvre toutes les connexions puis mesure chaque écran ; un refus ou une erreur est compté, jamais masqué. */
export async function mesurer({ bases, connecter, executer, horloge = () => performance.now(), tirages = 5, seuil = SEUIL_P95_MS }) {
  const ouvertes = [];
  let refus = 0;
  for (const b of bases) {
    try {
      if ((await connecter(b)) === true) ouvertes.push(b);
      else refus++;
    } catch { refus++; }
  }
  const ecrans = {};
  for (const nom of ECRANS) {
    const durees = [];
    for (let i = 0; i < tirages; i++) {
      for (const b of ouvertes) {
        const t0 = horloge();
        await executer(nom, b);
        durees.push(horloge() - t0);
      }
    }
    ecrans[nom] = durees.length ? { mesures: durees.length, p95_ms: centile(durees, 95) } : { mesures: 0, p95_ms: null };
  }
  return { bases: bases.length, lignes: bases.reduce((a, b) => a + b.lignes, 0), connexions_ouvertes: ouvertes.length, refus, seuil_propose_ms: seuil, ecrans };
}

export function rapport(r, date) {
  const lignes = Object.entries(r.ecrans).map(([n, e]) => `| ${n} | ${e.mesures} | ${e.p95_ms ?? 'n/a'} |`);
  return [
    '# Banc de volume (T-ISO-6)', '',
    `Mesure du ${date} sur bases fictives, contre un faux serveur. Rien n'a été mesuré chez l'hébergeur (feu vert J10 attendu).`, '',
    `- Bases : ${r.bases} ; lignes : ${r.lignes}`,
    `- Connexions ouvertes : ${r.connexions_ouvertes} ; refus : ${r.refus}`,
    `- Seuil de p95 PROPOSÉ : ${r.seuil_propose_ms} ms, à confirmer, aucun engagement. Le seuil est lu dans docs/budgets-performance.csv (tableau unique des budgets).`, '',
    '| Écran | Mesures | p95 (ms) |', '|---|---|---|', ...lignes, '',
  ].join('\n');
}

export function ecrireRapport(chemin, r, date) {
  writeFileSync(chemin, rapport(r, date), 'utf8');
}
