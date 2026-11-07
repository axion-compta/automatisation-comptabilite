import { ErreurSecurite } from './types.js';

export type VueHorloge = { plusGrandInstantMs: number };
export type VerdictHorloge = { bloque: boolean; alerte: boolean; vue: VueHorloge };

const FORME_INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:[.]\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const invalide = (m: string): never => {
  throw new ErreurSecurite('argument_invalide', m);
};
const entierPositif = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

function instantValide(v: unknown): string {
  const g = typeof v === 'string' ? FORME_INSTANT.exec(v) : null;
  if (g === null || Number.isNaN(Date.parse(v as string))) return invalide('instant');
  const [a, m, j, h, mi, s] = g.slice(1).map(Number) as [number, number, number, number, number, number];
  const d = new Date(Date.UTC(a, m - 1, j));
  const calendrier = d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
  return calendrier && h < 24 && mi < 60 && s < 60 ? (v as string) : invalide('instant');
}

export function dateComptable(instantIso: string, fuseau: string): string {
  const iso = instantValide(instantIso);
  if (typeof fuseau !== 'string' || fuseau === '') return invalide('fuseau');
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat('en-CA', { timeZone: fuseau, year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return invalide('fuseau');
  }
  const p = Object.fromEntries(format.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${String(p.year).padStart(4, '0')}-${p.month}-${p.day}`;
}

export function observerHorloge(
  vue: VueHorloge | null,
  maintenantMs: number,
  toleranceReculMs: number,
): VerdictHorloge {
  if (!entierPositif(maintenantMs) || !entierPositif(toleranceReculMs)) return invalide('horloge');
  if (vue === null) return { bloque: false, alerte: false, vue: { plusGrandInstantMs: maintenantMs } };
  if (typeof vue !== 'object' || !entierPositif(vue.plusGrandInstantMs)) return invalide('vue');
  const vu = vue.plusGrandInstantMs;
  if (vu - maintenantMs > toleranceReculMs) return { bloque: true, alerte: true, vue: { plusGrandInstantMs: vu } };
  return { bloque: false, alerte: false, vue: { plusGrandInstantMs: Math.max(vu, maintenantMs) } };
}
