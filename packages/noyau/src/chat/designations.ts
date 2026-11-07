// Désignations du chat (« celle-ci », « les trois dernières ») : ordre fixe, doute = question (V3-CHT-051, V3-CHT-018).

export type SorteDesignation = 'celle_ci' | 'ces' | 'n_dernieres' | 'n_premieres';
export interface Designation {
  sorte: SorteDesignation;
  n?: number;
}
export interface ContexteDesignation {
  selection: readonly string[];
  pieceOuverte?: string | null;
  listeAffichee: readonly string[];
}
export type Resolution = { sorte: 'cibles'; ids: string[] } | { sorte: 'question'; choix: string[] };

const NOMBRES: Readonly<Record<string, number>> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
};
const CHOIX_MIN = 2;
const CHOIX_MAX = 5;

const normaliser = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/(?<=\p{L})-(?=\p{L})/gu, ' ').replace(/\s+/g, ' ').trim();

function lireNombre(mot: string): number | null {
  if (/^\d+$/.test(mot)) {
    const n = Number(mot);
    return Number.isSafeInteger(n) && n >= 1 ? n : null;
  }
  return Object.hasOwn(NOMBRES, mot) ? (NOMBRES[mot] as number) : null;
}

/** Reconnaît seulement les formes prévues ; une forme au nombre invalide donne null. */
export function analyserDesignation(phrase: string): Designation | null {
  if (typeof phrase !== 'string') return null;
  const p = normaliser(phrase);
  const m = /(?:^| )les (\S+) (dernieres|derniers|premieres|premiers)(?= |$)/.exec(p);
  if (m) {
    const n = lireNombre(m[1] as string);
    if (n === null) return null;
    return { sorte: (m[2] as string).startsWith('d') ? 'n_dernieres' : 'n_premieres', n };
  }
  if (/(?:^| )(?:celle|celui) ci(?= |$)/.test(p)) return { sorte: 'celle_ci' };
  if (/(?:^| )ces(?= |$)/.test(p)) return { sorte: 'ces' };
  return null;
}

const ids = (l: readonly string[] | undefined): string[] => (Array.isArray(l) ? l.filter((x) => typeof x === 'string' && x !== '') : []);
const question = (candidats: readonly string[]): Resolution => ({
  sorte: 'question',
  choix: candidats.length >= CHOIX_MIN ? candidats.slice(0, CHOIX_MAX) : [],
});
const cibles = (l: string[]): Resolution => ({ sorte: 'cibles', ids: l });

/** Ordre fixe : sélection, puis pièce ouverte (« celle-ci » seulement), puis liste affichée déjà triée. */
export function resoudre(d: Designation, ctx: ContexteDesignation): Resolution {
  const selection = ids(ctx.selection);
  const liste = ids(ctx.listeAffichee);
  if (d.sorte === 'n_dernieres' || d.sorte === 'n_premieres') {
    const n = d.n;
    if (n === undefined || !Number.isSafeInteger(n) || n < 1 || n > liste.length) return question(liste);
    return cibles(d.sorte === 'n_dernieres' ? liste.slice(liste.length - n) : liste.slice(0, n));
  }
  if (selection.length > 0) {
    return d.sorte === 'celle_ci' && selection.length > 1 ? question(selection) : cibles(selection);
  }
  if (d.sorte === 'celle_ci' && typeof ctx.pieceOuverte === 'string' && ctx.pieceOuverte !== '') return cibles([ctx.pieceOuverte]);
  if (liste.length === 0) return question([]);
  return d.sorte === 'celle_ci' && liste.length > 1 ? question(liste) : cibles(liste);
}
