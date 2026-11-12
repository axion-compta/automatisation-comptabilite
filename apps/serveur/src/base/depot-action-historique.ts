// Historique commun des actions : interface et adaptateur en mémoire (l'adaptateur PostgreSQL attend la console).
import { CANAUX, type Canal } from '../../../../packages/noyau/src/principes/brouillon.js';

export type CodeErreurHistorique = 'ajout_seul' | 'canal_inconnu' | 'forme_invalide';
export class ErreurHistorique extends Error {
  override name = 'ErreurHistorique';
  constructor(readonly code: CodeErreurHistorique) { super(code); }
}

export type Objet = Record<string, unknown>;
export type LigneAction = { le: string; canal: Canal; auteurId: string; objetType: string; objetId: string; avant: Objet; apres: Objet };
export type LigneStockee = LigneAction & { id: string };
export type EntreeAction = { canal: Canal; auteurId: string; objet: { type: string; id: string }; avant: Objet; apres: Objet; le: string };
export type FiltreHistorique = { societeId: string; canal?: Canal; depuis?: string; jusqua?: string };

export interface DepotActionHistorique {
  ajouter(societeId: string, ligne: LigneAction): void;
  lister(filtre: FiltreHistorique): readonly Readonly<LigneStockee>[];
  modifier(societeId: string, id: string, ligne: Partial<LigneAction>): never;
  supprimer(societeId: string, id: string): never;
}

/** Même forme pour tous les canaux : seule la valeur de `canal` change. */
export const ligneDepuisAction = (a: EntreeAction): LigneAction => ({
  le: a.le, canal: a.canal, auteurId: a.auteurId, objetType: a.objet.type, objetId: a.objet.id, avant: a.avant, apres: a.apres,
});

const estCanal = (c: unknown): c is Canal => typeof c === 'string' && (CANAUX as readonly string[]).includes(c);
const estObjet = (v: unknown): v is Objet => typeof v === 'object' && v !== null && !Array.isArray(v);
const texte = (v: unknown): boolean => typeof v === 'string' && v !== '';
const instant = (v: unknown): number => {
  const t = typeof v === 'string' ? Date.parse(v) : Number.NaN;
  if (Number.isNaN(t)) throw new ErreurHistorique('forme_invalide');
  return t;
};
const profond = <T>(v: T): T => {
  const c = structuredClone(v);
  const geler = (x: unknown): void => { if (typeof x === 'object' && x !== null && !Object.isFrozen(x)) { Object.freeze(x); Object.values(x).forEach(geler); } };
  geler(c);
  return c;
};

export function creerDepotActionHistoriqueMemoire(options: { nouvelId: () => string }): DepotActionHistorique {
  const parSociete = new Map<string, LigneStockee[]>();
  const refus = (): never => { throw new ErreurHistorique('ajout_seul'); };
  return {
    ajouter(societeId, l) {
      if (!texte(societeId) || !texte(l.auteurId) || !texte(l.objetType) || !texte(l.objetId)) throw new ErreurHistorique('forme_invalide');
      if (!estCanal(l.canal)) throw new ErreurHistorique('canal_inconnu');
      if (!estObjet(l.avant) || !estObjet(l.apres)) throw new ErreurHistorique('forme_invalide');
      instant(l.le);
      const liste = parSociete.get(societeId) ?? parSociete.set(societeId, []).get(societeId)!;
      liste.push(structuredClone({ ...l, id: options.nouvelId() }));
    },
    lister({ societeId, canal, depuis, jusqua }) {
      if (canal !== undefined && !estCanal(canal)) throw new ErreurHistorique('canal_inconnu');
      const min = depuis === undefined ? -Infinity : instant(depuis);
      const max = jusqua === undefined ? Infinity : instant(jusqua);
      return Object.freeze(
        (parSociete.get(societeId) ?? [])
          .map((l, rang) => ({ l, rang, t: Date.parse(l.le) }))
          .filter(({ l, t }) => (canal === undefined || l.canal === canal) && t >= min && t <= max)
          .sort((a, b) => a.t - b.t || a.rang - b.rang)
          .map(({ l }) => profond(l)),
      );
    },
    modifier: refus,
    supprimer: refus,
  };
}
