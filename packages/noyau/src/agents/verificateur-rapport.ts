// Vérificateur du rapport de reprise : tout nombre du texte doit exister dans le registre.
// Entier sans virgule = entier simple ; avec virgule = centimes (12,5 donne 1250).
export type NombreLu = { brut: string; valeur: number | null };
export type Rapport = { pages: string[]; marqueurs: string[] };
export type Registre = { nombres: readonly number[]; dates: readonly string[] };
export type ResultatRapport = { valide: boolean; inconnus: string[]; marqueursManquants: string[] };

const DATE = /(\d{4})-(\d{2})-(\d{2})|(\d{2})\/(\d{2})\/(\d{4})/gu;
const NOMBRE = /(?<!\d)-?(?:\d{1,3}(?:[ \u00A0\u202F]\d{3}(?!\d))+|\d+)(?:,\d+)?/gu;
const MAX = BigInt(Number.MAX_SAFE_INTEGER);

function lire(brut: string): number | null {
  const negatif = brut.startsWith('-');
  const [entier = '', decimales] = brut.replace(/[-\s\u00A0\u202F]/gu, '').split(',');
  let total = 0n;
  for (const c of entier) total = total * 10n + BigInt(c);
  let fraction = '';
  if (decimales !== undefined && decimales !== '') {
    if (decimales.length > 2) return null;
    fraction = decimales.length === 1 ? decimales + '0' : decimales;
    total = total * 100n + BigInt(fraction);
  }
  if (total > MAX) return null;
  const n = Number(total);
  return negatif && n !== 0 ? -n : n;
}

export function extraireNombres(texte: string): { nombres: NombreLu[]; dates: string[] } {
  const dates: string[] = [];
  const sansDates = texte.replace(DATE, (_m, a, b, c, d, e, f) => {
    dates.push(a === undefined ? `${f}-${e}-${d}` : `${a}-${b}-${c}`);
    return ' ';
  });
  const nombres = [...sansDates.matchAll(NOMBRE)].map((m) => ({ brut: m[0], valeur: lire(m[0]) }));
  return { nombres, dates };
}

export function verifierRapport(
  rapport: Rapport,
  registre: Registre,
  options: { marqueursObligatoires: readonly string[] },
): ResultatRapport {
  const premiere = rapport.pages[0] ?? '';
  const marqueursManquants = options.marqueursObligatoires.filter(
    (code) => !rapport.marqueurs.includes(code) || !premiere.includes(code),
  );
  const inconnus: string[] = [];
  for (const page of rapport.pages) {
    const { nombres, dates } = extraireNombres(page);
    for (const n of nombres) {
      if (n.valeur === null || !registre.nombres.includes(n.valeur)) inconnus.push(n.brut);
    }
    for (const d of dates) if (!registre.dates.includes(d)) inconnus.push(d);
  }
  return {
    valide: rapport.pages.length > 0 && inconnus.length === 0 && marqueursManquants.length === 0,
    inconnus,
    marqueursManquants,
  };
}
