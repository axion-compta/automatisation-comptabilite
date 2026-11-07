// Couverture des relevés d'un compte : trous de dates, trous de soldes, chevauchements. Dates ISO, jour civil UTC (minuit UTC en ms).
import type { Centimes } from '../argent/index.js';
import type { ReleveResume } from './types.js';

export class ErreurCouverture extends Error {
  override name = 'ErreurCouverture';
  constructor(readonly code: 'date_invalide' | 'periode_inversee' | 'montant_invalide', message: string) {
    super(message);
  }
}

export type Trou = {
  compteId: string; debut: string; fin: string;
  preuve: 'dates' | 'soldes' | 'les_deux'; soldes: 'OK' | 'ECART' | 'IMPOSSIBLE'; ecart?: Centimes;
};
export type Chevauchement = { a: string; b: string; du: string; au: string };

// Paramètre : nombre de jours ouvrés bancaires manquants toléré entre deux relevés (au-delà : trou de dates).
export const JOURS_OUVRES_TOLERES = 1;
const MS_PAR_JOUR = 86_400_000;
const FORME_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const numeroJour = (iso: string): number => {
  const m = FORME_ISO.exec(iso);
  const t = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
  if (!m || new Date(t).toISOString().slice(0, 10) !== iso) throw new ErreurCouverture('date_invalide', `date invalide : ${iso}`);
  return t;
};
const enIso = (jour: number): string => new Date(jour).toISOString().slice(0, 10);
const verifierMontant = (m: number | undefined): void => {
  if (m !== undefined && !Number.isSafeInteger(m)) throw new ErreurCouverture('montant_invalide', 'montant invalide');
};

type Releve = { r: ReleveResume; d: number; f: number };
const preparer = (releves: readonly ReleveResume[]): Releve[] =>
  releves.map((r) => {
    const d = numeroJour(r.periodeDebut);
    const f = numeroJour(r.periodeFin);
    if (d > f) throw new ErreurCouverture('periode_inversee', `période inversée : ${r.id}`);
    verifierMontant(r.soldeOuverture);
    verifierMontant(r.soldeCloture);
    return { r, d, f };
  });

const parCompte = (releves: readonly ReleveResume[]): Array<[string, Releve[]]> => {
  const groupes = new Map<string, Releve[]>();
  for (const x of preparer(releves)) groupes.set(x.r.compteId, [...(groupes.get(x.r.compteId) ?? []), x]);
  return [...groupes.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, l]) => [id, l.sort((x, y) => x.d - y.d || x.f - y.f || (x.r.id < y.r.id ? -1 : x.r.id > y.r.id ? 1 : 0))]);
};

export function trousDeReleves(releves: readonly ReleveResume[], joursFermes: readonly string[]): Trou[] {
  const fermes = new Set(joursFermes.map(numeroJour));
  const ouvre = (j: number): boolean => {
    const s = new Date(j).getUTCDay();
    return s !== 0 && s !== 6 && !fermes.has(j);
  };
  const trous: Trou[] = [];
  for (const [compteId, liste] of parCompte(releves)) {
    let prec: Releve | undefined;
    for (const cur of liste) {
      if (prec && cur.d > prec.f) {
        let ouvres = 0;
        for (let j = prec.f + MS_PAR_JOUR; j < cur.d; j += MS_PAR_JOUR) if (ouvre(j)) ouvres++;
        const dates = ouvres > JOURS_OUVRES_TOLERES;
        const { soldeCloture: cl } = prec.r;
        const { soldeOuverture: ou } = cur.r;
        const impossible = cl === undefined || ou === undefined;
        const ecart = impossible ? 0 : Math.abs(ou - cl);
        if (dates || ecart !== 0) {
          const debut = prec.f + MS_PAR_JOUR;
          const fin = cur.d - MS_PAR_JOUR >= debut ? cur.d - MS_PAR_JOUR : cur.d;
          const trou: Trou = {
            compteId, debut: enIso(debut), fin: enIso(fin),
            preuve: dates && ecart !== 0 ? 'les_deux' : dates ? 'dates' : 'soldes',
            soldes: impossible ? 'IMPOSSIBLE' : ecart !== 0 ? 'ECART' : 'OK',
          };
          if (ecart !== 0) trou.ecart = ecart as Centimes;
          trous.push(trou);
        }
      }
      if (!prec || cur.f >= prec.f) prec = cur;
    }
  }
  return trous;
}

export function chevauchements(releves: readonly ReleveResume[]): Chevauchement[] {
  const paires: Chevauchement[] = [];
  for (const [, liste] of parCompte(releves)) {
    liste.forEach((x, i) => {
      for (const y of liste.slice(i + 1)) {
        if (y.d <= x.f) paires.push({ a: x.r.id, b: y.r.id, du: enIso(Math.max(x.d, y.d)), au: enIso(Math.min(x.f, y.f)) });
      }
    });
  }
  return paires;
}
