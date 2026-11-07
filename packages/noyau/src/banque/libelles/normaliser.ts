export const VERSION_NORMALISATION = 1;

export interface LibelleNormalise {
  normalise: string;
  moyen: string;
  dateCarte?: string;
  carteMasquee?: string;
  rum?: string;
  creancier?: string;
  reference?: string;
  devise?: { code: string; montantTexte: string; tauxTexte?: string };
  version: number;
}

const MOYENS: Record<string, string> = {
  'PRLV SEPA': 'prelevement',
  'VIR SEPA': 'virement',
  'VIR INST': 'virement_instantane',
  CHQ: 'cheque',
  CHEQUE: 'cheque',
  CARTE: 'carte',
  CB: 'carte',
};
const MOT_CLE = '(?!(?:REF|EREF|ICS|RUM)(?: |$))';
const RE_MOYEN = /^(PRLV SEPA|VIR SEPA|VIR INST|CHQ|CHEQUE|CARTE|CB)(?= |$)/;
const RE_REF = new RegExp(`(?:\\/RFB\\/|(?:^| )(?:EREF|REF)(?= |$) ?)${MOT_CLE}(\\S*)`, 'g');
const RE_RUM = new RegExp(`(?:^| )RUM(?= |$)(?: ${MOT_CLE}(\\S+))?`);
const RE_ICS = new RegExp(`(?:^| )ICS(?= |$)(?: ${MOT_CLE}(\\S+))?`);
const RE_DEVISE = /(?:^| )(USD|GBP|CHF|JPY|CAD|AUD|SEK|NOK|DKK) (\d{1,3}(?: \d{3})*(?:,\d+)?|\d+(?:,\d+)?)(?: TX (\d+,\d+))?(?= |$)/;
const RE_CARTE = /[0-9X]{12,19}/;
const RE_DATE = /(?:^| )(\d{2}\/\d{2})(?= |$)/;

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compacter = (s: string) => s.replace(/ {2,}/g, ' ').trim();

export function normaliserLibelle(brut: string, villes: readonly string[]): LibelleNormalise {
  let t = compacter(
    brut
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toUpperCase()
      .replace(/[\p{Cc}\p{Z}]/gu, ' '),
  );
  const r: LibelleNormalise = { normalise: '', moyen: t === '' ? 'frais' : 'autre', version: VERSION_NORMALISATION };
  if (t === '') return r;
  const m = RE_MOYEN.exec(t);
  if (m) {
    r.moyen = MOYENS[m[1]!]!;
    t = t.slice(m[0].length).trim();
  }
  if (r.moyen === 'cheque') {
    const c = /^(\d{7,})(?= |$)/.exec(t);
    if (c) {
      r.reference = c[1]!;
      t = t.slice(c[0].length);
    }
  }
  t = t.replace(RE_REF, (_x, v: string) => {
    if (v !== '' && r.reference === undefined) r.reference = v;
    return ' ';
  });
  for (const [re, cle] of [[RE_RUM, 'rum'], [RE_ICS, 'creancier']] as const) {
    const x = re.exec(t);
    if (x) {
      if (x[1]) r[cle] = x[1];
      t = t.replace(re, ' ');
    }
  }
  const d = RE_DEVISE.exec(t);
  if (d) {
    const [, code, montantTexte, tauxTexte] = d;
    r.devise = { code: code!, montantTexte: montantTexte!, ...(tauxTexte ? { tauxTexte } : {}) };
    t = t.replace(RE_DEVISE, ' ');
  }
  const k = RE_CARTE.exec(t);
  if (k) {
    const fin = /\d{4}$/.exec(k[0]);
    if (fin) r.carteMasquee = `•••• ${fin[0]}`;
    t = t.replace(RE_CARTE, ' ');
  }
  if (r.moyen === 'carte') {
    const dc = RE_DATE.exec(t);
    if (dc) {
      r.dateCarte = dc[1]!;
      t = t.replace(RE_DATE, ' ');
    }
  }
  t = compacter(t);
  for (const v of [...villes].sort((a, b) => b.length - a.length)) {
    const nv = compacter(v.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase());
    if (nv === '') continue;
    const re = new RegExp(`(?<= |^)${echapper(nv)}(?: [A-Z]{2})?$`);
    if (re.test(t) && t !== nv) {
      t = t.replace(re, '');
      break;
    }
  }
  r.normalise = compacter(t.replace(/\d{7,}/g, ' '));
  return r;
}
